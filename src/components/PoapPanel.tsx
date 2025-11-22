import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { PoapDetailModal } from "./PoapDetailModal";

interface PoapToken {
  eventId: number;
  eventName: string;
  eventDescription?: string;
  eventImageUrl: string;
  eventStartDate?: string;
  eventEndDate?: string;
  eventYear: number;
  tokenId: string;
  owner?: string;
  chain?: string;
}

interface PoapPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poaps?: PoapToken[];
}

export const PoapPanel = ({ open, onOpenChange, poaps = [] }: PoapPanelProps) => {
  const [selectedPoap, setSelectedPoap] = useState<PoapToken | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-background via-background/95 to-background/90 border-[#D4AF37]/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#D4AF37]">🏅 POAPs</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {poaps.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No POAPs found
              </div>
            ) : (
              poaps.map((poap) => (
                <Card
                  key={poap.tokenId}
                  className="p-3 bg-card/50 backdrop-blur-sm border-border/50 hover:border-[#D4AF37]/30 transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedPoap(poap)}
                >
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-[#D4AF37]/20 mb-2">
                    <img
                      src={poap.eventImageUrl}
                      alt={poap.eventName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-xs font-semibold text-foreground text-center truncate">
                    {poap.eventName}
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    {poap.eventYear}
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedPoap && (
        <PoapDetailModal
          poap={selectedPoap}
          isOpen={!!selectedPoap}
          onClose={() => setSelectedPoap(null)}
        />
      )}
    </>
  );
};
