const { PrismaClient } = require('../../../backend/node_modules/@prisma/client')

const prisma = new PrismaClient()

module.exports = { prisma }
