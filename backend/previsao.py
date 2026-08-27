"""Previsão de onde vai alagar primeiro.

Responde a pergunta que a dashboard e o app fazem de formas diferentes: dado o
que está entupido agora, o relevo da região e a chuva que vem por aí, qual
bueiro transborda primeiro?

Mora na API, e não na dashboard, por um motivo simples: o app do funcionário não
conversa com o site. Os dois consultam a API, então a conta precisa estar em um
lugar só — senão o site e o celular ranqueiam diferente e ninguém sabe qual está
certo.

Fontes de fora, ambas do Open-Meteo, ambas sem chave e sem cadastro:

    /v1/elevation   altitude do terreno, um lote com todas as coordenadas
    /v1/forecast    chuva prevista hora a hora

Altitude não muda, então fica em memória para sempre. Chuva fica meia hora, que é
o passo com que a previsão é revisada — consultar a cada F5 da dashboard só
gastaria a cota da API pública.

Sem internet nada estoura: o ranking continua saindo pela obstrução medida, com
os campos `terreno_disponivel`/`chuva_disponivel` em false para a interface poder
avisar que a conta está incompleta.
"""
import json
import urllib.request
from datetime import datetime

OPEN_METEO_ELEVACAO = 'https://api.open-meteo.com/v1/elevation'
OPEN_METEO_PREVISAO = 'https://api.open-meteo.com/v1/forecast'
TIMEOUT_SEGUNDOS = 8

# Peso de cada parcela no risco final. Os três valores somam 1 e são o botão de
# calibragem deste arquivo: se na primeira chuva de verdade o ranking não bater
# com onde a água empoçou, mexa aqui antes de mexer em qualquer outra coisa.
#
# A obstrução pesa mais porque é o único dado medido — vem do sensor, de agora.
# Terreno e chuva são contexto: explicam para onde a água corre e quanta vem.
PESO_OBSTRUCAO = 0.45
PESO_TERRENO = 0.35
PESO_CHUVA = 0.20

# Chuva que satura o fator em 100. 50 mm em 24 h é o patamar que a Defesa Civil
# trata como chuva forte; acima disso já não importa quanto passou, alaga.
CHUVA_REFERENCIA_MM = 50.0

# Abaixo disso a diferença de altitude é ruído: o Open-Meteo entrega o terreno em
# grade de ~30 m, com resolução de 1 m. Dois bueiros na mesma quadra costumam vir
# com a mesma altitude, e aí não há ladeira nenhuma para ranquear.
DESNIVEL_MINIMO_M = 1.0

RISCO_ALTO = 70
RISCO_MEDIO = 40

CACHE_CHUVA_SEGUNDOS = 30 * 60

_altitudes = {}   # bueiro_id -> metros; altitude não muda, cache é para sempre
_chuva_cache = None   # (buscado_em, {...}) ou None


def _buscar_json(url):
    with urllib.request.urlopen(url, timeout=TIMEOUT_SEGUNDOS) as resposta:
        return json.load(resposta)


def obter_altitudes(bueiros):
    """Altitude de cada bueiro, em metros. Uma requisição para o lote todo."""
    faltando = [b for b in bueiros if b['bueiro_id'] not in _altitudes]
    if faltando:
        lats = ','.join(str(b['latitude']) for b in faltando)
        lons = ','.join(str(b['longitude']) for b in faltando)
        dados = _buscar_json(f'{OPEN_METEO_ELEVACAO}?latitude={lats}&longitude={lons}')
        for bueiro, altitude in zip(faltando, dados['elevation']):
            _altitudes[bueiro['bueiro_id']] = float(altitude)
    return {b['bueiro_id']: _altitudes[b['bueiro_id']] for b in bueiros}


