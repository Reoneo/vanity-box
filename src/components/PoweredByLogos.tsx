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
  { light: ensLogo, dark: ensLogo, alt: 'ENS', largerInLight: false, largerInDark: false },
  { light: efpLogoLight, dark: efpLogoDark, alt: 'EFP', largerInLight: true, largerInDark: true },
  { light: web3bioLogo, dark: web3bioLogo, alt: 'Web3.bio', largerInLight: true, largerInDark: true },
  { light: namestoneLight, dark: namestoneDark, alt: 'NameStone', largerInLight: true, largerInDark: true },
  { light: poapLogo, dark: poapLogo, alt: 'POAP', largerInLight: true, largerInDark: true },
];

export const PoweredByLogos: React.FC = () => {
  // Duplicate logos multiple times for seamless loop
  const duplicatedLogos = [...logos, ...logos, ...logos, ...logos];

  return (
    <div className="w-full py-4 overflow-hidden opacity-90 hover:opacity-100 transition-opacity duration-300">
      {/* Heading - More subtle */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 w-full">
          <div className="w-8 h-[1px] bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent flex-shrink-0" />
          <h3 className="text-sm font-medium text-muted-foreground flex-shrink-0 whitespace-nowrap">
            Powered By
          </h3>
          <div className="w-8 h-[1px] bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent flex-shrink-0" />
        </div>
      </div>

      {/* Scrolling Logos - Smoother animation */}
      <div className="relative overflow-hidden w-full">
        <div className="flex gap-8 md:gap-10 animate-scroll w-max">
          {duplicatedLogos.map((logo, index) => (
            <div
              key={index}
              className="flex-shrink-0 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity duration-200"
            >
              {/* Light mode logo */}
              <img
                src={logo.light}
                alt={logo.alt}
                className={cn(
                  "w-auto object-contain dark:hidden",
                  logo.largerInLight ? "h-10 md:h-12" : "h-5 md:h-6"
                )}
              />
              {/* Dark mode logo */}
              <img
                src={logo.dark}
                alt={logo.alt}
                className={cn(
                  "w-auto object-contain hidden dark:block",
                  logo.largerInDark ? "h-10 md:h-12" : "h-5 md:h-6"
                )}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
