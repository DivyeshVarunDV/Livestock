import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.violation.deleteMany({});
  await prisma.milkTest.deleteMany({});
  await prisma.milkCollection.deleteMany({});
  await prisma.ownershipTransfer.deleteMany({});
  await prisma.withdrawalRecord.deleteMany({});
  await prisma.amuRecord.deleteMany({});
  await prisma.treatment.deleteMany({});
  await prisma.vaccination.deleteMany({});
  await prisma.healthRecord.deleteMany({});
  await prisma.animal.deleteMany({});
  await prisma.farm.deleteMany({});
  await prisma.mrlRule.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.prescription.deleteMany({});
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

  const tester = await prisma.user.create({
    data: {
      email: 'tester@livestocare.local',
      passwordHash: await bcrypt.hash('Tester@12345', 10),
      name: 'Testing Officer',
      role: 'TESTER',
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
      farmerId: 'FARM001',
      ownerId: farmer.id,
      ownerName: farmer.name,
      fullName: 'John Miller',
      mobileNumber: '+1-555-0199',
      governmentId: 'AP-FARM-001',
      address: '102 Rural Route 4, Greenfield',
      village: 'Greenfield',
      district: 'Krishna',
      state: 'Andhra Pradesh',
      contactNumber: '+1-555-0199',
      location: '45.3842, -75.6981',
      status: 'ACTIVE',
    },
  });

  const farm2 = await prisma.farm.create({
    data: {
      name: 'Sunrise Dairies',
      farmerId: 'FARM002',
      ownerId: farmer.id,
      ownerName: farmer.name,
      fullName: 'John Miller',
      mobileNumber: '+1-555-0244',
      governmentId: 'AP-FARM-002',
      address: '405 Valley Road, Sunrise Crest',
      village: 'Sunrise Crest',
      district: 'Guntur',
      state: 'Andhra Pradesh',
      contactNumber: '+1-555-0244',
      location: '45.4215, -75.6972',
      status: 'ACTIVE',
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
  const subDays = (date: Date, days: number) => {
    const res = new Date(date);
    res.setDate(res.getDate() - days);
    return res;
  };
  const addDays = (date: Date, days: number) => {
    const res = new Date(date);
    res.setDate(res.getDate() + days);
    return res;
  };

  const cow1 = await prisma.animal.create({
    data: {
      animalCode: 'COW001',
      tagNumber: 'IND-492-B',
      name: 'Daisy',
      species: 'CATTLE',
      breed: 'Holstein',
      gender: 'FEMALE',
      age: 28,
      weight: 580,
      color: 'Black & White',
      identificationMark: 'Right ear notch',
      currentStatus: 'ACTIVE',
      status: 'UNDER_TREATMENT',
      mrlStatus: 'DO_NOT_SELL',
      farmId: farm1.id,
    },
  });

  const cow2 = await prisma.animal.create({
    data: {
      animalCode: 'COW002',
      tagNumber: 'IND-811-A',
      name: 'Bella',
      species: 'CATTLE',
      breed: 'Jersey',
      gender: 'FEMALE',
      age: 32,
      weight: 490,
      color: 'Brown',
      currentStatus: 'ACTIVE',
      status: 'UNDER_TREATMENT',
      mrlStatus: 'CLEARING_SOON',
      farmId: farm1.id,
    },
  });

  const cow3 = await prisma.animal.create({
    data: {
      animalCode: 'COW003',
      tagNumber: 'IND-322-C',
      name: 'Luna',
      species: 'CATTLE',
      breed: 'Gir',
      gender: 'FEMALE',
      age: 24,
      weight: 430,
      color: 'Red',
      currentStatus: 'ACTIVE',
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
        recordCode: 'HR001',
        diseases: 'Mastitis',
        symptoms: 'Swelling and reduced milk yield',
        diagnosis: 'Bovine mastitis in rear right quarter',
        treatment: 'Penicillin course',
        medicine: 'Penicillin G',
        treatmentNotes: 'Prescribed Penicillin course, daily cleaning',
        veterinarianId: vet.id,
        veterinarianName: vet.name,
        date: subDays(now, 2),
      },
      {
        animalId: cow2.id,
        recordCode: 'HR002',
        diseases: 'Foot Rot',
        symptoms: 'Lameness',
        diagnosis: 'Mild lameness, interdigital necrobacillosis',
        treatment: 'Tetracycline injection',
        medicine: 'Tetracycline',
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
        vaccinationCode: 'VAC001',
        vaccineName: 'Bovi-Shield GOLD FP 5L5',
        vaccinationDate: subDays(now, 180),
        nextDueDate: addDays(now, 180),
        veterinarianId: vet.id,
        veterinarianName: vet.name,
      },
      {
        animalId: cow2.id,
        vaccinationCode: 'VAC002',
        vaccineName: 'Bovi-Shield GOLD FP 5L5',
        vaccinationDate: subDays(now, 350),
        nextDueDate: addDays(now, 15),
        veterinarianId: vet.id,
        veterinarianName: vet.name,
      },
      {
        animalId: cow3.id,
        vaccinationCode: 'VAC003',
        vaccineName: 'Bovi-Shield GOLD FP 5L5',
        vaccinationDate: subDays(now, 90),
        nextDueDate: addDays(now, 270),
        veterinarianId: vet.id,
        veterinarianName: vet.name,
      },
    ],
  });

  console.log('Seeding treatments and withdrawals...');
  const treatment1 = await prisma.treatment.create({
    data: {
      animalId: cow1.id,
      disease: 'Mastitis',
      drugName: 'Penicillin G',
      activeIngredient: 'Penicillin',
      dosage: '10 mL IM',
      route: 'IM',
      reason: 'Mastitis treatment',
      treatmentStartDate: subDays(now, 2),
      administrationDate: subDays(now, 2),
      withdrawalPeriod: 5,
      withdrawalCompletionDate: addDays(subDays(now, 2), 5),
      veterinarianId: vet.id,
      veterinarianName: vet.name,
    },
  });

  const treatment2 = await prisma.treatment.create({
    data: {
      animalId: cow2.id,
      disease: 'Foot Rot',
      drugName: 'Tetracycline',
      activeIngredient: 'Oxytetracycline',
      dosage: '20 mL SQ',
      route: 'SQ',
      reason: 'Foot rot treatment',
      treatmentStartDate: subDays(now, 12),
      administrationDate: subDays(now, 12),
      withdrawalPeriod: 14,
      withdrawalCompletionDate: addDays(subDays(now, 12), 14),
      veterinarianId: vet.id,
      veterinarianName: vet.name,
    },
  });

  await prisma.withdrawalRecord.createMany({
    data: [
      {
        withdrawalCode: 'WD001',
        treatmentId: treatment1.id,
        animalId: cow1.id,
        productType: 'MILK',
        medicine: 'Penicillin G',
        treatmentDate: subDays(now, 2),
        withdrawalPeriod: 5,
        withdrawalEndDate: addDays(subDays(now, 2), 5),
        status: 'RESTRICTED',
      },
      {
        withdrawalCode: 'WD002',
        treatmentId: treatment2.id,
        animalId: cow2.id,
        productType: 'MILK',
        medicine: 'Tetracycline',
        treatmentDate: subDays(now, 12),
        withdrawalPeriod: 14,
        withdrawalEndDate: addDays(subDays(now, 12), 14),
        status: 'RESTRICTED',
      },
    ],
  });

  await prisma.amuRecord.createMany({
    data: [
      {
        amuCode: 'AMU001',
        animalId: cow1.id,
        treatmentId: treatment1.id,
        medicine: 'Penicillin G',
        activeIngredient: 'Penicillin',
        dosage: '10 mL IM',
        route: 'IM',
        startDate: subDays(now, 2),
        reason: 'Mastitis treatment',
        veterinarianId: vet.id,
        veterinarianName: vet.name,
      },
      {
        amuCode: 'AMU002',
        animalId: cow2.id,
        treatmentId: treatment2.id,
        medicine: 'Tetracycline',
        activeIngredient: 'Oxytetracycline',
        dosage: '20 mL SQ',
        route: 'SQ',
        startDate: subDays(now, 12),
        reason: 'Foot rot treatment',
        veterinarianId: vet.id,
        veterinarianName: vet.name,
      },
    ],
  });

  console.log('Seeding collection/testing/violation workflow...');
  const collection = await prisma.milkCollection.create({
    data: {
      collectionCode: 'COL001',
      farmId: farm1.id,
      animalId: cow3.id,
      sourceReference: 'FARM001-COW003',
      productType: 'MILK',
      quantity: 12,
      collectionDate: now,
      date: now,
      collectionCenter: 'Center A',
      batchId: 'BATCH1001',
    },
  });

  await prisma.milkTest.create({
    data: {
      batchId: 'BATCH1001',
      sampleId: 'SAMPLE001',
      productType: 'MILK',
      date: now,
      testDate: now,
      type: 'ANTIBIOTIC_RESIDUE',
      result: 'PENDING',
      location: 'District Lab',
      testingLocation: 'District Lab',
      recordedById: tester.id,
      recordedByName: tester.name,
    },
  });

  await prisma.ownershipTransfer.create({
    data: {
      transferCode: 'TRF001',
      animalId: cow3.id,
      currentOwnerId: farmer.id,
      newOwnerId: farmer.id,
      fromFarmId: farm1.id,
      toFarmId: farm2.id,
      requestDate: now,
      reason: 'Demonstration transfer request',
      status: 'PENDING',
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: vet.id,
      userName: vet.name,
      role: 'VETERINARIAN',
      action: 'Initial Livestock Seed Created',
      entity: 'SYSTEM',
      entityId: collection.id,
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
