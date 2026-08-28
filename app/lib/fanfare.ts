import { createLimitedOutput } from "~/lib/audio_output";
import { createFmVoice, midiToFrequency } from "~/lib/fm_synth";

type NoteEvent = readonly [note: number, offset: number, duration: number, velocity: number];

const TOTAL_DURATION_SECONDS = 3.22;

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

function createNineBitCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(4096);
  for (let index = 0; index < curve.length; index += 1) {
    const input = (index / (curve.length - 1)) * 2 - 1;
    curve[index] = Math.round(input * 255) / 255;
  }
  return curve;
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

  vEntryChords.forEach(([offset, notes]) => {
    notes.forEach((note) => {
      const patch = note <= 60 ? fanfareBassPatch : fanfareHitPatch;
      const gain = note <= 60 ? 1.18 : 1;
      createFmVoice(
        context,
        bus,
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
      bus,
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
