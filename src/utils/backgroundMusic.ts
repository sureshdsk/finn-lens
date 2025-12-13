// Background music manager using singleton pattern
class BackgroundMusicManager {
  private static instance: BackgroundMusicManager;
  private audio: HTMLAudioElement | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): BackgroundMusicManager {
    if (!BackgroundMusicManager.instance) {
      BackgroundMusicManager.instance = new BackgroundMusicManager();
    }
    return BackgroundMusicManager.instance;
  }

  initialize() {
    if (this.isInitialized) return;

    this.audio = new Audio('/background-music.mp3');
    this.audio.loop = true;
    this.audio.volume = 0.3;
    this.audio.preload = 'auto';
    
    (window as any).__bgMusic = this.audio;
    
    this.isInitialized = true;
  }

  async play() {
    if (!this.audio) this.initialize();
    
    if (this.audio && this.audio.paused) {
      try {
        await this.audio.play();
        console.log('Background music started');
      } catch (err) {
        console.log('Music autoplay blocked, will retry on user interaction');
        // Set up one-time listener for user interaction
        const startOnInteraction = () => {
          if (this.audio && this.audio.paused) {
            this.audio.play().catch(() => {});
          }
          document.removeEventListener('click', startOnInteraction);
          document.removeEventListener('keydown', startOnInteraction);
        };
        document.addEventListener('click', startOnInteraction);
        document.addEventListener('keydown', startOnInteraction);
      }
    }
  }

  pause() {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
  }

  setVolume(volume: number) {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  isPlaying(): boolean {
    return this.audio ? !this.audio.paused : false;
  }
}

export const bgMusic = BackgroundMusicManager.getInstance();
