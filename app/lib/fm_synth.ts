export type FmPatch = {
  algorithm: "serial" | "dual" | "fan";
  ratios: readonly [number, number, number, number];
  modulation: readonly [number, number, number];
  operatorCount?: 2 | 4;
  waveforms?: readonly [OscillatorType, OscillatorType, OscillatorType, OscillatorType];
  operatorDetuneCents?: readonly [number, number, number, number];
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
  const envelope = context.createGain();
  const panner = context.createStereoPanner();
  const filter = patch.filterFrequency ? context.createBiquadFilter() : null;
  const trackSource = (source: AudioScheduledSourceNode) => {
    sources.push(source);
    source.addEventListener("ended", () => {
      const sourceIndex = sources.indexOf(source);
      if (sourceIndex >= 0) sources.splice(sourceIndex, 1);
    }, { once: true });
  };

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
    const vibratoDepth = context.createGain();
    vibrato.frequency.setValueAtTime(patch.vibratoRate, startAt);
    vibratoDepth.gain.setValueAtTime(0, startAt);
    vibratoDepth.gain.linearRampToValueAtTime(
      patch.vibratoCents,
      startAt + Math.min(duration * 0.45, 0.4),
    );
    vibrato.connect(vibratoDepth);
    operators.forEach((operator) => vibratoDepth.connect(operator.detune));
    vibrato.start(startAt);
    vibrato.stop(soundEnd + 0.02);
    trackSource(vibrato);
  }

  modulationDepths.forEach((depth, index) => {
    depth.gain.setValueAtTime(frequency * patch.modulation[index], startAt);
  });

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
    operators[0].connect(envelope);
  } else if (patch.algorithm === "dual") {
    operators[1].connect(modulationDepths[0]);
    modulationDepths[0].connect(operators[0].frequency);
    operators[3].connect(modulationDepths[2]);
    modulationDepths[2].connect(operators[2].frequency);
    operators[0].connect(envelope);
    operators[2].connect(envelope);
  } else if (patch.algorithm === "fan") {
    operators.slice(0, 3).forEach((carrier, index) => {
      operators[3].connect(modulationDepths[index]);
      modulationDepths[index].connect(carrier.frequency);
      carrier.connect(envelope);
    });
  } else {
    operators[3].connect(modulationDepths[2]);
    modulationDepths[2].connect(operators[2].frequency);
    operators[2].connect(modulationDepths[1]);
    modulationDepths[1].connect(operators[1].frequency);
    operators[1].connect(modulationDepths[0]);
    modulationDepths[0].connect(operators[0].frequency);
    operators[0].connect(envelope);
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

  operators.forEach((operator) => {
    operator.start(startAt);
    operator.stop(soundEnd + 0.02);
    trackSource(operator);
  });
}
