import React from "react";
import {
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Globe,
} from "lucide-react";

import { 
  siBluesky, 
  siReddit, 
  siWhatsapp, 
  siFacebook, 
  siSnapchat, 
  siGithub,
  siTelegram,
  siDiscord
} from "simple-icons";

interface SocialIconProps {
  platform: string;
  url: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

// Official brand colors for each platform
const brandColors: Record<string, string> = {
  twitter: "#000000",
  x: "#000000",
  instagram: "#E4405F",
  linkedin: "#0A66C2",
  youtube: "#FF0000",
  bluesky: "#1185FE",
  reddit: "#FF4500",
  whatsapp: "#25D366",
  facebook: "#1877F2",
  snapchat: "#FFFC00",
  github: "#181717",
  telegram: "#26A5E4",
  discord: "#5865F2",
};

// Determine if icon should be inverted (white) or not (dark)
const shouldInvertIcon = (color: string) => {
  // Snapchat yellow needs dark icon, all others need white
  return color !== "#FFFC00";
};

export const SocialIcon = ({ 
  platform, 
  url, 
  size = 'md',
  onClick 
}: SocialIconProps) => {
  const platformLower = platform.toLowerCase();
  const brandColor = brandColors[platformLower] || "#D4AF37";
  const invert = shouldInvertIcon(brandColor);
  
  // Size configurations
  const sizeConfig = {
    sm: { container: "w-8 h-8", icon: "w-4 h-4" },
    md: { container: "w-10 h-10", icon: "w-5 h-5" },
    lg: { container: "w-12 h-12", icon: "w-6 h-6" },
  };
  
  const { container, icon } = sizeConfig[size];
  
  // Get the appropriate icon component
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
        return <svg className={icon} viewBox="0 0 24 24" fill="currentColor"><path d={siBluesky.path} /></svg>;
      case 'reddit':
        return <svg className={icon} viewBox="0 0 24 24" fill="currentColor"><path d={siReddit.path} /></svg>;
      case 'whatsapp':
        return <svg className={icon} viewBox="0 0 24 24" fill="currentColor"><path d={siWhatsapp.path} /></svg>;
      case 'facebook':
        return <svg className={icon} viewBox="0 0 24 24" fill="currentColor"><path d={siFacebook.path} /></svg>;
      case 'snapchat':
        return <svg className={icon} viewBox="0 0 24 24" fill="currentColor"><path d={siSnapchat.path} /></svg>;
      case 'github':
        return <svg className={icon} viewBox="0 0 24 24" fill="currentColor"><path d={siGithub.path} /></svg>;
      case 'telegram':
        return <svg className={icon} viewBox="0 0 24 24" fill="currentColor"><path d={siTelegram.path} /></svg>;
      case 'discord':
        return <svg className={icon} viewBox="0 0 24 24" fill="currentColor"><path d={siDiscord.path} /></svg>;
      default:
        return <Globe className={icon} />;
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <button
      onClick={handleClick}
      title={platform}
      className={`${container} flex items-center justify-center rounded-full shadow-md transition-all hover:scale-110`}
      style={{
        backgroundColor: brandColor,
      }}
    >
      <div
        style={{
          filter: invert ? "invert(1)" : "invert(0)",
        }}
      >
        {getIcon()}
      </div>
    </button>
  );
};
