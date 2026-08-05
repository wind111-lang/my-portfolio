import { createFmVoice, midiToFrequency, type FmPatch } from "~/lib/fm_synth";

type NoteEvent = readonly [start: number, note: number, length: number];

const BPM = 132;
const SIXTEENTH = 60 / BPM / 4;
const FM_ENTRY_SECONDS = 1.855;
const PHRASE_UNITS = 128;
const TRACK_UNITS = PHRASE_UNITS * 2;
const FINAL_CHORD_UNITS = 14;
const TRACK_DURATION = FM_ENTRY_SECONDS + (TRACK_UNITS + FINAL_CHORD_UNITS) * SIXTEENTH + 1.5;

const chordPatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 1, 2, 3],
  modulation: [1.5, 0.72, 0.35],
  attack: 0.015,
  decay: 0.22,
  peakGain: 0.043,
  sustainGain: 0.022,
  release: 0.22,
};

const bassPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2, 1, 3],
  modulation: [1.8, 0, 0.68],
  attack: 0.006,
  decay: 0.12,
  peakGain: 0.052,
  sustainGain: 0.025,
  release: 0.1,
};

const bassDoublePatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 1, 2, 4],
  modulation: [1.25, 0.5, 0.22],
  attack: 0.008,
  decay: 0.15,
  peakGain: 0.018,
  sustainGain: 0.008,
  release: 0.13,
};

const counterPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2, 1, 4],
  modulation: [1.4, 0, 0.92],
  attack: 0.009,
  decay: 0.13,
  peakGain: 0.024,
  sustainGain: 0.011,
  release: 0.16,
};

const harmonyPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 2, 3, 5],
  modulation: [0.95, 0.48, 0.2],
  attack: 0.012,
  decay: 0.17,
  peakGain: 0.018,
  sustainGain: 0.008,
  release: 0.19,
};

const leadPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 1, 2, 4],
  modulation: [1.35, 0.62, 0.25],
  attack: 0.008,
  decay: 0.16,
  peakGain: 0.038,
  sustainGain: 0.02,
  release: 0.2,
  vibratoRate: 5.25,
  vibratoCents: 4,
};

const leadEchoPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 1, 2, 4],
  modulation: [1.05, 0.46, 0.18],
  attack: 0.011,
  decay: 0.17,
  peakGain: 0.012,
  sustainGain: 0.0055,
  release: 0.22,
  vibratoRate: 5.1,
  vibratoCents: 3,
};

const finalPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 1, 2, 3],
  modulation: [1.15, 0.5, 0.2],
  attack: 0.018,
  decay: 0.34,
  peakGain: 0.034,
  sustainGain: 0.019,
  release: 1.05,
  vibratoRate: 4.9,
  vibratoCents: 3,
};

// YM2151のキーコードを、132 BPMの16分音符グリッドへ採譜したもの。
// [開始位置, MIDIノート, 長さ]
const chordSequence: readonly NoteEvent[] = [
  [0, 49, 16], [16, 47, 16], [32, 45, 8], [40, 47, 8], [48, 40, 16],
  [64, 51, 8], [72, 48, 8], [80, 49, 4], [84, 47, 4], [88, 46, 8],
  [96, 45, 16], [112, 42, 8], [120, 44, 8],
];

const bassSequence: readonly NoteEvent[] = [
  [0, 37, 16], [16, 35, 16], [32, 33, 8], [40, 35, 8], [48, 40, 16],
  [64, 39, 8], [72, 36, 8], [80, 37, 4], [84, 35, 4], [88, 34, 8],
  [96, 33, 16], [112, 30, 8], [120, 32, 8],
];

const counterSequence: readonly NoteEvent[] = [
  [1, 64, 3], [4, 63, 3], [7, 64, 3], [10, 63, 3], [13, 64, 2], [15, 63, 2],
  [17, 64, 3], [20, 63, 3], [23, 64, 3], [26, 63, 3], [29, 64, 2], [31, 63, 2],
  [33, 64, 3], [36, 63, 3], [39, 61, 2], [41, 63, 3], [44, 64, 3], [47, 66, 2],
  [49, 68, 16], [65, 66, 3], [68, 66, 3], [71, 66, 2], [74, 68, 3], [77, 68, 4],
  [81, 66, 3], [84, 64, 3], [87, 63, 2], [89, 64, 8], [97, 66, 3], [100, 64, 3],
  [103, 63, 2], [105, 64, 8], [113, 66, 3], [116, 66, 3], [119, 66, 2],
  [122, 68, 3], [125, 68, 4],
];

