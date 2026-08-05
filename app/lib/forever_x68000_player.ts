import { createFmVoice, midiToFrequency, type FmPatch } from "~/lib/fm_synth";

type NoteEvent = readonly [start: number, note: number, length: number];

const BPM = 132;
const SIXTEENTH = 60 / BPM / 4;
const FM_ENTRY_SECONDS = 1.855;
const PHRASE_UNITS = 128;
const TRACK_UNITS = PHRASE_UNITS * 4;
const FINAL_TAIL_SECONDS = 5.2;
const TRACK_DURATION = FM_ENTRY_SECONDS + TRACK_UNITS * SIXTEENTH + FINAL_TAIL_SECONDS;

const chordPatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 1, 2, 3],
  modulation: [1.42, 0.68, 0.32],
  attack: 0.009,
  decay: 0.21,
  peakGain: 0.034,
  sustainGain: 0.02,
  release: 0.2,
};

const bassPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2, 1, 3],
  modulation: [1.75, 0, 0.62],
  attack: 0.005,
  decay: 0.11,
  peakGain: 0.048,
  sustainGain: 0.021,
  release: 0.09,
};

const bassDoublePatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 1, 2, 4],
  modulation: [1.18, 0.46, 0.2],
  attack: 0.007,
  decay: 0.14,
  peakGain: 0.012,
  sustainGain: 0.005,
  release: 0.12,
};

const shimmerPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 2, 3, 5],
  modulation: [0.92, 0.44, 0.18],
  attack: 0.008,
  decay: 0.12,
  peakGain: 0.009,
  sustainGain: 0.0035,
  release: 0.16,
};

const finalPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 1, 2, 3],
  modulation: [1.12, 0.48, 0.2],
  attack: 0.012,
  decay: 0.4,
  peakGain: 0.035,
  sustainGain: 0.017,
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
  gain = 0.1,
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
  envelope.gain.setValueAtTime(gain, startAt);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.25);
  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.27);
  sources.push(oscillator);
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
  transpose = 0,
): void {
  sequence.forEach(([start, note, length]) => {
    for (let position = 0; position < length; position += 2) {
      createFmVoice(
        context,
        destination,
        sources,
        midiToFrequency(note + transpose),
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
  const noiseBuffer = createNoiseBuffer(context, 0.7);
  const sources: AudioScheduledSourceNode[] = [];
  let disconnected = false;

  master.gain.setValueAtTime(0.46, startAt);
  compressor.threshold.setValueAtTime(-18, startAt);
  compressor.knee.setValueAtTime(15, startAt);
  compressor.ratio.setValueAtTime(6, startAt);
  compressor.attack.setValueAtTime(0.004, startAt);
  compressor.release.setValueAtTime(0.18, startAt);
  fmBus.gain.setValueAtTime(0.84, startAt);
  adpcmBus.gain.setValueAtTime(0.34, startAt);
  quantizer.curve = createFourBitCurve();
  quantizer.oversample = "none";

  fmBus.connect(master);
  adpcmBus.connect(quantizer);
  quantizer.connect(master);
  master.connect(compressor);
  compressor.connect(context.destination);

  createAdpcmIntro(context, adpcmBus, sources, noiseBuffer, startAt);

  for (let phrase = 0; phrase < 4; phrase += 1) {
    const offset = phrase * PHRASE_UNITS;
    const transpose = phrase >= 2 ? 1 : 0;
    const chordPan = phrase % 2 === 0 ? -0.34 : 0.34;

    scheduleSequence(context, fmBus, sources, chordSequence, entryAt, offset, chordPan, chordPatch, transpose);
    schedulePulsedSequence(context, fmBus, sources, bassSequence, entryAt, offset, -0.18, bassPatch, transpose);
    schedulePulsedSequence(context, fmBus, sources, bassSequence, entryAt, offset, 0.42, bassDoublePatch, transpose + 12);

    if (phrase % 2 === 1) {
      const shortAccents = chordSequence.filter(([, , length]) => length <= 3);
      scheduleSequence(
        context,
        fmBus,
        sources,
        shortAccents,
        entryAt,
        offset + 1,
        -chordPan,
        shimmerPatch,
        transpose + 12,
      );
    }
  }

  for (let unit = 0; unit < TRACK_UNITS; unit += 2) {
    const hitAt = entryAt + unit * SIXTEENTH;
    if (unit % 8 === 0 || unit % 32 === 20) {
      createKick(context, adpcmBus, sources, hitAt, unit % PHRASE_UNITS === 0 ? 0.13 : 0.095);
    }
    if (unit % 8 === 4) {
      createNoiseHit(context, adpcmBus, sources, noiseBuffer, hitAt, 0.14, 1750, 0.052);
    }
    createNoiseHit(
      context,
      adpcmBus,
      sources,
      noiseBuffer,
      hitAt,
      unit % 16 === 14 ? 0.08 : 0.035,
      unit % 4 === 0 ? 7100 : 9300,
      unit % 16 === 14 ? 0.018 : 0.009,
      "highpass",
    );
  }

  const finalStart = entryAt + TRACK_UNITS * SIXTEENTH;
  [37, 49, 56, 61, 65].forEach((note, index) => {
    createFmVoice(
      context,
      fmBus,
      sources,
      midiToFrequency(note),
      finalStart,
      3.75,
      (index - 2) * 0.28,
      finalPatch,
    );
  });
  [0, 0.66, 1.34, 2.16].forEach((delay, index) => {
    createTom(context, adpcmBus, sources, finalStart + delay, 215 - index * 23, 0.075 - index * 0.008);
  });
  createNoiseHit(context, adpcmBus, sources, noiseBuffer, finalStart, 0.48, 4300, 0.065);
  createNoiseHit(context, adpcmBus, sources, noiseBuffer, finalStart + 2.1, 1.9, 1200, 0.028);
  master.gain.setValueAtTime(0.46, finalStart + 0.7);
  master.gain.exponentialRampToValueAtTime(0.0001, finalStart + FINAL_TAIL_SECONDS);

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
