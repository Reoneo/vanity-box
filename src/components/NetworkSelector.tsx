import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useParaWallet } from '@/contexts/ParaContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Chain configurations with logo URLs
const CHAINS = [
  { 
    id: 480, 
    name: 'World Chain', 
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/worldchain/info/logo.png',
    fallbackLogo: 'https://worldcoin.org/icons/wld-token-new.svg'
  },
  { 
    id: 1, 
    name: 'Ethereum', 
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png'
  },
  { 
    id: 8453, 
    name: 'Base', 
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png'
  },
  { 
    id: 137, 
    name: 'Polygon', 
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png'
  },
  { 
    id: 42161, 
    name: 'Arbitrum', 
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png'
  },
  { 
    id: 10, 
    name: 'Optimism', 
    logo: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png'
  },
];

interface NetworkSelectorProps {
  className?: string;
}

export const NetworkSelector: React.FC<NetworkSelectorProps> = ({ className }) => {
  const { wallet, switchNetwork } = useParaWallet();
  const [isSwitching, setIsSwitching] = React.useState(false);

  // Only show when Para wallet is connected
  if (!wallet.isConnected) {
    return null;
  }

  const currentChain = CHAINS.find(c => c.id === wallet.chainId) || CHAINS[0]; // Default to World Chain

  const handleNetworkSwitch = async (chainId: number) => {
    if (chainId === wallet.chainId) return;
    
    setIsSwitching(true);
    try {
      await switchNetwork(chainId);
      const chain = CHAINS.find(c => c.id === chainId);
      toast.success(`Switched to ${chain?.name || 'network'}`);
    } catch (error: any) {
      console.error('Network switch failed:', error);
      if (error.code === 4001) {
        toast.error('Network switch cancelled');
      } else {
        toast.error(`Failed to switch: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isSwitching}
          className={cn(
            "h-10 px-3 bg-[#1a1a1a] text-white border border-[#333] hover:bg-[#252525] hover:border-[#444] transition-all duration-200 font-medium flex items-center gap-2",
            className
          )}
        >
          <img 
            src={currentChain.logo} 
            alt={currentChain.name}
            className="w-5 h-5 rounded-full"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if ((currentChain as any).fallbackLogo) {
                target.src = (currentChain as any).fallbackLogo;
              }
            }}
          />
          <span className="hidden sm:inline text-sm">{currentChain.name}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 bg-[#1a1a1a] border border-[#333] shadow-xl rounded-xl p-1 z-[10000]"
      >
        {CHAINS.map((chain) => (
          <DropdownMenuItem
            key={chain.id}
            onClick={() => handleNetworkSwitch(chain.id)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg text-white hover:bg-[#252525] transition-colors",
              chain.id === wallet.chainId && "bg-[#252525]"
            )}
          >
            <img 
              src={chain.logo} 
              alt={chain.name}
              className="w-6 h-6 rounded-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if ((chain as any).fallbackLogo) {
                  target.src = (chain as any).fallbackLogo;
                }
              }}
            />
            <span className="text-sm font-medium">{chain.name}</span>
            {chain.id === wallet.chainId && (
              <div className="ml-auto w-2 h-2 rounded-full bg-green-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NetworkSelector;
