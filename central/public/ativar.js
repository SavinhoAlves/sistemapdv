// Copia texto pro clipboard e dá feedback visual sem perder ícones/HTML
// do botão (troca só o texto por "Copiado!" por 2s, depois restaura).
function copiarTexto(texto, btn) {
  navigator.clipboard.writeText(texto || '')
  const htmlOriginal = btn.innerHTML
  btn.textContent = 'Copiado!'
  btn.classList.add('bg-green-600', 'hover:bg-green-600', 'text-white', 'border-transparent')
  setTimeout(() => {
    btn.innerHTML = htmlOriginal
    btn.classList.remove('bg-green-600', 'hover:bg-green-600', 'text-white', 'border-transparent')
  }, 2000)
}

// Compartilhado entre index.html e gerador.html — chama /api/sistema/ativar
// direto no backend da instalação alvo (não passa pelo painel central).
// Público de propósito: instalação nova ainda não tem admin logado.
async function ativarLicencaRemota(url, chave, btn) {
  let urlLimpa = String(url || '').trim().replace(/\/$/, '')
  if (!urlLimpa) { alert('Informe o endereço do backend da instalação'); return false }
  if (!chave)    { alert('Nenhuma chave para ativar'); return false }

  // Sem protocolo, o navegador trata como caminho relativo do próprio
  // painel central em vez de um endereço externo — completa sozinho
  // (as instalações rodam https por padrão, via mkcert)
  if (!/^https?:\/\//i.test(urlLimpa)) {
    urlLimpa = `https://${urlLimpa}`
  }

  // Mixed content: painel em https não consegue chamar backend http — o
  // navegador bloqueia antes de a requisição sair e cai no catch como se
  // fosse falha de rede. Detecta aqui pra dar a dica certa em vez da genérica.
  if (location.protocol === 'https:' && /^http:\/\//i.test(urlLimpa)) {
    alert('Este painel está em HTTPS e o endereço informado é HTTP — o navegador bloqueia essa mistura. Use https:// no endereço da instalação.')
    return false
  }

  // Sem rede nenhuma nem adianta tentar (o catch abaixo não distingue isso).
  if (navigator.onLine === false) {
    alert('Este computador está sem conexão de rede. Verifique o Wi-Fi/cabo e tente de novo.')
    return false
  }

  const htmlOriginal = btn.innerHTML
  btn.disabled = true
  btn.textContent = 'Ativando...'

  // fetch não desiste sozinho: sem timeout, um IP errado ou porta bloqueada
  // deixa o botão travado em "Ativando..." por muito tempo. Aborta em 8s.
  const controle = new AbortController()
  const limite = setTimeout(() => controle.abort(), 8000)
  try {
    const resp = await fetch(`${urlLimpa}/api/sistema/ativar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave }),
      signal: controle.signal
    })
    const dados = await resp.json().catch(() => ({}))
    // O backend /api/sistema/ativar responde o motivo em `message`; alguns
    // outros erros usam `error`. Sem cobrir os dois, um 400 vira "Erro ao
    // ativar" genérico e esconde a causa real (ex.: "Chave inválida").
    if (!resp.ok) { alert(dados.message || dados.error || 'Erro ao ativar'); return false }
    alert('Sistema ativado com sucesso!')
    return true
  } catch (e) {
    if (e.name === 'AbortError') {
      // Passou dos 8s sem resposta: o servidor sequer respondeu. Quase sempre
      // IP errado/desatualizado (a instalação usa IP dinâmico) ou firewall.
      alert(`O endereço ${urlLimpa} não respondeu a tempo.\n\nProvável IP errado ou desatualizado (a instalação usa IP dinâmico) ou firewall bloqueando a porta. Confira o IP atual na máquina da instalação.`)
    } else {
      // TypeError "Failed to fetch": o navegador não revela se foi TLS, DNS,
      // conexão recusada ou CORS. A causa nº1 aqui é o certificado mkcert não
      // confiável neste PC — por isso a dica de abrir o endereço direto.
      alert(`Não foi possível conectar em ${urlLimpa}.\n\nCausas comuns:\n• Certificado não confiável neste computador (instale o CA do mkcert)\n• Este computador não está na mesma rede da instalação\n• Backend fora do ar\n\nTeste abrindo o endereço direto no navegador:\n${urlLimpa}/api/sistema/ativar`)
    }
    return false
  } finally {
    clearTimeout(limite)
    btn.disabled = false
    btn.innerHTML = htmlOriginal
  }
}
