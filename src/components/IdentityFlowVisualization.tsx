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
    <div className="relative w-full py-8 px-4">
      {/* Ambient glow background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 via-transparent to-[#D4AF37]/5 rounded-3xl blur-3xl" />
      
      <div className="relative flex flex-col items-center gap-6">
        {/* World ID - Top */}
        <div className="relative group w-full max-w-md">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
          <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 border-2 border-[#D4AF37]/40 rounded-2xl p-6 text-center">
            <div className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest mb-2">World ID</div>
            <div className="font-mono text-sm text-gray-300">{worldId}</div>
          </div>
        </div>

        {/* Arrow Down with Animation */}
        <div className="relative">
          <div className="absolute inset-0 animate-pulse">
            <ArrowDown className="w-8 h-8 text-[#D4AF37]/30" />
          </div>
          <ArrowDown className="w-8 h-8 text-[#D4AF37] relative z-10" strokeWidth={3} />
        </div>

        {/* Vanity Name - Center (Matching Size) */}
        <div className="relative group w-full max-w-md">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
          <div className="relative bg-gradient-to-br from-gray-900 via-black to-gray-900 border-2 border-[#D4AF37]/40 rounded-2xl p-6 text-center">
            <div className="text-sm font-mono text-gray-300 break-all">
              {vanityName}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
