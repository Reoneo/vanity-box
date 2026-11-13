# Gold cursor and profile loading
- [x] Remove Hyperspeed and profile skeleton from loading; use a small gold loading indicator.
- [x] Fix gold splash cursor positioning and lifecycle; verified gold pointer trails and Softmod.eth loading on desktop/mobile without browser errors.

# Linked-wallet profiles
- [x] Unify raw IOTA and linked-domain identity and asset resolution.
- [x] Verify Mrs.Vanity and its linked IOTA wallet in the running app: matching 3 NFTs, Ethereum/IOTA wallets, avatar, bio and activity.

# SEO and claim information
- [x] Improve accurate metadata and search discovery for Vanity, blockchain, ID, decentralised wallet and Web3 without redesigning the site.
- [x] Remove Vanity.ton claiming information from search results and ID bundles while retaining TON wallet support.
- [x] Verify metadata, sitemap and the unchanged homepage in the preview.
- [ ] Make search changes live: requires frontend publishing and deployment of the updated Cloudflare worker; deployment access is not configured in this task.

# Sharing and search appearance
- [x] Set supplied landscape sharing image and exact preview title.
- [x] Set supplied square image as the search favicon and verify delivered metadata.
# November activity and collection improvements
- [x] Review branded AI Overview eligibility: Google controls query-specific inclusion; no Search Console connection is available.
- [x] Display current-price USD estimates or explicit unavailable values for all activity; verified Ethereum estimates on desktop.
- [x] Load activity independently and progressively across chains; verified real-wallet responses without runtime errors.
- [x] Display NFT pages progressively, preserving complete collections and deduplication; verified 533 first-page items in 3.3 seconds and 474 next-page items with no overlap.
- [x] Deploy and verify real-wallet activity and large NFT collections.
- [ ] Numeric USD values for every token: blocked where market providers have no price; show unavailable instead.
- [ ] Make frontend activity/NFT layout live: requires publishing.
