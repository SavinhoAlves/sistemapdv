<#
  Instala o RestaurantePDV no modo local (Host) em um computador Windows.

  O Host roda o banco (PostgreSQL) e o sistema, e serve as telas para os
  terminais da rede cabeada (IPs fixos). Só o próprio Host e os IPs cadastrados
  em Admin > Terminais acessam o sistema: a trava fica no sistema e no Firewall
  do Windows.

  Uso (PowerShell como Administrador, na pasta do projeto):
    powershell -ExecutionPolicy Bypass -File deploy\host-windows\instalar-host.ps1 -HostIp 10.0.0.2

  Internet só é necessária durante a instalação (baixar Node, PostgreSQL e as
  dependências). Depois o Host funciona sem internet.
#>
param(
  [Parameter(Mandatory = $true)][string]$HostIp,
  [int]$Porta = 80,
  [string]$Restaurante = '',
  [string]$AdminLogin = 'admin',
  [int]$LicencaDias = 30
)

$ErrorActionPreference = 'Stop'
$Raiz = (Resolve-Path "$PSScriptRoot\..\..").Path
$Backend = Join-Path $Raiz 'backend'
$Frontend = Join-Path $Raiz 'frontend'
$Tarefa = 'RestaurantePDV Host'

function Passo($t) { Write-Host ""; Write-Host "==> $t" -ForegroundColor Cyan }
function Falha($t) { Write-Host "ERRO: $t" -ForegroundColor Red; exit 1 }

# ── Pré-requisitos ────────────────────────────────────────────────────────────
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { Falha 'Abra o PowerShell como Administrador.' }
if ($HostIp -notmatch '^(\d{1,3}\.){3}\d{1,3}$') { Falha "IP do Host inválido: $HostIp" }

$ipsLocais = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^127\.' }).IPAddress
if ($ipsLocais -notcontains $HostIp) {
  Write-Host "Atenção: este computador não está com o IP $HostIp agora (IPs: $($ipsLocais -join ', '))." -ForegroundColor Yellow
  Write-Host "Configure o IP fixo na placa de rede antes de ligar os terminais. Enquanto isso, o sistema fica bloqueado para eles." -ForegroundColor Yellow
}

if (-not $Restaurante) { $Restaurante = Read-Host 'Nome do restaurante' }
$senhaSegura = Read-Host "Senha do administrador ($AdminLogin), mínimo 6 caracteres" -AsSecureString
$AdminSenha = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($senhaSegura))
if ($AdminSenha.Length -lt 6) { Falha 'A senha precisa ter pelo menos 6 caracteres.' }

# ── Node.js e PostgreSQL ──────────────────────────────────────────────────────
Passo 'Node.js e PostgreSQL'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  winget install --id OpenJS.NodeJS.LTS --source winget --silent --accept-package-agreements --accept-source-agreements
}
$pgDir = Get-ChildItem 'C:\Program Files\PostgreSQL' -Directory -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
if (-not $pgDir) {
  winget install --id PostgreSQL.PostgreSQL.16 --source winget --silent --accept-package-agreements --accept-source-agreements
  $pgDir = Get-ChildItem 'C:\Program Files\PostgreSQL' -Directory | Sort-Object Name -Descending | Select-Object -First 1
}
if (-not $pgDir) { Falha 'PostgreSQL não foi instalado.' }
$psql = Join-Path $pgDir.FullName 'bin\psql.exe'
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')

# Banco só escuta no próprio computador (os terminais nunca falam com o banco)
$pgConf = Join-Path $pgDir.FullName 'data\postgresql.conf'
if (Test-Path $pgConf) {
  (Get-Content $pgConf) -replace "^#?listen_addresses\s*=.*", "listen_addresses = 'localhost'" | Set-Content $pgConf -Encoding UTF8
  Restart-Service -Name "postgresql*" -ErrorAction SilentlyContinue
}

