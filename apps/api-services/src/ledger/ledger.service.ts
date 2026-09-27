import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class LedgerService implements OnModuleInit {
  private readonly logger = new Logger(LedgerService.name);
  private fabricContract: any = null;
  private fabricGateway: any = null;
  // Serialises local appends so two concurrent writes cannot fork the hash chain.
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test' || process.env.FABRIC_ENABLED === 'false') return;
    try {
      this.logger.log('Attempting to connect to Hyperledger Fabric test-network...');
      // Loaded lazily: the Fabric SDK is optional and heavy.
      const { createFabricConnection, FABRIC_CHANNEL_NAME, FABRIC_CHAINCODE_NAME } = await import('./fabric.config.js');
      this.fabricGateway = await createFabricConnection();
      const network = this.fabricGateway.getNetwork(FABRIC_CHANNEL_NAME);
      this.fabricContract = network.getContract(FABRIC_CHAINCODE_NAME);
      this.logger.log('Successfully connected to Hyperledger Fabric!');
    } catch (err) {
      this.logger.warn('Fabric network not reachable. Falling back to local SQLite ledger simulation.');
      this.logger.warn('Error details: ' + (err as Error).message);
    }
  }

  async appendToLedger(action: string, recordId: string, dataPayload: any) {
    const payloadStr = JSON.stringify(dataPayload);
    const timestamp = new Date();

    // 1. Try submitting to Hyperledger Fabric
    if (this.fabricContract) {
      try {
        const id = crypto.randomUUID();
        this.logger.log(`Submitting transaction to Fabric: ${action} for ${recordId}`);
        await this.fabricContract.submitTransaction('appendRecord', id, action, recordId, payloadStr, timestamp.toISOString());
        this.logger.log(`Transaction successfully committed to Fabric (ID: ${id})`);
        return { success: true, method: 'fabric', id };
      } catch (err) {
        this.logger.error('Failed to submit to Fabric. Falling back to SQLite.', err);
      }
    }

    // 2. Fallback to the local hash-chained ledger
    const run = this.queue.then(() => this.appendLocal(action, recordId, payloadStr, timestamp));
    this.queue = run.catch(() => undefined);
    return run.catch((err) => {
      this.logger.error(`Ledger append failed for ${action} ${recordId}: ${(err as Error).message}`);
      return { success: false, method: 'sqlite', error: (err as Error).message };
    });
  }

  private async appendLocal(action: string, recordId: string, payloadStr: string, timestamp: Date) {
    const prevBlock = await this.prisma.ledgerBlock.findFirst({
      orderBy: { id: 'desc' },
    });

    const previousHash = prevBlock ? prevBlock.currentHash : '0000000000000000000000000000000000000000000000000000000000000000';
    
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

    return { success: true, method: 'sqlite', block };
  }

  async verifyLedger() {
    if (this.fabricContract) {
      try {
        const resultBytes = await this.fabricContract.evaluateTransaction('getAllRecords');
        const records = JSON.parse(resultBytes.toString());
        return { isValid: true, method: 'fabric', blockCount: records.length };
      } catch (err) {
        this.logger.error('Failed to fetch from Fabric.', err);
      }
    }

    const blocks = await this.prisma.ledgerBlock.findMany({
      orderBy: { id: 'asc' },
    });

    let expectedPreviousHash = '0000000000000000000000000000000000000000000000000000000000000000';
    for (const block of blocks) {
      if (block.previousHash !== expectedPreviousHash) {
        return { isValid: false, tamperedBlockId: block.id, reason: 'Previous hash mismatch' };
      }
      const blockData = `${block.action}-${block.recordId}-${block.dataPayload}-${block.previousHash}-${block.timestamp.toISOString()}`;
      const recomputedHash = crypto.createHash('sha256').update(blockData).digest('hex');
      if (recomputedHash !== block.currentHash) {
        return { isValid: false, tamperedBlockId: block.id, reason: 'Current hash mismatch' };
      }
      expectedPreviousHash = block.currentHash;
    }
    return { isValid: true, method: 'sqlite', blockCount: blocks.length };
  }
}
