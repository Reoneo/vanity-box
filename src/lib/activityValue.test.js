import { describe, it, expect } from 'bun:test';
import { transactionUsdValue } from './activityValue.ts';

describe('activity USD estimates', () => {
  it('includes every transfer in a transaction', () => {
    expect(transactionUsdValue({ transfers: [{ quantity: 2, priceUsd: 3 }, { quantity: 4, priceUsd: 5 }] })).toBe(26);
  });
  it('does not present an unknown price as zero dollars', () => {
    expect(transactionUsdValue({ transfers: [{ quantity: 2, symbol: 'UNKNOWN' }] })).toBeNull();
  });
  it('values IOTA using the native IOTA portfolio price', () => {
    expect(transactionUsdValue({ chain: 'iota', amount: '10', symbol: 'IOTA', coinType: '0x2::iota::IOTA' }, [{ chain: 'iota', symbol: 'IOTA', priceUsd: 0.2 }])).toBe(2);
  });
  it('does not claim a value moved for failed transactions', () => {
    expect(transactionUsdValue({ status: 'failed', transfers: [{ quantity: 2, priceUsd: 3 }] })).toBe(0);
  });
  it('returns zero for a contract call without transfers', () => {
    expect(transactionUsdValue({ transfers: [] })).toBe(0);
  });
  it('does not price an unrelated contract with the same symbol', () => {
    expect(transactionUsdValue({ chain: 'ethereum', transfers: [{ contract: '0xaaa', symbol: 'USDC', quantity: 5 }] }, [{ chain: 'ethereum', address: '0xbbb', symbol: 'USDC', price: 1 }])).toBeNull();
  });
});