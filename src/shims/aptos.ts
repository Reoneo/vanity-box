// Shim for the legacy "aptos" package required by @aptos-labs/wallet-adapter-core.
// The project uses @aptos-labs/ts-sdk instead; this stub satisfies the import at build time.

export class AptosClient {
  constructor() { throw new Error('Legacy "aptos" SDK is not installed. Use @aptos-labs/ts-sdk.'); }
}

export class Types {}
export class TokenClient extends AptosClient {}
export class FaucetClient extends AptosClient {}
export class CoinClient extends AptosClient {}
export class HexString {
  constructor(public hex: string) {}
  toString() { return this.hex; }
}

const defaultExport = {};
export default defaultExport;
