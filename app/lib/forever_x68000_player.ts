import { createAdpcmSampleBank, scheduleAdpcmSample } from "~/lib/adpcm_synth";
import {
  createFmVoice,
  midiToFrequency,
  trackScheduledSource,
  type FmPatch,
} from "~/lib/fm_synth";

type NoteEvent = readonly [start: number, note: number, length: number];
type DrumEvent = readonly [start: number, midiNote: number, velocity: number];

const BPM = 132;
const SIXTEENTH = 60 / BPM / 4;
const FM_ENTRY_SECONDS = 1.855;
const PHRASE_UNITS = 128;
const TRACK_UNITS = PHRASE_UNITS * 4;
// 参照MP3は本編終了後も約5.35秒かけて自然に減衰する。
const RELEASE_TAIL_SECONDS = 5.35;
const TRACK_DURATION = FM_ENTRY_SECONDS + TRACK_UNITS * SIXTEENTH + RELEASE_TAIL_SECONDS;

const chordPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2.002, 1.003, 3.01],
  modulation: [0.96, 0, 0.52],
  waveforms: ["triangle", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.7, 0.8, 2.1, -0.6],
  filterFrequency: 7200,
  filterStartFrequency: 4100,
  filterAttack: 0.075,
  filterQ: 0.92,
  pitchAttackCents: -8,
  pitchAttackTime: 0.045,
  attack: 0.014,
  decay: 0.24,
  peakGain: 0.017,
  sustainGain: 0.0095,
  release: 0.38,
  vibratoRate: 5.15,
  vibratoCents: 2.2,
};

const brassPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 1.997, 0.999, 2.996],
  modulation: [0.82, 0, 0.44],
  waveforms: ["triangle", "sine", "sine", "sine"],
  operatorDetuneCents: [-2, 1.2, 2.4, -1],
  filterFrequency: 5100,
  filterStartFrequency: 2500,
  filterAttack: 0.12,
  filterQ: 1.1,
  pitchAttackCents: -12,
  pitchAttackTime: 0.08,
  attack: 0.045,
  decay: 0.28,
  peakGain: 0.015,
  sustainGain: 0.009,
  release: 0.46,
  vibratoRate: 5.1,
  vibratoCents: 3.2,
};

const shadowPatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 2.004, 2, 3],
  modulation: [0.58, 0.22, 0.08],
  operatorCount: 2,
  waveforms: ["sine", "triangle", "sine", "sine"],
  operatorDetuneCents: [1.8, -1.4, 0, 0],
  filterFrequency: 5800,
  filterStartFrequency: 3200,
  filterAttack: 0.09,
  filterQ: 0.68,
  attack: 0.028,
  decay: 0.3,
  peakGain: 0.0062,
  sustainGain: 0.0038,
  release: 0.52,
  vibratoRate: 4.95,
  vibratoCents: 2.4,
};

const bassPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2, 1, 3],
  modulation: [1.36, 0, 0.62],
  operatorCount: 2,
  waveforms: ["triangle", "sine", "sine", "sine"],
  operatorDetuneCents: [0, 3.5, 0, 0],
  filterFrequency: 2300,
  filterStartFrequency: 850,
  filterAttack: 0.045,
  filterQ: 0.72,
  attack: 0.012,
  decay: 0.16,
  peakGain: 0.038,
  sustainGain: 0.018,
  release: 0.15,
};

const padPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2.003, 1.004, 4.01],
  modulation: [0.34, 0, 0.16],
  waveforms: ["sine", "triangle", "sine", "sine"],
  operatorDetuneCents: [-3.8, 1.4, 3.8, -1.4],
  filterFrequency: 3600,
  filterQ: 0.6,
  attack: 0.09,
  decay: 0.42,
  peakGain: 0.0068,
  sustainGain: 0.0048,
  release: 0.66,
};

const harmonyPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 2, 3, 4.01],
  modulation: [0.3, 0.12, 0.055],
  waveforms: ["sine", "sine", "triangle", "sine"],
  operatorDetuneCents: [-2.4, 0.8, 2.4, -0.8],
  filterFrequency: 4300,
  filterQ: 0.54,
  attack: 0.12,
  decay: 0.54,
  peakGain: 0.0048,
  sustainGain: 0.0035,
  release: 0.72,
};

const pluckPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2.01, 2.998, 6.02],
  modulation: [0.74, 0, 0.42],
  operatorCount: 2,
  waveforms: ["sine", "sine", "triangle", "sine"],
  filterFrequency: 8600,
  filterQ: 1.18,
  attack: 0.004,
  decay: 0.1,
  peakGain: 0.0048,
  sustainGain: 0.0012,
  release: 0.18,
};

const shimmerPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 2, 3, 5],
  modulation: [0.82, 0.36, 0.14],
  operatorCount: 2,
  waveforms: ["sine", "sine", "triangle", "sine"],
  filterFrequency: 9200,
  filterQ: 1.2,
  attack: 0.006,
  decay: 0.18,
  peakGain: 0.0065,
  sustainGain: 0.002,
  release: 0.36,
};

const leadEdgePatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 2.003, 3.01, 7.01],
  modulation: [0.76, 0.42, 0.16],
  waveforms: ["triangle", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.4, 1.2, -0.8, 1.8],
  filterFrequency: 10500,
  filterStartFrequency: 2800,
  filterAttack: 0.045,
  filterQ: 1.05,
  pitchAttackCents: -18,
  pitchAttackTime: 0.055,
  attack: 0.004,
  decay: 0.17,
  peakGain: 0.0088,
  sustainGain: 0.0036,
  release: 0.34,
  vibratoRate: 5.25,
  vibratoCents: 2.8,
};

const electricPianoPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 7.01, 2.002, 14.03],
  modulation: [0.54, 0, 0.32],
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.2, 0.7, 1.2, -0.7],
  filterFrequency: 9400,
  filterStartFrequency: 5200,
  filterAttack: 0.024,
  filterQ: 0.92,
  pitchAttackCents: 7,
  pitchAttackTime: 0.035,
  attack: 0.003,
  decay: 0.24,
  peakGain: 0.0076,
  sustainGain: 0.0009,
  release: 0.55,
};

const ensemblePatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 2.002, 3, 4],
  modulation: [0.18, 0, 0],
  operatorCount: 2,
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.8, 1.8, 0, 0],
  filterFrequency: 6800,
  filterStartFrequency: 3200,
  filterAttack: 0.28,
  filterQ: 0.48,
  attack: 0.2,
  decay: 0.62,
  peakGain: 0.0044,
  sustainGain: 0.0037,
  release: 2.1,
  vibratoRate: 4.1,
  vibratoCents: 1.6,
};

const airLeadPatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 2.004, 3, 4],
  modulation: [0.44, 0, 0],
  operatorCount: 2,
  waveforms: ["sine", "triangle", "sine", "sine"],
  operatorDetuneCents: [-1.7, 1.7, 0, 0],
  filterFrequency: 14800,
  filterStartFrequency: 7200,
  filterAttack: 0.055,
  filterQ: 0.72,
  pitchAttackCents: -7,
  pitchAttackTime: 0.045,
  attack: 0.008,
  decay: 0.22,
  peakGain: 0.007,
  sustainGain: 0.0032,
  release: 0.56,
  vibratoRate: 5.2,
  vibratoCents: 2.1,
};

const brilliancePatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 2.006, 3, 4],
  modulation: [0.34, 0, 0],
  operatorCount: 2,
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.1, 1.1, 0, 0],
  filterFrequency: 17600,
  filterStartFrequency: 9800,
  filterAttack: 0.018,
  filterQ: 0.7,
  pitchAttackCents: -5,
  pitchAttackTime: 0.025,
  attack: 0.002,
  decay: 0.11,
  peakGain: 0.0045,
  sustainGain: 0.00065,
  release: 0.34,
};

const guitarPatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 2.01, 3.99, 8.02],
  modulation: [1.12, 0.46, 0.13],
  operatorCount: 2,
  waveforms: ["triangle", "sine", "sine", "sine"],
  operatorDetuneCents: [-1, 0.8, -0.6, 1.2],
  filterFrequency: 7600,
  filterStartFrequency: 10800,
  filterAttack: 0.035,
  filterQ: 0.9,
  pitchAttackCents: -22,
  pitchAttackTime: 0.045,
  attack: 0.002,
  decay: 0.14,
  peakGain: 0.0085,
  sustainGain: 0.0014,
  release: 0.25,
};

const subBassPatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 2.003, 2, 3],
  modulation: [0.42, 0, 0],
  operatorCount: 2,
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.2, 1.2, 0, 0],
  filterFrequency: 1050,
  filterStartFrequency: 520,
  filterAttack: 0.055,
  filterQ: 0.62,
  attack: 0.018,
  decay: 0.2,
  peakGain: 0.021,
  sustainGain: 0.011,
  release: 0.24,
};

