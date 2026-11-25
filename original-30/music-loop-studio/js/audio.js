const LOOKAHEAD_SECONDS = 0.3;
const SCHEDULER_MS = 25;

const BASS_NOTES = [0, 0, 3, 7, 0, 10, 7, 0, 0, 5, 7, 0, 3, 10, 7, 12];
const KEY_NOTES = [0, 3, 5, 7, 10, 12, 15, 17, 19, 12, 10, 7, 5, 3, 0, 7];
const BELL_NOTES = [12, 16, 19, 23, 26, 28, 31, 35, 38, 35, 31, 28, 26, 23, 19, 16];

const midiToFrequency = (midi) => 440 * 2 ** ((midi - 69) / 12);

export class LoopAudioEngine {
  constructor({ getPattern, onStep, onStateChange, onAudioState, onError }) {
    this.getPattern = getPattern;
    this.onStep = onStep;
    this.onStateChange = onStateChange;
    this.onAudioState = onAudioState;
    this.onError = onError;

    this.ctx = null;
    this.master = null;
    this.compressor = null;
    this.reverbSend = null;
    this.trackBuses = [];
    this.panners = [];
    this.noiseBuffer = null;
    this.phase = "stopped";
    this.position = 0;
    this.reason = null;
    this.nextStep = 0;
    this.nextTime = 0;
    this.schedulerId = null;
    this.session = 0;
    this.visualTimers = new Set();
    this.voices = new Set();
    this.startPromise = null;
    this.playRequest = 0;
    this.contextHandler = null;
  }

  async ensureContext() {
    if (!this.ctx) {
      const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContext) {
        throw new Error("This browser does not support the Web Audio API.");
      }
      this.ctx = new AudioContext({ latencyHint: "interactive" });
      this.buildGraph();
      this.contextHandler = () => {
        this.onAudioState?.({ state: this.ctx.state, initialized: true });
        if (this.ctx.state !== "running" && this.phase === "playing") {
          this.pause("suspended");
        }
      };
      this.ctx.addEventListener("statechange", this.contextHandler);
    }

    if (this.ctx.state !== "running") {
      await this.ctx.resume();
    }
    if (this.ctx.state !== "running") {
      throw new Error("Audio is suspended. Press Play again to resume.");
    }

