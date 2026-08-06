export type AdpcmSampleBank = {
  kick: AudioBuffer;
  snare: AudioBuffer;
  clap: AudioBuffer;
  tom: AudioBuffer;
  orchestraHit: AudioBuffer;
  voiceStab: AudioBuffer;
  metal: AudioBuffer;
  highChime: AudioBuffer;
};

type AdpcmSampleOptions = {
  gain?: number;
  pan?: number;
  playbackRate?: number;
};

const ADPCM_SAMPLE_RATE = 15_625;

// MSM6258そのものをレジスタ単位でエミュレートするのではなく、
// 低サンプルレートの素材を4-bit適応差分量子化して質感を近づける。
const STEP_TABLE = [
  7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31,
  34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143,
  157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598,
  658, 724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066,
  2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484,
  7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899, 15289, 16818, 18500,
  20350, 22385, 24623, 27086, 29794, 32767,
] as const;

const INDEX_TABLE = [-1, -1, -1, -1, 2, 4, 6, 8] as const;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function createNoise(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000 * 2 - 1;
  };
}

function renderSample(duration: number, render: (time: number, index: number) => number): Float32Array {
  const frameCount = Math.ceil(duration * ADPCM_SAMPLE_RATE);
  const samples = new Float32Array(frameCount);
  const fadeSeconds = 0.018;
  for (let index = 0; index < frameCount; index += 1) {
    const time = index / ADPCM_SAMPLE_RATE;
    const fadeOut = clamp((duration - time) / fadeSeconds, 0, 1);
    samples[index] = clamp(render(time, index) * fadeOut, -1, 1);
  }
  return samples;
}

function applyFourBitAdaptiveQuantization(input: Float32Array): Float32Array {
  const output = new Float32Array(input.length);
  let predictor = 0;
  let stepIndex = 20;

  for (let index = 0; index < input.length; index += 1) {
    const target = Math.round(clamp(input[index], -1, 1) * 32767);
    const step = STEP_TABLE[stepIndex];
    let delta = target - predictor;
    let nibble = 0;
    if (delta < 0) {
      nibble = 8;
      delta = -delta;
    }

    let difference = step >> 3;
    if (delta >= step) {
      nibble |= 4;
      delta -= step;
      difference += step;
    }
    if (delta >= step >> 1) {
      nibble |= 2;
      delta -= step >> 1;
      difference += step >> 1;
    }
    if (delta >= step >> 2) {
      nibble |= 1;
      difference += step >> 2;
    }

    predictor += nibble & 8 ? -difference : difference;
    predictor = clamp(predictor, -32768, 32767);
    stepIndex = clamp(stepIndex + INDEX_TABLE[nibble & 7], 0, STEP_TABLE.length - 1);
    output[index] = predictor / 32768;
  }

  return output;
}

function createBuffer(
  context: AudioContext,
  duration: number,
  render: (time: number, index: number) => number,
): AudioBuffer {
  const buffer = context.createBuffer(1, Math.ceil(duration * ADPCM_SAMPLE_RATE), ADPCM_SAMPLE_RATE);
  buffer.copyToChannel(applyFourBitAdaptiveQuantization(renderSample(duration, render)), 0);
  return buffer;
}

function createKickSample(context: AudioContext): AudioBuffer {
  const noise = createNoise(0x68000);
  let phase = 0;
  return createBuffer(context, 0.32, (time) => {
    const frequency = 45 + 118 * Math.exp(-time * 20);
    phase += Math.PI * 2 * frequency / ADPCM_SAMPLE_RATE;
    const body = Math.sin(phase) * Math.exp(-time * 13.5);
    const click = noise() * Math.exp(-time * 72) * 0.2;
    return body * 0.9 + click;
  });
}

