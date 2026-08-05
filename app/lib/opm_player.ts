type FmPatch = {
  algorithm: "serial" | "dual" | "fan";
  ratios: readonly [number, number, number, number];
  modulation: readonly [number, number, number];
  attack: number;
  decay: number;
  peakGain: number;
  sustainGain: number;
  vibratoRate?: number;
  vibratoCents?: number;
};

// 「Вот мчится тройка почтовая」の公開MIDIと同じテンポ。
// BEAT は譜面上の八分音符1つ分を表す。
const BPM = 80;
const BEAT = 60 / BPM / 2;
const HARMONY_BEATS = 4;
const GROOVE_BEATS = 96;
const TRACK_BEATS = 104;
const TRACK_DURATION = TRACK_BEATS * BEAT;

const brassPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2, 1, 3],
  modulation: [1.35, 0, 0.72],
  attack: 0.045,
  decay: 0.28,
  peakGain: 0.022,
  sustainGain: 0.012,
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
  ratios: [1, 1, 2, 4],
  modulation: [1.05, 0.48, 0.18],
  attack: 0.025,
  decay: 0.24,
  peakGain: 0.044,
  sustainGain: 0.026,
  vibratoRate: 5.2,
  vibratoCents: 7,
};

const arpeggioPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2, 3, 5],
  modulation: [0.85, 0, 0.5],
  attack: 0.009,
  decay: 0.11,
  peakGain: 0.012,
  sustainGain: 0.003,
};

const counterPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 1, 2, 3],
  modulation: [0.8, 0.35, 0.16],
  attack: 0.035,
  decay: 0.24,
  peakGain: 0.012,
  sustainGain: 0.007,
  vibratoRate: 4.8,
  vibratoCents: 4,
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
  am: {
    bass: [55, 82.41],
    notes: [110, 130.81, 164.81],
    arpeggio: [110, 164.81, 220, 261.63],
    bells: [880, 1318.51],
  },
  dm: {
    bass: [73.42, 110],
    notes: [146.83, 174.61, 220],
    arpeggio: [146.83, 220, 293.66, 349.23],
    bells: [880, 1174.66],
  },
  e7: {
    bass: [82.41, 123.47],
    notes: [164.81, 207.65, 246.94, 293.66],
    arpeggio: [164.81, 246.94, 329.63, 415.3],
    bells: [987.77, 1244.51],
  },
} as const;

const chordProgression = [
  harmonies.am, harmonies.am, harmonies.e7, harmonies.e7,
  harmonies.am, harmonies.dm, harmonies.e7, harmonies.e7,
  harmonies.am, harmonies.am, harmonies.dm, harmonies.dm,
  harmonies.am, harmonies.e7, harmonies.am, harmonies.am,
  harmonies.am, harmonies.am, harmonies.dm, harmonies.dm,
  harmonies.am, harmonies.e7, harmonies.am, harmonies.am,
] as const;

