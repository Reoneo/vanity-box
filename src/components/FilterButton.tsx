import React, { useState } from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export interface FilterState {
  protocol: string[];
  club: string[];
}

interface FilterButtonProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export const FilterButton: React.FC<FilterButtonProps> = ({ filters, onFilterChange }) => {
  const protocols = ['ENS', 'Aptos Names', 'Avax Name Service'];
  const clubs = ['ABC', 'Digits', 'Surname'];

  const handleProtocolToggle = (protocol: string) => {
    const newProtocols = filters.protocol.includes(protocol)
      ? filters.protocol.filter(p => p !== protocol)
      : [...filters.protocol, protocol];
    
    onFilterChange({
      ...filters,
      protocol: newProtocols
    });
  };

  const handleClubToggle = (club: string) => {
    const newClubs = filters.club.includes(club)
      ? filters.club.filter(c => c !== club)
      : [...filters.club, club];
    
    onFilterChange({
      ...filters,
      club: newClubs
    });
  };

  const totalFilters = filters.protocol.length + filters.club.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 px-3 gap-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black border-[#D4AF37]"
        >
          <Filter className="w-4 h-4" />
          Filter
          {totalFilters > 0 && (
            <Badge variant="secondary" className="ml-1 bg-black text-white">
              {totalFilters}
            </Badge>
          )}
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Protocol</DropdownMenuLabel>
        {protocols.map((protocol) => (
          <DropdownMenuItem
            key={protocol}
            onClick={() => handleProtocolToggle(protocol)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 border rounded ${
                filters.protocol.includes(protocol) 
                  ? 'bg-[#D4AF37] border-[#D4AF37]' 
                  : 'border-gray-300'
              }`}>
                {filters.protocol.includes(protocol) && (
                  <div className="w-full h-full flex items-center justify-center text-black text-xs">✓</div>
                )}
              </div>
              {protocol}
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>Club</DropdownMenuLabel>
        {clubs.map((club) => (
          <DropdownMenuItem
            key={club}
            onClick={() => handleClubToggle(club)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 border rounded ${
                filters.club.includes(club) 
                  ? 'bg-[#D4AF37] border-[#D4AF37]' 
                  : 'border-gray-300'
              }`}>
                {filters.club.includes(club) && (
                  <div className="w-full h-full flex items-center justify-center text-black text-xs">✓</div>
                )}
              </div>
              {club}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};