function createSnareSample(context: AudioContext): AudioBuffer {
  const noise = createNoise(0x6258);
  let lowNoise = 0;
  let phase = 0;
  return createBuffer(context, 0.3, (time) => {
    const white = noise();
    lowNoise = lowNoise * 0.76 + white * 0.24;
    const highNoise = white - lowNoise;
    phase += Math.PI * 2 * (188 - time * 120) / ADPCM_SAMPLE_RATE;
    const envelope = Math.exp(-time * 16);
    return (highNoise * 0.78 + Math.sin(phase) * 0.28) * envelope;
  });
}

function createClapSample(context: AudioContext): AudioBuffer {
  const noise = createNoise(0xc1a9);
  let lowNoise = 0;
  const burstOffsets = [0, 0.018, 0.037, 0.064] as const;
  return createBuffer(context, 0.36, (time) => {
    const white = noise();
    lowNoise = lowNoise * 0.83 + white * 0.17;
    const brightNoise = white - lowNoise;
    const burstEnvelope = burstOffsets.reduce<number>((sum, offset, index) => (
      time >= offset ? sum + Math.exp(-(time - offset) * (index === burstOffsets.length - 1 ? 12 : 42)) : sum
    ), 0);
    return brightNoise * Math.min(1, burstEnvelope) * 0.72;
  });
}

function createTomSample(context: AudioContext): AudioBuffer {
  const noise = createNoise(0x70_0a);
  let phase = 0;
  return createBuffer(context, 0.42, (time) => {
    const frequency = 78 + 132 * Math.exp(-time * 8.5);
    phase += Math.PI * 2 * frequency / ADPCM_SAMPLE_RATE;
    const envelope = Math.exp(-time * 8.2);
    return (Math.sin(phase) * 0.86 + noise() * Math.exp(-time * 48) * 0.16) * envelope;
  });
}

function createOrchestraHitSample(context: AudioContext): AudioBuffer {
  const frequencies = [110, 164.81, 220, 261.63, 329.63, 440] as const;
  const phases = frequencies.map(() => 0);
  const noise = createNoise(0x0ace57a);
  return createBuffer(context, 0.58, (time) => {
    const pitchBend = 1.018 - Math.exp(-time * 24) * 0.052;
    let chord = 0;
    frequencies.forEach((frequency, voiceIndex) => {
      phases[voiceIndex] += Math.PI * 2 * frequency * pitchBend / ADPCM_SAMPLE_RATE;
      chord += Math.sin(phases[voiceIndex]) * (voiceIndex < 2 ? 0.19 : 0.12);
      chord += Math.sin(phases[voiceIndex] * 2) * 0.035;
    });
    const attack = Math.min(1, time * 180);
    const envelope = attack * Math.exp(-time * 5.6);
    return (chord + noise() * Math.exp(-time * 32) * 0.16) * envelope;
  });
}

function createVoiceStabSample(context: AudioContext): AudioBuffer {
  const noise = createNoise(0x10_ce);
  let fundamentalPhase = 0;
  let formantOnePhase = 0;
  let formantTwoPhase = 0;
  let formantThreePhase = 0;
  return createBuffer(context, 0.48, (time) => {
    const fundamental = 126 + Math.min(time, 0.08) * 310;
    fundamentalPhase += Math.PI * 2 * fundamental / ADPCM_SAMPLE_RATE;
    formantOnePhase += Math.PI * 2 * 640 / ADPCM_SAMPLE_RATE;
    formantTwoPhase += Math.PI * 2 * 1160 / ADPCM_SAMPLE_RATE;
    formantThreePhase += Math.PI * 2 * 2380 / ADPCM_SAMPLE_RATE;
    const glottal = Math.sin(fundamentalPhase)
      + Math.sin(fundamentalPhase * 2) * 0.34
      + Math.sin(fundamentalPhase * 3) * 0.16;
    const formants = Math.sin(formantOnePhase) * 0.25
      + Math.sin(formantTwoPhase) * 0.15
      + Math.sin(formantThreePhase) * 0.07;
    const gate = time < 0.16 ? 1 : time < 0.22 ? 0.36 : 0.72;
    const envelope = Math.min(1, time * 120) * Math.exp(-time * 5.4) * gate;
    return (glottal * 0.45 + formants + noise() * 0.035) * envelope;
  });
}

