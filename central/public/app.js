const token = localStorage.getItem('central_token')
if (!token) window.location.href = '/login.html'

const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

// ── Toast ────────────────────────────────────────────────────────────────────

const _toastRoot = document.createElement('div')
_toastRoot.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;'
document.body.appendChild(_toastRoot)

function toast(mensagem, tipo = 'info', duracao = 4000) {
  const accent = { success: '#4ade80', error: '#f87171', warning: '#fbbf24', info: '#f97316' }[tipo] || '#f97316'
  const el = document.createElement('div')
  el.style.cssText = `
    pointer-events:auto; position:relative; display:flex; align-items:flex-start; gap:10px;
    padding:12px 14px; border-radius:14px; width:300px; overflow:hidden;
    background:rgba(20,20,22,0.97); border:1px solid rgba(255,255,255,0.08);
    box-shadow:0 8px 32px rgba(0,0,0,0.5);
    transform:translateX(12px); opacity:0; transition:transform 0.25s cubic-bezier(0.22,1,0.36,1), opacity 0.25s;
  `
  el.innerHTML = `
    <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:${accent};border-radius:14px 0 0 14px;"></div>
    <p style="flex:1;font-size:12px;font-weight:500;line-height:1.5;color:rgba(255,255,255,0.8);margin-left:4px;">${escapeHtml(mensagem)}</p>
    <button style="flex-shrink:0;font-size:12px;font-weight:800;color:rgba(255,255,255,0.2);background:none;border:none;cursor:pointer;padding:0;line-height:1;"
      onmouseover="this.style.color='rgba(255,255,255,0.6)'" onmouseout="this.style.color='rgba(255,255,255,0.2)'">✕</button>
  `
  function fechar() {
    clearTimeout(timer)
    el.style.transform = 'translateX(12px)'
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 250)
  }
  el.querySelector('button').addEventListener('click', fechar)
  _toastRoot.appendChild(el)
  requestAnimationFrame(() => { el.style.transform = 'translateX(0)'; el.style.opacity = '1' })
  const timer = setTimeout(fechar, duracao)
}

document.getElementById('btn-sair').addEventListener('click', () => {
  localStorage.removeItem('central_token')
  window.location.href = '/login.html'
})

// ── Utilitários ──────────────────────────────────────────────────────────────

function fmtMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtData(iso) {
  if (!iso) return 'nunca'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtDataCurta(iso) {
  if (!iso) return '—'
  const d = iso.slice(0, 10) // yyyy-mm-dd
  const [y, m, dia] = d.split('-')
  return `${dia}/${m}/${y}`
}

function escapeHtml(s) {
  const div = document.createElement('div')
  div.textContent = String(s || '')
  return div.innerHTML
}

function avatarColor(nome) {
  const palette = ['#f97316','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ec4899','#3b82f6','#ef4444']
  let h = 0
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) | 0
  return palette[Math.abs(h) % palette.length]
}

