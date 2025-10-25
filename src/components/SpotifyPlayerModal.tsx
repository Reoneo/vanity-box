import React from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SpotifyPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  spotifyUrl: string;
  artistName: string;
}

export const SpotifyPlayerModal: React.FC<SpotifyPlayerModalProps> = ({
  isOpen,
  onClose,
  spotifyUrl,
  artistName,
}) => {
  // Convert spotify.link URLs to embed URLs
  // For now, we'll use the direct link - you may need to provide the full Spotify track/playlist URLs
  // Format: https://open.spotify.com/embed/track/{track_id} or /embed/playlist/{playlist_id}
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 border-2 border-[#D4AF37] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#D4AF37] flex items-center justify-between">
            {artistName} - Music Preview
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <p className="text-sm text-gray-400 mb-4">
            Please provide the full Spotify embed URL (e.g., https://open.spotify.com/track/... or https://open.spotify.com/playlist/...)
          </p>
          
          {/* Spotify Embed iframe */}
          <div className="w-full h-[380px] rounded-lg overflow-hidden">
            <iframe
              src={spotifyUrl.includes('open.spotify.com') 
                ? spotifyUrl.replace('/track/', '/embed/track/').replace('/playlist/', '/embed/playlist/')
                : ''}
              width="100%"
              height="380"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-lg"
            />
          </div>
          
          {!spotifyUrl.includes('open.spotify.com') && (
            <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
              <p className="text-sm text-yellow-200">
                Note: Short Spotify links (spotify.link) need to be converted to full Spotify URLs.
                Please provide URLs in this format:
                <br />
                • https://open.spotify.com/track/[track_id]
                <br />
                • https://open.spotify.com/playlist/[playlist_id]
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