def obter_chuva(latitude, longitude):
    """Chuva prevista para as próximas 24 h e 72 h, em mm, no centro da região.

    Uma previsão só serve para todos os bueiros: eles cabem em um quadrado de
    pouco mais de um quilômetro, e a grade do modelo é bem maior que isso.
    """
    global _chuva_cache
    agora = datetime.now()
    if _chuva_cache and (agora - _chuva_cache[0]).total_seconds() < CACHE_CHUVA_SEGUNDOS:
        return _chuva_cache[1]

    dados = _buscar_json(
        f'{OPEN_METEO_PREVISAO}?latitude={latitude}&longitude={longitude}'
        '&hourly=precipitation&forecast_days=4&timezone=America%2FSao_Paulo'
    )
    horas = dados['hourly']['time']
    chuva = [x or 0.0 for x in dados['hourly']['precipitation']]

    # A série começa à meia-noite de hoje; "próximas 24 h" conta da hora atual em
    # diante, senão às 23h estaríamos somando um dia que já passou.
    prefixo_agora = agora.strftime('%Y-%m-%dT%H:00')
    inicio = horas.index(prefixo_agora) if prefixo_agora in horas else 0

    resultado = {
        'chuva_24h_mm': round(sum(chuva[inicio:inicio + 24]), 1),
        'chuva_72h_mm': round(sum(chuva[inicio:inicio + 72]), 1),
    }
    _chuva_cache = (agora, resultado)
    return resultado


def _motivo(obstrucao, terreno, chuva_24h, e_o_mais_baixo):
    """Uma frase curta explicando a posição — a interface mostra isso do lado."""
    partes = []
    if e_o_mais_baixo:
        partes.append('ponto mais baixo da região')
    elif terreno >= 66:
        partes.append('terreno baixo')
    if obstrucao >= 80:
        partes.append(f'{obstrucao:.0f}% obstruído')
    elif obstrucao >= 65:
        partes.append(f'{obstrucao:.0f}% de obstrução')
    if chuva_24h >= 20:
        partes.append(f'{chuva_24h:.0f} mm de chuva a caminho')
    # Nunca devolve "nenhum fator": um bueiro pode pontuar MEDIO só pela soma de
    # parcelas que isoladamente não cruzam limite nenhum, e aí dizer que não há
    # motivo contradiz a nota que aparece do lado.
    return ' e '.join(partes) if partes else f'{obstrucao:.0f}% de obstrução'


def pontuar(bueiros, altitudes, chuva_24h_mm):
    """A conta, sem rede: recebe tudo pronto e devolve o ranking.

    O fator de terreno é relativo ao próprio conjunto, não absoluto: 870 m é alto
    em Santa Rita e baixo na serra. O mais baixo dos bueiros monitorados leva 100
    e o mais alto leva 0, porque a água escorre para o mais baixo *deles*.
    """
    valores = [altitudes[b['bueiro_id']] for b in bueiros] if altitudes else []
    mais_alto = max(valores) if valores else 0.0
    mais_baixo = min(valores) if valores else 0.0
    desnivel = mais_alto - mais_baixo

    fator_chuva = min(100.0, chuva_24h_mm / CHUVA_REFERENCIA_MM * 100)

    ranking = []
    for b in bueiros:
        obstrucao = max(0.0, min(100.0, float(b.get('capacidade_porcentagem') or 0)))

        if not altitudes or desnivel < DESNIVEL_MINIMO_M:
            # Sem altitude, ou região plana: terreno não desempata ninguém.
            fator_terreno = 50.0
            e_o_mais_baixo = False
        else:
            altitude = altitudes[b['bueiro_id']]
            fator_terreno = (mais_alto - altitude) / desnivel * 100
            e_o_mais_baixo = altitude == mais_baixo

        risco = (PESO_OBSTRUCAO * obstrucao
                 + PESO_TERRENO * fator_terreno
                 + PESO_CHUVA * fator_chuva)

        ranking.append({
            'bueiro_id': b['bueiro_id'],
            'risco': round(risco, 1),
            'nivel': ('ALTO' if risco >= RISCO_ALTO
                      else 'MEDIO' if risco >= RISCO_MEDIO else 'BAIXO'),
            'altitude_m': altitudes.get(b['bueiro_id']) if altitudes else None,
            'capacidade_porcentagem': round(obstrucao, 1),
            'fator_terreno': round(fator_terreno, 1),
            'motivo': _motivo(obstrucao, fator_terreno, chuva_24h_mm, e_o_mais_baixo),
        })

    ranking.sort(key=lambda x: x['risco'], reverse=True)
    return ranking


