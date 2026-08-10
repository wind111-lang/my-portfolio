import { createAdpcmSampleBank, scheduleAdpcmSample } from "~/lib/adpcm_synth";
import { createLimitedOutput } from "~/lib/audio_output";
import {
  createFmVoice,
  type FmPatch,
  x68000VgmMidiToFrequency,
} from "~/lib/fm_synth";

type NoteEvent = readonly [start: number, note: number, length: number];
type DrumEvent = readonly [start: number, midiNote: number, velocity: number];
type IntroHit = readonly [
  start: number,
  sample: "kick" | "snare" | "clap" | "tom" | "metal",
  gain: number,
  playbackRate: number,
  pan: number,
];

const BPM = 132;
const SIXTEENTH = 60 / BPM / 4;
const FM_ENTRY_SECONDS = 1.855;
const PHRASE_UNITS = 128;
const TRACK_UNITS = PHRASE_UNITS * 4;
const TRACK_DURATION = 65.37;
const OUTPUT_GAIN = 1.65;
const SCHEDULE_AHEAD_SECONDS = 5;

// 公開VGMに記録されたYM2151レジスタを、M1/C1/M2/C2順へ並べ直した音色。
// Web AudioではEGを連続値へ近似するが、アルゴリズム・周波数比・キャリア比は
// 実ログのチャンネル構成を維持する。
const upperRhythmPatch: FmPatch = {
  algorithm: 3,
  ratios: [14, 3, 1, 3],
  modulation: [0, 0, 0],
  operatorModulation: [0.54, 0.46, 0.18, 0],
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [-2.5, 1.2, -0.8, 0.4],
  carrierGains: [0, 0, 0, 1],
  filterFrequency: 9000,
  filterStartFrequency: 4300,
  filterAttack: 0.025,
  filterQ: 0.62,
  attack: 0.012,
  decay: 0.2,
  peakGain: 0.012,
  sustainGain: 0.0075,
  release: 0.16,
};

const lowPulsePatch: FmPatch = {
  algorithm: 2,
  ratios: [4, 3, 3, 8],
  modulation: [0, 0, 0],
  operatorModulation: [0.56, 0.24, 0.4, 0],
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.8, 0.7, 1.4, -0.4],
  carrierGains: [0, 0, 0, 1],
  filterFrequency: 4600,
  filterStartFrequency: 1300,
  filterAttack: 0.035,
  filterQ: 0.72,
  attack: 0.008,
  decay: 0.13,
  peakGain: 0.018,
  sustainGain: 0.0085,
  release: 0.14,
};

const lowEdgePatch: FmPatch = {
  ...upperRhythmPatch,
  peakGain: 0.0076,
  sustainGain: 0.0045,
  filterFrequency: 6000,
};

const harmonyPatch: FmPatch = {
  algorithm: 4,
  ratios: [2, 1, 3, 1],
  modulation: [0, 0, 0],
  operatorModulation: [0.38, 0, 0.42, 0],
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [-2.2, -0.6, 2.2, 0.6],
  carrierGains: [0, 0.15, 0, 1],
  filterFrequency: 7600,
  filterStartFrequency: 3300,
  filterAttack: 0.04,
  filterQ: 0.58,
  attack: 0.018,
  decay: 0.22,
  peakGain: 0.009,
  sustainGain: 0.0052,
  release: 0.24,
};

const firstLeadPatch: FmPatch = {
  algorithm: 2,
  ratios: [2, 2, 2, 4],
  modulation: [0, 0, 0],
  operatorModulation: [0.92, 0.025, 0.025, 0],
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.4, 0.7, 1.4, -0.7],
  carrierGains: [0, 0, 0, 1],
  filterFrequency: 11200,
  filterStartFrequency: 4700,
  filterAttack: 0.035,
  filterQ: 0.78,
  pitchAttackCents: -7,
  pitchAttackTime: 0.035,
  attack: 0.028,
  decay: 0.24,
  peakGain: 0.0145,
  sustainGain: 0.0082,
  release: 0.22,
  vibratoRate: 5.2,
  vibratoCents: 2.2,
};

const firstLeadLeftPatch: FmPatch = {
  ...firstLeadPatch,
  peakGain: 0.0112,
  sustainGain: 0.0063,
};

const firstLeadRightPatch: FmPatch = {
  ...firstLeadPatch,
  peakGain: 0.0086,
  sustainGain: 0.0049,
};

