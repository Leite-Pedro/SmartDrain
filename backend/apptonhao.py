from flask import Flask, request, jsonify
from flask_cors import CORS
import paho.mqtt.client as paho_mqtt
import json
import random
import calendar
import os
import sys
import traceback
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from itsdangerous import URLSafeTimedSerializer
from sqlalchemy import text
from models import db, Usuario, Telemetria, Manutencao

app = Flask(__name__)


app.config['SECRET_KEY'] = 'TROQUE_ISSO_POR_UM_VALOR_SECRETO_FORTE'
app.config['UPLOAD_FOLDER_FOTOS'] = 'uploads/limpezas'
os.makedirs(app.config['UPLOAD_FOLDER_FOTOS'], exist_ok=True)
serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)


@app.before_request
def responder_preflight_cors():
    if request.method == 'OPTIONS':
        return app.make_default_options_response()

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql+psycopg2://postgres.fqncsobcndajjhpknrxj:SmartDrain%23CSI@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    "pool_recycle": 280,
    "pool_pre_ping": True
}

MQTT_BROKER_URL = 'broker.hivemq.com'
MQTT_BROKER_PORT = 1883
MQTT_KEEPALIVE = 60
MQTT_TOPIC_TELEMETRIA = "santa_rita/smart_drain/telemetria"
MQTT_CLIENT_ID = f'smart_drain_backend_{random.randint(10000, 99999)}'

# Inicializa as extensões
db.init_app(app)

def inicializar_dados_dinamicos():
    print("[INIT] Servidor rodando e aguardando telemetria em tempo real via MQTT...", flush=True)

with app.app_context():
    db.create_all()
    inicializar_dados_dinamicos()

configuracoes_sistema = {
    "limite_alerta": 80
}

def handle_connect(client, userdata, flags, reason_code, properties=None):
    if reason_code == 0:
        print("[+] Backend conectado com sucesso ao Broker MQTT (broker.hivemq.com)!", flush=True)
        client.subscribe(MQTT_TOPIC_TELEMETRIA)
        print(f"[*] Inscrito no tópico '{MQTT_TOPIC_TELEMETRIA}' com sucesso.", flush=True)
    else:
        print(f"[-] Falha na conexão com o Broker MQTT. Código: {reason_code}", flush=True)

def handle_disconnect(client, userdata, *args):
    print(f"[-] Desconectado do Broker MQTT! (detalhes: {args}) Tentando reconectar...", flush=True)

def handle_mqtt_message(client, userdata, message):

    print(f"[MQTT] Mensagem recebida no tópico {message.topic}", flush=True)

    with app.app_context():
        try:
            dados_brutos = message.payload.decode()
            dados = json.loads(dados_brutos)

            bueiro_id = dados['bueiro_id']
            capacidade = dados['capacidade_porcentagem']
            status_recebido = dados.get('status_codigo')
            limite_critico = configuracoes_sistema.get('limite_alerta', 80)
            limite_alerta = limite_critico - 15

            if status_recebido == "ENCHENTE" or capacidade >= 100:
                status_codigo = "ENCHENTE"
                status_mensagem = "Transbordamento detectado! Risco iminente de alagamento."
            elif capacidade >= limite_critico:
                status_codigo = "CRITICO"
                status_mensagem = f"Capacidade crítica ({capacidade}%)! Limpeza urgente necessária."
            elif capacidade >= limite_alerta:
                status_codigo = "ALERTA"
                status_mensagem = f"Atenção: bueiro atingiu {capacidade}%. Monitorar fluxo."
            else:
                status_codigo = "TRANQUILO"
                status_mensagem = "Bueiro desobstruído. Fluxo normal."

            db.session.execute(
                text("""
                    INSERT INTO bueiros_cadastro
                        (bueiro_id, nome_amigavel, latitude_fixa, longitude_fixa, data_instalacao)
                    VALUES
                        (:bueiro_id, :nome_amigavel, :latitude_fixa, :longitude_fixa, CURRENT_DATE)
                    ON CONFLICT (bueiro_id) DO NOTHING
                """),
                {
                    "bueiro_id": bueiro_id,
                    "nome_amigavel": bueiro_id.replace("_", " ").title(),
                    "latitude_fixa": dados['latitude'],
                    "longitude_fixa": dados['longitude'],
                }
            )

            nova_leitura = Telemetria(
                bueiro_id=bueiro_id,
                latitude=dados['latitude'],
                longitude=dados['longitude'],
                sensor_1_cm=dados['leituras_sensores']['sensor_1_cm'],
                sensor_2_cm=dados['leituras_sensores'].get('sensor_2_cm', dados['leituras_sensores']['sensor_1_cm']),
                sensor_3_cm=dados['leituras_sensores']['sensor_3_cm'],
                distancia_media_cm=dados['distancia_media_cm'],
                capacidade_porcentagem=capacidade,
                status_codigo=status_codigo,
                status_mensagem=status_mensagem,
                status_bateria=dados['status_bateria'],
                qualidade_conexao=dados.get('qualidade_conexao', 'Boa (Estável)'),
                timestamp=datetime.fromisoformat(dados['timestamp'])
            )
            db.session.add(nova_leitura)

            if capacidade == 0:
                nova_limpeza = Manutencao(
                    bueiro_id=bueiro_id,
                    tecnico_nome="Equipe de Campo",
                    descricao="Limpeza e desobstrução efetuada",
                    timestamp=datetime.now()
                )
                db.session.add(nova_limpeza)

            db.session.commit()
            print(f"[SQL] Telemetria atualizada! {bueiro_id} | Ocupação: {capacidade}% | Status: {status_codigo}", flush=True)

        except Exception as e:
            db.session.rollback()
            
            print(f"[-] Erro ao processar mensagem MQTT e salvar no banco: {e}", flush=True)
            traceback.print_exc()
        finally:
            db.session.remove()

