type FmPatch = {
  algorithm: "serial" | "dual" | "fan";
  ratios: readonly [number, number, number, number];
  modulation: readonly [number, number, number];
  attack: number;
  decay: number;
  peakGain: number;
  sustainGain: number;
};

const BPM = 112;
const BEAT = 60 / BPM / 2;
const HARMONY_BEATS = 4;
const GROOVE_BEATS = 128;
const TRACK_BEATS = 136;
const TRACK_DURATION = TRACK_BEATS * BEAT;

const brassPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 3, 1, 2],
  modulation: [2.4, 0, 1.1],
  attack: 0.014,
  decay: 0.16,
  peakGain: 0.027,
  sustainGain: 0.011,
};

const bassPatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 1, 2, 3],
  modulation: [1.35, 0.7, 0.25],
  attack: 0.008,
  decay: 0.09,
  peakGain: 0.085,
  sustainGain: 0.035,
};

const leadPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 1, 2, 3],
  modulation: [1.6, 0.8, 0.45],
  attack: 0.012,
  decay: 0.18,
  peakGain: 0.038,
  sustainGain: 0.021,
};

const arpeggioPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2, 3, 6],
  modulation: [1.35, 0, 0.8],
  attack: 0.005,
  decay: 0.07,
  peakGain: 0.018,
  sustainGain: 0.004,
};

const counterPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 2, 3, 5],
  modulation: [1.5, 0.55, 0.3],
  attack: 0.012,
  decay: 0.15,
  peakGain: 0.012,
  sustainGain: 0.006,
};

const bellPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2.5, 4, 7],
  modulation: [1.8, 0, 2.2],
  attack: 0.003,
  decay: 0.08,
  peakGain: 0.019,
  sustainGain: 0.002,
};

const finalPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 3, 1, 2],
  modulation: [1.9, 0, 0.8],
  attack: 0.014,
  decay: 0.22,
  peakGain: 0.038,
  sustainGain: 0.021,
};

const harmonies = {
  bm: {
    bass: 61.74,
    notes: [123.47, 146.83, 185],
    arpeggio: [123.47, 185, 246.94, 146.83],
    bells: [987.77, 1479.98],
  },
  em: {
    bass: 82.41,
    notes: [164.81, 196, 246.94],
    arpeggio: [164.81, 246.94, 329.63, 196],
    bells: [987.77, 1318.51],
  },
  fs7: {
    bass: 46.25,
    notes: [92.5, 116.54, 138.59, 164.81],
    arpeggio: [92.5, 138.59, 185, 116.54],
    bells: [932.33, 1108.73],
  },
} as const;

const chordProgression = [
  harmonies.bm, harmonies.bm, harmonies.em, harmonies.em,
  harmonies.fs7, harmonies.fs7, harmonies.bm, harmonies.bm,
  harmonies.bm, harmonies.bm, harmonies.em, harmonies.em,
  harmonies.bm, harmonies.bm, harmonies.fs7, harmonies.fs7,
  harmonies.bm, harmonies.bm, harmonies.em, harmonies.em,
  harmonies.fs7, harmonies.fs7, harmonies.bm, harmonies.bm,
  harmonies.bm, harmonies.bm, harmonies.em, harmonies.em,
  harmonies.fs7, harmonies.fs7, harmonies.bm, harmonies.bm,
] as const;

const troikaPhraseA = [
  [0, 66, 1], [1, 71, 3], [4, 73, 1], [5, 74, 1], [6, 73, 1], [7, 71, 1],
  [8, 67, 0.5], [8.5, 66, 0.5], [9, 64, 3], [12, 67, 1], [13, 71, 2], [15, 73, 1],
  [16, 71, 1], [17, 66, 3], [20, 67, 1], [21, 66, 1], [22, 64, 1], [23, 61, 1],
  [24, 62, 1], [25, 59, 6],
] as const;

const troikaPhraseB = [
  [0, 66, 1], [1, 71, 3], [4, 71, 1], [5, 71, 1], [6, 71, 1], [7, 70, 1],
  [8, 71, 1], [9, 73, 3], [12, 70, 1], [13, 66, 2],
  [16, 66, 1], [17, 74, 2], [19, 71, 2], [21, 62, 1], [22, 62, 1], [23, 64, 1],
  [24, 64, 1], [25, 66, 6],
] as const;

