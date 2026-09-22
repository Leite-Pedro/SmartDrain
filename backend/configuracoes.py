"""Limites de alerta, por bairro, e o modo tempestade.

Antes havia um numero so para a cidade inteira. Com bueiros em Inatel,
Fernandes e Maristela isso passou a nao servir: bairro em fundo de vale enche
antes, e o limite que protege um deixa o outro reclamando a toa. Cada bairro
passa a ter o seu, e quem nunca foi configurado herda o valor geral.

O bairro sai do proprio id do bueiro, que e o unico rotulo que o firmware manda.
Os dois formatos ja usados no projeto convivem:

    BUEIRO-01-INATEL   -> INATEL     (formato atual)
    bueiro_centro_01   -> CENTRO     (leituras antigas, ainda no banco)

MODO TEMPESTADE

Enquanto ligado, todo bairro passa a valer LIMITE_TEMPESTADE, e os valores de
cada um ficam guardados para voltarem ao normal quando desligar. Desligar
restaura exatamente o que estava antes, inclusive o que foi ajustado no meio da
tempestade. Nao e um desconto sobre o valor de cada bairro de proposito: no meio
da chuva a cidade inteira responde pelo mesmo criterio, e quem decide nao quer
fazer conta de cabeca.

O alerta acompanha o critico 15 pontos abaixo, como sempre. Entao baixar o
critico de 80 para 60 arrasta o alerta de 65 para 45 junto — os dois descem, que
e o comportamento que se espera quando esta chovendo.

As configuracoes sobrevivem a reiniciar a API porque ficam num arquivo ao lado.
Na feira a API reinicia varias vezes, e perder o que foi ajustado no meio da
apresentacao seria pior que o problema que este modulo resolve.
"""
import json
import re
from pathlib import Path

ARQUIVO = Path(__file__).with_name('configuracoes.json')

LIMITE_PADRAO = 80

# Limite unico enquanto a tempestade estiver ligada.
LIMITE_TEMPESTADE = 60

# O alerta vem sempre este tanto abaixo do critico. Mexer aqui mexe nos dois.
DISTANCIA_ALERTA = 15

# Quantos minutos entre leituras o hardware deve usar durante a tempestade.
INTERVALO_TEMPESTADE_MINUTOS = 1

_estado = {
    'limite_alerta': LIMITE_PADRAO,   # valor geral, para bairro sem ajuste proprio
    'regioes': {},                    # BAIRRO -> limite critico
    'tempestade_ativa': False,
    'antes_da_tempestade': None,      # {'limite_alerta': n, 'regioes': {...}}
}


def regiao_de(bueiro_id):
    """O bairro, em caixa alta, tirado do id do bueiro.

    Separa por hifen ou sublinhado e pega o primeiro pedaco que nao e numero,
    ignorando o prefixo 'BUEIRO'. Id fora do padrao cai em OUTROS em vez de
    estourar: bueiro cadastrado torto ainda precisa receber telemetria.
    """
    partes = [p for p in re.split(r'[-_]', str(bueiro_id)) if p]
    for parte in partes[1:]:
        if not parte.isdigit():
            return parte.upper()
    return 'OUTROS'


def limite_critico(bueiro_id):
    """A partir de que porcentagem este bueiro entra em CRITICO."""
    if _estado['tempestade_ativa']:
        return LIMITE_TEMPESTADE
    regiao = regiao_de(bueiro_id)
    return int(_estado['regioes'].get(regiao, _estado['limite_alerta']))


def limite_de_alerta(bueiro_id):
    """A partir de que porcentagem este bueiro entra em ALERTA."""
    return limite_critico(bueiro_id) - DISTANCIA_ALERTA


# ---------------------------------------------------------------- alteracoes

def definir_global(valor):
    _estado['limite_alerta'] = int(valor)
    _salvar()


def definir_regiao(regiao, valor):
    _estado['regioes'][str(regiao).upper()] = int(valor)
    _salvar()


def tempestade(ativo):
    """Liga ou desliga o modo tempestade, guardando o que havia antes."""
    if ativo and not _estado['tempestade_ativa']:
        _estado['antes_da_tempestade'] = {
            'limite_alerta': _estado['limite_alerta'],
            'regioes': dict(_estado['regioes']),
        }
        _estado['tempestade_ativa'] = True
    elif not ativo and _estado['tempestade_ativa']:
        anterior = _estado['antes_da_tempestade']
        if anterior:
            _estado['limite_alerta'] = anterior['limite_alerta']
            _estado['regioes'] = dict(anterior['regioes'])
        _estado['tempestade_ativa'] = False
        _estado['antes_da_tempestade'] = None
    _salvar()
    return _estado['tempestade_ativa']


# ------------------------------------------------------------------- leitura