function badgeStatus(status) {
  const cfg = {
    ativo:     { bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.2)',  color: '#4ade80' },
    suspenso:  { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', color: '#fbbf24' },
    cancelado: { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)',  color: '#f87171' },
  }
  const c = cfg[status] || cfg.ativo
  return `<span style="font-size:9px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;padding:2px 8px;border-radius:99px;background:${c.bg};border:1px solid ${c.border};color:${c.color};">${status || 'ativo'}</span>`
}

function badgeLicenca(dataIso) {
  if (!dataIso) return `<span style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.25);">Sem licença</span>`
  const dias = Math.ceil((new Date(dataIso) - Date.now()) / (1000 * 60 * 60 * 24))
  if (dias < 0) return `<span style="font-size:11px;font-weight:800;color:#f87171;">Vencida</span>`
  const color = dias <= 7 ? '#f87171' : dias <= 30 ? '#fbbf24' : '#4ade80'
  return `<span style="font-size:11px;font-weight:800;color:${color};">${dias}d restantes</span>`
}

function badgeLicencaPdv(c) {
  if (c.licenca_pendente) return `<span style="font-weight:700;color:#f97316;">Ativação pendente…</span>`
  if (!c.pdv_licenca_status) return `<span style="color:rgba(255,255,255,0.2);">Sem dados</span>`
  const dias = c.pdv_licenca_expira
    ? Math.ceil((new Date(c.pdv_licenca_expira) - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  if (c.pdv_licenca_status === 'ativado' && dias !== null && dias > 0) {
    const color = dias <= 7 ? '#f87171' : dias <= 30 ? '#fbbf24' : '#4ade80'
    return `<span style="font-weight:700;color:${color};">Ativo · ${dias}d</span>`
  }
  return `<span style="font-weight:700;color:#f87171;">Bloqueado</span>`
}

function cellSyncBool(valor, labelSim, labelNao, corSim, corNao) {
  if (valor == null) return `<span style="color:rgba(255,255,255,0.18);">—</span>`
  return valor
    ? `<span style="font-weight:700;color:${corSim};">${labelSim}</span>`
    : `<span style="font-weight:700;color:${corNao};">${labelNao}</span>`
}

function tempoAtras(iso) {
  if (!iso) return 'nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'agora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function diasAteVencer(dataIso) {
  if (!dataIso) return Infinity
  return Math.ceil((new Date(dataIso) - Date.now()) / (1000 * 60 * 60 * 24))
}

// ── CRM helpers ──────────────────────────────────────────────────────────────

function badgeContratoStatus(s) {
  const cfg = {
    trial:     { bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.2)',  color: '#818cf8' },
    ativo:     { bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.2)',   color: '#4ade80' },
    suspenso:  { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)',  color: '#fbbf24' },
    cancelado: { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)',   color: '#f87171' },
  }
  const c = cfg[s] || cfg.ativo
  return `<span style="font-size:9px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;padding:2px 7px;border-radius:99px;background:${c.bg};border:1px solid ${c.border};color:${c.color};white-space:nowrap;">${s}</span>`
}

function badgeTicketPrioridade(p) {
  const cfg = {
    baixa:   { bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
    media:   { bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.15)',  color: '#60a5fa' },
    alta:    { bg: 'rgba(251,146,60,0.1)',   border: 'rgba(251,146,60,0.2)',   color: '#fb923c' },
    urgente: { bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.2)', color: '#f87171' },
  }
  const c = cfg[p] || cfg.media
  return `<span style="font-size:9px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;padding:2px 7px;border-radius:99px;background:${c.bg};border:1px solid ${c.border};color:${c.color};white-space:nowrap;">${p}</span>`
}

function badgeTicketStatus(s) {
  const cfg = {
    aberto:       { bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
    em_andamento: { bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    resolvido:    { bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.15)', color: '#4ade80' },
    fechado:      { bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.1)', color: '#94a3b8' },
  }
  const c = cfg[s] || cfg.aberto
  const label = { aberto:'Aberto', em_andamento:'Em andamento', resolvido:'Resolvido', fechado:'Fechado' }[s] || s
  return `<span style="font-size:9px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;padding:2px 7px;border-radius:99px;background:${c.bg};border:1px solid ${c.border};color:${c.color};white-space:nowrap;">${label}</span>`
}

function labelTipoTicket(t) {
  return { sync:'Sync', instalacao:'Instalação', bug:'Bug', cobranca:'Cobrança', outro:'Outro' }[t] || t
}

// ── Dropdown helpers ─────────────────────────────────────────────────────────

function fecharDropdowns() {
  document.querySelectorAll('.dropdown-menu').forEach(m => {
    m.classList.add('hidden')
    m.classList.remove('flipped')
  })
  document.querySelectorAll('.btn-kebab').forEach(b => b.classList.remove('open'))
}

function abrirDropdown(btn) {
  const menu = document.getElementById(`menu-${btn.dataset.id}`)
  if (!menu) return
  const rect = btn.getBoundingClientRect()
  const GAP  = 6
  const EDGE = 8
  menu.style.top        = '-9999px'
  menu.style.left       = '-9999px'
  menu.style.right      = 'auto'
  menu.style.visibility = 'hidden'
  menu.classList.remove('hidden', 'flipped')
  requestAnimationFrame(() => {
    const h    = menu.offsetHeight
    const goUp = window.innerHeight - rect.bottom - EDGE < h
    menu.style.top        = goUp ? `${Math.max(EDGE, rect.top - h - GAP)}px` : `${rect.bottom + GAP}px`
    menu.style.left       = 'auto'
    menu.style.right      = `${Math.max(EDGE, window.innerWidth - rect.right)}px`
    menu.style.visibility = ''
    if (goUp) menu.classList.add('flipped')
    btn.classList.add('open')
  })
}

// ── State ────────────────────────────────────────────────────────────────────

const abertos      = new Set()        // accordion IDs open
const cardTabs     = new Map()        // id → 'acoes'|'contrato'|'tickets'
const clienteCache = new Map()        // id → { contratos, tickets }
let todosClientes  = []
let filtroStatus   = 'todos'

// ── Carregar / Filtrar ───────────────────────────────────────────────────────

async function carregarClientes() {
  const resp = await fetch('/api/clientes', { headers })
  if (resp.status === 401) {
    localStorage.removeItem('central_token')
    window.location.href = '/login.html'
    return
  }
  todosClientes = await resp.json()
  aplicarFiltro()
}

function aplicarFiltro() {
  const q = (document.getElementById('busca')?.value || '').toLowerCase().trim()
  let lista = todosClientes
  if (filtroStatus === 'ativo')    lista = lista.filter(c => (c.status || 'ativo') === 'ativo')
  if (filtroStatus === 'suspenso') lista = lista.filter(c => c.status === 'suspenso')
  if (filtroStatus === 'vencendo') lista = lista.filter(c => {
    const d = diasAteVencer(c.licenca_expira_em)
    return d >= 0 && d <= 7
  })
  if (q) lista = lista.filter(c =>
    c.nome_fantasia.toLowerCase().includes(q) ||
    (c.contato     || '').toLowerCase().includes(q) ||
    (c.responsavel || '').toLowerCase().includes(q) ||
    (c.cnpj        || '').toLowerCase().includes(q)
  )
  renderizar(lista)
}

document.getElementById('busca').addEventListener('input', aplicarFiltro)

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    filtroStatus = btn.dataset.filtro
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    aplicarFiltro()
  })
})

// ── Renderizar ───────────────────────────────────────────────────────────────

function renderizar(clientes) {
  const listaEl  = document.getElementById('lista')
  const vazioEl  = document.getElementById('vazio')
  const contagem = document.getElementById('contagem')

  const total    = todosClientes.length
  const online   = todosClientes.filter(c => c.online).length
  const ativos   = todosClientes.filter(c => (c.status || 'ativo') === 'ativo').length
  const suspensos= todosClientes.filter(c => c.status === 'suspenso').length
  const vencendo = todosClientes.filter(c => { const d = diasAteVencer(c.licenca_expira_em); return d >= 0 && d <= 7 }).length
  const fatTotal = todosClientes.reduce((s, c) => s + Number(c.faturamento_hoje || 0), 0)

  contagem.textContent = `${total} cliente${total !== 1 ? 's' : ''}`

  const badgeEl  = document.getElementById('badge-online')
  const onlineEl = document.getElementById('contagem-online')
  if (onlineEl) onlineEl.textContent = `${online} online`
  if (badgeEl)  badgeEl.style.display = online > 0 ? 'flex' : 'none'

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v }
  set('stat-total',    total)
  set('stat-online',   online)
  set('stat-fat',      'R$ ' + fmtMoeda(fatTotal))
  set('stat-vencendo', vencendo || '0')
  set('fb-todos',     total)
  set('fb-ativos',    ativos)
  set('fb-suspensos', suspensos)
  set('fb-vencendo',  vencendo)

  const elVenc = document.getElementById('stat-vencendo')
  if (elVenc) elVenc.style.color = vencendo > 0 ? '#f87171' : '#fff'

  if (!clientes.length) {
    listaEl.innerHTML = ''
    vazioEl.classList.remove('hidden')
    vazioEl.style.display = 'flex'
    const titulo = document.getElementById('vazio-titulo')
    const sub    = document.getElementById('vazio-sub')
    if (filtroStatus !== 'todos') {
      if (titulo) titulo.textContent = 'Nenhum resultado neste filtro'
      if (sub)    sub.textContent    = 'Tente outro filtro ou limpe a busca'
    } else {
      if (titulo) titulo.textContent = 'Nenhum cliente ainda'
      if (sub)    sub.textContent    = 'Clique em "+ Novo cliente" para começar'
    }
    return
  }
  vazioEl.classList.add('hidden')
  vazioEl.style.display = ''

  listaEl.innerHTML = clientes.map(c => renderItem(c)).join('')

  // ── Acordeão ──
  listaEl.querySelectorAll('.acc-header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.acc-item')
      const body = item.querySelector('.acc-body')
      const id   = Number(item.dataset.id)
      const isOpen = body.classList.contains('open')
      if (isOpen) {
        body.classList.remove('open')
        item.classList.remove('acc-open')
        abertos.delete(id)
      } else {
        body.classList.add('open')
        item.classList.add('acc-open')
        abertos.add(id)
        carregarDetalhesCliente(id)
      }
    })
  })

  // ── Tabs dentro do card ──
  listaEl.querySelectorAll('.acc-tab-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      const id  = Number(btn.dataset.cardId)
      const tab = btn.dataset.tab
      cardTabs.set(id, tab)
      document.querySelectorAll(`.acc-tab-btn[data-card-id="${id}"]`).forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      document.querySelectorAll(`.acc-tab-pane[data-card-id="${id}"]`).forEach(el => el.classList.add('hidden'))
      const pane = document.getElementById(`tab-${tab}-${id}`)
      if (pane) pane.classList.remove('hidden')
    })
  })

  // ── Toggle venda mobile ──
  listaEl.querySelectorAll('.toggle-mobile').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation()
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

  // ── Licença ──
  listaEl.querySelectorAll('.btn-licenca').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); abrirModalLicenca(btn.dataset.id, btn.dataset.nome) })
  })

  // ── Colar chave ──
  listaEl.querySelectorAll('.btn-colar-chave').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      document.getElementById('colar-id').value = btn.dataset.id
      document.getElementById('colar-cliente-nome').textContent = btn.dataset.nome
      document.getElementById('colar-chave').value = ''
      document.getElementById('modal-colar-chave').classList.remove('hidden')
    })
  })

  // ── Copiar chave ──
  listaEl.querySelectorAll('.btn-copiar-chave').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation()
      await navigator.clipboard.writeText(btn.dataset.chave)
      const orig = btn.textContent
      btn.textContent = 'Copiado!'
      setTimeout(() => { btn.textContent = orig }, 1500)
    })
  })

  // ── Editar ──
  listaEl.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      const id = Number(btn.dataset.id)
      const c  = todosClientes.find(x => x.id === id)
      if (!c) return
      document.getElementById('editar-id').value           = c.id
      document.getElementById('editar-nome').value         = c.nome_fantasia || ''
      document.getElementById('editar-responsavel').value  = c.responsavel   || ''
      document.getElementById('editar-cnpj').value         = c.cnpj          || ''
      document.getElementById('editar-telefone').value     = c.telefone      || ''
      document.getElementById('editar-contato').value      = c.contato       || ''
      document.getElementById('editar-endereco').value     = c.endereco      || ''
      document.getElementById('editar-obs').value          = c.observacoes   || ''
      document.getElementById('modal-editar').classList.remove('hidden')
    })
  })

  // ── Excluir ──
  listaEl.querySelectorAll('.btn-excluir').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      document.getElementById('excluir-id').value = btn.dataset.id
      document.getElementById('excluir-nome').textContent = btn.dataset.nome
      document.getElementById('modal-excluir').classList.remove('hidden')
    })
  })

  // ── Resetar token ──
  listaEl.querySelectorAll('.btn-reset-token').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      document.getElementById('reset-id').value = btn.dataset.id
      document.getElementById('reset-nome').textContent = btn.dataset.nome
      document.getElementById('reset-confirm').classList.remove('hidden')
      document.getElementById('reset-resultado').classList.add('hidden')
      document.getElementById('modal-reset').classList.remove('hidden')
    })
  })

  // ── Status ──
  listaEl.querySelectorAll('.btn-status').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation()
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

  // ── Kebab menu toggle ──
  listaEl.querySelectorAll('.btn-menu-toggle').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      const menu   = document.getElementById(`menu-${btn.dataset.id}`)
      const aberto = !menu.classList.contains('hidden')
      fecharDropdowns()
      if (!aberto) abrirDropdown(btn)
    })
  })

  listaEl.addEventListener('click', e => {
    if (e.target.closest('.dd-item')) fecharDropdowns()
  }, true)

  // Re-carrega detalhes dos cards abertos após re-render
  abertos.forEach(id => carregarDetalhesCliente(id))
}

