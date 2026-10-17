// =============================================================================
// CỜ ÚP PROCEDURAL AUDIO SYNTHESIZER (WEB AUDIO API)
// Rich physical stone clicks, mystery flip chimes, stone crush, cathedral bell
// =============================================================================

class CoUpAudioSynthesizer {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Soft crystalline click when selecting a piece
  playSelect() {
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(1180, now + 0.06);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Crisp, satisfying acoustic stone clack on solid marble altar
  playStoneMove() {
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Resonant low body (stone density)
    const oscBody = this.ctx.createOscillator();
    const gainBody = this.ctx.createGain();
    oscBody.type = 'triangle';
    oscBody.frequency.setValueAtTime(280, now);
    oscBody.frequency.exponentialRampToValueAtTime(120, now + 0.09);

    gainBody.gain.setValueAtTime(0.35, now);
    gainBody.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    oscBody.connect(gainBody);
    gainBody.connect(this.ctx.destination);
    oscBody.start(now);
    oscBody.stop(now + 0.1);

    // 2. High transient stone impact
    const oscHigh = this.ctx.createOscillator();
    const gainHigh = this.ctx.createGain();
    oscHigh.type = 'sine';
    oscHigh.frequency.setValueAtTime(940, now);
    oscHigh.frequency.exponentialRampToValueAtTime(320, now + 0.04);

    gainHigh.gain.setValueAtTime(0.28, now);
    gainHigh.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    oscHigh.connect(gainHigh);
    gainHigh.connect(this.ctx.destination);
    oscHigh.start(now);
    oscHigh.stop(now + 0.05);
  }

  // Mystical upward flourish when an Úp piece flips & reveals its true identity
  playMysteryReveal() {
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.setValueAtTime(0.12, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.5);
    });
  }

  // Aggressive whoosh/charge sound when piece leaps into combat strike
  playAttackCharge() {
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.32);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(1800, now + 0.28);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.24);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  // Dramatic, visceral cinematic stone smash on melee piece capture
  playStoneShatter(hasCap = false) {
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Massive deep sub-bass cinematic shockwave boom (180Hz -> 28Hz)
    const oscSub = this.ctx.createOscillator();
    const gainSub = this.ctx.createGain();
    oscSub.type = 'sine';
    oscSub.frequency.setValueAtTime(180, now);
    oscSub.frequency.exponentialRampToValueAtTime(28, now + 0.45);

    gainSub.gain.setValueAtTime(0.85, now);
    gainSub.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    oscSub.connect(gainSub);
    gainSub.connect(this.ctx.destination);
    oscSub.start(now);
    oscSub.stop(now + 0.52);

    // 2. Heavy granite fracture crunch noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.4);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.exponentialRampToValueAtTime(110, now + 0.38);

    const gainNoise = this.ctx.createGain();
    gainNoise.gain.setValueAtTime(0.75, now);
    gainNoise.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    whiteNoise.connect(filter);
    filter.connect(gainNoise);
    gainNoise.connect(this.ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.42);

    // 3. High ceramic/crystal fracture snap
    const oscSnap = this.ctx.createOscillator();
    const gainSnap = this.ctx.createGain();
    oscSnap.type = 'triangle';
    oscSnap.frequency.setValueAtTime(2200, now);
    oscSnap.frequency.exponentialRampToValueAtTime(280, now + 0.09);

    gainSnap.gain.setValueAtTime(0.42, now);
    gainSnap.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    oscSnap.connect(gainSnap);
    gainSnap.connect(this.ctx.destination);
    oscSnap.start(now);
    oscSnap.stop(now + 0.11);

    // 4. If target had a bronze/copper Nắp Úp, add resonant metallic clang & ricochet!
    if (hasCap) {
      const oscCap = this.ctx.createOscillator();
      const gainCap = this.ctx.createGain();
      oscCap.type = 'sine';
      oscCap.frequency.setValueAtTime(880, now);
      oscCap.frequency.exponentialRampToValueAtTime(440, now + 0.4);

      gainCap.gain.setValueAtTime(0.38, now);
      gainCap.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      oscCap.connect(gainCap);
      gainCap.connect(this.ctx.destination);
      oscCap.start(now);
      oscCap.stop(now + 0.48);
    }
  }

  // Majestic Gothic Cathedral Bell Toll on Check (Chiếu Tướng!)
  playCheckBell() {
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const harmonics = [
      { freq: 220, gain: 0.32 }, // Root A3
      { freq: 440, gain: 0.24 }, // Octave
      { freq: 554.37, gain: 0.16 }, // Major third
      { freq: 659.25, gain: 0.12 }, // Fifth
      { freq: 880, gain: 0.08 }  // 2nd octave
    ];

    harmonics.forEach(({ freq, gain: gVal }) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now);
      osc.stop(now + 2.3);
    });
  }

  // Triumphant Cathedral Fanfare on Checkmate
  playVictory() {
    this.initCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const chord = [261.63, 329.63, 392.00, 523.25, 659.25]; // C major
    chord.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.setValueAtTime(0.25, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + 3.3);
    });
  }
}

export const coUpAudio = new CoUpAudioSynthesizer();
