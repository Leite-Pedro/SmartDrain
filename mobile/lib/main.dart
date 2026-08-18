import 'package:flutter/material.dart';
import 'models/usuario.dart';
import 'screens/login_screen.dart';
import 'screens/map_screen.dart';
import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'theme/app_theme.dart';

void main() async {
  // O endereço da API é configurável no app, então precisa estar carregado
  // antes de qualquer tela tentar uma requisição.
  WidgetsFlutterBinding.ensureInitialized();
  await ApiService.carregarEndereco();
  runApp(const SmartDrainApp());
}

class SmartDrainApp extends StatelessWidget {
  const SmartDrainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Smart Drain - Funcionário',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.claro,
      home: const _TelaInicial(),
    );
  }
}

/// Verifica se já existe uma sessão salva no aparelho para pular o login.
class _TelaInicial extends StatefulWidget {
  const _TelaInicial();

  @override
  State<_TelaInicial> createState() => _TelaInicialState();
}

class _TelaInicialState extends State<_TelaInicial> {
  Usuario? _usuario;
  bool _verificando = true;

  @override
  void initState() {
    super.initState();
    _verificarSessao();
  }

  Future<void> _verificarSessao() async {
    Usuario? usuario;
    try {
      usuario = await AuthService.obterSessao();
    } catch (_) {
      // Falhou ao ler a sessão salva? Cai no login. Deixar a exceção escapar
      // travaria o app no spinner de abertura, sem nenhuma saída.
      usuario = null;
    }
    if (!mounted) return;
    setState(() {
      _usuario = usuario;
      _verificando = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_verificando) {
      return const Scaffold(
        body: Center(
          child: SizedBox(
            height: 26,
            width: 26,
            child: CircularProgressIndicator(
                strokeWidth: 2.4, color: AppColors.sinal),
          ),
        ),
      );
    }
    if (_usuario != null) {
      return MapScreen(usuario: _usuario!);
    }
    return const LoginScreen();
  }
}
