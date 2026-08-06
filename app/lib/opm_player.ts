import { createAdpcmSampleBank, scheduleAdpcmSample } from "~/lib/adpcm_synth";
import {
  createFmVoice,
  midiToFrequency,
  trackScheduledSource,
  type FmPatch,
} from "~/lib/fm_synth";

type NoteEvent = readonly [start: number, note: number, length: number];
type ArrangementDensity = "intro" | "light" | "full";
type LeadVoicing = "soft" | "bright" | "reed" | "ornament";

// 約75 BPMはハーフテンポ判定。原曲の拍感は約150 BPMで、
// BEATは譜面上の八分音符1つ分を表す。
const BPM = 150;
const BEAT = 60 / BPM / 2;
const HARMONY_BEATS = 8;
const FIRST_THEME_BEAT = 64;
const FIRST_FULL_BEAT = 128;
const INTERLUDE_BEAT = 352;
const SECOND_FULL_BEAT = 416;
const OUTRO_BEAT = 640;
const FINAL_FULL_BEAT = 704;
const FINAL_CHORD_BEAT = 768;
const TRACK_BEATS = 788;
const TRACK_DURATION = TRACK_BEATS * BEAT;
const LEAD_ECHO_DELAY = BEAT / 2;
const SCHEDULE_AHEAD_SECONDS = 5;

const brassPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2.002, 1.003, 3.01],
  modulation: [1.06, 0, 0.58],
  waveforms: ["triangle", "sine", "sine", "sine"],
  operatorDetuneCents: [-2.2, 1.1, 2.2, -1.1],
  filterFrequency: 5200,
  filterStartFrequency: 2200,
  filterAttack: 0.11,
  filterQ: 0.82,
  pitchAttackCents: -9,
  pitchAttackTime: 0.07,
  attack: 0.04,
  decay: 0.3,
  peakGain: 0.01,
  sustainGain: 0.0055,
  release: 0.5,
};

const stringPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 2, 3, 4.005],
  modulation: [0.32, 0.14, 0.06],
  waveforms: ["sine", "sine", "triangle", "sine"],
  operatorDetuneCents: [-4.2, -1.3, 4.2, 1.3],
  filterFrequency: 3300,
  filterStartFrequency: 1500,
  filterAttack: 0.2,
  filterQ: 0.56,
  attack: 0.11,
  decay: 0.52,
  peakGain: 0.0048,
  sustainGain: 0.0035,
  release: 0.78,
};

const bassPatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 1.002, 2, 3],
  modulation: [1.2, 0.62, 0.22],
  operatorCount: 2,
  waveforms: ["triangle", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.2, 1.2, 0, 0],
  filterFrequency: 1800,
  filterStartFrequency: 650,
  filterAttack: 0.055,
  filterQ: 0.74,
  attack: 0.008,
  decay: 0.1,
  peakGain: 0.04,
  sustainGain: 0.018,
  release: 0.18,
};

const subBassPatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 1.001, 2, 3],
  modulation: [0.36, 0, 0],
  operatorCount: 2,
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [-0.8, 0.8, 0, 0],
  filterFrequency: 760,
  filterStartFrequency: 300,
  filterAttack: 0.12,
  filterQ: 0.58,
  attack: 0.018,
  decay: 0.22,
  peakGain: 0.025,
  sustainGain: 0.017,
  release: 0.34,
};

const baritonePatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2.002, 1.5, 3.01],
  modulation: [0.54, 0, 0.24],
  waveforms: ["triangle", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.8, 0.8, 1.8, -0.8],
  filterFrequency: 3200,
  filterStartFrequency: 1250,
  filterAttack: 0.055,
  filterQ: 0.72,
  pitchAttackCents: -7,
  pitchAttackTime: 0.045,
  attack: 0.016,
  decay: 0.17,
  peakGain: 0.0064,
  sustainGain: 0.0028,
  release: 0.28,
};

const leadPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 1.998, 3.005, 4.01],
  modulation: [0.98, 0.44, 0.17],
  waveforms: ["triangle", "sine", "sine", "sine"],
  operatorDetuneCents: [-2.6, 1.1, 2.6, -1.1],
  filterFrequency: 6500,
  filterStartFrequency: 3400,
  filterAttack: 0.065,
  filterQ: 0.92,
  pitchAttackCents: -10,
  pitchAttackTime: 0.055,
  attack: 0.022,
  decay: 0.24,
  peakGain: 0.018,
  sustainGain: 0.01,
  release: 0.58,
  vibratoRate: 5.15,
  vibratoCents: 6,
};

const softLeadPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2.003, 1.004, 3.01],
  modulation: [0.62, 0, 0.28],
  waveforms: ["sine", "triangle", "sine", "sine"],
  operatorDetuneCents: [-2, 0.8, 2, -0.8],
  filterFrequency: 4800,
  filterStartFrequency: 2500,
  filterAttack: 0.09,
  filterQ: 0.7,
  pitchAttackCents: -6,
  pitchAttackTime: 0.06,
  attack: 0.035,
  decay: 0.3,
  peakGain: 0.01,
  sustainGain: 0.006,
  release: 0.66,
  vibratoRate: 5.05,
  vibratoCents: 4.2,
};

const reedLeadPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 2.006, 3.012, 5.018],
  modulation: [1.12, 0.36, 0.14],
  waveforms: ["triangle", "sine", "triangle", "sine"],
  operatorDetuneCents: [-3.1, -0.9, 3.1, 0.9],
  filterFrequency: 5900,
  filterStartFrequency: 2850,
  filterAttack: 0.055,
  filterQ: 1.02,
  pitchAttackCents: -8,
  pitchAttackTime: 0.048,
  attack: 0.014,
  decay: 0.22,
  peakGain: 0.014,
  sustainGain: 0.0082,
  release: 0.46,
  vibratoRate: 5.3,
  vibratoCents: 5.2,
};

const leadEchoPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 2.004, 2.997, 4.02],
  modulation: [0.78, 0.34, 0.12],
  waveforms: ["sine", "sine", "triangle", "sine"],
  operatorDetuneCents: [1.8, -0.8, -1.8, 0.8],
  filterFrequency: 5200,
  filterStartFrequency: 2800,
  filterAttack: 0.08,
  filterQ: 0.68,
  attack: 0.032,
  decay: 0.3,
  peakGain: 0.0074,
  sustainGain: 0.004,
  release: 0.68,
  vibratoRate: 5,
  vibratoCents: 4.5,
};

const arpeggioPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2.01, 3.002, 5.01],
  modulation: [0.76, 0, 0.44],
  waveforms: ["sine", "sine", "triangle", "sine"],
  operatorDetuneCents: [-1.4, 0.7, 1.4, -0.7],
  filterFrequency: 5200,
  filterStartFrequency: 7400,
  filterAttack: 0.035,
  filterQ: 1.05,
  attack: 0.006,
  decay: 0.1,
  peakGain: 0.0058,
  sustainGain: 0.0012,
  release: 0.18,
};

const counterPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 2.002, 3, 4.008],
  modulation: [0.68, 0.3, 0.13],
  waveforms: ["sine", "triangle", "sine", "sine"],
  operatorDetuneCents: [-3.2, -1, 3.2, 1],
  filterFrequency: 4800,
  filterStartFrequency: 2200,
  filterAttack: 0.13,
  filterQ: 0.72,
  attack: 0.038,
  decay: 0.26,
  peakGain: 0.0068,
  sustainGain: 0.0038,
  release: 0.48,
  vibratoRate: 4.85,
  vibratoCents: 3.4,
};

const bellPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2.5, 4.01, 7.02],
  modulation: [1.56, 0, 1.82],
  waveforms: ["sine", "sine", "sine", "sine"],
  filterFrequency: 6200,
  filterQ: 1.1,
  attack: 0.003,
  decay: 0.08,
  peakGain: 0.0065,
  sustainGain: 0.001,
  release: 0.82,
};

const finalPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 3.002, 1.004, 2.01],
  modulation: [1.42, 0, 0.66],
  waveforms: ["triangle", "sine", "sine", "sine"],
  operatorDetuneCents: [-3.4, -1, 3.4, 1],
  filterFrequency: 5400,
  filterStartFrequency: 2400,
  filterAttack: 0.15,
  filterQ: 0.76,
  attack: 0.018,
  decay: 0.28,
  peakGain: 0.019,
  sustainGain: 0.011,
  release: 1.25,
};

const accordionPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 2.002, 3.001, 1.004],
  modulation: [0.52, 0.22, 0.08],
  waveforms: ["triangle", "sine", "sine", "sine"],
  operatorDetuneCents: [-3.8, -1.1, 3.8, 1.1],
  filterFrequency: 4400,
  filterStartFrequency: 2100,
  filterAttack: 0.1,
  filterQ: 0.78,
  pitchAttackCents: -7,
  pitchAttackTime: 0.065,
  attack: 0.035,
  decay: 0.28,
  peakGain: 0.0068,
  sustainGain: 0.0042,
  release: 0.5,
  vibratoRate: 4.8,
  vibratoCents: 2.8,
};

const octaveLeadPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 3.01, 1.003, 5.02],
  modulation: [0.62, 0, 0.31],
  waveforms: ["sine", "sine", "triangle", "sine"],
  operatorDetuneCents: [-2.1, 0.9, 2.1, -0.9],
  filterFrequency: 5600,
  filterStartFrequency: 2700,
  filterAttack: 0.075,
  filterQ: 0.82,
  pitchAttackCents: -13,
  pitchAttackTime: 0.06,
  attack: 0.012,
  decay: 0.24,
  peakGain: 0.0075,
  sustainGain: 0.0038,
  release: 0.52,
  vibratoRate: 5.2,
  vibratoCents: 4.2,
};

const piccoloPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 4.01, 2.002, 7.03],
  modulation: [0.58, 0, 0.42],
  waveforms: ["sine", "sine", "triangle", "sine"],
  operatorDetuneCents: [-2.8, 1.2, 2.8, -1.2],
  filterFrequency: 7600,
  filterStartFrequency: 3900,
  filterAttack: 0.045,
  filterQ: 0.96,
  pitchAttackCents: -16,
  pitchAttackTime: 0.05,
  attack: 0.008,
  decay: 0.18,
  peakGain: 0.0048,
  sustainGain: 0.002,
  release: 0.44,
  vibratoRate: 5.4,
  vibratoCents: 3.6,
};

const lowCounterPatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 2.003, 2, 3],
  modulation: [0.48, 0, 0],
  operatorCount: 2,
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.4, 1.4, 0, 0],
  filterFrequency: 1800,
  filterStartFrequency: 850,
  filterAttack: 0.08,
  filterQ: 0.58,
  attack: 0.025,
  decay: 0.25,
  peakGain: 0.012,
  sustainGain: 0.0065,
  release: 0.45,
};

const bassAttackPatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 2.01, 2, 3],
  modulation: [1.18, 0, 0],
  operatorCount: 2,
  waveforms: ["triangle", "sine", "sine", "sine"],
  filterFrequency: 2600,
  filterStartFrequency: 900,
  filterAttack: 0.04,
  filterQ: 0.86,
  pitchAttackCents: 12,
  pitchAttackTime: 0.045,
  attack: 0.004,
  decay: 0.1,
  peakGain: 0.016,
  sustainGain: 0.0018,
  release: 0.18,
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

// 提供音源を6.4秒単位で解析すると、主部は
// A-B-A-B-C-D-C-D-D の57.6秒周期になっている。
// [開始位置（八分音符単位）, MIDIノート, 長さ]
const themeASequence: readonly NoteEvent[] = [
  [0, 66, 1], [1, 68, 1], [2, 69, 1], [3, 71, 1],
  [4, 76, 4], [8, 72, 4], [12, 74, 4], [16, 71, 5],
  [21, 69, 2], [23, 71, 4], [27, 72, 1], [28, 74, 4],
];

const themeBSequence: readonly NoteEvent[] = [
  [0, 68, 4], [4, 76, 5], [9, 71, 2], [11, 72, 1],
  [12, 74, 6], [18, 72, 1], [19, 71, 1], [20, 69, 4],
  [24, 68, 4], [28, 69, 4],
];

const bridgeCSequence: readonly NoteEvent[] = [
  [0, 69, 4], [4, 64, 4], [8, 60, 4], [12, 64, 8],
  [20, 72, 4], [24, 65, 4], [28, 64, 4],
];

const bridgeCOrnamentSequence: readonly NoteEvent[] = [
  [13, 74, 1], [15, 74, 1], [17, 76, 1], [19, 76, 1],
  [20, 84, 2], [22, 81, 1], [23, 72, 4], [27, 74, 1], [29, 74, 1],
];

const bridgeDSequence: readonly NoteEvent[] = [
  [0, 64, 12], [12, 62, 4], [16, 65, 4],
  [20, 64, 4], [24, 64, 4], [28, 69, 4],
];

const bridgeDOrnamentSequence: readonly NoteEvent[] = [
  [1, 76, 1], [11, 71, 1], [12, 74, 4], [17, 72, 1],
  [19, 72, 1], [21, 69, 1], [23, 68, 1], [25, 68, 1],
  [27, 68, 1], [28, 69, 4],
];

const closingDSequence: readonly NoteEvent[] = [
  [0, 69, 3], [3, 64, 8], [11, 71, 1], [12, 62, 4],
  [16, 65, 4], [20, 64, 4], [24, 64, 4], [28, 57, 4],
];

const introHarmony = [
  harmonies.am, harmonies.e7, harmonies.am, harmonies.e7,
  harmonies.am, harmonies.dm, harmonies.e7, harmonies.e7,
] as const;

