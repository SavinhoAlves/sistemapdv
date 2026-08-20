// shared.js — carregado em todas as páginas do painel (exceto login/ativacao)

;(() => { if (!localStorage.getItem('central_token')) { window.location.href = '/login.html' } })()

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('central_token') || ''}`
}

// ── Toast ─────────────────────────────────────────────────────────────────────
const _toastRoot = document.createElement('div')
_toastRoot.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;'
document.body.appendChild(_toastRoot)

function toast(msg, tipo = 'info', dur = 4000) {
  const accent = { success:'#4ade80', error:'#f87171', warning:'#fbbf24', info:'#f97316' }[tipo] || '#f97316'
  const el = document.createElement('div')
  el.style.cssText = 'pointer-events:auto;position:relative;display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:14px;width:300px;overflow:hidden;background:rgba(20,20,22,.97);border:1px solid rgba(255,255,255,.08);box-shadow:0 8px 32px rgba(0,0,0,.5);transform:translateX(12px);opacity:0;transition:transform .25s cubic-bezier(.22,1,.36,1),opacity .25s'
  el.innerHTML = `<div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:${accent};border-radius:14px 0 0 14px;"></div><p style="flex:1;font-size:12px;font-weight:500;line-height:1.5;color:rgba(255,255,255,.82);margin-left:4px;">${escapeHtml(msg)}</p><button style="flex-shrink:0;font-size:12px;font-weight:800;color:rgba(255,255,255,.2);background:none;border:none;cursor:pointer;">✕</button>`
  const close = () => { clearTimeout(t); el.style.transform='translateX(12px)'; el.style.opacity='0'; setTimeout(()=>el.remove(),250) }
  el.querySelector('button').addEventListener('click', close)
  _toastRoot.appendChild(el)
  requestAnimationFrame(() => { el.style.transform='translateX(0)'; el.style.opacity='1' })
  const t = setTimeout(close, dur)
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function escapeHtml(s) { const d=document.createElement('div'); d.textContent=String(s||''); return d.innerHTML }
function fmtMoeda(v) { return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) }
function fmtData(iso) { if(!iso) return 'nunca'; return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) }
function fmtDataCurta(iso) { if(!iso) return '—'; const[y,m,d]=String(iso).slice(0,10).split('-'); return `${d}/${m}/${y}` }
function tempoAtras(iso) {
  if (!iso) return 'nunca'
  const diff=Date.now()-new Date(iso).getTime(), m=Math.floor(diff/60000)
  if(m<1)return'agora'; if(m<60)return`${m}min`; const h=Math.floor(m/60); if(h<24)return`${h}h`; return`${Math.floor(h/24)}d`
}
function diasAteVencer(iso) { if(!iso) return Infinity; return Math.ceil((new Date(iso)-Date.now())/864e5) }
function avatarColor(n) {
  const p=['#f97316','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ec4899','#3b82f6','#ef4444']
  let h=0; for(let i=0;i<n.length;i++) h=(h*31+n.charCodeAt(i))|0; return p[Math.abs(h)%p.length]
}

