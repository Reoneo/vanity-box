# Profile resolution
- Raw IOTA wallet searches select their display domain only from UD NFTs fetched for the linked EVM wallet, then hydrate that domain using the shared resolver; preserve the original search URL and native IOTA asset address to unify both entry points without treating IOTA addresses as EVM addresses.

# Search metadata
- AppRoutes owns the single client-rendered canonical tag using the primary domain and actual pathname; profile metadata must not add a second canonical, so identity enrichment cannot rewrite the searched page's identity.
- Keep static homepage metadata accurate and align profile descriptions in DynamicMetaTags and the Cloudflare worker; never add invisible keyword-targeted content as an SEO substitute for visitor-visible content.