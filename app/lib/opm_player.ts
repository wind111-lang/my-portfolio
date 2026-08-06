import {
  createFmVoice,
  midiToFrequency,
  trackScheduledSource,
  type FmPatch,
} from "~/lib/fm_synth";

type NoteEvent = readonly [start: number, note: number, length: number];
type ChordEvent = readonly [start: number, length: number, notes: readonly number[]];
type ArrangementDensity = "intro" | "light" | "full";
type LeadVoicing = "soft" | "bright" | "reed" | "upper";

// 約75 BPMはハーフテンポ判定。原曲の拍感は約150 BPMで、
// BEATは譜面上の八分音符1つ分を表す。
const BPM = 150;
const BEAT = 60 / BPM / 2;
// 提供音源の伴奏・和音は6.4秒単位で切り替わり、12.8秒から
// 4音のピックアップ、13.6秒から主旋律が始まる。伴奏と主旋律の
// 起点を混ぜると全区間で0.8秒ずれるため、別の定数として扱う。
const FIRST_ARRANGEMENT_BEAT = 64;
const FIRST_THEME_BEAT = 68;
const FIRST_FULL_BEAT = 128;
const INTERLUDE_BEAT = 352;
const SECOND_FULL_BEAT = 416;
const OUTRO_BEAT = 640;
// 再提供されたX68版OGGは128.8秒からフェードし、約138秒で終わる。
const FADE_START_BEAT = OUTRO_BEAT;
const TRACK_BEATS = 690;
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

// 再提供されたOGGを帯域分離してMIDIイベント化すると、12.8秒から
// E5の4連打が入り、13.6秒から6.4秒単位のA-B-A-B-C-D-C-D-終止へ進む。
// [開始位置（八分音符単位）, MIDIノート, 長さ]
const pickupSequence: readonly NoteEvent[] = [
  [0, 76, 1], [1, 76, 1], [2, 76, 1], [3, 76, 1],
];

const themeASequence: readonly NoteEvent[] = [
  [0, 72, 4], [4, 74, 4], [8, 71, 4],
  [12, 72, 1], [13, 68, 1], [14, 69, 1], [15, 71, 1],
  [16, 72, 1], [17, 69, 1], [18, 71, 1], [19, 72, 1],
  [20, 74, 4], [24, 68, 4], [28, 76, 4],
];

const themeBSequence: readonly NoteEvent[] = [
  [0, 76, 1], [1, 69, 1], [2, 71, 1], [3, 72, 1],
  [4, 74, 6], [10, 72, 1], [11, 71, 1],
  [12, 69, 4], [16, 68, 4], [20, 69, 5],
  [25, 68, 1], [26, 69, 1], [27, 71, 1], [28, 76, 4],
];

// C/D部では低いトロイカ旋律の上に、右側へ定位した独立上声が重なる。
// OGG内の反復を差分解析し、FM倍音を別ノートと誤認したイベントを除外した。
// 同音が続く箇所も、原音のアタックに合わせて結合せず再発音させる。
const upperCSequence: readonly NoteEvent[] = [
  [0, 81, 2], [2, 80, 1], [3, 81, 1],
  [4, 83, 3], [7, 80, 1],
  [8, 76, 4], [12, 84, 2], [14, 81, 2],
  [20, 76, 8],
  [28, 81, 4],
];

const upperDSequence: readonly NoteEvent[] = [
  [0, 84, 1], [1, 83, 1], [2, 81, 1], [3, 76, 1],
  [4, 74, 3],
  [7, 77, 1], [8, 81, 2],
  [10, 83, 1], [11, 81, 1], [12, 76, 3], [15, 77, 1],
  [16, 76, 1], [17, 74, 1], [18, 71, 1], [19, 72, 1],
  [20, 69, 7], [27, 76, 1], [28, 81, 4],
];

// C部へ入る直前の0.8秒はA5のピックアップ。以前はC部の先頭へ
// 4連打として置いていたため、サビへ入る位置と発音の長さがずれていた。
const upperPickupSequence: readonly NoteEvent[] = [
  [0, 81, 4],
];

const closingSequence: readonly NoteEvent[] = [
  [0, 76, 1], [1, 69, 1], [2, 71, 1], [3, 72, 1],
  [4, 74, 6], [10, 72, 1], [11, 71, 1],
  [12, 69, 4], [16, 68, 4], [20, 69, 8], [28, 76, 4],
];

