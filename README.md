# 🍽️ RestaurantePDV — Sistema de Comandas Eletrônicas

Sistema profissional de PDV (Ponto de Venda) para restaurantes e bares, com operação **100% em rede local (LAN)**, sem dependência de internet.

---

## 📐 Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     REDE LOCAL (LAN)                         │
│                                                              │
│  ┌──────────────┐    HTTP/WS     ┌──────────────────────┐   │
│  │  TABLET/PC   │ ─────────────► │   SERVIDOR (Docker)   │   │
│  │  10.0.0.101  │                │      10.0.0.100        │   │
│  └──────────────┘                │                        │   │
│                                  │  ┌────────────────┐   │   │
│  ┌──────────────┐                │  │  Frontend Nuxt  │   │   │
│  │  TABLET/PC   │ ─────────────► │  │   :3000        │   │   │
│  │  10.0.0.102  │                │  └────────┬───────┘   │   │
│  └──────────────┘                │           │ API calls  │   │
│                                  │  ┌────────▼───────┐   │   │
│  ┌──────────────┐                │  │  Backend Node   │   │   │
│  │  TV COZINHA  │ ─────────────► │  │   :3001        │   │   │
│  │  10.0.0.103  │                │  └────────┬───────┘   │   │
│  └──────────────┘                │           │ SQL queries│   │
│                                  │  ┌────────▼───────┐   │   │
│  ┌──────────────┐                │  │     MySQL       │   │   │
│  │  LEITOR RFID │ ──USB──► PC    │  │    :3306       │   │   │
│  └──────────────┘                │  └────────────────┘   │   │
│                                  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de dados

```
Cliente (Tablet/PC)
      │
      │  REST API (HTTP/HTTPS)
      ▼
Backend Node.js (Express)
      │                    ◄─── Socket.IO (WebSocket) ──► Todos os clientes
      │  SQL queries
      ▼
MySQL 8.0

NUNCA: Frontend → MySQL (direto)
```

---

## 🏗️ Estrutura de Pastas

```
restaurante-pdv/
├── docker-compose.yml          # Orquestração dos serviços
├── .env.example                # Variáveis de ambiente
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   ├── migrations/
│   │   └── schema.sql          # Schema completo do banco
│   ├── seeds/
│   │   └── seed.sql            # Dados iniciais
│   └── src/
│       ├── server.js           # Entry point
│       ├── controllers/        # Lógica de negócio
│       │   ├── auth.controller.js
│       │   ├── mesas.controller.js
│       │   ├── pedidos.controller.js
│       │   ├── pagamentos.controller.js
│       │   ├── caixa.controller.js
│       │   └── produtos.controller.js
│       ├── routes/             # Definição das rotas REST
│       │   ├── auth.routes.js
│       │   ├── mesas.routes.js
│       │   ├── pedidos.routes.js
│       │   ├── pagamentos.routes.js
│       │   ├── caixa.routes.js
│       │   ├── produtos.routes.js
│       │   ├── funcionarios.routes.js
│       │   ├── categorias.routes.js
│       │   └── relatorios.routes.js
│       ├── middlewares/
│       │   └── auth.middleware.js  # JWT + autorização por cargo
│       ├── database/
│       │   └── connection.js       # Pool MySQL2
│       ├── sockets/
│       │   └── index.js            # Socket.IO + eventos
│       └── utils/
│           └── logger.js           # Winston logger
│
└── frontend/
    ├── Dockerfile
    ├── nuxt.config.ts
    ├── tailwind.config.js
    ├── app.vue
    ├── assets/css/main.css
    ├── middleware/
    │   └── auth.ts             # Guard de rotas
    ├── stores/                 # Pinia stores
    │   ├── auth.ts
    │   ├── mesas.ts
    │   └── toast.ts
    ├── services/
    │   ├── api.ts              # Cliente HTTP centralizado
    │   └── socket.ts           # Socket.IO client
    ├── layouts/
    │   └── default.vue         # Layout com sidebar
    ├── pages/
    │   ├── index.vue           # Redirect inteligente
    │   ├── login.vue           # Login RFID + manual
    │   ├── mesas.vue           # Dashboard de mesas
    │   ├── cozinha.vue         # Tela da cozinha (KDS)
    │   ├── caixa.vue           # Controle de caixa
    │   ├── produtos.vue        # Gerenciar cardápio
    │   ├── relatorios.vue      # Relatórios financeiros
    │   └── admin.vue           # Painel administrativo
    └── components/
        ├── mesa/
        │   ├── MesaCard.vue        # Card visual da mesa
        │   ├── ModalPedido.vue     # Adicionar pedidos
        │   └── ModalFechamento.vue # Pagamento/fechamento
        ├── caixa/
        │   ├── ModalMovimento.vue  # Sangria/suprimento
        │   └── ModalFecharCaixa.vue
        ├── admin/
        │   └── ModalFuncionario.vue
        └── shared/
            ├── NavLink.vue
            ├── ToastContainer.vue
            └── ModalProduto.vue
```

