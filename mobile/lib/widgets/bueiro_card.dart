import 'package:flutter/material.dart';
import '../models/bueiro.dart';
import '../theme/app_theme.dart';
import 'medidor_nivel.dart';

class BueiroCard extends StatelessWidget {
  final Bueiro bueiro;
  final double? distanciaMetros;
  final VoidCallback onTap;

  const BueiroCard({
    super.key,
    required this.bueiro,
    required this.distanciaMetros,
    required this.onTap,
  });

  Color get _cor => AppColors.doStatus(bueiro.statusCodigo);

  String get _distanciaFormatada {
    if (distanciaMetros == null) return '--';
    if (distanciaMetros! < 1000) {
      return '${distanciaMetros!.toStringAsFixed(0)} m';
    }
    return '${(distanciaMetros! / 1000).toStringAsFixed(1)} km';
  }

  /// "bueiro_centro_02" não é como o funcionário chama a coisa na rua.
  String get _nome {
    final partes = bueiro.bueiroId.split('_');
    if (partes.length < 3) return bueiro.bueiroId.toUpperCase();
    return '${partes[1]} ${partes[2]}'.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(4),
        // Stack em vez de Row/IntrinsicHeight: o medidor é feito de Align +
        // FractionallySizedBox, que não têm altura intrínseca — dentro de
        // IntrinsicHeight o card inteiro colapsava para zero.
        child: Stack(
          children: [
            Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              child: MedidorNivel(
                  porcentagem: bueiro.capacidadePorcentagem, cor: _cor),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(28, 14, 16, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: Text(_nome, style: AppText.titulo)),
                      Text(_distanciaFormatada, style: AppText.numero),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        bueiro.capacidadePorcentagem.toStringAsFixed(0),
                        style: AppText.numeroGrande.copyWith(color: _cor),
                      ),
                      const SizedBox(width: 3),
                      Text(
                        '%',
                        style: AppText.rotulo.copyWith(color: _cor),
                      ),
                      const Spacer(),
                      Text(
                        bueiro.statusCodigo,
                        style: AppText.rotulo.copyWith(color: _cor),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
