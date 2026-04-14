// Shim for aptos package – satisfies @aptos-labs/wallet-adapter-core import
export class HexString {
  constructor(public hexString: string) {}
  toString() { return this.hexString; }
  hex() { return this.hexString; }
  noPrefix() { return this.hexString.replace(/^0x/, ''); }
}
export const TxnBuilderTypes = {};
export const BCS = {};
export default {};
