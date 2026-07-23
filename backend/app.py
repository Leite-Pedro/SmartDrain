from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_mqtt import Mqtt
import json
import random
import calendar
from datetime import datetime, timedelta
# 🚀 ADICIONADO: Import da tabela Manutencao
from models import db, Usuario, Telemetria, Manutencao

app = Flask(__name__)

# Configuração do CORS para o Next.js
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

# Configurações do Banco de Dados MySQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:mysql&10@localhost/smart_drain_usuarios'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    "pool_recycle": 280,  
    "pool_pre_ping": True  
}

# Configurações do Broker MQTT
app.config['MQTT_BROKER_URL'] = 'broker.hivemq.com'
app.config['MQTT_BROKER_PORT'] = 1883
app.config['MQTT_USERNAME'] = ''  
app.config['MQTT_PASSWORD'] = ''  
app.config['MQTT_KEEPALIVE'] = 60
app.config['MQTT_TLS_ENABLED'] = False

# Inicializa as extensões
db.init_app(app)
mqtt = Mqtt(app)

# =====================================================================
# 🚀 NOVA FUNÇÃO: POVOAMENTO AUTOMÁTICO DINÂMICO (Janela de 6 meses)
# =====================================================================
def inicializar_dados_dinamicos():
    with app.app_context():
        # Verifica se o banco está vazio. Se estiver, gera dados retroativos móveis
        if Manutencao.query.count() == 0:
            print("[SEED] Banco vazio. Gerando histórico dinâmico dos últimos 6 meses...")
            hoje = datetime.now()
            
            for i in range(5, -1, -1):
                # Calcula o mês/ano dinamicamente voltando no tempo
                mes_alvo = hoje.month - i
                ano_alvo = hoje.year
                if mes_alvo <= 0:
                    mes_alvo += 12
                    ano_alvo -= 1
                
                # Fixa uma data no meio do mês para os registros falsos
                data_base = datetime(ano_alvo, mes_alvo, 15)
                
                # Gera limpezas aleatórias (1 a 5 por mês)
                for _ in range(random.randint(1, 5)):
                    m = Manutencao(
                        bueiro_id=f"BUEIRO_0{random.randint(1, 5)}",
                        tecnico_nome="Equipe de Manutenção",
                        descricao="Limpeza preventiva mensal",
                        timestamp=data_base + timedelta(days=random.randint(-10, 10))
                    )
                    db.session.add(m)
                
                # Gera enchentes aleatórias (0 a 3 por mês)
                for _ in range(random.randint(0, 3)):
                    t = Telemetria(
                        bueiro_id=f"BUEIRO_0{random.randint(1, 5)}",
                        latitude=-22.2572, longitude=-45.6957,
                        sensor_1_cm=999.0, sensor_2_cm=999.0, sensor_3_cm=999.0,
                        distancia_media_cm=999.0, capacidade_porcentagem=100,
                        status_codigo="ENCHENTE", status_mensagem="Transbordamento (999cm)",
                        status_bateria=100, qualidade_conexao="Boa",
                        timestamp=data_base + timedelta(days=random.randint(-10, 10))
                    )
                    db.session.add(t)
            
            db.session.commit()
            print("[SEED] Histórico dinâmico gerado com sucesso!")

with app.app_context():
    db.create_all()
    inicializar_dados_dinamicos()  # 🚀 Chamada da função ao iniciar a API

# =====================================================================
# VARIÁVEIS GLOBAIS DE CONFIGURAÇÃO (Em memória)
# =====================================================================
configuracoes_sistema = {
    "limite_alerta": 80  # Começa com 80% por padrão
}

# =====================================================================
# EVENTOS MQTT (Mantidos Exatamente Iguais)
# =====================================================================
@mqtt.on_connect()
def handle_connect(client, userdata, flags, rc):
    if rc == 0:
        print("[+] Backend conectado com sucesso ao Broker MQTT!")
        mqtt.subscribe("santa_rita/smart_drain/telemetria")
        print("[*] Inscrito no tópico de telemetria com sucesso.")
    else:
        print(f"[-] Falha na conexão com o Broker MQTT. Código: {rc}")

