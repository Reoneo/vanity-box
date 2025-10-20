import { useEffect } from 'react';
import { soundManager } from '@/utils/soundEffects';

/**
 * Hook to add global sound effects to interactive elements
 */
export const useSoundEffects = () => {
  useEffect(() => {
    // Add click sounds to all buttons, links, and interactive elements
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if the element or its parent is interactive
      const isButton = target.closest('button');
      const isLink = target.closest('a');
      const isInput = target.closest('input, textarea, select');
      const isInteractive = target.closest('[role="button"], [role="link"]');
      
      if (isButton || isLink || isInput || isInteractive) {
        soundManager.playClick();
      }
    };

    // Add hover sounds to buttons
    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isButton = target.closest('button');
      const isLink = target.closest('a');
      
      if (isButton || isLink) {
        soundManager.playHover();
      }
    };

    // Attach global listeners
    document.addEventListener('click', handleClick);
    document.addEventListener('mouseenter', handleMouseEnter, true);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('mouseenter', handleMouseEnter, true);
    };
  }, []);
};