const harmonySequence: readonly NoteEvent[] = [
  [1, 61, 3], [4, 61, 3], [7, 61, 3], [10, 61, 3], [13, 61, 2], [15, 61, 2],
  [17, 61, 3], [20, 61, 3], [23, 61, 3], [26, 61, 3], [29, 61, 2], [31, 61, 2],
  [33, 61, 3], [36, 59, 3], [39, 57, 2], [41, 59, 3], [44, 61, 3], [47, 63, 2],
  [49, 64, 16], [65, 63, 3], [68, 63, 3], [71, 63, 2], [74, 63, 3], [77, 63, 4],
  [81, 63, 3], [84, 61, 3], [87, 60, 2], [89, 61, 8], [97, 63, 3], [100, 61, 3],
  [103, 60, 2], [105, 61, 8], [113, 61, 3], [116, 61, 3], [119, 61, 2],
  [122, 63, 3], [125, 63, 4],
];

const leadSequence: readonly NoteEvent[] = [
  [0, 61, 3], [3, 63, 3], [6, 64, 3], [9, 66, 3], [12, 68, 4],
  [16, 64, 3], [19, 66, 3], [22, 68, 3], [25, 69, 3], [28, 71, 4],
  [32, 69, 3], [35, 71, 3], [38, 69, 2], [40, 68, 3], [43, 66, 3], [46, 69, 2],
  [48, 68, 16], [64, 66, 3], [67, 66, 3], [70, 66, 2], [72, 68, 4], [76, 66, 4],
  [80, 66, 3], [83, 64, 3], [86, 63, 2], [88, 64, 8], [96, 66, 3], [99, 64, 3],
  [102, 63, 2], [104, 64, 4], [108, 64, 4], [112, 66, 3], [115, 66, 3],
  [118, 66, 2], [120, 68, 8],
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
  gain = 0.11,
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(145, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(42, startAt + 0.14);
  envelope.gain.setValueAtTime(gain, startAt);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.18);
  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.2);
  sources.push(oscillator);
}

