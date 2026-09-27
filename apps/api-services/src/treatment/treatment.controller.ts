import { Controller, Get, Post, Delete, Param, Query, Body } from '@nestjs/common';
import { TreatmentService } from './treatment.service';
import { CreateMrlRuleDto, CreateTreatmentDto } from './dto/create-treatment.dto';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { CurrentUser } from '../common/actor';
import type { Actor } from '../common/actor';

@Controller('treatments')
export class TreatmentController {
  constructor(private treatmentService: TreatmentService) {}

  @Get()
  @RequirePermissions(Permission.TREATMENT_READ)
  async findAll() {
    return this.treatmentService.findAll();
  }

  @Get('alerts')
  @RequirePermissions(Permission.WITHDRAWAL_READ)
  async getActiveMrlAlerts() {
    return this.treatmentService.getActiveMrlAlerts();
  }

  @Get('rules')
  @RequirePermissions(Permission.MRL_RULE_READ)
  async getMrlRules() {
    return this.treatmentService.getMrlRules();
  }

  @Post('update-statuses')
  @RequirePermissions(Permission.MRL_STATUS_REFRESH)
  async updateStatuses(@CurrentUser() actor: Actor) {
    return this.treatmentService.updateAnimalMrlStatuses(actor);
  }

  @Post('rules')
  @RequirePermissions(Permission.MRL_RULE_WRITE)
  async createMrlRule(@CurrentUser() actor: Actor, @Body() dto: CreateMrlRuleDto) {
    return this.treatmentService.createMrlRule(actor, dto);
  }

  @Get('animal')
  @RequirePermissions(Permission.TREATMENT_READ)
  async findByAnimal(@Query('animalId') animalId: string) {
    return this.treatmentService.findByAnimal(animalId);
  }

  @Post()
  @RequirePermissions(Permission.TREATMENT_WRITE)
  async create(@CurrentUser() actor: Actor, @Body() dto: CreateTreatmentDto) {
    return this.treatmentService.create(actor, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.CLINICAL_RECORD_DELETE)
  async remove(@CurrentUser() actor: Actor, @Param('id') id: string) {
    return this.treatmentService.remove(actor, id);
  }
}