---

## 🔌 API Endpoints

### Autenticação
| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/api/auth/rfid` | Login por cartão RFID | ❌ |
| POST | `/api/auth/login` | Login por email/senha | ❌ |
| POST | `/api/auth/pin` | Login por PIN | ❌ |
| GET | `/api/auth/me` | Dados do usuário logado | ✅ |

### Mesas
| Método | Endpoint | Descrição | Cargo |
|--------|----------|-----------|-------|
| GET | `/api/mesas` | Listar todas as mesas | Todos |
| GET | `/api/mesas/:id` | Detalhes da mesa | Todos |
| POST | `/api/mesas` | Criar mesa (config) | Admin |
| PATCH | `/api/mesas/:id/abrir` | Abrir mesa | Garçom+ |
| PATCH | `/api/mesas/:id/fechar` | Fechar mesa | Caixa+ |
| PATCH | `/api/mesas/:id/transferir` | Transferir mesa | Garçom+ |

### Pedidos
| Método | Endpoint | Descrição | Cargo |
|--------|----------|-----------|-------|
| POST | `/api/pedidos` | Criar pedido | Garçom+ |
| POST | `/api/pedidos/:id/itens` | Adicionar item | Garçom+ |
| GET | `/api/pedidos/cozinha` | Pedidos p/ cozinha | Cozinha+ |
| GET | `/api/pedidos/mesa/:id` | Pedidos da mesa | Todos |
| PATCH | `/api/pedidos/itens/:id/status` | Atualizar item | Cozinha+ |
| DELETE | `/api/pedidos/:id` | Cancelar pedido | Admin |

### Caixa
| Método | Endpoint | Descrição | Cargo |
|--------|----------|-----------|-------|
| GET | `/api/caixa/status` | Status do caixa | Caixa+ |
| POST | `/api/caixa/abrir` | Abrir caixa | Caixa+ |
| POST | `/api/caixa/fechar` | Fechar caixa | Caixa+ |
| POST | `/api/caixa/sangria` | Registrar sangria | Caixa+ |
| POST | `/api/caixa/suprimento` | Registrar suprimento | Caixa+ |

---

## ⚡ Eventos Socket.IO

| Evento (emitido) | Descrição | Quem recebe |
|------------------|-----------|-------------|
| `nova_mesa` | Nova mesa criada | Todos |
| `mesa_atualizada` | Status da mesa alterado | Todos |
| `mesa_fechada` | Mesa foi fechada | Todos |
| `novo_pedido` | Pedido criado | Todos |
| `pedido_cozinha` | Pedido para a cozinha | Cozinha |
| `item_adicionado` | Item adicionado ao pedido | Todos |
| `item_atualizado` | Status de item alterado | Todos |
| `pedido_pronto` | Item ficou pronto | Garçons |
| `pagamento_registrado` | Pagamento confirmado | Todos |
| `caixa_aberto` | Caixa foi aberto | Caixa |
| `caixa_fechado` | Caixa foi fechado | Caixa |
| `movimento_caixa` | Sangria/suprimento | Caixa |

---

## 🔐 Sistema de Permissões

| Cargo | Mesas | Pedidos | Cozinha | Caixa | Admin |
|-------|-------|---------|---------|-------|-------|
| **Administrador** | ✅ Tudo | ✅ Tudo | ✅ | ✅ | ✅ |
| **Garçom** | Abrir/Ver | Criar/Ver | Ver | ❌ | ❌ |
| **Caixa** | Fechar | Ver | ❌ | ✅ | ❌ |
| **Cozinha** | Ver | Ver status | Atualizar | ❌ | ❌ |

---

## 💳 Login RFID

O leitor RFID funciona como **teclado USB** — ao aproximar o crachá, ele "digita" o código e pressiona Enter. O sistema captura essa entrada:

```javascript
// Fluxo:
// 1. Campo invisível sempre focado na tela de login
// 2. Leitor digita o código (ex: "ABCD1234\n")
// 3. Timeout de 300ms detecta fim da leitura
// 4. POST /api/auth/rfid { cartao_rfid: "ABCD1234" }
// 5. Backend verifica na tabela funcionarios.cartao_rfid
// 6. JWT gerado e sessão iniciada
```

---

## 🚀 Como Executar

### Pré-requisitos
- Docker Engine 24+
- Docker Compose 2.20+

### 1. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Edite o .env com suas configurações
nano .env
```