// ── Render item ──────────────────────────────────────────────────────────────

function renderItem(c) {
  const status   = c.status || 'ativo'
  const isAberto = abertos.has(c.id)
  const activeTab = cardTabs.get(c.id) || 'acoes'
  const cor      = avatarColor(c.nome_fantasia)
  const inicial  = (c.nome_fantasia || '?')[0].toUpperCase()

  const vinculada = c.instalacao_uuid
    ? `<span style="color:#4ade80;">Vinculada</span>`
    : `<span style="color:rgba(255,255,255,0.2);">Não vinculada</span>`

  const toggleOn    = c.venda_mobile_permitida
  const toggleTrack = toggleOn
    ? `background:linear-gradient(135deg,#f97316,#ea580c);`
    : `background:rgba(255,255,255,0.1);`

  return `
    <div class="client-card acc-item ${isAberto ? 'acc-open' : ''} ${status === 'suspenso' ? 'suspended' : ''}" data-id="${c.id}">

      <!-- ── Header ── -->
      <button class="acc-header card-header w-full flex items-center gap-3 px-5 py-[14px] text-left">
        <div style="
          width:36px; height:36px; border-radius:10px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          background:${cor}18; border:1px solid ${cor}30;
          font-size:14px; font-weight:900; color:${cor};
        ">${inicial}</div>
        <span style="
          width:6px; height:6px; border-radius:50%; flex-shrink:0;
          background:${c.online ? '#22c55e' : 'rgba(255,255,255,0.15)'};
          ${c.online ? 'box-shadow:0 0 6px rgba(34,197,94,0.7);' : ''}
        "></span>
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span style="font-size:13px; font-weight:800; color:#fff;">${escapeHtml(c.nome_fantasia)}</span>
            ${badgeStatus(status)}
          </div>
          ${c.responsavel
            ? `<p style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">${escapeHtml(c.responsavel)}${c.contato ? ' · ' + escapeHtml(c.contato) : ''}</p>`
            : c.contato
              ? `<p style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(c.contato)}</p>`
              : ''
          }
        </div>
        <div style="display:flex; align-items:center; gap:14px; flex-shrink:0;">
          <div style="text-align:right;">
            ${c.licenca_pendente
              ? `<span style="font-size:9px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;padding:2px 8px;border-radius:99px;background:rgba(249,115,22,0.12);border:1px solid rgba(249,115,22,0.25);color:#f97316;">⏳ Ativação pendente</span>`
              : badgeLicenca(c.licenca_expira_em)
            }
            <div style="display:flex;align-items:center;justify-content:flex-end;gap:5px;margin-top:3px;">
              ${c.pdv_sync_erro
                ? `<span title="${escapeHtml(c.pdv_sync_erro)}" style="font-size:9px;font-weight:800;padding:1px 6px;border-radius:99px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#f87171;cursor:help;">⚠ Erro sync</span>`
                : ''
              }
              ${c.ultimo_sync_em ? `<span style="font-size:10px;color:rgba(255,255,255,0.2);">sync ${tempoAtras(c.ultimo_sync_em)}</span>` : ''}
            </div>
          </div>
          <svg class="acc-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </button>

      <!-- ── Accordion body ── -->
      <div class="acc-body ${isAberto ? 'open' : ''}">
        <div>

          <!-- Meta bar -->
          <div class="meta-bar">
            <span style="font-size:11px;color:rgba(255,255,255,0.3);">Instalação: ${vinculada}</span>
            <span style="font-size:11px;color:rgba(255,255,255,0.3);">Último sync: <span style="color:rgba(255,255,255,0.5);">${fmtData(c.ultimo_sync_em)}</span></span>
            <span style="font-size:11px;color:rgba(255,255,255,0.3);">pdv_config: ${badgeLicencaPdv(c)}</span>
            <span style="font-size:11px;color:rgba(255,255,255,0.3);">Suspenso: ${cellSyncBool(c.pdv_sync_suspenso, 'Sim', 'Não', '#f87171', '#4ade80')}</span>
            <span style="font-size:11px;color:rgba(255,255,255,0.3);">Bloqueado: ${cellSyncBool(c.pdv_sync_bloqueado, 'Sim', 'Não', '#f87171', '#4ade80')}</span>
            <span style="font-size:11px;color:rgba(255,255,255,0.3);">Mobile: ${cellSyncBool(c.pdv_sync_venda_mobile, 'Ativo', 'Inativo', '#4ade80', 'rgba(255,255,255,0.35)')}</span>
            ${c.pdv_sync_erro ? `<span style="font-size:11px;color:rgba(255,255,255,0.3);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(c.pdv_sync_erro)}">Erro sync: <span style="color:#f87171;font-weight:700;">${escapeHtml(c.pdv_sync_erro)}</span></span>` : ''}
            ${c.cnpj       ? `<span style="font-size:11px;color:rgba(255,255,255,0.3);">CNPJ: <span style="color:rgba(255,255,255,0.5);">${escapeHtml(c.cnpj)}</span></span>` : ''}
            ${c.telefone   ? `<span style="font-size:11px;color:rgba(255,255,255,0.3);">Tel: <span style="color:rgba(255,255,255,0.5);">${escapeHtml(c.telefone)}</span></span>` : ''}
            ${c.endereco   ? `<span style="font-size:11px;color:rgba(255,255,255,0.3);">End: <span style="color:rgba(255,255,255,0.45);">${escapeHtml(c.endereco)}</span></span>` : ''}
            ${c.observacoes? `<span style="font-size:11px;color:rgba(255,255,255,0.3);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(c.observacoes)}">Obs: <span style="color:rgba(255,255,255,0.4);font-style:italic;">${escapeHtml(c.observacoes)}</span></span>` : ''}
            <span style="font-size:11px;color:rgba(255,255,255,0.3);">Cliente desde: <span style="color:rgba(255,255,255,0.5);">${new Date(c.created_at).toLocaleDateString('pt-BR')}</span></span>
            ${c.pdv_host_fingerprint ? `<span style="font-size:11px;color:rgba(255,255,255,0.3);font-family:monospace;" title="Host fingerprint">HW: <span style="color:rgba(255,255,255,0.35);">${escapeHtml(c.pdv_host_fingerprint)}</span></span>` : ''}
          </div>

          <!-- KPI grid -->
          <div class="kpi-grid">
            <div class="kpi-cell">
              <p style="font-size:9px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.2);margin-bottom:4px;">Caixa</p>
              <p style="font-size:12px;font-weight:800;color:${c.caixa_aberto ? '#4ade80' : 'rgba(255,255,255,0.3)'};">${c.caixa_aberto ? 'Aberto' : 'Fechado'}</p>
            </div>
            <div class="kpi-div"></div>
            <div class="kpi-cell">
              <p style="font-size:9px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.2);margin-bottom:4px;">Faturamento</p>
              <p style="font-size:12px;font-weight:800;color:#fff;">R$&nbsp;${fmtMoeda(c.faturamento_hoje)}</p>
            </div>
            <div class="kpi-div"></div>
            <div class="kpi-cell">
              <p style="font-size:9px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.2);margin-bottom:4px;">Mesas</p>
              <p style="font-size:12px;font-weight:800;color:#fff;">${c.mesas_abertas ?? 0}</p>
            </div>
            <div class="kpi-div"></div>
            <div class="kpi-cell">
              <p style="font-size:9px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.2);margin-bottom:4px;">Pedidos</p>
              <p style="font-size:12px;font-weight:800;color:#fff;">${c.pedidos_hoje ?? 0}</p>
            </div>
            <div class="kpi-div"></div>
            <div class="kpi-cell">
              <p style="font-size:9px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.2);margin-bottom:4px;">Ticket</p>
              <p style="font-size:12px;font-weight:800;color:#fff;">R$&nbsp;${fmtMoeda(c.ticket_medio)}</p>
            </div>
          </div>

          <!-- Conexão -->
          <div style="padding:8px 16px; display:flex; align-items:center; gap:8px; border-top:1px solid rgba(255,255,255,0.04);">
            ${(() => {
              if (!c.ultimo_sync_em) return `
                <span style="display:flex;align-items:center;gap:6px;font-size:11px;color:rgba(255,255,255,0.25);">
                  <span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.12);flex-shrink:0;"></span>
                  Nunca sincronizou
                </span>`
              const diffMin = Math.floor((Date.now() - new Date(c.ultimo_sync_em).getTime()) / 60000)
              const isOnline = diffMin < 3
              const cor = c.pdv_sync_erro ? '#f87171' : isOnline ? '#4ade80' : '#fbbf24'
              const label = c.pdv_sync_erro
                ? `Erro: ${escapeHtml(c.pdv_sync_erro.slice(0, 60))}${c.pdv_sync_erro.length > 60 ? '…' : ''}`
                : isOnline ? `Conectado · sync ${tempoAtras(c.ultimo_sync_em)}`
                           : `Último sync: ${fmtData(c.ultimo_sync_em)}`
              return `
                <span style="display:flex;align-items:center;gap:6px;font-size:11px;color:${cor};">
                  <span style="width:6px;height:6px;border-radius:50%;background:${cor};flex-shrink:0;${isOnline && !c.pdv_sync_erro ? 'box-shadow:0 0 5px ' + cor + ';' : ''}"></span>
                  ${label}
                </span>`
            })()}
          </div>

          <!-- Tab bar -->
          <div style="display:flex;gap:2px;padding:6px 12px 0;border-top:1px solid rgba(255,255,255,0.04);">
            <button class="acc-tab-btn ${activeTab === 'acoes' ? 'active' : ''}" data-card-id="${c.id}" data-tab="acoes">Ações</button>
            <button class="acc-tab-btn ${activeTab === 'contrato' ? 'active' : ''}" data-card-id="${c.id}" data-tab="contrato">
              Contrato <span id="tc-contrato-${c.id}" style="font-size:9px;opacity:0.55;"></span>
            </button>
            <button class="acc-tab-btn ${activeTab === 'tickets' ? 'active' : ''}" data-card-id="${c.id}" data-tab="tickets">
              Tickets <span id="tc-tickets-${c.id}" style="font-size:9px;opacity:0.55;"></span>
            </button>
          </div>

          <!-- Tab: Ações -->
          <div id="tab-acoes-${c.id}" class="acc-tab-pane ${activeTab !== 'acoes' ? 'hidden' : ''}" data-card-id="${c.id}">
            <div style="padding:10px 16px; display:flex; align-items:center; gap:8px;">
              <button data-id="${c.id}" data-nome="${escapeHtml(c.nome_fantasia)}"
                class="btn-act orange btn-licenca" style="flex-shrink:0;">
                ${c.licenca_expira_em ? 'Renovar licença' : 'Gerar licença'}
              </button>
              ${c.chave_ativacao
                ? `<button data-chave="${escapeHtml(c.chave_ativacao)}"
                     class="btn-act btn-copiar-chave" style="flex-shrink:0;">Copiar chave</button>`
                : ''}
              <div style="flex:1;"></div>
              <div style="display:flex; align-items:center; gap:7px; flex-shrink:0;">
                <span style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.22);">Mobile</span>
                <button data-id="${c.id}" data-permitido="${c.venda_mobile_permitida}"
                  class="toggle-mobile" style="
                    position:relative; width:34px; height:18px; border-radius:99px;
                    border:none; cursor:pointer; transition:background 0.2s; flex-shrink:0;
                    ${toggleTrack}
                  ">
                  <span style="
                    position:absolute; top:2px; width:14px; height:14px;
                    border-radius:50%; background:#fff; transition:left 0.2s;
                    box-shadow:0 1px 4px rgba(0,0,0,0.3);
                    ${toggleOn ? 'left:18px;' : 'left:2px;'}
                  "></span>
                </button>
              </div>
              <div class="dropdown-wrap" style="flex-shrink:0;">
                <button class="btn-kebab btn-menu-toggle" data-id="${c.id}" title="Mais ações">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
                  </svg>
                </button>
                <div class="dropdown-menu hidden" id="menu-${c.id}">
                  <button class="dd-item btn-editar" data-id="${c.id}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Editar dados
                  </button>
                  <button class="dd-item btn-colar-chave" data-id="${c.id}" data-nome="${escapeHtml(c.nome_fantasia)}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                    Colar chave
                  </button>
                  <button class="dd-item btn-reset-token" data-id="${c.id}" data-nome="${escapeHtml(c.nome_fantasia)}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.9"/></svg>
                    Resetar token
                  </button>
                  ${status === 'ativo'
                    ? `<button class="dd-item dd-warn btn-status" data-id="${c.id}" data-novo-status="suspenso">
                         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg>
                         Suspender
                       </button>`
                    : `<button class="dd-item dd-green btn-status" data-id="${c.id}" data-novo-status="ativo">
                         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                         Reativar
                       </button>`
                  }
                  <div class="dd-sep"></div>
                  <button class="dd-item dd-danger btn-excluir" data-id="${c.id}" data-nome="${escapeHtml(c.nome_fantasia)}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Contrato -->
          <div id="tab-contrato-${c.id}" class="acc-tab-pane ${activeTab !== 'contrato' ? 'hidden' : ''}" data-card-id="${c.id}">
            <div id="contratos-area-${c.id}" style="padding:12px 16px;">
              <span style="font-size:12px;color:rgba(255,255,255,0.2);">Carregando…</span>
            </div>
          </div>

          <!-- Tab: Tickets -->
          <div id="tab-tickets-${c.id}" class="acc-tab-pane ${activeTab !== 'tickets' ? 'hidden' : ''}" data-card-id="${c.id}">
            <div id="tickets-area-${c.id}" style="padding:12px 16px;">
              <span style="font-size:12px;color:rgba(255,255,255,0.2);">Carregando…</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
}