const leadSequence = [troikaPhraseA, troikaPhraseB, troikaPhraseA, troikaPhraseA].flatMap(
  (phrase, phraseIndex) => phrase.map(
    ([beatOffset, midiNote, durationInBeats]) => [
      beatOffset + phraseIndex * 32,
      midiNote,
      durationInBeats,
    ] as const,
  ),
);

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

  const attackEnd = startAt + Math.min(patch.attack, duration * 0.2);
  const decayEnd = startAt + Math.min(patch.decay, duration * 0.55);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(patch.peakGain, attackEnd);
  envelope.gain.exponentialRampToValueAtTime(patch.sustainGain, decayEnd);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  panner.pan.setValueAtTime(pan, startAt);

  if (patch.algorithm === "dual") {
    operators[1].connect(modulationDepths[0]);
    modulationDepths[0].connect(operators[0].frequency);
    operators[3].connect(modulationDepths[2]);
    modulationDepths[2].connect(operators[2].frequency);
    operators[0].connect(envelope);
    operators[2].connect(envelope);
  } else if (patch.algorithm === "fan") {
    operators.slice(0, 3).forEach((carrier, index) => {
      operators[3].connect(modulationDepths[index]);
      modulationDepths[index].connect(carrier.frequency);
      carrier.connect(envelope);
    });
  } else {
    operators[3].connect(modulationDepths[2]);
    modulationDepths[2].connect(operators[2].frequency);
    operators[2].connect(modulationDepths[1]);
    modulationDepths[1].connect(operators[1].frequency);
    operators[1].connect(modulationDepths[0]);
    modulationDepths[0].connect(operators[0].frequency);
    operators[0].connect(envelope);
  }

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

function createTom(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  startAt: number,
  frequency: number,
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.55, startAt + 0.13);
  envelope.gain.setValueAtTime(0.075, startAt);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.16);

  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.17);
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

  master.gain.setValueAtTime(0.44, startAt);
  compressor.threshold.setValueAtTime(-18, startAt);
  compressor.knee.setValueAtTime(16, startAt);
  compressor.ratio.setValueAtTime(8, startAt);
  compressor.attack.setValueAtTime(0.003, startAt);
  compressor.release.setValueAtTime(0.15, startAt);
  fmBus.gain.setValueAtTime(0.9, startAt);
  percussionBus.gain.setValueAtTime(0.58, startAt);
  quantizer.curve = createFourBitCurve();
  quantizer.oversample = "none";

  fmBus.connect(master);
  percussionBus.connect(quantizer);
  quantizer.connect(master);
  master.connect(compressor);
  compressor.connect(context.destination);

  chordProgression.forEach((chord, segmentIndex) => {
    const segmentStart = startAt + segmentIndex * HARMONY_BEATS * BEAT;

    chord.notes.forEach((frequency, noteIndex) => {
      createFmVoice(
        context,
        fmBus,
        sources,
        frequency,
        segmentStart,
        2.5 * BEAT,
        (noteIndex - (chord.notes.length - 1) / 2) * 0.36,
        brassPatch,
      );
    });

    [1, 2].forEach((ratio, step) => {
      createFmVoice(
        context,
        fmBus,
        sources,
        chord.bass * ratio,
        segmentStart + step * 2 * BEAT,
        1.2 * BEAT,
        step % 2 === 0 ? -0.08 : 0.08,
        bassPatch,
      );
    });

    chord.arpeggio.forEach((frequency, step) => {
      createFmVoice(
        context,
        fmBus,
        sources,
        frequency,
        segmentStart + step * BEAT,
        0.55 * BEAT,
        step % 2 === 0 ? -0.58 : 0.58,
        arpeggioPatch,
      );
    });

    createFmVoice(
      context,
      fmBus,
      sources,
      chord.notes[1] * 2,
      segmentStart,
      3.5 * BEAT,
      segmentIndex % 2 === 0 ? 0.3 : -0.3,
      counterPatch,
    );

    createFmVoice(
      context,
      fmBus,
      sources,
      chord.bells[segmentIndex % chord.bells.length],
      segmentStart + 3 * BEAT,
      0.7 * BEAT,
      segmentIndex % 2 === 0 ? -0.72 : 0.72,
      bellPatch,
    );
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
  const finalDuration = 4.5 * BEAT;
  [123.47, 146.83, 185, 246.94].forEach((frequency, index) => {
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
  createFmVoice(context, fmBus, sources, 61.74, finalStart, finalDuration, 0, bassPatch);
  createFmVoice(context, fmBus, sources, midiToFrequency(71), finalStart, finalDuration, 0.12, leadPatch);

  for (let beat = 0; beat < GROOVE_BEATS; beat += 1) {
    const hitAt = startAt + beat * BEAT;

    if (beat % 4 === 0) {
      createKick(context, percussionBus, sources, hitAt);
    }

    if (beat % 8 === 4) {
      createNoiseHit(context, percussionBus, sources, noiseBuffer, hitAt, 0.12, 1650, 0.07, "bandpass");
    }

    createNoiseHit(context, percussionBus, sources, noiseBuffer, hitAt, 0.05, beat % 2 === 0 ? 920 : 760, beat % 2 === 0 ? 0.032 : 0.022, "bandpass");
    createNoiseHit(context, percussionBus, sources, noiseBuffer, hitAt, 0.04, 7200, beat % 4 === 3 ? 0.022 : 0.012, "highpass");
  }

  [180, 145, 110].forEach((frequency, index) => {
    createTom(context, percussionBus, sources, startAt + (124 + index * 1.5) * BEAT, frequency);
  });
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
