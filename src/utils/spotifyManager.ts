// Spotify playback manager to control music across the application
class SpotifyManager {
  private isPlaying: boolean = false;
  private listeners: Set<(isPlaying: boolean) => void> = new Set();

  // Set playing state
  setPlaying(playing: boolean) {
    if (this.isPlaying !== playing) {
      this.isPlaying = playing;
      this.notifyListeners();
    }
  }

  // Pause all Spotify iframes by reloading them
  pauseAll() {
    const iframes = document.querySelectorAll('iframe[src*="spotify.com/embed"]');
    iframes.forEach((iframe) => {
      const currentSrc = (iframe as HTMLIFrameElement).src;
      (iframe as HTMLIFrameElement).src = currentSrc;
    });
    this.setPlaying(false);
  }

  // Get current playing state
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  // Subscribe to playback state changes
  subscribe(listener: (isPlaying: boolean) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of state change
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isPlaying));
  }
}

// Export singleton instance
export const spotifyManager = new SpotifyManager();
