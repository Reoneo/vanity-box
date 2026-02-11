import React, { useState } from "react";
import {
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Globe,
  Copy,
  Check,
} from "lucide-react";
import { 
  SiBluesky, 
  SiReddit, 
  SiWhatsapp, 
  SiFacebook, 
  SiSnapchat, 
  SiGithub, 
  SiTelegram, 
  SiDiscord 
} from "react-icons/si";
import { normalizeSocialUrl } from "@/lib/socialLinks";
import { toast } from "sonner";

interface SocialIconProps {
  platform: string;
  url: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const SocialIcon = ({ 
  platform, 
  url, 
  size = 'md',
  onClick 
}: SocialIconProps) => {
  const platformLower = platform.toLowerCase();
  const [copied, setCopied] = useState(false);
  
  const sizeConfig = {
    sm: { container: "w-8 h-8", icon: "w-4 h-4" },
    md: { container: "w-10 h-10", icon: "w-5 h-5" },
    lg: { container: "w-12 h-12", icon: "w-6 h-6" },
  };
  
  const { container, icon } = sizeConfig[size];
  
  const getIcon = () => {
    switch (platformLower) {
      case 'twitter':
      case 'x':
        return <Twitter className={icon} />;
      case 'instagram':
        return <Instagram className={icon} />;
      case 'linkedin':
        return <Linkedin className={icon} />;
      case 'youtube':
        return <Youtube className={icon} />;
      case 'bluesky':
        return <SiBluesky className={icon} />;
      case 'reddit':
        return <SiReddit className={icon} />;
      case 'whatsapp':
        return <SiWhatsapp className={icon} />;
      case 'facebook':
        return <SiFacebook className={icon} />;
      case 'snapchat':
        return <SiSnapchat className={icon} />;
      case 'github':
        return <SiGithub className={icon} />;
      case 'telegram':
        return <SiTelegram className={icon} />;
      case 'discord':
        return <SiDiscord className={icon} />;
      default:
        return <Globe className={icon} />;
    }
  };

  // Normalize the URL for this platform
  const normalized = normalizeSocialUrl(platformLower, url);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
      return;
    }
    // Discord username (not an invite link) → copy to clipboard
    if (normalized.isDiscordUsername) {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(normalized.displayHandle);
      setCopied(true);
      toast.success(`Copied Discord username: ${normalized.displayHandle}`);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    // Don't handle click here — let the parent <a> handle navigation
  };

  return (
    <div
      onClick={handleClick}
      title={normalized.isDiscordUsername ? `Discord: ${normalized.displayHandle} (click to copy)` : platform}
      className={`${container} flex items-center justify-center rounded-full bg-[#D4AF37]/80 shadow-md transition-all hover:scale-110`}
    >
      <div className="text-black">
        {normalized.isDiscordUsername && copied ? <Check className={icon} /> : getIcon()}
      </div>
    </div>
  );
};