// 参照音源の132 BPMグリッドから採譜した1フレーズ分のキーイベント。
// [開始位置（16分音符）, MIDIノート, 長さ（16分音符）]
const chordSequence: readonly NoteEvent[] = [
  [0, 64, 35], [0, 67, 3], [3, 66, 3], [6, 67, 3], [9, 66, 3],
  [12, 67, 2], [14, 66, 2], [16, 67, 3], [19, 66, 3], [22, 67, 3],
  [25, 66, 3], [28, 67, 2], [30, 66, 2], [32, 67, 3], [35, 62, 3],
  [35, 66, 3], [38, 60, 2], [38, 64, 2], [40, 62, 3], [40, 66, 3],
  [43, 64, 3], [43, 67, 3], [46, 66, 3], [46, 69, 2], [48, 71, 16],
  [49, 67, 15], [64, 66, 19], [64, 69, 9], [73, 71, 7], [80, 69, 3],
  [83, 64, 3], [83, 67, 3], [86, 63, 2], [86, 66, 3], [88, 64, 8],
  [89, 67, 7], [96, 66, 3], [96, 69, 3], [99, 64, 3], [99, 67, 3],
  [102, 63, 2], [102, 66, 3], [104, 64, 17], [105, 67, 7], [112, 69, 9],
  [121, 66, 7], [121, 71, 7],
];

const bassSequence: readonly NoteEvent[] = [
  [0, 40, 16], [16, 38, 16], [32, 36, 8], [40, 38, 8], [48, 43, 16],
  [64, 42, 8], [72, 39, 8], [80, 40, 4], [84, 38, 4], [88, 37, 8],
  [96, 36, 16], [112, 33, 8], [120, 35, 8],
];

// 参照MP3のother stemと高域抽出を独立にMIDIイベント化し、両方で
// 確認できた発音をフレーズ別に採用する。同一列の反復・自動移調は行わない。
// [開始位置（16分音符）, MIDIノート, 長さ（16分音符）]
const upperLeadSequences: readonly (readonly NoteEvent[])[] = [
  [
    [6, 79, 2], [9, 81, 3], [12, 83, 4],
    [19, 81, 3], [22, 83, 3], [25, 84, 3], [28, 86, 4],
    [35, 86, 3], [38, 84, 2], [46, 84, 2], [52, 83, 8],
    [64, 81, 1], [67, 78, 2], [68, 81, 1], [70, 78, 1],
    [71, 81, 1], [72, 83, 2], [76, 81, 4],
    [84, 79, 2], [86, 78, 2], [89, 79, 5],
    [96, 81, 1], [99, 79, 2], [102, 78, 2], [104, 79, 5],
    [113, 81, 2], [116, 81, 2], [119, 81, 1], [120, 83, 3],
  ],
  [
    [9, 81, 1], [16, 79, 2], [25, 84, 2], [32, 84, 2],
    [36, 86, 1], [47, 84, 1],
    [64, 81, 2], [67, 81, 1], [70, 81, 1], [72, 83, 3],
    [76, 81, 2], [80, 81, 1],
    [83, 79, 2], [86, 78, 2], [88, 79, 4],
    [96, 81, 3], [99, 79, 1], [102, 78, 1], [104, 79, 3],
    [109, 79, 1], [112, 81, 2], [115, 81, 2], [118, 81, 2],
    [120, 83, 2],
  ],
  [
    // 30.95〜45.49秒のside成分を16分音符へ量子化した上昇列。
    [0, 77, 4], [4, 79, 2], [6, 80, 4], [10, 82, 3], [13, 84, 3],
    [16, 80, 4], [20, 82, 3], [23, 84, 3],
    [26, 73, 3], [29, 75, 3], [32, 73, 4], [36, 75, 3],
    [39, 77, 2], [41, 79, 3], [44, 80, 3], [47, 82, 2],
    [49, 84, 15], [64, 82, 8], [72, 79, 8],
    [80, 82, 4], [84, 80, 2], [86, 79, 3], [89, 77, 7],
    [96, 82, 4], [100, 80, 2], [102, 79, 3], [105, 77, 7],
    [112, 79, 8], [120, 77, 4], [124, 75, 4],
  ],
  [
    // 45.49秒以降は短い上昇列の後、E5〜G#5の応答へ移る。
    [0, 77, 3], [3, 79, 3], [6, 80, 3], [9, 82, 3], [12, 84, 4],
    [16, 80, 3], [19, 82, 3], [22, 84, 2],
    [24, 72, 2], [26, 73, 3], [29, 72, 4],
    [33, 77, 3], [36, 75, 3], [39, 77, 2], [41, 79, 3],
    [44, 80, 3], [47, 79, 2], [49, 72, 16],
    [65, 77, 9], [74, 72, 7], [81, 79, 3], [84, 80, 3],
    [87, 79, 2], [89, 80, 7], [96, 79, 4], [100, 80, 3],
    [103, 79, 2], [105, 80, 7], [112, 79, 8],
    [120, 77, 1], [121, 72, 4], [125, 75, 3],
  ],
];

