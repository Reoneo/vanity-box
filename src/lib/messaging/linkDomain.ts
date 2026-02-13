const STORAGE_KEY = "vanity_linked_domain";

export function getLinkedDomain(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function setLinkedDomain(domain: string): void {
  try {
    if (domain) {
      localStorage.setItem(STORAGE_KEY, domain.toLowerCase().trim());
    }
  } catch {}
}

export function clearLinkedDomain(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
