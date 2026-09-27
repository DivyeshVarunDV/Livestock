import { Controller, Get, Header, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';

/**
 * Read-only. Audit entries are written exclusively by the server; the former
 * public POST endpoint allowed anyone to forge entries and has been removed.
 */
@Controller('audit-logs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @RequirePermissions(Permission.AUDIT_READ)
  async findAll(
    @Query('role') role?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findAll({ role, entity, action, entityId, userId, from, to, limit: limit ? Number(limit) : undefined });
  }

  @Get('verify')
  @RequirePermissions(Permission.AUDIT_VERIFY)
  async verify() {
    return this.auditService.verifyChain();
  }

  @Get('export')
  @RequirePermissions(Permission.AUDIT_READ)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="audit-log.csv"')
  async export(
    @Query('role') role?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.auditService.exportCsv({ role, entity, action, from, to });
  }
}
