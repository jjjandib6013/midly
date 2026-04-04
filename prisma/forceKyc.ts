import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Fetching non-admin users to force verify...");
    const users = await prisma.user.findMany({ where: { role: { not: 'admin' } } });
    let count = 0;

    for (const user of users) {
        await prisma.kycVerification.upsert({
            where: { user_id: user.user_id },
            update: { status: 'approved' },
            create: {
                user_id: user.user_id,
                id_type: 'Passport',
                id_number: `FORCE-VERIFIED-${user.user_id}`,
                id_name: `${user.first_name} ${user.last_name}`,
                birthdate: new Date('2000-01-01'),
                status: 'approved',
            }
        });
        count++;
    }
    console.log(`Successfully force-approved ${count} dummy accounts!`);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
