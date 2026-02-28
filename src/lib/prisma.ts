import { PrismaClient } from '@prisma/client'

function getDbUrl(): string {
  const url = process.env.DATABASE_URL || '';
  // Add pgbouncer=true for Neon pooler compatibility
  // This disables named prepared statements which cause "cached plan must not change result type" errors
  if (url.includes('-pooler.') && !url.includes('pgbouncer=true')) {
    const separator = url.includes('?') ? '&' : '?';
    return url + separator + 'pgbouncer=true';
  }
  return url;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: getDbUrl(),
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
