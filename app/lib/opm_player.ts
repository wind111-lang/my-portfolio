type FmPatch = {
  ratios: readonly [number, number, number, number];
  modulation: readonly [number, number, number];
  attack: number;
  decay: number;
  peakGain: number;
  sustainGain: number;
};

const BPM = 132;
const BEAT = 60 / BPM;
const GROOVE_BEATS = 16;
const TRACK_BEATS = 18;
const TRACK_DURATION = TRACK_BEATS * BEAT;

const brassPatch: FmPatch = {
  ratios: [1, 2, 3, 4],
  modulation: [1.8, 1.1, 0.55],
  attack: 0.014,
  decay: 0.16,
  peakGain: 0.052,
  sustainGain: 0.019,
};

const bassPatch: FmPatch = {
  ratios: [1, 1, 2, 3],
  modulation: [1.35, 0.7, 0.25],
  attack: 0.008,
  decay: 0.09,
  peakGain: 0.085,
  sustainGain: 0.035,
};

const leadPatch: FmPatch = {
  ratios: [1, 2, 4, 6],
  modulation: [2.25, 1.45, 0.7],
  attack: 0.009,
  decay: 0.11,
  peakGain: 0.07,
  sustainGain: 0.03,
};

const finalPatch: FmPatch = {
  ratios: [1, 2, 3, 4],
  modulation: [1.65, 0.95, 0.45],
  attack: 0.014,
  decay: 0.22,
  peakGain: 0.056,
  sustainGain: 0.032,
};

const chordProgression = [
  { bass: 110, notes: [220, 261.63, 329.63] },
  { bass: 87.31, notes: [174.61, 220, 261.63] },
  { bass: 98, notes: [196, 246.94, 293.66] },
  { bass: 130.81, notes: [261.63, 329.63, 392] },
] as const;

const leadSequence = [
  [0.5, 72, 0.35], [1, 76, 0.35], [1.5, 81, 0.75], [2.5, 79, 0.35], [3, 76, 0.75],
  [4.5, 72, 0.35], [5, 77, 0.35], [5.5, 81, 0.75], [6.5, 79, 0.35], [7, 76, 0.75],
  [8, 74, 0.35], [8.5, 79, 0.35], [9, 83, 0.75], [10, 81, 0.35], [10.5, 79, 0.35], [11, 74, 0.75],
  [12, 79, 0.35], [12.5, 76, 0.35], [13, 74, 0.35], [13.5, 72, 0.75], [14.5, 76, 0.35], [15, 79, 0.8],
] as const;

function midiToFrequency(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

function createFmVoice(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  frequency: number,
  startAt: number,
  duration: number,
  pan: number,
  patch: FmPatch,
): void {
  const operators = Array.from({ length: 4 }, () => context.createOscillator());
  const modulationDepths = Array.from({ length: 3 }, () => context.createGain());
  const envelope = context.createGain();
  const panner = context.createStereoPanner();

  operators.forEach((operator, index) => {
    operator.type = "sine";
    operator.frequency.setValueAtTime(frequency * patch.ratios[index], startAt);
  });

  modulationDepths.forEach((depth, index) => {
    depth.gain.setValueAtTime(frequency * patch.modulation[index], startAt);
  });

  operators[3].connect(modulationDepths[2]);
  modulationDepths[2].connect(operators[2].frequency);
  operators[2].connect(modulationDepths[1]);
  modulationDepths[1].connect(operators[1].frequency);
  operators[1].connect(modulationDepths[0]);
  modulationDepths[0].connect(operators[0].frequency);

  const attackEnd = startAt + Math.min(patch.attack, duration * 0.2);
  const decayEnd = startAt + Math.min(patch.decay, duration * 0.55);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(patch.peakGain, attackEnd);
  envelope.gain.exponentialRampToValueAtTime(patch.sustainGain, decayEnd);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  panner.pan.setValueAtTime(pan, startAt);

  operators[0].connect(envelope);
  envelope.connect(panner);
  panner.connect(destination);

  operators.forEach((operator) => {
    operator.start(startAt);
    operator.stop(startAt + duration + 0.02);
    sources.push(operator);
  });
}

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.22), context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }

  return buffer;
}

function createNoiseHit(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  noiseBuffer: AudioBuffer,
  startAt: number,
  duration: number,
  frequency: number,
  gain: number,
  type: BiquadFilterType,
): void {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();

  source.buffer = noiseBuffer;
  filter.type = type;
  filter.frequency.setValueAtTime(frequency, startAt);
  filter.Q.setValueAtTime(type === "bandpass" ? 0.8 : 0.4, startAt);
  envelope.gain.setValueAtTime(gain, startAt);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(destination);
  source.start(startAt);
  source.stop(startAt + duration);
  sources.push(source);
}

function createKick(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  startAt: number,
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(145, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(48, startAt + 0.16);
  envelope.gain.setValueAtTime(0.14, startAt);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.19);

  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.2);
  sources.push(oscillator);
}

