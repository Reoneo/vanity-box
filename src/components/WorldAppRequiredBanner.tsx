import React, { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import worldAppIcon from "@/assets/world-app-icon.png";

interface WorldAppRequiredBannerProps {
  onLearnMore: () => void;
}

export const WorldAppRequiredBanner: React.FC<WorldAppRequiredBannerProps> = ({ onLearnMore }) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <Alert className="border-warning/50 bg-warning/10 mb-4 relative">
      <AlertCircle className="h-4 w-4 text-warning" />
      <AlertDescription className="flex items-center justify-between gap-4 ml-2">
        <div className="flex items-center gap-2 flex-1">
          <img src={worldAppIcon} alt="World App" className="w-5 h-5" />
          <span className="text-sm text-foreground">
            To pay with <strong>WLD</strong> or <strong>USDC</strong>, open this page in World App
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLearnMore}
            className="h-7 text-xs hover:bg-warning/20"
          >
            How to?
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="h-7 w-7 p-0 hover:bg-warning/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
