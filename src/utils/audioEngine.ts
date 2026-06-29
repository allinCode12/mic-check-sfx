import { playSynthesizedSound } from './synth';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  
  // Track all actively playing sound voice instances so they can be stopped or faded
  private activeVoices: Map<string, { stop: () => void; startTime: number }> = new Map();
  // Cache decoded AudioBuffers for uploaded sounds for instant zero-latency triggers
  private bufferCache: Map<string, AudioBuffer> = new Map();

  // Background Music (BGM) Engine properties
  private bgmAudio: HTMLAudioElement | null = null;
  private bgmSourceNode: MediaElementAudioSourceNode | null = null;
  private bgmGainNode: GainNode | null = null;
  private currentBGMTrackId: string | null = null;
  private bgmPlayState: 'playing' | 'paused' | 'stopped' = 'stopped';
  private proceduralBgmNodes: AudioNode[] = [];
  private bgmPauseTimeout: any = null;

  init() {
    if (this.ctx) return;
    
    // Support standard and older browsers
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime); // default master volume 80%

    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 256;
    
    // Connect nodes: Target Voice -> MasterGain -> Analyser -> Speakers
    this.masterGain.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);
  }

  getContext(): AudioContext {
    this.init();
    return this.ctx!;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  setMasterVolume(vol: number) {
    this.init();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  // Pre-decode file and cache it in memory
  async cacheFile(fileId: string, blob: Blob): Promise<AudioBuffer | null> {
    this.init();
    if (!this.ctx) return null;

    if (this.bufferCache.has(fileId)) {
      return this.bufferCache.get(fileId)!;
    }

    try {
      const arrayBuffer = await blob.arrayBuffer();
      // Use standard Promise-based decodeAudioData which is widely supported
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.bufferCache.set(fileId, audioBuffer);
      return audioBuffer;
    } catch (e) {
      console.error('Error decoding audio data for cacheId:', fileId, e);
      return null;
    }
  }

  evictCache(fileId: string) {
    this.bufferCache.delete(fileId);
  }

  // Play a custom uploaded file
  async playFile(
    soundId: string,
    fileId: string,
    fileBlob: Blob,
    volume: number,
    loop: boolean
  ): Promise<{ voiceId: string; stop: () => void } | null> {
    this.init();
    if (!this.ctx || !this.masterGain) return null;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    let buffer = this.bufferCache.get(fileId);
    if (!buffer) {
      const cached = await this.cacheFile(fileId, fileBlob);
      if (cached) buffer = cached;
    }

    if (!buffer) {
      // Fallback to URL playing if decoding failed
      return this.playFileWithAudioElement(soundId, fileBlob, volume, loop);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const volumeGain = this.ctx.createGain();
    volumeGain.gain.setValueAtTime(volume, this.ctx.currentTime);

    // Audio Graph: Source -> Sound Vol Gain -> Master Gain -> Speakers
    source.connect(volumeGain);
    volumeGain.connect(this.masterGain);

    const voiceId = `${soundId}_${Date.now()}`;
    const stopPlayback = () => {
      try {
        source.stop();
      } catch (e) {}
      try {
        source.disconnect();
        volumeGain.disconnect();
      } catch (e) {}
      this.activeVoices.delete(voiceId);
    };

    source.onended = () => {
      stopPlayback();
    };

    source.start(0);
    
    this.activeVoices.set(voiceId, {
      stop: stopPlayback,
      startTime: this.ctx.currentTime
    });

    return { voiceId, stop: stopPlayback };
  }

  // Fallback Audio tag player (highly resilient)
  private playFileWithAudioElement(
    soundId: string,
    blob: Blob,
    volume: number,
    loop: boolean
  ): { voiceId: string; stop: () => void } {
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.volume = volume;
    audio.loop = loop;
    
    const voiceId = `${soundId}_el_${Date.now()}`;
    
    const stopPlayback = () => {
      audio.pause();
      audio.currentTime = 0;
      URL.revokeObjectURL(audioUrl);
      this.activeVoices.delete(voiceId);
    };

    audio.onended = () => {
      stopPlayback();
    };

    audio.play().catch(e => console.warn('Audio tag failed:', e));
    
    this.activeVoices.set(voiceId, {
      stop: stopPlayback,
      startTime: this.ctx ? this.ctx.currentTime : Date.now() / 1000
    });

    return { voiceId, stop: stopPlayback };
  }

  // Play synchronized synthesizer sounds
  playSynth(
    soundId: string,
    synthType: string,
    volume: number,
    loop: boolean
  ): { voiceId: string; stop: () => void } | null {
    this.init();
    if (!this.ctx || !this.masterGain) return null;

    const voiceId = `${soundId}_synth_${Date.now()}`;
    
    // Create the synthesizer nodes
    const synthResult = playSynthesizedSound(synthType, volume, this.ctx, this.masterGain);

    // If sound type itself loops or the sound config specifies loop, handle manually for non-hum/non-alarm
    let timerId: NodeJS.Timeout | null = null;
    
    const stopPlayback = () => {
      synthResult.stop();
      if (timerId) clearInterval(timerId);
      this.activeVoices.delete(voiceId);
    };

    // If loop is true but the synth effect is short (e.g. laser or shatter), re-trigger periodically
    if (loop && !synthResult.isLooping) {
      const intervalMs = synthType === 'laser' ? 450 : synthType === 'shatter' ? 600 : 1000;
      timerId = setInterval(() => {
        if (!this.ctx || !this.masterGain) return;
        playSynthesizedSound(synthType, volume, this.ctx, this.masterGain);
      }, intervalMs);
    }

    this.activeVoices.set(voiceId, {
      stop: stopPlayback,
      startTime: this.ctx.currentTime
    });

    // Auto cleanup of non-looping audio nodes after average safety duration
    if (!loop && !synthResult.isLooping) {
      const durationSecs = synthType === 'subdrop' ? 2.5 : synthType === 'portal' ? 2.2 : 1.2;
      setTimeout(() => {
        this.activeVoices.delete(voiceId);
      }, durationSecs * 1000);
    }

    return { voiceId, stop: stopPlayback };
  }

  // Instantly stop all playing sounds (Panic button)
  stopAll() {
    this.activeVoices.forEach(voice => {
      try {
        voice.stop();
      } catch (e) {}
    });
    this.activeVoices.clear();
    this.stopBGM();
  }

  // Stop only all playing sound effects, keeping BGM active
  stopAllSFX() {
    this.activeVoices.forEach(voice => {
      try {
        voice.stop();
      } catch (e) {}
    });
    this.activeVoices.clear();
  }

  // Stop a specific sound's entire playing voices (for instance when loop toggled off or specific Pad is toggled stop)
  stopSound(soundId: string) {
    this.activeVoices.forEach((voice, voiceId) => {
      if (voiceId.startsWith(soundId)) {
        try {
          voice.stop();
        } catch (e) {}
        this.activeVoices.delete(voiceId);
      }
    });
  }

  // Query if a sound is currently actively playing
  isSoundPlaying(soundId: string): boolean {
    let result = false;
    this.activeVoices.forEach((_, voiceId) => {
      if (voiceId.startsWith(soundId)) {
        result = true;
      }
    });
    return result;
  }

  // ================= BGM SYSTEM METHODS =================

  // ================= BGM SYSTEM METHODS =================

  private fadeAndDisposeBGM(fadeOutDuration: number = 1.2) {
    if (this.bgmPauseTimeout) {
      clearTimeout(this.bgmPauseTimeout);
      this.bgmPauseTimeout = null;
    }

    const fadeGain = this.bgmGainNode;
    const fadeAudio = this.bgmAudio;
    const fadeSource = this.bgmSourceNode;
    const fadeSynthNodes = this.proceduralBgmNodes;

    if (this.ctx && fadeGain) {
      const now = this.ctx.currentTime;
      try {
        fadeGain.gain.setValueAtTime(fadeGain.gain.value, now);
        fadeGain.gain.linearRampToValueAtTime(0, now + fadeOutDuration);
      } catch (e) {
        console.warn('Failed scheduling gain fadeout:', e);
      }

      // Cleanup after fade completes
      setTimeout(() => {
        if (fadeAudio) {
          try {
            fadeAudio.pause();
          } catch (e) {}
        }
        if (fadeSource) {
          try {
            fadeSource.disconnect();
          } catch (e) {}
        }
        if (fadeSynthNodes && fadeSynthNodes.length > 0) {
          fadeSynthNodes.forEach(node => {
            try {
              (node as any).stop();
            } catch (e) {}
            try {
              node.disconnect();
            } catch (e) {}
          });
        }
        try {
          fadeGain.disconnect();
        } catch (e) {}
      }, fadeOutDuration * 1000 + 100);
    } else {
      // Immediate cleanup fallback
      if (fadeAudio) {
        try { fadeAudio.pause(); } catch (e) {}
      }
      if (fadeSource) {
        try { fadeSource.disconnect(); } catch (e) {}
      }
      if (fadeSynthNodes && fadeSynthNodes.length > 0) {
        fadeSynthNodes.forEach(node => {
          try { (node as any).stop(); } catch (e) {}
          try { node.disconnect(); } catch (e) {}
        });
      }
      if (fadeGain) {
        try { fadeGain.disconnect(); } catch (e) {}
      }
    }

    this.bgmAudio = null;
    this.bgmSourceNode = null;
    this.bgmGainNode = null;
    this.proceduralBgmNodes = [];
  }

  async playBGM(trackId: string, fileBlob: Blob, volume: number, loop: boolean) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Graceful fast fade of current active BGM before playing new one
    this.stopBGM(0.6);

    const audioUrl = URL.createObjectURL(fileBlob);
    const audio = new Audio(audioUrl);
    audio.loop = loop;
    audio.crossOrigin = "anonymous";

    const bgmGain = this.ctx.createGain();
    // Beautiful fade-in transition
    bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
    bgmGain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 1.2);

    // Audio Graph: Audio Element -> BGM Gain Node -> Master Gain -> speakers
    const source = this.ctx.createMediaElementSource(audio);
    source.connect(bgmGain);
    bgmGain.connect(this.masterGain);

    audio.play().catch(e => console.warn('BGM tag playback failed:', e));

    this.bgmAudio = audio;
    this.bgmSourceNode = source;
    this.bgmGainNode = bgmGain;
    this.currentBGMTrackId = trackId;
    this.bgmPlayState = 'playing';
  }

  playProceduralBGM(volume: number) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    // Graceful fast fade of current active BGM
    this.stopBGM(0.6);

    const ctx = this.ctx;
    const now = ctx.currentTime;

    const bgmGain = ctx.createGain();
    bgmGain.gain.setValueAtTime(0, now);
    bgmGain.gain.linearRampToValueAtTime(volume, now + 1.5); // smooth fade-in
    bgmGain.connect(this.masterGain);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const subOsc = ctx.createOscillator();

    osc1.type = 'triangle';
    osc2.type = 'sawtooth';
    subOsc.type = 'sine';

    // Deep sci-fi ambient chords: C2 (65.41Hz), G2 (98.00Hz), C1 (32.70Hz)
    osc1.frequency.setValueAtTime(65.41, now);
    osc2.frequency.setValueAtTime(98.00, now);
    subOsc.frequency.setValueAtTime(32.70, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, now);

    // Sweep filter very slowly
    const filterLfo = ctx.createOscillator();
    filterLfo.frequency.setValueAtTime(0.08, now); // 12.5 seconds oscillation

    const filterLfoGain = ctx.createGain();
    filterLfoGain.gain.setValueAtTime(60, now);

    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(filter.frequency);

    // Pitch detuning sweep
    const pitchLfo = ctx.createOscillator();
    pitchLfo.frequency.setValueAtTime(0.12, now);
    const pitchLfoGain = ctx.createGain();
    pitchLfoGain.gain.setValueAtTime(1.0, now);

    pitchLfo.connect(pitchLfoGain);
    pitchLfoGain.connect(osc2.frequency);

    osc1.connect(filter);
    osc2.connect(filter);
    subOsc.connect(filter);
    filter.connect(bgmGain);

    osc1.start(now);
    osc2.start(now);
    subOsc.start(now);
    filterLfo.start(now);
    pitchLfo.start(now);

    this.currentBGMTrackId = 'procedural_cosmic_drone';

    this.bgmAudio = null;
    this.bgmSourceNode = null;
    this.bgmGainNode = bgmGain;
    this.proceduralBgmNodes = [osc1, osc2, subOsc, filter, filterLfo, pitchLfo];
    this.bgmPlayState = 'playing';
  }

  stopBGM(fadeOutDuration = 1.2) {
    this.fadeAndDisposeBGM(fadeOutDuration);
    this.currentBGMTrackId = null;
    this.bgmPlayState = 'stopped';
  }

  pauseBGM(fadeOutDuration = 1.0) {
    if (this.bgmPlayState !== 'playing') return;

    if (this.bgmPauseTimeout) {
      clearTimeout(this.bgmPauseTimeout);
      this.bgmPauseTimeout = null;
    }

    this.bgmPlayState = 'paused';

    const fadeGain = this.bgmGainNode;
    const fadeAudio = this.bgmAudio;

    if (this.ctx && fadeGain) {
      const now = this.ctx.currentTime;
      try {
        fadeGain.gain.setValueAtTime(fadeGain.gain.value, now);
        fadeGain.gain.linearRampToValueAtTime(0, now + fadeOutDuration);
      } catch (e) {}

      if (fadeAudio) {
        this.bgmPauseTimeout = setTimeout(() => {
          try {
            if (this.bgmPlayState === 'paused') {
              fadeAudio.pause();
            }
          } catch (e) {}
          this.bgmPauseTimeout = null;
        }, fadeOutDuration * 1000);
      }
    } else {
      if (fadeAudio) {
        try { fadeAudio.pause(); } catch (e) {}
      }
    }
  }

  resumeBGM(volume: number, fadeInDuration = 1.0) {
    if (this.bgmPlayState !== 'paused') return;

    if (this.bgmPauseTimeout) {
      clearTimeout(this.bgmPauseTimeout);
      this.bgmPauseTimeout = null;
    }

    this.bgmPlayState = 'playing';

    if (this.bgmAudio) {
      this.bgmAudio.play().catch(e => console.warn('BGM resume failed:', e));
      if (this.ctx && this.bgmGainNode) {
        const now = this.ctx.currentTime;
        this.bgmGainNode.gain.setValueAtTime(this.bgmGainNode.gain.value, now);
        this.bgmGainNode.gain.linearRampToValueAtTime(volume, now + fadeInDuration);
      }
    } else if (this.proceduralBgmNodes.length > 0 && this.bgmGainNode) {
      if (this.ctx) {
        const now = this.ctx.currentTime;
        this.bgmGainNode.gain.setValueAtTime(0, now);
        this.bgmGainNode.gain.linearRampToValueAtTime(volume, now + fadeInDuration);
      }
    }
  }

  setBGMVolume(volume: number) {
    if (this.bgmGainNode && this.ctx && this.bgmPlayState === 'playing') {
      this.bgmGainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
    }
  }

  setBGMLooping(loop: boolean) {
    if (this.bgmAudio) {
      this.bgmAudio.loop = loop;
    }
  }

  getBGMDetails(): { trackId: string | null; state: 'playing' | 'paused' | 'stopped' } {
    return {
      trackId: this.currentBGMTrackId,
      state: this.bgmPlayState,
    };
  }
}

export const audioEngine = new AudioEngine();