function createMetalSample(context: AudioContext): AudioBuffer {
  const frequencies = [421, 613, 877, 1249, 1811, 2593] as const;
  const phases = frequencies.map(() => 0);
  const noise = createNoise(0x6d_37a1);
  return createBuffer(context, 0.78, (time) => {
    let metal = 0;
    frequencies.forEach((frequency, voiceIndex) => {
      phases[voiceIndex] += Math.PI * 2 * frequency / ADPCM_SAMPLE_RATE;
      metal += Math.sin(phases[voiceIndex]) * Math.exp(-time * (4.8 + voiceIndex * 0.8)) / (voiceIndex + 1);
    });
    return metal * 0.72 + noise() * Math.exp(-time * 16) * 0.12;
  });
}

function createHighChimeSample(context: AudioContext): AudioBuffer {
  // C6（MIDI 84）を基音にした有音程のADPCM素材。最高音（MIDI 99）へ
  // playbackRateを上げてもMSM6258の7.8 kHzナイキストを越えない比率だけを使う。
  const baseFrequency = 1046.5;
  const ratios = [1, 1.501, 2.003, 2.407] as const;
  const frequencies = ratios.map((ratio) => baseFrequency * ratio);
  const phases = frequencies.map(() => 0);
  return createBuffer(context, 0.54, (time) => {
    let partials = 0;
    frequencies.forEach((frequency, voiceIndex) => {
      phases[voiceIndex] += Math.PI * 2 * frequency / ADPCM_SAMPLE_RATE;
      const decay = Math.exp(-time * (4.8 + voiceIndex * 0.9));
      partials += Math.sin(phases[voiceIndex]) * decay * (0.36 / (voiceIndex + 1));
    });
    const attack = Math.min(1, time * 190);
    return partials * attack;
  });
}

export function createAdpcmSampleBank(context: AudioContext): AdpcmSampleBank {
  return {
    kick: createKickSample(context),
    snare: createSnareSample(context),
    clap: createClapSample(context),
    tom: createTomSample(context),
    orchestraHit: createOrchestraHitSample(context),
    voiceStab: createVoiceStabSample(context),
    metal: createMetalSample(context),
    highChime: createHighChimeSample(context),
  };
}

export function scheduleAdpcmSample(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  buffer: AudioBuffer,
  startAt: number,
  options: AdpcmSampleOptions = {},
): void {
  const source = context.createBufferSource();
  const envelope = context.createGain();
  const panner = context.createStereoPanner();
  const playbackRate = options.playbackRate ?? 1;
  const gain = options.gain ?? 0.2;
  const sampleDuration = buffer.duration / playbackRate;
  const releaseAt = startAt + Math.max(0.004, sampleDuration - 0.014);
  source.buffer = buffer;
  source.playbackRate.setValueAtTime(playbackRate, startAt);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.linearRampToValueAtTime(gain, startAt + Math.min(0.003, sampleDuration * 0.1));
  envelope.gain.setValueAtTime(gain, releaseAt);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + sampleDuration);
  panner.pan.setValueAtTime(clamp(options.pan ?? 0, -1, 1), startAt);
  source.connect(envelope);
  envelope.connect(panner);
  panner.connect(destination);
  source.start(startAt);
  source.stop(startAt + sampleDuration + 0.02);
  sources.push(source);
  source.addEventListener("ended", () => {
    const sourceIndex = sources.indexOf(source);
    if (sourceIndex >= 0) sources.splice(sourceIndex, 1);
    source.disconnect();
    envelope.disconnect();
    panner.disconnect();
  }, { once: true });
}
