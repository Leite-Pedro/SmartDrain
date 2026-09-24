<#
    Sobe tudo o que a demonstracao do Smart Drain precisa, em janelas visiveis,
    e so termina depois de confirmar que cada peca respondeu de verdade.

    Existe porque a sequencia tem tres partes, em duas pastas diferentes, e
    errar a ordem ou o caminho custa minutos que ninguem tem no dia da feira.
    Cada peca abre na sua propria janela de proposito: o log da API rolando na
    tela e demonstracao por si so, e fechar uma janela derruba so aquela peca.

        .\subir-tudo.ps1                 sobe API, dashboard e simulador
        .\subir-tudo.ps1 -SemSimulador   quando outra maquina ja esta publicando

    O que ja estiver no ar e reaproveitado, nao duplicado: rodar duas vezes nao
    quebra nada.
#>
param(
    # Use quando o simulador ja estiver rodando em outro computador da equipe.
    # Dois simuladores publicando nao quebram nada, so enchem o banco em dobro.
    [switch]$SemSimulador
)

$ErrorActionPreference = 'Stop'

# Os dois repositorios guardam as mesmas pecas em pastas de nomes diferentes, e
# este script vive nos dois. Procura ao lado de si primeiro e so depois cai nos
# caminhos do notebook, para uma copia nao depender da outra.
$Raiz = $PSScriptRoot

$PastaApi = @(
    (Join-Path $Raiz 'apismartdrain'),
    (Join-Path $Raiz 'backend'),
    'C:\Projetos\Smartdrain\apismartdrain'
) | Where-Object { Test-Path $_ } | Select-Object -First 1

$PastaDashboard = @(
    (Join-Path $Raiz 'frontend'),
    'C:\Projetos\SmartDrain-pedro\frontend'
) | Where-Object { Test-Path $_ } | Select-Object -First 1

# apismartdrain.py numa copia, app.py na outra; e o mesmo programa.
$ArquivoApi = @('apismartdrain.py', 'app.py') |
    Where-Object { Test-Path (Join-Path $PastaApi $_) } | Select-Object -First 1

if (-not $PastaApi -or -not $PastaDashboard -or -not $ArquivoApi) {
    throw "Nao achei a API ou a dashboard a partir de $Raiz."
}
$PortaApi       = 5001
$PortaDashboard = 3000

# ---------------------------------------------------------------------------

function Porta-EmUso($porta) {
    $conexao = Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue
    return $null -ne $conexao
}

function Simulador-Rodando {
    # O simulador nao abre porta, entao nao da para procura-lo como as outras
    # pecas: procura-se a linha de comando do processo.
    $proc = Get-CimInstance Win32_Process -Filter "Name like '%python%'" -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandLine -like '*simulador_continuo*' }
    return $null -ne $proc
}

function Abrir-Janela($titulo, $pasta, $comando) {
    # -NoExit mantem a janela aberta para a pessoa ler o log e fechar quando quiser.
    $script = "`$host.UI.RawUI.WindowTitle = '$titulo'; Write-Host '=== $titulo ===' -ForegroundColor Yellow; $comando"
    Start-Process powershell -WorkingDirectory $pasta -ArgumentList '-NoExit', '-Command', $script | Out-Null
}