// ロシア語版「Вот мчится тройка почтовая」の公開MIDIから採譜。
// [開始位置（八分音符単位）, MIDIノート, 長さ]。
const leadSequence = [
  [0, 64, 1], [1, 69, 3], [4, 69, 1], [5, 69, 1], [6, 69, 1], [7, 68, 1],
  [8, 69, 1], [9, 71, 3], [12, 68, 1], [13, 64, 2],
  [16, 64, 1], [17, 72, 2], [19, 69, 2], [21, 60, 1], [22, 60, 1], [23, 62, 1],
  [24, 62, 1], [25, 64, 6],
  [32, 64, 1], [33, 69, 3], [36, 71, 1], [37, 72, 1], [38, 71, 1], [39, 69, 1],
  [40, 67, 1], [41, 62, 3], [44, 65, 1], [45, 69, 2], [47, 71, 1],
  [48, 69, 1], [49, 64, 3], [52, 65, 1], [53, 64, 1], [54, 62, 1], [55, 60, 1],
  [56, 59, 1], [57, 57, 4],
  [64, 64, 1], [65, 69, 3], [68, 71, 1], [69, 72, 1], [70, 71, 1], [71, 69, 1],
  [72, 67, 1], [73, 62, 3], [76, 65, 1], [77, 69, 2], [79, 71, 1],
  [80, 69, 1], [81, 64, 3], [84, 65, 1], [85, 64, 1], [86, 62, 1], [87, 60, 1],
  [88, 59, 1], [89, 57, 4],
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

  if (patch.vibratoRate && patch.vibratoCents) {
    const vibrato = context.createOscillator();
    const vibratoDepth = context.createGain();
    vibrato.frequency.setValueAtTime(patch.vibratoRate, startAt);
    vibratoDepth.gain.setValueAtTime(0, startAt);
    vibratoDepth.gain.linearRampToValueAtTime(
      patch.vibratoCents,
      startAt + Math.min(duration * 0.45, 0.4),
    );
    vibrato.connect(vibratoDepth);
    operators.forEach((operator) => vibratoDepth.connect(operator.detune));
    vibrato.start(startAt);
    vibrato.stop(startAt + duration + 0.02);
    sources.push(vibrato);
  }

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

  master.gain.setValueAtTime(0.48, startAt);
  compressor.threshold.setValueAtTime(-18, startAt);
  compressor.knee.setValueAtTime(16, startAt);
  compressor.ratio.setValueAtTime(8, startAt);
  compressor.attack.setValueAtTime(0.003, startAt);
  compressor.release.setValueAtTime(0.15, startAt);
  fmBus.gain.setValueAtTime(0.9, startAt);
  percussionBus.gain.setValueAtTime(0.36, startAt);
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
        3.55 * BEAT,
        (noteIndex - (chord.notes.length - 1) / 2) * 0.36,
        brassPatch,
      );
    });

    chord.bass.forEach((frequency, step) => {
      createFmVoice(
        context,
        fmBus,
        sources,
        frequency,
        segmentStart + step * 2 * BEAT,
        1.65 * BEAT,
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
        0.72 * BEAT,
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
      3.7 * BEAT,
      segmentIndex % 2 === 0 ? 0.3 : -0.3,
      counterPatch,
    );

    createFmVoice(
      context,
      fmBus,
      sources,
      chord.bells[segmentIndex % chord.bells.length],
      segmentStart + (segmentIndex % 2 === 0 ? 1 : 3) * BEAT,
      0.85 * BEAT,
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

    if (beatOffset >= 64) {
      createFmVoice(
        context,
        fmBus,
        sources,
        midiToFrequency(midiNote - 12),
        startAt + beatOffset * BEAT,
        durationInBeats * BEAT,
        index % 2 === 0 ? 0.36 : -0.36,
        counterPatch,
      );
    }
  });

  const finalStart = startAt + GROOVE_BEATS * BEAT;
  const finalDuration = 6 * BEAT;
  [110, 130.81, 164.81, 220].forEach((frequency, index) => {
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
  createFmVoice(context, fmBus, sources, 55, finalStart, finalDuration, 0, bassPatch);
  createFmVoice(context, fmBus, sources, midiToFrequency(69), finalStart, finalDuration, 0.12, leadPatch);

  for (let beat = 0; beat < GROOVE_BEATS; beat += 1) {
    const hitAt = startAt + beat * BEAT;

    if (beat % 8 === 0) {
      createKick(context, percussionBus, sources, hitAt);
    }

    if (beat % 8 === 4) {
      createNoiseHit(context, percussionBus, sources, noiseBuffer, hitAt, 0.16, 1350, 0.045, "bandpass");
    }

    if (beat % 2 === 0) {
      createNoiseHit(context, percussionBus, sources, noiseBuffer, hitAt, 0.05, 6800, 0.009, "highpass");
    }
  }

  [160, 125, 95].forEach((frequency, index) => {
    createTom(context, percussionBus, sources, startAt + (91 + index * 1.5) * BEAT, frequency);
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
