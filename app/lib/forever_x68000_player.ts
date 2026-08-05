import { createFmVoice, midiToFrequency, type FmPatch } from "~/lib/fm_synth";

const BPM = 132;
const PULSE = 60 / BPM / 2;
const BAR_PULSES = 8;
const FINAL_PULSE = 144;
const TRACK_PULSES = 155;
const TRACK_DURATION = TRACK_PULSES * PULSE;

const padPatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 1, 2, 4],
  modulation: [1.25, 0.68, 0.24],
  attack: 0.08,
  decay: 0.42,
  peakGain: 0.019,
  sustainGain: 0.01,
  release: 0.58,
};

const bassPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2, 1, 3],
  modulation: [1.65, 0, 0.72],
  attack: 0.008,
  decay: 0.11,
  peakGain: 0.06,
  sustainGain: 0.024,
  release: 0.12,
};

const arpeggioPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2, 3, 7],
  modulation: [1.08, 0, 0.82],
  attack: 0.004,
  decay: 0.09,
  peakGain: 0.013,
  sustainGain: 0.0035,
  release: 0.13,
};

const leadPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 1, 2, 4],
  modulation: [1.18, 0.52, 0.2],
  attack: 0.012,
  decay: 0.2,
  peakGain: 0.035,
  sustainGain: 0.019,
  release: 0.3,
  vibratoRate: 5.4,
  vibratoCents: 6,
};

const echoPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 1, 2, 4],
  modulation: [0.92, 0.42, 0.15],
  attack: 0.018,
  decay: 0.22,
  peakGain: 0.014,
  sustainGain: 0.007,
  release: 0.34,
  vibratoRate: 5.1,
  vibratoCents: 4,
};

const accentPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 3, 2, 6],
  modulation: [1.5, 0, 1.28],
  attack: 0.003,
  decay: 0.12,
  peakGain: 0.015,
  sustainGain: 0.0015,
  release: 0.65,
};

const finalPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 1, 2, 3],
  modulation: [1.15, 0.5, 0.2],
  attack: 0.025,
  decay: 0.34,
  peakGain: 0.03,
  sustainGain: 0.017,
  release: 1.1,
  vibratoRate: 4.9,
  vibratoCents: 5,
};

const harmonies = {
  fsm: {
    bass: [42, 49, 54, 49],
    notes: [54, 57, 61, 66],
    arpeggio: [54, 61, 66, 69, 73, 69, 66, 61],
    accent: 78,
  },
  dmaj7: {
    bass: [38, 45, 50, 45],
    notes: [50, 54, 57, 61],
    arpeggio: [50, 57, 61, 66, 69, 66, 61, 57],
    accent: 73,
  },
  a: {
    bass: [45, 52, 57, 52],
    notes: [52, 57, 61, 64],
    arpeggio: [52, 57, 61, 64, 69, 64, 61, 57],
    accent: 76,
  },
  e: {
    bass: [40, 47, 52, 47],
    notes: [52, 56, 59, 64],
    arpeggio: [52, 59, 64, 68, 71, 68, 64, 59],
    accent: 76,
  },
  bm7: {
    bass: [35, 42, 47, 42],
    notes: [47, 50, 54, 57],
    arpeggio: [47, 54, 57, 62, 66, 62, 57, 54],
    accent: 74,
  },
  fsma: {
    bass: [45, 49, 54, 49],
    notes: [49, 54, 57, 61],
    arpeggio: [49, 57, 61, 66, 69, 66, 61, 57],
    accent: 73,
  },
  cs7: {
    bass: [37, 44, 49, 44],
    notes: [49, 53, 56, 59],
    arpeggio: [49, 56, 59, 65, 68, 65, 59, 56],
    accent: 77,
  },
  ae: {
    bass: [40, 45, 52, 45],
    notes: [52, 57, 61, 64],
    arpeggio: [52, 57, 64, 69, 73, 69, 64, 57],
    accent: 76,
  },
  gmaj7: {
    bass: [43, 50, 55, 50],
    notes: [55, 59, 62, 66],
    arpeggio: [55, 62, 66, 71, 74, 71, 66, 62],
    accent: 78,
  },
} as const;

