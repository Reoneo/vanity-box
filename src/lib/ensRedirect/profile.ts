// Helper functions for Vanity profile URLs

export function fullEnsName(subname: string, parent: string) {
  const s = (subname || "").trim();
  return s ? `${s}.${parent}` : parent;
}

export function vanityProfileUrl(subname: string, parent: string) {
  // Always include trailing slash for clean relative-link behavior
  return `https://vanity.box/${fullEnsName(subname, parent)}/`;
}
