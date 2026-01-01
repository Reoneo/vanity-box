import React, { useState } from 'react';
import { useWorldchainNFTs, NFTCollectionGroup, getNFTThumbnail } from '@/hooks/useWorldchainNFTs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Image, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorldchainNFTSectionProps {
  walletAddress?: string;
}

export const WorldchainNFTSection: React.FC<WorldchainNFTSectionProps> = ({ walletAddress }) => {
  const { collections, isLoading, error, refetch } = useWorldchainNFTs(walletAddress);
  const [selectedCollection, setSelectedCollection] = useState<NFTCollectionGroup | null>(null);

  if (!walletAddress) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-primary" />
            World Chain NFTs
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || collections.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-primary" />
            World Chain NFTs
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <div className="bg-muted/50 rounded-xl p-6 text-center">
          <Image className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No World Chain NFTs found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-primary" />
          World Chain NFTs
          <span className="text-xs text-muted-foreground font-normal">
            ({collections.reduce((sum, c) => sum + c.nftCount, 0)} total)
          </span>
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={refetch}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Collection Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {collections.map((collection) => (
          <button
            key={collection.contractAddress}
            onClick={() => setSelectedCollection(collection)}
            className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border hover:border-primary/50 transition-all duration-200 hover:scale-[1.02]"
          >
            {collection.coverImage ? (
              <img
                src={collection.coverImage}
                alt={collection.name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                  (e.target as HTMLImageElement).classList.add('hidden');
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                <Grid3X3 className="w-10 h-10 text-primary/50" />
              </div>
            )}
            
            {/* Overlay with collection info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
              <p className="text-white text-sm font-medium truncate">
                {collection.name}
              </p>
              <p className="text-white/70 text-xs">
                {collection.nftCount} {collection.nftCount === 1 ? 'item' : 'items'}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Collection Detail Modal */}
      <Dialog open={!!selectedCollection} onOpenChange={() => setSelectedCollection(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-primary" />
              {selectedCollection?.name}
              <span className="text-sm text-muted-foreground font-normal">
                ({selectedCollection?.nftCount} items)
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-4">
              {selectedCollection?.nfts.map((nft) => {
                const thumbnail = getNFTThumbnail(nft);
                return (
                  <div
                    key={`${nft.contract.address}-${nft.tokenId}`}
                    className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border"
                  >
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={nft.name || `Token #${nft.tokenId}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).classList.add('hidden');
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <Image className="w-8 h-8 text-primary/50" />
                      </div>
                    )}
                    
                    {/* NFT name overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-white text-xs font-medium truncate">
                        {nft.name || `#${nft.tokenId}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
