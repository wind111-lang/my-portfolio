import { createLimitedOutput } from "~/lib/audio_output";
import { createFmVoice, midiToFrequency, trackScheduledSource } from "~/lib/fm_synth";

type NoteEvent = readonly [note: number, offset: number, duration: number, velocity: number];
type StepNoteEvent = readonly [note: number, step: number, durationSteps: number, velocity: number];

const BONUS_LOOP_SECONDS = 12.597415;
const BONUS_LOOP_STEPS = 64;
const BONUS_STEP_SECONDS = BONUS_LOOP_SECONDS / BONUS_LOOP_STEPS;
const BONUS_LOOP_COUNT = 2;
const BONUS_START_SECONDS = 3.3;
const TOTAL_DURATION_SECONDS = BONUS_START_SECONDS + BONUS_LOOP_SECONDS * BONUS_LOOP_COUNT + 0.24;

// Thunder V uses a YM2413 (OPLL). These two-operator patches deliberately keep
// the channels mono and use short, stepped envelopes instead of the wider OPM
// character used by the X68000 tracks elsewhere on the site.
const fanfareSustainPatch = {
  algorithm: 4,
  operatorCount: 2,
  ratios: [1, 1, 1, 1],
  modulation: [1.34, 0, 0],
  carrierGains: [0.7, 0, 0, 0],
  operatorDetuneCents: [0, 0, 0, 0],
  filterFrequency: 8200,
  filterStartFrequency: 4300,
  filterAttack: 0.026,
  filterQ: 0.5,
  pitchAttackCents: 8,
  pitchAttackTime: 0.012,
  attack: 0.002,
  decay: 0.12,
  peakGain: 0.054,
  sustainGain: 0.036,
  release: 0.13,
  vibratoRate: 6.4,
  vibratoCents: 3.5,
} as const;

const fanfareHitPatch = {
  ...fanfareSustainPatch,
  modulation: [1.72, 0, 0],
  filterFrequency: 9400,
  filterStartFrequency: 5600,
  filterAttack: 0.007,
  pitchAttackCents: 5,
  pitchAttackTime: 0.006,
  attack: 0.001,
  decay: 0.046,
  peakGain: 0.061,
  sustainGain: 0.022,
  release: 0.038,
  vibratoRate: 0,
  vibratoCents: 0,
} as const;

const fanfareBassPatch = {
  ...fanfareHitPatch,
  modulation: [0.48, 0, 0],
  carrierGains: [0.78, 0, 0, 0],
  filterFrequency: 4800,
  filterStartFrequency: 2100,
  peakGain: 0.068,
  sustainGain: 0.034,
  release: 0.06,
} as const;

const bonusLeadPatch = {
  ...fanfareSustainPatch,
  modulation: [1.56, 0, 0],
  filterFrequency: 9000,
  filterStartFrequency: 4800,
  filterAttack: 0.015,
  decay: 0.09,
  peakGain: 0.047,
  sustainGain: 0.027,
  release: 0.075,
  vibratoRate: 6.4,
  vibratoCents: 2.5,
} as const;

const bonusPadPatch = {
  ...fanfareSustainPatch,
  modulation: [0.68, 0, 0],
  filterFrequency: 6500,
  filterStartFrequency: 2700,
  filterAttack: 0.08,
  attack: 0.012,
  decay: 0.19,
  peakGain: 0.021,
  sustainGain: 0.013,
  release: 0.12,
  vibratoRate: 0,
  vibratoCents: 0,
} as const;

const bonusPulsePatch = {
  ...fanfareHitPatch,
  ratios: [1, 2, 1, 1],
  modulation: [0.82, 0, 0],
  filterFrequency: 7600,
  filterStartFrequency: 3900,
  peakGain: 0.019,
  sustainGain: 0.006,
  release: 0.025,
} as const;

const bonusBassPatch = {
  ...fanfareBassPatch,
  modulation: [0.36, 0, 0],
  filterFrequency: 3900,
  filterStartFrequency: 1500,
  attack: 0.001,
  decay: 0.055,
  peakGain: 0.051,
  sustainGain: 0.022,
  release: 0.035,
} as const;

