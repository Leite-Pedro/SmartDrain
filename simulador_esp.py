import time
import random
import json
import paho.mqtt.client as mqtt
from datetime import datetime

BROKER = "broker.hivemq.com"
PORT = 1883
TOPIC = "santa_rita/smart_drain/telemetria"
ALTURA_CESTO = 80

BUEIROS_CONFIG = [
    {"id": "bueiro_centro_01", "latitude": -22.256280, "longitude": -45.697749},
    {"id": "bueiro_centro_02", "latitude": -22.257810, "longitude": -45.697985},
    {"id": "bueiro_centro_03", "latitude": -22.258405, "longitude": -45.694863},
    {"id": "bueiro_centro_04", "latitude": -22.255090, "longitude": -45.695755},
    {"id": "bueiro_centro_05", "latitude": -22.259291, "longitude": -45.696831}
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
    
    # Classificação correta dos 4 estados
    if porcentagem_capacidade >= 100.0:
        status_codigo = "ENCHENTE"
        status_mensagem = "Transbordamento detectado! Risco de alagamento."
    elif porcentagem_capacidade >= 75.0:
        status_codigo = "CRITICO"
        status_mensagem = "Nível crítico. Limpeza urgente."
    elif porcentagem_capacidade >= 50.0:
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

client.connect(BROKER, PORT, 60)
client.loop_start()

print("[*] Simulador de Bueiros Inteligentes ATIVO.")

try:
    while True:
        for bueiro in BUEIROS_CONFIG:
            # 🚀 PROBABILIDADE RARA DE ENCHENTE (~5% de chance)
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