const risingLeadPatch: FmPatch = {
  algorithm: 5,
  ratios: [3, 1, 1, 1],
  modulation: [0, 0, 0],
  operatorModulation: [1.08, 0, 0, 0],
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.2, -0.5, 0.6, 1.2],
  carrierGains: [0, 0.18, 0.42, 1],
  filterFrequency: 13800,
  filterStartFrequency: 6200,
  filterAttack: 0.018,
  filterQ: 0.7,
  pitchAttackCents: -5,
  pitchAttackTime: 0.025,
  attack: 0.004,
  decay: 0.26,
  peakGain: 0.0125,
  sustainGain: 0.0078,
  release: 0.14,
  vibratoRate: 5.25,
  vibratoCents: 1.8,
};

const risingLeadLeftPatch: FmPatch = {
  ...risingLeadPatch,
  peakGain: 0.0096,
  sustainGain: 0.006,
};

const risingLeadRightPatch: FmPatch = {
  ...risingLeadPatch,
  peakGain: 0.0063,
  sustainGain: 0.0039,
};

const upperRoots: readonly NoteEvent[] = [
  [0, 49, 16], [16, 47, 16], [32, 45, 8], [40, 47, 8],
  [48, 40, 16], [64, 51, 8], [72, 48, 8], [80, 49, 4],
  [84, 47, 4], [88, 46, 8], [96, 45, 16], [112, 42, 8],
  [120, 44, 8],
];

const lowRoots: readonly NoteEvent[] = [
  [0, 37, 16], [16, 35, 16], [32, 33, 8], [40, 35, 8],
  [48, 40, 16], [64, 39, 8], [72, 36, 8], [80, 37, 4],
  [84, 35, 4], [88, 34, 8], [96, 33, 16], [112, 30, 8],
  [120, 32, 8],
];

const upperHarmonyA: readonly NoteEvent[] = [
  [1, 64, 3], [4, 63, 3], [7, 64, 3], [10, 63, 3],
  [13, 64, 2], [15, 63, 2], [17, 64, 3], [20, 63, 3],
  [23, 64, 3], [26, 63, 3], [29, 64, 2], [31, 63, 2],
  [33, 64, 3], [36, 63, 3], [39, 61, 2], [41, 63, 3],
  [44, 64, 3], [47, 66, 2], [49, 68, 16], [65, 66, 3],
  [68, 66, 3], [71, 66, 2], [74, 68, 3], [77, 68, 4],
  [81, 66, 3], [84, 64, 3], [87, 63, 2], [89, 64, 8],
  [97, 66, 3], [100, 64, 3], [103, 63, 2], [105, 64, 8],
  [113, 66, 3], [116, 66, 3], [119, 66, 2], [122, 68, 3],
  [125, 68, 4],
];

const upperHarmonyB: readonly NoteEvent[] = [
  [1, 65, 3], [4, 64, 3], [7, 65, 3], [10, 64, 3],
  [13, 65, 2], [15, 64, 2], [17, 65, 3], [20, 64, 3],
  [23, 65, 3], [26, 64, 3], [29, 65, 2], [31, 64, 2],
  [33, 65, 3], [36, 64, 3], [39, 62, 2], [41, 64, 3],
  [44, 65, 3], [47, 67, 2], [49, 69, 16], [65, 67, 3],
  [68, 67, 3], [71, 67, 2], [74, 69, 3], [77, 69, 4],
  [81, 67, 3], [84, 65, 3], [87, 64, 2], [89, 65, 8],
  [97, 67, 3], [100, 65, 3], [103, 64, 2], [105, 65, 8],
  [113, 64, 8], [121, 62, 4], [125, 60, 4],
];

const upperHarmonyC: readonly NoteEvent[] = [
  [1, 62, 2], [4, 64, 2], [7, 65, 2], [10, 67, 2],
  [13, 69, 3], [17, 65, 2], [20, 67, 2], [23, 69, 2],
  [26, 70, 2], [29, 72, 3], [33, 65, 3], [36, 64, 3],
  [39, 62, 2], [41, 64, 3], [44, 65, 3], [47, 67, 2],
  [49, 69, 16], [65, 67, 3], [68, 67, 3], [71, 67, 2],
  [74, 69, 3], [77, 69, 4], [81, 67, 3], [84, 65, 3],
  [87, 64, 2], [89, 65, 8], [97, 67, 3], [100, 65, 3],
  [103, 64, 2], [105, 65, 8], [113, 64, 8], [121, 62, 4],
  [125, 60, 4],
];

