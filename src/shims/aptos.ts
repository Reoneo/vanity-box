// Shim for aptos package – satisfies @aptos-labs/wallet-adapter-core imports
export class HexString {
  constructor(public hexString: string) {}
  toString() { return this.hexString; }
  hex() { return this.hexString; }
  noPrefix() { return this.hexString.replace(/^0x/, ''); }
}
export const TxnBuilderTypes = {};
export const TxnBuilderTypes3 = {};
export const TxnBuilderTypes4 = {};
export const BCS = {};
export const BCS2 = {};
export const Types = {};
export const Types3 = {};
export default {};
