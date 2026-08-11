import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/usuario.dart';
import 'api_service.dart';

/// Guarda a sessão do funcionário logado localmente no aparelho.
/// Isso evita que ele precise logar toda vez que abrir o app.
class AuthService {
  static const _chaveUsuario = 'usuario_logado';

  // O token entra e sai do ApiService aqui porque login e restauração de sessão
  // passam os dois por este arquivo — em outro lugar, um dos caminhos ficaria sem.
  static Future<void> salvarSessao(Usuario usuario) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_chaveUsuario, jsonEncode(usuario.toJson()));
    ApiService.token = usuario.token;
  }

  static Future<Usuario?> obterSessao() async {
    final prefs = await SharedPreferences.getInstance();
    final dados = prefs.getString(_chaveUsuario);
    if (dados == null) return null;
    try {
      final usuario = Usuario.fromJson(jsonDecode(dados) as Map<String, dynamic>);
      ApiService.token = usuario.token;
      return usuario;
    } catch (_) {
      return null;
    }
  }

  static Future<void> encerrarSessao() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_chaveUsuario);
    ApiService.token = null;
  }
}
