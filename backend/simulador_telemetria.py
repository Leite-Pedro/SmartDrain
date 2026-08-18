"""Publica uma leitura de sensor no MQTT, como o ESP faria.

Serve para demonstrar o sistema enquanto o hardware não existe: a API está
inscrita no tópico, grava em telemetria_bueiros, e o app/dashboard refletem.

    python simulador_telemetria.py bueiro_centro_02 90
    python simulador_telemetria.py bueiro_centro_02 5

Para testar em campo, crie um bueiro na sua posição passando as coordenadas
(o backend cadastra sozinho um bueiro_id que ainda não existe):

    python simulador_telemetria.py bueiro_teste 95 -22.12345 -45.67890

O status sai do valor: >=100 ENCHENTE, >=80 CRITICO, >=65 ALERTA, senão TRANQUILO.

ATENÇÃO: grava no banco de verdade, junto com as leituras reais dos sensores.
"""
import json
import sys
from datetime import datetime

import paho.mqtt.client as paho_mqtt

BROKER = 'broker.hivemq.com'
PORTA = 1883
TOPICO = 'santa_rita/smart_drain/telemetria'

# Coordenadas reais dos bueiros cadastrados, para a leitura não cair no oceano.
BUEIROS = {
    'bueiro_centro_01': (-22.25628, -45.697749),
    'bueiro_centro_02': (-22.25781, -45.697985),
    'bueiro_centro_03': (-22.258405, -45.694863),
    'bueiro_centro_04': (-22.25509, -45.695755),
    'bueiro_centro_05': (-22.259291, -45.696831),
}

PROFUNDIDADE_CM = 100  # bueiro vazio: sensor lê ~100 cm até o fundo


def payload(bueiro_id, capacidade, latitude=None, longitude=None):
    # Sem coordenada na linha de comando, usa a do bueiro já cadastrado.
    if latitude is None or longitude is None:
        if bueiro_id not in BUEIROS:
            raise SystemExit(
                f'bueiro desconhecido: {bueiro_id}\n'
                f'Use um destes: {", ".join(BUEIROS)}\n'
                'ou passe latitude e longitude para criar um bueiro novo.')
        latitude, longitude = BUEIROS[bueiro_id]

    # Quanto mais cheio, menor a distância que o sensor enxerga até o entulho.
    distancia = round(PROFUNDIDADE_CM * (1 - capacidade / 100), 1)

    return {
        'bueiro_id': bueiro_id,
        'latitude': latitude,
        'longitude': longitude,
        'leituras_sensores': {
            'sensor_1_cm': distancia,
            'sensor_2_cm': distancia,
            'sensor_3_cm': distancia,
        },
        'distancia_media_cm': distancia,
        'capacidade_porcentagem': capacidade,
        'status_bateria': 92,
        'qualidade_conexao': 'Boa (Estável)',
        'timestamp': datetime.now().isoformat(),
    }


def main():
    if len(sys.argv) not in (3, 5):
        raise SystemExit(__doc__)

    bueiro_id, capacidade = sys.argv[1], float(sys.argv[2])
    latitude = float(sys.argv[3]) if len(sys.argv) == 5 else None
    longitude = float(sys.argv[4]) if len(sys.argv) == 5 else None
    dados = payload(bueiro_id, capacidade, latitude, longitude)

    cliente = paho_mqtt.Client(paho_mqtt.CallbackAPIVersion.VERSION2)
    cliente.connect(BROKER, PORTA, 60)
    cliente.loop_start()
    info = cliente.publish(TOPICO, json.dumps(dados))
    info.wait_for_publish(timeout=10)
    cliente.loop_stop()
    cliente.disconnect()

    print(f'publicado: {bueiro_id} -> {capacidade}% '
          f'(sensor a {dados["distancia_media_cm"]} cm do entulho)')
    print('a API precisa estar rodando para receber e gravar.')


if __name__ == '__main__':
    main()
