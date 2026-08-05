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
  modulation: [1.18, 0.68, 0.32],
  operatorCount: 2,
  waveforms: ["sine", "sine", "sine", "sine"],
  filterFrequency: 6400,
  filterQ: 0.8,
  attack: 0.014,
  decay: 0.24,
  peakGain: 0.028,
  sustainGain: 0.016,
  release: 0.32,
};

const brassPatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 2, 2, 3],
  modulation: [0.72, 0.5, 0.2],
  operatorCount: 2,
  waveforms: ["triangle", "sine", "sine", "sine"],
  filterFrequency: 4200,
  filterQ: 1.1,
  attack: 0.045,
  decay: 0.28,
  peakGain: 0.022,
  sustainGain: 0.016,
  release: 0.42,
  vibratoRate: 5.1,
  vibratoCents: 2.5,
};

const bassPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2, 1, 3],
  modulation: [1.36, 0, 0.62],
  operatorCount: 2,
  waveforms: ["triangle", "sine", "sine", "sine"],
  filterFrequency: 2300,
  filterQ: 0.72,
  attack: 0.012,
  decay: 0.16,
  peakGain: 0.038,
  sustainGain: 0.018,
  release: 0.15,
};

const padPatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 1.01, 2, 4],
  modulation: [0.28, 0.2, 0.08],
  operatorCount: 2,
  waveforms: ["sine", "triangle", "sine", "sine"],
  filterFrequency: 3100,
  filterQ: 0.6,
  attack: 0.09,
  decay: 0.42,
  peakGain: 0.011,
  sustainGain: 0.008,
  release: 0.58,
};

const shimmerPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 2, 3, 5],
  modulation: [0.82, 0.36, 0.14],
  waveforms: ["sine", "sine", "triangle", "sine"],
  filterFrequency: 9200,
  filterQ: 1.2,
  attack: 0.006,
  decay: 0.18,
  peakGain: 0.0065,
  sustainGain: 0.002,
  release: 0.36,
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
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.004);
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
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.005);
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
  const fmBus = context.createGain();
  const adpcmBus = context.createGain();
  const adpcmDry = context.createGain();
  const adpcmCrushed = context.createGain();
  const toneFilter = context.createBiquadFilter();
  const quantizer = context.createWaveShaper();
  const softClip = context.createWaveShaper();
  const noiseBuffer = createNoiseBuffer(context, 0.7);
  const sources: AudioScheduledSourceNode[] = [];
  const scheduleTimers: number[] = [];
  let disconnected = false;

  master.gain.setValueAtTime(0.68, startAt);
  compressor.threshold.setValueAtTime(-16, startAt);
  compressor.knee.setValueAtTime(18, startAt);
  compressor.ratio.setValueAtTime(3.2, startAt);
  compressor.attack.setValueAtTime(0.012, startAt);
  compressor.release.setValueAtTime(0.26, startAt);
  fmBus.gain.setValueAtTime(0.78, startAt);
  adpcmBus.gain.setValueAtTime(0.3, startAt);
  adpcmDry.gain.setValueAtTime(0.78, startAt);
  adpcmCrushed.gain.setValueAtTime(0.12, startAt);
  toneFilter.type = "lowpass";
  toneFilter.frequency.setValueAtTime(11800, startAt);
  toneFilter.Q.setValueAtTime(0.72, startAt);
  quantizer.curve = createFourBitCurve();
  quantizer.oversample = "none";
  softClip.curve = createSoftClipCurve();
  softClip.oversample = "4x";

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

  const schedulePhrase = (phrase: number) => {
    if (disconnected) return;
    const offset = phrase * PHRASE_UNITS;
    const transpose = phrase >= 2 ? 1 : 0;
    const chordPan = phrase % 2 === 0 ? -0.34 : 0.34;
    const phrasePatch = phrase % 2 === 0 ? chordPatch : brassPatch;

    scheduleSequence(context, fmBus, sources, chordSequence, entryAt, offset, chordPan, phrasePatch, transpose);
    scheduleSequence(context, fmBus, sources, bassSequence, entryAt, offset, -0.58, padPatch, transpose + 24);
    scheduleSequence(context, fmBus, sources, bassSequence, entryAt, offset, 0.58, padPatch, transpose + 31);
    schedulePulsedSequence(context, fmBus, sources, bassSequence, entryAt, offset, 0, bassPatch, transpose);

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

    for (let phraseUnit = 0; phraseUnit < PHRASE_UNITS; phraseUnit += 2) {
      const unit = offset + phraseUnit;
      const hitAt = entryAt + unit * SIXTEENTH;
      if (phraseUnit % 8 === 0 || phraseUnit % 32 === 20) {
        createKick(context, adpcmBus, sources, hitAt, phraseUnit === 0 ? 0.105 : 0.075);
      }
      if (phraseUnit % 8 === 4) {
        createNoiseHit(context, adpcmBus, sources, noiseBuffer, hitAt, 0.17, 1750, 0.038);
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
    }
  };

  const finalStart = entryAt + TRACK_UNITS * SIXTEENTH;
  const scheduleFinal = () => {
    if (disconnected) return;
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
      createTom(context, adpcmBus, sources, finalStart + delay, 215 - index * 23, 0.055 - index * 0.006);
    });
    createNoiseHit(context, adpcmBus, sources, noiseBuffer, finalStart, 0.52, 4300, 0.045);
    createNoiseHit(context, adpcmBus, sources, noiseBuffer, finalStart + 2.1, 1.9, 1200, 0.018);
  };

  const scheduleAheadSeconds = 7;
  const phraseDuration = PHRASE_UNITS * SIXTEENTH;
  for (let phrase = 0; phrase < 4; phrase += 1) {
    const delaySeconds = FM_ENTRY_SECONDS + phrase * phraseDuration - scheduleAheadSeconds;
    if (delaySeconds <= 0) {
      schedulePhrase(phrase);
    } else {
      scheduleTimers.push(window.setTimeout(() => schedulePhrase(phrase), delaySeconds * 1000));
    }
  }
  scheduleTimers.push(window.setTimeout(
    scheduleFinal,
    (FM_ENTRY_SECONDS + TRACK_UNITS * SIXTEENTH - scheduleAheadSeconds) * 1000,
  ));

  master.gain.setValueAtTime(0.68, finalStart + 0.7);
  master.gain.exponentialRampToValueAtTime(0.0001, finalStart + FINAL_TAIL_SECONDS);

  const disconnectGraph = () => {
    if (disconnected) return;
    disconnected = true;
    fmBus.disconnect();
    adpcmBus.disconnect();
    adpcmDry.disconnect();
    adpcmCrushed.disconnect();
    toneFilter.disconnect();
    quantizer.disconnect();
    softClip.disconnect();
    master.disconnect();
    compressor.disconnect();
  };
  const cleanupTimer = window.setTimeout(disconnectGraph, (TRACK_DURATION + 0.2) * 1000);

  return () => {
    window.clearTimeout(cleanupTimer);
    scheduleTimers.forEach((timer) => window.clearTimeout(timer));
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
