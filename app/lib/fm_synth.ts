export type FmPatch = {
  algorithm: "serial" | "dual" | "fan" | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  ratios: readonly [number, number, number, number];
  modulation: readonly [number, number, number];
  operatorModulation?: readonly [number, number, number, number];
  operatorCount?: 2 | 4;
  waveforms?: readonly [OscillatorType, OscillatorType, OscillatorType, OscillatorType];
  operatorDetuneCents?: readonly [number, number, number, number];
  carrierGains?: readonly [number, number, number, number];
  filterFrequency?: number;
  filterStartFrequency?: number;
  filterAttack?: number;
  filterQ?: number;
  pitchAttackCents?: number;
  pitchAttackTime?: number;
  attack: number;
  decay: number;
  peakGain: number;
  sustainGain: number;
  release: number;
  vibratoRate?: number;
  vibratoCents?: number;
};

export function midiToFrequency(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

// 4MHz動作のX68000用VGMから抽出したYM2151キーコードは、Web Audioの
// A4=440Hzへそのまま写すと試聴上およそ半音低くなる。各曲固有のKF
// （1/64半音）は維持したまま、VGM由来トラックだけを共通して補正する。
export const X68000_VGM_PITCH_CORRECTION_SEMITONES = 1;

export function x68000VgmMidiToFrequency(note: number): number {
  return midiToFrequency(note + X68000_VGM_PITCH_CORRECTION_SEMITONES);
}

export function trackScheduledSource(
  sources: AudioScheduledSourceNode[],
  source: AudioScheduledSourceNode,
  cleanup?: () => void,
): void {
  sources.push(source);
  source.addEventListener("ended", () => {
    const sourceIndex = sources.indexOf(source);
    if (sourceIndex >= 0) sources.splice(sourceIndex, 1);
    source.disconnect();
    cleanup?.();
  }, { once: true });
}

export function createFmVoice(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  frequency: number,
  startAt: number,
  duration: number,
  pan: number,
  patch: FmPatch,
  detuneCents = 0,
): void {
  const soundEnd = startAt + duration + patch.release;
  const operatorCount = patch.operatorCount ?? 4;
  const operators = Array.from({ length: operatorCount }, () => context.createOscillator());
  const modulationDepths: GainNode[] = [];
  const carrierLevels: GainNode[] = [];
  const envelope = context.createGain();
  const panner = context.createStereoPanner();
  const filter = patch.filterFrequency ? context.createBiquadFilter() : null;
  let vibratoDepth: GainNode | null = null;

  operators.forEach((operator, index) => {
    operator.type = patch.waveforms?.[index] ?? "sine";
    operator.frequency.setValueAtTime(frequency * patch.ratios[index], startAt);
    const settledDetune = detuneCents + (patch.operatorDetuneCents?.[index] ?? 0);
    if (patch.pitchAttackCents) {
      operator.detune.setValueAtTime(settledDetune + patch.pitchAttackCents, startAt);
      operator.detune.linearRampToValueAtTime(
        settledDetune,
        startAt + Math.min(patch.pitchAttackTime ?? 0.06, duration * 0.35),
      );
    } else {
      operator.detune.setValueAtTime(settledDetune, startAt);
    }
  });

  if (patch.vibratoRate && patch.vibratoCents) {
    const vibrato = context.createOscillator();
    const depth = context.createGain();
    vibratoDepth = depth;
    vibrato.frequency.setValueAtTime(patch.vibratoRate, startAt);
    depth.gain.setValueAtTime(0, startAt);
    depth.gain.linearRampToValueAtTime(
      patch.vibratoCents,
      startAt + Math.min(duration * 0.45, 0.4),
    );
    vibrato.connect(depth);
    operators.forEach((operator) => depth.connect(operator.detune));
    vibrato.start(startAt);
    vibrato.stop(soundEnd + 0.02);
    trackScheduledSource(sources, vibrato);
  }

  const connectCarrier = (operatorIndex: number) => {
    const level = context.createGain();
    level.gain.setValueAtTime(patch.carrierGains?.[operatorIndex] ?? 1, startAt);
    operators[operatorIndex].connect(level);
    level.connect(envelope);
    carrierLevels.push(level);
  };

  const connectModulator = (sourceIndex: number, destinationIndex: number, depthRatio: number) => {
    const depth = context.createGain();
    depth.gain.setValueAtTime(frequency * depthRatio, startAt);
    operators[sourceIndex].connect(depth);
    depth.connect(operators[destinationIndex].frequency);
    modulationDepths.push(depth);
  };

  const attackEnd = startAt + Math.min(patch.attack, duration * 0.2);
  const decayEnd = startAt + Math.min(patch.decay, duration * 0.55);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(patch.peakGain, attackEnd);
  envelope.gain.exponentialRampToValueAtTime(patch.sustainGain, decayEnd);
  envelope.gain.setValueAtTime(patch.sustainGain, startAt + duration);
  envelope.gain.exponentialRampToValueAtTime(0.0001, soundEnd);
  panner.pan.setValueAtTime(pan, startAt);

  if (operatorCount === 2) {
    connectModulator(1, 0, patch.modulation[0]);
    connectCarrier(0);
  } else if (patch.algorithm === "dual") {
    connectModulator(1, 0, patch.modulation[0]);
    connectModulator(3, 2, patch.modulation[2]);
    connectCarrier(0);
    connectCarrier(2);
  } else if (patch.algorithm === "fan") {
    operators.slice(0, 3).forEach((_, index) => {
      connectModulator(3, index, patch.modulation[index]);
      connectCarrier(index);
    });
  } else if (patch.algorithm === "serial") {
    connectModulator(3, 2, patch.modulation[2]);
    connectModulator(2, 1, patch.modulation[1]);
    connectModulator(1, 0, patch.modulation[0]);
    connectCarrier(0);
  } else {
    // YM2151のM1/C1/M2/C2順。数値指定では実機の8種類の
    // コネクションをそのままWeb AudioのFM経路へ置き換える。
    const depths = patch.operatorModulation ?? [
      patch.modulation[0],
      patch.modulation[1],
      patch.modulation[2],
      0,
    ];
    switch (patch.algorithm) {
      case 0:
        connectModulator(0, 1, depths[0]);
        connectModulator(1, 2, depths[1]);
        connectModulator(2, 3, depths[2]);
        connectCarrier(3);
        break;
      case 1:
        connectModulator(0, 2, depths[0]);
        connectModulator(1, 2, depths[1]);
        connectModulator(2, 3, depths[2]);
        connectCarrier(3);
        break;
      case 2:
        connectModulator(0, 3, depths[0]);
        connectModulator(1, 2, depths[1]);
        connectModulator(2, 3, depths[2]);
        connectCarrier(3);
        break;
      case 3:
        connectModulator(0, 1, depths[0]);
        connectModulator(1, 3, depths[1]);
        connectModulator(2, 3, depths[2]);
        connectCarrier(3);
        break;
      case 4:
        connectModulator(0, 1, depths[0]);
        connectModulator(2, 3, depths[2]);
        connectCarrier(1);
        connectCarrier(3);
        break;
      case 5:
        connectModulator(0, 1, depths[0]);
        connectModulator(0, 2, depths[0]);
        connectModulator(0, 3, depths[0]);
        connectCarrier(1);
        connectCarrier(2);
        connectCarrier(3);
        break;
      case 6:
        connectModulator(0, 1, depths[0]);
        connectCarrier(1);
        connectCarrier(2);
        connectCarrier(3);
        break;
      case 7:
        operators.forEach((_, index) => connectCarrier(index));
        break;
    }
  }

  if (filter) {
    filter.type = "lowpass";
    const filterFrequency = patch.filterFrequency ?? 12000;
    if (patch.filterStartFrequency) {
      filter.frequency.setValueAtTime(patch.filterStartFrequency, startAt);
      filter.frequency.exponentialRampToValueAtTime(
        filterFrequency,
        startAt + Math.min(patch.filterAttack ?? 0.08, duration * 0.45),
      );
    } else {
      filter.frequency.setValueAtTime(filterFrequency, startAt);
    }
    filter.Q.setValueAtTime(patch.filterQ ?? 0.7, startAt);
    envelope.connect(filter);
    filter.connect(panner);
  } else {
    envelope.connect(panner);
  }
  panner.connect(destination);

  operators.forEach((operator, index) => {
    operator.start(startAt);
    operator.stop(soundEnd + 0.02);
    trackScheduledSource(sources, operator, index === operators.length - 1 ? () => {
      modulationDepths.forEach((depth) => depth.disconnect());
      carrierLevels.forEach((level) => level.disconnect());
      vibratoDepth?.disconnect();
      envelope.disconnect();
      filter?.disconnect();
      panner.disconnect();
    } : undefined);
  });
}