# ── Banco de dados ────────────────────────────────────────────────────────────
Passo 'Banco de dados'
$senhaPg = Read-Host 'Senha do usuário "postgres" (definida na instalação do PostgreSQL)' -AsSecureString
$env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($senhaPg))
$senhaBanco = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
$existeUser = & $psql -U postgres -h localhost -tAc "SELECT 1 FROM pg_roles WHERE rolname='pdv'"
if ($existeUser -ne '1') { & $psql -U postgres -h localhost -c "CREATE ROLE pdv LOGIN PASSWORD '$senhaBanco'" | Out-Null }
else { & $psql -U postgres -h localhost -c "ALTER ROLE pdv PASSWORD '$senhaBanco'" | Out-Null }
$existeDb = & $psql -U postgres -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname='restaurantepdv'"
if ($existeDb -ne '1') { & $psql -U postgres -h localhost -c "CREATE DATABASE restaurantepdv OWNER pdv" | Out-Null }
Remove-Item Env:PGPASSWORD

# ── Configuração (.env) ───────────────────────────────────────────────────────
Passo 'Configuração'
function Segredo { -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ }) }
$origemHost = if ($Porta -eq 80) { "http://$HostIp" } else { "http://${HostIp}:$Porta" }
@"
NODE_ENV=production
MODO_LOCAL=1
HOST=0.0.0.0
PORT=$Porta
DATABASE_URL=postgresql://pdv:$senhaBanco@localhost:5432/restaurantepdv?schema=public
JWT_ACCESS_SECRET=$(Segredo)
JWT_REFRESH_SECRET=$(Segredo)
LICENSE_SECRET=$(Segredo)
CORS_ORIGIN=$origemHost,http://localhost
FRONTEND_DIR=$Frontend\.output\public
"@ | Set-Content (Join-Path $Backend '.env') -Encoding UTF8

# ── Backend ───────────────────────────────────────────────────────────────────
Passo 'Sistema (backend)'
Push-Location $Backend
npm ci
npx prisma migrate deploy
npx prisma generate
npm run build
$env:RESTAURANTE_NOME = $Restaurante; $env:ADMIN_LOGIN = $AdminLogin; $env:ADMIN_SENHA = $AdminSenha
$env:HOST_IP = $HostIp; $env:LICENCA_DIAS = "$LicencaDias"
npm run setup:local
Remove-Item Env:ADMIN_SENHA
Pop-Location

# ── Telas (frontend) ──────────────────────────────────────────────────────────
Passo 'Telas (frontend)'
Push-Location $Frontend
npm ci
# Mesma porta do Host: as telas falam com a mesma origem em que foram abertas (http://IP-do-Host)
$urlLocal = if ($Porta -eq 80) { 'http://localhost' } else { "http://localhost:$Porta" }
$env:NUXT_PUBLIC_API_URL = $urlLocal
$env:NUXT_PUBLIC_SOCKET_URL = $urlLocal
npx nuxi generate
Pop-Location

# ── Firewall ──────────────────────────────────────────────────────────────────
Passo 'Firewall do Windows'
# Regras amplas para o Node (criadas pelo aviso "Permitir acesso" do Windows) abririam
# a porta para qualquer IP: removidas. A regra por IP é mantida pelo próprio sistema.
Get-NetFirewallRule -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -match '^(Node\.js|node)' } | Remove-NetFirewallRule
Set-NetFirewallProfile -Profile Domain, Private, Public -DefaultInboundAction Block -Enabled True

# ── Inicialização automática ──────────────────────────────────────────────────
Passo 'Iniciar com o Windows'
$node = (Get-Command node).Source
$acao = New-ScheduledTaskAction -Execute $node -Argument 'dist\server.js' -WorkingDirectory $Backend
$gatilho = New-ScheduledTaskTrigger -AtStartup
$conta = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$ajustes = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable
Unregister-ScheduledTask -TaskName $Tarefa -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $Tarefa -Action $acao -Trigger $gatilho -Principal $conta -Settings $ajustes | Out-Null
Start-ScheduledTask -TaskName $Tarefa

Write-Host ""
Write-Host "Instalação concluída." -ForegroundColor Green
Write-Host "1. Neste Host, abra http://localhost e entre com '$AdminLogin'."
Write-Host "2. Em Admin > Terminais, confirme o IP do Host ($HostIp) e cadastre cada terminal (IP + função)."
Write-Host "3. Nos terminais, abra $origemHost"
