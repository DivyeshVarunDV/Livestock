import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.treatment.deleteMany({});
  await prisma.vaccination.deleteMany({});
  await prisma.healthRecord.deleteMany({});
  await prisma.animal.deleteMany({});
  await prisma.farm.deleteMany({});
  await prisma.mrlRule.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding users...');
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@livestocare.local',
      passwordHash: await bcrypt.hash('Admin@12345', 10),
      name: 'System Administrator',
      role: 'ADMIN',
    },
  });

  const vet = await prisma.user.create({
    data: {
      email: 'vet@livestocare.local',
      passwordHash: await bcrypt.hash('Vet@12345', 10),
      name: 'Dr. LivestoCare Veterinarian',
      role: 'VETERINARIAN',
    },
  });

  const farmer = await prisma.user.create({
    data: {
      email: 'farmer@agrishield.com',
      passwordHash,
      name: 'John Miller',
      role: 'FARMER',
    },
  });

  console.log('Seeding farms...');
  const farm1 = await prisma.farm.create({
    data: {
      name: 'Green Meadows Farm',
      ownerId: farmer.id,
      ownerName: farmer.name,
      address: '102 Rural Route 4, Greenfield',
      contactNumber: '+1-555-0199',
      location: '45.3842, -75.6981',
    },
  });

  const farm2 = await prisma.farm.create({
    data: {
      name: 'Sunrise Dairies',
      ownerId: farmer.id,
      ownerName: farmer.name,
      address: '405 Valley Road, Sunrise Crest',
      contactNumber: '+1-555-0244',
      location: '45.4215, -75.6972',
    },
  });

  console.log('Seeding MRL rules...');
  await prisma.mrlRule.createMany({
    data: [
      { drugName: 'Penicillin G', species: 'CATTLE', withdrawalPeriod: 5, mrlLimit: '50 ug/kg' },
      { drugName: 'Tetracycline', species: 'CATTLE', withdrawalPeriod: 14, mrlLimit: '100 ug/kg' },
      { drugName: 'Ivermectin', species: 'SHEEP', withdrawalPeriod: 28, mrlLimit: '10 ug/kg' },
      { drugName: 'Amoxicillin', species: 'PIG', withdrawalPeriod: 10, mrlLimit: '50 ug/kg' },
    ],
  });

  console.log('Seeding animals...');
  const now = new Date();

  // Helper to subtract days
  const subDays = (date: Date, days: number) => {
    const res = new Date(date);
    res.setDate(res.getDate() - days);
    return res;
  };

  // Helper to add days
  const addDays = (date: Date, days: number) => {
    const res = new Date(date);
    res.setDate(res.getDate() + days);
    return res;
  };

  // Animal 1: Cow with active treatment (DO NOT SELL)
  const cow1 = await prisma.animal.create({
    data: {
      tagNumber: 'IND-492-B',
      name: 'Daisy',
      species: 'CATTLE',
      breed: 'Holstein',
      gender: 'FEMALE',
      age: 28,
      weight: 580,
      status: 'UNDER_TREATMENT',
      mrlStatus: 'DO_NOT_SELL',
      farmId: farm1.id,
    },
  });

  // Animal 2: Cow clearing soon
  const cow2 = await prisma.animal.create({
    data: {
      tagNumber: 'IND-811-A',
      name: 'Bella',
      species: 'CATTLE',
      breed: 'Jersey',
      gender: 'FEMALE',
      age: 32,
      weight: 490,
      status: 'UNDER_TREATMENT',
      mrlStatus: 'CLEARING_SOON',
      farmId: farm1.id,
    },
  });

  // Animal 3: Cleared Pig
  const pig1 = await prisma.animal.create({
    data: {
      tagNumber: 'IND-322-C',
      name: 'Penny',
      species: 'PIG',
      breed: 'Duroc',
      gender: 'FEMALE',
      age: 8,
      weight: 110,
      status: 'HEALTHY',
      mrlStatus: 'CLEARED',
      farmId: farm2.id,
    },
  });

  // Animal 4: Healthy Sheep
  const sheep1 = await prisma.animal.create({
    data: {
      tagNumber: 'IND-105-D',
      name: 'Shaun',
      species: 'SHEEP',
      breed: 'Merino',
      gender: 'MALE',
      age: 18,
      weight: 75,
      status: 'HEALTHY',
      mrlStatus: 'CLEARED',
      farmId: farm2.id,
    },
  });

  // Animal 5: Healthy Goat
  const goat1 = await prisma.animal.create({
    data: {
      tagNumber: 'IND-208-E',
      name: 'Sheru',
      species: 'GOAT',
      breed: 'Beetal',
      gender: 'MALE',
      age: 14,
      weight: 45,
      status: 'HEALTHY',
      mrlStatus: 'CLEARED',
      farmId: farm1.id,
    },
  });

  console.log('Seeding health records...');
  await prisma.healthRecord.createMany({
    data: [
      {
        animalId: cow1.id,
        diseases: 'Mastitis',
        diagnosis: 'Bovine mastitis in rear right quarter',
        treatmentNotes: 'Prescribed Penicillin course, daily cleaning',
        veterinarianId: vet.id,
        veterinarianName: vet.name,
        date: subDays(now, 2),
      },
      {
        animalId: cow2.id,
        diseases: 'Foot Rot',
        diagnosis: 'Mild lameness, interdigital necrobacillosis',
        treatmentNotes: 'Cleaned hoof, administered Tetracycline injection',
        veterinarianId: vet.id,
        veterinarianName: vet.name,
        date: subDays(now, 12),
      },
    ],
  });

  console.log('Seeding vaccinations...');
  await prisma.vaccination.createMany({
    data: [
      {
        animalId: cow1.id,
        vaccineName: 'Bovi-Shield GOLD FP 5L5',
        vaccinationDate: subDays(now, 180),
        nextDueDate: addDays(now, 180),
        veterinarianId: vet.id,
        veterinarianName: vet.name,
      },
      {
        animalId: cow2.id,
        vaccineName: 'Bovi-Shield GOLD FP 5L5',
        vaccinationDate: subDays(now, 350),
        nextDueDate: addDays(now, 15), // Upcoming soon
        veterinarianId: vet.id,
        veterinarianName: vet.name,
      },
      {
        animalId: pig1.id,
        vaccineName: 'FarrowSure GOLD',
        vaccinationDate: subDays(now, 90),
        nextDueDate: addDays(now, 90),
        veterinarianId: vet.id,
        veterinarianName: vet.name,
      },
    ],
  });

  console.log('Seeding treatments...');
  // Daisy - Penicillin administered 2 days ago, withdrawal 5 days -> completion in 3 days (DO NOT SELL)
  await prisma.treatment.create({
    data: {
      animalId: cow1.id,
      drugName: 'Penicillin G',
      dosage: '10 mL IM',
      administrationDate: subDays(now, 2),
      withdrawalPeriod: 5,
      withdrawalCompletionDate: addDays(subDays(now, 2), 5),
      veterinarianId: vet.id,
      veterinarianName: vet.name,
    },
  });

  // Bella - Tetracycline administered 12 days ago, withdrawal 14 days -> completion in 2 days (CLEARING SOON)
  await prisma.treatment.create({
    data: {
      animalId: cow2.id,
      drugName: 'Tetracycline',
      dosage: '20 mL SQ',
      administrationDate: subDays(now, 12),
      withdrawalPeriod: 14,
      withdrawalCompletionDate: addDays(subDays(now, 12), 14),
      veterinarianId: vet.id,
      veterinarianName: vet.name,
    },
  });

  // Penny - Amoxicillin administered 20 days ago, withdrawal 10 days -> completion 10 days ago (CLEARED)
  await prisma.treatment.create({
    data: {
      animalId: pig1.id,
      drugName: 'Amoxicillin',
      dosage: '5 mL IM',
      administrationDate: subDays(now, 20),
      withdrawalPeriod: 10,
      withdrawalCompletionDate: addDays(subDays(now, 20), 10),
      veterinarianId: vet.id,
      veterinarianName: vet.name,
    },
  });

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