// 5〜8 kHz帯で基音を確認できたベル状の上声だけを別トラックにする。
// 低い旋律から機械的に作ったオクターブ音は含めない。
const crystalSequences: readonly (readonly NoteEvent[])[] = [
  [],
  [],
  [
    [0, 89, 4], [4, 91, 2], [6, 92, 4], [10, 94, 3], [13, 96, 3],
    [16, 92, 4], [20, 94, 3], [23, 96, 3],
    [39, 89, 2], [41, 91, 3], [44, 92, 3], [47, 94, 2],
    [49, 96, 15], [64, 94, 8], [72, 91, 8],
    [80, 94, 4], [84, 92, 2], [86, 91, 3], [89, 89, 7],
    [96, 94, 4], [100, 92, 2], [102, 91, 3], [105, 89, 7],
    [112, 91, 8], [120, 89, 4],
  ],
  [
    [0, 89, 3], [3, 91, 3], [6, 92, 3], [9, 94, 3], [12, 96, 4],
    [16, 92, 3], [19, 94, 3], [22, 96, 2],
  ],
];

const ADPCM_HIGH_CHIME_BASE_MIDI = 84;

// Demucsで分離したドラムstemのオンセットを16分音符へ量子化したADPCMイベント。
// MIDIドラムノートは36=Kick、38=Snare、39=Clap、42/46=Hi-hat、45/47/50=Tom。
const adpcmDrumSequence: readonly DrumEvent[] = [
  ...Array.from({ length: 14 }, (_, index) => [index * 8, 36, index % 4 === 0 ? 1 : 0.82] as const),
  ...Array.from({ length: 14 }, (_, index) => [index * 8 + 4, 38, index % 4 === 3 ? 0.94 : 0.86] as const),
  ...Array.from({ length: 55 }, (_, index) => [index * 2 + 2, 42, index % 4 === 2 ? 0.56 : 0.38] as const),
  ...[14, 30, 46, 62, 78, 94, 110].map((start) => [start, 46, 0.68] as const),
  [112, 45, 0.82], [114, 47, 0.74], [116, 50, 0.86], [118, 47, 0.76],
  [120, 45, 0.9], [122, 47, 0.82], [124, 50, 0.94], [126, 39, 0.78],
];

// 原曲で主旋律の下に残っている和音を16分音符グリッドへ戻した内声。
// 主旋律だけを鳴らしたときに欠けていた3度・5度を補う。
const harmonySequence: readonly NoteEvent[] = [
  [0, 52, 16], [0, 55, 16], [0, 59, 16],
  [16, 50, 16], [16, 54, 16], [16, 57, 16],
  [32, 48, 16], [32, 52, 16], [32, 55, 16],
  [48, 55, 16], [48, 59, 16], [48, 62, 16],
  [64, 54, 8], [64, 57, 8], [64, 61, 8],
  [72, 47, 8], [72, 51, 8], [72, 54, 8],
  [80, 52, 8], [80, 55, 8], [80, 59, 8],
  [88, 49, 8], [88, 52, 8], [88, 55, 8],
  [96, 48, 16], [96, 51, 16], [96, 55, 16],
  [112, 45, 8], [112, 48, 8], [112, 52, 8],
  [120, 47, 8], [120, 51, 8], [120, 54, 8],
];

// 各コードの根音を3オクターブ上へ移した、ゆっくり動く上声。
// 主旋律とは別の音色で鳴らし、参照音源に残るE5〜E6付近の層を補う。
const counterSequence: readonly NoteEvent[] = [
  [0, 76, 16], [16, 74, 16], [32, 72, 8], [40, 74, 8], [48, 79, 16],
  [64, 78, 8], [72, 75, 8], [80, 76, 8], [88, 73, 8],
  [96, 72, 16], [112, 69, 8], [120, 71, 8],
];

function createNoiseBuffer(context: AudioContext, seconds: number): AudioBuffer {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * seconds), context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0;
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.72 + white * 0.28;
    data[index] = previous;
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
  filterType: BiquadFilterType = "bandpass",
): void {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  source.buffer = buffer;
  filter.type = filterType;
  filter.frequency.setValueAtTime(frequency, startAt);
  filter.Q.setValueAtTime(filterType === "bandpass" ? 1.2 : 0.7, startAt);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.linearRampToValueAtTime(gain, startAt + Math.min(0.006, duration * 0.16));
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
  oscillator.frequency.setValueAtTime(145, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(42, startAt + 0.14);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.004);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18);
  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.2);
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
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.62, startAt + 0.2);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.005);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.25);
  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.27);
  trackScheduledSource(sources, oscillator, () => envelope.disconnect());
}

function createSnareBody(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  startAt: number,
  gain: number,
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(205, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(112, startAt + 0.105);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.003);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.13);
  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.145);
  trackScheduledSource(sources, oscillator, () => envelope.disconnect());
}

