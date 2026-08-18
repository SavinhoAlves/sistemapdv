# Inicia o PDV e fica de vigia: se o IP da rede mudar (DHCP), regera o
# certificado HTTPS e reinicia backend + frontend sozinho, sem precisar
# rodar este script de novo na mao.

function Detectar-Ip {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.' -and $_.PrefixOrigin -ne 'WellKnown' } |
        Sort-Object -Property PrefixLength -Descending |
        Select-Object -First 1).IPAddress

    if (-not $ip) { return "localhost" }
    return $ip
}

function Configurar-Ambiente($ip) {
    Write-Host ""
    Write-Host "IP detectado: $ip" -ForegroundColor Cyan

    # Gera/atualiza o certificado HTTPS local (mkcert) pro IP atual - a camera
    # do celular (login por cracha QR) so funciona em contexto seguro (https).
    # O CA raiz e instalado uma unica vez (mkcert -install); certificados-folha
    # novos pra um IP diferente sao aceitos automaticamente pelos celulares que
    # ja confiam nesse CA, sem precisar reinstalar nada neles.
    $certDir = "$PSScriptRoot\certs"
    $mkcert = Get-Command mkcert -ErrorAction SilentlyContinue
    $usaHttps = $false

    if ($mkcert) {
        New-Item -ItemType Directory -Force -Path $certDir | Out-Null
        & mkcert -cert-file "$certDir\cert.pem" -key-file "$certDir\key.pem" localhost 127.0.0.1 $ip | Out-Null
        $usaHttps = $true
    } else {
        Write-Host "mkcert nao encontrado no PATH - subindo em HTTP (camera do celular nao vai funcionar)." -ForegroundColor Yellow
    }

    $protocolo = if ($usaHttps) { "https" } else { "http" }

    $frontendEnvPath = "$PSScriptRoot\frontend\.env"
    $frontendEnv = "NUXT_PUBLIC_API_URL=${protocolo}://${ip}:3001`nNUXT_PUBLIC_SOCKET_URL=${protocolo}://${ip}:3001`nNUXT_PUBLIC_LICENSE_SECRET=nova2020*"
    Set-Content -Path $frontendEnvPath -Value $frontendEnv -Encoding UTF8

    $backendEnvPath = "$PSScriptRoot\backend\.env"
    (Get-Content $backendEnvPath) -replace 'CORS_ORIGIN=.*', "CORS_ORIGIN=${protocolo}://${ip}:3000" |
        Set-Content $backendEnvPath -Encoding UTF8

    Write-Host "Arquivos .env atualizados." -ForegroundColor Green
    Write-Host "Acesse o sistema em: ${protocolo}://${ip}:3000" -ForegroundColor Green
    Write-Host ""
}

# Mata o que estiver escutando nas portas do PDV - encontra pelo dono real
# da porta (nao pela janela do PowerShell), assim nao sobra processo node
# orfao travando a porta na proxima subida
function Parar-Servidores {
    foreach ($porta in 3000, 3001) {
        $conexoes = Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue
        foreach ($c in $conexoes) {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 1
}

function Iniciar-Servidores {
    # node server.js direto - o script "npm run dev" do backend aponta pra
    # um arquivo que nao existe
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; node server.js" -WindowStyle Normal
    Start-Sleep -Seconds 2

    # Frontend em modo PRODUCAO: o servidor de dev (Vite) nao serve sub-caminhos
    # (/m, /login, etc.) corretamente para clientes externos como celulares.
    # O build gera um servidor Node real que trata todas as rotas.
    $outputServer = "$PSScriptRoot\frontend\.output\server\index.mjs"
    $rootCA = "$env:LOCALAPPDATA\mkcert\rootCA.pem"
    $prefixoCA = if (Test-Path $rootCA) { "`$env:NODE_EXTRA_CA_CERTS='$rootCA'; " } else { "" }

    if (-not (Test-Path $outputServer)) {
        Write-Host "Build do frontend nao encontrado. Gerando agora (aguarde ~1 min)..." -ForegroundColor Yellow
        Push-Location "$PSScriptRoot\frontend"
        npm run build
        Pop-Location
    }

    Start-Process powershell -ArgumentList "-NoExit", "-Command", "${prefixoCA}cd '$PSScriptRoot\frontend'; npm run start" -WindowStyle Normal
    Write-Host "Servidores iniciados!" -ForegroundColor Green
    Write-Host ""
}

#  boot inicial 
$ipAtual = Detectar-Ip
Configurar-Ambiente $ipAtual
Iniciar-Servidores

#  vigia: reinicia sozinho se o IP da rede mudar 
Write-Host "Vigiando o IP da rede (Ctrl+C pra parar de vigiar; os servidores continuam rodando)..." -ForegroundColor DarkGray
while ($true) {
    Start-Sleep -Seconds 20
    $ipNovo = Detectar-Ip
    if ($ipNovo -ne $ipAtual) {
        Write-Host ""
        Write-Host "IP mudou de $ipAtual para $ipNovo - regerando certificado e reiniciando..." -ForegroundColor Yellow
        Parar-Servidores
        Configurar-Ambiente $ipNovo
        Iniciar-Servidores
        $ipAtual = $ipNovo
    }
}
