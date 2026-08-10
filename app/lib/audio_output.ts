type LimitedOutput = {
  input: GainNode;
  disconnect: () => void;
};

export function createLimitedOutput(
  context: AudioContext,
  startAt: number,
  gain = 1.7,
): LimitedOutput {
  const outputGain = context.createGain();
  const limiter = context.createDynamicsCompressor();

  outputGain.gain.setValueAtTime(gain, startAt);
  limiter.threshold.setValueAtTime(-2, startAt);
  limiter.knee.setValueAtTime(0, startAt);
  limiter.ratio.setValueAtTime(20, startAt);
  limiter.attack.setValueAtTime(0.001, startAt);
  limiter.release.setValueAtTime(0.08, startAt);

  outputGain.connect(limiter);
  limiter.connect(context.destination);

  return {
    input: outputGain,
    disconnect: () => {
      outputGain.disconnect();
      limiter.disconnect();
    },
  };
}
