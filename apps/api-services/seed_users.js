
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('Admin@12345', 10);
  const vetPassword = await bcrypt.hash('Vet@12345', 10);
  const testerPassword = await bcrypt.hash('Tester@12345', 10);

  await prisma.user.upsert({
    where: { email: 'admin@livestocare.local' },
    update: {},
    create: {
      email: 'admin@livestocare.local',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      status: 'ACTIVE'
    }
  });

  await prisma.user.upsert({
    where: { email: 'vet@livestocare.local' },
    update: {},
    create: {
      email: 'vet@livestocare.local',
      passwordHash: vetPassword,
      name: 'Vet User',
      role: 'VETERINARIAN',
      status: 'ACTIVE'
    }
  });

  await prisma.user.upsert({
    where: { email: 'tester@livestocare.local' },
    update: {},
    create: {
      email: 'tester@livestocare.local',
      passwordHash: testerPassword,
      name: 'Tester User',
      role: 'TESTER',
      status: 'ACTIVE'
    }
  });

  console.log('Seed completed!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