// ── Lazy load detalhes ───────────────────────────────────────────────────────

async function carregarDetalhesCliente(id) {
  const cached = clienteCache.get(id)
  if (cached) {
    renderizarContratos(id, cached.contratos)
    renderizarTickets(id, cached.tickets)
  }
  try {
    const [cr, tr] = await Promise.all([
      fetch(`/api/contratos/cliente/${id}`, { headers }),
      fetch(`/api/tickets/cliente/${id}`,   { headers }),
    ])
    const contratos = await cr.json()
    const tickets   = await tr.json()
    clienteCache.set(id, { contratos, tickets })
    renderizarContratos(id, contratos)
    renderizarTickets(id, tickets)
  } catch (e) {
    console.error('Erro ao carregar detalhes do cliente:', e)
  }
}

// ── Render contratos ─────────────────────────────────────────────────────────

function renderizarContratos(id, contratos) {
  const el = document.getElementById(`contratos-area-${id}`)
  if (!el) return

  const badge = document.getElementById(`tc-contrato-${id}`)
  if (badge) badge.textContent = contratos.length ? `(${contratos.length})` : ''

  if (!contratos.length) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0;">
        <span style="font-size:12px;color:rgba(255,255,255,0.2);">Sem contrato cadastrado</span>
        <button class="btn-act orange btn-novo-contrato" style="flex-shrink:0;">+ Contrato</button>
      </div>
    `
  } else {
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px;">
        ${contratos.map(ct => `
          <div class="crm-row">
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span style="font-size:13px;font-weight:800;color:#fff;">${escapeHtml(ct.plano)}</span>
                ${badgeContratoStatus(ct.status)}
              </div>
              <p style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:3px;">
                ${ct.valor != null ? `R$ ${fmtMoeda(ct.valor)}/${ct.ciclo}` : ct.ciclo}
                ${ct.data_inicio ? ` · ${fmtDataCurta(ct.data_inicio)}` : ''}
                ${ct.data_fim    ? ` → ${fmtDataCurta(ct.data_fim)}` : ''}
              </p>
              ${ct.observacoes ? `<p style="font-size:10px;color:rgba(255,255,255,0.25);margin-top:2px;font-style:italic;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(ct.observacoes)}</p>` : ''}
            </div>
            <button class="btn-act btn-editar-contrato" data-id="${ct.id}" style="flex-shrink:0;">Editar</button>
            <button class="btn-act danger btn-excluir-contrato" data-id="${ct.id}" style="flex-shrink:0;padding:0 7px;font-size:13px;">✕</button>
          </div>
        `).join('')}
      </div>
      <button class="btn-act orange btn-novo-contrato">+ Novo contrato</button>
    `
  }

  el.querySelector('.btn-novo-contrato')?.addEventListener('click', e => {
    e.stopPropagation(); abrirModalContrato(id)
  })
  el.querySelectorAll('.btn-editar-contrato').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      const ct = clienteCache.get(id)?.contratos?.find(x => x.id == btn.dataset.id)
      if (ct) abrirModalContrato(id, ct)
    })
  })
  el.querySelectorAll('.btn-excluir-contrato').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation()
      if (!confirm('Excluir este contrato?')) return
      const resp = await fetch(`/api/contratos/${btn.dataset.id}`, { method: 'DELETE', headers })
      if (resp.ok) await carregarDetalhesCliente(id)
      else toast('Erro ao excluir contrato', 'error')
    })
  })
}