// ── Badges ────────────────────────────────────────────────────────────────────
function badgeStatus(s) {
  const C={ativo:{bg:'rgba(34,197,94,.1)',b:'rgba(34,197,94,.22)',t:'#4ade80'},suspenso:{bg:'rgba(245,158,11,.1)',b:'rgba(245,158,11,.22)',t:'#fbbf24'},cancelado:{bg:'rgba(239,68,68,.1)',b:'rgba(239,68,68,.22)',t:'#f87171'}}[s]||{bg:'rgba(34,197,94,.1)',b:'rgba(34,197,94,.22)',t:'#4ade80'}
  return `<span style="font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:2px 8px;border-radius:99px;background:${C.bg};border:1px solid ${C.b};color:${C.t};">${s||'ativo'}</span>`
}
function badgeLicenca(iso) {
  if(!iso) return `<span style="font-size:11px;color:rgba(255,255,255,.25);">Sem licença</span>`
  const d=Math.ceil((new Date(iso)-Date.now())/864e5)
  if(d<0) return `<span style="font-size:11px;font-weight:800;color:#f87171;">Vencida</span>`
  const c=d<=7?'#f87171':d<=30?'#fbbf24':'#4ade80'
  return `<span style="font-size:11px;font-weight:800;color:${c};">${d}d</span>`
}
function badgeContratoStatus(s) {
  const C={trial:{bg:'rgba(99,102,241,.1)',b:'rgba(99,102,241,.2)',t:'#818cf8'},ativo:{bg:'rgba(34,197,94,.1)',b:'rgba(34,197,94,.2)',t:'#4ade80'},suspenso:{bg:'rgba(245,158,11,.1)',b:'rgba(245,158,11,.2)',t:'#fbbf24'},cancelado:{bg:'rgba(239,68,68,.1)',b:'rgba(239,68,68,.2)',t:'#f87171'}}[s]||{}
  return `<span style="font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:99px;background:${C.bg};border:1px solid ${C.b};color:${C.t};">${s}</span>`
}
function badgePrioridade(p) {
  const C={baixa:{bg:'rgba(148,163,184,.08)',b:'rgba(148,163,184,.12)',t:'#94a3b8'},media:{bg:'rgba(96,165,250,.08)',b:'rgba(96,165,250,.15)',t:'#60a5fa'},alta:{bg:'rgba(251,146,60,.1)',b:'rgba(251,146,60,.2)',t:'#fb923c'},urgente:{bg:'rgba(248,113,113,.1)',b:'rgba(248,113,113,.2)',t:'#f87171'}}[p]||{}
  return `<span style="font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:99px;background:${C.bg};border:1px solid ${C.b};color:${C.t};">${p}</span>`
}
function badgeTicketStatus(s) {
  const C={aberto:{bg:'rgba(96,165,250,.08)',b:'rgba(96,165,250,.15)',t:'#60a5fa'},em_andamento:{bg:'rgba(251,191,36,.08)',b:'rgba(251,191,36,.15)',t:'#fbbf24'},resolvido:{bg:'rgba(74,222,128,.08)',b:'rgba(74,222,128,.15)',t:'#4ade80'},fechado:{bg:'rgba(148,163,184,.06)',b:'rgba(148,163,184,.1)',t:'#94a3b8'}}[s]||{}
  const lbl={aberto:'Aberto',em_andamento:'Em andamento',resolvido:'Resolvido',fechado:'Fechado'}[s]||s
  return `<span style="font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:2px 7px;border-radius:99px;background:${C.bg};border:1px solid ${C.b};color:${C.t};">${lbl}</span>`
}
function labelTipo(t) { return{sync:'Sync',instalacao:'Instalação',bug:'Bug',cobranca:'Cobrança',outro:'Outro'}[t]||t }