try:
    mqtt_client = paho_mqtt.Client(paho_mqtt.CallbackAPIVersion.VERSION2, client_id=MQTT_CLIENT_ID)
except AttributeError:
    mqtt_client = paho_mqtt.Client(client_id=MQTT_CLIENT_ID)

mqtt_client.on_connect = handle_connect
mqtt_client.on_disconnect = handle_disconnect
mqtt_client.on_message = handle_mqtt_message

try:
    mqtt_client.connect(MQTT_BROKER_URL, MQTT_BROKER_PORT, MQTT_KEEPALIVE)
    mqtt_client.loop_start()
except Exception as e:
    print(f"[-] Não foi possível conectar ao Broker MQTT na inicialização: {e}", flush=True)
    traceback.print_exc()


@app.route('/api/bueiros/tempo-real', methods=['GET', 'OPTIONS'])
def get_bueiros_tempo_real():
    try:
        bueiros_ids = [
            "bueiro_centro_01",
            "bueiro_centro_02",
            "bueiro_centro_03",
            "bueiro_centro_04",
            "bueiro_centro_05"
        ]

        ids_no_banco = [row[0] for row in db.session.query(Telemetria.bueiro_id).distinct().all()]
        todos_bueiros = sorted(list(set(bueiros_ids + ids_no_banco)))

        resultado = []

        for b_id in todos_bueiros:
            ultima_leitura = Telemetria.query.filter_by(bueiro_id=b_id).order_by(Telemetria.timestamp.desc()).first()

            if ultima_leitura:
                resultado.append({
                    "bueiro_id": ultima_leitura.bueiro_id,
                    "latitude": ultima_leitura.latitude,
                    "longitude": ultima_leitura.longitude,
                    "sensores": {
                        "sensor_1_cm": ultima_leitura.sensor_1_cm,
                        "sensor_2_cm": ultima_leitura.sensor_2_cm,
                        "sensor_3_cm": ultima_leitura.sensor_3_cm
                    },
                    "distancia_media_cm": ultima_leitura.distancia_media_cm,
                    "capacidade_porcentagem": ultima_leitura.capacidade_porcentagem,
                    "status_codigo": ultima_leitura.status_codigo,
                    "status_mensagem": ultima_leitura.status_mensagem,
                    "status_bateria": ultima_leitura.status_bateria,
                    "qualidade_conexao": getattr(ultima_leitura, 'qualidade_conexao', 'Boa (Estável)'),
                    "timestamp": ultima_leitura.timestamp.isoformat()
                })

        return jsonify(resultado), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@app.route('/api/configuracoes', methods=['GET', 'OPTIONS'])
def obter_configuracoes():
    return jsonify(configuracoes_sistema), 200

@app.route('/api/configuracoes', methods=['POST', 'OPTIONS'])
def atualizar_configuracoes():
    dados = request.get_json()
    if not dados or 'limite_alerta' not in dados:
        return jsonify({"erro": "Parâmetro limite_alerta não fornecido"}), 400

    novo_limite = dados['limite_alerta']
    configuracoes_sistema['limite_alerta'] = novo_limite

    payload_mqtt = {
        "comando": "ATUALIZAR_LIMITE",
        "novo_limite_porcentagem": novo_limite
    }

    mqtt_client.publish("santa_rita/smart_drain/comandos", json.dumps(payload_mqtt))
    print(f"[MQTT] Comando enviado: Alterar limite crítico para {novo_limite}%", flush=True)

    return jsonify({
        "mensagem": "Configurações atualizadas",
        "limite_alerta": configuracoes_sistema['limite_alerta']
    }), 200

