"""Modelos reconstruídos a partir do schema real do Supabase (public.*).

Os tipos e tamanhos batem com information_schema; não altere sem conferir o banco.
"""
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Usuario(db.Model):
    __tablename__ = 'usuarios'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False, unique=True)
    password = db.Column(db.String(255), nullable=False)
    cargo = db.Column(db.String(50))
    data_cadastro = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "email": self.email,
            "cargo": self.cargo,
            "data_cadastro": self.data_cadastro.isoformat() if self.data_cadastro else None,
        }


class BueiroCadastro(db.Model):
    __tablename__ = 'bueiros_cadastro'

    bueiro_id = db.Column(db.String(50), primary_key=True)
    nome_amigavel = db.Column(db.String(100))
    latitude_fixa = db.Column(db.Numeric)
    longitude_fixa = db.Column(db.Numeric)
    data_instalacao = db.Column(db.Date)


class Telemetria(db.Model):
    __tablename__ = 'telemetria_bueiros'

    id = db.Column(db.Integer, primary_key=True)
    bueiro_id = db.Column(db.String(50))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    sensor_1_cm = db.Column(db.Float)
    sensor_2_cm = db.Column(db.Float)
    sensor_3_cm = db.Column(db.Float)
    distancia_media_cm = db.Column(db.Float)
    capacidade_porcentagem = db.Column(db.Float)
    status_codigo = db.Column(db.String(20))
    status_mensagem = db.Column(db.String(150))
    status_bateria = db.Column(db.Integer)
    qualidade_conexao = db.Column(db.String(100))
    timestamp = db.Column(db.DateTime(timezone=True), server_default=db.func.now())


class Manutencao(db.Model):
    __tablename__ = 'historico_manutencoes'

    id = db.Column(db.Integer, primary_key=True)
    bueiro_id = db.Column(db.String(50), nullable=False)
    tecnico_nome = db.Column(db.String(100))
    descricao = db.Column(db.String(255))
    timestamp = db.Column(db.DateTime)

    # Colunas usadas pelas rotas /api/limpeza/*. NÃO existem no Supabase ainda —
    # rode migrar_colunas_limpeza.py antes de usar o fluxo de limpeza do app.
    funcionario_id = db.Column(db.Integer)
    evento = db.Column(db.String(20))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    foto_url = db.Column(db.String(255))
