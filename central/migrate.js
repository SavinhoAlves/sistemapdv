// Este arquivo era a migração MySQL da versão legada do painel central.
// A central agora usa PostgreSQL compartilhado com o backend via Prisma.
//
// Para criar/atualizar o banco de dados, execute no diretório backend/:
//   npx prisma migrate dev   (desenvolvimento)
//   npx prisma migrate deploy (produção)
//
// Para criar o primeiro administrador da plataforma, execute no diretório central/:
//   node seed-admin.js <email> <senha>

console.log('Use `npx prisma migrate dev` no diretório backend/ para gerenciar o schema.')
console.log('Use `node seed-admin.js <email> <senha>` para criar administradores.')
