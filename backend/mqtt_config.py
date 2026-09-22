"""De onde a API e os simuladores tiram o endereco do broker MQTT.

Existe para que os dois lados leiam a MESMA configuracao. Se a API escutar um
broker e o simulador publicar em outro, nada estoura: as telas simplesmente
congelam no ultimo valor, sem mensagem de erro em lugar nenhum. E o tipo de
falha que se descobre no meio da apresentacao.

O padrao continua sendo o broker publico `broker.hivemq.com`, sem TLS e sem
senha, entao quem nao configurar nada continua rodando como sempre — inclusive
quem clonar o repositorio pela primeira vez.

Para usar o cluster privado do HiveMQ Cloud, preencha no .env:

    MQTT_BROKER_URL=<id>.s1.eu.hivemq.cloud
    MQTT_BROKER_PORT=8883
    MQTT_USUARIO=...
    MQTT_SENHA=...

Basta MQTT_USUARIO estar preenchido para ligar TLS e autenticacao juntos: o
HiveMQ Cloud so aceita conexao autenticada e cifrada, nunca uma sem a outra.
Para voltar ao broker publico, apague essas quatro linhas.
"""
import os
import ssl
from pathlib import Path

from dotenv import load_dotenv

# Caminho explicito porque os simuladores podem ser chamados de outra pasta, e
# aí o .env ao lado deste arquivo nao seria encontrado pela busca padrao.
load_dotenv(Path(__file__).with_name('.env'))

BROKER_URL = os.environ.get('MQTT_BROKER_URL', 'broker.hivemq.com')
BROKER_PORT = int(os.environ.get('MQTT_BROKER_PORT', 1883))
USUARIO = os.environ.get('MQTT_USUARIO', '')
SENHA = os.environ.get('MQTT_SENHA', '')

TOPICO_TELEMETRIA = os.environ.get(
    'MQTT_TOPICO_TELEMETRIA', 'santa_rita/smart_drain/telemetria')

KEEPALIVE = 60


def preparar(client):
    """Liga TLS e autenticacao no cliente, quando houver usuario configurado.

    Chame antes de connect(). Devolve o proprio cliente para encadear.
    """
    if USUARIO:
        client.tls_set(tls_version=ssl.PROTOCOL_TLS_CLIENT)
        client.username_pw_set(USUARIO, SENHA)
    return client


def descricao():
    """Uma linha para o log dizer em qual broker o processo entrou.

    Nunca inclui a senha: estes logs ficam abertos na tela durante a feira.
    """
    if USUARIO:
        return f'{BROKER_URL}:{BROKER_PORT} (TLS, usuario {USUARIO})'
    return f'{BROKER_URL}:{BROKER_PORT} (publico, sem autenticacao)'