const bonusKickPatch = {
  ...bonusBassPatch,
  ratios: [1, 1, 1, 1],
  modulation: [0.24, 0, 0],
  filterFrequency: 2300,
  filterStartFrequency: 1100,
  pitchAttackCents: 920,
  pitchAttackTime: 0.045,
  decay: 0.065,
  peakGain: 0.058,
  sustainGain: 0.001,
  release: 0.02,
} as const;

const vFanfareNotes: readonly NoteEvent[] = [
  [44, 0, 0.1281, 78], [75, 0.0937, 0.1625, 66], [72, 0.1052, 0.0927, 73],
  [44, 0.1281, 0.1156, 89], [72, 0.1979, 0.1969, 72], [56, 0.2322, 0.151, 54],
  [44, 0.2437, 0.1854, 85], [75, 0.2562, 0.3365, 59], [79, 0.2562, 0.0698, 43],
  [60, 0.3375, 0.0927, 45], [56, 0.3947, 0.1625, 64], [72, 0.3947, 0.1969, 75],
  [44, 0.4302, 0.0927, 93], [44, 0.5229, 0.1156, 83], [56, 0.5927, 0.1406, 48],
  [72, 0.5927, 0.1875, 72], [75, 0.5927, 0.175, 68], [44, 0.6385, 0.1406, 81],
  [46, 0.7791, 0.1281, 40], [58, 0.7791, 0.2094, 36], [77, 0.7791, 0.1281, 63],
  [74, 0.7916, 0.2781, 60], [46, 0.9073, 0.1281, 37], [77, 0.9073, 0.1625, 63],
  [47, 1.0812, 0.0812, 66], [75, 1.0812, 0.1854, 62], [79, 1.0812, 0.3479, 52],
  [47, 1.1625, 0.1156, 67], [60, 1.1739, 0.0813, 40], [47, 1.2791, 0.0813, 66],
  [77, 1.2791, 0.1969, 38], [47, 1.3604, 0.1854, 43], [75, 1.3833, 0.0927, 59],
  [79, 1.4302, 0.151, 30], [77, 1.476, 0.1042, 61],
  [48, 1.5802, 1.4646, 91], [60, 1.5802, 0.6042, 46], [79, 1.5802, 1.1031, 94],
  [84, 1.5802, 1.4521, 90],
];

const vEntryChords = [
  [0, [44, 72, 75]],
  [0.128, [44, 72, 75]],
  [0.244, [44, 72, 75, 79]],
  [0.43, [44, 72, 75]],
  [0.523, [44, 72, 75]],
  [0.639, [44, 72, 75]],
  [0.779, [46, 74, 77]],
  [0.907, [46, 74, 77]],
] as const;

const bonusSections = [
  { startStep: 0, lengthSteps: 10, rootNote: 44, chordNotes: [56, 60, 63] },
  { startStep: 10, lengthSteps: 17, rootNote: 48, chordNotes: [60, 63, 67] },
  { startStep: 27, lengthSteps: 15, rootNote: 44, chordNotes: [56, 60, 63] },
  { startStep: 42, lengthSteps: 8, rootNote: 43, chordNotes: [55, 59, 62] },
  { startStep: 50, lengthSteps: 8, rootNote: 42, chordNotes: [54, 58, 61] },
  { startStep: 58, lengthSteps: 6, rootNote: 44, chordNotes: [56, 60, 63] },
] as const;

const bonusLeadNotes: readonly StepNoteEvent[] = [
  [70, 0, 1, 82], [72, 1, 3, 96], [70, 4, 1, 76], [72, 5, 1, 88],
  [75, 6, 2, 92], [74, 8, 1, 82], [77, 9, 1, 90],
  [75, 10, 2, 92], [79, 12, 2, 96], [77, 14, 2, 90], [75, 16, 2, 88],
  [72, 18, 2, 84], [70, 20, 2, 82], [75, 22, 2, 92], [79, 24, 1, 96],
  [77, 25, 1, 88], [74, 26, 1, 84],
  [77, 27, 1, 90], [75, 28, 1, 86], [72, 29, 3, 92], [79, 32, 1, 94],
  [75, 33, 1, 84], [72, 34, 2, 90], [75, 36, 1, 88], [77, 37, 1, 92],
  [75, 38, 1, 86], [72, 39, 2, 90], [77, 41, 1, 92],
  [77, 42, 2, 92], [79, 44, 2, 96], [75, 46, 2, 88], [79, 48, 2, 96],
  [84, 50, 1, 104], [78, 51, 3, 96], [74, 54, 1, 88], [82, 55, 1, 100],
  [74, 56, 1, 88], [82, 57, 1, 100],
  [77, 58, 1, 92], [75, 59, 1, 88], [72, 60, 1, 86], [79, 61, 2, 98],
  [75, 63, 1, 90],
];

