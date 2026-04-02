import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
   const adminPass = await bcrypt.hash('admin123', 10);
   const adminUser = await prisma.user.upsert({
      where: { email: 'admin@midly.com' },
      update: { 
         role: 'admin', 
         password_hash: adminPass 
      },
      create: {
         first_name: 'Midly',
         last_name: 'Admin',
         email: 'admin@midly.com',
         phone: '555-555-5555',
         password_hash: adminPass,
         role: 'admin',
         wallet_balance: 9999999
      }
   });
   console.log('Seeded Admin User successfully:', adminUser.email);
}

main()
   .catch(e => { console.error(e); process.exit(1); })
   .finally(async () => { await prisma.$disconnect(); });
