import { iotaJsonRpc, isValidIotaAddress, IOTA_NETWORK, type IotaNetwork } from './client';

// IOTA Names SDK types
export interface IotaNameRecord {
  name: string;
  address: string;
  avatar?: string;
  contentHash?: string;
  targetAddress?: string;
}

/**
 * Resolve an IOTA name (e.g., "vanity.iota") to its owner address
 * Uses the iotax_iotaNamesLookup RPC method
 */
export async function resolveNameToOwner(
  name: string,
  network: IotaNetwork = IOTA_NETWORK
): Promise<string | null> {
  try {
    // Ensure name ends with .iota
    const fullName = name.endsWith('.iota') ? name : `${name}.iota`;
    
    console.log(`[IOTA Names] Resolving name to owner: ${fullName}`);
    
    // Use the lookup method to get the target address
    const result = await iotaJsonRpc<string | null>(
      'iotax_iotaNamesLookup',
      [fullName],
      network
    );
    
    if (!result || typeof result !== 'string') {
      console.log(`[IOTA Names] No owner found for name: ${fullName}`);
      return null;
    }
    
    console.log(`[IOTA Names] Resolved ${fullName} to owner: ${result}`);
    return result;
  } catch (error) {
    console.error('[IOTA Names] Error resolving name to owner:', error);
    return null;
  }
}

/**
 * Reverse lookup: resolve an IOTA address to its default/primary name
 */
export async function resolveAddressToName(
  address: string,
  network: IotaNetwork = IOTA_NETWORK
): Promise<string | null> {
  try {
    if (!isValidIotaAddress(address)) {
      console.log(`[IOTA Names] Invalid address format: ${address}`);
      return null;
    }
    
    console.log(`[IOTA Names] Reverse lookup for address: ${address}`);
    
    const result = await iotaJsonRpc<string | null>(
      'iotax_iotaNamesReverseLookup',
      [address.toLowerCase()],
      network
    );
    
    if (!result || typeof result !== 'string') {
      console.log(`[IOTA Names] No name found for address: ${address}`);
      return null;
    }
    
    // Ensure result ends with .iota
    const fullName = result.endsWith('.iota') ? result : `${result}.iota`;
    console.log(`[IOTA Names] Resolved address ${address} to name: ${fullName}`);
    
    return fullName;
  } catch (error) {
    console.error('[IOTA Names] Error resolving address to name:', error);
    return null;
  }
}

/**
 * Find the Name NFT object ID for a given name owned by an address
 * This is needed to interact with the onchain profile registry
 */
export async function findNameObjectId(
  ownerAddress: string,
  fullName: string,
  network: IotaNetwork = IOTA_NETWORK
): Promise<string | null> {
  try {
    console.log(`[IOTA Names] Finding Name NFT objectId for ${fullName} owned by ${ownerAddress}`);
    
    // Get owned objects and filter for Name NFTs
    const result = await iotaJsonRpc<{ data: any[] }>(
      'iota_getOwnedObjects',
      [
        ownerAddress,
        {
          filter: { MatchAll: [] },
          options: { showType: true, showContent: true }
        }
      ],
      network
    );
    
    if (!result?.data || !Array.isArray(result.data)) {
      console.log('[IOTA Names] No owned objects found');
      return null;
    }
    
    // Look for objects that appear to be IOTA Names NFTs
    // The type should contain "iota_names" or "name" and the content should have the name string
    for (const obj of result.data) {
      const type = obj.data?.type?.toLowerCase() || '';
      const content = obj.data?.content?.fields || {};
      
      // Check if this looks like a Name NFT
      const isNameNft = type.includes('name') || type.includes('iota_names');
      if (!isNameNft) continue;
      
      // Check various possible field names for the domain name
      const possibleNameFields = ['name', 'full_name', 'domain', 'label', 'domain_name'];
      for (const field of possibleNameFields) {
        const value = content[field];
        if (typeof value === 'string') {
          const normalizedValue = value.toLowerCase();
          const normalizedTarget = fullName.toLowerCase().replace('.iota', '');
          
          if (normalizedValue === normalizedTarget || 
              normalizedValue === fullName.toLowerCase() ||
              normalizedValue.includes(normalizedTarget)) {
            console.log(`[IOTA Names] Found Name NFT objectId: ${obj.data.objectId}`);
            return obj.data.objectId;
          }
        }
      }
    }
    
    console.log(`[IOTA Names] No matching Name NFT found for ${fullName}`);
    return null;
  } catch (error) {
    console.error('[IOTA Names] Error finding Name NFT objectId:', error);
    return null;
  }
}

/**
 * Log all owned objects containing "name" to discover the correct Name NFT type
 * This is a development helper function
 */
export async function discoverNameNftType(
  ownerAddress: string,
  network: IotaNetwork = IOTA_NETWORK
): Promise<void> {
  try {
    console.log(`[IOTA Names] Discovering Name NFT types for owner: ${ownerAddress}`);
    
    const result = await iotaJsonRpc<{ data: any[] }>(
      'iota_getOwnedObjects',
      [
        ownerAddress,
        {
          filter: { MatchAll: [] },
          options: { showType: true, showContent: true }
        }
      ],
      network
    );
    
    if (!result?.data) {
      console.log('[IOTA Names] No owned objects found');
      return;
    }
    
    console.log(`[IOTA Names] Found ${result.data.length} owned objects`);
    
    // Filter and log objects with "name" in their type
    const nameObjects = result.data.filter(obj => {
      const type = obj.data?.type?.toLowerCase() || '';
      return type.includes('name');
    });
    
    console.log(`[IOTA Names] Found ${nameObjects.length} objects with "name" in type:`);
    nameObjects.forEach((obj, i) => {
      console.log(`  [${i}] Type: ${obj.data?.type}`);
      console.log(`      ObjectId: ${obj.data?.objectId}`);
      console.log(`      Content: ${JSON.stringify(obj.data?.content?.fields, null, 2)}`);
    });
  } catch (error) {
    console.error('[IOTA Names] Error discovering Name NFT type:', error);
  }
}