function createOpllNoiseBuffer(context: AudioContext): AudioBuffer {
  const frameCount = Math.ceil(context.sampleRate * 0.12);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);
  let shiftRegister = 0x4a35b7d1;

  for (let index = 0; index < channel.length; index += 1) {
    shiftRegister ^= shiftRegister << 13;
    shiftRegister ^= shiftRegister >>> 17;
    shiftRegister ^= shiftRegister << 5;
    channel[index] = ((shiftRegister >>> 0) / 0xffffffff) * 2 - 1;
  }

  return buffer;
}

function scheduleNoiseHit(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  buffer: AudioBuffer,
  startAt: number,
  duration: number,
  filterType: BiquadFilterType,
  filterFrequency: number,
  gain: number,
): void {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();

  source.buffer = buffer;
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFrequency, startAt);
  filter.Q.setValueAtTime(filterType === "bandpass" ? 0.8 : 0.35, startAt);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.0015);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(destination);
  source.start(startAt);
  source.stop(startAt + duration + 0.01);
  trackScheduledSource(sources, source, () => {
    filter.disconnect();
    envelope.disconnect();
  });
}

function createNineBitCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(4096);
  for (let index = 0; index < curve.length; index += 1) {
    const input = (index / (curve.length - 1)) * 2 - 1;
    curve[index] = Math.round(input * 255) / 255;
  }
  return curve;
}

function scheduleVFanfare(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  startAt: number,
): void {
  vEntryChords.forEach(([offset, notes]) => {
    notes.forEach((note) => {
      const patch = note <= 60 ? fanfareBassPatch : fanfareHitPatch;
      const gain = note <= 60 ? 1.18 : 1;
      createFmVoice(
        context,
        destination,
        sources,
        midiToFrequency(note),
        startAt + offset,
        offset < 0.7 ? 0.105 : 0.12,
        0,
        {
          ...patch,
          peakGain: patch.peakGain * gain,
          sustainGain: patch.sustainGain * gain,
        },
      );
    });
  });

  vFanfareNotes.forEach(([note, offset, duration, velocity]) => {
    if (offset < 1) return;
    const patch = offset < 1.58
      ? (note <= 60 ? fanfareBassPatch : fanfareHitPatch)
      : fanfareSustainPatch;
    const velocityGain = 0.58 + (velocity / 106) * 0.42;
    createFmVoice(
      context,
      destination,
      sources,
      midiToFrequency(note),
      startAt + offset,
      duration,
      0,
      {
        ...patch,
        peakGain: patch.peakGain * velocityGain,
        sustainGain: patch.sustainGain * velocityGain,
      },
    );
  });
}

