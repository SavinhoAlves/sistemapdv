const token = localStorage.getItem('central_token')
if (!token) window.location.href = '/login.html'

const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

document.getElementById('btn-sair').addEventListener('click', () => {
  localStorage.removeItem('central_token')
  window.location.href = '/login.html'
})

// ── Utilitários ──

function fmtMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtData(iso) {
  if (!iso) return 'nunca'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function escapeHtml(s) {
  const div = document.createElement('div')
  div.textContent = String(s || '')
  return div.innerHTML
}

function badgeStatus(status) {
  const map = {
    ativo:     'bg-green-500/20 text-green-400 border border-green-500/30',
    suspenso:  'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    cancelado: 'bg-red-500/20 text-red-400 border border-red-500/30',
  }
  const cls = map[status] || map.ativo
  return `<span class="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cls}">${status || 'ativo'}</span>`
}

function badgeLicenca(dataIso) {
  if (!dataIso) return `<span class="text-[11px] text-neutral-500">Sem licença</span>`
  const dias = Math.ceil((new Date(dataIso) - Date.now()) / (1000 * 60 * 60 * 24))
  if (dias < 0) return `<span class="text-[11px] font-black text-red-400">Licença vencida</span>`
  const cls = dias <= 7 ? 'text-red-400' : dias <= 30 ? 'text-amber-400' : 'text-green-400'
  return `<span class="text-[11px] font-black ${cls}">${dias} dia${dias !== 1 ? 's' : ''} restantes</span>`
}

// ── Carregar e renderizar ──

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
  const lista     = document.getElementById('lista')
  const vazio     = document.getElementById('vazio')
  const contagem  = document.getElementById('contagem')

  contagem.textContent = `${clientes.length} cliente${clientes.length !== 1 ? 's' : ''}`

  if (!clientes.length) {
    lista.innerHTML = ''
    vazio.classList.remove('hidden')
    return
  }
  vazio.classList.add('hidden')

  lista.innerHTML = clientes.map(c => {
    const status = c.status || 'ativo'
    const vinculada = c.instalacao_uuid
      ? `<span class="text-green-400">vinculada</span>`
      : `<span class="text-neutral-500">não vinculada</span>`

    const btnStatus = status === 'ativo'
      ? `<button data-id="${c.id}" data-novo-status="suspenso"
           class="btn-status h-7 px-2.5 rounded-xl border border-amber-900/40 text-amber-400 text-[11px] font-black hover:bg-amber-900/20 transition-all">
           Suspender
         </button>`
      : `<button data-id="${c.id}" data-novo-status="ativo"
           class="btn-status h-7 px-2.5 rounded-xl border border-green-900/40 text-green-400 text-[11px] font-black hover:bg-green-900/20 transition-all">
           Reativar
         </button>`

    return `
      <div class="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 ${status === 'suspenso' ? 'opacity-75' : ''}">

        <!-- Cabeçalho -->
        <div class="flex items-start justify-between gap-4 mb-4">
          <div class="flex items-start gap-3 min-w-0">
            <span class="w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${c.online ? 'bg-green-500' : 'bg-neutral-600'}"></span>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <p class="font-black text-sm">${escapeHtml(c.nome_fantasia)}</p>
                ${badgeStatus(status)}
              </div>
              <p class="text-[11px] text-neutral-500">
                ${c.contato ? escapeHtml(c.contato) + ' · ' : ''}
                instalação: ${vinculada} · sync: ${fmtData(c.ultimo_sync_em)}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button data-id="${c.id}" data-nome="${escapeHtml(c.nome_fantasia)}" data-contato="${escapeHtml(c.contato || '')}"
              class="btn-editar h-8 px-3 rounded-xl border border-neutral-700 text-xs font-black hover:bg-neutral-800 transition-all">
              Editar
            </button>
            <button data-id="${c.id}" data-nome="${escapeHtml(c.nome_fantasia)}"
              class="btn-excluir h-8 px-3 rounded-xl border border-red-900/40 text-red-400 text-xs font-black hover:bg-red-900/20 transition-all">
              Excluir
            </button>
          </div>
        </div>

        <!-- Métricas -->
        <div class="grid grid-cols-5 gap-1 mb-4 bg-neutral-950/50 rounded-xl p-3">
          <div class="text-center">
            <p class="text-[10px] uppercase tracking-widest text-neutral-500 font-black mb-1">Caixa</p>
            <p class="text-xs font-black ${c.caixa_aberto ? 'text-green-400' : 'text-neutral-500'}">${c.caixa_aberto ? 'Aberto' : 'Fechado'}</p>
          </div>
          <div class="text-center">
            <p class="text-[10px] uppercase tracking-widest text-neutral-500 font-black mb-1">Faturamento</p>
            <p class="text-xs font-black">R$ ${fmtMoeda(c.faturamento_hoje)}</p>
          </div>
          <div class="text-center">
            <p class="text-[10px] uppercase tracking-widest text-neutral-500 font-black mb-1">Mesas</p>
            <p class="text-xs font-black">${c.mesas_abertas ?? 0}</p>
          </div>
          <div class="text-center">
            <p class="text-[10px] uppercase tracking-widest text-neutral-500 font-black mb-1">Pedidos</p>
            <p class="text-xs font-black">${c.pedidos_hoje ?? 0}</p>
          </div>
          <div class="text-center">
            <p class="text-[10px] uppercase tracking-widest text-neutral-500 font-black mb-1">Ticket médio</p>
            <p class="text-xs font-black">R$ ${fmtMoeda(c.ticket_medio)}</p>
          </div>
        </div>

        <!-- Rodapé: licença + permissões + ações -->
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">

          <div class="flex items-center gap-2">
            ${badgeLicenca(c.licenca_expira_em)}
            <button data-id="${c.id}" data-nome="${escapeHtml(c.nome_fantasia)}"
              class="btn-licenca h-7 px-2.5 rounded-xl border border-neutral-700 text-[11px] font-black hover:bg-neutral-800 transition-all">
              ${c.licenca_expira_em ? 'Renovar' : 'Gerar licença'}
            </button>
          </div>

          <div class="w-px h-4 bg-neutral-800"></div>

          <div class="flex items-center gap-2">
            <span class="text-[10px] uppercase tracking-widest text-neutral-500 font-black">Venda mobile</span>
            <button data-id="${c.id}" data-permitido="${c.venda_mobile_permitida}"
              class="toggle-mobile shrink-0 w-10 h-5 rounded-full transition-all relative ${c.venda_mobile_permitida ? 'bg-orange-500' : 'bg-neutral-700'}">
              <span class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${c.venda_mobile_permitida ? 'left-[22px]' : 'left-0.5'}"></span>
            </button>
          </div>

          <div class="w-px h-4 bg-neutral-800"></div>

          <button data-id="${c.id}" data-nome="${escapeHtml(c.nome_fantasia)}"
            class="btn-reset-token h-7 px-2.5 rounded-xl border border-neutral-700 text-[11px] font-black hover:bg-neutral-800 transition-all">
            Resetar token
          </button>

          ${btnStatus}

        </div>
      </div>
    `
  }).join('')

  // Toggle venda mobile
  document.querySelectorAll('.toggle-mobile').forEach(btn => {
    btn.addEventListener('click', async () => {
      const novoValor = btn.dataset.permitido !== 'true'
      btn.disabled = true
      try {
        await fetch(`/api/clientes/${btn.dataset.id}`, {
          method: 'PATCH', headers,
          body: JSON.stringify({ venda_mobile_permitida: novoValor })
        })
        await carregarClientes()
      } finally { btn.disabled = false }
    })
  })

  // Licença
  document.querySelectorAll('.btn-licenca').forEach(btn => {
    btn.addEventListener('click', () => abrirModalLicenca(btn.dataset.id, btn.dataset.nome))
  })

  // Editar
  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('editar-id').value    = btn.dataset.id
      document.getElementById('editar-nome').value  = btn.dataset.nome
      document.getElementById('editar-contato').value = btn.dataset.contato || ''
      document.getElementById('modal-editar').classList.remove('hidden')
    })
  })

  // Excluir
  document.querySelectorAll('.btn-excluir').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('excluir-id').value = btn.dataset.id
      document.getElementById('excluir-nome').textContent = btn.dataset.nome
      document.getElementById('modal-excluir').classList.remove('hidden')
    })
  })

  // Resetar token
  document.querySelectorAll('.btn-reset-token').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('reset-id').value = btn.dataset.id
      document.getElementById('reset-nome').textContent = btn.dataset.nome
      document.getElementById('reset-confirm').classList.remove('hidden')
      document.getElementById('reset-resultado').classList.add('hidden')
      document.getElementById('modal-reset').classList.remove('hidden')
    })
  })

  // Status (suspender / reativar)
  document.querySelectorAll('.btn-status').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true
      try {
        await fetch(`/api/clientes/${btn.dataset.id}`, {
          method: 'PATCH', headers,
          body: JSON.stringify({ status: btn.dataset.novoStatus })
        })
        await carregarClientes()
      } finally { btn.disabled = false }
    })
  })
}

