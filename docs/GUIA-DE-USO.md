# Guia de uso — RestaurantePDV

Este guia cobre as duas partes do sistema:

- **PDV** — usado no dia a dia do restaurante (mesas, vendas, caixa, cozinha).
- **Platform** — painel do dono do SaaS para cadastrar restaurantes, licenças, contratos e suporte.

---

## 1. Visão geral e endereços

| Serviço | Porta | Endereço (neste PC) | Para quê |
|---|---|---|---|
| Frontend (PDV + Platform) | 3000 | http://localhost:3000 | Telas do sistema |
| Backend (API) | 3002 | http://localhost:3002 | API usada pelo frontend (não é para abrir no navegador) |
| Central de suporte | 4000 | http://localhost:4000 | Painel legado de clientes, licenças e tickets |
| PostgreSQL | 5432 | — | Banco de dados |

Em outros aparelhos da rede (tablets, celulares, TV da cozinha), troque `localhost` pelo IP do servidor, ex.: `http://192.168.1.4:3000`.

> Abrir a porta 3002 direto no navegador mostra `{"error":"Token não fornecido"}`. Isso é normal: a API só responde a quem está logado.

---

## 2. Instalação e inicialização

### 2.1 Primeira vez

1. Instale Node.js 20+ e PostgreSQL 16 (ou use `docker compose up -d postgres`).
2. Configure `backend/.env` a partir de `backend/.env.example` (banco, segredos JWT, `CORS_ORIGIN`).
3. Instale as dependências:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   cd ../central && npm install
   ```
4. Crie as tabelas e o cliente do banco:
   ```bash
   cd backend
   npm run db:migrate
   npm run db:generate
   ```
5. (Opcional, só em desenvolvimento) carregue dados de exemplo: `npm run db:seed`. Cria o admin da plataforma e dois restaurantes de teste (`tarantela` e `sabor-italiano`).

### 2.2 Dia a dia

- **Jeito recomendado:** rode `iniciar.ps1` na raiz. Ele detecta o IP da rede, gera o certificado HTTPS (necessário para a câmera do celular ler o crachá QR), atualiza os `.env` e sobe backend e frontend. Se o IP mudar, ele reinicia tudo sozinho.
- **Manual (desenvolvimento):** um terminal para cada:
  ```bash
  cd backend && npm run dev     # porta 3002
  cd frontend && npm run dev    # porta 3000
  cd central && npm run dev     # porta 4000
  ```
- **Produção:** `docker compose up -d` ou PM2 com `ecosystem.config.js` (após `npm run build` no backend e no frontend).

### 2.3 Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| `EADDRINUSE ... :3002` | Já existe um backend rodando nessa porta. Feche o outro ou rode com outra porta: `$env:PORT=3003; npm run dev` e ajuste `NUXT_PUBLIC_API_URL` no `frontend/.env`. |
| `EPERM ... query_engine-windows.dll.node` no `prisma generate` | O backend está rodando e travou o arquivo. Pare o backend, rode o comando e suba de novo. |
| Tela "Sistema suspenso"/"Licença" | Licença do restaurante bloqueada ou vencida — ver seção 4.4. |
| Câmera do celular não abre | Precisa de HTTPS: suba pelo `iniciar.ps1` com `mkcert` instalado. |

---

## 3. PDV (restaurante)

### 3.1 Login

Acesse `http://<servidor>:3000/login`. Há dois modos:

- **Cartão RFID** — aproxime o crachá do leitor (ou clique na área para focar o leitor).
- **E-mail / Senha** — informe o identificador do restaurante (slug), e-mail e senha.

O restaurante é identificado por: subdomínio (produção) → último slug usado no navegador → `NUXT_PUBLIC_TENANT_SLUG` do `.env`.

O que cada pessoa vê depende do **cargo** (administrador, garçom, caixa, cozinha) e do **perfil de permissões** (seção 3.9).

### 3.2 Painel inicial

Mostra o resumo do dia: faturamento, mesas abertas, pedidos, ticket médio, métodos de pagamento usados, status do caixa e últimos pagamentos.

