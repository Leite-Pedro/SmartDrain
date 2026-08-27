import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/bueiro.dart';
import '../models/previsao.dart';
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
class ApiService {
  /// Endereço da API. Configurável pelo app (engrenagem na tela de login),
  /// porque o IP do servidor muda a cada rede — sem isso seria preciso
  /// recompilar o APK para cada demonstração ou aparelho.
  static String baseUrl = enderecoPadrao;

  /// 10.0.2.2 é o alias do emulador Android para o localhost do computador.
  /// Em celular físico é preciso trocar pelo IP do servidor na rede.
  static const String enderecoPadrao = 'http://10.0.2.2:5001';

  static const String _chaveEndereco = 'api_base_url';

  /// Chamado na abertura do app, antes de qualquer requisição.
  static Future<void> carregarEndereco() async {
    final prefs = await SharedPreferences.getInstance();
    baseUrl = prefs.getString(_chaveEndereco) ?? enderecoPadrao;
  }

  static Future<void> salvarEndereco(String endereco) async {
    final prefs = await SharedPreferences.getInstance();
    final limpo = normalizarEndereco(endereco);
    await prefs.setString(_chaveEndereco, limpo);
    baseUrl = limpo;
  }

  /// Aceita "192.168.0.10:5001" ou "http://192.168.0.10:5001/" e devolve sempre
  /// no formato que o http espera. Digitar o endereço na rua, de dedo grosso,
  /// erra em barra e esquema — é mais barato corrigir do que reclamar.
  static String normalizarEndereco(String bruto) {
    var texto = bruto.trim();
    if (!texto.startsWith('http://') && !texto.startsWith('https://')) {
      texto = 'http://$texto';
    }
    while (texto.endsWith('/')) {
      texto = texto.substring(0, texto.length - 1);
    }
    return texto;
  }

  /// Bate na API só para dizer se aquele endereço responde, sem alterar nada.
  static Future<bool> testarEndereco(String endereco) async {
    try {
      final resposta = await http
          .get(Uri.parse(
              '${normalizarEndereco(endereco)}/api/bueiros/tempo-real'))
          .timeout(const Duration(seconds: 6));
      return resposta.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

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
    final resposta = await http
        .post(
          Uri.parse('$baseUrl/api/login'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'email': email, 'password': senha}),
        )
        .timeout(_tempoLimite);

    if (resposta.statusCode == 200) {
      return Usuario.fromJson(
          jsonDecode(resposta.body) as Map<String, dynamic>);
    } else if (resposta.statusCode == 401) {
      throw Exception('E-mail ou senha inválidos.');
    } else {
      throw Exception(
          'Não foi possível conectar ao servidor. Tente novamente.');
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
      return dados
          .map((item) => Bueiro.fromJson(item as Map<String, dynamic>))
          .toList();
    } else if (resposta.statusCode == 404) {
      return [];
    } else {
      throw Exception('Falha ao carregar os bueiros da região.');
    }
  }

  // ---------------------------------------------------------------------
  // PREVISÃO DE ALAGAMENTO
  // ---------------------------------------------------------------------
  /// Ranking de risco calculado pela API.
  ///
  /// Devolve null em vez de levantar quando não dá para saber — API antiga sem a
  /// rota, servidor fora, ou o Open-Meteo inacessível. É informação a mais: o
  /// aviso simplesmente não aparece, e a lista de limpeza continua igual. Errar
  /// aqui não pode tirar o funcionário do trabalho dele.
  static Future<PrevisaoAlagamento?> obterPrevisaoAlagamento() async {
    try {
      final resposta = await http
          .get(Uri.parse('$baseUrl/api/previsao/risco'))
          .timeout(_tempoLimite);
      if (resposta.statusCode != 200) return null;
      return PrevisaoAlagamento.fromJson(
          jsonDecode(resposta.body) as Map<String, dynamic>);
    } catch (_) {
      return null;
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
    final resposta = await http
        .post(
          Uri.parse('$baseUrl/api/limpeza/iniciar'),
          headers: _cabecalhos,
          body: jsonEncode({
            'bueiro_id': bueiroId,
            'funcionario_id': funcionarioId,
            'latitude': latitude,
            'longitude': longitude,
            'timestamp': DateTime.now().toIso8601String(),
          }),
        )
        .timeout(_tempoLimite);

    if (resposta.statusCode == 401) {
      throw SessaoExpirada(
          _mensagemDeErro(resposta.body) ?? 'Sessão expirada.');
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
    final resposta =
        await requisicao.send().timeout(const Duration(seconds: 60));

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
