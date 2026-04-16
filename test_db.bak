import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany();
  console.log('Database users:', users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
