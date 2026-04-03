import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Clear existing data (optional, but good for reset)
  await prisma.message.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.kycImage.deleteMany();
  await prisma.kycVerification.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const userJuan = await prisma.user.create({
    data: {
      first_name: 'Juan',
      last_name: 'Dela Cruz',
      email: 'juan@midly.com', // Demo Log-in
      password_hash: passwordHash,
      phone: '+63 912 345 6789',
      reputation_score: 4.8,
      wallet_balance: 18450.00,
    },
  });

  const userSeller = await prisma.user.create({
    data: {
      first_name: 'Maria',
      last_name: 'Clara',
      email: 'maria@seller.com',
      password_hash: passwordHash,
      phone: '+63 999 888 7777',
      reputation_score: 4.9,
      wallet_balance: 5000.00,
    },
  });

  const adminAccount = await prisma.user.create({
    data: {
      first_name: 'Admin',
      last_name: 'Midly',
      email: 'admin@midly.com',
      password_hash: passwordHash,
      phone: '+63 999 000 1111',
      role: 'admin',
      reputation_score: 5.0,
      wallet_balance: 1000000.00,
    },
  });

  // 3. KYC Verification
  await prisma.kycVerification.create({
    data: {
      user_id: userJuan.user_id,
      id_type: 'Passport',
      id_number: 'P1234567A',
      id_name: 'JUAN DELA CRUZ',
      birthdate: new Date('1995-10-15'),
      status: 'verified',
    },
  });

  // 4. Create Transactions (Matching frontend mock data)
  // Trade 1095: Active Buy
  const tx1095 = await prisma.transaction.create({
    data: {
      buyer_id: userJuan.user_id,
      seller_id: userSeller.user_id,
      item_type: 'Valorant ASIA - Immortal Rank',
      game_type: 'VALORANT',
      agreed_price: 11904.76, // ~ +5% = 12500
      service_fee: 595.24,
      total_amount: 12500.00,
      status: 'active',
      inspection_hours: 24,
    },
  });

  await prisma.payment.create({
    data: {
      transaction_id: tx1095.transaction_id,
      amount: 12500.00,
      payment_method: 'GCash',
      vault_status: 'locked',
      deposit_date: new Date(),
    },
  });

  await prisma.message.createMany({
    data: [
      { transaction_id: tx1095.transaction_id, sender_id: userJuan.user_id, message_text: 'Secure Trade Room Initialized. MIDLY AI is monitoring this chat.', is_system_generated: true, risk_level: 'Safe'},
      { transaction_id: tx1095.transaction_id, sender_id: userSeller.user_id, message_text: 'Hi, I have locked the funds. Send the account details when ready.', is_system_generated: false, risk_level: 'Safe' },
      { transaction_id: tx1095.transaction_id, sender_id: userJuan.user_id, message_text: 'Awesome, I see the payment is secured. Sending info now.', is_system_generated: false, risk_level: 'Safe'}
    ],
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
