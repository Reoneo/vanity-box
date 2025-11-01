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

        {/* Vanity Name - Center (Large & Premium) */}
        <div className="relative group w-full max-w-2xl">
          <div className="absolute -inset-2 bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] rounded-3xl blur-2xl opacity-50 group-hover:opacity-70 transition-opacity animate-pulse" />
          <div className="relative bg-gradient-to-br from-[#D4AF37]/20 via-black to-[#D4AF37]/20 border-4 border-[#D4AF37] rounded-3xl p-8 sm:p-12 text-center shadow-[0_0_80px_rgba(212,175,55,0.3)]">
            <div className="text-3xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] bg-clip-text text-transparent mb-2">
              {vanityName}
            </div>
            <div className="text-xs sm:text-sm text-[#D4AF37]/70 font-semibold uppercase tracking-wider">Premium Identity</div>
          </div>
        </div>

        {/* Arrow Down */}
        <div className="relative">
          <div className="absolute inset-0 animate-pulse">
            <ArrowDown className="w-8 h-8 text-[#D4AF37]/30" />
          </div>
          <ArrowDown className="w-8 h-8 text-[#D4AF37] relative z-10" strokeWidth={3} />
        </div>

        {/* Connected Services - Bottom */}
        <div className="relative w-full max-w-4xl">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37]/20 via-transparent to-[#D4AF37]/20 rounded-2xl blur-xl" />
          <div className="relative bg-gradient-to-br from-gray-900/80 via-black/90 to-gray-900/80 border border-[#D4AF37]/30 rounded-2xl p-6 sm:p-8">
            <div className="text-center text-xs font-semibold text-[#D4AF37] uppercase tracking-widest mb-6">Connected Services</div>
            
            <div className="grid grid-cols-5 gap-3 sm:gap-6">
              {/* Twitter */}
              <div className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="relative">
                  <div className="absolute -inset-2 bg-[#1DA1F2]/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-[#1DA1F2]/10 to-[#1DA1F2]/5 border border-[#1DA1F2]/30 flex items-center justify-center group-hover:border-[#1DA1F2] transition-all">
                    <Twitter className="w-6 h-6 sm:w-8 sm:h-8 text-[#1DA1F2]" />
                  </div>
                </div>
                <span className="text-[9px] sm:text-xs text-gray-400 group-hover:text-[#1DA1F2] transition-colors">Social</span>
              </div>

              {/* Website */}
              <div className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="relative">
                  <div className="absolute -inset-2 bg-[#D4AF37]/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/30 flex items-center justify-center group-hover:border-[#D4AF37] transition-all">
                    <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-[#D4AF37]" />
                  </div>
                </div>
                <span className="text-[9px] sm:text-xs text-gray-400 group-hover:text-[#D4AF37] transition-colors">Website</span>
              </div>

              {/* Passport */}
              <div className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="relative">
                  <div className="absolute -inset-2 bg-[#D4AF37]/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/30 flex items-center justify-center group-hover:border-[#D4AF37] transition-all">
                    <FaPassport className="w-6 h-6 sm:w-8 sm:h-8 text-[#D4AF37]" />
                  </div>
                </div>
                <span className="text-[9px] sm:text-xs text-gray-400 group-hover:text-[#D4AF37] transition-colors">Passport</span>
              </div>

              {/* License */}
              <div className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="relative">
                  <div className="absolute -inset-2 bg-[#D4AF37]/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/30 flex items-center justify-center group-hover:border-[#D4AF37] transition-all">
                    <FaIdCard className="w-6 h-6 sm:w-8 sm:h-8 text-[#D4AF37]" />
                  </div>
                </div>
                <span className="text-[9px] sm:text-xs text-gray-400 group-hover:text-[#D4AF37] transition-colors">License</span>
              </div>

              {/* Wallet */}
              <div className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="relative">
                  <div className="absolute -inset-2 bg-[#D4AF37]/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/30 flex items-center justify-center group-hover:border-[#D4AF37] transition-all">
                    <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-[#D4AF37]" />
                  </div>
                </div>
                <span className="text-[9px] sm:text-xs text-gray-400 group-hover:text-[#D4AF37] transition-colors">Wallet</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
