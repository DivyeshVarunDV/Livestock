import re

with open('prisma/schema.prisma', 'r') as f:
    content = f.read()

# Add relation to WithdrawalRecord
content = content.replace('''treatmentId        String
  animalId           String''', '''treatmentId        String
  treatment          Treatment @relation(fields: [treatmentId], references: [id])
  animalId           String''')

# Add relation to AmuRecord
content = content.replace('''treatmentId        String
  medicine           String''', '''treatmentId        String
  treatment          Treatment @relation(fields: [treatmentId], references: [id])
  medicine           String''')

with open('prisma/schema.prisma', 'w') as f:
    f.write(content)
