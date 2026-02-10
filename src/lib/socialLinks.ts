// Normalize social link URLs from handles or partial URLs into full clickable URLs.
// Discord usernames (not invite links) get special treatment: rendered as copyable text.

const PLATFORM_URL_PREFIXES: Record<string, string> = {
  x: 'https://x.com/',
  twitter: 'https://x.com/',
  linkedin: 'https://linkedin.com/in/',
  github: 'https://github.com/',
  telegram: 'https://t.me/',
  instagram: 'https://instagram.com/',
  facebook: 'https://facebook.com/',
  reddit: 'https://reddit.com/u/',
  bluesky: 'https://bsky.app/profile/',
  whatsapp: 'https://wa.me/',
  spotify: 'https://open.spotify.com/user/',
  youtube: 'https://youtube.com/@',
};

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function stripLeadingAt(handle: string): string {
  return handle.startsWith('@') ? handle.slice(1) : handle;
}

export function normalizeSocialUrl(
  platform: string,
  raw: string
): { url: string | null; isDiscordUsername: boolean; displayHandle: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { url: null, isDiscordUsername: false, displayHandle: '' };

  const key = platform.toLowerCase();

  // Handle Discord specially
  if (key === 'discord') {
    if (looksLikeUrl(trimmed) && /discord\.(gg|com)/i.test(trimmed)) {
      return { url: trimmed, isDiscordUsername: false, displayHandle: trimmed };
    }
    const username = trimmed.replace(/^discord:/i, '').trim();
    return { url: null, isDiscordUsername: true, displayHandle: username };
  }

  // If already a full URL, return as-is
  if (looksLikeUrl(trimmed)) {
    const handle = extractHandleFromUrl(key, trimmed);
    return { url: trimmed, isDiscordUsername: false, displayHandle: handle };
  }

  // Build URL from handle
  const prefix = PLATFORM_URL_PREFIXES[key];
  if (prefix) {
    const handle = stripLeadingAt(trimmed);
    return {
      url: `${prefix}${handle}`,
      isDiscordUsername: false,
      displayHandle: `@${handle}`,
    };
  }

  // Unknown platform
  if (trimmed.includes('.')) {
    return { url: `https://${trimmed}`, isDiscordUsername: false, displayHandle: trimmed };
  }

  return { url: null, isDiscordUsername: false, displayHandle: trimmed };
}

function extractHandleFromUrl(platform: string, url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    if (platform === 'linkedin' && parts[0] === 'in') {
      return `@${parts[1] || u.hostname}`;
    }
    const last = parts[parts.length - 1] || u.hostname;
    return last.startsWith('@') ? last : `@${last}`;
  } catch {
    return url;
  }
}

export function normalizeAllLinks(
  links: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [platform, linkData] of Object.entries(links)) {
    if (!linkData) continue;
    const rawUrl = typeof linkData === 'string' ? linkData : linkData?.link;
    if (!rawUrl) {
      result[platform] = linkData;
      continue;
    }
    const { url } = normalizeSocialUrl(platform, rawUrl);
    if (typeof linkData === 'string') {
      result[platform] = url || linkData;
    } else {
      result[platform] = { ...linkData, link: url || rawUrl };
    }
  }
  return result;
}
