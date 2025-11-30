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
      className={`${container} flex items-center justify-center rounded-full bg-yellow-400/80 shadow-md transition-all hover:scale-110`}
    >
      <div className="text-black dark:text-white">
        {getIcon()}
      </div>
    </button>
  );
};