const upperClosingSequence: readonly NoteEvent[] = [
  [0, 84, 1], [1, 83, 1], [2, 81, 1], [3, 76, 1],
  [4, 74, 3], [7, 77, 1], [8, 81, 2], [10, 83, 1], [11, 81, 1],
  [12, 76, 3], [15, 77, 1], [16, 76, 1], [17, 74, 1],
  [18, 71, 1], [19, 72, 1], [20, 69, 8],
];

// 原曲で主旋律の隙間を埋める八分音符アルペジオ。
// A/C系とB/D系で異なるE4・F4の運指までMIDIイベントへ戻す。
const accompanimentA = [
  57, 64, 60, 64, 57, 64, 60, 64,
  56, 64, 62, 64, 56, 64, 62, 64,
  57, 64, 60, 64, 57, 65, 60, 65,
  56, 64, 62, 64, 56, 64, 62, 64,
] as const;

const accompanimentB = [
  57, 64, 60, 64, 57, 64, 60, 64,
  57, 65, 62, 65, 57, 65, 62, 65,
  57, 64, 60, 64, 56, 64, 62, 64,
  57, 64, 60, 64, 57, 64, 60, 64,
] as const;

const bassRootsA: readonly NoteEvent[] = [
  [0, 45, 8], [8, 40, 8], [16, 45, 4], [20, 41, 4], [24, 40, 8],
];

const bassRootsB: readonly NoteEvent[] = [
  [0, 45, 8], [8, 38, 8], [16, 45, 4], [20, 40, 4], [24, 45, 4], [28, 40, 4],
];

const AM_CHORD = [45, 48, 52] as const;
const E7_CHORD = [40, 44, 47, 50] as const;
const DM_CHORD = [38, 41, 45] as const;
const F_CHORD = [41, 45, 48] as const;

const chordEventsA: readonly ChordEvent[] = [
  [0, 8, AM_CHORD], [8, 8, E7_CHORD], [16, 4, AM_CHORD],
  [20, 4, F_CHORD], [24, 8, E7_CHORD],
] as const;

const chordEventsB: readonly ChordEvent[] = [
  [0, 8, AM_CHORD], [8, 8, DM_CHORD], [16, 4, AM_CHORD],
  [20, 4, E7_CHORD], [24, 4, AM_CHORD], [28, 4, E7_CHORD],
];

const melodyBlockSequences = {
  a: { body: themeASequence },
  b: { body: themeBSequence },
  c: { body: themeASequence, upper: upperCSequence },
  d: { body: themeBSequence, upper: upperDSequence },
  closing: { body: closingSequence, upper: upperClosingSequence },
} as const;

type MelodyBlockName = keyof typeof melodyBlockSequences;

