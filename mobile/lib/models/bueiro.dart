class Bueiro {
  final String bueiroId;
  final double latitude;
  final double longitude;
  final double capacidadePorcentagem;
  final String statusCodigo; // TRANQUILO | ALERTA | CRITICO
  final String statusMensagem;
  final String statusBateria;
  final String qualidadeConexao;
  final DateTime timestamp;

  Bueiro({
    required this.bueiroId,
    required this.latitude,
    required this.longitude,
    required this.capacidadePorcentagem,
    required this.statusCodigo,
    required this.statusMensagem,
    required this.statusBateria,
    required this.qualidadeConexao,
    required this.timestamp,
  });

  factory Bueiro.fromJson(Map<String, dynamic> json) {
    return Bueiro(
      bueiroId: json['bueiro_id'].toString(),
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      capacidadePorcentagem: (json['capacidade_porcentagem'] as num).toDouble(),
      statusCodigo: json['status_codigo'] as String? ?? 'TRANQUILO',
      statusMensagem: json['status_mensagem'] as String? ?? '',
      statusBateria: json['status_bateria']?.toString() ?? '-',
      qualidadeConexao: json['qualidade_conexao']?.toString() ?? '-',
      timestamp: DateTime.tryParse(json['timestamp']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  bool get precisaLimpeza => statusCodigo == 'ALERTA' || statusCodigo == 'CRITICO';
}