function createFourBitCurve(): Float32Array {
  const curve = new Float32Array(256);
  const maxFourBitValue = 15;

  for (let index = 0; index < curve.length; index += 1) {
    const input = index / (curve.length - 1) * 2 - 1;
    const normalized = (input + 1) / 2;
    curve[index] = Math.round(normalized * maxFourBitValue) / maxFourBitValue * 2 - 1;
  }

  return curve;
}

export function playOpmTrack(context: AudioContext): () => void {
  const startAt = context.currentTime + 0.035;
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const fmBus = context.createGain();
  const percussionBus = context.createGain();
  const quantizer = context.createWaveShaper();
  const noiseBuffer = createNoiseBuffer(context);
  const sources: AudioScheduledSourceNode[] = [];
  let disconnected = false;

  master.gain.setValueAtTime(0.48, startAt);
  compressor.threshold.setValueAtTime(-18, startAt);
  compressor.knee.setValueAtTime(16, startAt);
  compressor.ratio.setValueAtTime(8, startAt);
  compressor.attack.setValueAtTime(0.003, startAt);
  compressor.release.setValueAtTime(0.15, startAt);
  fmBus.gain.setValueAtTime(0.9, startAt);
  percussionBus.gain.setValueAtTime(0.72, startAt);
  quantizer.curve = createFourBitCurve();
  quantizer.oversample = "none";

  fmBus.connect(master);
  percussionBus.connect(quantizer);
  quantizer.connect(master);
  master.connect(compressor);
  compressor.connect(context.destination);

  chordProgression.forEach((chord, barIndex) => {
    const barStart = startAt + barIndex * 4 * BEAT;

    [0, 2.5].forEach((beatOffset, stabIndex) => {
      chord.notes.forEach((frequency, noteIndex) => {
        createFmVoice(
          context,
          fmBus,
          sources,
          frequency,
          barStart + beatOffset * BEAT,
          (stabIndex === 0 ? 1.35 : 0.8) * BEAT,
          (noteIndex - 1) * 0.48,
          brassPatch,
        );
      });
    });

    [1, 1, 1.5, 2, 1, 1.5, 1, 2].forEach((ratio, step) => {
      createFmVoice(
        context,
        fmBus,
        sources,
        chord.bass * ratio,
        barStart + step * 0.5 * BEAT,
        0.38 * BEAT,
        step % 2 === 0 ? -0.08 : 0.08,
        bassPatch,
      );
    });
  });

  leadSequence.forEach(([beatOffset, midiNote, durationInBeats], index) => {
    createFmVoice(
      context,
      fmBus,
      sources,
      midiToFrequency(midiNote),
      startAt + beatOffset * BEAT,
      durationInBeats * BEAT,
      index % 2 === 0 ? -0.22 : 0.22,
      leadPatch,
    );
  });

  const finalStart = startAt + GROOVE_BEATS * BEAT;
  const finalDuration = 1.55 * BEAT;
  [261.63, 329.63, 392, 523.25].forEach((frequency, index) => {
    createFmVoice(
      context,
      fmBus,
      sources,
      frequency,
      finalStart,
      finalDuration,
      (index - 1.5) * 0.34,
      finalPatch,
    );
  });
  createFmVoice(context, fmBus, sources, 130.81, finalStart, finalDuration, 0, bassPatch);
  createFmVoice(context, fmBus, sources, midiToFrequency(84), finalStart, finalDuration, 0.12, leadPatch);

  for (let beat = 0; beat < GROOVE_BEATS; beat += 1) {
    createKick(context, percussionBus, sources, startAt + beat * BEAT);

    if (beat % 4 === 1 || beat % 4 === 3) {
      createNoiseHit(context, percussionBus, sources, noiseBuffer, startAt + beat * BEAT, 0.14, 1650, 0.085, "bandpass");
    }
  }

  for (let step = 0; step < GROOVE_BEATS * 2; step += 1) {
    createNoiseHit(
      context,
      percussionBus,
      sources,
      noiseBuffer,
      startAt + step * 0.5 * BEAT,
      step % 8 === 7 ? 0.11 : 0.045,
      6800,
      step % 2 === 0 ? 0.035 : 0.022,
      "highpass",
    );
  }
  createKick(context, percussionBus, sources, finalStart);
  createNoiseHit(context, percussionBus, sources, noiseBuffer, finalStart, 0.18, 5200, 0.05, "highpass");

  const disconnectGraph = () => {
    if (disconnected) return;
    disconnected = true;
    fmBus.disconnect();
    percussionBus.disconnect();
    quantizer.disconnect();
    master.disconnect();
    compressor.disconnect();
  };
  const cleanupTimer = window.setTimeout(disconnectGraph, (TRACK_DURATION + 0.2) * 1000);

  return () => {
    window.clearTimeout(cleanupTimer);
    const stopAt = context.currentTime + 0.025;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(0.0001, context.currentTime, 0.008);
    sources.forEach((source) => {
      try {
        source.stop(stopAt);
      } catch {
        // 再生済みの音源ノードは停止済みのため何もしない。
      }
    });
    window.setTimeout(disconnectGraph, 80);
  };
}