### 3.3 Abrir o caixa (obrigatório antes de vender)

1. Menu **Caixa**.
2. Informe o **saldo inicial** (troco na gaveta) e abra o caixa.
3. Sem caixa aberto, Vendas e o Mobile mostram "Caixa fechado".

### 3.4 Atendimento em mesas

1. Menu **Mesas** → abrir mesa (número/nome, cliente e garçom opcionais). Alterne entre grade e lista pelos ícones.
2. Clique na mesa para abrir o painel lateral (**Conta da mesa**).
3. Adicione produtos. Itens de categorias marcadas "vai para cozinha" aparecem na tela da Cozinha e podem imprimir ficha.
4. No painel da mesa é possível:
   - **Aplicar desconto** e **Abater valor** (pagamento parcial/abatimento);
   - **Reimpressão** da conta ou fichas;
   - cancelar/decrementar itens (exige permissão; fica registrado na auditoria).
5. **Cobrar**: escolha o método (Dinheiro, Débito, Crédito, PIX…). Em dinheiro, informe o valor recebido e o troco é calculado. Pode dividir em vários pagamentos até zerar o saldo; a mesa fecha quando quitada.

### 3.5 Venda direta (balcão)

Menu **Vendas**: monte o pedido, cobre e finalize — sem abrir mesa. Exige caixa aberto.

### 3.6 Cozinha

- Menu **Cozinha** ou tela cheia em `/cozinha/painel-cozinha` (ideal para TV).
- Pedidos chegam em tempo real. Avance o status (pendente → em preparo → pronto); os botões de voltar desfazem um avanço por engano.

### 3.7 Caixa: movimentos, estorno e fechamento

No menu **Caixa**:

- **Suprimento** (entrada de dinheiro) e **Sangria** (retirada) — informe valor e descrição.
- **Movimentos do caixa** — filtre por Vendas, Suprimentos, Sangrias e Estornos.
- **Estornar pagamento** — no movimento de venda, clique em **Estornar**, informe o motivo (mínimo 5 letras) e confirme. O valor sai do caixa e o pedido/mesa volta a ficar em aberto para ser cobrado de novo. Exige a permissão de estorno. Só vale para pagamentos feitos depois desta atualização (os antigos não têm o vínculo com o movimento).
- **Fechamento** — conte a gaveta e informe o **dinheiro em gaveta**. O sistema compara com o **dinheiro esperado** e mostra a **diferença**.

### 3.8 Produtos e estoque

Menu **Produtos**: cadastre produtos (nome, preço, categoria, ativo). Use **Ajustar estoque** para entrada/saída em produtos com estoque controlado.

### 3.9 Administração (`/admin`)

Abas:

- **Funcionários** — criar, editar, ativar/desativar; definir cargo, PIN/cartão RFID e perfil. O botão **QR Mobile** gera o QR de acesso pelo celular (seção 3.12).
- **Perfis** — conjuntos de permissões (abrir/fechar mesa, lançar pedidos, cancelar item, gerenciar caixa, produtos, relatórios, configurações, cozinha…).
  - **Criar perfis padrão** gera Garçom, Caixa, Vendedor e Cozinha.
  - **Atribuir por cargo** coloca o perfil padrão do cargo em todo funcionário **sem perfil** (administradores são ignorados).
- **Categorias** — define se a categoria vai para a cozinha, para o bar, ou ambos.
- **Métodos** — métodos de pagamento aceitos.

### 3.10 Relatórios

Menu **Relatórios**: escolha o período (hoje, ontem, semana, mês…) e veja faturamento, formas de pagamento, horário de pico, produtos mais vendidos, desempenho por funcionário e a auditoria (descontos, sangrias, cancelamentos, abertura/fechamento de caixa).

### 3.11 Configurações

Menu **Configurações**:

