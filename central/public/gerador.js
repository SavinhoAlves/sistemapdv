const token = localStorage.getItem('central_token')
if (!token) window.location.href = '/login.html'

document.getElementById('btn-sair').addEventListener('click', () => {
  localStorage.removeItem('central_token')
  window.location.href = '/login.html'
})

// Ativa direto no backend de uma instalação, colando a chave gerada na
// tela de clientes. ativarLicencaRemota está em ativar.js, compartilhada
// com app.js (mesma lógica usada na criação de cliente e na renovação de
// licença) — /api/sistema/ativar é público de propósito (instalação nova
// ainda não tem nenhum admin logado).

document.getElementById('btn-ativar').addEventListener('click', (e) => {
  const url   = document.getElementById('ativar-url').value
  const chave = document.getElementById('ativar-chave').value.trim()
  ativarLicencaRemota(url, chave, e.currentTarget)
})

if (window.lucide) lucide.createIcons()
