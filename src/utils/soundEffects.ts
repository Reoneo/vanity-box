// Sound effects utility for user interactions
class SoundEffectsManager {
  private isMuted: boolean = true;
  private audioContext: AudioContext | null = null;

  constructor() {
    // Initialize as muted
    this.isMuted = localStorage.getItem('sound-muted') !== 'false';
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('sound-muted', String(this.isMuted));
    return this.isMuted;
  }

  isSoundMuted(): boolean {
    return this.isMuted;
  }

  private playTone(frequency: number, duration: number, volume: number = 0.3) {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }

  // PS5-inspired sound effects
  playClick() {
    this.playTone(800, 0.05, 0.2);
  }

  playHover() {
    this.playTone(600, 0.03, 0.1);
  }

  playSelect() {
    this.playTone(1200, 0.08, 0.25);
    setTimeout(() => this.playTone(1600, 0.06, 0.2), 50);
  }

  playSuccess() {
    this.playTone(800, 0.1, 0.3);
    setTimeout(() => this.playTone(1000, 0.1, 0.3), 100);
    setTimeout(() => this.playTone(1200, 0.15, 0.3), 200);
  }

  playError() {
    this.playTone(300, 0.15, 0.3);
    setTimeout(() => this.playTone(250, 0.2, 0.3), 100);
  }

  playOpen() {
    this.playTone(600, 0.08, 0.2);
    setTimeout(() => this.playTone(900, 0.08, 0.2), 60);
  }

  playClose() {
    this.playTone(900, 0.08, 0.2);
    setTimeout(() => this.playTone(600, 0.08, 0.2), 60);
  }

  playMint() {
    // Special sound for minting
    this.playTone(700, 0.1, 0.3);
    setTimeout(() => this.playTone(900, 0.1, 0.3), 80);
    setTimeout(() => this.playTone(1100, 0.15, 0.3), 160);
    setTimeout(() => this.playTone(1400, 0.2, 0.3), 280);
  }
}

export const soundManager = new SoundEffectsManager();
