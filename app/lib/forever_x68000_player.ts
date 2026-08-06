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
const OUTPUT_GAIN = 0.8;
// 参照MP3は本編終了後も約5.35秒かけて自然に減衰する。
const RELEASE_TAIL_SECONDS = 5.35;
const TRACK_DURATION = FM_ENTRY_SECONDS + TRACK_UNITS * SIXTEENTH + RELEASE_TAIL_SECONDS;

const chordPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2.002, 1.003, 3.01],
  modulation: [0.96, 0, 0.52],
  waveforms: ["triangle", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.7, 0.8, 2.1, -0.6],
  carrierGains: [1, 0, 0.56, 0],
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
  carrierGains: [1, 0, 0.5, 0],
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
  carrierGains: [1, 0, 0.42, 0],
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
  carrierGains: [1, 0.3, 0.12, 0],
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

const leadEdgePatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 2.003, 3.01, 4.01],
  modulation: [0.62, 0.22, 0.07],
  waveforms: ["triangle", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.4, 1.2, -0.8, 1.8],
  carrierGains: [1, 0.34, 0.13, 0],
  filterFrequency: 9200,
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
  ratios: [1, 3.01, 2.002, 6.02],
  modulation: [0.6, 0, 0.24],
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.2, 0.7, 1.2, -0.7],
  carrierGains: [1, 0, 0.36, 0],
  filterFrequency: 8200,
  filterStartFrequency: 4600,
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
  ratios: [1, 2.002, 3.003, 4.008],
  modulation: [0.28, 0.12, 0.05],
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [-2.4, -0.8, 2.4, 0.8],
  carrierGains: [1, 0.3, 0.11, 0],
  filterFrequency: 6200,
  filterStartFrequency: 3200,
  filterAttack: 0.28,
  filterQ: 0.48,
  attack: 0.16,
  decay: 0.58,
  peakGain: 0.0046,
  sustainGain: 0.0035,
  release: 1.55,
  vibratoRate: 4.1,
  vibratoCents: 1.6,
};

// side成分の基音を短い解析窓で132 BPMの16分音符中央へ再量子化した主旋律。
// 長い解析窓で均されていた短い経過音を戻し、高域に並ぶFM倍音は別MIDI
// ノートとして重ねない。
// [開始位置（16分音符）, MIDIノート, 長さ（16分音符）]
const transcribedLeadSequence: readonly NoteEvent[] = [
  [0, 64, 31], [31, 66, 1], [32, 67, 4], [36, 62, 3],
  [39, 60, 2], [41, 62, 2], [43, 64, 3], [46, 69, 3],
  [49, 71, 15], [64, 69, 9], [73, 71, 7], [80, 69, 3],
  [83, 67, 4], [87, 66, 2], [89, 67, 7], [96, 69, 3],
  [99, 67, 4], [103, 66, 2], [105, 67, 7], [112, 69, 9],
  [121, 71, 7], [128, 64, 4], [132, 66, 3], [135, 67, 2],
  [137, 66, 4], [141, 64, 20], [161, 67, 3], [164, 66, 3],
  [167, 64, 2], [169, 62, 2], [171, 64, 3], [174, 69, 3],
  [177, 71, 15], [192, 69, 9], [201, 71, 7], [208, 66, 2],
  [210, 69, 2], [212, 64, 3], [215, 66, 2], [217, 64, 3],
  [220, 67, 4], [224, 69, 4], [228, 67, 3], [231, 66, 2],
  [233, 64, 3], [236, 67, 4], [240, 69, 9], [249, 71, 5],
  [254, 66, 2], [256, 65, 4], [260, 67, 2], [262, 65, 2],
  [264, 68, 2], [266, 65, 6], [272, 67, 1], [273, 68, 3],
  [276, 65, 8], [284, 67, 1], [285, 68, 2], [287, 67, 2],
  [289, 68, 3], [292, 67, 3], [295, 65, 2], [297, 67, 2],
  [299, 68, 4], [303, 67, 2], [305, 68, 4], [309, 72, 4],
  [313, 68, 4], [317, 72, 3], [320, 70, 9], [329, 72, 7],
  [336, 67, 4], [340, 68, 3], [343, 67, 2], [345, 68, 8],
  [353, 67, 3], [356, 68, 3], [359, 67, 2], [361, 65, 7],
  [368, 67, 8], [376, 65, 5], [381, 63, 4], [385, 65, 2],
  [387, 67, 3], [390, 68, 3], [393, 67, 3], [396, 68, 7],
  [403, 67, 3], [406, 68, 3], [409, 70, 3], [412, 72, 4],
  [416, 68, 4], [420, 67, 3], [423, 65, 2], [425, 67, 2],
  [427, 68, 4], [431, 67, 2], [433, 68, 4], [437, 72, 4],
  [441, 68, 4], [445, 72, 3], [448, 70, 9], [457, 72, 8],
  [465, 70, 1], [466, 67, 2], [468, 68, 3], [471, 67, 2],
  [473, 68, 8], [481, 67, 3], [484, 68, 3], [487, 67, 2],
  [489, 65, 8], [497, 63, 8], [505, 65, 4], [509, 63, 3],
];