const melodyBlockOrder: readonly MelodyBlockName[] = [
  "a", "b", "a", "b", "c", "d", "c", "d", "closing",
  "a", "b", "a", "b", "c", "d", "c", "d", "closing",
  "a", "b",
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
  if (beat < FIRST_ARRANGEMENT_BEAT) return "intro";
  if (beat < FIRST_FULL_BEAT) return "light";
  if (beat < INTERLUDE_BEAT) return "full";
  if (beat < SECOND_FULL_BEAT) return "light";
  if (beat < OUTRO_BEAT) return "full";
  return "light";
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
  const sources: AudioScheduledSourceNode[] = [];
  let disconnected = false;

  master.gain.setValueAtTime(0.6, startAt);
  compressor.threshold.setValueAtTime(-12, startAt);
  compressor.knee.setValueAtTime(18, startAt);
  compressor.ratio.setValueAtTime(2.2, startAt);
  compressor.attack.setValueAtTime(0.009, startAt);
  compressor.release.setValueAtTime(0.28, startAt);
  leadBus.gain.setValueAtTime(0.72, startAt);
  fmBus.gain.setValueAtTime(0.68, startAt);
  bassBus.gain.setValueAtTime(0.82, startAt);
  percussionBus.gain.setValueAtTime(0.2, startAt);
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

  const scheduleAccompaniment = (
    pitches: readonly number[],
    startBeat: number,
    includeBass: boolean,
    roots: readonly NoteEvent[],
    chords: readonly ChordEvent[],
  ) => {
    const density = getDensity(startBeat);
    pitches.forEach((midiNote, beatOffset) => {
      const noteStart = startAt + (startBeat + beatOffset) * BEAT;
      createFmVoice(
        context,
        fmBus,
        sources,
        midiToFrequency(midiNote),
        noteStart,
        0.82 * BEAT,
        beatOffset % 2 === 0 ? -0.52 : 0.52,
        arpeggioPatch,
        beatOffset % 2 === 0 ? -2.1 : 2.1,
      );

      if (density === "full" && beatOffset % 2 === 0) {
        createFmVoice(
          context,
          fmBus,
          sources,
          midiToFrequency(midiNote - 12),
          noteStart + 0.012,
          0.76 * BEAT,
          beatOffset % 4 === 0 ? 0.3 : -0.3,
          baritonePatch,
          beatOffset % 4 === 0 ? 1.4 : -1.4,
        );
      }
    });

    chords.forEach(([beatOffset, durationInBeats, notes], chordIndex) => {
      const chordStart = startAt + (startBeat + beatOffset) * BEAT;
      notes.forEach((midiNote, noteIndex) => {
        const pan = (noteIndex - (notes.length - 1) / 2) * 0.18;
        createFmVoice(
          context,
          fmBus,
          sources,
          midiToFrequency(midiNote),
          chordStart,
          durationInBeats * BEAT * 0.94,
          pan,
          stringPatch,
          noteIndex % 2 === 0 ? -1.8 : 1.8,
        );
        createFmVoice(
          context,
          fmBus,
          sources,
          midiToFrequency(midiNote + 12),
          chordStart + 0.018,
          durationInBeats * BEAT * 0.88,
          -pan,
          density === "full" ? brassPatch : accordionPatch,
          chordIndex % 2 === 0 ? 1.6 : -1.6,
        );
      });
    });

    if (!includeBass) return;
    roots.forEach(([beatOffset, midiNote, durationInBeats], index) => {
      const noteStart = startAt + (startBeat + beatOffset) * BEAT;
      createFmVoice(
        context,
        bassBus,
        sources,
        midiToFrequency(midiNote),
        noteStart,
        durationInBeats * BEAT * 0.9,
        index % 2 === 0 ? -0.08 : 0.08,
        bassPatch,
      );
      createFmVoice(
        context,
        fmBus,
        sources,
        midiToFrequency(midiNote + 12),
        noteStart,
        Math.min(1.3, durationInBeats * 0.38) * BEAT,
        index % 2 === 0 ? 0.1 : -0.1,
        bassAttackPatch,
      );
      if (density === "full") {
        createFmVoice(
          context,
          bassBus,
          sources,
          midiToFrequency(midiNote - 12),
          noteStart + 0.018,
          durationInBeats * BEAT * 0.94,
          index % 2 === 0 ? 0.04 : -0.04,
          subBassPatch,
        );
      }
    });
  };

  const scheduleLeadEvents = (
    sequence: readonly NoteEvent[],
    startBeat: number,
    voicing: LeadVoicing,
  ) => {
    sequence.forEach(([beatOffset, midiNote, durationInBeats], index) => {
      const noteStart = startAt + (startBeat + beatOffset) * BEAT;
      const noteDuration = durationInBeats * BEAT * (voicing === "upper" ? 0.92 : 1);
      const leadPan = voicing === "upper" ? 0.34 : index % 2 === 0 ? -0.2 : 0.14;
      const mainPatch = voicing === "soft"
        ? softLeadPatch
        : voicing === "bright"
          ? leadPatch
          : reedLeadPatch;
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

    });
  };

  const melodySections: Array<{
    startBeat: number;
    sequence: readonly NoteEvent[];
    voicing: LeadVoicing;
  }> = [];
  melodySections.push({
    startBeat: FIRST_THEME_BEAT - pickupSequence.length,
    sequence: pickupSequence,
    voicing: "soft",
  });
  const melodyBlockCount = melodyBlockOrder.length;
  for (let blockIndex = 0; blockIndex < melodyBlockCount; blockIndex += 1) {
    const startBeat = FIRST_THEME_BEAT + blockIndex * 32;
    const blockName = melodyBlockOrder[blockIndex % melodyBlockOrder.length];
    const block = melodyBlockSequences[blockName];
    const isTheme = blockName === "a" || blockName === "b";
    const previousBlockName = blockIndex > 0 ? melodyBlockOrder[blockIndex - 1] : null;
    if (blockName === "c" && previousBlockName !== "d") {
      melodySections.push({
        startBeat: startBeat - pickupSequence.length,
        sequence: upperPickupSequence,
        voicing: "upper",
      });
    }
    melodySections.push({
      startBeat,
      sequence: block.body,
      voicing: isTheme && getDensity(startBeat) === "light" ? "soft" : isTheme ? "bright" : "reed",
    });
    if ("upper" in block) {
      melodySections.push({ startBeat, sequence: block.upper, voicing: "upper" });
    }
  }

  const accompanimentSections: Array<{
    startBeat: number;
    pitches: readonly number[];
    includeBass: boolean;
    roots: readonly NoteEvent[];
    chords: readonly ChordEvent[];
  }> = [
    { startBeat: 0, pitches: accompanimentA, includeBass: false, roots: [], chords: [] },
    { startBeat: 32, pitches: accompanimentB, includeBass: false, roots: [], chords: [] },
  ];
  for (let blockIndex = 0; blockIndex < melodyBlockCount; blockIndex += 1) {
    const startBeat = FIRST_ARRANGEMENT_BEAT + blockIndex * 32;
    const blockName = melodyBlockOrder[blockIndex % melodyBlockOrder.length];
    const usesAForm = blockName === "a" || blockName === "c";
    accompanimentSections.push({
      startBeat,
      pitches: usesAForm ? accompanimentA : accompanimentB,
      includeBass: true,
      roots: usesAForm ? bassRootsA : bassRootsB,
      chords: usesAForm ? chordEventsA : chordEventsB,
    });
  }

  const schedulePercussionBlock = (blockStartBeat: number, blockIndex: number) => {
    for (let halfBeat = 0; halfBeat < 32; halfBeat += 1) {
      const beatPosition = halfBeat;
      const hitAt = startAt + (blockStartBeat + beatPosition) * BEAT;
      if (halfBeat % 8 === 0) {
        createKick(context, percussionBus, sources, hitAt, halfBeat === 0 ? 0.12 : 0.085);
      }
      if (halfBeat % 8 === 4) {
        createNoiseHit(context, percussionBus, sources, noiseBuffer, hitAt, 0.16, 1450, 0.044, "bandpass");
        createNoiseHit(context, percussionBus, sources, noiseBuffer, hitAt + 0.01, 0.1, 3700, 0.014, "bandpass");
        createTom(context, percussionBus, sources, hitAt, 178, 0.022);
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
          0.052 - index * 0.006,
        );
      });
    }
  };

  const percussionBlocks = [
    ...Array.from({ length: 7 }, (_, index) => FIRST_FULL_BEAT + index * 32),
    ...Array.from({ length: 7 }, (_, index) => SECOND_FULL_BEAT + index * 32),
  ];

  let nextAccompanimentSection = 0;
  let nextMelodySection = 0;
  let nextPercussionBlock = 0;
  let schedulerTimer: number | null = null;

  const schedulePendingEvents = () => {
    if (disconnected) return;
    const horizon = context.currentTime + SCHEDULE_AHEAD_SECONDS;

    while (
      nextAccompanimentSection < accompanimentSections.length
      && startAt + accompanimentSections[nextAccompanimentSection].startBeat * BEAT <= horizon
    ) {
      const section = accompanimentSections[nextAccompanimentSection];
      scheduleAccompaniment(
        section.pitches,
        section.startBeat,
        section.includeBass,
        section.roots,
        section.chords,
      );
      nextAccompanimentSection += 1;
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

    if (
      nextAccompanimentSection === accompanimentSections.length
      && nextMelodySection === melodySections.length
      && nextPercussionBlock === percussionBlocks.length
      && schedulerTimer !== null
    ) {
      window.clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  };

  schedulePendingEvents();
  schedulerTimer = window.setInterval(schedulePendingEvents, 750);

  const fadeStart = startAt + FADE_START_BEAT * BEAT;
  master.gain.setValueAtTime(0.6, fadeStart);
  master.gain.linearRampToValueAtTime(0.0001, startAt + TRACK_DURATION);

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
