import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';

/// Onde se troca o endereço da API.
///
/// Existe porque o servidor muda de IP a cada rede (feira, laboratório, casa) e
/// recompilar o APK para cada uma seria inviável. Testa antes de salvar: melhor
/// descobrir que o endereço está errado aqui do que na tela de login.
class DialogoServidor extends StatefulWidget {
  const DialogoServidor({super.key});

  static Future<void> abrir(BuildContext context) {
    return showDialog(
        context: context, builder: (_) => const DialogoServidor());
  }

  @override
  State<DialogoServidor> createState() => _DialogoServidorState();
}

class _DialogoServidorState extends State<DialogoServidor> {
  late final TextEditingController _controle =
      TextEditingController(text: ApiService.baseUrl);
  bool _testando = false;
  String? _resultado;
  bool _deuCerto = false;

  @override
  void dispose() {
    _controle.dispose();
    super.dispose();
  }

  Future<void> _testar() async {
    setState(() {
      _testando = true;
      _resultado = null;
    });
    final ok = await ApiService.testarEndereco(_controle.text);
    if (!mounted) return;
    setState(() {
      _testando = false;
      _deuCerto = ok;
      _resultado = ok
          ? 'Servidor respondeu.'
          : 'Sem resposta. Confira o IP, a porta, e se o celular está na mesma rede.';
    });
  }

  Future<void> _salvar() async {
    await ApiService.salvarEndereco(_controle.text);
    if (!mounted) return;
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Servidor: ${ApiService.baseUrl}')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppColors.superficie,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      title: Text('SERVIDOR',
          style: AppText.rotulo.copyWith(color: AppColors.piche)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _controle,
            autocorrect: false,
            keyboardType: TextInputType.url,
            style: AppText.titulo,
            decoration: const InputDecoration(hintText: '192.168.0.10:5001'),
          ),
          const SizedBox(height: 10),
          Text(
            'No emulador use ${ApiService.enderecoPadrao}. '
            'Em celular, o IP do computador que roda a API.',
            style: AppText.corpo.copyWith(fontSize: 12),
          ),
          if (_resultado != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.concreto,
                border: Border(
                  left: BorderSide(
                    color:
                        _deuCerto ? AppColors.nivelOk : AppColors.nivelCritico,
                    width: 3,
                  ),
                ),
              ),
              child: Text(_resultado!,
                  style: AppText.corpo.copyWith(fontSize: 13)),
            ),
          ],
        ],
      ),
      actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      actions: [
        TextButton(
          onPressed: _testando ? null : _testar,
          child: Text(
            _testando ? 'TESTANDO...' : 'TESTAR',
            style: AppText.rotulo.copyWith(color: AppColors.piche),
          ),
        ),
        ElevatedButton(
          onPressed: _salvar,
          style: ElevatedButton.styleFrom(minimumSize: const Size(120, 46)),
          child: const Text('SALVAR'),
        ),
      ],
    );
  }
}
