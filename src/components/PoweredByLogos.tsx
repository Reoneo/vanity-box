import React from "react";
import { cn } from "@/lib/utils";

// Assets
import ensLogo from "@/assets/ens-logo-blue-powered.png";
import efpLogoDark from "@/assets/efp-logo-dark.png";
import efpLogoLight from "@/assets/efp-logo-light.png";
import web3bioLogo from "@/assets/web3bio-logo-powered.png";
import namestoneDark from "@/assets/namestone-dark.png";
import namestoneLight from "@/assets/namestone-light.png";
import poapLogo from "@/assets/poap-logo.png";
import ethLogo from "@/assets/eth-logo-dark.svg";

/**
 * Tweak these if needed:
 * --footer-height : the actual height of your fixed gold footer (fallback 64px)
 * --footer-gap    : the VISIBLE spacing between the icon strip and the gold footer
 * --icon-gap      : equal gap between icons in the marquee
 *
 * If your footer already sets --footer-height on <footer>, this component will pick it up.
 */

const logos = [
  { light: ensLogo,        dark: ensLogo,        alt: "ENS",                  bigLight: false, bigDark: false },
  { light: efpLogoLight,   dark: efpLogoDark,    alt: "Ethereum Follow",      bigLight: true,  bigDark: true  },
  { light: web3bioLogo,    dark: web3bioLogo,    alt: "Web3.bio",             bigLight: true,  bigDark: true  },
  { light: namestoneLight, dark: namestoneDark,  alt: "Namestone",            bigLight: true,  bigDark: true  },
  { light: poapLogo,       dark: poapLogo,       alt: "POAP",                 bigLight: true,  bigDark: true  },
];

export const PoweredByLogos: React.FC = () => {
  const duplicated = [...logos, ...logos, ...logos, ...logos];

  return (
    <div
      className={cn(
        "relative z-10 w-full pt-3 md:pt-4",
        // Reserve space so the fixed footer never overlaps (invisible)
        "pb-[calc(var(--footer-height,64px)+env(safe-area-inset-bottom))]"
      )}
      style={{
        // Defaults; you can override globally or on the footer
        ["--footer-height" as any]: "64px",
        ["--footer-gap" as any]: "18px",          // visible space above the gold footer
        ["--icon-gap" as any]: "2rem",            // equal icon spacing (mobile)
      }}
    >
      {/* Heading */}
      <div className="text-center space-y-2 mb-4">
        <div className="flex items-center justify-center gap-2 w-full">
          <div className="w-6 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent flex-shrink-0" />
          <img
            src={ethLogo}
            alt="ETH"
            className="w-3 h-3 flex-shrink-0"
            style={{
              filter:
                "invert(67%) sepia(57%) saturate(571%) hue-rotate(6deg) brightness(91%) contrast(87%)",
            }}
          />
          <h3 className="text-base md:text-lg font-bold text-foreground dark:bg-gradient-to-r dark:from-[#D4AF37] dark:via-[#F4E4BC] dark:to-[#D4AF37] dark:bg-clip-text dark:text-transparent flex-shrink-0 whitespace-nowrap">
            Powered By
          </h3>
          <img
            src={ethLogo}
            alt="ETH"
            className="w-3 h-3 flex-shrink-0"
            style={{
              filter:
                "invert(67%) sepia(57%) saturate(571%) hue-rotate(6deg) brightness(91%) contrast(87%)",
            }}
          />
          <div className="w-6 h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent flex-shrink-0" />
        </div>
      </div>

      {/* Marquee strip */}
      <div className="relative overflow-hidden w-full">
        {/* Equal gaps between icons via CSS var; larger on md+ */}
        <div
          className="
            flex w-max animate-scroll
            gap-[var(--icon-gap)]
            md:gap-[3rem]
            min-h-[3rem] md:min-h-[3.5rem]
          "
        >
          {duplicated.map((logo, i) => (
            <div key={i} className="flex-shrink-0 flex items-center justify-center">
              {/* Light */}
              <img
                src={logo.light}
                alt={logo.alt}
                className={cn(
                  "w-auto object-contain dark:hidden",
                  logo.bigLight ? "h-12 md:h-14" : "h-6 md:h-7"
                )}
                draggable={false}
              />
              {/* Dark */}
              <img
                src={logo.dark}
                alt={logo.alt}
                className={cn(
                  "w-auto object-contain hidden dark:block",
                  logo.bigDark ? "h-12 md:h-14" : "h-6 md:h-7"
                )}
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Visible, consistent gap to the gold footer (adjust via --footer-gap) */}
      <div className="h-[var(--footer-gap)]" />

      {/* Optional soft fade above the footer – looks slick with the gold bar */}
      {/* <div className="pointer-events-none absolute left-0 right-0 -bottom-1 h-8 bg-gradient-to-b from-transparent to-background/60 dark:to-black/40" /> */}
    </div>
  );
};

export default PoweredByLogos;
