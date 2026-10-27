# RestaurantePDV no modo local (Host)

Um computador Windows do restaurante (o **Host**) roda o banco e o sistema. Os
terminais da rede cabeada abrem as telas pelo IP do Host. Funciona sem internet;
a internet só é usada na instalação.

## Rede

- Todos os terminais ligados por cabo em um **switch** (sem roteador, sem internet).
- IP fixo em cada computador (Windows › Rede › IPv4 manual), máscara `255.255.255.0`, sem gateway:

| IP | Terminal | Função |
|---|---|---|
| 10.0.0.2 | Host / Caixa 1 | Caixa (venda direta) |
| 10.0.0.3 | Caixa 2 | Caixa (venda direta) |
| 10.0.0.4 | Garçom 1 | Garçom (mesas) |
| 10.0.0.5 | Garçom 2 | Garçom (mesas) |
| 10.0.0.6 | Cozinha | Cozinha |

### App do garçom (celulares)

Um roteador só para Wi‑Fi, ligado no mesmo switch, **sem cabo na porta WAN**:

- IP do roteador: `10.0.0.1`; DHCP entregando só `10.0.0.50`–`10.0.0.99`.
- Reserva de DHCP por MAC para cada celular (ex.: `10.0.0.11`, `10.0.0.12`), cadastrados no Host como "App do garçom".
- Nos celulares, desligar o **MAC aleatório** para essa rede (Android: Privacidade › MAC do dispositivo; iPhone: desligar "Endereço Wi‑Fi Privado").
- Senha WPA2/WPA3 e, se o roteador tiver, filtro de MAC.

## Instalação no Host

PowerShell **como Administrador**, na pasta do projeto:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\host-windows\instalar-host.ps1 -HostIp 10.0.0.2
```

O instalador:

1. instala Node.js e PostgreSQL (o banco só escuta no próprio Host);
2. cria o banco, o restaurante, o administrador e a licença;
3. gera as telas e deixa o Host servindo tudo na porta 80;
4. remove regras amplas do Node no Firewall e deixa a entrada bloqueada por padrão;
5. registra o sistema para iniciar com o Windows (tarefa "RestaurantePDV Host").

## Depois de instalar

1. No Host, abra `http://localhost` e entre como administrador.
2. **Admin › Terminais**: confirme o IP do Host e cadastre cada terminal (IP + função).
3. Nos terminais, abra `http://10.0.0.2` (Chrome em tela cheia). Cada um abre direto na tela da sua função.

## Trava de rede

- O sistema só atende o próprio Host e os IPs cadastrados (telas, API e tempo real).
- A regra **"RestaurantePDV - Terminais"** do Firewall do Windows aceita só esses IPs na porta do sistema e é refeita a cada mudança no cadastro.
- Se o Host ligar com outro IP, os terminais ficam bloqueados até o administrador confirmar o novo IP em Admin › Terminais, no próprio Host.
