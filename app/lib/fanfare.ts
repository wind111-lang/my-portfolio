import { createLimitedOutput } from "~/lib/audio_output";
import { createFmVoice, midiToFrequency } from "~/lib/fm_synth";

type NoteEvent = readonly [note: number, offset: number, duration: number, velocity: number];

const TOTAL_DURATION_SECONDS = 7.58;
const V_FANFARE_START = 4.42;

const kontiPatch = {
  algorithm: 4,
  operatorCount: 2,
  ratios: [1, 2, 1, 1],
  modulation: [0.78, 0, 0],
  carrierGains: [0.74, 0, 0, 0],
  operatorDetuneCents: [0, 2, 0, 0],
  filterFrequency: 7600,
  filterStartFrequency: 2800,
  filterAttack: 0.012,
  filterQ: 0.65,
  pitchAttackCents: 12,
  pitchAttackTime: 0.012,
  attack: 0.002,
  decay: 0.032,
  peakGain: 0.072,
  sustainGain: 0.024,
  release: 0.028,
} as const;

const vBrassPatch = {
  algorithm: 4,
  operatorCount: 2,
  ratios: [1, 1, 1, 1],
  modulation: [0.76, 0, 0],
  carrierGains: [0.64, 0, 0, 0],
  operatorDetuneCents: [0, 3, 0, 0],
  filterFrequency: 7000,
  filterStartFrequency: 2200,
  filterAttack: 0.055,
  filterQ: 0.75,
  pitchAttackCents: 20,
  pitchAttackTime: 0.04,
  attack: 0.008,
  decay: 0.16,
  peakGain: 0.052,
  sustainGain: 0.038,
  release: 0.18,
  vibratoRate: 5.8,
  vibratoCents: 6,
} as const;

const vHitPatch = {
  ...vBrassPatch,
  filterFrequency: 7200,
  filterStartFrequency: 3100,
  filterAttack: 0.018,
  pitchAttackCents: 10,
  pitchAttackTime: 0.012,
  attack: 0.002,
  decay: 0.055,
  peakGain: 0.058,
  sustainGain: 0.028,
  release: 0.055,
  vibratoRate: 0,
  vibratoCents: 0,
} as const;

const vBassPatch = {
  ...vHitPatch,
  ratios: [1, 1, 1, 1],
  modulation: [0.28, 0, 0],
  carrierGains: [0.72, 0, 0, 0],
  filterFrequency: 4200,
  filterStartFrequency: 1800,
  peakGain: 0.064,
  sustainGain: 0.034,
  release: 0.075,
} as const;

const midiKontiNotes: readonly NoteEvent[] = [
  [48, 0, 0.1281, 36], [60, 0, 0.0698, 40], [60, 0.0698, 0.0813, 38],
  [48, 0.1271, 0.0698, 46], [52, 0.1271, 0.0698, 47], [52, 0.1969, 0.0698, 90],
  [52, 0.2667, 0.0812, 64], [55, 0.2896, 0.0812, 76], [64, 0.325, 0.0812, 41],
  [55, 0.3834, 0.0927, 69], [60, 0.4521, 0.0698, 93], [67, 0.4521, 0.1156, 38],
  [84, 0.4521, 0.1396, 43], [60, 0.5219, 0.1281, 92], [84, 0.5917, 0.0927, 44],
  [60, 0.65, 0.0698, 90], [60, 0.7198, 0.1281, 86], [60, 0.8469, 0.0698, 91],
  [64, 0.8469, 0.0698, 45], [76, 0.8469, 0.1281, 36], [60, 0.9167, 0.0927, 71],
  [64, 0.9167, 0.1281, 44], [67, 0.975, 0.1396, 36], [76, 0.975, 0.0812, 67],
  [64, 1.0448, 0.0813, 75], [67, 1.1146, 0.0813, 67], [72, 1.1719, 0.1042, 77],
  [76, 1.2417, 0.1969, 103], [76, 1.4396, 0.4062, 87],
  [60, 1.8104, 0.0813, 75], [60, 1.9042, 0.0594, 91], [60, 1.9636, 0.0698, 81],
  [60, 2.0323, 0.1281, 62], [60, 2.1604, 0.0698, 43], [60, 2.2302, 0.1156, 46],
  [64, 2.3459, 0.1396, 30], [52, 2.3584, 0.0698, 80], [52, 2.4271, 0.0813, 60],
  [55, 2.4855, 0.0698, 95], [64, 2.4855, 0.0927, 47], [55, 2.5552, 0.0812, 70],
  [60, 2.6136, 0.0698, 95], [67, 2.6136, 0.1042, 37], [84, 2.6136, 0.0698, 44],
  [60, 2.6834, 0.0698, 90], [84, 2.6834, 0.0698, 49], [60, 2.7521, 0.1281, 94],
  [84, 2.7521, 0.1042, 40], [60, 2.8802, 0.0698, 90], [60, 2.95, 0.1281, 90],
  [64, 3.0084, 0.0698, 54], [76, 3.0084, 0.1281, 35], [60, 3.0782, 0.0927, 70],
  [64, 3.0782, 0.1281, 43], [76, 3.1355, 0.1042, 65], [67, 3.1469, 0.1281, 35],
  [64, 3.2052, 0.0927, 73], [67, 3.275, 0.0812, 73], [72, 3.3448, 0.0927, 76],
  [76, 3.4146, 0.1969, 106], [76, 3.6115, 0.1969, 97], [76, 3.8094, 0.3844, 80],
];