// ── Render tickets ───────────────────────────────────────────────────────────

function renderizarTickets(id, tickets) {
  const el = document.getElementById(`tickets-area-${id}`)
  if (!el) return

  const abertosCount = tickets.filter(t => t.status === 'aberto' || t.status === 'em_andamento').length
  const badge = document.getElementById(`tc-tickets-${id}`)
  if (badge) badge.textContent = abertosCount ? `(${abertosCount})` : ''

  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
      ${tickets.length
        ? `<span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.2);">${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}</span>`
        : `<span style="font-size:12px;color:rgba(255,255,255,0.2);">Sem tickets</span>`
      }
      <button class="btn-act orange btn-novo-ticket">+ Ticket</button>
    </div>
    ${tickets.length ? `
      <div style="display:flex;flex-direction:column;gap:5px;">
        ${tickets.map(t => `
          <div class="crm-row" style="${t.status === 'resolvido' || t.status === 'fechado' ? 'opacity:0.55;' : ''}">
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">
                ${badgeTicketPrioridade(t.prioridade)}
                <span style="font-size:10px;color:rgba(255,255,255,0.3);font-weight:700;">${labelTipoTicket(t.tipo)}</span>
                ${badgeTicketStatus(t.status)}
              </div>
              <p style="font-size:12px;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(t.titulo)}</p>
              ${t.descricao ? `<p style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(t.descricao)}</p>` : ''}
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0;">
              ${t.status !== 'resolvido' && t.status !== 'fechado'
                ? `<button class="btn-act success btn-resolver-ticket" data-id="${t.id}" title="Marcar resolvido">✓</button>`
                : ''
              }
              <button class="btn-act btn-editar-ticket" data-id="${t.id}">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-act danger btn-excluir-ticket" data-id="${t.id}" style="padding:0 7px;font-size:13px;">✕</button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `

  el.querySelector('.btn-novo-ticket')?.addEventListener('click', e => {
    e.stopPropagation(); abrirModalTicket(id)
  })
  el.querySelectorAll('.btn-editar-ticket').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      const t = clienteCache.get(id)?.tickets?.find(x => x.id == btn.dataset.id)
      if (t) abrirModalTicket(id, t)
    })
  })
  el.querySelectorAll('.btn-resolver-ticket').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      const t = clienteCache.get(id)?.tickets?.find(x => x.id == btn.dataset.id)
      if (t) abrirModalTicket(id, { ...t, status: 'resolvido' })
    })
  })
  el.querySelectorAll('.btn-excluir-ticket').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation()
      if (!confirm('Excluir este ticket?')) return
      const resp = await fetch(`/api/tickets/${btn.dataset.id}`, { method: 'DELETE', headers })
      if (resp.ok) await carregarDetalhesCliente(id)
      else toast('Erro ao excluir ticket', 'error')
    })
  })
}

