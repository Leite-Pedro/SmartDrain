"""Checagem das validações de limpeza. Rode: .venv\\Scripts\\python.exe test_validacoes.py"""
import io
from datetime import datetime

from PIL import Image

from app import (
    distancia_metros, horario_da_foto, erro_de_posicao, app, serializer,
    TOKEN_VALIDADE_SEGUNDOS,
)

# Bueiro centro 02, conforme bueiros_cadastro
BUEIRO_LAT, BUEIRO_LON = -22.25781, -45.697985


def test_distancia():
    # Mesmo ponto
    assert distancia_metros(BUEIRO_LAT, BUEIRO_LON, BUEIRO_LAT, BUEIRO_LON) < 0.1

    # ~111 m ao norte (0,001 grau de latitude)
    d = distancia_metros(BUEIRO_LAT, BUEIRO_LON, BUEIRO_LAT + 0.001, BUEIRO_LON)
    assert 110 < d < 112, d

    # Santa Rita -> São Paulo em linha reta, ~172 km (a rodoviária é bem maior)
    d = distancia_metros(BUEIRO_LAT, BUEIRO_LON, -23.5505, -46.6333)
    assert 170_000 < d < 176_000, d


def _jpeg(datetime_exif=None):
    """JPEG mínimo em memória, com ou sem o tag DateTime."""
    buffer = io.BytesIO()
    imagem = Image.new('RGB', (8, 8))
    if datetime_exif:
        exif = imagem.getexif()
        exif[306] = datetime_exif
        imagem.save(buffer, format='JPEG', exif=exif)
    else:
        imagem.save(buffer, format='JPEG')
    buffer.seek(0)
    return buffer


def test_horario_da_foto():
    assert horario_da_foto(_jpeg('2026:08:10 13:28:15')) == datetime(2026, 8, 10, 13, 28, 15)
    assert horario_da_foto(_jpeg()) is None          # sem EXIF -> None, não estoura
    assert horario_da_foto(io.BytesIO(b'nao sou jpeg')) is None

    # O upload precisa continuar legível depois da checagem
    foto = _jpeg('2026:08:10 13:28:15')
    horario_da_foto(foto)
    assert foto.read(2) == b'\xff\xd8', 'stream nao voltou para o inicio'


def test_erro_de_posicao():
    with app.app_context():
        assert erro_de_posicao('bueiro_centro_02', BUEIRO_LAT, BUEIRO_LON) is None

        # ~111 m: fora do raio de 50 m
        longe = erro_de_posicao('bueiro_centro_02', BUEIRO_LAT + 0.001, BUEIRO_LON)
        assert longe is not None and '111 m' in longe, longe

        # Bueiro inexistente não bloqueia (não há posição para comparar)
        assert erro_de_posicao('bueiro_que_nao_existe', 0, 0) is None


def test_autenticacao():
    cliente = app.test_client()
    token = serializer.dumps({'usuario_id': 5})

    # Sem header, com header malformado e com token adulterado: tudo 401
    assert cliente.get('/api/usuarios').status_code == 401
    assert cliente.get('/api/usuarios', headers={'Authorization': token}).status_code == 401
    adulterado = 'Bearer ' + token[:-4] + 'xxxx'
    assert cliente.get('/api/usuarios', headers={'Authorization': adulterado}).status_code == 401

    # Token válido passa
    ok = cliente.get('/api/usuarios', headers={'Authorization': f'Bearer {token}'})
    assert ok.status_code == 200, ok.data

    # Token expirado é recusado. Quem carimba a hora é o TimestampSigner interno,
    # não o serializer — por isso o patch é no time.time do módulo itsdangerous.timed.
    import itsdangerous.timed as timed

    relogio_real = timed.time.time
    timed.time.time = lambda: relogio_real() - TOKEN_VALIDADE_SEGUNDOS - 60
    try:
        velho = serializer.dumps({'usuario_id': 5})
    finally:
        timed.time.time = relogio_real

    r = cliente.get('/api/usuarios', headers={'Authorization': f'Bearer {velho}'})
    assert r.status_code == 401, r.data
    assert 'expirada' in r.get_json()['erro'], r.get_json()

    # Rota pública continua aberta — não vale quebrar a dashboard sem querer
    assert cliente.get('/api/bueiros/tempo-real').status_code == 200


if __name__ == '__main__':
    test_distancia()
    test_horario_da_foto()
    test_erro_de_posicao()
    test_autenticacao()
    print('OK — distancia, EXIF, posicao e autenticacao')
