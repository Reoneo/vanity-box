import React from "react";
import {
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Globe,
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
  
  // Size configurations
  const sizeConfig = {
    sm: { container: "w-8 h-8", icon: "w-4 h-4" },
    md: { container: "w-10 h-10", icon: "w-5 h-5" },
    lg: { container: "w-12 h-12", icon: "w-6 h-6" },
  };
  
  const { container, icon } = sizeConfig[size];

  // Brand colors for each platform
  const brandColors: Record<string, { bg: string; iconFilter: string }> = {
    twitter: { bg: "#000000", iconFilter: "invert(1)" },
    x: { bg: "#000000", iconFilter: "invert(1)" },
    instagram: { bg: "#E4405F", iconFilter: "invert(1)" },
    linkedin: { bg: "#0A66C2", iconFilter: "invert(1)" },
    youtube: { bg: "#FF0000", iconFilter: "invert(1)" },
    bluesky: { bg: "#1185FE", iconFilter: "invert(1)" },
    reddit: { bg: "#FF4500", iconFilter: "invert(1)" },
    whatsapp: { bg: "#25D366", iconFilter: "invert(1)" },
    facebook: { bg: "#1877F2", iconFilter: "invert(1)" },
    snapchat: { bg: "#FFFC00", iconFilter: "invert(0)" }, // Dark icon for yellow
    github: { bg: "#181717", iconFilter: "invert(1)" },
    telegram: { bg: "#26A5E4", iconFilter: "invert(1)" },
    discord: { bg: "#5865F2", iconFilter: "invert(1)" },
  };

  const colors = brandColors[platformLower] || { bg: "#D4AF37", iconFilter: "none" };
  
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
      style={{ backgroundColor: colors.bg }}
      className={`${container} flex items-center justify-center rounded-full shadow-md transition-all hover:scale-110`}
    >
      <div style={{ filter: colors.iconFilter }}>
        {getIcon()}
      </div>
    </button>
  );
};
