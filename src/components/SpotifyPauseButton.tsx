import React, { useState, useEffect } from 'react';
import { Pause } from 'lucide-react';
import { spotifyManager } from '@/utils/spotifyManager';

export const SpotifyPauseButton: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Subscribe to spotify manager state changes
    const unsubscribe = spotifyManager.subscribe((playing) => {
      setIsPlaying(playing);
    });

    // Initialize with current state
    setIsPlaying(spotifyManager.getIsPlaying());

    return () => {
      unsubscribe();
    };
  }, []);

  // Don't render if nothing is playing
  if (!isPlaying) {
    return null;
  }

  const handlePause = () => {
    spotifyManager.pauseAll();
  };

  return (
    <button
      type="button"
      aria-label="Pause Spotify music"
      onClick={handlePause}
      className="w-10 h-10 flex items-center justify-center bg-transparent hover:bg-black/10 rounded-md transition-all duration-300"
    >
      <Pause className="w-5 h-5 text-black fill-black" />
    </button>
  );
};