// ── Sidebar ───────────────────────────────────────────────────────────────────
function initSidebar(active) {
  const el = document.getElementById('sidebar')
  if (!el) return

  function navLink(id, label, href, icon) {
    const on = active === id
    return `<a href="${href}" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:9px;font-size:13px;font-weight:${on?800:600};text-decoration:none;color:${on?'#f97316':'rgba(255,255,255,.38)'};background:${on?'rgba(249,115,22,.09)':'transparent'};border-left:2px solid ${on?'#f97316':'transparent'};margin-bottom:2px;transition:all .12s;" onmouseover="if(!this.dataset.on){this.style.background='rgba(255,255,255,.04)';this.style.color='rgba(255,255,255,.72)'}" onmouseout="if(!this.dataset.on){this.style.background='transparent';this.style.color='rgba(255,255,255,.38)'}" ${on?'data-on="1"':''}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">${icon}</svg>${label}</a>`
  }

  el.innerHTML = `
    <div style="padding:20px 16px 16px;border-bottom:1px solid rgba(255,255,255,.05);margin-bottom:6px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;color:#fff;flex-shrink:0;background:linear-gradient(135deg,#f97316,#ea580c);box-shadow:0 0 18px rgba(249,115,22,.3);">P</div>
        <div>
          <p style="font-size:13px;font-weight:900;color:#fff;line-height:1;letter-spacing:-.3px;">Painel Central</p>
          <p style="font-size:10px;color:rgba(255,255,255,.28);margin-top:3px;line-height:1;">Restaurante PDV</p>
        </div>
      </div>
    </div>
    <nav style="padding:0 8px;flex:1;overflow-y:auto;">
      <p style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.17);padding:10px 4px 6px;">Principal</p>
      ${navLink('dashboard','Dashboard','/index.html','<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>')}
      ${navLink('clientes','Clientes','/clientes.html','<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>')}
      ${navLink('tickets','Tickets','/tickets.html','<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>')}
      <div style="height:1px;background:rgba(255,255,255,.05);margin:8px 4px;"></div>
      ${navLink('licencas','Licenças','/licencas.html','<path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>')}
    </nav>
    <div style="padding:10px 8px;border-top:1px solid rgba(255,255,255,.05);">
      <div id="sb-online" style="display:none;align-items:center;gap:6px;padding:7px 12px;margin-bottom:8px;border-radius:8px;background:rgba(34,197,94,.06);border:1px solid rgba(34,197,94,.12);">
        <span style="width:5px;height:5px;border-radius:50%;background:#22c55e;flex-shrink:0;box-shadow:0 0 5px rgba(34,197,94,.6);"></span>
        <span id="sb-online-n" style="font-size:11px;font-weight:700;color:#4ade80;"></span>
      </div>
      <button id="sb-guia" onclick="abrirTutorial()" style="width:100%;display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:none;border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.3);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:8px;transition:all .12s;" onmouseover="this.style.background='rgba(255,255,255,.05)';this.style.color='rgba(255,255,255,.7)'" onmouseout="this.style.background='none';this.style.color='rgba(255,255,255,.3)'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Guia de uso
      </button>
      <button id="btn-sair" style="width:100%;display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:none;border:1px solid rgba(239,68,68,.15);color:rgba(248,113,113,.65);font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .12s;" onmouseover="this.style.background='rgba(239,68,68,.07)';this.style.color='#f87171'" onmouseout="this.style.background='none';this.style.color='rgba(248,113,113,.65)'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sair
      </button>
    </div>`

  document.getElementById('btn-sair')?.addEventListener('click', () => {
    localStorage.removeItem('central_token'); window.location.href = '/login.html'
  })

  _setupTour()
}

function setSidebarOnline(n) {
  const el=document.getElementById('sb-online'), txt=document.getElementById('sb-online-n')
  if(!el||!txt) return
  el.style.display = n>0?'flex':'none'
  txt.textContent = `${n} online agora`
}

// ── Guided Tour ───────────────────────────────────────────────────────────────
const _TOUR = [
  { sel:null, page:null, pos:'center',
    title:'Bem-vindo ao Painel Central',
    text:'Este é o centro de controle de todos os seus clientes PDV. Em menos de 2 minutos você vai conhecer cada seção e o fluxo completo de trabalho.' },
  { sel:'.stats-grid', page:'/index.html', pos:'bottom',
    title:'Dashboard — KPIs em tempo real',
    text:'Estes 4 cartões mostram um resumo geral: total de clientes, quantos estão online agora, faturamento consolidado do dia e tickets de suporte aguardando atenção.' },
  { sel:'.dash-grid', page:'/index.html', pos:'top',
    title:'Atividade recente e tickets abertos',
    text:'À esquerda: todos os clientes ordenados por atividade, com status de caixa, último sync e dias de licença. À direita: tickets abertos priorizados por urgência.' },
  { sel:'#sidebar a[href="/clientes.html"]', page:'/index.html', pos:'right',
    title:'Módulo Clientes',
    text:'Aqui você cadastra e gerencia cada instalação PDV. Clique para acessar a lista completa de clientes com busca e filtros por status.' },
  { sel:'button.btn-primary', page:'/clientes.html', pos:'bottom',
    title:'Cadastrar novo cliente',
    text:'Este botão abre o formulário de cadastro. Após criar o cliente, o sistema gera automaticamente o token de sincronização que deve ser configurado no PDV.' },
  { sel:'.card', page:'/clientes.html', pos:'top',
    title:'Tabela de clientes',
    text:'Clique em qualquer linha para abrir a ficha completa do cliente, com abas de Geral, Contrato, Tickets, Licença e Sincronização. As colunas mostram CNPJ, status, dias de licença e último heartbeat.' },
  { sel:'#sidebar a[href="/licencas.html"]', page:'/clientes.html', pos:'right',
    title:'Módulo Licenças',
    text:'Visão global de todas as licenças — quem está vencendo, quem já venceu e quem não tem licença. Aqui você gera e renova chaves sem precisar abrir a ficha de cada cliente.' },
  { sel:'.stats-row', page:'/licencas.html', pos:'bottom',
    title:'Resumo de vencimentos',
    text:'Distribuição rápida: ativas, a vencer em 7 dias (urgentes), a vencer em 30 dias e já vencidas. Use estes números para priorizar quem contatar primeiro.' },
  { sel:'#filter-tabs', page:'/licencas.html', pos:'bottom',
    title:'Filtros de vencimento',
    text:'Filtre a tabela por urgência. "Urgentes" mostra clientes a ≤7 dias de perder o acesso. A tabela é ordenada automaticamente — quem vence antes aparece no topo.' },
  { sel:'.page-tabs', page:'/licencas.html', pos:'bottom',
    title:'Ativação Remota',
    text:'Na segunda aba você ativa o PDV de qualquer lugar sem precisar do operador. Informe o endereço do PDV, cole a chave e confirme — o sistema aplica a licença em segundos.' },
  { sel:'#sidebar a[href="/tickets.html"]', page:'/licencas.html', pos:'right',
    title:'Módulo Tickets',
    text:'Central de suporte: registre chamados com tipo, prioridade (baixa → urgente) e acompanhe a resolução. Tickets urgentes aparecem em destaque no Dashboard também.' },
  { sel:'.stats-row', page:'/tickets.html', pos:'bottom',
    title:'Painel de tickets',
    text:'Abertos, em andamento, urgentes e resolvidos — tudo visível de imediato. Clique no nome do cliente em cada ticket para ir diretamente à aba de tickets da ficha dele.' },
  { sel:'#sb-guia', page:'/tickets.html', pos:'right',
    title:'Guia sempre disponível',
    text:'Este tour pode ser acessado a qualquer momento pelo botão "Guia de uso" no rodapé do menu lateral. Isso conclui o guia — bom trabalho!' },
]