const lowerHarmonyA: readonly NoteEvent[] = [
  [1, 61, 3], [4, 61, 3], [7, 61, 3], [10, 61, 3],
  [13, 61, 2], [15, 61, 2], [17, 61, 3], [20, 61, 3],
  [23, 61, 3], [26, 61, 3], [29, 61, 2], [31, 61, 2],
  [33, 61, 3], [36, 59, 3], [39, 57, 2], [41, 59, 3],
  [44, 61, 3], [47, 63, 2], [49, 64, 16], [65, 63, 3],
  [68, 63, 3], [71, 63, 2], [74, 63, 3], [77, 63, 4],
  [81, 63, 3], [84, 61, 3], [87, 60, 2], [89, 61, 8],
  [97, 63, 3], [100, 61, 3], [103, 60, 2], [105, 61, 8],
  [113, 61, 3], [116, 61, 3], [119, 61, 2], [122, 63, 3],
  [125, 63, 4],
];

const lowerHarmonyB: readonly NoteEvent[] = [
  [1, 62, 3], [4, 62, 3], [7, 62, 3], [10, 62, 3],
  [13, 62, 2], [15, 62, 2], [17, 62, 3], [20, 62, 3],
  [23, 62, 3], [26, 62, 3], [29, 62, 2], [31, 62, 2],
  [33, 62, 3], [36, 60, 3], [39, 58, 2], [41, 60, 3],
  [44, 62, 3], [47, 64, 2], [49, 65, 16], [65, 62, 3],
  [68, 62, 3], [71, 62, 2], [74, 64, 3], [77, 64, 4],
  [81, 64, 3], [84, 62, 3], [87, 60, 2], [89, 62, 8],
  [97, 64, 3], [100, 62, 3], [103, 60, 2], [105, 62, 8],
  [113, 60, 8], [121, 57, 4], [125, 55, 4],
];

const lowerHarmonyC: readonly NoteEvent[] = [
  [1, 57, 2], [4, 60, 2], [7, 62, 2], [10, 64, 2],
  [13, 65, 3], [17, 62, 2], [20, 64, 2], [23, 65, 2],
  [26, 67, 2], [29, 69, 3], [33, 62, 3], [36, 60, 3],
  [39, 58, 2], [41, 60, 3], [44, 62, 3], [47, 64, 2],
  [49, 65, 16], [65, 62, 3], [68, 62, 3], [71, 62, 2],
  [74, 64, 3], [77, 64, 4], [81, 64, 3], [84, 62, 3],
  [87, 60, 2], [89, 62, 8], [97, 64, 3], [100, 62, 3],
  [103, 60, 2], [105, 62, 8], [113, 60, 8], [121, 57, 4],
  [125, 55, 4],
];

const firstLeadSequence: readonly NoteEvent[] = [
  [0, 61, 3], [3, 63, 3], [6, 64, 3], [9, 66, 3],
  [12, 68, 4], [16, 64, 3], [19, 66, 3], [22, 68, 3],
  [25, 69, 3], [28, 71, 4], [32, 69, 3], [35, 71, 3],
  [38, 69, 2], [40, 68, 3], [43, 66, 3], [46, 69, 2],
  [48, 68, 16], [64, 66, 3], [67, 66, 3], [70, 66, 2],
  [72, 68, 4], [76, 66, 4], [80, 66, 3], [83, 64, 3],
  [86, 63, 2], [88, 64, 8], [96, 66, 3], [99, 64, 3],
  [102, 63, 2], [104, 64, 4], [108, 64, 4], [112, 66, 3],
  [115, 66, 3], [118, 66, 2], [120, 68, 8],
];

const risingLeadSequence: readonly NoteEvent[] = [
  [0, 74, 3], [3, 76, 3], [6, 77, 3], [9, 79, 3],
  [12, 81, 4], [16, 77, 3], [19, 79, 3], [22, 81, 3],
  [25, 82, 3], [28, 84, 4], [32, 82, 3], [35, 84, 3],
  [38, 86, 2], [40, 88, 3], [43, 89, 3], [46, 91, 2],
  [48, 93, 16], [64, 91, 8], [72, 88, 8], [80, 91, 3],
  [83, 89, 3], [86, 88, 2], [88, 86, 8], [96, 91, 3],
  [99, 89, 3], [102, 88, 2], [104, 86, 8], [112, 88, 8],
  [120, 86, 4], [124, 84, 4],
];

