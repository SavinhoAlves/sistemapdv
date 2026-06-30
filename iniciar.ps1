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

# Atualiza frontend/.env
$frontendEnvPath = "$PSScriptRoot\frontend\.env"
$frontendEnv = "NUXT_PUBLIC_API_URL=http://${ip}:3001`nNUXT_PUBLIC_SOCKET_URL=http://${ip}:3001`nNUXT_PUBLIC_LICENSE_SECRET=nova2020*"
Set-Content -Path $frontendEnvPath -Value $frontendEnv -Encoding UTF8

# Atualiza CORS_ORIGIN no backend/.env
$backendEnvPath = "$PSScriptRoot\backend\.env"
(Get-Content $backendEnvPath) -replace 'CORS_ORIGIN=.*', "CORS_ORIGIN=http://${ip}:3000" |
    Set-Content $backendEnvPath -Encoding UTF8

Write-Host "Arquivos .env atualizados." -ForegroundColor Green
Write-Host ""
Write-Host "Acesse o sistema em: http://${ip}:3000" -ForegroundColor Green
Write-Host ""

# Inicia o backend em uma nova janela
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm run dev" -WindowStyle Normal

# Aguarda um momento para o backend subir antes do frontend
Start-Sleep -Seconds 2

# Inicia o frontend em uma nova janela
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev" -WindowStyle Normal

Write-Host "Servidores iniciados!" -ForegroundColor Green
Write-Host "Backend: http://${ip}:3001" -ForegroundColor DarkCyan
Write-Host "Frontend: http://${ip}:3000" -ForegroundColor DarkCyan
Write-Host ""
