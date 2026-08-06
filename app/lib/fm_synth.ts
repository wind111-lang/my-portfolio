export type FmPatch = {
  algorithm: "serial" | "dual" | "fan";
  ratios: readonly [number, number, number, number];
  modulation: readonly [number, number, number];
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
  const modulationDepths = Array.from({ length: 3 }, () => context.createGain());
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

  modulationDepths.forEach((depth, index) => {
    depth.gain.setValueAtTime(frequency * patch.modulation[index], startAt);
  });

  const connectCarrier = (operatorIndex: number) => {
    const level = context.createGain();
    level.gain.setValueAtTime(patch.carrierGains?.[operatorIndex] ?? 1, startAt);
    operators[operatorIndex].connect(level);
    level.connect(envelope);
    carrierLevels.push(level);
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
    operators[1].connect(modulationDepths[0]);
    modulationDepths[0].connect(operators[0].frequency);
    connectCarrier(0);
  } else if (patch.algorithm === "dual") {
    operators[1].connect(modulationDepths[0]);
    modulationDepths[0].connect(operators[0].frequency);
    operators[3].connect(modulationDepths[2]);
    modulationDepths[2].connect(operators[2].frequency);
    connectCarrier(0);
    connectCarrier(2);
  } else if (patch.algorithm === "fan") {
    operators.slice(0, 3).forEach((carrier, index) => {
      operators[3].connect(modulationDepths[index]);
      modulationDepths[index].connect(carrier.frequency);
      connectCarrier(index);
    });
  } else {
    operators[3].connect(modulationDepths[2]);
    modulationDepths[2].connect(operators[2].frequency);
    operators[2].connect(modulationDepths[1]);
    modulationDepths[1].connect(operators[1].frequency);
    operators[1].connect(modulationDepths[0]);
    modulationDepths[0].connect(operators[0].frequency);
    connectCarrier(0);
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
