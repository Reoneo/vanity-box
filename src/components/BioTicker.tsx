import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BioTickerProps {
  bio: string;
}

export const BioTicker = ({ bio }: BioTickerProps) => {
  const [showBioModal, setShowBioModal] = useState(false);

  return (
    <>
      {/* News Ticker Style Bio */}
      <button
        onClick={() => setShowBioModal(true)}
        className="w-full overflow-hidden py-1.5 px-4 bg-muted/30 border-y border-border/20 hover:bg-muted/50 transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-2 animate-ticker whitespace-nowrap">
          <span className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wide flex-shrink-0">
            Bio:
          </span>
          <span className="text-sm text-black dark:text-white">
            {bio}
          </span>
          {/* Duplicate for seamless loop */}
          <span className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wide flex-shrink-0 ml-12">
            Bio:
          </span>
          <span className="text-sm text-black dark:text-white">
            {bio}
          </span>
        </div>
      </button>

      {/* Bio Popup Modal */}
      <Dialog open={showBioModal} onOpenChange={setShowBioModal}>
        <DialogContent className="max-w-sm bg-background/95 backdrop-blur-lg border-2 border-[#D4AF37]/30 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-center text-[#D4AF37]">
              Bio
            </DialogTitle>
          </DialogHeader>
          <div className="px-2 py-4">
            <p className="text-sm text-foreground leading-relaxed text-center">
              {bio}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
