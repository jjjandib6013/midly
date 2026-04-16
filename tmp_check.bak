import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function check() {
   const u = await p.user.findFirst({ where: { email: 'juan@midly.com' }, select: { wallet_balance: true, email: true } });
   console.log('User:', JSON.stringify(u));
   await p.$disconnect();
}
check();
