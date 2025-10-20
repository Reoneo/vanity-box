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

  private playTone(frequency: number, duration: number, volume: number = 0.5, type: OscillatorType = 'sine') {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }

  // Luxurious digital sound effects
  playClick() {
    this.playTone(1200, 0.08, 0.6, 'triangle');
    setTimeout(() => this.playTone(1400, 0.06, 0.4, 'sine'), 30);
  }

  playHover() {
    this.playTone(900, 0.05, 0.4, 'sine');
  }

  playSelect() {
    this.playTone(1400, 0.1, 0.6, 'triangle');
    setTimeout(() => this.playTone(1800, 0.08, 0.5, 'sine'), 60);
    setTimeout(() => this.playTone(2200, 0.06, 0.4, 'sine'), 120);
  }

  playSuccess() {
    this.playTone(1000, 0.12, 0.6, 'triangle');
    setTimeout(() => this.playTone(1300, 0.12, 0.6, 'sine'), 100);
    setTimeout(() => this.playTone(1600, 0.18, 0.6, 'sine'), 200);
    setTimeout(() => this.playTone(2000, 0.2, 0.5, 'sine'), 300);
  }

  playError() {
    this.playTone(400, 0.18, 0.6, 'square');
    setTimeout(() => this.playTone(300, 0.25, 0.6, 'square'), 120);
  }

  playOpen() {
    this.playTone(800, 0.1, 0.5, 'triangle');
    setTimeout(() => this.playTone(1100, 0.1, 0.5, 'sine'), 70);
    setTimeout(() => this.playTone(1400, 0.08, 0.4, 'sine'), 140);
  }

  playClose() {
    this.playTone(1400, 0.1, 0.5, 'triangle');
    setTimeout(() => this.playTone(1100, 0.1, 0.5, 'sine'), 70);
    setTimeout(() => this.playTone(800, 0.08, 0.4, 'sine'), 140);
  }

  playMint() {
    // Special luxurious sound for minting
    this.playTone(900, 0.12, 0.6, 'triangle');
    setTimeout(() => this.playTone(1200, 0.12, 0.6, 'sine'), 90);
    setTimeout(() => this.playTone(1500, 0.15, 0.6, 'sine'), 180);
    setTimeout(() => this.playTone(1900, 0.18, 0.6, 'sine'), 300);
    setTimeout(() => this.playTone(2300, 0.25, 0.5, 'sine'), 450);
  }
}

export const soundManager = new SoundEffectsManager();
