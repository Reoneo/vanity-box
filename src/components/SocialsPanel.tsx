import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

// Social icons mapping
import telegramIcon from "@/assets/telegram-icon.png";
import discordIcon from "@/assets/discord-icon.png";
import githubIcon from "@/assets/github-icon.png";
import instagramIcon from "@/assets/instagram-icon.png";
import linkedinIcon from "@/assets/linkedin-icon.png";
import redditIcon from "@/assets/reddit-icon.png";
import blueskyIcon from "@/assets/bluesky-icon.png";
import whatsappIcon from "@/assets/whatsapp-icon.png";

const socialIcons: Record<string, string> = {
  telegram: telegramIcon,
  discord: discordIcon,
  github: githubIcon,
  instagram: instagramIcon,
  linkedin: linkedinIcon,
  reddit: redditIcon,
  bluesky: blueskyIcon,
  whatsapp: whatsappIcon,
};

interface SocialsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  socialLinks?: Record<string, string>;
}

export const SocialsPanel = ({ open, onOpenChange, socialLinks }: SocialsPanelProps) => {
  const socialEntries = socialLinks ? Object.entries(socialLinks).filter(([_, url]) => url) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-background via-background/95 to-background/90 border-[#D4AF37]/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#D4AF37]">🔗 Social Links</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {socialEntries.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              No social links available
            </div>
          ) : (
            socialEntries.map(([platform, url]) => (
              <Card
                key={platform}
                className="p-4 bg-card/50 backdrop-blur-sm border-border/50 hover:border-[#D4AF37]/30 transition-all duration-300"
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 group"
                >
                  {socialIcons[platform.toLowerCase()] && (
                    <img
                      src={socialIcons[platform.toLowerCase()]}
                      alt={platform}
                      className="w-8 h-8 rounded-full border border-[#D4AF37]/20"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground capitalize">{platform}</div>
                    <div className="text-xs text-muted-foreground truncate">{url}</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
