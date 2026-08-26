import re

with open('apps/api-services/prisma/schema.prisma', 'r') as f:
    content = f.read()

# Add User relation for approvedTransfers
content = content.replace('ownershipTransfersAsNew     OwnershipTransfer[] @relation("NewOwner")', '''ownershipTransfersAsNew     OwnershipTransfer[] @relation("NewOwner")
  approvedTransfers           OwnershipTransfer[] @relation("ApprovedBy")''')

# Add Farm relation for milkCollections
content = content.replace('violations    Violation[]', '''violations    Violation[]
  milkCollections MilkCollection[]''')

# Fix MilkCollection
content = content.replace('''model MilkCollection {
  id                 String   @id @default(uuid())
  animalId           String
  animal             Animal   @relation(fields: [animalId], references: [id], onDelete: Cascade)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}''', '''model MilkCollection {
  id                 String   @id @default(uuid())
  batchId            String?  @unique
  productType        String?
  collectionCenter   String?
  animalId           String
  animal             Animal   @relation(fields: [animalId], references: [id], onDelete: Cascade)
  farmId             String?
  farm               Farm?    @relation(fields: [farmId], references: [id])
  violations         Violation[]
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}''')

# Fix Violation
content = content.replace('''veterinarianId     String?
  veterinarianName   String?''', '''veterinarianId     String?
  veterinarianName   String?
  collectionId       String?
  milkCollection     MilkCollection? @relation(fields: [collectionId], references: [id])
  evidence           String?''')

# Fix MilkTest
content = content.replace('testCode           String?', '''testCode           String?
  batchId            String?''')

# Fix OwnershipTransfer
content = content.replace('rejectionReason    String?', '''rejectionReason    String?
  approvedById       String?
  approvedBy         User?    @relation("ApprovedBy", fields: [approvedById], references: [id])''')

# Fix Treatment (add withdrawalRecords and amuRecords)
content = content.replace('veterinarianName         String', '''veterinarianName         String
  withdrawalRecords        WithdrawalRecord[]
  amuRecords               AmuRecord[]''')

with open('apps/api-services/prisma/schema.prisma', 'w') as f:
    f.write(content)
