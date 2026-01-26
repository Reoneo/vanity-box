import { useMemo } from "react";
import { format, parseISO } from "date-fns";

interface ChronologicalPoapGridProps {
  poaps: any[];
  onPoapClick: (poap: any) => void;
}

interface GroupedPoaps {
  [key: string]: any[];
}

export const ChronologicalPoapGrid = ({ poaps, onPoapClick }: ChronologicalPoapGridProps) => {
  // Group POAPs by month/year chronologically (newest first)
  const groupedPoaps = useMemo(() => {
    const groups: GroupedPoaps = {};
    
    const sortedPoaps = [...poaps].sort((a, b) => {
      const dateA = a.eventStartDate || a.event_start_date || a.__bestDate;
      const dateB = b.eventStartDate || b.event_start_date || b.__bestDate;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    sortedPoaps.forEach((poap) => {
      const dateStr = poap.eventStartDate || poap.event_start_date || poap.__bestDate;
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

  const monthKeys = Object.keys(groupedPoaps);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-8">
      {/* Header with total count */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600" />
          <span className="text-sm font-medium text-muted-foreground">
            {poaps.length} POAPs
          </span>
        </div>
      </div>

      {/* Chronological groups */}
      {monthKeys.map((monthYear, groupIndex) => (
        <div key={monthYear} className="space-y-3">
          {/* Month/Year header */}
          <div className="flex items-center gap-2 px-1">
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
                
                {/* Small chain indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-background dark:bg-black border border-purple-500/30 flex items-center justify-center">
                  <span className="text-[10px]">◆</span>
                </div>
              </div>
            ))}
          </div>

          {/* Subtle divider between months (except last) */}
          {groupIndex < monthKeys.length - 1 && (
            <div className="border-b border-dashed border-purple-500/20 mx-4 mt-4" />
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
