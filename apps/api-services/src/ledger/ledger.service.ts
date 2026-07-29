import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appends a new cryptographically hashed block to the ledger.
   * If anyone tampers with the SQLite database directly, the hash chain will break.
   */
  async appendToLedger(action: string, recordId: string, dataPayload: any) {
    const payloadStr = JSON.stringify(dataPayload);
    
    // Find previous block to get the previousHash
    const prevBlock = await this.prisma.ledgerBlock.findFirst({
      orderBy: { id: 'desc' },
    });

    const previousHash = prevBlock ? prevBlock.currentHash : '0000000000000000000000000000000000000000000000000000000000000000'; // Genesis previousHash
    
    // To ensure exact reproducibility, we compute hash using a standardized timestamp or just hash the DB record values once saved.
    // For simplicity, we'll hash before saving.
    const timestamp = new Date();
    
    const blockData = `${action}-${recordId}-${payloadStr}-${previousHash}-${timestamp.toISOString()}`;
    const currentHash = crypto.createHash('sha256').update(blockData).digest('hex');

    const block = await this.prisma.ledgerBlock.create({
      data: {
        timestamp,
        action,
        recordId,
        dataPayload: payloadStr,
        previousHash,
        currentHash,
      },
    });

    return block;
  }

  /**
   * Verifies the integrity of the entire ledger chain.
   * Returns { isValid: boolean, tamperedBlockId?: number }
   */
  async verifyLedger() {
    const blocks = await this.prisma.ledgerBlock.findMany({
      orderBy: { id: 'asc' },
    });

    let expectedPreviousHash = '0000000000000000000000000000000000000000000000000000000000000000';

    for (const block of blocks) {
      if (block.previousHash !== expectedPreviousHash) {
        return { isValid: false, tamperedBlockId: block.id, reason: 'Previous hash mismatch' };
      }

      // Recompute current hash
      const blockData = `${block.action}-${block.recordId}-${block.dataPayload}-${block.previousHash}-${block.timestamp.toISOString()}`;
      const recomputedHash = crypto.createHash('sha256').update(blockData).digest('hex');

      if (recomputedHash !== block.currentHash) {
        return { isValid: false, tamperedBlockId: block.id, reason: 'Current hash mismatch (data tampered)' };
      }

      expectedPreviousHash = block.currentHash;
    }

    return { isValid: true, blockCount: blocks.length };
  }
}
