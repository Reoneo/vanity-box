// Build shim for the legacy "aptos" SDK required by @aptos-labs/wallet-adapter-core
// The project uses @aptos-labs/ts-sdk instead.

export class AptosClient {
  constructor() { throw new Error("Legacy aptos SDK is shimmed out"); }
}
export class Types {}
export default {};
