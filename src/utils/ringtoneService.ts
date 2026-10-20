// Web Audio API based ringtone synthesizer for Outgoing Ringback and Incoming Ringtone

class RingtoneService {
  private audioCtx: AudioContext | null = null;
  private outgoingTimer: any = null;
  private incomingTimer: any = null;
  private isOutgoingPlaying = false;
  private isIncomingPlaying = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Play standard telephone ringback tone for caller ("Brrrring... Brrrring...")
   * 440Hz + 480Hz dual frequency pulse (1.5s on, 2.5s off)
   */
  startOutgoingRingback() {
    if (this.isOutgoingPlaying) return;
    this.stopAll();
    this.isOutgoingPlaying = true;

    const playRingCycle = () => {
      if (!this.isOutgoingPlaying) return;
      try {
        const ctx = this.getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now); // 440 Hz
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now); // 480 Hz

        // Volume envelope: smooth fade in, hold, fade out
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.12, now + 0.08);
        gainNode.gain.setValueAtTime(0.12, now + 1.6);
        gainNode.gain.linearRampToValueAtTime(0, now + 1.8);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.85);
        osc2.stop(now + 1.85);
      } catch {
        // ignore audio policy restrictions
      }

      this.outgoingTimer = setTimeout(playRingCycle, 4000);
    };

    playRingCycle();
  }

  stopOutgoingRingback() {
    this.isOutgoingPlaying = false;
    if (this.outgoingTimer) {
      clearTimeout(this.outgoingTimer);
      this.outgoingTimer = null;
    }
  }

  /**
   * Play modern melodic incoming call ringtone for recipient
   * Harmonic melody (notes E5, G#5, B5, E6) repeating rhythmically
   */
  startIncomingRingtone() {
    if (this.isIncomingPlaying) return;
    this.stopAll();
    this.isIncomingPlaying = true;

    const notes = [659.25, 830.61, 987.77, 1318.51, 987.77, 1318.51]; // E5, G#5, B5, E6, B5, E6

    const playChimePattern = () => {
      if (!this.isIncomingPlaying) return;
      try {
        const ctx = this.getAudioContext();
        if (!ctx) return;

        const startTime = ctx.currentTime;
        notes.forEach((freq, idx) => {
          const noteTime = startTime + idx * 0.16;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteTime);

          // Rich harmonic overtone
          gain.gain.setValueAtTime(0, noteTime);
          gain.gain.linearRampToValueAtTime(0.2, noteTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(noteTime);
          osc.stop(noteTime + 0.36);
        });
      } catch {
        // ignore audio policy restrictions
      }

      this.incomingTimer = setTimeout(playChimePattern, 2200);
    };

    playChimePattern();
  }

  stopIncomingRingtone() {
    this.isIncomingPlaying = false;
    if (this.incomingTimer) {
      clearTimeout(this.incomingTimer);
      this.incomingTimer = null;
    }
  }

  stopAll() {
    this.stopOutgoingRingback();
    this.stopIncomingRingtone();
  }
}

export const ringtoneService = new RingtoneService();
export default ringtoneService;
