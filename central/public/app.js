const token = localStorage.getItem('central_token')
if (!token) window.location.href = '/login.html'

const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

// ── Toast ──

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

// Estado real da licença conforme reportado pelo PDV via sync
function badgeLicencaPdv(c) {
  if (c.licenca_pendente) {
    return `<span style="font-weight:700;color:#f97316;">Ativação pendente…</span>`
  }
  if (!c.pdv_licenca_status) {
    return `<span style="color:rgba(255,255,255,0.2);">Sem dados</span>`
  }
  const dias = c.pdv_licenca_expira
    ? Math.ceil((new Date(c.pdv_licenca_expira) - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  if (c.pdv_licenca_status === 'ativado' && dias !== null && dias > 0) {
    const color = dias <= 7 ? '#f87171' : dias <= 30 ? '#fbbf24' : '#4ade80'
    return `<span style="font-weight:700;color:${color};">Ativo · ${dias}d</span>`
  }
  return `<span style="font-weight:700;color:#f87171;">Bloqueado</span>`
}

// Célula de status sync_config reportado pelo PDV (booleano com label)
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

// ── Dropdown helpers ──
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

  // left: -9999px + right: auto → renderiza completamente fora da tela,
  // sem restrição de right, para que offsetHeight seja a altura real do menu
  menu.style.top        = '-9999px'
  menu.style.left       = '-9999px'
  menu.style.right      = 'auto'
  menu.style.visibility = 'hidden'
  menu.classList.remove('hidden', 'flipped')

  requestAnimationFrame(() => {
    const h    = menu.offsetHeight
    const goUp = window.innerHeight - rect.bottom - EDGE < h

    menu.style.top        = goUp
      ? `${Math.max(EDGE, rect.top - h - GAP)}px`
      : `${rect.bottom + GAP}px`
    menu.style.left       = 'auto'
    menu.style.right      = `${Math.max(EDGE, window.innerWidth - rect.right)}px`
    menu.style.visibility = ''
    if (goUp) menu.classList.add('flipped')
    btn.classList.add('open')
  })
}

// ── Carregar / Filtrar ──

const abertos    = new Set()
let todosClientes = []
let filtroStatus  = 'todos'

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

  // Filtro por status
  if (filtroStatus === 'ativo')    lista = lista.filter(c => (c.status || 'ativo') === 'ativo')
  if (filtroStatus === 'suspenso') lista = lista.filter(c => c.status === 'suspenso')
  if (filtroStatus === 'vencendo') lista = lista.filter(c => {
    const d = diasAteVencer(c.licenca_expira_em)
    return d >= 0 && d <= 7
  })

  // Filtro por texto
  if (q) lista = lista.filter(c =>
    c.nome_fantasia.toLowerCase().includes(q) ||
    (c.contato || '').toLowerCase().includes(q)
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

// ── Renderizar ──

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

  // Header badge online
  const badgeEl  = document.getElementById('badge-online')
  const onlineEl = document.getElementById('contagem-online')
  if (onlineEl) onlineEl.textContent = `${online} online`
  if (badgeEl)  badgeEl.style.display = online > 0 ? 'flex' : 'none'

  // Stat cards
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v }
  set('stat-total',    total)
  set('stat-online',   online)
  set('stat-fat',      'R$ ' + fmtMoeda(fatTotal))
  set('stat-vencendo', vencendo || '0')

  // Filter badges
  set('fb-todos',     total)
  set('fb-ativos',    ativos)
  set('fb-suspensos', suspensos)
  set('fb-vencendo',  vencendo)

  // Color stat-vencendo se houver urgentes
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
      const isOpen = body.classList.contains('open')
      if (isOpen) {
        body.classList.remove('open')
        item.classList.remove('acc-open')
        abertos.delete(Number(item.dataset.id))
      } else {
        body.classList.add('open')
        item.classList.add('acc-open')
        abertos.add(Number(item.dataset.id))
      }
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
      document.getElementById('editar-id').value      = btn.dataset.id
      document.getElementById('editar-nome').value    = btn.dataset.nome
      document.getElementById('editar-contato').value = btn.dataset.contato || ''
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

  // Fecha dropdown ao clicar em qualquer item (capture: antes do stopPropagation dos handlers)
  listaEl.addEventListener('click', e => {
    if (e.target.closest('.dd-item')) fecharDropdowns()
  }, true)
}

// ── Render item ──