// ── Modal: Novo cliente ──────────────────────────────────────────────────────

const modalNovo = document.getElementById('modal-novo')
let novoClienteId   = null
let novoClienteNome = null

document.getElementById('btn-novo').addEventListener('click', () => {
  document.getElementById('novo-nome').value        = ''
  document.getElementById('novo-responsavel').value = ''
  document.getElementById('novo-cnpj').value        = ''
  document.getElementById('novo-telefone').value    = ''
  document.getElementById('novo-contato').value     = ''
  document.getElementById('novo-endereco').value    = ''
  modalNovo.classList.remove('hidden')
  setTimeout(() => document.getElementById('novo-nome').focus(), 50)
})
document.getElementById('btn-cancelar-novo').addEventListener('click', () => modalNovo.classList.add('hidden'))
document.getElementById('btn-criar').addEventListener('click', async () => {
  const nome_fantasia = document.getElementById('novo-nome').value.trim()
  if (!nome_fantasia) return

  const body = {
    nome_fantasia,
    responsavel: document.getElementById('novo-responsavel').value.trim() || undefined,
    cnpj:        document.getElementById('novo-cnpj').value.trim()        || undefined,
    telefone:    document.getElementById('novo-telefone').value.trim()    || undefined,
    contato:     document.getElementById('novo-contato').value.trim()     || undefined,
    endereco:    document.getElementById('novo-endereco').value.trim()    || undefined,
  }
  const resp  = await fetch('/api/clientes', { method: 'POST', headers, body: JSON.stringify(body) })
  const dados = await resp.json()
  if (!resp.ok) { toast(dados.error || 'Erro ao criar cliente', 'error'); return }

  novoClienteId   = dados.id
  novoClienteNome = nome_fantasia
  modalNovo.classList.add('hidden')
  document.getElementById('token-nome-cliente').textContent = nome_fantasia
  document.getElementById('modal-token').classList.remove('hidden')
  await carregarClientes()
})

document.getElementById('btn-fechar-token').addEventListener('click', () => {
  document.getElementById('modal-token').classList.add('hidden')
})
document.getElementById('btn-gerar-licenca-novo').addEventListener('click', () => {
  document.getElementById('modal-token').classList.add('hidden')
  if (novoClienteId && novoClienteNome) abrirModalLicenca(novoClienteId, novoClienteNome)
})

// ── Modal: Licença ───────────────────────────────────────────────────────────

const modalLicenca = document.getElementById('modal-licenca')
const modalChave   = document.getElementById('modal-chave')
let clienteLicencaId   = null
let clienteLicencaNome = null
let chaveAtual         = null
let chaveExpiracaoISO  = null

