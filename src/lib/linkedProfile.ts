const UD_CONTRACTS = new Set([
  '0x049aba7510f45ba5b64ea9e658e342f904db358d',
  '0xd1e5b0ff1287aa9f9a268759062e4ab08b9dacbe',
  '0xa9a6a3626993d487d2dbda3173cf58ca1a9d9e9f',
  '0xc3c2bce847f56b7f8f9bd9ae8651b9b8f786af07',
]);

/** Select only names from NFTs returned for the linked EVM owner. */
export function firstOwnedUdName(nfts: Array<Record<string, any>>): string | null {
  for (const nft of nfts) {
    const contract = typeof nft.contract === 'string' ? nft.contract : nft.contract?.address;
    const collection = String(nft.collection || '').toLowerCase();
    if (!UD_CONTRACTS.has(String(contract || '').toLowerCase()) && !collection.includes('unstoppable')) continue;
    const name = String(nft.name || '').trim().toLowerCase();
    if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(name)) return name;
  }
  return null;
}