const finalLeadSequence: readonly NoteEvent[] = [
  [0, 86, 2], [3, 88, 2], [6, 89, 2], [9, 91, 2],
  [12, 93, 3], [16, 89, 2], [19, 91, 2], [22, 93, 2],
  [25, 94, 2], [28, 96, 3], [32, 94, 3], [35, 96, 3],
  [38, 98, 2], [40, 100, 3], [43, 101, 3], [46, 103, 2],
  [48, 105, 16], [64, 103, 8], [72, 100, 8], [80, 103, 3],
  [83, 101, 3], [86, 100, 2], [88, 98, 8], [96, 103, 3],
  [99, 101, 3], [102, 100, 2], [104, 98, 8], [112, 100, 8],
  [120, 98, 4], [124, 96, 4],
];

const upperHarmonySequences = [upperHarmonyA, upperHarmonyA, upperHarmonyB, upperHarmonyC] as const;
const lowerHarmonySequences = [lowerHarmonyA, lowerHarmonyA, lowerHarmonyB, lowerHarmonyC] as const;
const leadSequences = [firstLeadSequence, firstLeadSequence, risingLeadSequence, finalLeadSequence] as const;

const adpcmDrumSequence: readonly DrumEvent[] = [
  ...Array.from({ length: 14 }, (_, index) => [index * 8, 36, index % 4 === 0 ? 1 : 0.82] as const),
  ...Array.from({ length: 14 }, (_, index) => [index * 8 + 4, 38, index % 4 === 3 ? 0.94 : 0.86] as const),
  ...Array.from({ length: 55 }, (_, index) => [index * 2 + 2, 42, index % 4 === 2 ? 0.56 : 0.38] as const),
  ...[14, 30, 46, 62, 78, 94, 110].map((start) => [start, 46, 0.68] as const),
  [112, 45, 0.82], [114, 47, 0.74], [116, 50, 0.86], [118, 47, 0.76],
  [120, 45, 0.9], [122, 47, 0.82], [124, 50, 0.94], [126, 39, 0.78],
];

// 冒頭1.85秒を20 ms窓で再解析し、広帯域の立ち上がりごとに1サンプルだけを置く。
// 同一時刻へ複数素材を重ねないため、以前のノイズ状ピークを作らない。
const introHits: readonly IntroHit[] = [
  [0.015, "snare", 0.15, 1.35, -0.08],
  [0.13, "snare", 0.09, 1.55, 0.12],
  [0.334, "tom", 0.08, 1.22, -0.24],
  [0.479, "tom", 0.11, 0.78, 0.2],
  [0.624, "metal", 0.026, 1.72, -0.34],
  [0.728, "tom", 0.105, 0.68, 0.28],
  [0.848, "metal", 0.027, 1.82, 0.34],
  [0.918, "kick", 0.18, 1, 0],
  [1.043, "tom", 0.08, 0.88, -0.18],
  [1.187, "metal", 0.024, 1.9, 0.3],
  [1.332, "kick", 0.16, 1.04, 0],
  [1.492, "snare", 0.075, 1.55, -0.16],
  [1.576, "snare", 0.065, 1.68, 0],
  [1.641, "snare", 0.055, 1.82, 0.16],
];

function createSoftClipCurve(): Float32Array {
  const curve = new Float32Array(1024);
  const drive = 1.18;
  const ceiling = Math.tanh(drive);
  for (let index = 0; index < curve.length; index += 1) {
    const input = index / (curve.length - 1) * 2 - 1;
    curve[index] = Math.tanh(input * drive) / ceiling;
  }
  return curve;
}

function scheduleSequence(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  sequence: readonly NoteEvent[],
  entryAt: number,
  phrase: number,
  pan: number,
  patch: FmPatch,
  detuneCents: number,
  startOffset = 0,
): void {
  const phraseOffset = phrase * PHRASE_UNITS;
  sequence.forEach(([start, note, length]) => {
    createFmVoice(
      context,
      destination,
      sources,
      x68000VgmMidiToFrequency(note),
      entryAt + (phraseOffset + start + startOffset) * SIXTEENTH,
      length * SIXTEENTH,
      pan,
      patch,
      detuneCents,
    );
  });
}