function abrirModalLicenca(id, nome) {
  clienteLicencaId   = id
  clienteLicencaNome = nome
  document.getElementById('licenca-cliente-nome').textContent = nome
  document.getElementById('licenca-dias').value = ''
  document.querySelectorAll('.dias-preset').forEach(b => {
    b.style.background  = 'rgba(255,255,255,0.04)'
    b.style.borderColor = 'rgba(255,255,255,0.08)'
    b.style.color       = 'rgba(255,255,255,0.55)'
  })
  modalLicenca.classList.remove('hidden')
}

document.querySelectorAll('.dias-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('licenca-dias').value = btn.dataset.dias
    document.querySelectorAll('.dias-preset').forEach(b => {
      b.style.background  = 'rgba(255,255,255,0.04)'
      b.style.borderColor = 'rgba(255,255,255,0.08)'
      b.style.color       = 'rgba(255,255,255,0.55)'
    })
    btn.style.background  = '#f97316'
    btn.style.borderColor = '#f97316'
    btn.style.color       = '#fff'
  })
})
document.getElementById('btn-cancelar-licenca').addEventListener('click', () => modalLicenca.classList.add('hidden'))
document.getElementById('btn-gerar-licenca').addEventListener('click', async () => {
  const dias = Number(document.getElementById('licenca-dias').value)
  if (!dias || dias <= 0) { toast('Informe a validade em dias', 'warning'); return }

  const resp  = await fetch(`/api/clientes/${clienteLicencaId}/licenca`, { method: 'POST', headers, body: JSON.stringify({ dias }) })
  const dados = await resp.json()
  if (!resp.ok) { toast(dados.error || 'Erro ao gerar licença', 'error'); return }

  chaveAtual        = dados.chave
  chaveExpiracaoISO = dados.expira
  modalLicenca.classList.add('hidden')
  document.getElementById('chave-gerada').textContent = dados.chave
  if (dados.expira) {
    const exp = new Date(dados.expira)
    document.getElementById('chave-expira').textContent =
      `Cliente: ${clienteLicencaNome} · Válida até ${exp.toLocaleDateString('pt-BR')} (${dias} dias)`
  }
  modalChave.classList.remove('hidden')
  await carregarClientes()
})

document.getElementById('btn-copiar-chave').addEventListener('click', async () => {
  if (!chaveAtual) return
  await navigator.clipboard.writeText(chaveAtual)
  const btn = document.getElementById('btn-copiar-chave')
  const orig = btn.innerHTML
  btn.textContent = '✓ Copiado!'
  setTimeout(() => { btn.innerHTML = orig }, 1800)
})

document.getElementById('btn-copiar-msg').addEventListener('click', async () => {
  if (!chaveAtual) return
  const exp = chaveExpiracaoISO ? new Date(chaveExpiracaoISO).toLocaleDateString('pt-BR') : '—'
  const msg =
`Olá! Segue sua chave de ativação do Restaurante PDV (válida até ${exp}).

Para ativar:
1. Acesse o sistema e vá em /ativacao
2. Cole a chave abaixo e clique em *Ativar licença*

${chaveAtual}

Qualquer dúvida, entre em contato: suporte.savioalves@gmail.com`
  await navigator.clipboard.writeText(msg)
  const btn = document.getElementById('btn-copiar-msg')
  const orig = btn.innerHTML
  btn.textContent = '✓ Mensagem copiada!'
  setTimeout(() => { btn.innerHTML = orig }, 1800)
})

document.getElementById('btn-fechar-chave').addEventListener('click', () => {
  modalChave.classList.add('hidden')
  chaveAtual = null
  chaveExpiracaoISO = null
})

// ── Modal: Editar cliente ────────────────────────────────────────────────────

document.getElementById('btn-cancelar-editar').addEventListener('click', () => {
  document.getElementById('modal-editar').classList.add('hidden')
})
document.getElementById('btn-salvar-editar').addEventListener('click', async () => {
  const id = document.getElementById('editar-id').value
  const nome = document.getElementById('editar-nome').value.trim()
  if (!nome) return

  const body = {
    nome_fantasia: nome,
    responsavel:   document.getElementById('editar-responsavel').value.trim() || null,
    cnpj:          document.getElementById('editar-cnpj').value.trim()        || null,
    telefone:      document.getElementById('editar-telefone').value.trim()    || null,
    contato:       document.getElementById('editar-contato').value.trim()     || null,
    endereco:      document.getElementById('editar-endereco').value.trim()    || null,
    observacoes:   document.getElementById('editar-obs').value.trim()         || null,
  }
  const resp = await fetch(`/api/clientes/${id}`, { method: 'PATCH', headers, body: JSON.stringify(body) })
  if (!resp.ok) { toast('Erro ao salvar', 'error'); return }

  document.getElementById('modal-editar').classList.add('hidden')
  await carregarClientes()
})

// ── Modal: Excluir cliente ───────────────────────────────────────────────────

document.getElementById('btn-cancelar-excluir').addEventListener('click', () => {
  document.getElementById('modal-excluir').classList.add('hidden')
})
document.getElementById('btn-confirmar-excluir').addEventListener('click', async () => {
  const id   = document.getElementById('excluir-id').value
  const resp = await fetch(`/api/clientes/${id}`, { method: 'DELETE', headers })
  if (!resp.ok) { toast('Erro ao excluir', 'error'); return }
  clienteCache.delete(Number(id))
  document.getElementById('modal-excluir').classList.add('hidden')
  await carregarClientes()
})

// ── Modal: Resetar token ─────────────────────────────────────────────────────

document.getElementById('btn-cancelar-reset').addEventListener('click', () => {
  document.getElementById('modal-reset').classList.add('hidden')
})
document.getElementById('btn-confirmar-reset').addEventListener('click', async () => {
  const id   = document.getElementById('reset-id').value
  const resp = await fetch(`/api/clientes/${id}/reset-token`, { method: 'POST', headers })
  const dados = await resp.json()
  if (!resp.ok) { toast(dados.error || 'Erro ao resetar token', 'error'); return }

  document.getElementById('reset-confirm').classList.add('hidden')
  document.getElementById('reset-token-gerado').textContent = dados.syncToken
  document.getElementById('reset-resultado').classList.remove('hidden')
  await carregarClientes()
})
document.getElementById('btn-fechar-reset').addEventListener('click', () => {
  document.getElementById('modal-reset').classList.add('hidden')
})

// ── Modal: Colar chave ───────────────────────────────────────────────────────

