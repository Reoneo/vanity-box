import React, { useState, useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import worldAppIcon from '@/assets/world-app-icon.png';

interface VerificationBadgeProps {
  isVerified: boolean;
  className?: string;
  size?: 'small' | 'large';
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ isVerified, className = '', size = 'small' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const badgeRef = useRef<HTMLDivElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && badgeRef.current && !badgeRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const badgeSize = size === 'large' ? 'w-10 h-10' : 'w-6 h-6';
  const iconSize = size === 'large' ? 'w-6 h-6' : 'w-3.5 h-3.5';
  const borderSize = size === 'large' ? 'border-4' : 'border-2';

  return (
    <div ref={badgeRef} className={className}>
      <TooltipProvider>
        <Tooltip open={isOpen} onOpenChange={setIsOpen}>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className={`
                absolute bottom-0 right-0 ${badgeSize} rounded-full 
                flex items-center justify-center
                ${borderSize} border-white shadow-lg
                transition-all duration-200 hover:scale-110
                ${isVerified ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
              `}
              aria-label={isVerified ? 'World ID Verified' : 'ID Unverified'}
            >
              {isVerified ? (
                <Check className={`${iconSize} text-white`} strokeWidth={3} />
              ) : (
                <X className={`${iconSize} text-white`} strokeWidth={3} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent 
            side="top" 
            className="bg-card border-border px-3 py-2 shadow-xl"
            sideOffset={8}
          >
            <div className="flex items-center gap-2">
              <img src={worldAppIcon} alt="World ID" className="w-5 h-5" />
              <span className="text-sm font-medium">
                {isVerified ? 'World ID Verified' : 'ID Unverified'}
              </span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