function createMetalHit(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  startAt: number,
  duration: number,
  gain: number,
): void {
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  const frequencies = [421, 563, 719, 907] as const;
  filter.type = "highpass";
  filter.frequency.setValueAtTime(3300, startAt);
  filter.Q.setValueAtTime(0.72, startAt);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.003);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  filter.connect(envelope);
  envelope.connect(destination);

  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = index % 2 === 0 ? "square" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, startAt);
    oscillator.detune.setValueAtTime((index - 1.5) * 2.8, startAt);
    oscillator.connect(filter);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
    trackScheduledSource(sources, oscillator, index === frequencies.length - 1 ? () => {
      filter.disconnect();
      envelope.disconnect();
    } : undefined);
  });
}

function scheduleSequence(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  sequence: readonly NoteEvent[],
  entryAt: number,
  offset: number,
  pan: number,
  patch: FmPatch,
  transpose = 0,
  detuneCents = 0,
): void {
  sequence.forEach(([start, note, length]) => {
    createFmVoice(
      context,
      destination,
      sources,
      midiToFrequency(note + transpose),
      entryAt + (offset + start) * SIXTEENTH,
      length * SIXTEENTH * 0.94,
      pan,
      patch,
      detuneCents,
    );
  });
}

// 長いパッド音だけは次の音へ少し重ねる。通常の0.94倍ゲートを使うと
// 16単位ごとに約0.1秒の空白が生まれ、伸びる「ファー」が息切れして聞こえる。
function scheduleSustainedSequence(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  sequence: readonly NoteEvent[],
  entryAt: number,
  offset: number,
  pan: number,
  patch: FmPatch,
  transpose = 0,
): void {
  sequence.forEach(([start, note, length]) => {
    createFmVoice(
      context,
      destination,
      sources,
      midiToFrequency(note + transpose),
      entryAt + (offset + start) * SIXTEENTH,
      length * SIXTEENTH * 1.055,
      pan,
      patch,
    );
  });
}

function schedulePitchedAdpcmSequence(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  sample: AudioBuffer,
  sequence: readonly NoteEvent[],
  entryAt: number,
  offset: number,
  transpose: number,
): void {
  sequence.forEach(([start, note], index) => {
    const targetNote = note + transpose;
    const playbackRate = 2 ** ((targetNote - ADPCM_HIGH_CHIME_BASE_MIDI) / 12);
    scheduleAdpcmSample(
      context,
      destination,
      sources,
      sample,
      entryAt + (offset + start) * SIXTEENTH,
      {
        gain: targetNote >= 92 ? 0.038 : 0.03,
        pan: index % 2 === 0 ? -0.34 : 0.34,
        playbackRate,
      },
    );
  });
}

function scheduleArpeggio(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  sequence: readonly NoteEvent[],
  entryAt: number,
  offset: number,
  transpose: number,
): void {
  const intervals = [24, 31, 36, 31] as const;
  sequence.forEach(([start, note, length]) => {
    for (let position = 0; position < length; position += 2) {
      const step = Math.floor(position / 2);
      createFmVoice(
        context,
        destination,
        sources,
        midiToFrequency(note + transpose + intervals[step % intervals.length]),
        entryAt + (offset + start + position) * SIXTEENTH,
        1.55 * SIXTEENTH,
        step % 2 === 0 ? -0.48 : 0.48,
        pluckPatch,
        step % 2 === 0 ? -2.5 : 2.5,
      );
    }
  });
}

function scheduleGuitarChops(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  sequence: readonly NoteEvent[],
  entryAt: number,
  offset: number,
  transpose: number,
  stepUnits = 8,
): void {
  sequence.forEach(([start, note, length], noteIndex) => {
    for (let position = 2; position < length; position += stepUnits) {
      createFmVoice(
        context,
        destination,
        sources,
        midiToFrequency(note + transpose + 12),
        entryAt + (offset + start + position) * SIXTEENTH,
        1.45 * SIXTEENTH,
        noteIndex % 2 === 0 ? -0.22 : 0.22,
        guitarPatch,
        noteIndex % 3 === 0 ? -1.4 : 1.4,
      );
    }
  });
}

function schedulePulsedSequence(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  sequence: readonly NoteEvent[],
  entryAt: number,
  offset: number,
  pan: number,
  patch: FmPatch,
  transpose = 0,
  pulseUnits = 4,
): void {
  sequence.forEach(([start, note, length]) => {
    for (let position = 0; position < length; position += pulseUnits) {
      createFmVoice(
        context,
        destination,
        sources,
        midiToFrequency(note + transpose),
        entryAt + (offset + start + position) * SIXTEENTH,
        Math.min(length - position, pulseUnits - 0.22) * SIXTEENTH,
        pan,
        patch,
      );
    }
  });
}