function scheduleRootSequence(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  sequence: readonly NoteEvent[],
  entryAt: number,
  phrase: number,
  pan: number,
  patch: FmPatch,
  detuneCents: number,
): void {
  const phraseOffset = phrase * PHRASE_UNITS;
  const transpose = phrase >= 2 ? 1 : 0;
  sequence.forEach(([start, note, length]) => {
    const pulseLength = phrase === 0 ? length : 2;
    for (let position = 0; position < length; position += pulseLength) {
      createFmVoice(
        context,
        destination,
        sources,
        x68000VgmMidiToFrequency(note + transpose),
        entryAt + (phraseOffset + start + position) * SIXTEENTH,
        Math.min(pulseLength, length - position) * SIXTEENTH * (phrase === 0 ? 1 : 0.96),
        pan,
        patch,
        detuneCents,
      );
    }
  });
}

function scheduleDrumPhrase(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  samples: ReturnType<typeof createAdpcmSampleBank>,
  entryAt: number,
  phrase: number,
): void {
  const phraseOffset = phrase * PHRASE_UNITS;
  adpcmDrumSequence.forEach(([start, midiNote, velocity], index) => {
    const hitAt = entryAt + (phraseOffset + start) * SIXTEENTH;
    const pan = index % 2 === 0 ? -0.08 : 0.08;
    if (midiNote === 36) {
      scheduleAdpcmSample(context, destination, sources, samples.kick, hitAt, {
        gain: 0.18 * velocity,
        pan,
      });
    } else if (midiNote === 38) {
      scheduleAdpcmSample(context, destination, sources, samples.snare, hitAt, {
        gain: 0.16 * velocity,
        pan,
      });
    } else if (midiNote === 39) {
      scheduleAdpcmSample(context, destination, sources, samples.clap, hitAt, {
        gain: 0.1 * velocity,
        pan: phrase % 2 === 0 ? 0.34 : -0.34,
      });
    } else if (midiNote === 42 || midiNote === 46) {
      const isOpen = midiNote === 46;
      scheduleAdpcmSample(context, destination, sources, samples.metal, hitAt, {
        gain: (isOpen ? 0.024 : 0.009) * velocity,
        pan: isOpen ? (start % 32 === 14 ? -0.42 : 0.42) : pan,
        playbackRate: isOpen ? 1.9 : 2.72,
      });
    } else {
      scheduleAdpcmSample(context, destination, sources, samples.tom, hitAt, {
        gain: 0.12 * velocity,
        pan: (index % 5 - 2) * 0.18,
        playbackRate: midiNote === 45 ? 0.72 : midiNote === 47 ? 0.9 : 1.12,
      });
    }
  });
}