### 2. Subir todos os serviços
```bash
docker-compose up -d
```

### 3. Verificar saúde dos serviços
```bash
# Backend health check
curl http://localhost:3001/health

# Ver logs em tempo real
docker-compose logs -f backend
```

### 4. Acessar o sistema
- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001/api
- **MySQL:** localhost:3306

### 5. Credenciais padrão (seed)
| Nome | Email | Senha | Cargo | RFID |
|------|-------|-------|-------|------|
| Carlos Administrador | admin@restaurante.local | admin123 | Administrador | RFID-ADMIN-001 |
| João Garçom | joao@restaurante.local | admin123 | Garçom | RFID-GARCOM-001 |
| Maria Garçom | maria@restaurante.local | admin123 | Garçom | RFID-GARCOM-002 |
| Ana Caixa | ana@restaurante.local | admin123 | Caixa | RFID-CAIXA-001 |
| Pedro Cozinha | pedro@restaurante.local | admin123 | Cozinha | RFID-COZINHA-001 |

> ⚠️ **IMPORTANTE:** Troque todas as senhas após o primeiro acesso!

---

## 🌐 Configuração para Rede LAN

Para usar em rede local, edite o `.env` na raiz:

```bash
# IP do servidor na rede local
NUXT_PUBLIC_API_URL=http://10.0.0.100:3001
NUXT_PUBLIC_SOCKET_URL=http://10.0.0.100:3001
```

Nos tablets clientes, acesse:
```
http://10.0.0.100:3000
```

### Exemplo de configuração de rede
```
Servidor:   10.0.0.100  (roda Docker)
Tablet 1:   10.0.0.101  (garçom)
Tablet 2:   10.0.0.102  (caixa)
TV Cozinha: 10.0.0.103  (modo kiosk, Chrome fullscreen)
```

### Tela da cozinha em modo TV (sem login)
```
http://10.0.0.100:3000/cozinha?mode=tv
```

---

## 🗄️ Schema do Banco de Dados

```
categorias ──► produtos ──► pedido_itens ◄── pedidos ◄── mesas
                   │                                       │
                   └──► estoque              funcionarios ─┘
                             │                     │
                   movimentos_estoque         caixa ◄── movimentos_caixa
                                                │
                                           pagamentos ──► metodos_pagamento
```

---

## 🛠️ Comandos úteis

```bash
# Subir em modo desenvolvimento (com hot-reload)
cd backend && npm run dev
cd frontend && npm run dev

# Ver logs do MySQL
docker-compose logs -f mysql

# Acessar MySQL via CLI
docker exec -it pdv_mysql mysql -u pdv_user -p restaurante_pdv

# Rebuild após mudanças
docker-compose up -d --build

# Parar tudo
docker-compose down

# Parar e remover volumes (APAGA O BANCO!)
docker-compose down -v

# Backup do banco
docker exec pdv_mysql mysqldump -u pdv_user -p restaurante_pdv > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker exec -i pdv_mysql mysql -u pdv_user -p restaurante_pdv < backup_20240101.sql
```

---

## 📦 Tecnologias

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | NuxtJS + Vue 3 | 3.10+ |
| Estado | Pinia | 2.1+ |
| Estilo | TailwindCSS | 3.4+ |
| Backend | Node.js + Express | 18+ |
| Auth | JWT (jsonwebtoken) | 9.0+ |
| Banco | MySQL | 8.0 |
| Realtime | Socket.IO | 4.6+ |
| Infra | Docker + Compose | 24+ |

---

## 🔒 Segurança

- JWT com expiração configurável (padrão: 8h por turno)
- Rate limiting em todas as rotas (500 req/15min)
- Rate limiting reforçado no endpoint de auth (20 req/5min)
- Helmet.js para headers de segurança HTTP
- CORS configurado (apenas origem permitida)
- Senhas com bcrypt (salt rounds: 10)
- Transações MySQL para operações críticas
- Validação de cargo em cada endpoint
- Logs de auditoria com Winston

---

## 🏭 Para Produção

1. Gere um JWT_SECRET forte (64+ chars):
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. Configure backup automático do MySQL

3. Configure HTTPS com nginx reverse proxy

4. Use um IP fixo no servidor

5. Configure o firewall para bloquear porta 3306 externamente

6. Altere todas as senhas padrão do seed