const leadSequences: readonly (readonly NoteEvent[])[] = Array.from(
  { length: 4 },
  (_, phrase) => {
    const phraseStart = phrase * PHRASE_UNITS;
    const phraseEnd = phraseStart + PHRASE_UNITS;
    return transcribedLeadSequence.flatMap(([start, note, length]) => {
      const clippedStart = Math.max(start, phraseStart);
      const clippedEnd = Math.min(start + length, phraseEnd);
      return clippedStart < clippedEnd
        ? [[clippedStart - phraseStart, note, clippedEnd - clippedStart] as const]
        : [];
    });
  },
);

const bassSequence: readonly NoteEvent[] = [
  [0, 40, 16], [16, 38, 16], [32, 36, 8], [40, 38, 8], [48, 43, 16],
  [64, 42, 8], [72, 39, 8], [80, 40, 4], [84, 38, 4], [88, 37, 8],
  [96, 36, 16], [112, 33, 8], [120, 35, 8],
];

// 5 kHz以上で独立したアタックを確認できた位置だけをMSM6258へ渡す。
// FM倍音の連続線はMIDIノート化せず、短いベル状サンプルだけに限定する。
const adpcmChimeSequences: readonly (readonly NoteEvent[])[] = [
  [],
  [],
  [
    [7, 92, 1], [10, 94, 1], [17, 89, 1], [21, 94, 1],
    [65, 94, 1], [67, 94, 1], [69, 94, 1], [81, 94, 2],
    [89, 89, 3], [96, 94, 3], [104, 89, 1], [107, 89, 2],
    [113, 91, 1], [120, 89, 2],
  ],
  [
    [0, 89, 2], [7, 92, 1], [17, 92, 2], [21, 94, 1], [29, 99, 2],
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

// 和音の全構成音を重ねず、mid成分で最も連続していた上側の内声だけを採用する。
// これで主旋律と倍音を圧迫せず、OPM 8ch相当の同時発音数へ収める。
const innerVoiceSequence: readonly NoteEvent[] = [
  [0, 59, 16], [16, 57, 16], [32, 55, 16], [48, 62, 16],
  [64, 61, 8], [72, 54, 8], [80, 59, 8], [88, 55, 8],
  [96, 55, 16], [112, 52, 8], [120, 54, 8],
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
        gain: targetNote >= 92 ? 0.055 : 0.045,
        pan: index % 2 === 0 ? -0.3 : 0.3,
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
  const fmBus = context.createGain();
  const adpcmBus = context.createGain();
  const adpcmHighBus = context.createGain();
  const adpcmDry = context.createGain();
  const adpcmCrushed = context.createGain();
  const toneFilter = context.createBiquadFilter();
  const presenceFilter = context.createBiquadFilter();
  const adpcmHighPass = context.createBiquadFilter();
  const adpcmHighShelf = context.createBiquadFilter();
  const quantizer = context.createWaveShaper();
  const softClip = context.createWaveShaper();
  const noiseBuffer = createNoiseBuffer(context, 0.7);
  const adpcmSamples = createAdpcmSampleBank(context);
  const sources: AudioScheduledSourceNode[] = [];
  let disconnected = false;

  master.gain.setValueAtTime(OUTPUT_GAIN, startAt);
  compressor.threshold.setValueAtTime(-12, startAt);
  compressor.knee.setValueAtTime(18, startAt);
  compressor.ratio.setValueAtTime(2.2, startAt);
  compressor.attack.setValueAtTime(0.012, startAt);
  compressor.release.setValueAtTime(0.24, startAt);
  leadBus.gain.setValueAtTime(0.76, startAt);
  fmBus.gain.setValueAtTime(0.58, startAt);
  adpcmBus.gain.setValueAtTime(0.3, startAt);
  adpcmHighBus.gain.setValueAtTime(0.38, startAt);
  adpcmDry.gain.setValueAtTime(0.82, startAt);
  adpcmCrushed.gain.setValueAtTime(0.07, startAt);
  toneFilter.type = "lowpass";
  toneFilter.frequency.setValueAtTime(10800, startAt);
  toneFilter.Q.setValueAtTime(0.72, startAt);
  presenceFilter.type = "peaking";
  presenceFilter.frequency.setValueAtTime(2700, startAt);
  presenceFilter.Q.setValueAtTime(0.84, startAt);
  presenceFilter.gain.setValueAtTime(2.4, startAt);
  adpcmHighPass.type = "highpass";
  adpcmHighPass.frequency.setValueAtTime(1850, startAt);
  adpcmHighPass.Q.setValueAtTime(0.62, startAt);
  adpcmHighShelf.type = "highshelf";
  adpcmHighShelf.frequency.setValueAtTime(4700, startAt);
  adpcmHighShelf.gain.setValueAtTime(3.8, startAt);
  quantizer.curve = createFourBitCurve();
  quantizer.oversample = "none";
  softClip.curve = createSoftClipCurve();
  softClip.oversample = "2x";

  leadBus.connect(presenceFilter);
  presenceFilter.connect(softClip);
  fmBus.connect(toneFilter);
  toneFilter.connect(softClip);
  adpcmBus.connect(adpcmDry);
  adpcmDry.connect(softClip);
  adpcmBus.connect(quantizer);
  quantizer.connect(adpcmCrushed);
  adpcmCrushed.connect(softClip);
  // 高音サンプルをドラム用の小さいADPCMバスから分離し、強くなった
  // FM高音へ埋もれない帯域と音量でミックスする。
  adpcmHighBus.connect(adpcmHighPass);
  adpcmHighPass.connect(adpcmHighShelf);
  adpcmHighShelf.connect(softClip);
  softClip.connect(compressor);
  compressor.connect(master);
  master.connect(context.destination);

  // 冒頭1.85秒のonsetを50 ms単位で再解析した位置へ分散する。
  // 複数サンプルを0秒へ同時投入していたノイズ状のピークを作らない。
  const introTomHits = [
    [0.15, 1.08], [0.5, 0.98], [0.7, 0.86], [1.05, 1.16], [1.4, 0.76],
  ] as const;
  introTomHits.forEach(([offset, playbackRate], index) => {
    scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.tom, startAt + offset, {
      gain: 0.055 + index * 0.005,
      pan: (index - 2) * 0.18,
      playbackRate,
    });
  });
  scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.orchestraHit, startAt + 0.04, {
    gain: 0.052,
    pan: -0.16,
  });
  scheduleAdpcmSample(context, adpcmBus, sources, adpcmSamples.snare, startAt + 0.05, {
    gain: 0.105,
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
    const leadSequence = leadSequences[phrase];

    scheduleSequence(context, leadBus, sources, leadSequence, entryAt, offset, chordPan, phrasePatch);
    scheduleSequence(context, fmBus, sources, innerVoiceSequence, entryAt, offset, -0.12, harmonyPatch, transpose);
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
      -0.28,
      padPatch,
      transpose + 24,
    );
    schedulePulsedSequence(context, fmBus, sources, bassSequence, entryAt, offset, 0, bassPatch, transpose);
    scheduleArpeggio(context, fmBus, sources, bassSequence, entryAt, offset, transpose);

    // 基音とは別の高音MIDIを作らず、長音の一部だけへ明るいFM倍音を加える。
    const leadHighlights = leadSequence.filter(([start, , length]) => length >= 8 || start % 32 === 0);
    scheduleSequence(
      context,
      leadBus,
      sources,
      leadHighlights,
      entryAt,
      offset + 0.03,
      -chordPan * 0.4,
      leadEdgePatch,
      0,
      -fineTune * 0.35,
    );

    if (phrase >= 2) {
      schedulePulsedSequence(
        context,
        fmBus,
        sources,
        innerVoiceSequence,
        entryAt,
        offset + 1,
        0.24,
        electricPianoPatch,
        transpose + 12,
        16,
      );
    }

    const chimeSequence = adpcmChimeSequences[phrase];
    schedulePitchedAdpcmSequence(
      context,
      adpcmHighBus,
      sources,
      adpcmSamples.highChime,
      chimeSequence,
      entryAt,
      offset,
      0,
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
  master.gain.setValueAtTime(OUTPUT_GAIN, finalStart);
  master.gain.exponentialRampToValueAtTime(0.0001, finalStart + RELEASE_TAIL_SECONDS);

  const disconnectGraph = () => {
    if (disconnected) return;
    disconnected = true;
    leadBus.disconnect();
    fmBus.disconnect();
    adpcmBus.disconnect();
    adpcmHighBus.disconnect();
    adpcmDry.disconnect();
    adpcmCrushed.disconnect();
    toneFilter.disconnect();
    presenceFilter.disconnect();
    adpcmHighPass.disconnect();
    adpcmHighShelf.disconnect();
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
