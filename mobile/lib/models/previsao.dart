/// Resposta de /api/previsao/risco: onde a água vai acumular primeiro.
///
/// A conta é feita na API (previsao.py), não aqui, porque a dashboard consome o
/// mesmo endpoint. Se o app calculasse por conta própria, o site e o celular
/// acabariam discordando sobre qual bueiro atender primeiro — e aí a discussão
/// vira sobre qual dos dois está certo, em vez de sobre o bueiro.
class PrevisaoAlagamento {
  /// Chuva prevista para a região nas próximas 24 h, em milímetros.
  final double chuva24hMm;

  /// Ranking já ordenado pela API, do mais arriscado para o menos.
  final List<BueiroRisco> bueiros;

  PrevisaoAlagamento({required this.chuva24hMm, required this.bueiros});

  factory PrevisaoAlagamento.fromJson(Map<String, dynamic> json) {
    final lista = (json['bueiros'] as List? ?? [])
        .map((e) => BueiroRisco.fromJson(e as Map<String, dynamic>))
        .toList();
    return PrevisaoAlagamento(
      chuva24hMm: (json['chuva_24h_mm'] as num? ?? 0).toDouble(),
      bueiros: lista,
    );
  }

  BueiroRisco? get maisArriscado => bueiros.isEmpty ? null : bueiros.first;
}

class BueiroRisco {
  final String bueiroId;
  final double risco;
  final String nivel; // ALTO | MEDIO | BAIXO
  final String motivo;

  BueiroRisco({
    required this.bueiroId,
    required this.risco,
    required this.nivel,
    required this.motivo,
  });

  factory BueiroRisco.fromJson(Map<String, dynamic> json) {
    return BueiroRisco(
      bueiroId: json['bueiro_id'].toString(),
      risco: (json['risco'] as num? ?? 0).toDouble(),
      nivel: json['nivel'] as String? ?? 'BAIXO',
      motivo: json['motivo'] as String? ?? '',
    );
  }
}
