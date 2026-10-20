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
- **Usuário / Senha** — um campo só: digite o **código de acesso** (ex.: `1001-3`, código do restaurante + número do usuário) **ou** o **nome de usuário** (ex.: `joao`, único no sistema), e a senha. O e-mail continua aceito no mesmo campo. O código de cada funcionário aparece na coluna "Acesso" da lista de funcionários.

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
3. Requer o recurso "Venda pelo celular" liberado (pelo plano ou por exceção na Platform) e o caixa aberto.

### 3.13 Licença e ativação

O acesso segue a assinatura do restaurante (seção 4.4). Com a mensalidade vencida, o PDV mostra um aviso no topo durante os 5 dias de tolerância; no fim do teste grátis, avisa nos 2 últimos dias. Passado o prazo, o sistema abre `/ativacao` e só volta a liberar quando o pagamento for registrado na Platform. A verificação roda a cada hora.

---

## 4. Platform (dono do SaaS)

### 4.1 Acesso

`http://<servidor>:3000/platform/login` com o e-mail e senha de **Super Admin** da plataforma (criado pelo seed ou pelo cadastro inicial).

### 4.2 Visão geral

Painel com: restaurantes ativos, receita mensal (contratos pagantes) e estimativa anual, receita por plano e pendências: bloqueados, atrasados na tolerância, testes acabando e vencimentos nos próximos 5 dias.

### 4.3 Cadastrar um restaurante (tenant)

1. **Restaurantes → Novo**. São três passos:
   - **Estabelecimento**: nome, identificador (slug), CNPJ/CPF, responsável, endereço, contato.
   - **Acesso admin**: e-mail e senha inicial (mín. 6 caracteres). O restaurante recebe um código numérico automático (1001, 1002…) e o administrador entra com `<código do restaurante>-1` (ex.: `1001-1`).
   - **Contrato**: plano, ciclo (mensal, trimestral, semestral, anual) e valor do ciclo. O valor vem do plano × meses do ciclo; altere para dar desconto. Escolha:
     - **Teste grátis de 7 dias** (ex.: segunda a domingo): o acesso fica liberado até o último dia do teste e o primeiro vencimento é o dia seguinte. Sem pagamento, o acesso bloqueia quando o teste acaba.
     - **Fechamento direto**: informe o primeiro vencimento e, se já recebeu, marque **Já recebi o primeiro pagamento**.
     - **Isento**: sem cobrança, acesso sempre liberado.
2. Salve. O contrato em PDF (versão 1) é gerado e o acesso já segue a cobrança. Envie o PDF ao cliente pelo card **Contrato** (veja 4.5).

### 4.4 Assinatura do restaurante (`/platform/tenants/<id>`)

A licença não é mais editada à mão: ela é calculada a partir do contrato e dos pagamentos.

- **Registrar pagamento** cobre o ciclo em aberto e empurra o próximo vencimento um ciclo (mensal +1 mês, anual +12), mantendo o dia de vencimento do contrato. O acesso é liberado na hora.
- Depois do vencimento há **5 dias de tolerância**, com aviso no PDV. Passou disso, o acesso bloqueia.
- **Ajustar vencimento** é para exceções (cortesia, negociação): define a próxima data à mão, com motivo.
- **Desfazer** apaga o pagamento mais recente e devolve o vencimento.
- **Editar contrato** muda plano, valor, ciclo, dia de vencimento, isenção e situação do papel (Ag. assinatura, Assinado, Rescindido). Contrato rescindido bloqueia o acesso.
- **Recursos** (RFID, venda pelo celular) seguem o plano. Para um restaurante específico, use **Liberar** ou **Bloquear** (exceção) ou volte para **Seguir plano**.
- **Suspender** bloqueia o acesso mesmo com a mensalidade em dia; **Reativar** volta a seguir a assinatura.

A página **Cobranças** lista todos os restaurantes com a situação (em dia, em teste, atrasado, bloqueado, isento), o próximo vencimento e o botão para registrar pagamento.

### 4.5 Contrato em PDF

O PDF é gerado no servidor com os dados do restaurante, do contrato e da contratada (pessoa física, foro de Miracema/RJ).

- Cada vez que algo que aparece no contrato muda (nome, CNPJ, endereço, responsável, plano, valor, ciclo, dia de vencimento, datas, isenção, condições específicas), é criada uma **versão nova**. As antigas ficam guardadas e o PDF delas sai igual ao que foi enviado.
- Registrar pagamento, ajustar vencimento, trocar a situação do papel ou mexer nos recursos **não** gera versão.
- Quando há versão nova, o card **Contrato** mostra "Contrato atualizado (versão N) — envie ao cliente".
- **Ver PDF** abre o arquivo; **Baixar** salva; **Compartilhar** abre o compartilhamento do celular (WhatsApp, e-mail) e marca a versão como enviada. No computador, Compartilhar baixa o arquivo para você anexar.
- **Marcar como enviado** registra o envio feito por outro caminho.
- Os dados da contratada ficam em `backend/src/modules/platform/contrato.ts` (`CONTRATADA`). As cláusulas estão em `contrato-pdf.ts`. Recomenda-se revisão por advogado.

### 4.6 Suporte remoto

Na lista de restaurantes, use a ação de **suporte remoto**:

- **Visualizar** — abre o PDV do cliente em modo somente leitura (nada pode ser alterado).
- **Auxiliar** — permite agir no sistema do cliente para ajudar.
- Escolha em qual tela o cliente está com problema para abrir direto nela. A sessão de suporte fica marcada na tela e é encerrada ao sair.

### 4.7 Tickets

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