@mqtt.on_message()
def handle_mqtt_message(client, userdata, message):
    with app.app_context():
        try:
            dados_brutos = message.payload.decode()
            dados = json.loads(dados_brutos)
            
            bueiro_id = dados['bueiro_id']
            capacidade = dados['capacidade_porcentagem']
            status_recebido = dados.get('status_codigo')
            limite_critico = configuracoes_sistema.get('limite_alerta', 80)
            limite_alerta = limite_critico - 15 
            
            # Define o status atual
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

            ultima_leitura = Telemetria.query.filter_by(bueiro_id=bueiro_id)\
                .order_by(Telemetria.timestamp.desc()).first()
 

            nova_leitura = Telemetria(
                bueiro_id=bueiro_id,
                latitude=dados['latitude'],    
                longitude=dados['longitude'],  
                sensor_1_cm=dados['leituras_sensores']['sensor_1_cm'],
                sensor_2_cm=dados['leituras_sensores']['sensor_2_cm'] if 'sensor_2_cm' in dados['leituras_sensores'] else dados['leituras_sensores']['sensor_1_cm'], 
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
                    descricao="Limpeza e desobstrução efetuada"
                )
                db.session.add(nova_limpeza)

            db.session.commit()
            print(f"[SQL] Telemetria atualizada! {bueiro_id} | Ocupação: {capacidade}% | Status: {status_codigo}")

        except Exception as e:
            db.session.rollback()
            print(f"[-] Erro ao processar mensagem MQTT e salvar no banco: {e}")
        finally:
            db.session.remove()
@app.route('/api/bueiros/tempo-real', methods=['GET'])
def get_bueiros_tempo_real():
    try:
        bueiros_ids = ["bueiro_centro_01", "bueiro_centro_02", "bueiro_centro_03", "bueiro_centro_04", "bueiro_centro_05"]
        resultado = []

      
        for b_id in bueiros_ids:
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
                    "timestamp": ultima_leitura.timestamp.isoformat()
                })

        return jsonify(resultado), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

@app.route('/api/configuracoes', methods=['GET'])
def obter_configuracoes():
    return jsonify(configuracoes_sistema), 200

@app.route('/api/configuracoes', methods=['POST'])
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
    
    mqtt.publish("santa_rita/smart_drain/comandos", json.dumps(payload_mqtt))
    print(f"[MQTT] Comando enviado: Alterar limite crítico para {novo_limite}%")
    
    return jsonify({
        "mensagem": "Configurações atualizadas", 
        "limite_alerta": configuracoes_sistema['limite_alerta']
    }), 200

@app.route('/api/comandos/tempestade', methods=['POST'])
def ativar_tempestade():
    dados = request.get_json()
    ativo = dados.get('ativo', True)
    intervalo = dados.get('intervalo_minutos', 1)
    
    payload_mqtt = {
        "comando": "MODO_TEMPESTADE",
        "ativo": ativo,
        "intervalo_minutos": intervalo
    }
    
    mqtt.publish("santa_rita/smart_drain/comandos", json.dumps(payload_mqtt))
    print(f"[MQTT] ALERTA DE TEMPESTADE: Intervalo reduzido para {intervalo} min")
    
    return jsonify({"mensagem": "Modo tempestade ativado"}), 200

@app.route('/api/usuarios', methods=['POST'])
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
        password=dados['password'], 
        cargo=dados.get('cargo', 'Operador de Campo')
    )
    db.session.add(novo_usuario)
    db.session.commit()
    return jsonify(novo_usuario.to_dict()), 201

@app.route('/api/usuarios', methods=['GET'])
def listar_usuarios():
    usuarios = Usuario.query.all()
    return jsonify([u.to_dict() for u in usuarios]), 200

@app.route('/api/usuarios/<int:id>', methods=['DELETE'])
def remover_usuario(id):
    usuario = Usuario.query.get(id)
    if not usuario:
        return jsonify({"erro": "Usuário não encontrado"}), 404
    db.session.delete(usuario)
    db.session.commit()
    return jsonify({"mensagem": f"Usuário {usuario.nome} removido com sucesso"}), 200


@app.route('/api/historico/graficos', methods=['GET'])
def obter_graficos_dinamicos():
    """Retorna os dados dos últimos 6 meses (Janela Móvel) baseados no mês atual."""
    meses_pt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    hoje = datetime.now()
    dados_grafico = []
    
    for i in range(5, -1, -1):
        mes_alvo = hoje.month - i
        ano_alvo = hoje.year
        if mes_alvo <= 0:
            mes_alvo += 12
            ano_alvo -= 1
            
        # Conta limpezas (Manutencao)
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

@app.route('/api/historico/auditoria', methods=['GET'])
def obter_tabela_auditoria():
    """Retorna os eventos mesclando Limpezas e Alertas com suporte a filtro por mês/ano e horário."""
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
            "nivelMax": f"{a.capacidade_porcentagem:.1f}".replace(".", ","), # Ex: 82,9
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