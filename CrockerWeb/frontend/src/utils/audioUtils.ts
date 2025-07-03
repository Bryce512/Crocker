/**
 * Audio utilities for playing alert sounds
 */

export class AudioAlert {
  private static audioContext: AudioContext | null = null;
  private static isAudioEnabled = true;

  /**
   * Initialize audio context
   */
  private static getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Play a beep sound using Web Audio API
   */
  public static async playBeep(
    frequency: number = 800,
    duration: number = 500
  ): Promise<void> {
    if (!this.isAudioEnabled) return;

    try {
      const audioContext = this.getAudioContext();

      // Resume audio context if it's suspended (required by browsers for user-initiated audio)
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = "sine";

      // Create envelope for smoother sound
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        0.3,
        audioContext.currentTime + 0.01
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + duration / 1000
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.warn("Failed to play beep sound:", error);
    }
  }

  /**
   * Play multiple beeps in sequence
   */
  public static async playAlertSequence(): Promise<void> {
    if (!this.isAudioEnabled) return;

    try {
      // Play three ascending beeps
      await this.playBeep(600, 200);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await this.playBeep(800, 200);
      await new Promise((resolve) => setTimeout(resolve, 100));
      await this.playBeep(1000, 300);
    } catch (error) {
      console.warn("Failed to play alert sequence:", error);
    }
  }

  /**
   * Play a notification sound from an audio file (fallback)
   */
  public static async playNotificationSound(audioUrl?: string): Promise<void> {
    if (!this.isAudioEnabled) return;

    try {
      // Try to play from URL first
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.volume = 0.5;
        await audio.play();
        return;
      }

      // Fallback to generated beep
      await this.playAlertSequence();
    } catch (error) {
      console.warn(
        "Failed to play notification sound, falling back to beep:",
        error
      );
      // Final fallback to simple beep
      try {
        await this.playBeep(800, 500);
      } catch (beepError) {
        console.warn("All audio playback methods failed:", beepError);
      }
    }
  }

  /**
   * Enable/disable audio
   */
  public static setAudioEnabled(enabled: boolean): void {
    this.isAudioEnabled = enabled;
  }

  /**
   * Check if audio is enabled
   */
  public static isEnabled(): boolean {
    return this.isAudioEnabled;
  }

  /**
   * Initialize audio with user gesture (call this on user interaction)
   */
  public static async initializeAudio(): Promise<void> {
    try {
      const audioContext = this.getAudioContext();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
    } catch (error) {
      console.warn("Failed to initialize audio:", error);
    }
  }
}