def estado(regioes_conhecidas=()):
    """O que a dashboard precisa para desenhar a tela.

    `regioes_conhecidas` vem dos bueiros que existem agora, para a tela mostrar
    um controle por bairro sem nada fixado em codigo — bairro novo aparece
    sozinho assim que o primeiro bueiro dele publicar.
    """
    regioes = sorted(set(map(str.upper, regioes_conhecidas)) | set(_estado['regioes']))
    efetivo = LIMITE_TEMPESTADE if _estado['tempestade_ativa'] else None
    return {
        # Mantido com o nome antigo: a dashboard e os testes ja usam.
        'limite_alerta': _estado['limite_alerta'],
        'tempestade_ativa': _estado['tempestade_ativa'],
        'limite_tempestade': LIMITE_TEMPESTADE,
        'distancia_alerta': DISTANCIA_ALERTA,
        'intervalo_tempestade_minutos': INTERVALO_TEMPESTADE_MINUTOS,
        'regioes': [
            {
                'regiao': r,
                'limite_critico': int(_estado['regioes'].get(r, _estado['limite_alerta'])),
                'limite_alerta': int(_estado['regioes'].get(r, _estado['limite_alerta'])) - DISTANCIA_ALERTA,
                'proprio': r in _estado['regioes'],
                'em_vigor': efetivo if efetivo is not None
                            else int(_estado['regioes'].get(r, _estado['limite_alerta'])),
            }
            for r in regioes
        ],
    }


# --------------------------------------------------------------- persistencia

def _salvar():
    try:
        ARQUIVO.write_text(json.dumps(_estado, indent=2), encoding='utf-8')
    except OSError as e:
        # Perder a persistencia nao pode derrubar a API: ela continua valendo
        # em memoria ate reiniciar.
        print(f'[CONFIG] nao consegui gravar {ARQUIVO.name}: {e}', flush=True)


def carregar():
    """Le o arquivo na subida. Ausente ou corrompido, segue com os padroes."""
    try:
        if ARQUIVO.exists():
            _estado.update(json.loads(ARQUIVO.read_text(encoding='utf-8')))
            print(f'[CONFIG] limites carregados de {ARQUIVO.name}', flush=True)
    except (OSError, ValueError) as e:
        print(f'[CONFIG] {ARQUIVO.name} ilegivel ({e}); usando padroes', flush=True)


if __name__ == '__main__':
    # Verificacao da regra que decide quando um bueiro vira CRITICO.
    assert regiao_de('BUEIRO-01-INATEL') == 'INATEL'
    assert regiao_de('BUEIRO-05-MARISTELA') == 'MARISTELA'
    assert regiao_de('bueiro_centro_01') == 'CENTRO'      # formato antigo, ainda no banco
    assert regiao_de('avulso') == 'OUTROS'                 # id torto nao derruba nada

    ARQUIVO.unlink(missing_ok=True)
    _estado.update({'limite_alerta': 80, 'regioes': {}, 'tempestade_ativa': False,
                    'antes_da_tempestade': None})

    # Sem ajuste proprio, o bairro herda o geral.
    assert limite_critico('BUEIRO-01-INATEL') == 80
    assert limite_de_alerta('BUEIRO-01-INATEL') == 65

    # Ajustar um bairro nao mexe nos outros.
    definir_regiao('MARISTELA', 70)
    assert limite_critico('BUEIRO-03-MARISTELA') == 70
    assert limite_de_alerta('BUEIRO-03-MARISTELA') == 55
    assert limite_critico('BUEIRO-01-INATEL') == 80

    # Tempestade: todo mundo no mesmo criterio, alerta descendo junto.
    tempestade(True)
    assert limite_critico('BUEIRO-01-INATEL') == 60
    assert limite_critico('BUEIRO-03-MARISTELA') == 60
    assert limite_de_alerta('BUEIRO-01-INATEL') == 45

    # Desligar devolve exatamente o que havia, inclusive o ajuste do bairro.
    tempestade(False)
    assert limite_critico('BUEIRO-03-MARISTELA') == 70
    assert limite_critico('BUEIRO-01-INATEL') == 80

    # A tela lista bairro que existe no banco mesmo sem ajuste proprio.
    visao = estado(['INATEL', 'FERNANDES', 'MARISTELA'])
    nomes = [r['regiao'] for r in visao['regioes']]
    assert nomes == ['FERNANDES', 'INATEL', 'MARISTELA'], nomes
    maristela = next(r for r in visao['regioes'] if r['regiao'] == 'MARISTELA')
    assert maristela['limite_critico'] == 70 and maristela['proprio'] is True
    inatel = next(r for r in visao['regioes'] if r['regiao'] == 'INATEL')
    assert inatel['limite_critico'] == 80 and inatel['proprio'] is False

    # Sobrevive a reiniciar.
    _estado.update({'limite_alerta': 80, 'regioes': {}, 'tempestade_ativa': False})
    carregar()
    assert limite_critico('BUEIRO-03-MARISTELA') == 70, _estado

    ARQUIVO.unlink(missing_ok=True)
    print('configuracoes.py: todas as verificacoes passaram')
