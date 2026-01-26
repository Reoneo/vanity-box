import { useMemo } from "react";
import { format, parseISO } from "date-fns";

// Import network logos
import ethLogo from "@/assets/eth-logo.png";

interface ChronologicalPoapGridProps {
  poaps: any[];
  onPoapClick: (poap: any) => void;
  totalCount?: number;
}

interface GroupedPoaps {
  [key: string]: any[];
}

// Network icon component for POAPs (Gnosis/xDAI and Ethereum)
const PoapNetworkIcon = ({ chain, size = 14 }: { chain?: string; size?: number }) => {
  const chainLower = (chain || "").toLowerCase();
  
  // Gnosis/xDAI chain (most POAPs are on Gnosis)
  if (chainLower === "gnosis" || chainLower === "xdai") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="rounded-full">
        <circle cx="16" cy="16" r="16" fill="#04795B" />
        <path d="M16 6C10.48 6 6 10.48 6 16s4.48 10 10 10 10-4.48 10-10S21.52 6 16 6zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#fff"/>
        <circle cx="16" cy="16" r="4" fill="#fff"/>
      </svg>
    );
  }
  
  // Ethereum mainnet
  return <img src={ethLogo} alt="Ethereum" width={size} height={size} className="rounded-full" />;
};

export const ChronologicalPoapGrid = ({ poaps, onPoapClick, totalCount }: ChronologicalPoapGridProps) => {
  // Group POAPs by month/year chronologically (newest first) - sorted by MINT date
  const groupedPoaps = useMemo(() => {
    const groups: GroupedPoaps = {};
    
    // Sort by mint date (when token was created), fallback to event date
    const sortedPoaps = [...poaps].sort((a, b) => {
      const dateA = a.__mintDate || a.created || a.eventStartDate || a.event_start_date || a.__bestDate;
      const dateB = b.__mintDate || b.created || b.eventStartDate || b.event_start_date || b.__bestDate;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    sortedPoaps.forEach((poap) => {
      // Use mint date for grouping
      const dateStr = poap.__mintDate || poap.created || poap.eventStartDate || poap.event_start_date || poap.__bestDate;
      let monthYear = "Unknown";
      
      if (dateStr) {
        try {
          const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
          monthYear = format(date, "MMMM yyyy");
        } catch {
          monthYear = "Unknown";
        }
      }
      
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(poap);
    });

    return groups;
  }, [poaps]);

  // Sort month keys chronologically (newest first)
  const monthKeys = useMemo(() => {
    return Object.keys(groupedPoaps).sort((a, b) => {
      if (a === "Unknown") return 1;
      if (b === "Unknown") return -1;
      try {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateB.getTime() - dateA.getTime();
      } catch {
        return 0;
      }
    });
  }, [groupedPoaps]);
  const displayCount = totalCount ?? poaps.length;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-8">
      {/* Chronological groups */}
      {monthKeys.map((monthYear, groupIndex) => (
        <div key={monthYear} className="space-y-3">
          {/* Month/Year header with count on first group */}
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-semibold">
              <span className="text-foreground dark:text-white">
                {monthYear.split(' ')[0]}
              </span>
              {' '}
              <span className="text-purple-500">
                {monthYear.split(' ')[1]}
              </span>
            </h3>
          </div>
          
          {/* POAPs row for this month */}
          <div className="flex flex-wrap gap-3 px-1">
            {groupedPoaps[monthYear].map((poap, index) => (
              <div
                key={`poap-${poap.identifier || poap.tokenId}-${index}`}
                className="group relative cursor-pointer"
                onClick={() => onPoapClick(poap)}
              >
                {/* Outer ring with gradient */}
                <div className="relative p-1 rounded-full bg-gradient-to-br from-purple-400/40 via-purple-500/20 to-purple-600/40 hover:from-purple-400/60 hover:to-purple-600/60 transition-all duration-300">
                  {/* Inner POAP image */}
                  <div className="relative overflow-hidden rounded-full border-2 border-background dark:border-black group-hover:scale-105 transition-transform duration-300">
                    <img
                      src={poap.image_url || poap.eventImageUrl || poap.event_image_url}
                      alt={poap.name || poap.eventName || poap.event_name}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
                
                {/* Network chain indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-background dark:bg-black border border-purple-500/30 flex items-center justify-center overflow-hidden">
                  <PoapNetworkIcon chain={poap.chain} size={14} />
                </div>
              </div>
            ))}
          </div>

          {/* Visible divider between months (except last) */}
          {groupIndex < monthKeys.length - 1 && (
            <div className="border-b border-dashed border-purple-400/50 dark:border-purple-400/40 mx-4 mt-4" />
          )}
        </div>
      ))}

      {poaps.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No POAPs found
        </div>
      )}
    </div>
  );
};
