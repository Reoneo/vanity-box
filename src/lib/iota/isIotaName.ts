export function isIotaName(input?: string | null): boolean {
  if (!input) return false;
  const s = input.trim().toLowerCase();
  // Works for ALL .iota names and subdomains: smith.iota, brah.vanity.iota, x.y.z.vanity.iota
  return s.endsWith('.iota') && s.length > '.iota'.length;
}
