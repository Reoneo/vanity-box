const logos = [
  { light: ensLogo,       dark: ensLogo,       alt: "ENS",        largerInLight: false, largerInDark: false },
  { light: efpLogoLight,  dark: efpLogoDark,   alt: "EFP",        largerInLight: true,  largerInDark: true  },
  { light: web3bioLogo,   dark: web3bioLogo,   alt: "Web3.bio",   largerInLight: true,  largerInDark: true  },
  { light: namestoneLight,dark: namestoneDark, alt: "NameStone",  largerInLight: true,  largerInDark: true  },
  { light: poapLogo,      dark: poapLogo,      alt: "POAP",       largerInLight: true,  largerInDark: true  },
];

export const PoweredByLogos: React.FC = () => {
  // Duplicate for seamless marquee
  const duplicated = [...logos, ...logos, ...logos, ...logos];

  return (
    <div
      className={cn(
        // Top/bottom space + ensure it sits ABOVE the fixed footer
        "relative z-10 w-full pt-3 md:pt-4",
        // Reserve space for the footer (default 64px) + safe area for iOS
        // Tailwind arbitrary value supports calc() with CSS var fallback
        "pb-[calc(var(--footer-height,64px)+env(safe-area-inset-bottom))]"
      )}
      // Provide a default var in case the footer doesn't set it
      style={
        { ["--footer-height" as any]: "64px" } // adjust if your footer is a different height
      }
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

      {/* Marquee */}
      <div className="relative overflow-hidden w-full mb-4">
        {/* Avoid clipping: give a small min-height so tall logos won't get cropped by parent overflow */}
        <div className="flex gap-8 md:gap-12 animate-scroll w-max min-h-[3rem] md:min-h-[3.5rem]">
          {duplicated.map((logo, i) => (
            <div key={i} className="flex-shrink-0 flex items-center justify-center">
              {/* Light mode */}
              <img
                src={logo.light}
                alt={logo.alt}
                className={cn(
                  "w-auto object-contain dark:hidden",
                  logo.largerInLight ? "h-12 md:h-14" : "h-6 md:h-7"
                )}
                draggable={false}
              />
              {/* Dark mode */}
              <img
                src={logo.dark}
                alt={logo.alt}
                className={cn(
                  "w-auto object-contain hidden dark:block",
                  logo.largerInDark ? "h-12 md:h-14" : "h-6 md:h-7"
                )}
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Optional: an invisible spacer if your footer is taller on desktop */}
      <div
        aria-hidden
        className="pointer-events-none block md:hidden"
        style={{ height: "env(safe-area-inset-bottom)" }}
      />
    </div>
  );
};
