import re

with open('apps/api-services/prisma/schema.prisma', 'r') as f:
    content = f.read()

# Add User relations
content = content.replace('farms        Farm[]', '''farms        Farm[]
  ownershipTransfersAsCurrent OwnershipTransfer[] @relation("CurrentOwner")
  ownershipTransfersAsNew     OwnershipTransfer[] @relation("NewOwner")''')

# Add Farm fields
content = content.replace('ownerName     String // Plain text name of the owner', '''ownerName     String // Plain text name of the owner
  farmerId      String?''')
content = content.replace('animals       Animal[]', '''animals       Animal[]
  milkTests     MilkTest[]
  violations    Violation[]
  ownershipTransfersAsFrom    OwnershipTransfer[] @relation("FromFarm")
  ownershipTransfersAsTo      OwnershipTransfer[] @relation("ToFarm")''')

# Add Animal fields
content = content.replace('tagNumber     String         @unique // RFID/Tag Number', '''tagNumber     String         @unique // RFID/Tag Number
  animalCode    String?        @unique''')
content = content.replace('gender        String // MALE, FEMALE', '''gender        String // MALE, FEMALE
  dateOfBirth   DateTime?''')
content = content.replace('weight        Float // in kg', '''weight        Float // in kg
  color         String?
  identificationMark String?
  photoUrl      String?
  registrationDate DateTime?
  currentStatus String?        @default("ACTIVE")''')
content = content.replace('prescriptions Prescription[]', '''prescriptions Prescription[]
  withdrawalRecords WithdrawalRecord[]
  amuRecords        AmuRecord[]
  milkCollections   MilkCollection[]
  violations        Violation[]
  ownershipTransfers OwnershipTransfer[]
  milkTests         MilkTest[]''')

# Fix Vaccination
content = content.replace('''vaccineName      String
  vaccinationDate  DateTime''', '''vaccinationCode  String?  @unique
  vaccineName      String
  disease          String?
  route            String?
  batchNumber      String?
  manufacturer     String?
  cost             Float?
  notes            String?
  vaccinationDate  DateTime''')

# Fix Treatment
content = content.replace('''drugName                 String
  dosage                   String''', '''disease                  String?
  drugName                 String
  activeIngredient         String?
  dosage                   String
  route                    String?
  reason                   String?
  notes                    String?
  followUpRequired         Boolean  @default(false)
  treatmentStartDate       DateTime?
  treatmentEndDate         DateTime?''')

# Add new models
content += '''
model WithdrawalRecord {
  id                 String   @id @default(uuid())
  withdrawalCode     String?
  treatmentId        String
  animalId           String
  animal             Animal   @relation(fields: [animalId], references: [id], onDelete: Cascade)
  productType        String
  medicine           String
  treatmentDate      DateTime
  withdrawalPeriod   Int
  withdrawalEndDate  DateTime
  status             String // RESTRICTED, WITHDRAWAL_COMPLETED
  followUpRequired   Boolean
  notes              String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model AmuRecord {
  id                 String   @id @default(uuid())
  amuCode            String?
  animalId           String
  animal             Animal   @relation(fields: [animalId], references: [id], onDelete: Cascade)
  treatmentId        String
  medicine           String
  activeIngredient   String?
  dosage             String
  route              String?
  startDate          DateTime
  endDate            DateTime?
  reason             String?
  veterinarianId     String?
  veterinarianName   String
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model MilkCollection {
  id                 String   @id @default(uuid())
  animalId           String
  animal             Animal   @relation(fields: [animalId], references: [id], onDelete: Cascade)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model Violation {
  id                 String   @id @default(uuid())
  violationCode      String?  @unique
  farmId             String?
  farm               Farm?    @relation(fields: [farmId], references: [id])
  animalId           String?
  animal             Animal?  @relation(fields: [animalId], references: [id], onDelete: Cascade)
  type               String
  description        String?
  severity           String
  date               DateTime
  status             String
  resolvedDate       DateTime?
  notes              String?
  veterinarianId     String?
  veterinarianName   String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model OwnershipTransfer {
  id                 String   @id @default(uuid())
  transferCode       String?  @unique
  animalId           String
  animal             Animal   @relation(fields: [animalId], references: [id], onDelete: Cascade)
  requestDate        DateTime
  status             String   @default("PENDING")
  reason             String?
  approvalDate       DateTime?
  notes              String?
  rejectionReason    String?
  currentOwnerId     String?
  currentOwner       User?    @relation("CurrentOwner", fields: [currentOwnerId], references: [id])
  newOwnerId         String?
  newOwner           User?    @relation("NewOwner", fields: [newOwnerId], references: [id])
  fromFarmId         String?
  fromFarm           Farm?    @relation("FromFarm", fields: [fromFarmId], references: [id])
  toFarmId           String?
  toFarm             Farm?    @relation("ToFarm", fields: [toFarmId], references: [id])
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model MilkTest {
  id                 String   @id @default(uuid())
  testCode           String?
  farmId             String?
  farm               Farm?    @relation(fields: [farmId], references: [id])
  animalId           String?
  animal             Animal?  @relation(fields: [animalId], references: [id], onDelete: Cascade)
  testDate           DateTime
  result             String
  notes              String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
'''

with open('apps/api-services/prisma/schema.prisma', 'w') as f:
    f.write(content)
