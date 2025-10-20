import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '@/utils/soundEffects';

export const SoundToggle: React.FC = () => {
  const [isMuted, setIsMuted] = useState(soundManager.isSoundMuted());

  const toggleSound = () => {
    const newMutedState = soundManager.toggleMute();
    setIsMuted(newMutedState);
    
    // Play a test sound if unmuted
    if (!newMutedState) {
      soundManager.playClick();
    }
  };

  return (
    <button
      onClick={toggleSound}
      className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-all duration-300"
      aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
    >
      {isMuted ? (
        <VolumeX className="w-4 h-4 text-white" />
      ) : (
        <Volume2 className="w-4 h-4 text-white" />
      )}
    </button>
  );
};
