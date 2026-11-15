class SoundFXManager {
  private ctx: AudioContext | null = null;
  private noiseShort: AudioBuffer | null = null;
  private noiseLong: AudioBuffer | null = null;
  private adMuted = false;
  private userMuted = false;
  private lastAttackAt = 0;
  private lastHitAt = 0;

  private ensureCtx(): AudioContext | null {
    if (this.adMuted || this.userMuted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.buildNoise(this.ctx);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private buildNoise(ctx: AudioContext): void {
    const sLen = Math.floor(ctx.sampleRate * 0.12);
    this.noiseShort = ctx.createBuffer(1, sLen, ctx.sampleRate);
    const sd = this.noiseShort.getChannelData(0);
    for (let i = 0; i < sLen; i++) {
      sd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / sLen, 2.0);
    }

    const lLen = Math.floor(ctx.sampleRate * 0.38);
    this.noiseLong = ctx.createBuffer(1, lLen, ctx.sampleRate);
    const ld = this.noiseLong.getChannelData(0);
    for (let i = 0; i < lLen; i++) {
      ld[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / lLen, 1.45);
    }
  }

  public setAdMuted(muted: boolean): void {
    this.adMuted = muted;
  }

  public toggleUserMute(): boolean {
    this.userMuted = !this.userMuted;
    return this.userMuted;
  }

  public isUserMuted(): boolean {
    return this.userMuted;
  }

  /** Crisp mahjong/jade tile pickup or place clack */
  public tileClack(high = false): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(high ? 820 : 620, now);
    osc.frequency.exponentialRampToValueAtTime(high ? 340 : 240, now + 0.055);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /** Satisfying ascending pentatonic chord when merging tiles */
  public merge(newTier: number, isHero: boolean): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const base = isHero ? 587.33 : 440 + (newTier - 1) * 65;
    const ratios = isHero ? [1, 1.25, 1.5, 2] : [1, 1.25, 1.5];
    ratios.forEach((r, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isHero ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(base * r, now + idx * 0.045);
      gain.gain.setValueAtTime(0.13, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.22);
    });
  }

  public recruit(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.1, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.1);
    });
  }

  public attack(style: 'slash' | 'bow' | 'lance' | 'cannon' | 'frost' | 'thunder'): void {
    const pNow = performance.now();
    if (pNow - this.lastAttackAt < 42) return;
    this.lastAttackAt = pNow;

    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (style === 'cannon') {
      if (this.noiseLong) {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseLong;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(420, now);
        f.frequency.exponentialRampToValueAtTime(80, now + 0.26);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.22, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
        src.connect(f).connect(g).connect(ctx.destination);
        src.start(now);
        src.stop(now + 0.26);
      }
      return;
    }

    if (style === 'thunder') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.14);
      g.gain.setValueAtTime(0.11, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(g).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
      return;
    }

    if (style === 'frost') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1180, now);
      osc.frequency.exponentialRampToValueAtTime(1680, now + 0.08);
      g.gain.setValueAtTime(0.075, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(g).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
      return;
    }

    if (this.noiseShort && (style === 'slash' || style === 'lance')) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseShort;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = style === 'slash' ? 1350 : 880;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.11, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      src.connect(f).connect(g).connect(ctx.destination);
      src.start(now);
      src.stop(now + 0.09);
      return;
    }

    // bow twang
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.065);
    g.gain.setValueAtTime(0.085, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public shovelDig(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (this.noiseShort) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseShort;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      src.connect(g).connect(ctx.destination);
      src.start(now);
      src.stop(now + 0.12);
    }
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(1040, now + 0.18);
    g.gain.setValueAtTime(0.13, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g).connect(ctx.destination);
    osc.start(now + 0.04);
    osc.stop(now + 0.2);
  }

  public dragonUlt(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (this.noiseLong) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseLong;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.26, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      src.connect(g).connect(ctx.destination);
      src.start(now);
      src.stop(now + 0.36);
    }
    [440, 587.33, 880, 1174.66].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + idx * 0.055);
      g.gain.setValueAtTime(0.11, now + idx * 0.055);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.28);
      osc.connect(g).connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.28);
    });
  }

  public enemyKill(): void {
    const pNow = performance.now();
    if (pNow - this.lastHitAt < 45) return;
    this.lastHitAt = pNow;

    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, now);
    osc.frequency.exponentialRampToValueAtTime(1080, now + 0.055);
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(g).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public alarm(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(340, now + i * 0.22);
      osc.frequency.linearRampToValueAtTime(210, now + i * 0.22 + 0.18);
      g.gain.setValueAtTime(0.12, now + i * 0.22);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.22 + 0.2);
      osc.connect(g).connect(ctx.destination);
      osc.start(now + i * 0.22);
      osc.stop(now + i * 0.22 + 0.2);
    }
  }

  public fanfare(): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.07);
      g.gain.setValueAtTime(0.13, now + i * 0.07);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.24);
      osc.connect(g).connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.24);
    });
  }
}

export const SoundFX = new SoundFXManager();
