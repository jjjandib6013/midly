const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
    const u = await prisma.user.findUnique({where: {email: 'jokernoblesse@gmail.com'}}); 
    if(!u) return; 
    
    const kyc = await prisma.kycVerification.findUnique({where: {user_id: u.user_id}}); 
    if(!kyc) return; 
    
    await prisma.kycImage.deleteMany({where: {kyc_id: kyc.kyc_id}}); 
    console.log('Deleted ghost images'); 
} 

main().finally(() => prisma.$disconnect());