@app.route('/api/comandos/tempestade', methods=['POST', 'OPTIONS'])
def ativar_tempestade():
    dados = request.get_json()
    ativo = dados.get('ativo', True) if dados else True
    intervalo = dados.get('intervalo_minutos', 1) if dados else 1

    payload_mqtt = {
        "comando": "MODO_TEMPESTADE",
        "ativo": ativo,
        "intervalo_minutos": intervalo
    }

    mqtt_client.publish("santa_rita/smart_drain/comandos", json.dumps(payload_mqtt))
    print(f"[MQTT] ALERTA DE TEMPESTADE: Intervalo reduzido para {intervalo} min", flush=True)

    return jsonify({"mensagem": "Modo tempestade ativado"}), 200


@app.route('/api/usuarios', methods=['POST', 'OPTIONS'])
def cadastrar_usuario():
    dados = request.get_json()
    if not dados or not dados.get('nome') or not dados.get('email') or not dados.get('password'):
        return jsonify({"erro": "Dados incompletos"}), 400

    usuario_existente = Usuario.query.filter_by(email=dados['email']).first()
    if usuario_existente:
        return jsonify({"erro": "Este e-mail já está cadastrado"}), 400

    novo_usuario = Usuario(
        nome=dados['nome'],
        email=dados['email'],
        password=generate_password_hash(dados['password']),
        cargo=dados.get('cargo', 'Operador de Campo')
    )
    db.session.add(novo_usuario)
    db.session.commit()
    return jsonify(novo_usuario.to_dict()), 201

@app.route('/api/usuarios', methods=['GET', 'OPTIONS'])
def listar_usuarios():
    usuarios = Usuario.query.all()
    return jsonify([u.to_dict() for u in usuarios]), 200

@app.route('/api/usuarios/<int:id>', methods=['DELETE', 'OPTIONS'])
def remover_usuario(id):
    usuario = Usuario.query.get(id)
    if not usuario:
        return jsonify({"erro": "Usuário não encontrado"}), 404
    db.session.delete(usuario)
    db.session.commit()
    return jsonify({"mensagem": f"Usuário {usuario.nome} removido com sucesso"}), 200

@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    dados = request.get_json()
    if not dados or not dados.get('email') or not dados.get('password'):
        return jsonify({"erro": "E-mail e senha são obrigatórios"}), 400

    usuario = Usuario.query.filter_by(email=dados['email']).first()
    if not usuario or not check_password_hash(usuario.password, dados['password']):
        return jsonify({"erro": "E-mail ou senha inválidos"}), 401

    token = serializer.dumps({"usuario_id": usuario.id})
    return jsonify({
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "cargo": usuario.cargo,
        "token": token
    }), 200


@app.route('/api/limpeza/iniciar', methods=['POST', 'OPTIONS'])
def iniciar_limpeza():
    dados = request.get_json()
    campos_obrigatorios = ['bueiro_id', 'funcionario_id', 'latitude', 'longitude', 'timestamp']
    if not dados or not all(c in dados for c in campos_obrigatorios):
        return jsonify({"erro": "Dados incompletos"}), 400

    bueiro_id = dados['bueiro_id']

    registro = Manutencao(
        bueiro_id=bueiro_id,
        funcionario_id=dados['funcionario_id'],
        evento='INICIO',
        latitude=dados['latitude'],
        longitude=dados['longitude'],
        descricao='Limpeza iniciada pelo funcionário',
        timestamp=datetime.fromisoformat(dados['timestamp'])
    )
    db.session.add(registro)
    db.session.commit()

    topico_comando = f"santa_rita/smart_drain/comandos/{bueiro_id}"
    mqtt_client.publish(topico_comando, json.dumps({"comando": "PAUSAR_SENSOR"}))
    mqtt_client.publish(topico_comando, json.dumps({"comando": "DESTRAVAR_FECHADURA"}))

    print(f"[LIMPEZA] Iniciada em {bueiro_id} pelo funcionário {dados['funcionario_id']}", flush=True)
    return jsonify({"mensagem": "Limpeza iniciada. Sensores pausados e fechadura destravada."}), 200