document.getElementById('btn-cancelar-colar').addEventListener('click', () => {
  document.getElementById('modal-colar-chave').classList.add('hidden')
})
document.getElementById('btn-aplicar-chave').addEventListener('click', async () => {
  const id    = document.getElementById('colar-id').value
  const chave = document.getElementById('colar-chave').value.trim()
  if (!chave) { toast('Cole a chave antes de aplicar', 'warning'); return }

  const btn = document.getElementById('btn-aplicar-chave')
  btn.disabled = true
  btn.textContent = 'Aplicando…'
  try {
    const resp  = await fetch(`/api/clientes/${id}/aplicar-chave`, {
      method: 'POST', headers, body: JSON.stringify({ chave })
    })
    const dados = await resp.json()
    if (!resp.ok) { toast(dados.error || 'Erro ao aplicar chave', 'error'); return }

    const exp = new Date(dados.expira)
    toast(`Chave aplicada! Válida por ${dados.dias} dia${dados.dias !== 1 ? 's' : ''} — até ${exp.toLocaleDateString('pt-BR')}.`, 'success', 6000)
    document.getElementById('modal-colar-chave').classList.add('hidden')
    await carregarClientes()
  } finally {
    btn.disabled = false
    btn.textContent = 'Aplicar'
  }
})

// ── Modal: Contrato ──────────────────────────────────────────────────────────

function abrirModalContrato(clienteId, contrato = null) {
  document.getElementById('contrato-modal-titulo').textContent = contrato ? 'Editar contrato' : 'Novo contrato'
  document.getElementById('contrato-cliente-id').value = clienteId
  document.getElementById('contrato-id').value         = contrato?.id || ''
  document.getElementById('contrato-plano').value      = contrato?.plano || ''
  document.getElementById('contrato-valor').value      = contrato?.valor != null ? contrato.valor : ''
  document.getElementById('contrato-ciclo').value      = contrato?.ciclo || 'mensal'
  document.getElementById('contrato-inicio').value     = contrato?.data_inicio ? contrato.data_inicio.slice(0, 10) : ''
  document.getElementById('contrato-fim').value        = contrato?.data_fim    ? contrato.data_fim.slice(0, 10)    : ''
  document.getElementById('contrato-status').value     = contrato?.status || 'ativo'
  document.getElementById('contrato-obs').value        = contrato?.observacoes || ''
  document.getElementById('modal-contrato').classList.remove('hidden')
  setTimeout(() => document.getElementById('contrato-plano').focus(), 50)
}

document.getElementById('btn-cancelar-contrato').addEventListener('click', () => {
  document.getElementById('modal-contrato').classList.add('hidden')
})

document.getElementById('btn-salvar-contrato').addEventListener('click', async () => {
  const clienteId = document.getElementById('contrato-cliente-id').value
  const id        = document.getElementById('contrato-id').value
  const plano     = document.getElementById('contrato-plano').value.trim()
  if (!plano) { toast('Informe o plano', 'warning'); return }

  const body = {
    plano,
    valor:       document.getElementById('contrato-valor').value  || null,
    ciclo:       document.getElementById('contrato-ciclo').value,
    data_inicio: document.getElementById('contrato-inicio').value || null,
    data_fim:    document.getElementById('contrato-fim').value    || null,
    status:      document.getElementById('contrato-status').value,
    observacoes: document.getElementById('contrato-obs').value.trim() || null,
  }

  let resp
  if (id) {
    resp = await fetch(`/api/contratos/${id}`, { method: 'PATCH', headers, body: JSON.stringify(body) })
  } else {
    resp = await fetch(`/api/contratos/cliente/${clienteId}`, { method: 'POST', headers, body: JSON.stringify(body) })
  }
  if (!resp.ok) { const d = await resp.json(); toast(d.error || 'Erro ao salvar contrato', 'error'); return }

  document.getElementById('modal-contrato').classList.add('hidden')
  toast(id ? 'Contrato atualizado!' : 'Contrato criado!', 'success')
  await carregarDetalhesCliente(Number(clienteId))
})

// ── Modal: Ticket ────────────────────────────────────────────────────────────

function abrirModalTicket(clienteId, ticket = null, forceStatus = null) {
  document.getElementById('ticket-modal-titulo').textContent = ticket?.id ? 'Editar ticket' : 'Novo ticket'
  document.getElementById('ticket-cliente-id').value  = clienteId
  document.getElementById('ticket-id').value          = ticket?.id || ''
  document.getElementById('ticket-tipo').value        = ticket?.tipo      || 'outro'
  document.getElementById('ticket-prioridade').value  = ticket?.prioridade || 'media'
  document.getElementById('ticket-titulo').value      = ticket?.titulo    || ''
  document.getElementById('ticket-descricao').value   = ticket?.descricao || ''

  const editFields = document.getElementById('ticket-edit-fields')
  if (ticket?.id) {
    editFields.classList.remove('hidden')
    document.getElementById('ticket-status').value    = forceStatus || ticket?.status || 'aberto'
    document.getElementById('ticket-resolucao').value = ticket?.resolucao || ''
  } else {
    editFields.classList.add('hidden')
  }

  document.getElementById('modal-ticket').classList.remove('hidden')
  setTimeout(() => document.getElementById('ticket-titulo').focus(), 50)
}

document.getElementById('btn-cancelar-ticket').addEventListener('click', () => {
  document.getElementById('modal-ticket').classList.add('hidden')
})

document.getElementById('btn-salvar-ticket').addEventListener('click', async () => {
  const clienteId = document.getElementById('ticket-cliente-id').value
  const id        = document.getElementById('ticket-id').value
  const titulo    = document.getElementById('ticket-titulo').value.trim()
  if (!titulo) { toast('Informe o título', 'warning'); return }

  const body = {
    tipo:      document.getElementById('ticket-tipo').value,
    prioridade:document.getElementById('ticket-prioridade').value,
    titulo,
    descricao: document.getElementById('ticket-descricao').value.trim() || null,
  }
  const editFields = document.getElementById('ticket-edit-fields')
  if (!editFields.classList.contains('hidden')) {
    body.status    = document.getElementById('ticket-status').value
    body.resolucao = document.getElementById('ticket-resolucao').value.trim() || null
  }

  let resp
  if (id) {
    resp = await fetch(`/api/tickets/${id}`, { method: 'PATCH', headers, body: JSON.stringify(body) })
  } else {
    resp = await fetch(`/api/tickets/cliente/${clienteId}`, { method: 'POST', headers, body: JSON.stringify(body) })
  }
  if (!resp.ok) { const d = await resp.json(); toast(d.error || 'Erro ao salvar ticket', 'error'); return }

  document.getElementById('modal-ticket').classList.add('hidden')
  toast(id ? 'Ticket atualizado!' : 'Ticket aberto!', 'success')
  await carregarDetalhesCliente(Number(clienteId))
})

// ── Fechar dropdown ao clicar fora ──────────────────────────────────────────
document.addEventListener('click', fecharDropdowns)

// ── Init ─────────────────────────────────────────────────────────────────────
carregarClientes()
setInterval(carregarClientes, 10_000)
