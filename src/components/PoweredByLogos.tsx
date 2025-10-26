import React from 'react';
import { cn } from '@/lib/utils';
import ensLogo from '@/assets/ens-logo-blue-powered.png';
import efpLogoDark from '@/assets/efp-logo-dark.png';
import efpLogoLight from '@/assets/efp-logo-light.png';
import web3bioLogo from '@/assets/web3bio-logo-powered.png';
import namestoneDark from '@/assets/namestone-dark.png';
import namestoneLight from '@/assets/namestone-light.png';
import poapLogo from '@/assets/poap-logo.png';
import ethLogo from '@/assets/eth-logo-dark.svg';

const logos = [
  { light: ensLogo, dark: ensLogo, alt: 'ENS', needsBorder: true },
  { light: efpLogoLight, dark: efpLogoDark, alt: 'EFP', needsBorder: false },
  { light: web3bioLogo, dark: web3bioLogo, alt: 'Web3.bio', needsBorder: true },
  { light: namestoneLight, dark: namestoneDark, alt: 'NameStone', needsBorder: false },
  { light: poapLogo, dark: poapLogo, alt: 'POAP', needsBorder: false },
];

export const PoweredByLogos: React.FC = () => {
  // Duplicate logos for seamless loop
  const duplicatedLogos = [...logos, ...logos, ...logos];

  return (
    <div className="w-full py-3 md:py-4 overflow-hidden">
      {/* Heading */}
      <div className="text-center space-y-2 mb-3">
        <div className="flex items-center justify-center gap-2 w-full">
          <div className="w-6 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent flex-shrink-0" />
          <img src={ethLogo} alt="ETH" className="w-3 h-3 brightness-0 saturate-100 flex-shrink-0" style={{ filter: 'invert(67%) sepia(57%) saturate(571%) hue-rotate(6deg) brightness(91%) contrast(87%)' }} />
          <h3 className="text-base md:text-lg font-bold bg-gradient-to-r from-[#D4AF37] via-[#F4E4BC] to-[#D4AF37] bg-clip-text text-transparent flex-shrink-0 whitespace-nowrap">
            Powered By
          </h3>
          <img src={ethLogo} alt="ETH" className="w-3 h-3 brightness-0 saturate-100 flex-shrink-0" style={{ filter: 'invert(67%) sepia(57%) saturate(571%) hue-rotate(6deg) brightness(91%) contrast(87%)' }} />
          <div className="w-6 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent flex-shrink-0" />
        </div>
      </div>

      {/* Scrolling Logos */}
      <div className="relative">
        <div className="flex gap-8 md:gap-12 animate-scroll">
          {duplicatedLogos.map((logo, index) => (
            <div
              key={index}
              className="flex-shrink-0 flex items-center justify-center"
            >
              {/* Light mode logo */}
              <img
                src={logo.light}
                alt={logo.alt}
                className={cn(
                  "h-6 md:h-7 w-auto object-contain dark:hidden",
                  logo.needsBorder && "border border-transparent"
                )}
              />
              {/* Dark mode logo */}
              <img
                src={logo.dark}
                alt={logo.alt}
                className={cn(
                  "h-6 md:h-7 w-auto object-contain hidden dark:block",
                  logo.needsBorder && "border border-white/20 rounded px-2 py-1"
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