function createFourBitCurve(): Float32Array {
  const curve = new Float32Array(256);
  for (let index = 0; index < curve.length; index += 1) {
    const input = index / (curve.length - 1) * 2 - 1;
    curve[index] = Math.round(input * 8) / 8;
  }
  return curve;
}

function createSoftClipCurve(): Float32Array {
  const curve = new Float32Array(1024);
  const drive = 1.35;
  const ceiling = Math.tanh(drive);
  for (let index = 0; index < curve.length; index += 1) {
    const input = index / (curve.length - 1) * 2 - 1;
    curve[index] = Math.tanh(input * drive) / ceiling;
  }
  return curve;
}

export function playForeverX68000Track(context: AudioContext): () => void {
  const startAt = context.currentTime + 0.04;
  const entryAt = startAt + FM_ENTRY_SECONDS;
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const leadBus = context.createGain();
  const airBus = context.createGain();
  const brillianceBus = context.createGain();
  const fmBus = context.createGain();
  const adpcmBus = context.createGain();
  const adpcmDry = context.createGain();
  const adpcmCrushed = context.createGain();
  const toneFilter = context.createBiquadFilter();
  const presenceFilter = context.createBiquadFilter();
  const airFilter = context.createBiquadFilter();
  const brillianceFilter = context.createBiquadFilter();
  const brilliancePeak = context.createBiquadFilter();
  const quantizer = context.createWaveShaper();
  const softClip = context.createWaveShaper();
  const noiseBuffer = createNoiseBuffer(context, 0.7);
  const adpcmSamples = createAdpcmSampleBank(context);
  const sources: AudioScheduledSourceNode[] = [];
  let disconnected = false;

  master.gain.setValueAtTime(0.66, startAt);
  compressor.threshold.setValueAtTime(-12, startAt);
  compressor.knee.setValueAtTime(18, startAt);
  compressor.ratio.setValueAtTime(2.2, startAt);
  compressor.attack.setValueAtTime(0.012, startAt);
  compressor.release.setValueAtTime(0.24, startAt);
  leadBus.gain.setValueAtTime(0.74, startAt);
  airBus.gain.setValueAtTime(0.57, startAt);
  brillianceBus.gain.setValueAtTime(0.51, startAt);
  fmBus.gain.setValueAtTime(0.64, startAt);
  adpcmBus.gain.setValueAtTime(0.27, startAt);
  adpcmDry.gain.setValueAtTime(0.82, startAt);
  adpcmCrushed.gain.setValueAtTime(0.07, startAt);
  toneFilter.type = "lowpass";
  toneFilter.frequency.setValueAtTime(12400, startAt);
  toneFilter.Q.setValueAtTime(0.72, startAt);
  presenceFilter.type = "peaking";
  presenceFilter.frequency.setValueAtTime(2700, startAt);
  presenceFilter.Q.setValueAtTime(0.84, startAt);
  presenceFilter.gain.setValueAtTime(2.4, startAt);
  airFilter.type = "highshelf";
  airFilter.frequency.setValueAtTime(4600, startAt);
  airFilter.gain.setValueAtTime(4.2, startAt);
  brillianceFilter.type = "highpass";
  brillianceFilter.frequency.setValueAtTime(2400, startAt);
  brillianceFilter.Q.setValueAtTime(0.64, startAt);
  brilliancePeak.type = "peaking";
  brilliancePeak.frequency.setValueAtTime(5400, startAt);
  brilliancePeak.Q.setValueAtTime(0.72, startAt);
  brilliancePeak.gain.setValueAtTime(4.2, startAt);
  quantizer.curve = createFourBitCurve();
  quantizer.oversample = "none";
  softClip.curve = createSoftClipCurve();
  softClip.oversample = "2x";

  leadBus.connect(presenceFilter);
  presenceFilter.connect(softClip);
  airBus.connect(airFilter);
  airFilter.connect(softClip);
  brillianceBus.connect(brillianceFilter);
  brillianceFilter.connect(brilliancePeak);
  brilliancePeak.connect(softClip);
  fmBus.connect(toneFilter);
  toneFilter.connect(softClip);
  adpcmBus.connect(adpcmDry);
  adpcmDry.connect(softClip);
  adpcmBus.connect(quantizer);
  quantizer.connect(adpcmCrushed);
  adpcmCrushed.connect(softClip);
  softClip.connect(compressor);
  compressor.connect(master);
  master.connect(context.destination);

  [1.08, 0.98, 0.86, 1.16, 0.76].forEach((playbackRate, index) => {
    scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.tom, startAt + index * 0.34, {
      gain: 0.065 + index * 0.006,
      pan: (index - 2) * 0.18,
      playbackRate,
    });
  });
  scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.orchestraHit, startAt, {
    gain: 0.062,
    pan: -0.16,
  });
  scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.snare, startAt + 0.012, {
    gain: 0.13,
    pan: 0.12,
  });
  scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.metal, startAt + 1.67, {
    gain: 0.055,
    pan: 0.24,
    playbackRate: 1.08,
  });

  const schedulePhrase = (phrase: number) => {
    if (disconnected) return;
    const offset = phrase * PHRASE_UNITS;
    const transpose = phrase >= 2 ? 1 : 0;
    const chordPan = phrase % 2 === 0 ? -0.34 : 0.34;
    const phrasePatch = phrase % 2 === 0 ? chordPatch : brassPatch;
    const fineTune = phrase % 2 === 0 ? -4.5 : 4.5;

    scheduleSequence(context, leadBus, sources, chordSequence, entryAt, offset, chordPan, phrasePatch, transpose);
    scheduleSequence(
      context,
      leadBus,
      sources,
      chordSequence,
      entryAt,
      offset + 0.14,
      -chordPan,
      shadowPatch,
      transpose,
      fineTune,
    );
    scheduleSequence(context, fmBus, sources, harmonySequence, entryAt, offset, -0.12, harmonyPatch, transpose);
    scheduleSustainedSequence(
      context,
      fmBus,
      sources,
      counterSequence,
      entryAt,
      offset,
      0.18,
      ensemblePatch,
      transpose,
    );
    scheduleSustainedSequence(
      context,
      fmBus,
      sources,
      bassSequence,
      entryAt,
      offset,
      -0.58,
      padPatch,
      transpose + 24,
    );
    scheduleSustainedSequence(
      context,
      fmBus,
      sources,
      bassSequence,
      entryAt,
      offset,
      0.58,
      padPatch,
      transpose + 31,
    );
    schedulePulsedSequence(context, fmBus, sources, bassSequence, entryAt, offset, 0, bassPatch, transpose);
    if (phrase >= 1) {
      scheduleSequence(context, fmBus, sources, bassSequence, entryAt, offset, 0, subBassPatch, transpose - 12);
    }
    scheduleArpeggio(context, fmBus, sources, bassSequence, entryAt, offset, transpose);

    const leadHighlights = chordSequence.filter(([start, , length]) => length >= 7 || start % 16 === 0);
    scheduleSequence(
      context,
      leadBus,
      sources,
      leadHighlights,
      entryAt,
      offset + 0.03,
      -chordPan * 0.4,
      leadEdgePatch,
      transpose,
      -fineTune * 0.35,
    );

    schedulePulsedSequence(
      context,
      fmBus,
      sources,
      harmonySequence,
      entryAt,
      offset + 1,
      0.24,
      electricPianoPatch,
      transpose + 12,
      phrase === 0 ? 16 : 8,
    );
    scheduleGuitarChops(
      context,
      fmBus,
      sources,
      harmonySequence,
      entryAt,
      offset,
      transpose,
      phrase % 2 === 0 ? 16 : 8,
    );

    const upperLeadSequence = upperLeadSequences[phrase];
    scheduleSequence(
      context,
      airBus,
      sources,
      upperLeadSequence,
      entryAt,
      offset,
      phrase % 2 === 0 ? -0.16 : 0.16,
      airLeadPatch,
    );

    const crystalSequence = crystalSequences[phrase];
    scheduleSequence(
      context,
      brillianceBus,
      sources,
      crystalSequence,
      entryAt,
      offset,
      phrase % 2 === 0 ? 0.4 : -0.4,
      brilliancePatch,
    );
    schedulePitchedAdpcmSequence(
      context,
      adpcmBus,
      sources,
      adpcmSamples.highChime,
      crystalSequence,
      entryAt,
      offset,
      0,
    );

    const shortAccents = chordSequence.filter(([, , length]) => length <= 3);
    scheduleSequence(
      context,
      fmBus,
      sources,
      shortAccents,
      entryAt,
      offset + (phrase % 2 === 0 ? 0.5 : 1),
      -chordPan,
      shimmerPatch,
      transpose + 12,
      -fineTune * 0.65,
    );

    const phraseStartAt = entryAt + offset * SIXTEENTH;
    if (phrase % 2 === 0) {
      scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.orchestraHit, phraseStartAt, {
        gain: phrase === 2 ? 0.13 : 0.105,
        pan: phrase === 2 ? 0.16 : -0.16,
        playbackRate: phrase === 2 ? 1.06 : 1,
      });
    } else {
      scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.voiceStab, phraseStartAt + 8 * SIXTEENTH, {
        gain: phrase === 3 ? 0.095 : 0.075,
        pan: phrase === 3 ? 0.26 : -0.26,
        playbackRate: phrase === 3 ? 1.06 : 1,
      });
    }
    createMetalHit(
      context,
      adpcmBus,
      sources,
      phraseStartAt,
      phrase === 2 ? 0.72 : 0.48,
      phrase === 2 ? 0.009 : 0.006,
    );

    adpcmDrumSequence.forEach(([phraseUnit, midiNote, velocity], eventIndex) => {
      const hitAt = entryAt + (offset + phraseUnit) * SIXTEENTH;
      const phraseGain = phrase === 3 ? 1.08 : 1;
      const pan = eventIndex % 2 === 0 ? -0.08 : 0.08;

      if (midiNote === 36) {
        createKick(context, adpcmBus, sources, hitAt, 0.052 * velocity * phraseGain);
        scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.kick, hitAt, {
          gain: 0.18 * velocity * phraseGain,
          pan,
        });
        return;
      }

      if (midiNote === 38) {
        createNoiseHit(context, adpcmBus, sources, noiseBuffer, hitAt, 0.15, 1750, 0.022 * velocity);
        createNoiseHit(context, adpcmBus, sources, noiseBuffer, hitAt + 0.009, 0.09, 3600, 0.008 * velocity);
        createSnareBody(context, adpcmBus, sources, hitAt, 0.018 * velocity);
        scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.snare, hitAt, {
          gain: 0.19 * velocity * phraseGain,
          pan,
        });
        if (phraseUnit % 32 === 28) {
          scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.clap, hitAt + 0.012, {
            gain: 0.075 * velocity,
            pan: phrase % 2 === 0 ? 0.34 : -0.34,
          });
        }
        return;
      }

      if (midiNote === 42 || midiNote === 46) {
        const isOpen = midiNote === 46;
        createNoiseHit(
          context,
          adpcmBus,
          sources,
          noiseBuffer,
          hitAt,
          isOpen ? 0.13 : 0.045,
          isOpen ? 7600 : 9300,
          (isOpen ? 0.014 : 0.006) * velocity,
          "highpass",
        );
        if (isOpen) {
          scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.metal, hitAt, {
            gain: 0.026 * velocity,
            pan: phraseUnit % 32 === 14 ? -0.46 : 0.46,
            playbackRate: 1.82,
          });
        }
        return;
      }

      if (midiNote === 39) {
        scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.clap, hitAt, {
          gain: 0.13 * velocity * phraseGain,
          pan: phrase % 2 === 0 ? 0.4 : -0.4,
        });
        return;
      }

      const tomPlaybackRate = midiNote === 45 ? 0.72 : midiNote === 47 ? 0.9 : 1.12;
      createTom(
        context,
        adpcmBus,
        sources,
        hitAt,
        midiToFrequency(midiNote - 12),
        0.032 * velocity * phraseGain,
      );
      scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.tom, hitAt, {
        gain: 0.14 * velocity * phraseGain,
        pan: (eventIndex % 5 - 2) * 0.2,
        playbackRate: tomPlaybackRate,
      });
    });
  };

  const finalStart = entryAt + TRACK_UNITS * SIXTEENTH;

  // 5秒先までをAudioContextの絶対時刻へ予約する。通常のタイマーは
  // 予約を補充するだけにして、フレーズ境界そのものは音声クロックへ揃える。
  const phraseDuration = PHRASE_UNITS * SIXTEENTH;
  const scheduleAheadSeconds = 5;
  let nextPhrase = 0;
  let schedulerTimer: number | null = null;
  const schedulePendingEvents = () => {
    if (disconnected) return;
    const horizon = context.currentTime + scheduleAheadSeconds;
    while (
      nextPhrase < 4
      && entryAt + nextPhrase * phraseDuration <= horizon
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

  // 参照音源末尾に相当する追加フレーズは作らず、本編4フレーズの余韻だけを残す。
  master.gain.setValueAtTime(0.66, finalStart);
  master.gain.exponentialRampToValueAtTime(0.0001, finalStart + RELEASE_TAIL_SECONDS);

  const disconnectGraph = () => {
    if (disconnected) return;
    disconnected = true;
    leadBus.disconnect();
    airBus.disconnect();
    brillianceBus.disconnect();
    fmBus.disconnect();
    adpcmBus.disconnect();
    adpcmDry.disconnect();
    adpcmCrushed.disconnect();
    toneFilter.disconnect();
    presenceFilter.disconnect();
    airFilter.disconnect();
    brillianceFilter.disconnect();
    brilliancePeak.disconnect();
    quantizer.disconnect();
    softClip.disconnect();
    master.disconnect();
    compressor.disconnect();
  };
  const cleanupTimer = window.setTimeout(disconnectGraph, (TRACK_DURATION + 0.2) * 1000);

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
