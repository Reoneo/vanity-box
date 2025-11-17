import { ArrowDown } from 'lucide-react';
import { Twitter, Globe, Wallet } from 'lucide-react';
import { FaPassport, FaIdCard } from 'react-icons/fa';

interface IdentityFlowVisualizationProps {
  worldId: string;
  vanityName: string;
}

export const IdentityFlowVisualization: React.FC<IdentityFlowVisualizationProps> = ({
  worldId,
  vanityName,
}) => {
  return (
    <div className="relative w-full pt-1 pb-0.5 px-2">
      {/* Ambient glow background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 via-transparent to-[#D4AF37]/5 rounded-2xl blur-2xl" />
      
      <div className="relative flex flex-col items-center gap-1">
        {/* World ID - Top */}
        <div className="relative group w-full max-w-sm">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] rounded-xl blur-md opacity-30 group-hover:opacity-50 transition-opacity" />
          <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-[#D4AF37]/40 rounded-lg p-2 text-center">
            <div className="text-[10px] font-semibold text-[#D4AF37] uppercase tracking-wider mb-0.5">World ID</div>
            <div className="font-mono text-xs text-gray-300">{worldId}</div>
          </div>
        </div>

        {/* Arrow Down with Animation */}
        <div className="relative">
          <div className="absolute inset-0 animate-pulse">
            <ArrowDown className="w-4 h-4 text-[#D4AF37]/30" />
          </div>
          <ArrowDown className="w-4 h-4 text-[#D4AF37] relative z-10" strokeWidth={2.5} />
        </div>

        {/* Vanity Name - Center */}
        <div className="relative group w-full max-w-sm">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] rounded-xl blur-md opacity-30 group-hover:opacity-50 transition-opacity" />
          <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-[#D4AF37]/40 rounded-lg p-2 text-center">
            <div className="text-[10px] font-semibold text-[#D4AF37] uppercase tracking-wider mb-0.5">Premium Identity</div>
            <div className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] bg-clip-text text-transparent whitespace-nowrap px-1">
              {vanityName}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
