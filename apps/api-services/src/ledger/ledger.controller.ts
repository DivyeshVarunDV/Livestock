import { Controller, Get } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';

@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('verify')
  @RequirePermissions(Permission.LEDGER_VERIFY)
  async verify() {
    return this.ledgerService.verifyLedger();
  }
}
