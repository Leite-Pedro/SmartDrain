"""Simulador contínuo dos 5 bueiros — o que roda junto com a dashboard.

Escrito pelo Pedro para a dashboard; usado aqui sem alterações, para que app e
site recebam exatamente a mesma telemetria. Publica os 5 bueiros a cada 5 s com
níveis aleatórios; a API está inscrita no tópico e grava em telemetria_bueiros.

    python simulador_continuo.py       (Ctrl+C para parar)

Para forçar UM bueiro num nível específico, use simulador_telemetria.py.

ATENÇÃO: grava no banco de verdade. Deixar rodando por horas enche a tabela.

Quem manda no status gravado é a API: ela recalcula com os limites dela antes de
escrever no banco. Os limites aqui existem só para o texto impresso no terminal,
e estão alinhados com os da API (ALERTA >=65, CRITICO >=80) para que o terminal
não contradiga o que o avaliador vê no app e na dashboard.
"""
import time
import random
import json
import paho.mqtt.client as mqtt
from datetime import datetime

import mqtt_config

# Mesma fonte que a API usa, para os dois nunca acabarem em brokers diferentes.
BROKER = mqtt_config.BROKER_URL
PORT = mqtt_config.BROKER_PORT
TOPIC = mqtt_config.TOPICO_TELEMETRIA
ALTURA_CESTO = 80

BUEIROS_CONFIG = [
    # Inatel
    {"id": "BUEIRO-01-INATEL", "latitude": -22.25628, "longitude": -45.697749},
    {"id": "BUEIRO-02-INATEL", "latitude": -22.25781, "longitude": -45.697985},
    {"id": "BUEIRO-03-INATEL", "latitude": -22.258405, "longitude": -45.694863},
    {"id": "BUEIRO-04-INATEL", "latitude": -22.25509, "longitude": -45.695755},
    {"id": "BUEIRO-05-INATEL", "latitude": -22.259291, "longitude": -45.696831},
    {"id": "BUEIRO-06-INATEL", "latitude": -22.256969093155103, "longitude": -45.6965221251422},   # entrada
    {"id": "BUEIRO-07-INATEL", "latitude": -22.256215226756755, "longitude": -45.695619623718294},  # entre predio 3 e 4

    # Fernandes
    {"id": "BUEIRO-01-FERNANDES", "latitude": -22.240962, "longitude": -45.713277},
    {"id": "BUEIRO-02-FERNANDES", "latitude": -22.243269, "longitude": -45.714515},
    {"id": "BUEIRO-03-FERNANDES", "latitude": -22.243075, "longitude": -45.711883},
    {"id": "BUEIRO-04-FERNANDES", "latitude": -22.240591, "longitude": -45.713365},
    {"id": "BUEIRO-05-FERNANDES", "latitude": -22.243688, "longitude": -45.714166},

    # Maristela
    {"id": "BUEIRO-01-MARISTELA", "latitude": -22.243323, "longitude": -45.708798},
    {"id": "BUEIRO-02-MARISTELA", "latitude": -22.243613, "longitude": -45.706920},
    {"id": "BUEIRO-03-MARISTELA", "latitude": -22.244907, "longitude": -45.710343},
    {"id": "BUEIRO-04-MARISTELA", "latitude": -22.241440, "longitude": -45.708667},
    {"id": "BUEIRO-05-MARISTELA", "latitude": -22.243305, "longitude": -45.707146},
]

OPCOES_CONEXAO = [
    "Excelente (Conexão muito estável)",
    "Boa (Estável)",
    "Aceitável (Pode haver lentidão)",
    "Ruim (Instável/Quedas frequentes)"
]

def processar_leituras_sensores(s1, s2, s3):
    leituras = sorted([s1, s2, s3])

    if (leituras[2] - leituras[0]) <= 15:
        media_distancia = sum(leituras) / 3
    else:
        diff_1_e_0 = leituras[1] - leituras[0]
        diff_2_e_1 = leituras[2] - leituras[1]
        media_distancia = (leituras[0] + leituras[1]) / 2 if diff_1_e_0 < diff_2_e_1 else (leituras[1] + leituras[2]) / 2

    espaco_preenchido = ALTURA_CESTO - media_distancia
    porcentagem_capacidade = max(0.0, min(100.0, (espaco_preenchido / ALTURA_CESTO) * 100))

    # Classificação correta dos 4 estados.
    # Os limites são os mesmos de configuracoes_sistema['limite_alerta'] na API
    # (80, e alerta 15 abaixo disso). Se mudarem lá pela dashboard, mude aqui —
    # senão este texto contradiz o que aparece no app e no site.
    if porcentagem_capacidade >= 100.0:
        status_codigo = "ENCHENTE"
        status_mensagem = "Transbordamento detectado! Risco de alagamento."
    elif porcentagem_capacidade >= 80.0:
        status_codigo = "CRITICO"
        status_mensagem = "Nível crítico. Limpeza urgente."
    elif porcentagem_capacidade >= 65.0:
        status_codigo = "ALERTA"
        status_mensagem = "Nível moderado. Atenção necessária."
    else:
        status_codigo = "TRANQUILO"
        status_mensagem = "Nível estável. Fluxo normal."

    return round(media_distancia, 1), round(porcentagem_capacidade, 1), status_codigo, status_mensagem

try:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
except AttributeError:
    client = mqtt.Client()

mqtt_config.preparar(client)
client.connect(BROKER, PORT, 60)
client.loop_start()

print(f"[*] Simulador de Bueiros Inteligentes ATIVO em {mqtt_config.descricao()}")

try:
    while True:
        for bueiro in BUEIROS_CONFIG:
            # PROBABILIDADE RARA DE ENCHENTE (~5% de chance)
            if random.random() < 0.05:
                sensor_1 = sensor_2 = sensor_3 = 0  # Distância 0cm = 100% Ocupação
            else:
                # Variação ampla (10cm a 80cm) para alternar entre TRANQUILO, ALERTA e CRITICO
                base_distancia = random.randint(10, 80)
                sensor_1 = max(0, min(80, base_distancia + random.randint(-3, 3)))
                sensor_2 = max(0, min(80, base_distancia + random.randint(-3, 3)))
                sensor_3 = max(0, min(80, base_distancia + random.randint(-3, 3)))

            media_cm, cap_porcentagem, codigo_st, msg_st = processar_leituras_sensores(sensor_1, sensor_2, sensor_3)

            payload = {
                "bueiro_id": bueiro["id"],
                "latitude": bueiro["latitude"],
                "longitude": bueiro["longitude"],
                "leituras_sensores": {
                    "sensor_1_cm": sensor_1,
                    "sensor_2_cm": sensor_2,
                    "sensor_3_cm": sensor_3
                },
                "distancia_media_cm": media_cm,
                "capacidade_porcentagem": cap_porcentagem,
                "status_codigo": codigo_st,
                "status_mensagem": msg_st,
                "status_bateria": random.randint(20, 100),
                "qualidade_conexao": random.choice(OPCOES_CONEXAO),
                "timestamp": datetime.now().isoformat()
            }

            client.publish(TOPIC, json.dumps(payload, indent=2))
            print(f"[{datetime.now().strftime('%H:%M:%S')}] {bueiro['id']} | Cap: {cap_porcentagem}% | Status: {codigo_st}")

        print("-" * 60)
        time.sleep(5)

except KeyboardInterrupt:
    client.loop_stop()
    client.disconnect()
