import { describe, it, expect } from 'bun:test';
import { firstOwnedUdName } from './linkedProfile';

describe('linked wallet display identity', () => {
  it('uses the first owned UD domain, Mrs.Vanity, rather than an unrelated NFT', () => {
    expect(firstOwnedUdName([
      { name: 'other.eth', collection: 'ENS' },
      { name: 'Mrs.Vanity', collection: 'Unstoppable Domains' },
      { name: 'second.vanity', collection: 'Unstoppable Domains' },
    ])).toBe('mrs.vanity');
  });
  it('recognizes UD ownership by its NFT contract', () => {
    expect(firstOwnedUdName([{ name: 'Mrs.Vanity', contract: '0xa9a6a3626993d487d2dbda3173cf58ca1a9d9e9f' }])).toBe('mrs.vanity');
  });
  it('does not invent a domain when no owned UD NFT exists', () => {
    expect(firstOwnedUdName([{ name: 'Mrs.Vanity', collection: 'Unrelated' }])).toBeNull();
  });
});