@app.route('/api/limpeza/finalizar', methods=['POST', 'OPTIONS'])
def finalizar_limpeza():
    bueiro_id = request.form.get('bueiro_id')
    funcionario_id = request.form.get('funcionario_id')
    latitude = request.form.get('latitude')
    longitude = request.form.get('longitude')
    timestamp = request.form.get('timestamp')
    foto = request.files.get('foto')

    if not all([bueiro_id, funcionario_id, latitude, longitude, timestamp, foto]):
        return jsonify({"erro": "Dados incompletos"}), 400

    nome_arquivo = secure_filename(f"{bueiro_id}_{int(datetime.now().timestamp())}.jpg")
    caminho_foto = os.path.join(app.config['UPLOAD_FOLDER_FOTOS'], nome_arquivo)
    foto.save(caminho_foto)

    registro = Manutencao(
        bueiro_id=bueiro_id,
        funcionario_id=int(funcionario_id),
        evento='FIM',
        latitude=float(latitude),
        longitude=float(longitude),
        descricao='Limpeza e desobstrução efetuada',
        foto_url=caminho_foto,
        timestamp=datetime.fromisoformat(timestamp)
    )
    db.session.add(registro)
    db.session.commit()

    topico_comando = f"santa_rita/smart_drain/comandos/{bueiro_id}"
    mqtt_client.publish(topico_comando, json.dumps({"comando": "RETOMAR_SENSOR"}))
    mqtt_client.publish(topico_comando, json.dumps({"comando": "TRANCAR_FECHADURA"}))

    print(f"[LIMPEZA] Finalizada em {bueiro_id} pelo funcionário {funcionario_id} -> foto: {caminho_foto}", flush=True)
    return jsonify({"mensagem": "Limpeza finalizada com sucesso."}), 200


@app.route('/api/historico/graficos', methods=['GET', 'OPTIONS'])
def obter_graficos_dinamicos():
    meses_pt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    hoje = datetime.now()
    dados_grafico = []

    for i in range(5, -1, -1):
        mes_alvo = hoje.month - i
        ano_alvo = hoje.year
        if mes_alvo <= 0:
            mes_alvo += 12
            ano_alvo -= 1

        limpezas = Manutencao.query.filter(
            db.extract('month', Manutencao.timestamp) == mes_alvo,
            db.extract('year', Manutencao.timestamp) == ano_alvo
        ).count()

        enchentes = Telemetria.query.filter(
            Telemetria.status_codigo == 'ENCHENTE',
            db.extract('month', Telemetria.timestamp) == mes_alvo,
            db.extract('year', Telemetria.timestamp) == ano_alvo
        ).count()

        dados_grafico.append({
            "mes": meses_pt[mes_alvo - 1],
            "limpezas": limpezas,
            "enchentes": enchentes
        })

    return jsonify(dados_grafico), 200

@app.route('/api/historico/auditoria', methods=['GET', 'OPTIONS'])
def obter_tabela_auditoria():
    mes_param = request.args.get('mes', type=int, default=datetime.now().month)
    ano_param = request.args.get('ano', type=int, default=datetime.now().year)

    auditoria = []

    manutencoes = Manutencao.query.filter(
        db.extract('month', Manutencao.timestamp) == mes_param,
        db.extract('year', Manutencao.timestamp) == ano_param
    ).order_by(Manutencao.timestamp.desc()).all()

    for m in manutencoes:
        auditoria.append({
            "data": m.timestamp.strftime("%d/%m/%Y %H:%M"),
            "local": m.bueiro_id.replace("_", " ").title(),
            "status": "Manutenção",
            "manutencao": m.descricao,
            "timestamp": m.timestamp
        })

    alertas = Telemetria.query.filter(
        Telemetria.status_codigo.in_(['CRITICO', 'ENCHENTE']),
        db.extract('month', Telemetria.timestamp) == mes_param,
        db.extract('year', Telemetria.timestamp) == ano_param
    ).order_by(Telemetria.timestamp.desc()).all()

    for a in alertas:
        status_formatado = "Crítico" if a.status_codigo == "CRITICO" else "Enchente"
        auditoria.append({
            "data": a.timestamp.strftime("%d/%m/%Y %H:%M"),
            "local": a.bueiro_id.replace("_", " ").title(),
            "nivelMax": f"{a.capacidade_porcentagem:.1f}".replace(".", ","),
            "status": status_formatado,
            "manutencao": "Alerta Disparado",
            "timestamp": a.timestamp
        })

    auditoria_ordenada = sorted(auditoria, key=lambda x: x['timestamp'], reverse=True)

    for item in auditoria_ordenada:
        del item['timestamp']

    return jsonify(auditoria_ordenada), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True, use_reloader=False)