const chordProgression = [
  harmonies.fsm,
  harmonies.fsm,
  harmonies.dmaj7,
  harmonies.a,
  harmonies.e,
  harmonies.bm7,
  harmonies.fsma,
  harmonies.dmaj7,
  harmonies.cs7,
  harmonies.fsm,
  harmonies.ae,
  harmonies.dmaj7,
  harmonies.bm7,
  harmonies.gmaj7,
  harmonies.e,
  harmonies.cs7,
  harmonies.fsm,
  harmonies.fsm,
] as const;

// 参照曲の音階は使わず、F# minorで書いたオリジナルのタイトル曲。
// [開始位置（八分音符単位）, MIDIノート, 長さ]。
const leadSequence = [
  [8, 66, 2], [10, 69, 1], [11, 73, 1], [12, 76, 2], [14, 73, 2],
  [16, 74, 2], [18, 73, 1], [19, 69, 1], [20, 66, 4],
  [24, 64, 1], [25, 69, 1], [26, 73, 2], [28, 71, 1], [29, 73, 1], [30, 76, 2],
  [32, 71, 2], [34, 69, 2], [36, 68, 1], [37, 66, 1], [38, 64, 2],

  [40, 66, 2], [42, 71, 1], [43, 74, 1], [44, 78, 2], [46, 76, 1], [47, 74, 1],
  [48, 73, 2], [50, 69, 1], [51, 66, 1], [52, 64, 2], [54, 66, 2],
  [56, 69, 1], [57, 73, 1], [58, 76, 2], [60, 78, 1], [61, 80, 1], [62, 78, 2],
  [64, 76, 2], [66, 73, 1], [67, 71, 1], [68, 69, 4],

  [72, 78, 2], [74, 81, 1], [75, 78, 1], [76, 76, 2], [78, 73, 2],
  [80, 74, 2], [82, 78, 1], [83, 76, 1], [84, 73, 2], [86, 69, 2],
  [88, 71, 1], [89, 74, 1], [90, 78, 2], [92, 76, 1], [93, 74, 1], [94, 71, 2],
  [96, 73, 2], [98, 71, 1], [99, 69, 1], [100, 68, 2], [102, 64, 2],

  [104, 66, 1], [105, 69, 1], [106, 73, 2], [108, 78, 2], [110, 80, 2],
  [112, 81, 2], [114, 80, 1], [115, 78, 1], [116, 76, 4],
  [120, 74, 2], [122, 73, 2], [124, 71, 1], [125, 73, 1], [126, 76, 2],
  [128, 73, 2], [130, 69, 2], [132, 68, 1], [133, 64, 1], [134, 66, 2],
] as const;

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.2), context.sampleRate);
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
  buffer: AudioBuffer,
  startAt: number,
  duration: number,
  frequency: number,
  gain: number,
): void {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  source.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(frequency, startAt);
  filter.Q.setValueAtTime(0.8, startAt);
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
  oscillator.frequency.setValueAtTime(130, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(44, startAt + 0.14);
  envelope.gain.setValueAtTime(0.12, startAt);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.17);
  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.18);
  sources.push(oscillator);
}

function createFourBitCurve(): Float32Array {
  const curve = new Float32Array(256);
  for (let index = 0; index < curve.length; index += 1) {
    const input = index / (curve.length - 1) * 2 - 1;
    curve[index] = Math.round(input * 8) / 8;
  }
  return curve;
}