    this.onAudioState?.({ state: this.ctx.state, initialized: true });
    return this.ctx;
  }

  buildGraph() {
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.78;

    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.22;

    this.master.connect(this.compressor);
    this.compressor.connect(ctx.destination);

    const convolver = ctx.createConvolver();
    convolver.buffer = this.makeReverbBuffer(1.9);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.13;
    this.reverbSend.connect(convolver);
    convolver.connect(this.master);

    const pans = [-0.28, 0.05, 0.24, -0.08];
    this.trackBuses = [0, 1, 2, 3].map((index) => {
      const bus = ctx.createGain();
      const panner = ctx.createStereoPanner();
      panner.pan.value = pans[index];
      bus.connect(panner);
      panner.connect(this.master);
      panner.connect(this.reverbSend);
      this.panners[index] = panner;
      return bus;
    });

    this.noiseBuffer = this.makeNoiseBuffer(2);
    this.updateMix();
  }

  makeNoiseBuffer(seconds) {
    const length = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  makeReverbBuffer(seconds) {
    const length = Math.floor(this.ctx.sampleRate * seconds);
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.8;
      }
    }
    return buffer;
  }

  isTrackAudible(track, anySolo) {
    return !track.muted && (!anySolo || track.solo) && track.volume > 0.001;
  }

  getAudibleTracks(pattern = this.getPattern()) {
    const anySolo = pattern.tracks.some((track) => track.solo);
    return pattern.tracks.map((track, index) => ({
      index,
      audible: this.isTrackAudible(track, anySolo),
    }));
  }

  updateMix() {
    if (!this.ctx || !this.trackBuses.length) return;
    const pattern = this.getPattern();
    const anySolo = pattern.tracks.some((track) => track.solo);
    const now = this.ctx.currentTime;
    pattern.tracks.forEach((track, index) => {
      const audible = this.isTrackAudible(track, anySolo);
      const target = audible ? track.volume ** 1.15 : 0.0001;
      const gain = this.trackBuses[index]?.gain;
      if (gain) gain.setTargetAtTime(target, now, 0.012);
    });
  }

  setBpm(bpm) {
    this.bpm = bpm;
  }

  getStepDuration() {
    const bpm = this.getPattern().bpm;
    return 60 / bpm / 4;
  }

  async play() {
    if (this.phase === "playing") return;
    if (this.startPromise) return this.startPromise;

    const request = ++this.playRequest;
    this.startPromise = this.startPlayback(request);
    try {
      await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  async startPlayback(request) {
    try {
      const ctx = await this.ensureContext();
      if (request !== this.playRequest) return;
      const resumeAt = this.phase === "paused" ? this.position : 0;
      this.cancelScheduled();
      this.phase = "playing";
      this.reason = null;
      this.position = resumeAt;
      this.nextStep = resumeAt;
      this.nextTime = ctx.currentTime + 0.07;
      const session = this.session;
      this.schedulerId = globalThis.setInterval(() => this.tick(session), SCHEDULER_MS);
      this.tick(session);
      this.onStateChange?.({ phase: this.phase, position: this.position, reason: null });
    } catch (error) {
      if (request !== this.playRequest) return;
      this.phase = this.position > 0 ? "paused" : "stopped";
      this.reason = "error";
      this.onStateChange?.({ phase: this.phase, position: this.position, reason: this.reason });
      this.onError?.(error.message || "Audio could not start. Press Play to try again.");
    }
  }

  tick(session) {
    try {
      if (session !== this.session || this.phase !== "playing" || !this.ctx) return;
      if (this.ctx.state !== "running") {
        this.pause("suspended");
        return;
      }

      const now = this.ctx.currentTime;
      if (this.nextTime < now - 0.25) {
        this.nextTime = now + 0.02;
      }

      let guard = 0;
      while (this.nextTime < this.ctx.currentTime + LOOKAHEAD_SECONDS && guard < 64) {
        const step = this.nextStep;
        const time = this.nextTime;
        this.scheduleStep(step, time, session);
        this.nextStep = (this.nextStep + 1) % 16;
        this.nextTime += this.getStepDuration();
        guard += 1;
      }
    } catch (error) {
      this.cancelScheduled();
      this.phase = this.position > 0 ? "paused" : "stopped";
      this.reason = "error";
      this.onStateChange?.({ phase: this.phase, position: this.position, reason: this.reason });
      this.onError?.("Playback stopped after an audio scheduling error. Press Play to retry.");
    }
  }

  scheduleStep(step, time, session) {
    const pattern = this.getPattern();
    const scheduledTracks = [];
    pattern.tracks.forEach((track, index) => {
      if (track.steps[step]) {
        scheduledTracks.push(index);
        this.triggerSynth(index, step, time);
      }
    });

    const delay = Math.max(0, (time - this.ctx.currentTime) * 1000);
    const timer = globalThis.setTimeout(() => {
      this.visualTimers.delete(timer);
      if (session !== this.session || this.phase !== "playing") return;
      this.position = step;
      const current = this.getPattern();
      const anySolo = current.tracks.some((track) => track.solo);
      const audible = scheduledTracks.filter((index) =>
        this.isTrackAudible(current.tracks[index], anySolo),
      );
      this.onStep?.(step, audible);
    }, delay);
    this.visualTimers.add(timer);
  }

  pause(reason = "user") {
    if (this.startPromise) this.playRequest += 1;
    if (this.phase !== "playing") return;
    this.cancelScheduled();
    this.phase = "paused";
    this.reason = reason;
    this.onStateChange?.({ phase: this.phase, position: this.position, reason });
  }

  stop() {
    this.playRequest += 1;
    this.cancelScheduled();
    this.phase = "stopped";
    this.reason = null;
    this.position = 0;
    this.nextStep = 0;
    this.onStateChange?.({ phase: this.phase, position: 0, reason: null });
  }

  cancelScheduled() {
    this.session += 1;
    if (this.schedulerId !== null) {
      globalThis.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    for (const timer of this.visualTimers) {
      globalThis.clearTimeout(timer);
    }
    this.visualTimers.clear();
    this.stopAllVoices();
  }

  stopAllVoices() {
    for (const source of this.voices) {
      try {
        source.stop();
      } catch {}
      try {
        source.disconnect();
      } catch {}
    }
    this.voices.clear();
  }

  register(source, startTime, stopTime) {
    this.voices.add(source);
    source.addEventListener(
      "ended",
      () => {
        this.voices.delete(source);
        try {
          source.disconnect();
        } catch {}
      },
      { once: true },
    );
    source.start(startTime);
    source.stop(stopTime);
  }

  envelope(time, level, attack, duration) {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    return gain;
  }

  triggerSynth(trackIndex, step, time) {
    if (!this.ctx || !this.trackBuses[trackIndex]) return;
    if (trackIndex === 0) this.playDrum(step, time);
    if (trackIndex === 1) this.playBass(step, time);
    if (trackIndex === 2) this.playKeys(step, time);
    if (trackIndex === 3) this.playBells(step, time);
  }

  playDrum(step, time) {
    const bus = this.trackBuses[0];
    if (step === 0 || step === 8) {
      const oscillator = this.ctx.createOscillator();
      const gain = this.envelope(time, 0.62, 0.005, 0.34);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(160, time);
      oscillator.frequency.exponentialRampToValueAtTime(43, time + 0.16);
      oscillator.connect(gain);
      gain.connect(bus);
      this.register(oscillator, time, time + 0.36);
      return;
    }

    if (step === 4 || step === 12) {
      const noise = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const noiseGain = this.envelope(time, 0.26, 0.003, 0.18);
      filter.type = "bandpass";
      filter.frequency.value = 1900;
      filter.Q.value = 0.8;
      noise.buffer = this.noiseBuffer;
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(bus);
      this.register(noise, time, time + 0.2);

      const body = this.ctx.createOscillator();
      const bodyGain = this.envelope(time, 0.15, 0.003, 0.13);
      body.type = "triangle";
      body.frequency.setValueAtTime(188, time);
      body.frequency.exponentialRampToValueAtTime(130, time + 0.1);
      body.connect(bodyGain);
      bodyGain.connect(bus);
      this.register(body, time, time + 0.15);
      return;
    }

    const openHat = step === 14;
    const noise = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.envelope(time, openHat ? 0.16 : 0.11, 0.002, openHat ? 0.26 : 0.055);
    filter.type = "highpass";
    filter.frequency.value = openHat ? 5200 : 7000;
    noise.buffer = this.noiseBuffer;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    this.register(noise, time, time + (openHat ? 0.28 : 0.075));
  }

  playBass(step, time) {
    const bus = this.trackBuses[1];
    const frequency = midiToFrequency(36 + BASS_NOTES[step]);
    const mix = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const envelope = this.envelope(time, 0.28, 0.008, 0.44);

    filter.type = "lowpass";
    filter.Q.value = 5.5;
    filter.frequency.setValueAtTime(620, time);
    filter.frequency.exponentialRampToValueAtTime(128, time + 0.32);

    const main = this.ctx.createOscillator();
    main.type = "sawtooth";
    main.frequency.value = frequency;
    main.detune.value = -4;
    const mainGain = this.ctx.createGain();
    mainGain.gain.value = 0.55;
    main.connect(mainGain);
    mainGain.connect(mix);

    const sub = this.ctx.createOscillator();
    sub.type = "triangle";
    sub.frequency.value = frequency / 2;
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.36;
    sub.connect(subGain);
    subGain.connect(mix);

    mix.connect(filter);
    filter.connect(envelope);
    envelope.connect(bus);
    this.register(main, time, time + 0.48);
    this.register(sub, time, time + 0.48);
  }

  playKeys(step, time) {
    const bus = this.trackBuses[2];
    const frequency = midiToFrequency(60 + KEY_NOTES[step]);
    const mix = this.ctx.createGain();
    mix.gain.value = 0.62;
    const envelope = this.envelope(time, 0.17, 0.006, 0.34);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2800;

    const fundamental = this.ctx.createOscillator();
    fundamental.type = "triangle";
    fundamental.frequency.value = frequency;
    const overtone = this.ctx.createOscillator();
    overtone.type = "sine";
    overtone.frequency.value = frequency * 2;
    const overtoneGain = this.ctx.createGain();
    overtoneGain.gain.value = 0.24;

    fundamental.connect(mix);
    overtone.connect(overtoneGain);
    overtoneGain.connect(mix);
    mix.connect(filter);
    filter.connect(envelope);
    envelope.connect(bus);
    this.register(fundamental, time, time + 0.37);
    this.register(overtone, time, time + 0.37);
  }

  playBells(step, time) {
    const bus = this.trackBuses[3];
    const frequency = midiToFrequency(60 + BELL_NOTES[step]);
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modulation = this.ctx.createGain();
    const envelope = this.envelope(time, 0.11, 0.004, 0.9);

    carrier.type = "sine";
    carrier.frequency.value = frequency;
    modulator.type = "sine";
    modulator.frequency.value = frequency * 2.71;
    modulation.gain.setValueAtTime(frequency * 1.6, time);
    modulation.gain.exponentialRampToValueAtTime(2, time + 0.65);
    modulator.connect(modulation);
    modulation.connect(carrier.frequency);
    carrier.connect(envelope);
    envelope.connect(bus);
    this.register(carrier, time, time + 0.92);
    this.register(modulator, time, time + 0.92);

    const shimmer = this.ctx.createOscillator();
    const shimmerGain = this.envelope(time, 0.025, 0.01, 0.7);
    shimmer.type = "sine";
    shimmer.frequency.value = frequency * 3.04;
    shimmer.connect(shimmerGain);
    shimmerGain.connect(bus);
    this.register(shimmer, time, time + 0.72);
  }

  async preview(trackIndex, step) {
    try {
      const ctx = await this.ensureContext();
      const pattern = this.getPattern();
      const anySolo = pattern.tracks.some((track) => track.solo);
      if (!this.isTrackAudible(pattern.tracks[trackIndex], anySolo)) return;
      this.triggerSynth(trackIndex, step, ctx.currentTime + 0.015);
    } catch (error) {
      this.onError?.(error.message || "Audio preview is unavailable.");
    }
  }

  shutdown() {
    const shouldNotify = this.phase !== "stopped" || this.position !== 0;
    this.cancelScheduled();
    this.phase = "stopped";
    this.position = 0;
    this.reason = null;
    if (this.ctx && this.ctx.state === "running") {
      this.ctx.suspend().catch(() => {});
    }
    if (shouldNotify) {
      this.onStateChange?.({ phase: "stopped", position: 0, reason: null });
    }
  }
}
