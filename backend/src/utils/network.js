const os = require('os')

const SKIP_IFACE = /virtual|vmware|vmnet|vbox|hyper.v|wsl|loopback|bluetooth|vethernet/i

function getLocalIps() {
  const nets = os.networkInterfaces()
  const candidates = []
  for (const [name, addrs] of Object.entries(nets)) {
    if (SKIP_IFACE.test(name)) continue
    for (const net of addrs) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
        candidates.push(net.address)
      }
    }
  }
  candidates.sort((a, b) => {
    const score = (ip) => ip.startsWith('192.168') ? 0 : ip.startsWith('10.') ? 1 : 2
    return score(a) - score(b)
  })
  return candidates
}

module.exports = { getLocalIps }
