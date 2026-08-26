import re

with open('prisma/schema.prisma', 'r') as f:
    content = f.read()

content = content.replace('ownerName     String // Plain text name of the owner', '''ownerName     String // Plain text name of the owner
  fullName      String?''')

content = content.replace('''diseases         String
  diagnosis        String''', '''recordCode       String?  @unique
  diseases         String
  diagnosis        String''')

content = content.replace('''batchId            String?  @unique
  productType        String?''', '''batchId            String?  @unique
  collectionCode     String?  @unique
  productType        String?''')

content = content.replace('''testCode           String?
  batchId            String?''', '''testCode           String?
  sampleId           String?
  batchId            String?''')

content = content.replace('''milkCollection     MilkCollection? @relation(fields: [collectionId], references: [id])
  evidence           String?''', '''milkCollection     MilkCollection? @relation(fields: [collectionId], references: [id])
  batchId            String?
  evidence           String?
  adminRemarks       String?''')

content = content.replace('''approvalDate       DateTime?
  notes              String?''', '''approvalDate       DateTime?
  resolvedDate       DateTime?
  notes              String?''')

with open('prisma/schema.prisma', 'w') as f:
    f.write(content)
