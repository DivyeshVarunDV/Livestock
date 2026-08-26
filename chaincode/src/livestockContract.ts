import { Context, Contract } from "fabric-contract-api";

export class LivestockContract extends Contract {
  public async initLedger(ctx: Context): Promise<void> {
    console.info("Ledger initialized");
  }

  public async appendRecord(ctx: Context, id: string, action: string, recordId: string, payloadStr: string, timestamp: string): Promise<void> {
    const record = {
      action,
      recordId,
      payloadStr,
      timestamp,
    };
    await ctx.stub.putState(id, Buffer.from(JSON.stringify(record)));
  }

  public async getRecord(ctx: Context, id: string): Promise<string> {
    const recordAsBytes = await ctx.stub.getState(id);
    if (!recordAsBytes || recordAsBytes.length === 0) {
      throw new Error(`Record ${id} does not exist`);
    }
    return recordAsBytes.toString();
  }

  public async getAllRecords(ctx: Context): Promise<string> {
    const allResults = [];
    const iterator = await ctx.stub.getStateByRange("", "");
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString("utf8");
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (err) {
        record = strValue;
      }
      allResults.push({ Key: result.value.key, Record: record });
      result = await iterator.next();
    }
    return JSON.stringify(allResults);
  }
}