const harmonyBlockPatterns = {
  a: [harmonies.am, harmonies.am, harmonies.am, harmonies.e7],
  b: [harmonies.e7, harmonies.dm, harmonies.am, harmonies.e7],
  c: [harmonies.am, harmonies.dm, harmonies.am, harmonies.e7],
  d: [harmonies.e7, harmonies.dm, harmonies.am, harmonies.e7],
  closing: [harmonies.am, harmonies.dm, harmonies.e7, harmonies.am],
} as const;

const melodyBlockSequences = {
  a: { body: themeASequence },
  b: { body: themeBSequence },
  c: { body: bridgeCSequence, ornament: bridgeCOrnamentSequence },
  d: { body: bridgeDSequence, ornament: bridgeDOrnamentSequence },
  closing: { body: closingDSequence, ornament: bridgeDOrnamentSequence },
} as const;

type MelodyBlockName = keyof typeof melodyBlockSequences;

const melodyBlockOrder: readonly MelodyBlockName[] = [
  "a", "b", "a", "b", "c", "d", "c", "d", "closing",
];

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.3), context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0;
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.64 + white * 0.36;
    data[index] = previous;
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
  filter.Q.setValueAtTime(type === "bandpass" ? 0.9 : 0.48, startAt);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.linearRampToValueAtTime(gain, startAt + 0.005);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(destination);
  source.start(startAt);
  source.stop(startAt + duration);
  trackScheduledSource(sources, source, () => {
    filter.disconnect();
    envelope.disconnect();
  });
}

function createKick(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  startAt: number,
  gain = 0.1,
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(142, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(46, startAt + 0.17);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.004);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.2);
  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.21);
  trackScheduledSource(sources, oscillator, () => envelope.disconnect());
}

function createTom(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  startAt: number,
  frequency: number,
  gain: number,
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.56, startAt + 0.16);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.005);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.2);
  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.21);
  trackScheduledSource(sources, oscillator, () => envelope.disconnect());
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

function getDensity(beat: number): ArrangementDensity {
  if (beat < FIRST_THEME_BEAT) return "intro";
  if (beat < FIRST_FULL_BEAT) return "light";
  if (beat < INTERLUDE_BEAT) return "full";
  if (beat < SECOND_FULL_BEAT) return "light";
  if (beat < OUTRO_BEAT) return "full";
  if (beat < FINAL_FULL_BEAT) return "light";
  return "full";
}

function getHarmony(beat: number) {
  if (beat < FIRST_THEME_BEAT) {
    const introIndex = Math.floor(beat / HARMONY_BEATS) % introHarmony.length;
    return introHarmony[introIndex];
  }

  const themeBeat = beat - FIRST_THEME_BEAT;
  const blockIndex = Math.floor(themeBeat / 32);
  const blockName = melodyBlockOrder[blockIndex % melodyBlockOrder.length];
  const harmonyIndex = Math.floor((themeBeat % 32) / HARMONY_BEATS);
  return harmonyBlockPatterns[blockName][harmonyIndex];
}

