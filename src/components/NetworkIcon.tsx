import React from "react";
import { useWalletConnect } from "@/contexts/WalletConnectContext";

// Import network logos
import ethLogo from "@/assets/eth-logo.png";
import wldLogo from "@/assets/wld-logo.png";

interface NetworkIconProps {
  size?: number;
  chainId?: number;
}

// Network chain IDs
const CHAIN_IDS = {
  ETHEREUM: 1,
  WORLDCHAIN: 480,
  POLYGON: 137,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  BASE: 8453,
  BSC: 56,
  AVALANCHE: 43114,
};

// Get network icon component based on chain ID
const getNetworkIcon = (chainId: number | null, size: number) => {
  const iconClass = `rounded-full`;
  
  switch (chainId) {
    case CHAIN_IDS.ETHEREUM:
      return <img src={ethLogo} alt="Ethereum" width={size} height={size} className={iconClass} />;
    case CHAIN_IDS.WORLDCHAIN:
      return <img src={wldLogo} alt="World Chain" width={size} height={size} className={iconClass} />;
    case CHAIN_IDS.POLYGON:
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#8247E5" />
          <path d="M21.2 13.2c-.5-.3-1.1-.3-1.5 0l-3.5 2-2.4 1.4-3.5 2c-.5.3-1.1.3-1.5 0l-2.7-1.6c-.5-.3-.8-.8-.8-1.4v-3.1c0-.6.3-1.1.8-1.4l2.7-1.5c.5-.3 1.1-.3 1.5 0l2.7 1.6c.5.3.8.8.8 1.4v2l2.4-1.4v-2c0-.6-.3-1.1-.8-1.4l-5-2.9c-.5-.3-1.1-.3-1.5 0l-5.1 2.9c-.5.3-.8.8-.8 1.4v5.8c0 .6.3 1.1.8 1.4l5.1 2.9c.5.3 1.1.3 1.5 0l3.5-2 2.4-1.4 3.5-2c.5-.3 1.1-.3 1.5 0l2.7 1.5c.5.3.8.8.8 1.4v3.1c0 .6-.3 1.1-.8 1.4l-2.7 1.6c-.5.3-1.1.3-1.5 0l-2.7-1.6c-.5-.3-.8-.8-.8-1.4v-2l-2.4 1.4v2c0 .6.3 1.1.8 1.4l5.1 2.9c.5.3 1.1.3 1.5 0l5.1-2.9c.5-.3.8-.8.8-1.4v-5.8c0-.6-.3-1.1-.8-1.4l-5.1-2.9z" fill="#fff"/>
        </svg>
      );
    case CHAIN_IDS.ARBITRUM:
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#2D374B" />
          <path d="M16.6 8.5l6.9 11c.2.3.2.7 0 1l-2.5 4c-.2.3-.5.5-.9.5h-8.2c-.4 0-.7-.2-.9-.5l-2.5-4c-.2-.3-.2-.7 0-1l6.9-11c.4-.6 1.4-.6 1.8 0h-.6z" fill="#28A0F0"/>
          <path d="M15.4 13l-4.9 7.8 2 3.2h6.8l-3.9-11z" fill="#fff"/>
        </svg>
      );
    case CHAIN_IDS.OPTIMISM:
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#FF0420" />
          <path d="M10.5 20.5c-1.9 0-3.4-.6-4.5-1.7-1.1-1.2-1.6-2.8-1.6-4.8 0-2.2.6-4 1.8-5.4 1.2-1.4 2.9-2.1 5-2.1 1.9 0 3.3.5 4.3 1.6 1 1 1.5 2.5 1.5 4.3v.8H7.5c0 1.3.3 2.3 1 3 .6.7 1.5 1 2.6 1 .8 0 1.5-.1 2-.4.6-.3 1-.7 1.3-1.3h3.4c-.5 1.4-1.3 2.5-2.5 3.3-1.1.8-2.5 1.2-4.2 1.2h-.6z" fill="#fff"/>
        </svg>
      );
    case CHAIN_IDS.BASE:
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#0052FF" />
          <path d="M16 26c5.523 0 10-4.477 10-10S21.523 6 16 6 6 10.477 6 16s4.477 10 10 10z" fill="#0052FF"/>
          <path d="M16 24c4.418 0 8-3.582 8-8s-3.582-8-8-8c-4.08 0-7.446 3.054-7.938 7h11.876v2H8.062c.492 3.946 3.858 7 7.938 7z" fill="#fff"/>
        </svg>
      );
    case CHAIN_IDS.BSC:
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
          <path d="M12.1 14.5l3.9-3.9 3.9 3.9 2.3-2.3L16 6l-6.2 6.2 2.3 2.3zm-4.6 1.5L5.2 16l2.3 2.3L9.8 16l-2.3-2zm4.6 1.5L16 21.4l3.9-3.9 2.3 2.3-6.2 6.2-6.2-6.2 2.3-2.4v.1zm10.7-1.5L20.5 16l2.3 2.3 2.3-2.3-2.3-2zM18.3 16L16 13.7 14.3 15.4l-.4.4-.3.2 2.4 2.4L18.3 16z" fill="#fff"/>
        </svg>
      );
    case CHAIN_IDS.AVALANCHE:
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={iconClass}>
          <circle cx="16" cy="16" r="16" fill="#E84142" />
          <path d="M20.3 21h3.5c.6 0 .9 0 1.1-.2.2-.1.4-.4.4-.6 0-.2-.1-.5-.2-.8l-7.6-13.5c-.2-.3-.4-.6-.6-.7-.2-.2-.5-.2-.9-.2s-.7.1-.9.2c-.2.2-.4.4-.6.7L13 8.8l-1.7 3-.1.2c-.2.3-.3.6-.3.9 0 .3.1.5.3.7.2.2.5.3.8.3h4.3l.2.1c.2.1.3.3.5.6l2.4 4.4c.2.3.3.5.3.7 0 .2-.1.5-.3.7-.2.2-.5.3-.9.3H11.9c-.4 0-.7 0-.9.2-.2.2-.4.4-.4.7 0 .2.1.5.2.8l1.5 2.7c.2.3.3.5.5.7.2.1.5.2.9.2h6.6z" fill="#fff"/>
        </svg>
      );
    default:
      // Default network icon
      return <img src={ethLogo} alt="Network" width={size} height={size} className={iconClass} />;
  }
};

export const NetworkIcon: React.FC<NetworkIconProps> = ({ size = 20, chainId: propChainId }) => {
  const { chainId: contextChainId } = useWalletConnect();
  const chainId = propChainId ?? contextChainId;
  
  return getNetworkIcon(chainId, size);
};
