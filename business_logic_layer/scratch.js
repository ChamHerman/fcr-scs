const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 1 });
  console.log('Latest user:', users[0]);
  const act = await prisma.accountActivation.findMany({ where: { userId: users[0]?.userId } });
  console.log('Activations:', act);
}
main().finally(() => prisma.$disconnect());