function createAdpcmIntro(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  noiseBuffer: AudioBuffer,
  startAt: number,
): void {
  const introNotes = [49, 56, 61, 64, 68] as const;
  introNotes.forEach((note, index) => {
    const noteStart = startAt + index * 0.31;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = index % 2 === 0 ? "square" : "sawtooth";
    oscillator.frequency.setValueAtTime(midiToFrequency(note), noteStart);
    oscillator.detune.setValueAtTime(index % 2 === 0 ? -7 : 6, noteStart);
    envelope.gain.setValueAtTime(0.0001, noteStart);
    envelope.gain.exponentialRampToValueAtTime(0.035, noteStart + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.25);
    oscillator.connect(envelope);
    envelope.connect(destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + 0.27);
    sources.push(oscillator);
    createNoiseHit(context, destination, sources, noiseBuffer, noteStart, 0.12, 1800 + index * 650, 0.025);
  });
  createNoiseHit(context, destination, sources, noiseBuffer, startAt + 1.54, 0.28, 6200, 0.035, "highpass");
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
): void {
  sequence.forEach(([start, note, length]) => {
    createFmVoice(
      context,
      destination,
      sources,
      midiToFrequency(note),
      entryAt + (offset + start) * SIXTEENTH,
      length * SIXTEENTH * 0.94,
      pan,
      patch,
    );
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
): void {
  sequence.forEach(([start, note, length]) => {
    for (let position = 0; position < length; position += 2) {
      createFmVoice(
        context,
        destination,
        sources,
        midiToFrequency(note),
        entryAt + (offset + start + position) * SIXTEENTH,
        1.72 * SIXTEENTH,
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

export function playForeverX68000Track(context: AudioContext): () => void {
  const startAt = context.currentTime + 0.04;
  const entryAt = startAt + FM_ENTRY_SECONDS;
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const fmBus = context.createGain();
  const adpcmBus = context.createGain();
  const quantizer = context.createWaveShaper();
  const noiseBuffer = createNoiseBuffer(context, 0.5);
  const sources: AudioScheduledSourceNode[] = [];
  let disconnected = false;

  master.gain.setValueAtTime(0.48, startAt);
  compressor.threshold.setValueAtTime(-18, startAt);
  compressor.knee.setValueAtTime(15, startAt);
  compressor.ratio.setValueAtTime(6, startAt);
  compressor.attack.setValueAtTime(0.004, startAt);
  compressor.release.setValueAtTime(0.18, startAt);
  fmBus.gain.setValueAtTime(0.82, startAt);
  adpcmBus.gain.setValueAtTime(0.36, startAt);
  quantizer.curve = createFourBitCurve();
  quantizer.oversample = "none";

  fmBus.connect(master);
  adpcmBus.connect(quantizer);
  quantizer.connect(master);
  master.connect(compressor);
  compressor.connect(context.destination);

  createAdpcmIntro(context, adpcmBus, sources, noiseBuffer, startAt);

  scheduleSequence(context, fmBus, sources, chordSequence, entryAt, 0, -0.2, chordPatch);
  scheduleSequence(context, fmBus, sources, bassSequence, entryAt, 0, -0.48, bassPatch);
  scheduleSequence(context, fmBus, sources, bassSequence, entryAt, 0, 0.5, bassDoublePatch);

  schedulePulsedSequence(context, fmBus, sources, chordSequence, entryAt, PHRASE_UNITS, -0.2, chordPatch);
  schedulePulsedSequence(context, fmBus, sources, bassSequence, entryAt, PHRASE_UNITS, -0.48, bassPatch);
  schedulePulsedSequence(context, fmBus, sources, bassSequence, entryAt, PHRASE_UNITS, 0.5, bassDoublePatch);

  [0, PHRASE_UNITS].forEach((offset) => {
    scheduleSequence(context, fmBus, sources, counterSequence, entryAt, offset, -0.34, counterPatch);
    scheduleSequence(context, fmBus, sources, harmonySequence, entryAt, offset, 0.34, harmonyPatch);
    scheduleSequence(context, fmBus, sources, leadSequence, entryAt, offset, 0, leadPatch);
    scheduleSequence(context, fmBus, sources, leadSequence, entryAt, offset + 2, -0.68, leadEchoPatch);
    scheduleSequence(context, fmBus, sources, leadSequence, entryAt, offset + 4, 0.68, leadEchoPatch);
  });

  for (let unit = PHRASE_UNITS; unit < TRACK_UNITS; unit += 2) {
    const hitAt = entryAt + unit * SIXTEENTH;
    if (unit % 8 === 0) createKick(context, adpcmBus, sources, hitAt);
    if (unit % 8 === 4) createNoiseHit(context, adpcmBus, sources, noiseBuffer, hitAt, 0.13, 1700, 0.052);
    createNoiseHit(
      context,
      adpcmBus,
      sources,
      noiseBuffer,
      hitAt,
      0.035,
      unit % 4 === 0 ? 7200 : 9200,
      0.012,
      "highpass",
    );
  }

  const finalStart = entryAt + TRACK_UNITS * SIXTEENTH;
  [37, 49, 56, 61, 64, 68].forEach((note, index) => {
    createFmVoice(
      context,
      fmBus,
      sources,
      midiToFrequency(note),
      finalStart,
      FINAL_CHORD_UNITS * SIXTEENTH,
      (index - 2.5) * 0.22,
      finalPatch,
    );
  });
  createKick(context, adpcmBus, sources, finalStart, 0.14);
  createNoiseHit(context, adpcmBus, sources, noiseBuffer, finalStart, 0.38, 4400, 0.06);
  master.gain.setValueAtTime(0.48, finalStart + 0.3);
  master.gain.exponentialRampToValueAtTime(0.0001, finalStart + FINAL_CHORD_UNITS * SIXTEENTH + 1.05);

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