// ── Modal: Novo cliente ──

const modalNovo = document.getElementById('modal-novo')
document.getElementById('btn-novo').addEventListener('click', () => {
  document.getElementById('novo-nome').value = ''
  document.getElementById('novo-contato').value = ''
  modalNovo.classList.remove('hidden')
})
document.getElementById('btn-cancelar-novo').addEventListener('click', () => modalNovo.classList.add('hidden'))
document.getElementById('btn-criar').addEventListener('click', async () => {
  const nome_fantasia = document.getElementById('novo-nome').value.trim()
  const contato = document.getElementById('novo-contato').value.trim()
  if (!nome_fantasia) return

  const resp = await fetch('/api/clientes', { method: 'POST', headers, body: JSON.stringify({ nome_fantasia, contato }) })
  const dados = await resp.json()
  if (!resp.ok) { alert(dados.error || 'Erro ao criar cliente'); return }

  modalNovo.classList.add('hidden')
  document.getElementById('token-gerado').textContent = dados.syncToken
  document.getElementById('modal-token').classList.remove('hidden')
  await carregarClientes()
})
document.getElementById('btn-fechar-token').addEventListener('click', () => {
  document.getElementById('modal-token').classList.add('hidden')
})

// ── Modal: Licença ──

const modalLicenca = document.getElementById('modal-licenca')
const modalChave   = document.getElementById('modal-chave')
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
document.getElementById('btn-cancelar-licenca').addEventListener('click', () => modalLicenca.classList.add('hidden'))
document.getElementById('btn-gerar-licenca').addEventListener('click', async () => {
  const dias = Number(document.getElementById('licenca-dias').value)
  if (!dias || dias <= 0) { alert('Informe a validade em dias'); return }

  const resp = await fetch(`/api/clientes/${clienteLicencaId}/licenca`, {
    method: 'POST', headers, body: JSON.stringify({ dias })
  })
  const dados = await resp.json()
  if (!resp.ok) { alert(dados.error || 'Erro ao gerar licença'); return }

  modalLicenca.classList.add('hidden')
  document.getElementById('chave-gerada').textContent = dados.chave

  if (dados.expira) {
    const exp = new Date(dados.expira)
    document.getElementById('chave-expira').textContent =
      `Válida até ${exp.toLocaleDateString('pt-BR')} (${dias} dias)`
  }

  modalChave.classList.remove('hidden')
  await carregarClientes()
})
document.getElementById('btn-fechar-chave').addEventListener('click', () => modalChave.classList.add('hidden'))

