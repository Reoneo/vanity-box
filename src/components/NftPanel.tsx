import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { callEdge } from "@/lib/supaInvoke";
import { ExternalLink, Loader2 } from "lucide-react";

interface NftPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletAddress?: string;
}

export const NftPanel = ({ open, onOpenChange, walletAddress }: NftPanelProps) => {
  const [nfts, setNfts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (open && walletAddress) {
      fetchNfts();
    }
  }, [open, walletAddress]);

  const fetchNfts = async (next?: string) => {
    try {
      if (next) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const data = await callEdge("get-opensea-nfts", {
        walletAddress,
        limit: 20,
        next,
      });

      if (next) {
        setNfts((prev) => [...prev, ...data.nfts]);
      } else {
        setNfts(data.nfts);
      }
      setNextCursor(data.next);
      setError(null);
    } catch (err) {
      console.error("Error fetching NFTs:", err);
      setError(err instanceof Error ? err.message : "Failed to load NFTs");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchNfts(nextCursor);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-background via-background/95 to-background/90 border-[#D4AF37]/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#D4AF37]">🖼️ NFTs</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="p-3 bg-card/50">
                  <Skeleton className="aspect-square rounded-lg mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-1" />
                  <Skeleton className="h-3 w-1/2" />
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-muted-foreground">{error}</div>
          ) : nfts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No NFTs found</div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {nfts.map((nft, index) => (
                  <Card
                    key={`${nft.contract}-${nft.identifier}-${index}`}
                    className="p-3 bg-card/50 backdrop-blur-sm border-border/50 hover:border-[#D4AF37]/30 transition-all duration-300"
                  >
                    <div className="aspect-square rounded-lg overflow-hidden border-2 border-[#D4AF37]/20 mb-2 bg-black/20">
                      {nft.image_url ? (
                        <img
                          src={nft.image_url}
                          alt={nft.name || 'NFT'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-foreground truncate">
                        {nft.name || `#${nft.identifier}`}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {nft.collection}
                      </div>
                      {nft.opensea_url && (
                        <a
                          href={nft.opensea_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-[#D4AF37] hover:underline"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {nextCursor && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