const KONTI_SECOND_MOTIF_START = 2.1604;

const kontiTransitionIndexes = [29, 30, 31, 32] as const;

const kontiMotifIndexes = [
  33, 34, 36, 37, 38, 40, 41, 44, 46, 48, 49, 52, 54, 56, 57, 58, 59, 60,
  61,
] as const;

const kontiPitchOverrides = new Map<number, number>([
  [33, 48],
  [34, 48],
  [54, 64],
]);

const secondKontiMotif: readonly NoteEvent[] = kontiMotifIndexes.map(
  (sourceIndex): NoteEvent => {
    const [note, offset, duration, velocity] = midiKontiNotes[sourceIndex];
    return [kontiPitchOverrides.get(sourceIndex) ?? note, offset, duration, velocity];
  },
);

const kontiNotes: readonly NoteEvent[] = [
  ...secondKontiMotif.map(
    ([note, offset, duration, velocity]): NoteEvent => [
      note,
      offset - KONTI_SECOND_MOTIF_START,
      duration,
      velocity,
    ],
  ),
  ...kontiTransitionIndexes.map((sourceIndex): NoteEvent => midiKontiNotes[sourceIndex]),
  ...secondKontiMotif,
];

const vNotes: readonly NoteEvent[] = [
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

export function playThunderVFanfare(context: AudioContext): () => void {
  const startAt = context.currentTime + 0.025;
  const output = createLimitedOutput(context, startAt, 1.32);
  const bus = context.createGain();
  const presence = context.createBiquadFilter();
  const sources: AudioScheduledSourceNode[] = [];
  let disconnected = false;

  bus.gain.setValueAtTime(0.98, startAt);
  presence.type = "highshelf";
  presence.frequency.setValueAtTime(3000, startAt);
  presence.gain.setValueAtTime(0.8, startAt);
  bus.connect(presence);
  presence.connect(output.input);

  kontiNotes.forEach(([note, offset, duration, velocity], index) => {
    const velocityGain = Math.max(0.18, velocity / 106);
    createFmVoice(context, bus, sources, midiToFrequency(note), startAt + offset, duration, index % 2 ? 0.1 : -0.1, {
      ...kontiPatch,
      peakGain: kontiPatch.peakGain * velocityGain,
      sustainGain: kontiPatch.sustainGain * velocityGain,
    });
  });

  vEntryChords.forEach(([offset, notes]) => {
    notes.forEach((note, noteIndex) => {
      const patch = note <= 60 ? vBassPatch : vHitPatch;
      const gain = note <= 60 ? 1.25 : 1.05;
      createFmVoice(
        context,
        bus,
        sources,
        midiToFrequency(note),
        startAt + V_FANFARE_START + offset,
        offset < 0.7 ? 0.105 : 0.12,
        -0.22 + (noteIndex * 0.44) / (notes.length - 1),
        {
          ...patch,
          peakGain: patch.peakGain * gain,
          sustainGain: patch.sustainGain * gain,
        },
      );
    });
  });

  vNotes.forEach(([note, offset, duration, velocity], index) => {
    if (offset < 1) return;
    const patch = offset < 1.58 ? (note <= 60 ? vBassPatch : vHitPatch) : vBrassPatch;
    const velocityGain = 0.55 + (velocity / 106) * 0.45;
    createFmVoice(
      context,
      bus,
      sources,
      midiToFrequency(note),
      startAt + V_FANFARE_START + offset,
      duration,
      index % 2 ? 0.14 : -0.14,
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
