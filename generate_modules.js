const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'apps', 'api-services', 'src');

const entities = [
  { name: 'milk-collection', className: 'MilkCollection' },
  { name: 'milk-test', className: 'MilkTest' },
  { name: 'violation', className: 'Violation' },
  { name: 'ownership-transfer', className: 'OwnershipTransfer' }
];

entities.forEach(entity => {
  const dir = path.join(srcDir, entity.name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  const modelName = entity.className.charAt(0).toLowerCase() + entity.className.slice(1);

  // Service
  fs.writeFileSync(path.join(dir, `${entity.name}.service.ts`), `
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ${entity.className}Service {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.${modelName}.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const record = await this.prisma.${modelName}.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Record not found');
    return record;
  }

  async create(dto: any) {
    return this.prisma.${modelName}.create({ data: dto });
  }

  async update(id: string, dto: any) {
    return this.prisma.${modelName}.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.${modelName}.delete({ where: { id } });
  }
}
`);

  // Controller
  fs.writeFileSync(path.join(dir, `${entity.name}.controller.ts`), `
import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ${entity.className}Service } from './${entity.name}.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('${entity.name}s')
@UseGuards(JwtAuthGuard)
export class ${entity.className}Controller {
  constructor(private service: ${entity.className}Service) {}

  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
`);

  // Module
  fs.writeFileSync(path.join(dir, `${entity.name}.module.ts`), `
import { Module } from '@nestjs/common';
import { ${entity.className}Controller } from './${entity.name}.controller';
import { ${entity.className}Service } from './${entity.name}.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [${entity.className}Controller],
  providers: [${entity.className}Service],
  exports: [${entity.className}Service],
})
export class ${entity.className}Module {}
`);
});

console.log('Modules generated!');
