from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Inicializa a ferramenta do Banco de Dados
db = SQLAlchemy()

class Usuario(db.Model):
    __tablename__ = 'usuarios'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    cargo = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "email": self.email,
            "cargo": self.cargo
        }

class Telemetria(db.Model):
    __tablename__ = 'telemetria_bueiros'

    id = db.Column(db.Integer, primary_key=True)
    bueiro_id = db.Column(db.String(50), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    sensor_1_cm = db.Column(db.Float, nullable=False)
    sensor_2_cm = db.Column(db.Float, nullable=False)
    sensor_3_cm = db.Column(db.Float, nullable=False)
    distancia_media_cm = db.Column(db.Float, nullable=False)
    capacidade_porcentagem = db.Column(db.Float, nullable=False)
    status_codigo = db.Column(db.String(20), nullable=False) # TRANQUILO, ALERTA, CRITICO, ENCHENTE
    status_mensagem = db.Column(db.String(150), nullable=False)
    status_bateria = db.Column(db.Integer, nullable=False)
    qualidade_conexao = db.Column(db.String(100), nullable=False, default='Boa (Estável)')
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "bueiro_id": self.bueiro_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "sensores": {
                "sensor_1_cm": self.sensor_1_cm,
                "sensor_2_cm": self.sensor_2_cm,
                "sensor_3_cm": self.sensor_3_cm
            },
            "distancia_media_cm": self.distancia_media_cm,
            "capacidade_porcentagem": self.capacidade_porcentagem,
            "status_codigo": self.status_codigo,
            "status_mensagem": self.status_mensagem,
            "status_bateria": self.status_bateria,
            "qualidade_conexao": self.qualidade_conexao,
            "timestamp": self.timestamp.isoformat()
        }

# 🚀 NOVA TABELA ADICIONADA (Sem alterar as existentes):
class Manutencao(db.Model):
    __tablename__ = 'historico_manutencoes'

    id = db.Column(db.Integer, primary_key=True)
    bueiro_id = db.Column(db.String(50), nullable=False)
    tecnico_nome = db.Column(db.String(100), default='Equipe de Campo')
    descricao = db.Column(db.String(255), default='Limpeza e desobstrução preventiva')
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "bueiro_id": self.bueiro_id,
            "tecnico_nome": self.tecnico_nome,
            "descricao": self.descricao,
            "timestamp": self.timestamp.isoformat()
        }