def calcular(bueiros):
    """Ranking completo, buscando altitude e chuva. Nunca levanta por rede fora."""
    if not bueiros:
        return {
            'bueiros': [], 'chuva_24h_mm': 0.0, 'chuva_72h_mm': 0.0,
            'terreno_disponivel': False, 'chuva_disponivel': False,
            'atualizado_em': datetime.now().isoformat(),
        }

    try:
        altitudes = obter_altitudes(bueiros)
    except Exception as e:
        print(f'[PREVISAO] altitude indisponível ({e}); usando terreno neutro', flush=True)
        altitudes = {}

    centro_lat = sum(b['latitude'] for b in bueiros) / len(bueiros)
    centro_lon = sum(b['longitude'] for b in bueiros) / len(bueiros)
    try:
        chuva = obter_chuva(centro_lat, centro_lon)
    except Exception as e:
        print(f'[PREVISAO] previsão de chuva indisponível ({e}); considerando 0 mm', flush=True)
        chuva = None

    chuva_24h = chuva['chuva_24h_mm'] if chuva else 0.0

    return {
        'bueiros': pontuar(bueiros, altitudes, chuva_24h),
        'chuva_24h_mm': chuva_24h,
        'chuva_72h_mm': chuva['chuva_72h_mm'] if chuva else 0.0,
        'terreno_disponivel': bool(altitudes),
        'chuva_disponivel': chuva is not None,
        'atualizado_em': datetime.now().isoformat(),
    }


if __name__ == '__main__':
    # Verificação da conta, sem rede: o ranking é o que a cidade vai cobrar.
    baixo_e_entupido = {'bueiro_id': 'b1', 'latitude': -22.25, 'longitude': -45.69,
                        'capacidade_porcentagem': 90}
    alto_e_limpo = {'bueiro_id': 'b2', 'latitude': -22.26, 'longitude': -45.70,
                    'capacidade_porcentagem': 10}
    meio = {'bueiro_id': 'b3', 'latitude': -22.27, 'longitude': -45.71,
            'capacidade_porcentagem': 50}
    tres = [alto_e_limpo, meio, baixo_e_entupido]
    alturas = {'b1': 820.0, 'b2': 870.0, 'b3': 845.0}

    r = pontuar(tres, alturas, chuva_24h_mm=0.0)
    assert [x['bueiro_id'] for x in r] == ['b1', 'b3', 'b2'], r
    assert r[0]['fator_terreno'] == 100.0 and r[-1]['fator_terreno'] == 0.0
    assert 'ponto mais baixo' in r[0]['motivo'] and '90% obstruído' in r[0]['motivo']
    # O motivo nunca fica vazio nem nega risco: sempre sobra a obstrução medida.
    assert r[-1]['motivo'] == '10% de obstrução', r[-1]

    # Estar no fundo do vale pesa mesmo com o bueiro limpo: entre dois iguais,
    # o mais baixo tem que vir primeiro.
    igual_baixo = dict(baixo_e_entupido, capacidade_porcentagem=50)
    r = pontuar([igual_baixo, dict(alto_e_limpo, capacidade_porcentagem=50)],
                {'b1': 820.0, 'b2': 870.0}, 0.0)
    assert r[0]['bueiro_id'] == 'b1', r

    # Região plana não pode inventar desnível: todos ficam neutros em terreno.
    r = pontuar(tres, {'b1': 845.0, 'b2': 845.0, 'b3': 845.4}, 0.0)
    assert all(x['fator_terreno'] == 50.0 for x in r), r

    # Chuva entra igual para todos: sobe a nota de todo mundo, não muda a ordem.
    seco = pontuar(tres, alturas, 0.0)
    molhado = pontuar(tres, alturas, CHUVA_REFERENCIA_MM)
    assert [x['bueiro_id'] for x in seco] == [x['bueiro_id'] for x in molhado]
    assert all(m['risco'] > s['risco'] for s, m in zip(seco, molhado))
    assert molhado[0]['nivel'] == 'ALTO'

    # Sem altitude nenhuma (Open-Meteo fora do ar) ainda sai ranking pela obstrução.
    r = pontuar(tres, {}, 0.0)
    assert [x['bueiro_id'] for x in r] == ['b1', 'b3', 'b2'], r
    assert r[0]['altitude_m'] is None

    print('previsao.py: todas as verificações passaram')
