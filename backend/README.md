# Backend — API Flask + listener MQTT

Serve o painel web (`frontend/`) e o app de campo (`mobile/`), e escuta a
telemetria dos bueiros por MQTT.

## Rodar

```bat
python -m venv .venv
.venv\Scripts\python.exe -m pip install flask flask-sqlalchemy flask-cors psycopg2-binary paho-mqtt itsdangerous python-dotenv pillow
.venv\Scripts\python.exe app.py
```

Configuração em `.env` (não versionado — copie de `.env.example`):

```
DATABASE_URL=postgresql+psycopg2://...
SECRET_KEY=valor-aleatorio-longo
PORT=5000
RAIO_LIMPEZA_METROS=50
```

Se a porta escolhida já estiver ocupada, o Windows **não** dá erro: dois
processos bindam a mesma porta e o resultado é indefinido — a API sobe "com
sucesso" e responde 404 em tudo. Para descobrir quem detém a porta:

```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen
```

## Autenticação

`/api/login` devolve um token assinado (itsdangerous), válido por 12 h. As rotas
protegidas exigem `Authorization: Bearer <token>`; sem ele, ou com token
adulterado/expirado, a resposta é 401 com o motivo em `erro`.

| Rota | Token |
|---|---|
| `/api/login`, `/api/bueiros/tempo-real` | não |
| `/api/configuracoes`, `/api/historico/*`, `/api/comandos/tempestade` | não |
| `/api/usuarios` (GET, POST), `/api/usuarios/<id>` (DELETE) | **sim** |
| `/api/limpeza/iniciar`, `/api/limpeza/finalizar` | **sim** |

Telemetria, histórico e configurações seguem abertas para não quebrar o painel
web. Vale fechá-las quando o painel souber mandar o token — `POST
/api/configuracoes` e `/api/comandos/tempestade` publicam comando MQTT sem
autenticação nenhuma hoje.

## Validação da limpeza

A trava de 3 m do app é **só no cliente**: quem chamar a API direto passa por
cima dela. No servidor:

**Distância** — compara a coordenada recebida com
`bueiros_cadastro.latitude_fixa/longitude_fixa` e recusa fora do raio
(`RAIO_LIMPEZA_METROS`, padrão 50 m). É maior que os 3 m do app porque GPS de
celular erra alguns metros em cidade, e apertar demais reprova limpeza legítima.
Bueiro sem coordenada cadastrada não bloqueia, só loga aviso.

**Horário da foto** — lê o tag EXIF `DateTime` e recusa foto mais de 30 min mais
velha que o envio, pegando foto de galeria ou reaproveitada.

Não dá para validar GPS pelo EXIF: as fotos chegam **sem** GPS, porque o app usa
a câmera do sistema (gravar coordenada depende da configuração do aparelho) e
recomprime a imagem. Além disso EXIF é editável — serve como reforço, nunca como
trava principal.

O `funcionario_id` das limpezas vem **do token**, não do corpo da requisição.

## Banco (Supabase)

| Tabela | Uso |
|---|---|
| `usuarios` | Login |
| `telemetria_bueiros` | Leituras dos sensores (chegam por MQTT) |
| `historico_manutencoes` | Limpezas — `INICIO` e `FIM` |
| `bueiros_cadastro` | Posição fixa de cada bueiro |
| `historico_alertas` | Vazia hoje |

`db.create_all()` cria tabelas que faltam, mas **nunca altera tabelas
existentes** — coluna nova exige `ALTER TABLE`, como faz
`migrar_colunas_limpeza.py` (aditivo e idempotente; já foi aplicado no banco).

## Fotos das limpezas

Salvas em `uploads/limpezas/` e servidas em `GET /uploads/limpezas/<arquivo>`. O
caminho é o mesmo valor gravado em `historico_manutencoes.foto_url`, então o
painel pode usar o campo do banco direto no `src` da imagem.

As fotos ficam no disco de quem roda a API: trocar de máquina sem levar a pasta
deixa todos os `foto_url` apontando para o nada.

## Testes

```bat
.venv\Scripts\python.exe test_validacoes.py
```

Cobre distância (haversine), leitura de EXIF, validação de posição e
autenticação (sem header, malformado, adulterado, expirado, válido).

## Cuidado ao testar limpeza

`/api/limpeza/iniciar` publica `PAUSAR_SENSOR` e `DESTRAVAR_FECHADURA` no
`broker.hivemq.com`, que é **público e sem autenticação**, no tópico real
`santa_rita/smart_drain/comandos`. Com hardware ligado, isso destrava fechadura
de verdade — e qualquer pessoa no mundo pode publicar nesse tópico.

Quando houver broker próprio, muda só o bloco de constantes MQTT no topo de
`app.py` mais um `mqtt_client.username_pw_set(...)`, de preferência com as
credenciais vindo do `.env`.
