/**
 * Ambient waves and a soft original piano loop ("First Light on the Water").
 * The piano starts after the first gesture, fades in, and swells a little at sunrise.
 */
export class AmbientAudio {
  constructor() {
    this.ctx = null;
    this.started = false;
    this.muted = false;
    this.master = null;
    this.out = null;
    this.pianoG = null;
    this.pianoSrc = null;
    this._pianoBuf = null;
    this._pianoReady = false;
  }

  async start() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (!this.ctx) {
      this.ctx = new AC({ latencyHint: "interactive" });
      this._graph();
    }
    if (!this._stateHooked) {
      this._stateHooked = true;
      this.ctx.addEventListener("statechange", () => {
        if (this.ctx.state === "running") {
          this.started = true;
          if (!this.muted) this._fadeOut(1, 0.8);
          this._startPiano();
        }
      });
    }
    if (this.ctx.state === "suspended") {
      try {
        await Promise.race([this.ctx.resume(), new Promise((r) => setTimeout(r, 400))]);
      } catch {
        /* iOS / headless may stay suspended until a later gesture */
      }
    }
    this.started = this.ctx.state === "running";
    // Decode the loop even if the context is still suspended.
    this._loadPiano().then(() => {
      if (this.ctx?.state === "running") this._startPiano();
    });
    if (this.started && !this.muted) this._fadeOut(1, 0.8);
    return this.started;
  }

  _graph() {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    out.connect(comp);
    comp.connect(ctx.destination);
    this.out = out;

    const master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(out);
    this.master = master;

    const pianoG = ctx.createGain();
    pianoG.gain.value = 0;
    pianoG.connect(out);
    this.pianoG = pianoG;

    const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    const makeNoise = () => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      s.start();
      return s;
    };

    const waveF = ctx.createBiquadFilter();
    waveF.type = "lowpass";
    waveF.frequency.value = 420;
    this.waveG = ctx.createGain();
    this.waveG.gain.value = 0.16;
    makeNoise().connect(waveF);
    waveF.connect(this.waveG);
    this.waveG.connect(master);
    this.waveF = waveF;

    const foamF = ctx.createBiquadFilter();
    foamF.type = "bandpass";
    foamF.frequency.value = 1200;
    this.foamG = ctx.createGain();
    this.foamG.gain.value = 0.04;
    makeNoise().connect(foamF);
    foamF.connect(this.foamG);
    this.foamG.connect(master);

    const droneF = ctx.createBiquadFilter();
    droneF.type = "lowpass";
    droneF.frequency.value = 480;
    this.droneG = ctx.createGain();
    this.droneG.gain.value = 0;
    droneF.connect(this.droneG);
    this.droneG.connect(master);
    this.droneF = droneF;
    for (const [freq, type, det] of [[110, "sine", -3], [165, "triangle", 4]]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = det;
      const g = ctx.createGain();
      g.gain.value = 0.28;
      o.connect(g);
      g.connect(droneF);
      o.start();
    }
  }

  async _loadPiano() {
    if (this._pianoBuf || !this.ctx) return this._pianoBuf;
    const base = import.meta.env.BASE_URL || "./";
    const candidates = [
      `${base}audio/first-light-on-the-water.mp3`,
      `${base}audio/first-light-on-the-water.ogg`,
    ];
    let lastErr = null;
    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`audio ${res.status}`);
        const raw = await res.arrayBuffer();
        const buf = await this.ctx.decodeAudioData(raw.slice(0));
        this._pianoBuf = buf;
        this._pianoReady = true;
        return buf;
      } catch (err) {
        lastErr = err;
      }
    }
    console.warn("Piano loop could not be loaded", lastErr);
    return null;
  }

  _startPiano() {
    if (!this.ctx || !this._pianoBuf || this.pianoSrc) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._pianoBuf;
    src.loop = true;
    src.connect(this.pianoG);
    src.start(0);
    this.pianoSrc = src;
    if (!this.muted) this._fadePiano(0.28, 5.2);
  }

  setState({ progress, calm, nearShore }) {
    if (!this.ctx || !this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const shore = 0.65 + nearShore * 0.6;
    this.waveF.frequency.linearRampToValueAtTime(300 + (1 - calm) * 280, t + 0.25);
    this.waveG.gain.linearRampToValueAtTime(0.12 * shore * (0.7 + (1 - calm) * 0.4), t + 0.25);
    this.foamG.gain.linearRampToValueAtTime(0.035 * shore * (0.4 + (1 - calm) * 0.8), t + 0.25);
    this.droneG.gain.linearRampToValueAtTime(0.025 * (0.4 + progress * 0.6 + calm * 0.2), t + 0.4);
    this.droneF.frequency.linearRampToValueAtTime(420 + progress * 260, t + 0.4);
    // A gentle swell as the sky reaches sunrise
    if (this.pianoG && this._pianoReady) {
      const target = 0.26 + progress * 0.16 + calm * 0.04;
      this.pianoG.gain.linearRampToValueAtTime(target, t + 0.9);
    }
  }

  setMuted(m) {
    this.muted = !!m;
    this._fadeOut(this.muted ? 0 : 1, 0.4);
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  _fadeOut(v, s) {
    if (!this.out || !this.ctx) return;
    const g = this.out.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(v, t + s);
  }

  _fadePiano(v, s) {
    if (!this.pianoG || !this.ctx) return;
    const g = this.pianoG.gain;
    const t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(v, t + s);
  }
}