function renderItem(c) {
  const status   = c.status || 'ativo'
  const isAberto = abertos.has(c.id)
  const cor      = avatarColor(c.nome_fantasia)
  const inicial  = (c.nome_fantasia || '?')[0].toUpperCase()

  const vinculada = c.instalacao_uuid
    ? `<span style="color:#4ade80;">Vinculada</span>`
    : `<span style="color:rgba(255,255,255,0.2);">Não vinculada</span>`

  const btnStatus = status === 'ativo'
    ? `<button data-id="${c.id}" data-novo-status="suspenso" class="btn-act warning btn-status">Suspender</button>`
    : `<button data-id="${c.id}" data-novo-status="ativo"    class="btn-act success btn-status">Reativar</button>`

  const toggleOn   = c.venda_mobile_permitida
  const toggleTrack = toggleOn
    ? `background:linear-gradient(135deg,#f97316,#ea580c);`
    : `background:rgba(255,255,255,0.1);`

  return `
    <div class="client-card acc-item ${isAberto ? 'acc-open' : ''} ${status === 'suspenso' ? 'suspended' : ''}" data-id="${c.id}">

      <!-- ── Header (always visible) ── -->
      <button class="acc-header card-header w-full flex items-center gap-3 px-5 py-[14px] text-left">

        <!-- Avatar -->
        <div style="
          width:36px; height:36px; border-radius:10px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          background:${cor}18; border:1px solid ${cor}30;
          font-size:14px; font-weight:900; color:${cor};
        ">${inicial}</div>

        <!-- Online dot -->
        <span style="
          width:6px; height:6px; border-radius:50%; flex-shrink:0;
          background:${c.online ? '#22c55e' : 'rgba(255,255,255,0.15)'};
          ${c.online ? 'box-shadow:0 0 6px rgba(34,197,94,0.7);' : ''}
        "></span>

        <!-- Name + status -->
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span style="font-size:13px; font-weight:800; color:#fff;">${escapeHtml(c.nome_fantasia)}</span>
            ${badgeStatus(status)}
          </div>
          ${c.contato ? `<p style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(c.contato)}</p>` : ''}
        </div>

        <!-- Right: license + sync + chevron -->
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
              ${c.ultimo_sync_em
                ? `<span style="font-size:10px;color:rgba(255,255,255,0.2);">sync ${tempoAtras(c.ultimo_sync_em)}</span>`
                : ''}
            </div>
          </div>
          <svg class="acc-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </button>

      <!-- ── Expandable body ── -->
      <div class="acc-body ${isAberto ? 'open' : ''}">
        <div>

          <!-- Meta bar — estado real das tabelas pdv_config + sync_config -->
          <div class="meta-bar">
            <span style="font-size:11px;color:rgba(255,255,255,0.3);">
              Instalação: ${vinculada}
            </span>
            <span style="font-size:11px;color:rgba(255,255,255,0.3);">
              Último sync: <span style="color:rgba(255,255,255,0.5);">${fmtData(c.ultimo_sync_em)}</span>
            </span>
            <span style="font-size:11px;color:rgba(255,255,255,0.3);">
              pdv_config: ${badgeLicencaPdv(c)}
            </span>
            <span style="font-size:11px;color:rgba(255,255,255,0.3);">
              Suspenso: ${cellSyncBool(c.pdv_sync_suspenso, 'Sim', 'Não', '#f87171', '#4ade80')}
            </span>
            <span style="font-size:11px;color:rgba(255,255,255,0.3);">
              Bloqueado: ${cellSyncBool(c.pdv_sync_bloqueado, 'Sim', 'Não', '#f87171', '#4ade80')}
            </span>
            <span style="font-size:11px;color:rgba(255,255,255,0.3);">
              Mobile: ${cellSyncBool(c.pdv_sync_venda_mobile, 'Ativo', 'Inativo', '#4ade80', 'rgba(255,255,255,0.35)')}
            </span>
            ${c.pdv_sync_erro ? `
            <span style="font-size:11px;color:rgba(255,255,255,0.3);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(c.pdv_sync_erro)}">
              Erro sync: <span style="color:#f87171;font-weight:700;">${escapeHtml(c.pdv_sync_erro)}</span>
            </span>` : ''}
            <span style="font-size:11px;color:rgba(255,255,255,0.3);">
              Cliente desde: <span style="color:rgba(255,255,255,0.5);">${new Date(c.created_at).toLocaleDateString('pt-BR')}</span>
            </span>
            ${c.pdv_host_fingerprint ? `
            <span style="font-size:11px;color:rgba(255,255,255,0.3);font-family:monospace;" title="Host fingerprint do hardware onde o PDV está instalado">
              HW: <span style="color:rgba(255,255,255,0.35);">${escapeHtml(c.pdv_host_fingerprint)}</span>
            </span>` : ''}
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

          <!-- Actions (single row) -->
          <div style="padding:10px 16px; display:flex; align-items:center; gap:8px;">

            <!-- Licença -->
            <button data-id="${c.id}" data-nome="${escapeHtml(c.nome_fantasia)}"
              class="btn-act orange btn-licenca" style="flex-shrink:0;">
              ${c.licenca_expira_em ? 'Renovar licença' : 'Gerar licença'}
            </button>

            ${c.chave_ativacao
              ? `<button data-chave="${escapeHtml(c.chave_ativacao)}"
                   class="btn-act btn-copiar-chave" style="flex-shrink:0;">Copiar chave</button>`
              : ''}

            <!-- Spacer -->
            <div style="flex:1;"></div>

            <!-- Venda mobile toggle -->
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

            <!-- Kebab menu -->
            <div class="dropdown-wrap" style="flex-shrink:0;">
              <button class="btn-kebab btn-menu-toggle" data-id="${c.id}" title="Mais ações">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
                </svg>
              </button>
              <div class="dropdown-menu hidden" id="menu-${c.id}">

                <button class="dd-item btn-editar"
                  data-id="${c.id}" data-nome="${escapeHtml(c.nome_fantasia)}" data-contato="${escapeHtml(c.contato || '')}">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Editar
                </button>

                <button class="dd-item btn-colar-chave"
                  data-id="${c.id}" data-nome="${escapeHtml(c.nome_fantasia)}">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                  Colar chave
                </button>

                <button class="dd-item btn-reset-token"
                  data-id="${c.id}" data-nome="${escapeHtml(c.nome_fantasia)}">
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

                <button class="dd-item dd-danger btn-excluir"
                  data-id="${c.id}" data-nome="${escapeHtml(c.nome_fantasia)}">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  Excluir
                </button>

              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  `
}

