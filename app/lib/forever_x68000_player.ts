import { createAdpcmSampleBank, scheduleAdpcmSample } from "~/lib/adpcm_synth";
import {
  createFmVoice,
  midiToFrequency,
  trackScheduledSource,
  type FmPatch,
} from "~/lib/fm_synth";

type NoteEvent = readonly [start: number, note: number, length: number];

const BPM = 132;
const SIXTEENTH = 60 / BPM / 4;
const FM_ENTRY_SECONDS = 1.855;
const PHRASE_UNITS = 128;
const TRACK_UNITS = PHRASE_UNITS * 4;
const FINAL_TAIL_SECONDS = 10.8;
const TRACK_DURATION = FM_ENTRY_SECONDS + TRACK_UNITS * SIXTEENTH + FINAL_TAIL_SECONDS;

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
  algorithm: "fan",
  ratios: [1, 2.002, 3.998, 1.006],
  modulation: [0.24, 0.1, 0.045],
  waveforms: ["sine", "sine", "triangle", "sine"],
  operatorDetuneCents: [-5.2, -1.6, 4.8, 1.4],
  filterFrequency: 5200,
  filterStartFrequency: 2600,
  filterAttack: 0.18,
  filterQ: 0.58,
  attack: 0.14,
  decay: 0.48,
  peakGain: 0.0038,
  sustainGain: 0.0027,
  release: 0.82,
  vibratoRate: 4.35,
  vibratoCents: 3.5,
};

const glassPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 6.98, 2.01, 12.02],
  modulation: [0.9, 0, 0.58],
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.5, 1.1, 1.5, -1.1],
  filterFrequency: 11800,
  filterQ: 1.16,
  attack: 0.002,
  decay: 0.12,
  peakGain: 0.0058,
  sustainGain: 0.0007,
  release: 0.62,
};

const airLeadPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 5.01, 2.002, 9.03],
  modulation: [0.52, 0, 0.31],
  waveforms: ["sine", "sine", "triangle", "sine"],
  operatorDetuneCents: [-2.6, 1.1, 2.6, -1.1],
  filterFrequency: 13200,
  filterStartFrequency: 6800,
  filterAttack: 0.048,
  filterQ: 0.94,
  pitchAttackCents: -14,
  pitchAttackTime: 0.065,
  attack: 0.01,
  decay: 0.28,
  peakGain: 0.0052,
  sustainGain: 0.0025,
  release: 0.68,
  vibratoRate: 5.35,
  vibratoCents: 3.2,
};

const sparklePatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 6.01, 2.003, 11.02],
  modulation: [0.62, 0, 0.38],
  waveforms: ["sine", "sine", "triangle", "sine"],
  operatorDetuneCents: [-2.4, 1, 2.4, -1],
  filterFrequency: 14200,
  filterStartFrequency: 7200,
  filterAttack: 0.032,
  filterQ: 1.08,
  pitchAttackCents: -18,
  pitchAttackTime: 0.045,
  attack: 0.004,
  decay: 0.16,
  peakGain: 0.0038,
  sustainGain: 0.0009,
  release: 0.5,
};

const brilliancePatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 3.006, 5.01, 8.03],
  modulation: [0.42, 0.23, 0.11],
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.6, 1.1, -0.8, 1.7],
  filterFrequency: 16800,
  filterStartFrequency: 9200,
  filterAttack: 0.024,
  filterQ: 0.82,
  pitchAttackCents: -12,
  pitchAttackTime: 0.038,
  attack: 0.003,
  decay: 0.13,
  peakGain: 0.0042,
  sustainGain: 0.00055,
  release: 0.42,
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

const finalPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 1, 2, 3],
  modulation: [1.12, 0.48, 0.2],
  waveforms: ["triangle", "sine", "sine", "sine"],
  filterFrequency: 7200,
  filterQ: 0.8,
  attack: 0.012,
  decay: 0.4,
  peakGain: 0.018,
  sustainGain: 0.009,
  release: 1.35,
  vibratoRate: 4.9,
  vibratoCents: 4,
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

// 本編の転調先（C#）を一度上昇してから解決する終止フレーズ。
// すぐにフェードせず、主旋律・上声・最終和音の順に着地させる。
const endingLeadSequence: readonly NoteEvent[] = [
  [0, 68, 4], [4, 73, 4], [8, 77, 4], [12, 80, 8],
  [20, 77, 4], [24, 73, 4], [28, 68, 4], [32, 73, 8],
];

