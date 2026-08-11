class Usuario {
  final int id;
  final String nome;
  final String email;
  final String cargo;
  final String token;

  Usuario({
    required this.id,
    required this.nome,
    required this.email,
    required this.cargo,
    required this.token,
  });

  factory Usuario.fromJson(Map<String, dynamic> json) {
    return Usuario(
      id: json['id'] as int,
      nome: json['nome'] as String,
      email: json['email'] as String,
      cargo: json['cargo'] as String? ?? 'Operador de Campo',
      token: json['token'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'nome': nome,
        'email': email,
        'cargo': cargo,
        'token': token,
      };
}