function _setupTour() {
  if (document.getElementById('_t_spot')) return

  const spot = document.createElement('div')
  spot.id = '_t_spot'
  spot.style.cssText = 'display:none;position:fixed;z-index:2000;pointer-events:none;border-radius:8px;transition:left .2s,top .2s,width .2s,height .2s;'
  document.body.appendChild(spot)

  const tip = document.createElement('div')
  tip.id = '_t_tip'
  tip.style.cssText = 'display:none;position:fixed;z-index:2001;width:380px;background:#18181b;border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 32px 80px rgba(0,0,0,.8);padding:24px;font-family:inherit;opacity:0;transition:opacity .18s ease;'
  document.body.appendChild(tip)

  const saved = parseInt(sessionStorage.getItem('_t_step') ?? '-1')
  if (saved >= 0 && saved < _TOUR.length) {
    setTimeout(() => _renderTourStep(saved), 750)
  } else if (!localStorage.getItem('central_tutorial_visto')) {
    setTimeout(() => _renderTourStep(0), 450)
  }
}

function abrirTutorial() {
  if (!document.getElementById('_t_spot')) _setupTour()
  sessionStorage.setItem('_t_step', '0')
  _renderTourStep(0)
}

function fecharTutorial() {
  const spot = document.getElementById('_t_spot')
  const tip  = document.getElementById('_t_tip')
  if (spot) spot.style.display = 'none'
  if (tip)  { tip.style.opacity = '0'; tip.style.display = 'none' }
  sessionStorage.removeItem('_t_step')
  localStorage.setItem('central_tutorial_visto', '1')
}

function _tourNav(dir) {
  const cur  = parseInt(sessionStorage.getItem('_t_step') || '0')
  const next = Math.max(0, Math.min(_TOUR.length - 1, cur + dir))
  if (next === cur && dir > 0) { fecharTutorial(); return }
  const step = _TOUR[next]
  if (step.page && step.page !== location.pathname) {
    sessionStorage.setItem('_t_step', String(next))
    location.href = step.page
  } else {
    _renderTourStep(next)
  }
}

