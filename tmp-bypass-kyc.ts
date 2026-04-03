import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Forcing KYC Approvals for testing accounts...');
  
  const emails = ['juan@midly.com', 'maria@seller.com'];
  
  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.kycVerification.upsert({
        where: { user_id: user.user_id },
        update: { status: 'approved' },
        create: {
          user_id: user.user_id,
          id_name: 'TEST ADMIN BYPASS',
          id_type: 'System Override',
          id_number: 'ADMIN-BYPASS',
          status: 'approved',
          birthdate: new Date('2000-01-01')
        }
      });
      console.log(`✅ KYC instantly approved for: ${email}`);
    } else {
      console.log(`❌ Account not found in database: ${email}`);
    }
  }
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