function scheduleBonusLoop(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  noiseBuffer: AudioBuffer,
  loopStartAt: number,
): void {
  bonusSections.forEach(({ startStep, lengthSteps, rootNote, chordNotes }) => {
    const sectionStartAt = loopStartAt + startStep * BONUS_STEP_SECONDS;
    const sectionDuration = lengthSteps * BONUS_STEP_SECONDS - 0.018;

    chordNotes.forEach((note) => {
      createFmVoice(
        context,
        destination,
        sources,
        midiToFrequency(note),
        sectionStartAt,
        sectionDuration,
        0,
        bonusPadPatch,
      );
    });

    const pulseOrder = [0, 2, 1, 2] as const;
    const bassIntervals = [0, 12, 7, 12] as const;
    for (let relativeStep = 0; relativeStep < lengthSteps; relativeStep += 1) {
      const noteStartAt = sectionStartAt + relativeStep * BONUS_STEP_SECONDS;
      const bassNote = rootNote + bassIntervals[relativeStep % bassIntervals.length];
      const pulseNote = chordNotes[pulseOrder[relativeStep % pulseOrder.length]];

      createFmVoice(
        context,
        destination,
        sources,
        midiToFrequency(bassNote),
        noteStartAt,
        BONUS_STEP_SECONDS * 0.76,
        0,
        bonusBassPatch,
      );
      createFmVoice(
        context,
        destination,
        sources,
        midiToFrequency(pulseNote),
        noteStartAt + 0.012,
        BONUS_STEP_SECONDS * 0.42,
        0,
        bonusPulsePatch,
      );
    }
  });

  bonusLeadNotes.forEach(([note, step, durationSteps, velocity]) => {
    const velocityGain = 0.68 + (velocity / 106) * 0.32;
    createFmVoice(
      context,
      destination,
      sources,
      midiToFrequency(note),
      loopStartAt + step * BONUS_STEP_SECONDS,
      durationSteps * BONUS_STEP_SECONDS * 0.9,
      0,
      {
        ...bonusLeadPatch,
        peakGain: bonusLeadPatch.peakGain * velocityGain,
        sustainGain: bonusLeadPatch.sustainGain * velocityGain,
      },
    );
  });

  for (let step = 0; step < BONUS_LOOP_STEPS; step += 1) {
    const drumStartAt = loopStartAt + step * BONUS_STEP_SECONDS;
    const beatStep = step % 8;
    const isOpenHat = beatStep === 7;

    scheduleNoiseHit(
      context,
      destination,
      sources,
      noiseBuffer,
      drumStartAt + 0.006,
      isOpenHat ? 0.075 : 0.027,
      "highpass",
      5900,
      isOpenHat ? 0.0085 : (step % 2 === 0 ? 0.007 : 0.005),
    );

    if (beatStep === 0 || beatStep === 4) {
      createFmVoice(
        context,
        destination,
        sources,
        midiToFrequency(36),
        drumStartAt,
        0.085,
        0,
        bonusKickPatch,
      );
    }
    if (beatStep === 2 || beatStep === 6) {
      scheduleNoiseHit(
        context,
        destination,
        sources,
        noiseBuffer,
        drumStartAt,
        0.065,
        "bandpass",
        2600,
        0.023,
      );
    }
  }
}

export function playThunderVFanfare(context: AudioContext): () => void {
  const startAt = context.currentTime + 0.025;
  const output = createLimitedOutput(context, startAt, 1.28);
  const bus = context.createGain();
  const presence = context.createBiquadFilter();
  const speaker = context.createBiquadFilter();
  const quantizer = context.createWaveShaper();
  const sources: AudioScheduledSourceNode[] = [];
  let disconnected = false;

  bus.gain.setValueAtTime(0.9, startAt);
  presence.type = "highshelf";
  presence.frequency.setValueAtTime(2900, startAt);
  presence.gain.setValueAtTime(1.25, startAt);
  speaker.type = "lowpass";
  speaker.frequency.setValueAtTime(9600, startAt);
  speaker.Q.setValueAtTime(0.38, startAt);
  quantizer.curve = createNineBitCurve();
  quantizer.oversample = "none";
  bus.connect(presence);
  presence.connect(speaker);
  speaker.connect(quantizer);
  quantizer.connect(output.input);

  scheduleVFanfare(context, bus, sources, startAt);
  const noiseBuffer = createOpllNoiseBuffer(context);
  for (let loopIndex = 0; loopIndex < BONUS_LOOP_COUNT; loopIndex += 1) {
    scheduleBonusLoop(
      context,
      bus,
      sources,
      noiseBuffer,
      startAt + BONUS_START_SECONDS + loopIndex * BONUS_LOOP_SECONDS,
    );
  }

  const disconnectGraph = () => {
    if (disconnected) return;
    disconnected = true;
    bus.disconnect();
    presence.disconnect();
    speaker.disconnect();
    quantizer.disconnect();
    output.disconnect();
  };
  const cleanupTimer = window.setTimeout(disconnectGraph, (TOTAL_DURATION_SECONDS + 0.3) * 1000);

  return () => {
    window.clearTimeout(cleanupTimer);
    const stopAt = context.currentTime + 0.02;
    bus.gain.cancelScheduledValues(context.currentTime);
    bus.gain.setTargetAtTime(0.0001, context.currentTime, 0.006);
    sources.forEach((source) => {
      try {
        source.stop(stopAt);
      } catch {
        // The source may already have finished.
      }
    });
    window.setTimeout(disconnectGraph, 60);
  };
}