function Esperar-Responder($url, $segundos) {
    # Espera de verdade em vez de dormir um tempo fixo: a API demora conforme o
    # Supabase responde, e o Next compila na primeira visita a pagina.
    for ($i = 0; $i -lt $segundos; $i++) {
        try {
            Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
            return $true
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    return $false
}

function Ultima-Telemetria {
    # Devolve o timestamp mais recente que a API conhece, como texto. Comparar
    # dois desses diz se chegou leitura nova, sem precisar acertar fuso horario.
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$PortaApi/api/bueiros/tempo-real" -UseBasicParsing -TimeoutSec 8
        $dados = $r.Content | ConvertFrom-Json
        if ($dados.Count -eq 0) { return '' }
        return ($dados | ForEach-Object { $_.timestamp } | Sort-Object | Select-Object -Last 1)
    } catch {
        return ''
    }
}

# ---------------------------------------------------------------------------

Write-Host ''
Write-Host '  SMART DRAIN - subindo o ambiente' -ForegroundColor Cyan
Write-Host ''

# --- API -------------------------------------------------------------------
if (Porta-EmUso $PortaApi) {
    Write-Host "  API .......... ja estava no ar na porta $PortaApi"
} else {
    Write-Host '  API .......... abrindo janela...'
    Abrir-Janela 'SMART DRAIN - API' $PastaApi ".\.venv\Scripts\python.exe -u $ArquivoApi"
}

$apiOk = Esperar-Responder "http://127.0.0.1:$PortaApi/api/configuracoes" 60
if ($apiOk) {
    Write-Host '  API .......... OK' -ForegroundColor Green
} else {
    Write-Host '  API .......... NAO RESPONDEU' -ForegroundColor Red
    Write-Host '                 Olhe a janela da API: o erro mais comum e o banco' -ForegroundColor Red
    Write-Host '                 do Supabase pausado por inatividade.' -ForegroundColor Red
}

# --- dashboard -------------------------------------------------------------
if (Porta-EmUso $PortaDashboard) {
    Write-Host "  Dashboard .... ja estava no ar na porta $PortaDashboard"
} else {
    Write-Host '  Dashboard .... abrindo janela...'
    Abrir-Janela 'SMART DRAIN - DASHBOARD' $PastaDashboard 'npm run dev'
}

$dashOk = Esperar-Responder "http://localhost:$PortaDashboard" 90
if ($dashOk) {
    Write-Host '  Dashboard .... OK' -ForegroundColor Green
} else {
    Write-Host '  Dashboard .... NAO RESPONDEU' -ForegroundColor Red
}

# --- simulador -------------------------------------------------------------
# Medido antes de abrir o simulador, para saber se a leitura nova veio dele.
$antes = Ultima-Telemetria

if ($SemSimulador) {
    Write-Host '  Simulador .... pulado (-SemSimulador)'
} elseif (Simulador-Rodando) {
    Write-Host '  Simulador .... ja estava rodando'
} else {
    Write-Host '  Simulador .... abrindo janela...'
    Abrir-Janela 'SMART DRAIN - SIMULADOR' $PastaApi '.\.venv\Scripts\python.exe simulador_continuo.py'
}

# --- a prova real ----------------------------------------------------------
# Telemetria nova significa que a corrente inteira funcionou: simulador publicou
# no broker, a API recebeu, gravou no banco e serviu de volta. Nenhum teste de
# porta prova isso.
if ($apiOk) {
    Write-Host ''
    Write-Host '  Conferindo se chega telemetria nova...'
    $chegou = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        $agora = Ultima-Telemetria
        if ($agora -ne '' -and $agora -ne $antes) { $chegou = $true; break }
    }
    if ($chegou) {
        Write-Host '  Telemetria ... CHEGANDO' -ForegroundColor Green
    } else {
        Write-Host '  Telemetria ... PARADA' -ForegroundColor Yellow
        Write-Host '                 As telas vao mostrar o ultimo valor antigo.' -ForegroundColor Yellow
        Write-Host '                 Veja a janela do simulador e a internet.' -ForegroundColor Yellow
    }
}

# --- o que a pessoa precisa saber depois -----------------------------------
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
       Select-Object -First 1).IPAddress

Write-Host ''
Write-Host '  ---------------------------------------------' -ForegroundColor Cyan
Write-Host "  Dashboard:  http://localhost:$PortaDashboard/previsao"
Write-Host "  API:        http://127.0.0.1:$PortaApi"
if ($ip) {
    Write-Host "  No celular: $ip`:$PortaApi   (mesmo Wi-Fi)"
    Write-Host '              Esse IP muda a cada rede. Por cabo USB, use'
    Write-Host "              'adb reverse tcp:$PortaApi tcp:$PortaApi' e 127.0.0.1:$PortaApi."
}
Write-Host '  ---------------------------------------------' -ForegroundColor Cyan
Write-Host ''