export function playForeverX68000Track(context: AudioContext): () => void {
  const startAt = context.currentTime + 0.04;
  const finalOutput = createLimitedOutput(context, startAt);
  const entryAt = startAt + FM_ENTRY_SECONDS;
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const lowBus = context.createGain();
  const harmonyBus = context.createGain();
  const leadBus = context.createGain();
  const percussionBus = context.createGain();
  const lowFilter = context.createBiquadFilter();
  const harmonyFilter = context.createBiquadFilter();
  const leadPresence = context.createBiquadFilter();
  const softClip = context.createWaveShaper();
  const samples = createAdpcmSampleBank(context);
  const sources: AudioScheduledSourceNode[] = [];
  let disconnected = false;

  master.gain.setValueAtTime(OUTPUT_GAIN, startAt);
  compressor.threshold.setValueAtTime(-11, startAt);
  compressor.knee.setValueAtTime(16, startAt);
  compressor.ratio.setValueAtTime(2.1, startAt);
  compressor.attack.setValueAtTime(0.01, startAt);
  compressor.release.setValueAtTime(0.24, startAt);
  lowBus.gain.setValueAtTime(0.7, startAt);
  harmonyBus.gain.setValueAtTime(0.68, startAt);
  leadBus.gain.setValueAtTime(0.78, startAt);
  percussionBus.gain.setValueAtTime(0.34, startAt);
  lowFilter.type = "lowpass";
  lowFilter.frequency.setValueAtTime(7600, startAt);
  lowFilter.Q.setValueAtTime(0.62, startAt);
  harmonyFilter.type = "lowpass";
  harmonyFilter.frequency.setValueAtTime(9800, startAt);
  harmonyFilter.Q.setValueAtTime(0.56, startAt);
  leadPresence.type = "highshelf";
  leadPresence.frequency.setValueAtTime(4300, startAt);
  leadPresence.gain.setValueAtTime(2.8, startAt);
  softClip.curve = createSoftClipCurve();
  softClip.oversample = "2x";

  lowBus.connect(lowFilter);
  lowFilter.connect(softClip);
  harmonyBus.connect(harmonyFilter);
  harmonyFilter.connect(softClip);
  leadBus.connect(leadPresence);
  leadPresence.connect(softClip);
  percussionBus.connect(softClip);
  softClip.connect(compressor);
  compressor.connect(master);
  master.connect(finalOutput.input);

  introHits.forEach(([offset, sampleName, gain, playbackRate, pan]) => {
    scheduleAdpcmSample(context, percussionBus, sources, samples[sampleName], startAt + offset, {
      gain,
      pan,
      playbackRate,
    });
  });

  const schedulePhrase = (phrase: number) => {
    if (disconnected) return;
    scheduleRootSequence(context, lowBus, sources, upperRoots, entryAt, phrase, 0.02, upperRhythmPatch, 7.8);
    scheduleRootSequence(context, lowBus, sources, lowRoots, entryAt, phrase, -0.08, lowPulsePatch, 26.6);
    scheduleRootSequence(context, lowBus, sources, lowRoots, entryAt, phrase, 0.1, lowEdgePatch, 17.2);

    scheduleSequence(
      context,
      harmonyBus,
      sources,
      upperHarmonySequences[phrase],
      entryAt,
      phrase,
      0.38,
      harmonyPatch,
      14.1,
      -0.5,
    );
    scheduleSequence(
      context,
      harmonyBus,
      sources,
      lowerHarmonySequences[phrase],
      entryAt,
      phrase,
      -0.38,
      harmonyPatch,
      14.1,
      -0.5,
    );

    const rising = phrase >= 2;
    const sequence = leadSequences[phrase];
    const mainPatch = rising ? risingLeadPatch : firstLeadPatch;
    const leftPatch = rising ? risingLeadLeftPatch : firstLeadLeftPatch;
    const rightPatch = rising ? risingLeadRightPatch : firstLeadRightPatch;
    const leftDelay = rising ? 1 : 2;
    const rightDelay = rising ? 2 : 4;
    scheduleSequence(context, leadBus, sources, sequence, entryAt, phrase, 0, mainPatch, 7.8);
    scheduleSequence(context, leadBus, sources, sequence, entryAt, phrase, -0.5, leftPatch, 20.3, leftDelay);
    scheduleSequence(context, leadBus, sources, sequence, entryAt, phrase, 0.5, rightPatch, 14.1, rightDelay);

    scheduleDrumPhrase(context, percussionBus, sources, samples, entryAt, phrase);
  };

  let nextPhrase = 0;
  let schedulerTimer: number | null = null;
  const schedulePendingEvents = () => {
    if (disconnected) return;
    const horizon = context.currentTime + SCHEDULE_AHEAD_SECONDS;
    while (
      nextPhrase < 4
      && entryAt + nextPhrase * PHRASE_UNITS * SIXTEENTH <= horizon
    ) {
      schedulePhrase(nextPhrase);
      nextPhrase += 1;
    }
    if (nextPhrase === 4 && schedulerTimer !== null) {
      window.clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  };
  schedulePendingEvents();
  schedulerTimer = window.setInterval(schedulePendingEvents, 750);

  const fadeStart = entryAt + (TRACK_UNITS + 2) * SIXTEENTH;
  master.gain.setValueAtTime(OUTPUT_GAIN, fadeStart);
  master.gain.exponentialRampToValueAtTime(0.0001, startAt + TRACK_DURATION);

  const disconnectGraph = () => {
    if (disconnected) return;
    disconnected = true;
    lowBus.disconnect();
    harmonyBus.disconnect();
    leadBus.disconnect();
    percussionBus.disconnect();
    lowFilter.disconnect();
    harmonyFilter.disconnect();
    leadPresence.disconnect();
    softClip.disconnect();
    compressor.disconnect();
    master.disconnect();
    finalOutput.disconnect();
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
        // 再生済みのAudioScheduledSourceNodeは停止済みのため何もしない。
      }
    });
    window.setTimeout(disconnectGraph, 80);
  };
}