// ── Modal: Editar cliente ──

document.getElementById('btn-cancelar-editar').addEventListener('click', () => {
  document.getElementById('modal-editar').classList.add('hidden')
})
document.getElementById('btn-salvar-editar').addEventListener('click', async () => {
  const id      = document.getElementById('editar-id').value
  const nome    = document.getElementById('editar-nome').value.trim()
  const contato = document.getElementById('editar-contato').value.trim()
  if (!nome) return

  const resp = await fetch(`/api/clientes/${id}`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ nome_fantasia: nome, contato })
  })
  if (!resp.ok) { alert('Erro ao salvar'); return }

  document.getElementById('modal-editar').classList.add('hidden')
  await carregarClientes()
})

// ── Modal: Excluir cliente ──

document.getElementById('btn-cancelar-excluir').addEventListener('click', () => {
  document.getElementById('modal-excluir').classList.add('hidden')
})
document.getElementById('btn-confirmar-excluir').addEventListener('click', async () => {
  const id = document.getElementById('excluir-id').value
  const resp = await fetch(`/api/clientes/${id}`, { method: 'DELETE', headers })
  if (!resp.ok) { alert('Erro ao excluir'); return }

  document.getElementById('modal-excluir').classList.add('hidden')
  await carregarClientes()
})

// ── Modal: Resetar token ──

document.getElementById('btn-cancelar-reset').addEventListener('click', () => {
  document.getElementById('modal-reset').classList.add('hidden')
})
document.getElementById('btn-confirmar-reset').addEventListener('click', async () => {
  const id = document.getElementById('reset-id').value
  const resp = await fetch(`/api/clientes/${id}/reset-token`, { method: 'POST', headers })
  const dados = await resp.json()
  if (!resp.ok) { alert(dados.error || 'Erro ao resetar token'); return }

  document.getElementById('reset-confirm').classList.add('hidden')
  document.getElementById('reset-token-gerado').textContent = dados.syncToken
  document.getElementById('reset-resultado').classList.remove('hidden')
  await carregarClientes()
})
document.getElementById('btn-fechar-reset').addEventListener('click', () => {
  document.getElementById('modal-reset').classList.add('hidden')
})

// ── Init ──

carregarClientes()
setInterval(carregarClientes, 30000)
