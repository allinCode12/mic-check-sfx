// Web Audio API Synthesizer for procedural sci-fi sound effects.

export function playSynthesizedSound(
  type: string,
  volume: number,
  ctx: AudioContext,
  parentDestination: AudioNode
): { stop: () => void; isLooping: boolean } {
  // Ensure the audio context is active
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  // Create a gain node for this specific play instance
  const instanceGain = ctx.createGain();
  instanceGain.gain.setValueAtTime(volume, ctx.currentTime);
  instanceGain.connect(parentDestination);

  const activeNodes: (OscillatorNode | BiquadFilterNode | GainNode | AudioScheduledSourceNode)[] = [];
  let stopCallbacks: (() => void)[] = [];
  let isLoopingSound = false;

  const registerNode = <T extends OscillatorNode | BiquadFilterNode | GainNode | AudioScheduledSourceNode>(node: T): T => {
    activeNodes.push(node);
    return node;
  };

  const now = ctx.currentTime;

  switch (type) {
    case 'laser': {
      // Classic Expo pitch sweep
      const osc = registerNode(ctx.createOscillator());
      osc.type = 'sawtooth';
      
      const filter = registerNode(ctx.createBiquadFilter());
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);
      
      osc.frequency.setValueAtTime(1500, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.35);
      
      instanceGain.gain.setValueAtTime(volume, now);
      instanceGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      
      osc.connect(filter);
      filter.connect(instanceGain);
      
      osc.start(now);
      osc.stop(now + 0.4);
      break;
    }

    case 'portal': {
      // Heavy sweeping bandpass filter on detuned triangle waves
      const osc1 = registerNode(ctx.createOscillator());
      const osc2 = registerNode(ctx.createOscillator());
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      
      osc1.frequency.setValueAtTime(80, now);
      osc1.frequency.linearRampToValueAtTime(320, now + 1.2);
      osc1.frequency.linearRampToValueAtTime(120, now + 2.0);
      
      osc2.frequency.setValueAtTime(82, now);
      osc2.frequency.linearRampToValueAtTime(325, now + 1.2);
      osc2.frequency.linearRampToValueAtTime(122, now + 2.0);
      
      const filter = registerNode(ctx.createBiquadFilter());
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(5, now);
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(2200, now + 0.9);
      filter.frequency.exponentialRampToValueAtTime(300, now + 2.0);

      // Amplitude LFO mapping to cyber throttle
      const lfo = registerNode(ctx.createOscillator());
      lfo.frequency.setValueAtTime(12, now); // 12Hz wobble
      const lfoGain = registerNode(ctx.createGain());
      lfoGain.gain.setValueAtTime(0.3, now);
      
      const gainNode = registerNode(ctx.createGain());
      gainNode.gain.setValueAtTime(0.6, now);
      
      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);
      
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(instanceGain);

      instanceGain.gain.setValueAtTime(0, now);
      instanceGain.gain.linearRampToValueAtTime(volume, now + 0.3);
      instanceGain.gain.setValueAtTime(volume, now + 1.6);
      instanceGain.gain.exponentialRampToValueAtTime(0.005, now + 2.0);

      lfo.start(now);
      osc1.start(now);
      osc2.start(now);
      
      lfo.stop(now + 2.0);
      osc1.stop(now + 2.0);
      osc2.stop(now + 2.0);
      break;
    }

    case 'alarm': {
      // Pulsing high emergency tone alert (continuous loop potential)
      const osc = registerNode(ctx.createOscillator());
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      
      const lfo = registerNode(ctx.createOscillator());
      lfo.frequency.setValueAtTime(4, now); // 4 pulses per second
      
      const lfoGain = registerNode(ctx.createGain());
      lfoGain.gain.setValueAtTime(220, now); // swing between 660 and 1100 Hz
      
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      
      osc.connect(instanceGain);
      
      // Let's implement dynamic looping capability OR default play of 2.0s
      lfo.start(now);
      osc.start(now);
      
      // Volume oscillation matches high pulse
      const volLfo = registerNode(ctx.createOscillator());
      volLfo.type = 'square';
      volLfo.frequency.setValueAtTime(4, now);
      const volLfoGain = registerNode(ctx.createGain());
      volLfoGain.gain.setValueAtTime(0.5, now);
      
      volLfo.connect(volLfoGain);
      volLfoGain.connect(instanceGain.gain);
      volLfo.start(now);

      stopCallbacks.push(() => {
        try {
          osc.stop();
          lfo.stop();
          volLfo.stop();
        } catch (e) {}
      });

      // Default duration is 2.5s if not stopped
      osc.stop(now + 2.5);
      lfo.stop(now + 2.5);
      volLfo.stop(now + 2.5);
      break;
    }

    case 'shatter': {
      // Noise buffer + metallic high-frequency resonant filters
      const bufferSize = ctx.sampleRate * 0.4; // 0.4 seconds of rattle
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseNode = registerNode(ctx.createBufferSource());
      noiseNode.buffer = buffer;
      
      const biquad = registerNode(ctx.createBiquadFilter());
      biquad.type = 'bandpass';
      biquad.frequency.setValueAtTime(4000, now);
      biquad.frequency.exponentialRampToValueAtTime(1200, now + 0.4);
      biquad.Q.setValueAtTime(8, now);
      
      // Metallic clink oscillators
      const metalOsc = registerNode(ctx.createOscillator());
      metalOsc.type = 'triangle';
      metalOsc.frequency.setValueAtTime(1800, now);
      metalOsc.frequency.linearRampToValueAtTime(3400, now + 0.1);
      
      const metalGain = registerNode(ctx.createGain());
      metalGain.gain.setValueAtTime(0.4, now);
      metalGain.gain.exponentialRampToValueAtTime(0.005, now + 0.2);
      
      noiseNode.connect(biquad);
      biquad.connect(instanceGain);
      
      metalOsc.connect(metalGain);
      metalGain.connect(instanceGain);
      
      instanceGain.gain.setValueAtTime(volume * 1.5, now);
      instanceGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      
      noiseNode.start(now);
      metalOsc.start(now);
      metalOsc.stop(now + 0.3);
      break;
    }

    case 'subdrop': {
      // Classic cinematic bass sweep
      const osc = registerNode(ctx.createOscillator());
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 2.2);
      
      const distortion = registerNode(ctx.createBiquadFilter());
      distortion.type = 'lowpass';
      distortion.frequency.setValueAtTime(150, now);
      distortion.frequency.linearRampToValueAtTime(60, now + 2.2);

      osc.connect(distortion);
      distortion.connect(instanceGain);
      
      instanceGain.gain.setValueAtTime(0.01, now);
      instanceGain.gain.linearRampToValueAtTime(volume * 1.5, now + 0.1);
      instanceGain.gain.exponentialRampToValueAtTime(0.005, now + 2.2);
      
      osc.start(now);
      osc.stop(now + 2.3);
      break;
    }

    case 'buzz': {
      // Harsh industrial hazard alert
      const osc1 = registerNode(ctx.createOscillator());
      const osc2 = registerNode(ctx.createOscillator());
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      
      osc1.frequency.setValueAtTime(60, now);
      osc2.frequency.setValueAtTime(60.8, now); // detune
      
      const filter = registerNode(ctx.createBiquadFilter());
      filter.type = 'peaking';
      filter.frequency.setValueAtTime(400, now);
      filter.Q.setValueAtTime(4, now);
      
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(instanceGain);
      
      instanceGain.gain.setValueAtTime(volume, now);
      instanceGain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.85);
      osc2.stop(now + 0.85);
      break;
    }

    case 'hum': {
      // Infinite active core hum
      isLoopingSound = true;
      const osc = registerNode(ctx.createOscillator());
      const subOsc = registerNode(ctx.createOscillator());
      osc.type = 'triangle';
      subOsc.type = 'sine';
      
      osc.frequency.setValueAtTime(100, now);
      subOsc.frequency.setValueAtTime(50, now);

      // Pitch drift LFO
      const driftLfo = registerNode(ctx.createOscillator());
      driftLfo.frequency.setValueAtTime(0.3, now); // slow drift
      const driftGain = registerNode(ctx.createGain());
      driftGain.gain.setValueAtTime(1.5, now);
      driftLfo.connect(driftGain);
      driftGain.connect(osc.frequency);
      
      const lp = registerNode(ctx.createBiquadFilter());
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(220, now);
      
      osc.connect(lp);
      subOsc.connect(lp);
      lp.connect(instanceGain);
      
      instanceGain.gain.setValueAtTime(0, now);
      instanceGain.gain.linearRampToValueAtTime(volume * 0.8, now + 0.5);
      
      driftLfo.start(now);
      osc.start(now);
      subOsc.start(now);

      stopCallbacks.push(() => {
        const stopTime = ctx.currentTime;
        instanceGain.gain.setValueAtTime(instanceGain.gain.value, stopTime);
        instanceGain.gain.exponentialRampToValueAtTime(0.005, stopTime + 0.4);
        try {
          osc.stop(stopTime + 0.4);
          subOsc.stop(stopTime + 0.4);
          driftLfo.stop(stopTime + 0.4);
        } catch (e) {}
      });
      break;
    }

    case 'spark': {
      // Random crackling electrostatic bursts
      const sparkSource = registerNode(ctx.createOscillator());
      sparkSource.type = 'sawtooth';
      sparkSource.frequency.setValueAtTime(1200, now);

      const filter = registerNode(ctx.createBiquadFilter());
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(3000, now);

      // LFO mapping to volume to simulate quick high sparks
      const sparkLfo = registerNode(ctx.createOscillator());
      sparkLfo.type = 'square';
      sparkLfo.frequency.setValueAtTime(16, now); // high rate clicks

      const sparkLfoGain = registerNode(ctx.createGain());
      sparkLfoGain.gain.setValueAtTime(0.5, now);

      sparkLfo.connect(sparkLfoGain);
      sparkLfoGain.connect(instanceGain.gain);

      sparkSource.connect(filter);
      filter.connect(instanceGain);

      instanceGain.gain.setValueAtTime(volume * 1.2, now);
      instanceGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      sparkLfo.start(now);
      sparkSource.start(now);

      sparkLfo.stop(now + 0.5);
      sparkSource.stop(now + 0.5);
      break;
    }

    default:
      console.warn('Unknown synth type:', type);
      break;
  }

  return {
    isLooping: isLoopingSound,
    stop: () => {
      stopCallbacks.forEach((cb) => cb());
      instanceGain.gain.setValueAtTime(instanceGain.gain.value, ctx.currentTime);
      instanceGain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.1);
      setTimeout(() => {
        try {
          instanceGain.disconnect();
        } catch (e) {}
      }, 200);
    },
  };
}
