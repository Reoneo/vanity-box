/// Vanity Profile Module
/// 
/// Onchain profile storage for IOTA Names, bound to Name NFTs.
/// Profile data is keyed by the Name NFT's object ID, so when a name
/// transfers to a new owner, only that owner can edit the profile.
///
/// DEPLOYMENT INSTRUCTIONS:
/// 1. Install IOTA CLI: https://docs.iota.org/developer/getting-started/iota-install
/// 2. Set up wallet: `iota client new-address ed25519`
/// 3. Get testnet IOTA: Use the faucet for testing
/// 4. Update Move.toml with the correct IOTA Names package address
/// 5. Build: `iota move build`
/// 6. Deploy: `iota client publish --gas-budget 100000000`
/// 7. Note the package ID and registry object ID from the deployment output
/// 8. Set environment variables:
///    - VITE_VANITY_PROFILE_PACKAGE_ID=<package_id>
///    - VITE_VANITY_PROFILE_REGISTRY_ID=<registry_object_id>
///    - VANITY_PROFILE_REGISTRY_ID=<registry_object_id> (for edge functions)

module vanity_profile::profiles {
    use std::string::String;
    use iota::table::{Self, Table};
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{TxContext};
    use iota::transfer;

    // TODO: Import the Name NFT type from IOTA Names once discovered
    // The exact module path needs to be verified from the IOTA Names package
    // use iota_names::<module>::Name;

    // ========== Errors ==========
    const EAvatarUrlTooLong: u64 = 1;
    const EHeaderUrlTooLong: u64 = 2;
    const EBioTooLong: u64 = 3;
    const EEmailTooLong: u64 = 4;
    const EWebsiteTooLong: u64 = 5;
    const ELinkUrlTooLong: u64 = 6;
    const EInvalidPlatform: u64 = 7;

    // ========== Constants ==========
    // Max lengths for validation
    const MAX_URL_LENGTH: u64 = 512;
    const MAX_BIO_LENGTH: u64 = 1000;
    const MAX_EMAIL_LENGTH: u64 = 256;

    // Platform codes
    const PLATFORM_X: u8 = 1;
    const PLATFORM_LINKEDIN: u8 = 2;
    const PLATFORM_FACEBOOK: u8 = 3;
    const PLATFORM_INSTAGRAM: u8 = 4;
    const PLATFORM_BLUESKY: u8 = 5;
    const PLATFORM_WHATSAPP: u8 = 6;
    const PLATFORM_TELEGRAM: u8 = 7;
    const PLATFORM_REDDIT: u8 = 8;
    const PLATFORM_SPOTIFY: u8 = 9;
    const PLATFORM_YOUTUBE: u8 = 10;
    const PLATFORM_GITHUB: u8 = 11;

    // ========== Structs ==========

    /// A single social link
    public struct Link has store, drop, copy {
        platform: u8,
        url: String,
    }

    /// Profile data for a Name NFT
    public struct ProfileData has store, drop {
        avatar_url: String,
        header_url: String,
        bio: String,
        email: String,
        website: String,
        links: vector<Link>,
    }

    /// Shared registry storing all profiles
    /// Keyed by Name NFT object ID for ownership-bound access
    public struct Registry has key {
        id: UID,
        profiles: Table<ID, ProfileData>,
    }

    // ========== Init ==========

    /// Create and share the registry on package publish
    fun init(ctx: &mut TxContext) {
        let registry = Registry {
            id: object::new(ctx),
            profiles: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    // ========== Entry Functions ==========

    /// Create or update a profile for a Name NFT
    /// 
    /// IMPORTANT: The `name` parameter must be the actual Name NFT object.
    /// Only the current owner of the Name NFT can call this function.
    /// 
    /// TODO: Update the name parameter type once IOTA Names type is imported:
    /// entry public fun upsert_profile(
    ///     registry: &mut Registry,
    ///     name: &Name,  // <- Change this once type is discovered
    ///     avatar_url: String,
    ///     ...
    /// )
    /// 
    /// For now, using ID directly for testing:
    entry public fun upsert_profile(
        registry: &mut Registry,
        name_id: ID,  // TODO: Replace with &Name once imported
        avatar_url: String,
        header_url: String,
        bio: String,
        email: String,
        website: String,
        _ctx: &mut TxContext
    ) {
        // Validate lengths
        assert!(std::string::length(&avatar_url) <= MAX_URL_LENGTH, EAvatarUrlTooLong);
        assert!(std::string::length(&header_url) <= MAX_URL_LENGTH, EHeaderUrlTooLong);
        assert!(std::string::length(&bio) <= MAX_BIO_LENGTH, EBioTooLong);
        assert!(std::string::length(&email) <= MAX_EMAIL_LENGTH, EEmailTooLong);
        assert!(std::string::length(&website) <= MAX_URL_LENGTH, EWebsiteTooLong);

        // TODO: Get the object ID from the Name NFT reference
        // let name_id = object::id(name);

        let profile = ProfileData {
            avatar_url,
            header_url,
            bio,
            email,
            website,
            links: vector::empty(),
        };

        // Upsert: remove old if exists, then add new
        if (table::contains(&registry.profiles, name_id)) {
            table::remove(&mut registry.profiles, name_id);
        };
        table::add(&mut registry.profiles, name_id, profile);
    }

    /// Add or update a social link
    entry public fun set_link(
        registry: &mut Registry,
        name_id: ID,  // TODO: Replace with &Name once imported
        platform: u8,
        url: String,
        _ctx: &mut TxContext
    ) {
        // Validate platform
        assert!(platform >= PLATFORM_X && platform <= PLATFORM_GITHUB, EInvalidPlatform);
        // Validate URL length
        assert!(std::string::length(&url) <= MAX_URL_LENGTH, ELinkUrlTooLong);

        // TODO: Get the object ID from the Name NFT reference
        // let name_id = object::id(name);

        // Profile must exist
        assert!(table::contains(&registry.profiles, name_id), 0);

        let profile = table::borrow_mut(&mut registry.profiles, name_id);
        
        // Find and update existing link or add new one
        let len = vector::length(&profile.links);
        let mut i = 0;
        let mut found = false;
        
        while (i < len) {
            let link = vector::borrow_mut(&mut profile.links, i);
            if (link.platform == platform) {
                link.url = url;
                found = true;
                break
            };
            i = i + 1;
        };

        if (!found) {
            vector::push_back(&mut profile.links, Link { platform, url });
        };
    }

    /// Remove a social link by platform
    entry public fun remove_link(
        registry: &mut Registry,
        name_id: ID,  // TODO: Replace with &Name once imported
        platform: u8,
        _ctx: &mut TxContext
    ) {
        // TODO: Get the object ID from the Name NFT reference
        // let name_id = object::id(name);

        // Profile must exist
        assert!(table::contains(&registry.profiles, name_id), 0);

        let profile = table::borrow_mut(&mut registry.profiles, name_id);
        
        let len = vector::length(&profile.links);
        let mut i = 0;
        
        while (i < len) {
            let link = vector::borrow(&profile.links, i);
            if (link.platform == platform) {
                vector::remove(&mut profile.links, i);
                break
            };
            i = i + 1;
        };
    }

    // ========== View Functions ==========

    /// Check if a profile exists for a name
    public fun has_profile(registry: &Registry, name_id: ID): bool {
        table::contains(&registry.profiles, name_id)
    }

    /// Get a reference to profile data (if it exists)
    public fun get_profile(registry: &Registry, name_id: ID): &ProfileData {
        table::borrow(&registry.profiles, name_id)
    }

    // ========== Test Helpers ==========

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