export function playOpmTrack(context: AudioContext): () => void {
  const startAt = context.currentTime + 0.04;
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const leadBus = context.createGain();
  const fmBus = context.createGain();
  const bassBus = context.createGain();
  const percussionBus = context.createGain();
  const percussionDry = context.createGain();
  const percussionCrushed = context.createGain();
  const toneFilter = context.createBiquadFilter();
  const bassFilter = context.createBiquadFilter();
  const presenceFilter = context.createBiquadFilter();
  const percussionFilter = context.createBiquadFilter();
  const quantizer = context.createWaveShaper();
  const noiseBuffer = createNoiseBuffer(context);
  const adpcmSamples = createAdpcmSampleBank(context);
  const sources: AudioScheduledSourceNode[] = [];
  let disconnected = false;

  master.gain.setValueAtTime(0.45, startAt);
  compressor.threshold.setValueAtTime(-12, startAt);
  compressor.knee.setValueAtTime(18, startAt);
  compressor.ratio.setValueAtTime(2.2, startAt);
  compressor.attack.setValueAtTime(0.009, startAt);
  compressor.release.setValueAtTime(0.28, startAt);
  leadBus.gain.setValueAtTime(0.72, startAt);
  fmBus.gain.setValueAtTime(0.68, startAt);
  bassBus.gain.setValueAtTime(0.82, startAt);
  percussionBus.gain.setValueAtTime(0.24, startAt);
  percussionDry.gain.setValueAtTime(0.82, startAt);
  percussionCrushed.gain.setValueAtTime(0.06, startAt);
  toneFilter.type = "lowpass";
  toneFilter.frequency.setValueAtTime(5600, startAt);
  toneFilter.Q.setValueAtTime(0.68, startAt);
  bassFilter.type = "lowpass";
  bassFilter.frequency.setValueAtTime(1450, startAt);
  bassFilter.Q.setValueAtTime(0.62, startAt);
  presenceFilter.type = "peaking";
  presenceFilter.frequency.setValueAtTime(720, startAt);
  presenceFilter.Q.setValueAtTime(0.92, startAt);
  presenceFilter.gain.setValueAtTime(2.6, startAt);
  percussionFilter.type = "lowpass";
  percussionFilter.frequency.setValueAtTime(5200, startAt);
  percussionFilter.Q.setValueAtTime(0.66, startAt);
  quantizer.curve = createFourBitCurve();
  quantizer.oversample = "none";

  leadBus.connect(presenceFilter);
  presenceFilter.connect(master);
  fmBus.connect(toneFilter);
  toneFilter.connect(master);
  bassBus.connect(bassFilter);
  bassFilter.connect(master);
  percussionBus.connect(percussionFilter);
  percussionFilter.connect(percussionDry);
  percussionDry.connect(master);
  percussionFilter.connect(quantizer);
  quantizer.connect(percussionCrushed);
  percussionCrushed.connect(master);
  master.connect(compressor);
  compressor.connect(context.destination);

  const scheduleHarmonySegment = (segmentIndex: number) => {
    const beatOffset = segmentIndex * HARMONY_BEATS;
    const segmentStart = startAt + beatOffset * BEAT;
    const chord = getHarmony(beatOffset);
    const density = getDensity(beatOffset);
    const noteDuration = (density === "intro" ? 7.76 : 7.24) * BEAT;

    chord.notes.forEach((frequency, noteIndex) => {
      createFmVoice(
        context,
        fmBus,
        sources,
        frequency,
        segmentStart,
        noteDuration,
        (noteIndex - (chord.notes.length - 1) / 2) * 0.2,
        stringPatch,
        noteIndex % 2 === 0 ? -2.2 : 2.2,
      );
      if (density !== "intro") {
        createFmVoice(
          context,
          fmBus,
          sources,
          frequency * 2,
          segmentStart + 0.025,
          noteDuration * 0.94,
          (noteIndex - (chord.notes.length - 1) / 2) * -0.24,
          density === "full" ? brassPatch : accordionPatch,
          noteIndex % 2 === 0 ? 2.8 : -2.8,
        );
      }
    });

    if (density === "full") {
      createFmVoice(
        context,
        bassBus,
        sources,
        chord.bass[0],
        segmentStart,
        7.72 * BEAT,
        segmentIndex % 2 === 0 ? -0.04 : 0.04,
        subBassPatch,
      );
    }

    const bassStepCount = density === "full" ? 8 : 2;
    const bassStepSize = HARMONY_BEATS / bassStepCount;
    for (let step = 0; step < bassStepCount; step += 1) {
      const frequency = chord.bass[step % chord.bass.length];
      createFmVoice(
        context,
        bassBus,
        sources,
        frequency,
        segmentStart + step * bassStepSize * BEAT,
        bassStepSize * 0.82 * BEAT,
        step % 2 === 0 ? -0.08 : 0.08,
        bassPatch,
      );
      if (step % 2 === 0) {
        createFmVoice(
          context,
          fmBus,
          sources,
          frequency * 2,
          segmentStart + step * bassStepSize * BEAT,
          Math.min(1.44, bassStepSize * 0.72) * BEAT,
          step % 4 === 0 ? 0.06 : -0.06,
          bassAttackPatch,
        );
      }
    }

    const arpeggioStep = density === "full" ? 1 : density === "light" ? 2 : 4;
    const arpeggioCount = Math.round(HARMONY_BEATS / arpeggioStep);
    for (let step = 0; step < arpeggioCount; step += 1) {
      const register = density === "intro" ? 1 : 2;
      const frequency = chord.arpeggio[step % chord.arpeggio.length] * register;
      createFmVoice(
        context,
        fmBus,
        sources,
        frequency,
        segmentStart + step * arpeggioStep * BEAT,
        arpeggioStep * BEAT * 0.72,
        step % 2 === 0 ? -0.55 : 0.55,
        arpeggioPatch,
        step % 2 === 0 ? -2.8 : 2.8,
      );
      if (density !== "intro" && step % 2 === 1) {
        createFmVoice(
          context,
          fmBus,
          sources,
          frequency / 2,
          segmentStart + step * arpeggioStep * BEAT + 0.018,
          arpeggioStep * BEAT * 0.84,
          step % 4 === 1 ? 0.34 : -0.34,
          baritonePatch,
          step % 4 === 1 ? 1.8 : -1.8,
        );
      }
      if (density === "full" && step % 4 === 2) {
        createFmVoice(
          context,
          leadBus,
          sources,
          frequency * 2,
          segmentStart + step * arpeggioStep * BEAT + 0.012,
          1.5 * BEAT,
          step % 8 === 2 ? -0.3 : 0.3,
          piccoloPatch,
          step % 8 === 2 ? -1.8 : 1.8,
        );
      }
    }

    if (density === "full") {
      createFmVoice(
        context,
        fmBus,
        sources,
        chord.notes[0] * 2,
        segmentStart + 0.03,
        7.28 * BEAT,
        segmentIndex % 2 === 0 ? -0.24 : 0.24,
        baritonePatch,
        segmentIndex % 2 === 0 ? -2.2 : 2.2,
      );
      createFmVoice(
        context,
        fmBus,
        sources,
        chord.notes[1] * 4,
        segmentStart,
        7.4 * BEAT,
        segmentIndex % 2 === 0 ? 0.32 : -0.32,
        counterPatch,
      );
      if (segmentIndex % 2 === 0) {
        createFmVoice(
          context,
          fmBus,
          sources,
          chord.bells[segmentIndex % chord.bells.length],
          segmentStart + (segmentIndex % 4 === 0 ? 2 : 6) * BEAT,
          1.7 * BEAT,
          segmentIndex % 4 === 0 ? -0.7 : 0.7,
          bellPatch,
        );
      }
    }
  };

  const scheduleLeadEvents = (
    sequence: readonly NoteEvent[],
    startBeat: number,
    voicing: LeadVoicing,
  ) => {
    sequence.forEach(([beatOffset, midiNote, durationInBeats], index) => {
      const noteStart = startAt + (startBeat + beatOffset) * BEAT;
      const noteDuration = durationInBeats * BEAT;
      const leadPan = index % 2 === 0 ? -0.2 : 0.14;
      const mainPatch = voicing === "soft"
        ? softLeadPatch
        : voicing === "bright"
          ? leadPatch
          : voicing === "reed"
            ? reedLeadPatch
            : piccoloPatch;
      const mainDestination = voicing === "reed" ? fmBus : leadBus;
      createFmVoice(
        context,
        mainDestination,
        sources,
        midiToFrequency(midiNote),
        noteStart,
        noteDuration,
        leadPan,
        mainPatch,
      );

      if (voicing === "soft" || voicing === "bright") {
        createFmVoice(
          context,
          leadBus,
          sources,
          midiToFrequency(midiNote),
          noteStart + LEAD_ECHO_DELAY,
          noteDuration,
          leadPan < 0 ? 0.42 : -0.42,
          leadEchoPatch,
          leadPan < 0 ? 4.2 : -4.2,
        );
      }

      const addOctave = voicing === "bright"
        ? durationInBeats >= 2 || index % 4 === 0
        : voicing === "soft" && durationInBeats >= 4;
      if (addOctave) {
        createFmVoice(
          context,
          leadBus,
          sources,
          midiToFrequency(midiNote + 12),
          noteStart + 0.018,
          noteDuration * 0.94,
          leadPan < 0 ? 0.24 : -0.24,
          octaveLeadPatch,
          index % 2 === 0 ? -2.4 : 2.4,
        );
      }

      if (voicing === "bright" && durationInBeats >= 4 && index % 2 === 0) {
        createFmVoice(
          context,
          leadBus,
          sources,
          midiToFrequency(midiNote + 24),
          noteStart + 0.032,
          noteDuration * 0.86,
          index % 4 === 0 ? -0.32 : 0.32,
          piccoloPatch,
          index % 4 === 0 ? 1.6 : -1.6,
        );
      }

      if (voicing === "reed" && durationInBeats >= 4) {
        createFmVoice(
          context,
          fmBus,
          sources,
          midiToFrequency(midiNote - 12),
          noteStart + 0.012,
          noteDuration * 0.96,
          leadPan < 0 ? 0.28 : -0.28,
          lowCounterPatch,
          index % 2 === 0 ? -2 : 2,
        );
      }

      if (voicing === "reed" && durationInBeats >= 8) {
        createFmVoice(
          context,
          fmBus,
          sources,
          midiToFrequency(midiNote + 12),
          noteStart + 0.026,
          noteDuration * 0.9,
          leadPan < 0 ? 0.34 : -0.34,
          accordionPatch,
          index % 2 === 0 ? 2.6 : -2.6,
        );
      }

      if (voicing === "ornament" && midiNote >= 81 && durationInBeats >= 2) {
        createFmVoice(
          context,
          leadBus,
          sources,
          midiToFrequency(midiNote + 12),
          noteStart + 0.02,
          noteDuration * 0.78,
          leadPan < 0 ? 0.38 : -0.38,
          bellPatch,
          index % 2 === 0 ? -1.4 : 1.4,
        );
      }
    });
  };

  const melodySections: Array<{
    startBeat: number;
    sequence: readonly NoteEvent[];
    voicing: LeadVoicing;
  }> = [];
  const melodyBlockCount = (FINAL_CHORD_BEAT - FIRST_THEME_BEAT) / 32;
  for (let blockIndex = 0; blockIndex < melodyBlockCount; blockIndex += 1) {
    const startBeat = FIRST_THEME_BEAT + blockIndex * 32;
    const blockName = melodyBlockOrder[blockIndex % melodyBlockOrder.length];
    const block = melodyBlockSequences[blockName];
    const isTheme = blockName === "a" || blockName === "b";
    melodySections.push({
      startBeat,
      sequence: block.body,
      voicing: isTheme && getDensity(startBeat) === "light" ? "soft" : isTheme ? "bright" : "reed",
    });
    if ("ornament" in block) {
      melodySections.push({ startBeat, sequence: block.ornament, voicing: "ornament" });
    }
  }

  const schedulePercussionBlock = (blockStartBeat: number, blockIndex: number) => {
    const blockStartAt = startAt + blockStartBeat * BEAT;
    if (blockIndex === 0 || blockIndex === 7 || blockIndex === 14) {
      scheduleAdpcmSample(context, percussionBus, sources, adpcmSamples.orchestraHit, blockStartAt, {
        gain: 0.12,
        pan: blockIndex === 7 ? 0.12 : -0.12,
      });
    }

    for (let halfBeat = 0; halfBeat < 32; halfBeat += 1) {
      const beatPosition = halfBeat;
      const hitAt = startAt + (blockStartBeat + beatPosition) * BEAT;
      if (halfBeat % 8 === 0) {
        createKick(context, percussionBus, sources, hitAt, halfBeat === 0 ? 0.07 : 0.05);
        scheduleAdpcmSample(context, percussionBus, sources, adpcmSamples.kick, hitAt, {
          gain: halfBeat === 0 ? 0.19 : 0.15,
        });
      }
      if (halfBeat % 8 === 4) {
        createNoiseHit(context, percussionBus, sources, noiseBuffer, hitAt, 0.14, 1450, 0.024, "bandpass");
        createNoiseHit(context, percussionBus, sources, noiseBuffer, hitAt + 0.01, 0.09, 3700, 0.008, "bandpass");
        createTom(context, percussionBus, sources, hitAt, 178, 0.014);
        scheduleAdpcmSample(context, percussionBus, sources, adpcmSamples.snare, hitAt, {
          gain: 0.17,
          pan: halfBeat % 16 === 4 ? -0.08 : 0.08,
        });
        if (halfBeat % 16 === 12) {
          scheduleAdpcmSample(context, percussionBus, sources, adpcmSamples.clap, hitAt + 0.012, {
            gain: 0.085,
            pan: blockIndex % 2 === 0 ? 0.32 : -0.32,
          });
        }
      }
      if (halfBeat % 2 === 0) {
        createNoiseHit(
          context,
          percussionBus,
          sources,
          noiseBuffer,
          hitAt,
          halfBeat % 8 === 6 ? 0.1 : 0.04,
          halfBeat % 4 === 0 ? 3900 : 5100,
          halfBeat % 8 === 6 ? 0.0065 : 0.0035,
          "highpass",
        );
        if (halfBeat % 8 === 6) {
          scheduleAdpcmSample(context, percussionBus, sources, adpcmSamples.metal, hitAt, {
            gain: 0.018,
            pan: halfBeat % 16 === 6 ? -0.46 : 0.46,
            playbackRate: 1.72,
          });
        }
      }
    }
    if (blockIndex % 4 === 3) {
      [158, 126, 98].forEach((frequency, index) => {
        const tomAt = startAt + (blockStartBeat + 26 + index * 2.5) * BEAT;
        createTom(
          context,
          percussionBus,
          sources,
          tomAt,
          frequency,
          0.03 - index * 0.004,
        );
        scheduleAdpcmSample(context, percussionBus, sources, adpcmSamples.tom, tomAt, {
          gain: 0.13 - index * 0.012,
          pan: (index - 1) * 0.28,
          playbackRate: [1.12, 0.88, 0.68][index],
        });
      });
    }
  };

  const percussionBlocks = [
    ...Array.from({ length: 7 }, (_, index) => FIRST_FULL_BEAT + index * 32),
    ...Array.from({ length: 7 }, (_, index) => SECOND_FULL_BEAT + index * 32),
    FINAL_FULL_BEAT,
    FINAL_FULL_BEAT + 32,
  ];

  const scheduleFinalChord = () => {
    const finalStart = startAt + FINAL_CHORD_BEAT * BEAT;
    [45, 57, 60, 64, 69].forEach((note, index) => {
      createFmVoice(
        context,
        fmBus,
        sources,
        midiToFrequency(note),
        finalStart,
        16 * BEAT,
        (index - 2) * 0.25,
        finalPatch,
        (index - 2) * 1.6,
      );
      if (index >= 1) {
        createFmVoice(
          context,
          leadBus,
          sources,
          midiToFrequency(note + 12),
          finalStart + 0.035,
          15 * BEAT,
          (2 - index) * 0.2,
          octaveLeadPatch,
          (2 - index) * 1.2,
        );
      }
    });
    createKick(context, percussionBus, sources, finalStart, 0.055);
    scheduleAdpcmSample(context, percussionBus, sources, adpcmSamples.kick, finalStart, { gain: 0.19 });
    scheduleAdpcmSample(context, percussionBus, sources, adpcmSamples.orchestraHit, finalStart, {
      gain: 0.15,
    });
    scheduleAdpcmSample(context, percussionBus, sources, adpcmSamples.metal, finalStart + 0.015, {
      gain: 0.075,
      pan: 0.2,
      playbackRate: 0.86,
    });
    createNoiseHit(context, percussionBus, sources, noiseBuffer, finalStart, 0.45, 4900, 0.035, "highpass");
  };

  const harmonySegmentCount = FINAL_CHORD_BEAT / HARMONY_BEATS;
  let nextHarmonySegment = 0;
  let nextMelodySection = 0;
  let nextPercussionBlock = 0;
  let finalChordScheduled = false;
  let schedulerTimer: number | null = null;

  const schedulePendingEvents = () => {
    if (disconnected) return;
    const horizon = context.currentTime + SCHEDULE_AHEAD_SECONDS;

    while (
      nextHarmonySegment < harmonySegmentCount
      && startAt + nextHarmonySegment * HARMONY_BEATS * BEAT <= horizon
    ) {
      scheduleHarmonySegment(nextHarmonySegment);
      nextHarmonySegment += 1;
    }

    while (
      nextMelodySection < melodySections.length
      && startAt + melodySections[nextMelodySection].startBeat * BEAT <= horizon
    ) {
      const section = melodySections[nextMelodySection];
      scheduleLeadEvents(section.sequence, section.startBeat, section.voicing);
      nextMelodySection += 1;
    }

    while (
      nextPercussionBlock < percussionBlocks.length
      && startAt + percussionBlocks[nextPercussionBlock] * BEAT <= horizon
    ) {
      schedulePercussionBlock(percussionBlocks[nextPercussionBlock], nextPercussionBlock);
      nextPercussionBlock += 1;
    }

    if (!finalChordScheduled && startAt + FINAL_CHORD_BEAT * BEAT <= horizon) {
      scheduleFinalChord();
      finalChordScheduled = true;
    }

    if (
      nextHarmonySegment === harmonySegmentCount
      && nextMelodySection === melodySections.length
      && nextPercussionBlock === percussionBlocks.length
      && finalChordScheduled
      && schedulerTimer !== null
    ) {
      window.clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  };

  schedulePendingEvents();
  schedulerTimer = window.setInterval(schedulePendingEvents, 750);

  const fadeStart = startAt + (FINAL_CHORD_BEAT + 8) * BEAT;
  master.gain.setValueAtTime(0.45, fadeStart);
  master.gain.exponentialRampToValueAtTime(0.0001, startAt + TRACK_DURATION);

  const disconnectGraph = () => {
    if (disconnected) return;
    disconnected = true;
    leadBus.disconnect();
    fmBus.disconnect();
    bassBus.disconnect();
    percussionBus.disconnect();
    percussionDry.disconnect();
    percussionCrushed.disconnect();
    toneFilter.disconnect();
    bassFilter.disconnect();
    presenceFilter.disconnect();
    percussionFilter.disconnect();
    quantizer.disconnect();
    master.disconnect();
    compressor.disconnect();
  };
  const cleanupTimer = window.setTimeout(disconnectGraph, (TRACK_DURATION + 0.3) * 1000);

  return () => {
    window.clearTimeout(cleanupTimer);
    if (schedulerTimer !== null) window.clearInterval(schedulerTimer);
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