// ── Modal: Novo cliente ──

const modalNovo = document.getElementById('modal-novo')
let novoClienteId   = null
let novoClienteNome = null

document.getElementById('btn-novo').addEventListener('click', () => {
  document.getElementById('novo-nome').value    = ''
  document.getElementById('novo-contato').value = ''
  modalNovo.classList.remove('hidden')
  setTimeout(() => document.getElementById('novo-nome').focus(), 50)
})
document.getElementById('btn-cancelar-novo').addEventListener('click', () => modalNovo.classList.add('hidden'))
document.getElementById('btn-criar').addEventListener('click', async () => {
  const nome_fantasia = document.getElementById('novo-nome').value.trim()
  const contato       = document.getElementById('novo-contato').value.trim()
  if (!nome_fantasia) return

  const resp  = await fetch('/api/clientes', { method: 'POST', headers, body: JSON.stringify({ nome_fantasia, contato }) })
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

// ── Modal: Licença ──

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
    b.style.background   = 'rgba(255,255,255,0.04)'
    b.style.borderColor  = 'rgba(255,255,255,0.08)'
    b.style.color        = 'rgba(255,255,255,0.55)'
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
  if (!resp.ok) { toast('Erro ao salvar', 'error'); return }

  document.getElementById('modal-editar').classList.add('hidden')
  await carregarClientes()
})

// ── Modal: Excluir cliente ──

document.getElementById('btn-cancelar-excluir').addEventListener('click', () => {
  document.getElementById('modal-excluir').classList.add('hidden')
})
document.getElementById('btn-confirmar-excluir').addEventListener('click', async () => {
  const id   = document.getElementById('excluir-id').value
  const resp = await fetch(`/api/clientes/${id}`, { method: 'DELETE', headers })
  if (!resp.ok) { toast('Erro ao excluir', 'error'); return }

  document.getElementById('modal-excluir').classList.add('hidden')
  await carregarClientes()
})

// ── Modal: Resetar token ──

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

// ── Modal: Colar chave de ativação ──

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

// ── Fechar dropdown ao clicar fora ──
document.addEventListener('click', fecharDropdowns)

// ── Init ──

carregarClientes()
setInterval(carregarClientes, 10_000)
