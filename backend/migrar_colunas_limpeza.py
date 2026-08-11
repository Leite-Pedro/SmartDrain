"""Adiciona em historico_manutencoes as colunas que /api/limpeza/* já espera.

Aditivo e idempotente, mas mexe no Supabase COMPARTILHADO. Rode uma vez:
    .venv\\Scripts\\python.exe migrar_colunas_limpeza.py
"""
from app import app
from models import db
from sqlalchemy import text

COLUNAS = [
    "funcionario_id INTEGER",
    "evento VARCHAR(20)",
    "latitude DOUBLE PRECISION",
    "longitude DOUBLE PRECISION",
    "foto_url VARCHAR(255)",
]

with app.app_context():
    for coluna in COLUNAS:
        db.session.execute(
            text(f"ALTER TABLE historico_manutencoes ADD COLUMN IF NOT EXISTS {coluna}")
        )
    db.session.commit()
    print("Colunas de limpeza garantidas em historico_manutencoes.")
