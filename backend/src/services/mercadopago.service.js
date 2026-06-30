const MP_BASE = 'https://api.mercadopago.com'

async function mpFetch(token, path, options = {}) {
  const res = await fetch(`${MP_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.message || data.error || `MP API error ${res.status}`
    throw new Error(msg)
  }
  return data
}

async function listarDispositivos(token) {
  return mpFetch(token, '/point/integration-api/devices')
}

async function criarIntencao(token, deviceId, { valor, tipo, descricao, referencia }) {
  const body = {
    amount: Math.round(Number(valor) * 100),
    description: descricao || 'Pagamento PDV',
    additional_info: {
      external_reference: referencia || `pdv-${Date.now()}`,
      print_on_terminal: true
    }
  }

  if (tipo === 'credito') {
    body.payment = { installments: 1, installments_cost: 'seller', type: 'credit_card' }
  } else if (tipo === 'debito') {
    body.payment = { installments: 1, installments_cost: 'seller', type: 'debit_card' }
  }
  // tipo 'pix' — terminal exibe QR Pix automaticamente sem o campo payment

  return mpFetch(token, `/point/integration-api/devices/${deviceId}/payment-intents`, {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

async function verificarIntencao(token, paymentIntentId) {
  return mpFetch(token, `/point/integration-api/payment-intents/${paymentIntentId}`)
}

async function cancelarIntencao(token, deviceId, paymentIntentId) {
  const res = await fetch(`${MP_BASE}/point/integration-api/devices/${deviceId}/payment-intents/${paymentIntentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return res.ok
}

module.exports = { listarDispositivos, criarIntencao, verificarIntencao, cancelarIntencao }
