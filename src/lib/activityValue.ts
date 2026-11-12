// Estimates at current market prices, not historical execution prices.
export function transactionUsdValue(tx: any, tokens: any[] = []): number | null {
  if (/^(failed|failure)$/i.test(tx.status || '')) return 0;
  const transfers = Array.isArray(tx.transfers) && tx.transfers.length
    ? tx.transfers
    : Number(tx.amount) > 0
      ? [{ quantity: Number(tx.amount), symbol: tx.symbol, native: tx.coinType === '0x2::iota::IOTA' }]
      : [];
  if (!transfers.length) return 0;
  let total = 0;
  for (const tr of transfers) {
    const token = tokens.find(t => {
      if (String(t.chain).toLowerCase() !== String(tx.chain).toLowerCase()) return false;
      if (tr.contract) return String(t.address || '').toLowerCase() === String(tr.contract).toLowerCase();
      return tr.native && String(t.symbol).toUpperCase() === String(tr.symbol).toUpperCase();
    });
    const price = tr.priceUsd ?? token?.priceUsd ?? token?.price;
    const value = tr.usdValue ?? (price != null ? Number(price) * Number(tr.quantity) : null);
    if (value == null || !Number.isFinite(Number(value))) return null;
    total += Math.abs(Number(value));
  }
  return total;
}