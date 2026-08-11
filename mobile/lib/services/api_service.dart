import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../models/bueiro.dart';
import '../models/usuario.dart';

/// Backend recusou o token (401). Tentar de novo não adianta: quem trata precisa
/// mandar o funcionário de volta para o login.
class SessaoExpirada implements Exception {
  final String mensagem;
  SessaoExpirada(this.mensagem);

  @override
  String toString() => mensagem;
}

/// Centraliza todas as chamadas HTTP para o backend Flask (monólito).
///
/// IMPORTANTE: ajuste [baseUrl] para o endereço real da sua API.
/// - Emulador Android acessando um Flask rodando no mesmo PC: 10.0.2.2
/// - Celular físico: use o IP da máquina na rede local (ex: http://192.168.0.10:5000)
class ApiService {
  // 10.0.2.2 = alias do emulador Android para o localhost da máquina host.
  // Celular físico: troque pelo IP do notebook na rede (ipconfig -> IPv4).
  static const String baseUrl = 'http://10.0.2.2:5001';

  /// Sem isso, uma API fora do ar deixa a requisição pendurada e a tela em
  /// loading infinito — o pacote http não tem timeout padrão.
  static const Duration _tempoLimite = Duration(seconds: 10);

  /// Token da sessão. Quem preenche é o AuthService, no login e ao restaurar.
  static String? token;

  static Map<String, String> get _cabecalhos => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  // ---------------------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------------------
  static Future<Usuario> login(String email, String senha) async {
    final resposta = await http.post(
      Uri.parse('$baseUrl/api/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': senha}),
    ).timeout(_tempoLimite);

    if (resposta.statusCode == 200) {
      return Usuario.fromJson(jsonDecode(resposta.body) as Map<String, dynamic>);
    } else if (resposta.statusCode == 401) {
      throw Exception('E-mail ou senha inválidos.');
    } else {
      throw Exception('Não foi possível conectar ao servidor. Tente novamente.');
    }
  }

  // ---------------------------------------------------------------------
  // LISTA DE BUEIROS EM TEMPO REAL
  // ---------------------------------------------------------------------
  static Future<List<Bueiro>> obterBueirosTempoReal() async {
    final resposta = await http
        .get(Uri.parse('$baseUrl/api/bueiros/tempo-real'))
        .timeout(_tempoLimite);

    if (resposta.statusCode == 200) {
      final List dados = jsonDecode(resposta.body) as List;
      return dados.map((item) => Bueiro.fromJson(item as Map<String, dynamic>)).toList();
    } else if (resposta.statusCode == 404) {
      return [];
    } else {
      throw Exception('Falha ao carregar os bueiros da região.');
    }
  }

  // ---------------------------------------------------------------------
  // INICIAR LIMPEZA
  // Pausa os sensores do bueiro e destrava a fechadura (via MQTT no backend)
  // ---------------------------------------------------------------------
  static Future<void> iniciarLimpeza({
    required String bueiroId,
    required int funcionarioId,
    required double latitude,
    required double longitude,
  }) async {
    final resposta = await http.post(
      Uri.parse('$baseUrl/api/limpeza/iniciar'),
      headers: _cabecalhos,
      body: jsonEncode({
        'bueiro_id': bueiroId,
        'funcionario_id': funcionarioId,
        'latitude': latitude,
        'longitude': longitude,
        'timestamp': DateTime.now().toIso8601String(),
      }),
    ).timeout(_tempoLimite);

    if (resposta.statusCode == 401) {
      throw SessaoExpirada(_mensagemDeErro(resposta.body) ?? 'Sessão expirada.');
    }
    if (resposta.statusCode != 200 && resposta.statusCode != 201) {
      throw Exception(_mensagemDeErro(resposta.body) ??
          'Não foi possível iniciar a limpeza. Tente novamente.');
    }
  }

  // ---------------------------------------------------------------------
  // FINALIZAR LIMPEZA (envia a foto + log completo em multipart/form-data)
  // ---------------------------------------------------------------------
  static Future<void> finalizarLimpeza({
    required String bueiroId,
    required int funcionarioId,
    required double latitude,
    required double longitude,
    required File foto,
  }) async {
    final uri = Uri.parse('$baseUrl/api/limpeza/finalizar');
    final requisicao = http.MultipartRequest('POST', uri)
      // Sem Content-Type aqui: o multipart define o dele, com o boundary.
      ..headers.addAll({if (token != null) 'Authorization': 'Bearer $token'})
      ..fields['bueiro_id'] = bueiroId
      ..fields['funcionario_id'] = funcionarioId.toString()
      ..fields['latitude'] = latitude.toString()
      ..fields['longitude'] = longitude.toString()
      ..fields['timestamp'] = DateTime.now().toIso8601String()
      ..files.add(await http.MultipartFile.fromPath('foto', foto.path));

    // Prazo maior: aqui sobe a foto da limpeza.
    final resposta = await requisicao.send().timeout(const Duration(seconds: 60));

    if (resposta.statusCode != 200 && resposta.statusCode != 201) {
      final corpo = await resposta.stream.bytesToString();
      if (resposta.statusCode == 401) {
        throw SessaoExpirada(_mensagemDeErro(corpo) ?? 'Sessão expirada.');
      }
      throw Exception(_mensagemDeErro(corpo) ??
          'Não foi possível finalizar a limpeza. Tente novamente.');
    }
  }

  /// O backend recusa limpeza fora do raio ou com foto antiga e explica o motivo no
  /// campo "erro". Sem isso o funcionário só veria uma falha genérica.
  static String? _mensagemDeErro(String corpo) {
    try {
      return (jsonDecode(corpo) as Map<String, dynamic>)['erro'] as String?;
    } catch (_) {
      return null;
    }
  }
}