export function playForeverX68000Track(context: AudioContext): () => void {
  const startAt = context.currentTime + 0.04;
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const fmBus = context.createGain();
  const adpcmBus = context.createGain();
  const quantizer = context.createWaveShaper();
  const noiseBuffer = createNoiseBuffer(context);
  const sources: AudioScheduledSourceNode[] = [];
  let disconnected = false;

  master.gain.setValueAtTime(0.43, startAt);
  compressor.threshold.setValueAtTime(-19, startAt);
  compressor.knee.setValueAtTime(14, startAt);
  compressor.ratio.setValueAtTime(7, startAt);
  compressor.attack.setValueAtTime(0.004, startAt);
  compressor.release.setValueAtTime(0.16, startAt);
  fmBus.gain.setValueAtTime(0.88, startAt);
  adpcmBus.gain.setValueAtTime(0.45, startAt);
  quantizer.curve = createFourBitCurve();
  quantizer.oversample = "none";

  fmBus.connect(master);
  adpcmBus.connect(quantizer);
  quantizer.connect(master);
  master.connect(compressor);
  compressor.connect(context.destination);

  chordProgression.forEach((chord, barIndex) => {
    const barStart = startAt + barIndex * BAR_PULSES * PULSE;

    chord.notes.forEach((midiNote, noteIndex) => {
      createFmVoice(
        context,
        fmBus,
        sources,
        midiToFrequency(midiNote),
        barStart,
        7.35 * PULSE,
        (noteIndex - 1.5) * 0.22,
        padPatch,
      );
    });

    chord.bass.forEach((midiNote, step) => {
      createFmVoice(
        context,
        fmBus,
        sources,
        midiToFrequency(midiNote),
        barStart + step * 2 * PULSE,
        1.55 * PULSE,
        step % 2 === 0 ? -0.08 : 0.08,
        bassPatch,
      );
    });

    chord.arpeggio.forEach((midiNote, step) => {
      createFmVoice(
        context,
        fmBus,
        sources,
        midiToFrequency(midiNote),
        barStart + step * PULSE,
        0.72 * PULSE,
        step % 2 === 0 ? -0.56 : 0.56,
        arpeggioPatch,
      );
    });

    createFmVoice(
      context,
      fmBus,
      sources,
      midiToFrequency(chord.accent),
      barStart + 6 * PULSE,
      1.25 * PULSE,
      barIndex % 2 === 0 ? -0.7 : 0.7,
      accentPatch,
    );
  });

  leadSequence.forEach(([pulseOffset, midiNote, durationInPulses]) => {
    const noteStart = startAt + pulseOffset * PULSE;
    const noteDuration = durationInPulses * PULSE;
    createFmVoice(context, fmBus, sources, midiToFrequency(midiNote), noteStart, noteDuration, 0, leadPatch);
    createFmVoice(context, fmBus, sources, midiToFrequency(midiNote), noteStart + PULSE, noteDuration, -0.52, echoPatch);
    createFmVoice(context, fmBus, sources, midiToFrequency(midiNote), noteStart + 2 * PULSE, noteDuration, 0.52, echoPatch);
  });

  for (let pulse = 8; pulse < FINAL_PULSE; pulse += 1) {
    const hitAt = startAt + pulse * PULSE;
    if (pulse % 4 === 0) createKick(context, adpcmBus, sources, hitAt);
    if (pulse % 4 === 2) createNoiseHit(context, adpcmBus, sources, noiseBuffer, hitAt, 0.11, 1550, 0.05);
    createNoiseHit(context, adpcmBus, sources, noiseBuffer, hitAt, 0.035, pulse % 2 === 0 ? 6800 : 8200, 0.011);
  }

  const finalStart = startAt + FINAL_PULSE * PULSE;
  [42, 54, 57, 61, 66].forEach((midiNote, index) => {
    createFmVoice(
      context,
      fmBus,
      sources,
      midiToFrequency(midiNote),
      finalStart,
      6.5 * PULSE,
      (index - 2) * 0.25,
      finalPatch,
    );
  });
  createKick(context, adpcmBus, sources, finalStart);
  createNoiseHit(context, adpcmBus, sources, noiseBuffer, finalStart, 0.3, 4200, 0.055);

  const disconnectGraph = () => {
    if (disconnected) return;
    disconnected = true;
    fmBus.disconnect();
    adpcmBus.disconnect();
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