- **Identidade** — nome e dados do restaurante.
- **Acesso** — modos de login habilitados (RFID, mobile…).
- **Fichas** — tamanho da letra e layout, com pré-visualização.
- **Impressora / Impressoras por destino** — impressão pelo navegador, USB ou rede, papel 58 mm ou 80 mm; defina qual impressora recebe cozinha, bar e contas.
- **Integrações** — maquininha e outras integrações disponíveis.

### 3.12 PDV Mobile (celular do garçom)

1. Em **Admin → Funcionários**, gere o **QR Mobile** do funcionário.
2. O garçom lê o QR no celular e entra direto em `/m` (mesas e vendas pelo celular).
3. Requer a feature "Venda pelo Celular" ativa na licença e o caixa aberto.

### 3.13 Licença e ativação

Se a licença estiver pendente, bloqueada ou vencida, o sistema abre `/ativacao`. Cole a **chave de ativação** fornecida pelo suporte. A verificação de vencimento roda automaticamente a cada hora.

---

## 4. Platform (dono do SaaS)

### 4.1 Acesso

`http://<servidor>:3000/platform/login` com o e-mail e senha de **Super Admin** da plataforma (criado pelo seed ou pelo cadastro inicial).

### 4.2 Visão geral

Painel com: restaurantes ativos, receita mensal recorrente e estimativa anual, receita por plano, licenças que pedem atenção (pendentes, vencendo, bloqueadas) e resumo do dia com dados ao vivo.

### 4.3 Cadastrar um restaurante (tenant)

1. **Restaurantes → Novo**.
2. Preencha:
   - **Nome do restaurante** e **Identificador (slug)** — o slug vai na URL/login (ex.: `tarantela`). Só letras minúsculas, números e hífen.
   - Dados jurídicos: CNPJ/CPF, responsável, CPF do responsável, endereço, cidade/UF, telefone, e-mail.
   - **Plano**, ciclo de cobrança (mensal, trimestral, semestral, anual) e valor mensal.
   - **Features** (recursos): Mesas, Vendas, Caixa, Relatórios, Tempo Real, RFID, Venda pelo Celular, etc.
   - **Acesso do administrador**: e-mail de acesso e senha inicial (mín. 6 caracteres) — é o primeiro login do restaurante no PDV.
   - **Contrato**: início, fim (opcional) e observações.
3. Salve. O restaurante já pode logar no PDV com o slug e o admin criado.

### 4.4 Detalhes do restaurante (`/platform/tenants/<id>`)

Abas:

- **Dados** — editar cadastro e redefinir o acesso do administrador.
- **Licença** — status (Pendente, Ativada, Bloqueada), vencimento, renovar (30d, 90d, 6 meses, 1 ano), bloquear/desbloquear e gerar nova chave de ativação para enviar ao cliente.
- **Contrato** — **Gerar contrato** com os dados jurídicos e acompanhar o status (Ag. assinatura, Assinado, Suspenso, Rescindido).
- **Features** — ligar/desligar recursos do restaurante.

### 4.5 Suporte remoto

Na lista de restaurantes, use a ação de **suporte remoto**:

- **Visualizar** — abre o PDV do cliente em modo somente leitura (nada pode ser alterado).
- **Auxiliar** — permite agir no sistema do cliente para ajudar.
- Escolha em qual tela o cliente está com problema para abrir direto nela. A sessão de suporte fica marcada na tela e é encerrada ao sair.

### 4.6 Tickets

Menu **Tickets**: abra, filtre (abertos, em andamento, resolvidos, fechados, urgentes), atualize status/respostas e exclua chamados de cada restaurante.

---

## 5. Central de suporte (porta 4000)

Painel separado (Express) com clientes, licenças, contratos, gerador de chaves e tickets. Para criar/trocar o login de um admin da central:

```bash
cd central
node seed-admin.js <email> <senha> [nome]
```

---

## 6. Rotina recomendada do restaurante

1. Abrir o caixa com o troco inicial.
2. Atender mesas e balcão; cozinha acompanha pelo painel.
3. Sangrias durante o dia, se necessário.
4. Conferir mesas abertas no painel do Caixa antes de fechar.
5. Fechar o caixa contando a gaveta.
6. Ver os relatórios do dia.
