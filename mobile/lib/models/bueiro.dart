class Bueiro {
  final String bueiroId;
  final double latitude;
  final double longitude;
  final double capacidadePorcentagem;
  final String statusCodigo; // TRANQUILO | ALERTA | CRITICO | ENCHENTE
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

  /// Pela negativa de propósito: listar os códigos que precisam de limpeza já
  /// deixou ENCHENTE (bueiro transbordando, o caso mais grave) de fora uma vez.
  /// Qualquer status novo do backend entra na fila até alguém dizer o contrário.
  bool get precisaLimpeza => statusCodigo != 'TRANQUILO';

  /// O id chega como "bueiro_centro_02" — é o único rótulo que o backend manda,
  /// então região e nome saem dele. Id fora do padrão cai em 'outros' em vez de
  /// estourar: bueiro cadastrado torto ainda precisa aparecer na lista.
  List<String> get _partes => bueiroId.split('_');

  String get regiao => _partes.length >= 2 ? _partes[1] : 'outros';

  /// "bueiro_centro_02" não é como o funcionário chama a coisa na rua.
  String get nomeLegivel => _partes.length >= 3
      ? '${_partes[1]} ${_partes[2]}'.toUpperCase()
      : bueiroId.toUpperCase();
}
