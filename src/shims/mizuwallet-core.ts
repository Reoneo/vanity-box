// Shim for @mizuwallet-sdk/core required by @mizuwallet-sdk/aptos-wallet-adapter
const defaultExport = {};
export default defaultExport;
export const MizuWallet = class { constructor() { throw new Error('@mizuwallet-sdk/core is not installed'); } };
