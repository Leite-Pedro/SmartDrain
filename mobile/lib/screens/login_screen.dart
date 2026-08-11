import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import 'map_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _senhaController = TextEditingController();

  bool _carregando = false;
  bool _senhaVisivel = false;
  String? _erro;

  Future<void> _entrar() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _carregando = true;
      _erro = null;
    });

    try {
      final usuario = await ApiService.login(
        _emailController.text.trim(),
        _senhaController.text,
      );
      await AuthService.salvarSessao(usuario);

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => MapScreen(usuario: usuario)),
      );
    } catch (e) {
      setState(() => _erro = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _carregando = false);
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _senhaController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, restricoes) => SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: restricoes.maxHeight),
              // IntrinsicHeight é obrigatório aqui: dentro de um scroll a altura
              // é infinita, e o Spacer abaixo não teria espaço finito para
              // dividir — a tela inteira deixa de renderizar.
              child: IntrinsicHeight(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const _FaixaSinalizacao(),
                    // Expanded + Spacer empurram o formulário para a metade de
                    // baixo: o app é usado em pé, de uma mão, e o botão precisa
                    // estar ao alcance do polegar.
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(28, 40, 28, 28),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text('SMART DRAIN', style: AppText.rotulo),
                            const SizedBox(height: 10),
                            const Text(
                              'Limpeza\nde campo',
                              style: TextStyle(
                                fontSize: 44,
                                height: 1.02,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -2,
                                color: AppColors.piche,
                              ),
                            ),
                            // 2:1 com o Spacer de baixo — o formulário fica ao
                            // alcance do polegar sem deixar um buraco no meio.
                            const Spacer(flex: 2),
                            Form(
                              key: _formKey,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  TextFormField(
                                    controller: _emailController,
                                    keyboardType: TextInputType.emailAddress,
                                    textInputAction: TextInputAction.next,
                                    style: AppText.titulo,
                                    decoration: const InputDecoration(
                                        labelText: 'E-MAIL'),
                                    validator: (valor) {
                                      if (valor == null ||
                                          valor.trim().isEmpty) {
                                        return 'Informe seu e-mail';
                                      }
                                      if (!valor.contains('@')) {
                                        return 'E-mail inválido';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 12),
                                  TextFormField(
                                    controller: _senhaController,
                                    obscureText: !_senhaVisivel,
                                    style: AppText.titulo,
                                    onFieldSubmitted: (_) => _entrar(),
                                    decoration: InputDecoration(
                                      labelText: 'SENHA',
                                      suffixIcon: IconButton(
                                        tooltip: _senhaVisivel
                                            ? 'Ocultar senha'
                                            : 'Mostrar senha',
                                        icon: Icon(
                                          _senhaVisivel
                                              ? Icons.visibility_off_outlined
                                              : Icons.visibility_outlined,
                                          color: AppColors.fumaca,
                                        ),
                                        onPressed: () => setState(() =>
                                            _senhaVisivel = !_senhaVisivel),
                                      ),
                                    ),
                                    validator: (valor) {
                                      if (valor == null || valor.isEmpty) {
                                        return 'Informe sua senha';
                                      }
                                      return null;
                                    },
                                  ),
                                  if (_erro != null) ...[
                                    const SizedBox(height: 16),
                                    _AvisoErro(mensagem: _erro!),
                                  ],
                                  const SizedBox(height: 24),
                                  ElevatedButton(
                                    onPressed: _carregando ? null : _entrar,
                                    child: _carregando
                                        ? const SizedBox(
                                            height: 20,
                                            width: 20,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2.4,
                                              color: AppColors.fumaca,
                                            ),
                                          )
                                        : const Text('ENTRAR'),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 28),
                            Text(
                              'Seu acesso é cadastrado pelo administrador na dashboard.',
                              style: AppText.corpo.copyWith(fontSize: 13),
                            ),
                            const Spacer(flex: 1),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Faixa listrada de sinalização viária — a marca visual do app, tirada do
/// próprio equipamento de quem o usa.
class _FaixaSinalizacao extends StatelessWidget {
  const _FaixaSinalizacao();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 14,
      child: CustomPaint(painter: _PintorFaixa(), size: Size.infinite),
    );
  }
}

class _PintorFaixa extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = AppColors.sinal);

    final pincel = Paint()..color = AppColors.piche;
    const largura = 14.0;
    // Diagonais na mesma inclinação de barreira de obra.
    for (double x = -size.height;
        x < size.width + size.height;
        x += largura * 2) {
      canvas.drawPath(
        Path()
          ..moveTo(x, size.height)
          ..lineTo(x + size.height, 0)
          ..lineTo(x + size.height + largura, 0)
          ..lineTo(x + largura, size.height)
          ..close(),
        pincel,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _AvisoErro extends StatelessWidget {
  final String mensagem;
  const _AvisoErro({required this.mensagem});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: const BoxDecoration(
        color: AppColors.superficie,
        border:
            Border(left: BorderSide(color: AppColors.nivelCritico, width: 3)),
      ),
      child: Text(
        mensagem,
        style: AppText.corpo.copyWith(color: AppColors.piche),
      ),
    );
  }
}
