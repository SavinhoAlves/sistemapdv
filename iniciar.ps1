# Detecta o IP local da máquina (ignora loopback e link-local)
$ip = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.' -and $_.PrefixOrigin -ne 'WellKnown' } |
    Sort-Object -Property PrefixLength -Descending |
    Select-Object -First 1).IPAddress

if (-not $ip) {
    Write-Host "Nao foi possivel detectar o IP da rede. Usando localhost." -ForegroundColor Yellow
    $ip = "localhost"
}

Write-Host ""
Write-Host "IP detectado: $ip" -ForegroundColor Cyan

# Gera/atualiza o certificado HTTPS local (mkcert) pro IP atual — a camera
# do celular (login por cracha QR) so funciona em contexto seguro (https).
# O CA raiz e instalado uma unica vez (mkcert -install); certificados-folha
# novos pra um IP diferente sao aceitos automaticamente pelos celulares que
# ja confiam nesse CA, sem precisar reinstalar nada neles.
$certDir = "$PSScriptRoot\certs"
$mkcert = Get-Command mkcert -ErrorAction SilentlyContinue
$usaHttps = $false

if ($mkcert) {
    New-Item -ItemType Directory -Force -Path $certDir | Out-Null
    & mkcert -cert-file "$certDir\cert.pem" -key-file "$certDir\key.pem" localhost 127.0.0.1 $ip
    $usaHttps = $true
} else {
    Write-Host "mkcert nao encontrado no PATH — subindo em HTTP (camera do celular nao vai funcionar)." -ForegroundColor Yellow
}

$protocolo = if ($usaHttps) { "https" } else { "http" }

# Atualiza frontend/.env
$frontendEnvPath = "$PSScriptRoot\frontend\.env"
$frontendEnv = "NUXT_PUBLIC_API_URL=${protocolo}://${ip}:3001`nNUXT_PUBLIC_SOCKET_URL=${protocolo}://${ip}:3001`nNUXT_PUBLIC_LICENSE_SECRET=nova2020*"
Set-Content -Path $frontendEnvPath -Value $frontendEnv -Encoding UTF8

# Atualiza CORS_ORIGIN no backend/.env
$backendEnvPath = "$PSScriptRoot\backend\.env"
(Get-Content $backendEnvPath) -replace 'CORS_ORIGIN=.*', "CORS_ORIGIN=${protocolo}://${ip}:3000" |
    Set-Content $backendEnvPath -Encoding UTF8

Write-Host "Arquivos .env atualizados." -ForegroundColor Green
Write-Host ""
Write-Host "Acesse o sistema em: ${protocolo}://${ip}:3000" -ForegroundColor Green
Write-Host ""

# Inicia o backend em uma nova janela (node server.js direto — o script
# "npm run dev" do backend aponta pra um arquivo que nao existe)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; node server.js" -WindowStyle Normal

# Aguarda um momento para o backend subir antes do frontend
Start-Sleep -Seconds 2

# Inicia o frontend em uma nova janela
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -WindowStyle Normal

Write-Host "Servidores iniciados!" -ForegroundColor Green
Write-Host "Backend: ${protocolo}://${ip}:3001" -ForegroundColor DarkCyan
Write-Host "Frontend: ${protocolo}://${ip}:3000" -ForegroundColor DarkCyan
Write-Host ""
