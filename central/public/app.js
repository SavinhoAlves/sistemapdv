const token = localStorage.getItem('central_token')
if (!token) window.location.href = '/login.html'

const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

document.getElementById('btn-sair').addEventListener('click', () => {
  localStorage.removeItem('central_token')
  window.location.href = '/login.html'
})

function fmtMoeda(v) {
  return Number(v || 0).toFixed(2).replace('.', ',')
}

function fmtData(iso) {
  if (!iso) return 'nunca'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

async function carregarClientes() {
  const resp = await fetch('/api/clientes', { headers })
  if (resp.status === 401) {
    localStorage.removeItem('central_token')
    window.location.href = '/login.html'
    return
  }
  const clientes = await resp.json()
  renderizar(clientes)
}

function renderizar(clientes) {
  const lista = document.getElementById('lista')
  const vazio = document.getElementById('vazio')
  const contagem = document.getElementById('contagem')

  contagem.textContent = `${clientes.length} cliente${clientes.length !== 1 ? 's' : ''}`

  if (!clientes.length) {
    lista.innerHTML = ''
    vazio.classList.remove('hidden')
    return
  }
  vazio.classList.add('hidden')

  lista.innerHTML = clientes.map(c => `
    <div class="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-wrap items-center gap-4">

      <div class="flex items-center gap-3 min-w-[200px] flex-1">
        <span class="w-2.5 h-2.5 rounded-full shrink-0 ${c.online ? 'bg-green-500' : 'bg-neutral-600'}"></span>
        <div>
          <p class="font-black text-sm">${escapeHtml(c.nome_fantasia)}</p>
          <p class="text-[11px] text-neutral-500">${c.contato ? escapeHtml(c.contato) : '—'} · último sync: ${fmtData(c.ultimo_sync_em)}</p>
        </div>
      </div>

      <div class="text-center px-3">
        <p class="text-[10px] uppercase tracking-widest text-neutral-500 font-black">Caixa</p>
        <p class="text-sm font-black ${c.caixa_aberto ? 'text-green-400' : 'text-neutral-500'}">${c.caixa_aberto ? 'Aberto' : 'Fechado'}</p>
      </div>

      <div class="text-center px-3">
        <p class="text-[10px] uppercase tracking-widest text-neutral-500 font-black">Faturamento hoje</p>
        <p class="text-sm font-black">R$ ${fmtMoeda(c.faturamento_hoje)}</p>
      </div>

      <div class="text-center px-3">
        <p class="text-[10px] uppercase tracking-widest text-neutral-500 font-black">Mesas abertas</p>
        <p class="text-sm font-black">${c.mesas_abertas ?? 0}</p>
      </div>

      <div class="flex items-center gap-2 px-3 shrink-0">
        <span class="text-[10px] uppercase tracking-widest text-neutral-500 font-black">Venda mobile</span>
        <button data-id="${c.id}" data-permitido="${c.venda_mobile_permitida}"
          class="toggle-mobile shrink-0 w-11 h-6 rounded-full transition-all relative ${c.venda_mobile_permitida ? 'bg-orange-500' : 'bg-neutral-700'}">
          <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${c.venda_mobile_permitida ? 'left-[22px]' : 'left-0.5'}"></span>
        </button>
      </div>

      <button data-id="${c.id}" data-nome="${escapeHtml(c.nome_fantasia)}"
        class="btn-licenca shrink-0 h-9 px-3 rounded-xl border border-neutral-700 text-xs font-black hover:bg-neutral-800 transition-all">
        Licença
      </button>

    </div>
  `).join('')

  document.querySelectorAll('.toggle-mobile').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id
      const novoValor = btn.dataset.permitido !== 'true'
      btn.disabled = true
      try {
        await fetch(`/api/clientes/${id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ venda_mobile_permitida: novoValor })
        })
        await carregarClientes()
      } finally {
        btn.disabled = false
      }
    })
  })

  document.querySelectorAll('.btn-licenca').forEach(btn => {
    btn.addEventListener('click', () => abrirModalLicenca(btn.dataset.id, btn.dataset.nome))
  })
}

function escapeHtml(s) {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}

// ── Modal novo cliente ──
const modalNovo = document.getElementById('modal-novo')
document.getElementById('btn-novo').addEventListener('click', () => {
  document.getElementById('novo-nome').value = ''
  document.getElementById('novo-contato').value = ''
  modalNovo.classList.remove('hidden')
})
document.getElementById('btn-cancelar-novo').addEventListener('click', () => {
  modalNovo.classList.add('hidden')
})
document.getElementById('btn-criar').addEventListener('click', async () => {
  const nome_fantasia = document.getElementById('novo-nome').value.trim()
  const contato = document.getElementById('novo-contato').value.trim()
  if (!nome_fantasia) return

  const resp = await fetch('/api/clientes', {
    method: 'POST',
    headers,
    body: JSON.stringify({ nome_fantasia, contato })
  })
  const dados = await resp.json()
  if (!resp.ok) {
    alert(dados.error || 'Erro ao criar cliente')
    return
  }

  modalNovo.classList.add('hidden')
  document.getElementById('token-gerado').textContent = dados.syncToken
  document.getElementById('modal-token').classList.remove('hidden')
  await carregarClientes()
})
document.getElementById('btn-fechar-token').addEventListener('click', () => {
  document.getElementById('modal-token').classList.add('hidden')
})

// ── Modal gerar licença ──
const modalLicenca = document.getElementById('modal-licenca')
const modalChave = document.getElementById('modal-chave')
let clienteLicencaId = null

function abrirModalLicenca(id, nome) {
  clienteLicencaId = id
  document.getElementById('licenca-cliente-nome').textContent = nome
  document.getElementById('licenca-dias').value = ''
  document.querySelectorAll('.dias-preset').forEach(b => b.classList.remove('bg-orange-500', 'border-orange-500'))
  modalLicenca.classList.remove('hidden')
}

document.querySelectorAll('.dias-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('licenca-dias').value = btn.dataset.dias
    document.querySelectorAll('.dias-preset').forEach(b => b.classList.remove('bg-orange-500', 'border-orange-500'))
    btn.classList.add('bg-orange-500', 'border-orange-500')
  })
})

document.getElementById('btn-cancelar-licenca').addEventListener('click', () => {
  modalLicenca.classList.add('hidden')
})

document.getElementById('btn-gerar-licenca').addEventListener('click', async () => {
  const dias = Number(document.getElementById('licenca-dias').value)
  if (!dias || dias <= 0) {
    alert('Informe a validade em dias')
    return
  }

  const resp = await fetch(`/api/clientes/${clienteLicencaId}/licenca`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ dias })
  })
  const dados = await resp.json()
  if (!resp.ok) {
    alert(dados.error || 'Erro ao gerar licença')
    return
  }

  modalLicenca.classList.add('hidden')
  document.getElementById('chave-gerada').textContent = dados.chave
  modalChave.classList.remove('hidden')
})

document.getElementById('btn-fechar-chave').addEventListener('click', () => {
  modalChave.classList.add('hidden')
})

carregarClientes()
setInterval(carregarClientes, 30000)
