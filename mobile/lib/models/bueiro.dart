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

  /// O id é o único rótulo que o backend manda, então bairro e nome saem dele.
  /// O projeto já usou dois formatos, e os dois convivem no banco:
  ///
  ///     BUEIRO-01-INATEL   ->  INATEL 01   (atual)
  ///     bueiro_centro_01   ->  CENTRO 01   (leituras antigas)
  ///
  /// Por isso a regra não é "pegue a posição 1": separa por hífen ou
  /// sublinhado e pega o primeiro pedaço que não é número, pulando o prefixo.
  /// Id fora do padrão cai em OUTROS em vez de estourar — bueiro cadastrado
  /// torto ainda precisa aparecer na lista.
  List<String> get _partes =>
      bueiroId.split(RegExp(r'[-_]')).where((p) => p.isNotEmpty).toList();

  String get regiao {
    for (final parte in _partes.skip(1)) {
      if (int.tryParse(parte) == null) return parte.toUpperCase();
    }
    return 'OUTROS';
  }

  /// "BUEIRO-01-INATEL" não é como o funcionário chama a coisa na rua.
  String get nomeLegivel {
    final numero = _partes.skip(1).firstWhere(
          (p) => int.tryParse(p) != null,
          orElse: () => '',
        );
    if (regiao == 'OUTROS') return bueiroId.toUpperCase();
    return numero.isEmpty ? regiao : '$regiao $numero';
  }
}
