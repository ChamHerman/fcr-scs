import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'

const connectionString = 'postgresql://fcr_app:postgres@localhost:5432/fcr_scs?schema=public'

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const generateCaseId = (idx: number) => `CASE-2026-${String(idx).padStart(3, '0')}`;

const statuses = [
  'Approved', 
  'Bank Details Submitted', 
  'Transfer Initiated', 
  'Authorised', 
  'Paid', 
  'Failed', 
  'Transfer Rejected'
];

async function main() {
  console.log('Seeding dummy data...');

  const users = [
    { name: 'Ahmad bin Abu', bank: 'Maybank', account: '1234567890' },
    { name: 'Lee Chong Wei', bank: 'CIMB', account: '0987654321' },
    { name: 'Siti Nurhaliza', bank: 'Public Bank', account: '1122334455' },
    { name: 'Ravi Kumar', bank: 'RHB', account: '5566778899' },
    { name: 'Wong Choong Hann', bank: 'Hong Leong', account: '6677889900' }
  ];

  for (let i = 1; i <= 25; i++) {
    const caseId = generateCaseId(i);
    const user = users[i % users.length];
    const status = statuses[i % statuses.length];
    const amount = (Math.floor(Math.random() * 50) + 1) * 10000;
    
    let currentSignatures = 0;
    let requiredSignatures = 1 + Math.floor(amount / 1000000);

    if (status === 'Transfer Initiated' || status === 'Authorised' || status === 'Paid' || status === 'Failed') {
      currentSignatures = 1;
    }
    if (status === 'Paid') {
      currentSignatures = requiredSignatures;
    }

    const pc = await prisma.paymentCase.upsert({
      where: { caseId },
      update: {
        status,
        currentSignatures,
        amount
      },
      create: {
        caseId,
        beneficiaryId: `BEN-${String(i).padStart(3, '0')}`,
        amount,
        bankName: user.bank,
        accountNumber: user.account,
        accountHolderName: user.name,
        phoneNumber: '012-3456789',
        myKadNumber: '900101-14-1234',
        status,
        requiredSignatures,
        currentSignatures,
      },
    });

    if (status === 'Transfer Initiated' || status === 'Authorised' || status === 'Paid') {
      const existingAuth = await prisma.paymentAuthorisation.findFirst({
        where: { paymentCaseId: pc.id, action: "initiate" }
      });
      if (!existingAuth) {
        await prisma.paymentAuthorisation.create({
          data: {
            paymentCaseId: pc.id,
            adminId: "admin-initiator",
            action: "initiate",
          }
        });
      }
    }

    if (status === 'Failed') {
      const existingFail = await prisma.failedTransaction.findFirst({
        where: { paymentCaseId: pc.id }
      });
      if (!existingFail) {
        await prisma.failedTransaction.create({
          data: {
            paymentCaseId: pc.id,
            errorLog: 'Insufficient funds in the master holding account or connection timeout.',
          }
        });
      }
    }

    if (status === 'Paid' || i % 5 === 0) {
      await prisma.blockchainRecord.upsert({
        where: { caseId },
        update: {},
        create: {
          caseId,
          documentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          transactionHash: `0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890${String(i).padStart(4, '0')}`,
          status: i % 10 === 0 ? 'Voided' : 'Published'
        },
      });
    }

    console.log(`Created/Updated Case: ${caseId} (${status})`);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
