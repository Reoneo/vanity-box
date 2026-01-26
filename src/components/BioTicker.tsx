import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BioTickerProps {
  bio: string;
}

export const BioTicker = ({ bio }: BioTickerProps) => {
  const [showBioModal, setShowBioModal] = useState(false);

  return (
    <>
      {/* Bio row - inline with icon, same width as pill buttons */}
      <button
        onClick={() => setShowBioModal(true)}
        className="flex items-center justify-center gap-2 px-4 w-full group"
      >
        <div className="flex items-center gap-2 max-w-[370px] overflow-hidden">
          <span className="text-sm font-semibold text-foreground flex-shrink-0">Bio:</span>
          <div className="overflow-hidden">
            <div className="animate-ticker whitespace-nowrap">
              <span className="text-sm text-[#D4AF37] hover:underline">
                {bio}
              </span>
              {/* Spacer and duplicate for seamless loop */}
              <span className="inline-block w-16" />
              <span className="text-sm text-[#D4AF37]">
                {bio}
              </span>
            </div>
          </div>
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
