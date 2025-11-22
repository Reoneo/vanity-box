import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface NftCarouselProps {
  walletAddress: string;
}

interface NFT {
  id: string;
  name: string;
  description: string;
  image_url: string;
  collection: string;
  permalink: string;
}

export const NftCarousel: React.FC<NftCarouselProps> = ({ walletAddress }) => {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (isModalOpen && nfts.length === 0) {
      fetchNfts();
    }
  }, [isModalOpen]);

  const fetchNfts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase.functions.invoke("get-opensea-nfts", {
        body: { walletAddress },
      });

      if (fetchError) {
        console.error("Error fetching NFTs:", fetchError);
        setError("Failed to load NFTs");
        return;
      }

      if (data?.success && data?.nfts) {
        setNfts(data.nfts);
      } else {
        setError("No NFTs found");
      }
    } catch (err) {
      console.error("Error fetching NFTs:", err);
      setError("Failed to load NFTs");
    } finally {
      setIsLoading(false);
    }
  };

  const nextNft = () => {
    setCurrentIndex((prev) => (prev + 1) % nfts.length);
  };

  const previousNft = () => {
    setCurrentIndex((prev) => (prev - 1 + nfts.length) % nfts.length);
  };

  const currentNft = nfts[currentIndex];

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-gradient-to-r from-[#D4AF37] to-[#F7E06C] hover:from-[#F7E06C] hover:to-[#D4AF37] text-black font-semibold py-3 rounded-lg shadow-lg transition-all duration-300"
      >
        🖼️ View NFTs
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#D4AF37] text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#D4AF37] flex items-center gap-2">
              🖼️ NFT Collection
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="w-full h-96 rounded-lg" />
              <Skeleton className="w-3/4 h-6" />
              <Skeleton className="w-full h-20" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400">{error}</p>
            </div>
          ) : nfts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No NFTs found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-xl overflow-hidden border-2 border-[#D4AF37]/30 bg-black/20">
                {currentNft?.image_url ? (
                  <img
                    src={currentNft.image_url}
                    alt={currentNft.name}
                    className="w-full h-96 object-contain"
                  />
                ) : (
                  <div className="w-full h-96 flex items-center justify-center bg-gray-800">
                    <p className="text-gray-500">No image available</p>
                  </div>
                )}

                {nfts.length > 1 && (
                  <>
                    <Button
                      onClick={previousNft}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 border border-[#D4AF37]/50"
                      size="icon"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <Button
                      onClick={nextNft}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 border border-[#D4AF37]/50"
                      size="icon"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">{currentNft?.name}</h3>
                  <a
                    href={currentNft?.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#D4AF37] hover:text-[#F7E06C] transition-colors"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                </div>
                
                {currentNft?.description && (
                  <p className="text-gray-300 text-sm">{currentNft.description}</p>
                )}
                
                <p className="text-xs text-gray-500">
                  {currentIndex + 1} of {nfts.length}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
