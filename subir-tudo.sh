#!/bin/bash
#
# Sobe tudo o que a demonstracao do Smart Drain precisa, em janelas visiveis do
# Terminal, e so termina depois de confirmar que cada peca respondeu de verdade.
#
# Versao para macOS e Linux do subir-tudo.ps1. Existe pelo mesmo motivo: a
# sequencia tem tres partes, em duas pastas, e errar a ordem custa minutos que
# ninguem tem no dia da feira.
#
#     ./subir-tudo.sh                 sobe API, dashboard e simulador
#     ./subir-tudo.sh --sem-simulador quando outra maquina ja esta publicando
#
# O que ja estiver no ar e reaproveitado, nao duplicado: rodar duas vezes nao
# quebra nada.

set -u

SEM_SIMULADOR=0
[ "${1:-}" = "--sem-simulador" ] && SEM_SIMULADOR=1

# Os dois repositorios guardam as mesmas pecas em pastas de nomes diferentes, e
# este script vive nos dois. Procura ao lado de si primeiro.
RAIZ="$(cd "$(dirname "$0")" && pwd)"

PASTA_API=""
for candidata in "$RAIZ/apismartdrain" "$RAIZ/backend"; do
    [ -d "$candidata" ] && PASTA_API="$candidata" && break
done

PASTA_DASHBOARD=""
[ -d "$RAIZ/frontend" ] && PASTA_DASHBOARD="$RAIZ/frontend"

# apismartdrain.py numa copia, app.py na outra; e o mesmo programa.
ARQUIVO_API=""
for candidato in apismartdrain.py app.py; do
    [ -f "$PASTA_API/$candidato" ] && ARQUIVO_API="$candidato" && break
done

if [ -z "$PASTA_API" ] || [ -z "$PASTA_DASHBOARD" ] || [ -z "$ARQUIVO_API" ]; then
    echo "Nao achei a API ou a dashboard a partir de $RAIZ." >&2
    exit 1
fi

# A porta sai do .env, porque no macOS a 5000 e do AirPlay Receiver e precisa
# ser outra. Sem .env, 5000, que e o padrao do proprio app.
PORTA_API=$(grep -E '^PORT=' "$PASTA_API/.env" 2>/dev/null | tail -1 | cut -d= -f2 | tr -d '[:space:]')
PORTA_API=${PORTA_API:-5000}
PORTA_DASHBOARD=3000

PYTHON="$PASTA_API/.venv/bin/python"
if [ ! -x "$PYTHON" ]; then
    echo "Sem ambiente virtual em $PASTA_API/.venv" >&2
    echo "Crie com: cd '$PASTA_API' && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt" >&2
    exit 1
fi

porta_em_uso() {
    lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

# No macOS abre uma janela do Terminal; no Linux tenta os emuladores comuns e,
# se nao achar nenhum, roda em segundo plano com o log num arquivo.
abrir_janela() {
    titulo="$1"; pasta="$2"; comando="$3"
    if [ "$(uname)" = "Darwin" ]; then
        osascript -e "tell application \"Terminal\" to do script \"cd '$pasta' && echo '== $titulo ==' && $comando\"" >/dev/null
        osascript -e 'tell application "Terminal" to activate' >/dev/null
    elif command -v gnome-terminal >/dev/null 2>&1; then
        gnome-terminal --title="$titulo" -- bash -c "cd '$pasta' && $comando; exec bash"
    elif command -v xterm >/dev/null 2>&1; then
        xterm -T "$titulo" -e bash -c "cd '$pasta' && $comando; exec bash" &
    else
        log="/tmp/smartdrain-$(echo "$titulo" | tr ' A-Z' '-a-z').log"
        ( cd "$pasta" && eval "$comando" >"$log" 2>&1 & )
        echo "             sem terminal grafico; log em $log"
    fi
}

echo
echo "  SMART DRAIN - subindo o ambiente"
echo

# ------------------------------------------------------------------ API
printf "  API .......... "
if porta_em_uso "$PORTA_API"; then
    echo "ja estava no ar"
else
    echo "abrindo janela..."
    abrir_janela 'SMART DRAIN - API' "$PASTA_API" "'.venv/bin/python' -u $ARQUIVO_API"
    printf "  API .......... "
    for _ in $(seq 1 30); do
        curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$PORTA_API/api/configuracoes" && break
        sleep 1
    done
    if curl -s -o /dev/null --max-time 3 "http://127.0.0.1:$PORTA_API/api/configuracoes"; then
        echo "OK"
    else
        echo "NAO RESPONDEU - veja a janela da API"
    fi
fi

# ------------------------------------------------------------ Dashboard
printf "  Dashboard .... "
if porta_em_uso "$PORTA_DASHBOARD"; then
    echo "ja estava no ar"
else
    echo "abrindo janela..."
    abrir_janela 'SMART DRAIN - DASHBOARD' "$PASTA_DASHBOARD" "npm run dev"
    printf "  Dashboard .... "
    for _ in $(seq 1 60); do
        curl -s -o /dev/null --max-time 2 "http://localhost:$PORTA_DASHBOARD" && break
        sleep 1
    done
    if curl -s -o /dev/null --max-time 3 "http://localhost:$PORTA_DASHBOARD"; then
        echo "OK"
    else
        echo "NAO RESPONDEU - veja a janela da dashboard"
    fi
fi

# ------------------------------------------------------------- Simulador
if [ "$SEM_SIMULADOR" = "1" ]; then
    echo "  Simulador .... pulado (--sem-simulador)"
elif pgrep -f "simulador_continuo.py" >/dev/null 2>&1; then
    echo "  Simulador .... ja estava rodando"
else
    echo "  Simulador .... abrindo janela..."
    abrir_janela 'SMART DRAIN - SIMULADOR' "$PASTA_API" "'.venv/bin/python' simulador_continuo.py"
fi

# Prova que a cadeia inteira esta de pe: nao basta a API responder, tem que
# chegar leitura NOVA. E o unico teste que pega broker mudo ou banco fora.
echo
echo "  Conferindo se chega telemetria nova..."
ultimo() {
    curl -s --max-time 5 "http://127.0.0.1:$PORTA_API/api/bueiros/tempo-real" 2>/dev/null \
        | "$PYTHON" -c "import sys,json
try:
    d=json.load(sys.stdin)
    print(max(b['timestamp'] for b in d) if d else '')
except Exception:
    print('')"
}

antes=$(ultimo)
chegou=0
for _ in $(seq 1 20); do
    sleep 2
    [ -n "$(ultimo)" ] && [ "$(ultimo)" != "$antes" ] && chegou=1 && break
done
[ "$chegou" = "1" ] && echo "  Telemetria ... CHEGANDO" || echo "  Telemetria ... SEM DADO NOVO - veja a janela do simulador"

ip=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')
echo
echo "  ---------------------------------------------"
echo "  Dashboard:  http://localhost:$PORTA_DASHBOARD/previsao"
echo "  API:        http://127.0.0.1:$PORTA_API"
echo "  No celular: ${ip:-<sem IP>}:$PORTA_API   (mesmo Wi-Fi)"
echo "              Esse IP muda a cada rede. Por cabo USB, use"
echo "              'adb reverse tcp:$PORTA_API tcp:$PORTA_API' e 127.0.0.1:$PORTA_API."
echo "  ---------------------------------------------"
echo
