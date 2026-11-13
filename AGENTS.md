# Profile resolution
- Raw IOTA wallet searches select their display domain only from UD NFTs fetched for the linked EVM wallet, then hydrate that domain using the shared resolver; preserve the original search URL and native IOTA asset address to unify both entry points without treating IOTA addresses as EVM addresses.

# Search metadata
- Keep the homepage sharing image in sync between static HTML and client metadata using the uploaded asset pointer; favicons stay real files in public so crawlers can fetch them.
- AppRoutes owns the single client-rendered canonical tag using the primary domain and actual pathname; profile metadata must not add a second canonical, so identity enrichment cannot rewrite the searched page's identity.
- Keep static homepage metadata accurate and align profile descriptions in DynamicMetaTags and the Cloudflare worker; never add invisible keyword-targeted content as an SEO substitute for visitor-visible content.
- Fetch activity independently in progressive chain batches and merge by chain plus hash; show current-price USD estimates explicitly and leave unknown prices unavailable.
- OpenSea NFT requests return bounded cursor pages; merge by chain, contract, and token ID, preserving continuation without waiting for whole portfolios.

# DNS maintenance
- Validate completed Dune results before Cloudflare writes; missing executions defer sync without starting billable queries, and shared browser sync deduplicates attempts so maintenance never blocks navigation.

# Bundle weight
- Load heavy rendering libraries (for example the 3D/WebGL stack behind animated backgrounds) through a lazy chunk so first paint and profile resolution never wait on them; the fallback UI must already be on screen.