function _renderTourStep(n) {
  sessionStorage.setItem('_t_step', String(n))
  const step = _TOUR[n]
  const spot = document.getElementById('_t_spot')
  const tip  = document.getElementById('_t_tip')
  if (!spot || !tip) return

  const total = _TOUR.length
  const first = n === 0
  const last  = n === total - 1

  const dots = _TOUR.map((_,i) =>
    `<span style="display:inline-block;width:${i===n?16:4}px;height:4px;border-radius:99px;background:${i===n?'#f97316':'rgba(255,255,255,.15)'};transition:all .2s;"></span>`
  ).join('')

  tip.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.22);">Passo ${n+1} de ${total}</span>
      <button onclick="fecharTutorial()" style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,.22);font-size:17px;font-weight:700;line-height:1;padding:2px 5px;border-radius:6px;transition:all .1s;" onmouseover="this.style.color='#fff';this.style.background='rgba(255,255,255,.07)'" onmouseout="this.style.color='rgba(255,255,255,.22)';this.style.background='none'">✕</button>
    </div>
    <h3 style="font-size:15px;font-weight:900;color:#fff;letter-spacing:-.3px;margin-bottom:10px;line-height:1.35;">${step.title}</h3>
    <p style="font-size:13px;color:rgba(255,255,255,.52);line-height:1.75;margin-bottom:20px;">${step.text}</p>
    <div style="display:flex;gap:8px;align-items:center;">
      ${!first
        ? `<button onclick="_tourNav(-1)" style="flex-shrink:0;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.5);border-radius:10px;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .12s;" onmouseover="this.style.background='rgba(255,255,255,.13)';this.style.color='rgba(255,255,255,.8)'" onmouseout="this.style.background='rgba(255,255,255,.07)';this.style.color='rgba(255,255,255,.5)'">← Anterior</button>`
        : `<div></div>`}
      <div style="flex:1;display:flex;gap:4px;justify-content:center;">${dots}</div>
      <button onclick="_tourNav(1)" style="flex-shrink:0;background:#f97316;border:none;color:#fff;border-radius:10px;padding:8px 18px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;transition:background .15s;" onmouseover="this.style.background='#ea580c'" onmouseout="this.style.background='#f97316'">${last ? 'Concluir ✓' : 'Próximo →'}</button>
    </div>`

  const showTip = () => {
    tip.style.display = 'block'
    requestAnimationFrame(() => { tip.style.opacity = '1' })
  }

  if (!step.sel) {
    spot.style.display  = 'none'
    tip.style.opacity   = '0'
    tip.style.transform = 'translate(-50%,-50%)'
    tip.style.left      = '50%'
    tip.style.top       = '50%'
    showTip()
    return
  }

  const el = document.querySelector(step.sel)
  if (!el) {
    spot.style.display  = 'none'
    tip.style.opacity   = '0'
    tip.style.transform = 'translate(-50%,-50%)'
    tip.style.left      = '50%'
    tip.style.top       = '50%'
    showTip()
    return
  }

  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

  requestAnimationFrame(() => {
    const r   = el.getBoundingClientRect()
    const PAD = 8, TW = 380, TH = 260, GAP = 16
    const vw  = window.innerWidth, vh = window.innerHeight
    const elH = Math.max(r.height, 32)

    spot.style.display       = 'block'
    spot.style.left          = (r.left   - PAD) + 'px'
    spot.style.top           = (r.top    - PAD) + 'px'
    spot.style.width         = (r.width  + PAD * 2) + 'px'
    spot.style.height        = (elH + PAD * 2) + 'px'
    spot.style.boxShadow     = '0 0 0 9999px rgba(0,0,0,.74)'
    spot.style.outline       = '2px solid rgba(249,115,22,.65)'
    spot.style.outlineOffset = '0px'

    let tl, tt
    tip.style.opacity   = '0'
    tip.style.transform = 'none'

    if (step.pos === 'right') {
      tl = r.right + GAP
      tt = r.top + elH / 2 - TH / 2
    } else if (step.pos === 'left') {
      tl = r.left - TW - GAP
      tt = r.top + elH / 2 - TH / 2
    } else if (step.pos === 'bottom') {
      tl = r.left + r.width / 2 - TW / 2
      tt = r.bottom + GAP
    } else {
      tl = r.left + r.width / 2 - TW / 2
      tt = r.top - TH - GAP
    }

    tl = Math.max(12, Math.min(tl, vw - TW - 12))
    tt = Math.max(12, Math.min(tt, vh - TH - 12))

    tip.style.left = tl + 'px'
    tip.style.top  = tt + 'px'
    showTip()
  })
}
