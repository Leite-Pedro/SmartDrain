import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Bueiro visto em corte: uma coluna que enche conforme a obstrução.
///
/// É o dado central do sistema (o sensor mede o quanto está tomado) e o que o
/// funcionário precisa ler de relance, em pé, no sol. Por isso ele é a peça
/// gráfica do app em vez de um ponto colorido ao lado do texto.
class MedidorNivel extends StatelessWidget {
  final double porcentagem;
  final Color cor;
  final double largura;

  /// Marca a linha em que o bueiro entra em alerta (o mesmo 80% do backend).
  /// Só faz sentido no medidor grande, onde há altura para lê-la.
  final bool mostrarLimite;

  const MedidorNivel({
    super.key,
    required this.porcentagem,
    required this.cor,
    this.largura = 12,
    this.mostrarLimite = false,
  });

  static const double _limiteAlerta = 80;

  @override
  Widget build(BuildContext context) {
    final fracao = (porcentagem / 100).clamp(0.0, 1.0);
    final semAnimacao = MediaQuery.disableAnimationsOf(context);

    return SizedBox(
      width: largura,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(2),
        child: Container(
          // O trilho precisa ser visível sobre o branco do cartão: sem ele à
          // vista, a barra vira um traço solto em vez de "quanto de quanto".
          color: AppColors.borda,
          child: Stack(
            children: [
              // Sobe de baixo para cima, como o entulho acumula.
              Align(
                alignment: Alignment.bottomCenter,
                child: TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: fracao),
                  duration: semAnimacao
                      ? Duration.zero
                      : const Duration(milliseconds: 650),
                  curve: Curves.easeOutCubic,
                  builder: (context, valor, _) => FractionallySizedBox(
                    heightFactor: valor,
                    widthFactor: 1,
                    child: DecoratedBox(decoration: BoxDecoration(color: cor)),
                  ),
                ),
              ),
              if (mostrarLimite)
                Align(
                  alignment: const Alignment(0, 1 - 2 * (_limiteAlerta / 100)),
                  child: Container(
                    height: 2,
                    color: AppColors.superficie.withValues(alpha: 0.85),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
