import { createFmVoice, midiToFrequency, type FmPatch } from "~/lib/fm_synth";

const leadPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2, 1, 3],
  modulation: [0.62, 0, 0.25],
  carrierGains: [0.8, 0, 0.35, 0],
  filterFrequency: 2900,
  attack: 0.012,
  decay: 0.16,
  peakGain: 0.030,
  sustainGain: 0.009,
  release: 0.16,
};

const harmonyPatch: FmPatch = {
  ...leadPatch,
  modulation: [0.32, 0, 0.12],
  filterFrequency: 1600,
  attack: 0.055,
  peakGain: 0.011,
  sustainGain: 0.006,
  release: 0.23,
};

const bassPatch: FmPatch = {
  ...leadPatch,
  operatorCount: 2,
  modulation: [0.44, 0, 0],
  filterFrequency: 1000,
  peakGain: 0.031,
  sustainGain: 0.012,
  release: 0.24,
};

// Dm(add9) → B♭maj7 → A7(♭9) → Dm
const parts = [
  {
    patch: leadPatch,
    notes: [
      [77, 0.08, 0.22], [81, 0.33, 0.14], [76, 0.48, 0.25],
      [74, 0.83, 0.24], [69, 1.11, 0.22],
      [73, 1.51, 0.19], [70, 1.72, 0.14], [67, 1.88, 0.20],
      [69, 2.16, 0.23], [74, 2.44, 0.42],
    ],
  },
  {
    patch: harmonyPatch,
    notes: [
      [62, 0, 0.66], [69, 0.04, 0.62],
      [62, 0.76, 0.56], [65, 0.80, 0.52], [69, 0.84, 0.48],
      [61, 1.47, 0.49], [67, 1.50, 0.46],
      [62, 2.12, 0.79], [65, 2.17, 0.74],
    ],
  },
  {
    patch: bassPatch,
    notes: [
      [38, 0, 0.49], [45, 0.52, 0.13], [34, 0.76, 0.56],
      [33, 1.47, 0.36], [40, 1.86, 0.11], [38, 2.12, 0.79],
    ],
  },
] as const;

export async function playShutdownSound(context: AudioContext): Promise<void> {
  const startAt = context.currentTime + 0.02;
  const sources: AudioScheduledSourceNode[] = [];
  const output = context.createGain();
  output.gain.value = 1.4;
  output.connect(context.destination);

  for (const { patch, notes } of parts) {
    for (const [pitch, offset, duration] of notes) {
      createFmVoice(
        context,
        output,
        sources,
        midiToFrequency(pitch),
        startAt + offset,
        duration,
        0,
        patch,
      );
    }
  }

  await Promise.all(sources.map((source) => new Promise<void>((resolve) => {
    source.addEventListener("ended", () => resolve(), { once: true });
  })));
}