const endingHarmonySequence: readonly NoteEvent[] = [
  [0, 61, 8], [0, 65, 8], [0, 68, 8],
  [8, 61, 12], [8, 65, 12], [8, 68, 12],
  [20, 61, 8], [20, 65, 8], [20, 68, 8],
  [28, 56, 12], [28, 61, 12], [28, 65, 12],
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

function createAdpcmIntro(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  noiseBuffer: AudioBuffer,
  startAt: number,
): void {
  [112, 148, 186, 132, 214].forEach((frequency, index) => {
    const hitAt = startAt + index * 0.34;
    createTom(context, destination, sources, hitAt, frequency, 0.055 + index * 0.004);
    createNoiseHit(context, destination, sources, noiseBuffer, hitAt, 0.13, 1500 + index * 720, 0.025);
  });
  createNoiseHit(context, destination, sources, noiseBuffer, startAt + 1.67, 0.19, 7600, 0.044, "highpass");
  createMetalHit(context, destination, sources, startAt + 1.67, 0.42, 0.0085);
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

function scheduleHighArpeggio(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  sequence: readonly NoteEvent[],
  entryAt: number,
  offset: number,
  transpose: number,
): void {
  const intervals = [36, 43, 48, 43] as const;
  sequence.forEach(([start, note, length]) => {
    for (let position = 2; position < length; position += 8) {
      const step = Math.floor(position / 8);
      createFmVoice(
        context,
        destination,
        sources,
        midiToFrequency(note + transpose + intervals[step % intervals.length]),
        entryAt + (offset + start + position) * SIXTEENTH,
        1.35 * SIXTEENTH,
        step % 2 === 0 ? -0.38 : 0.38,
        glassPatch,
        step % 2 === 0 ? -1.8 : 1.8,
      );
    }
  });
}

function scheduleAirArpeggio(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  sequence: readonly NoteEvent[],
  entryAt: number,
  offset: number,
  transpose: number,
  stepUnits: number,
): void {
  const intervals = [48, 55, 60, 55] as const;
  sequence.forEach(([start, note, length], noteIndex) => {
    for (let position = 6; position < length; position += stepUnits) {
      const step = Math.floor(position / stepUnits) + noteIndex;
      createFmVoice(
        context,
        destination,
        sources,
        midiToFrequency(note + transpose + intervals[step % intervals.length]),
        entryAt + (offset + start + position) * SIXTEENTH,
        1.8 * SIXTEENTH,
        step % 2 === 0 ? -0.56 : 0.56,
        sparklePatch,
        step % 2 === 0 ? -2.1 : 2.1,
      );
    }
  });
}

function scheduleBrillianceArpeggio(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  sequence: readonly NoteEvent[],
  entryAt: number,
  offset: number,
  transpose: number,
  stepUnits: number,
): void {
  const intervals = [43, 48, 55, 48] as const;
  sequence.forEach(([start, note, length], noteIndex) => {
    for (let position = 6; position < length; position += stepUnits) {
      const step = Math.floor(position / stepUnits) + noteIndex;
      createFmVoice(
        context,
        destination,
        sources,
        midiToFrequency(note + transpose + intervals[step % intervals.length]),
        entryAt + (offset + start + position) * SIXTEENTH + 0.016,
        1.45 * SIXTEENTH,
        step % 2 === 0 ? -0.62 : 0.62,
        brilliancePatch,
        step % 2 === 0 ? -1.7 : 1.7,
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

  master.gain.setValueAtTime(0.53, startAt);
  compressor.threshold.setValueAtTime(-12, startAt);
  compressor.knee.setValueAtTime(18, startAt);
  compressor.ratio.setValueAtTime(2.2, startAt);
  compressor.attack.setValueAtTime(0.012, startAt);
  compressor.release.setValueAtTime(0.24, startAt);
  leadBus.gain.setValueAtTime(0.74, startAt);
  airBus.gain.setValueAtTime(0.42, startAt);
  brillianceBus.gain.setValueAtTime(0.38, startAt);
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
  brillianceFilter.frequency.setValueAtTime(3800, startAt);
  brillianceFilter.Q.setValueAtTime(0.64, startAt);
  brilliancePeak.type = "peaking";
  brilliancePeak.frequency.setValueAtTime(6200, startAt);
  brilliancePeak.Q.setValueAtTime(0.72, startAt);
  brilliancePeak.gain.setValueAtTime(4.8, startAt);
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

  createAdpcmIntro(context, adpcmBus, sources, noiseBuffer, startAt);
  [1.08, 0.98, 0.86, 1.16, 0.76].forEach((playbackRate, index) => {
    scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.tom, startAt + index * 0.34, {
      gain: 0.065 + index * 0.006,
      pan: (index - 2) * 0.18,
      playbackRate,
    });
  });
  scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.orchestraHit, startAt, {
    gain: 0.075,
    pan: -0.16,
  });
  scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.metal, startAt + 1.67, {
    gain: 0.08,
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
    scheduleSequence(context, fmBus, sources, counterSequence, entryAt, offset, 0.18, ensemblePatch, transpose);
    scheduleSequence(context, fmBus, sources, bassSequence, entryAt, offset, -0.58, padPatch, transpose + 24);
    scheduleSequence(context, fmBus, sources, bassSequence, entryAt, offset, 0.58, padPatch, transpose + 31);
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
    scheduleHighArpeggio(context, fmBus, sources, bassSequence, entryAt, offset, transpose);
    scheduleAirArpeggio(
      context,
      airBus,
      sources,
      bassSequence,
      entryAt,
      offset,
      transpose,
      phrase >= 2 ? 8 : 16,
    );
    scheduleBrillianceArpeggio(
      context,
      brillianceBus,
      sources,
      bassSequence,
      entryAt,
      offset,
      transpose,
      phrase >= 2 ? 8 : 16,
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

    const upperAccents = shortAccents.filter((_, index) => (index + phrase) % 3 === 0);
    scheduleSequence(
      context,
      airBus,
      sources,
      upperAccents,
      entryAt,
      offset + 1.2,
      chordPan * 0.3,
      airLeadPatch,
      transpose + 24,
      fineTune * 0.2,
    );

    if (phrase >= 2) {
      const sparkleAccents = upperAccents.filter((_, index) => index % 2 === phrase % 2);
      scheduleSequence(
        context,
        airBus,
        sources,
        sparkleAccents,
        entryAt,
        offset + 1.42,
        -chordPan * 0.42,
        sparklePatch,
        transpose + 36,
        -fineTune * 0.15,
      );
    }

    if (phrase === 3) {
      scheduleSequence(
        context,
        brillianceBus,
        sources,
        shortAccents,
        entryAt,
        offset + 1.5,
        chordPan * 0.45,
        glassPatch,
        transpose + 24,
        fineTune * 0.25,
      );
    }

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

    for (let phraseUnit = 0; phraseUnit < PHRASE_UNITS; phraseUnit += 2) {
      const unit = offset + phraseUnit;
      const hitAt = entryAt + unit * SIXTEENTH;
      if (phraseUnit % 8 === 0 || phraseUnit % 32 === 20) {
        createKick(context, adpcmBus, sources, hitAt, phraseUnit === 0 ? 0.065 : 0.045);
        scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.kick, hitAt, {
          gain: phraseUnit === 0 ? 0.19 : 0.145,
          pan: phraseUnit % 16 === 0 ? -0.04 : 0.04,
        });
      }
      if (phraseUnit % 8 === 4) {
        createNoiseHit(context, adpcmBus, sources, noiseBuffer, hitAt, 0.15, 1750, 0.022);
        createNoiseHit(context, adpcmBus, sources, noiseBuffer, hitAt + 0.009, 0.09, 3600, 0.008);
        createSnareBody(context, adpcmBus, sources, hitAt, 0.016);
        scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.snare, hitAt, {
          gain: 0.17,
          pan: phraseUnit % 16 === 4 ? -0.1 : 0.1,
        });
        if (phraseUnit % 32 === 28) {
          scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.clap, hitAt + 0.012, {
            gain: 0.085,
            pan: phrase % 2 === 0 ? 0.38 : -0.38,
          });
        }
      }
      createNoiseHit(
        context,
        adpcmBus,
        sources,
        noiseBuffer,
        hitAt,
        phraseUnit % 16 === 14 ? 0.1 : 0.045,
        phraseUnit % 4 === 0 ? 7100 : 9300,
        phraseUnit % 16 === 14 ? 0.012 : 0.006,
        "highpass",
      );
      if (phraseUnit % 16 === 6 || phraseUnit % 16 === 14) {
        createNoiseHit(context, adpcmBus, sources, noiseBuffer, hitAt, 0.13, 11200, 0.0055, "highpass");
      }
      if (phraseUnit % 16 === 14) {
        createMetalHit(context, adpcmBus, sources, hitAt, 0.085, 0.0018);
        scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.metal, hitAt, {
          gain: 0.028,
          pan: phrase % 2 === 0 ? -0.5 : 0.5,
          playbackRate: 1.8,
        });
      }
    }

    [120, 124, 126].forEach((phraseUnit, index) => {
      const tomAt = entryAt + (offset + phraseUnit) * SIXTEENTH;
      createTom(
        context,
        adpcmBus,
        sources,
        tomAt,
        184 - index * 28,
        0.026 - index * 0.003,
      );
      scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.tom, tomAt, {
        gain: 0.12 - index * 0.01,
        pan: (index - 1) * 0.3,
        playbackRate: [1.08, 0.84, 0.64][index],
      });
    });
  };

  const finalStart = entryAt + TRACK_UNITS * SIXTEENTH;
  const finalResolutionStart = finalStart + 40 * SIXTEENTH;
  const scheduleFinal = () => {
    if (disconnected) return;

    scheduleSequence(
      context,
      leadBus,
      sources,
      endingLeadSequence,
      finalStart,
      0,
      -0.12,
      finalPatch,
    );
    scheduleSequence(
      context,
      airBus,
      sources,
      endingLeadSequence,
      finalStart,
      0.18,
      0.18,
      airLeadPatch,
      12,
      2.2,
    );
    scheduleSequence(
      context,
      fmBus,
      sources,
      endingHarmonySequence,
      finalStart,
      0,
      0,
      electricPianoPatch,
    );
    [37, 49].forEach((note, index) => {
      createFmVoice(
        context,
        fmBus,
        sources,
        midiToFrequency(note),
        finalStart,
        40 * SIXTEENTH,
        index === 0 ? -0.18 : 0.18,
        index === 0 ? subBassPatch : padPatch,
      );
    });
    [0, 0.66, 1.34, 2.16].forEach((delay, index) => {
      const tomAt = finalStart + delay;
      createTom(context, adpcmBus, sources, tomAt, 215 - index * 23, 0.032 - index * 0.004);
      scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.tom, tomAt, {
        gain: 0.13 - index * 0.012,
        pan: (index - 1.5) * 0.22,
        playbackRate: [1.24, 1.02, 0.82, 0.66][index],
      });
    });
    [37, 49, 56, 61, 65].forEach((note, index) => {
      createFmVoice(
        context,
        fmBus,
        sources,
        midiToFrequency(note),
        finalResolutionStart,
        5.4,
        (index - 2) * 0.25,
        finalPatch,
        (index - 2) * 1.2,
      );
    });
    [56, 61, 65].forEach((note, index) => {
      createFmVoice(
        context,
        leadBus,
        sources,
        midiToFrequency(note + 24),
        finalResolutionStart + 0.025,
        5.1,
        (index - 1) * 0.24,
        ensemblePatch,
        (index - 1) * 1.6,
      );
      createFmVoice(
        context,
        airBus,
        sources,
        midiToFrequency(note + 36),
        finalResolutionStart + 0.055,
        3.6,
        (1 - index) * 0.28,
        airLeadPatch,
        (1 - index) * 1.2,
      );
      createFmVoice(
        context,
        brillianceBus,
        sources,
        midiToFrequency(note + 24),
        finalResolutionStart + 0.085,
        2.8,
        (index - 1) * 0.32,
        brilliancePatch,
        (index - 1) * 1.4,
      );
    });
    createKick(context, adpcmBus, sources, finalResolutionStart, 0.065);
    scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.kick, finalResolutionStart, {
      gain: 0.2,
    });
    scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.orchestraHit, finalResolutionStart, {
      gain: 0.155,
    });
    scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.metal, finalResolutionStart + 0.02, {
      gain: 0.095,
      pan: 0.18,
      playbackRate: 0.82,
    });
    createMetalHit(context, adpcmBus, sources, finalResolutionStart, 1.4, 0.011);
    createNoiseHit(context, adpcmBus, sources, noiseBuffer, finalResolutionStart, 0.72, 4300, 0.045);
    createNoiseHit(context, adpcmBus, sources, noiseBuffer, finalResolutionStart + 2.1, 2.4, 1200, 0.016);
  };

  // 5秒先までをAudioContextの絶対時刻へ予約する。通常のタイマーは
  // 予約を補充するだけにして、フレーズ境界そのものは音声クロックへ揃える。
  const phraseDuration = PHRASE_UNITS * SIXTEENTH;
  const scheduleAheadSeconds = 5;
  let nextPhrase = 0;
  let finalScheduled = false;
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
    if (!finalScheduled && finalStart <= horizon) {
      scheduleFinal();
      finalScheduled = true;
    }
    if (nextPhrase === 4 && finalScheduled && schedulerTimer !== null) {
      window.clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  };
  schedulePendingEvents();
  schedulerTimer = window.setInterval(schedulePendingEvents, 750);

  master.gain.setValueAtTime(0.53, finalResolutionStart + 2.5);
  master.gain.exponentialRampToValueAtTime(0.0001, finalStart + FINAL_TAIL_SECONDS);

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
