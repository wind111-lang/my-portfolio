import {
  DESTINY_CHANNELS,
  DESTINY_DURATION_SECONDS,
  DESTINY_PATCHES,
  type DestinyPatch,
} from "~/lib/destiny_vgm_score";
import {
  createFmVoice,
  type FmPatch,
  x68000VgmMidiToFrequency,
} from "~/lib/fm_synth";

const SCHEDULE_AHEAD_SECONDS = 3;
const OUTPUT_GAIN = 0.9;
const FADE_START_SECONDS = DESTINY_DURATION_SECONDS - 3.5;
const DT1_CENTS = [0, 3.4, 6.8, 10.2, 0, -3.4, -6.8, -10.2] as const;
const CHANNEL_GAINS = [0.94, 0.9, 0.92, 0.9, 0.86, 0.88, 0.72, 0.68] as const;

function carrierIndices(algorithm: DestinyPatch["algorithm"]): readonly number[] {
  if (algorithm <= 3) return [3];
  if (algorithm === 4) return [1, 3];
  if (algorithm <= 6) return [1, 2, 3];
  return [0, 1, 2, 3];
}

function average(values: readonly number[], indices: readonly number[]): number {
  return indices.reduce((sum, index) => sum + values[index], 0) / indices.length;
}

function convertPatch(source: DestinyPatch): FmPatch {
  const carriers = carrierIndices(source.algorithm);
  const carrierSet = new Set(carriers);
  const operatorLevels = source.totalLevels.map((level) => 2 ** (-level / 8));
  const strongestCarrier = Math.max(...carriers.map((index) => operatorLevels[index]));
  const carrierGains = operatorLevels.map((level, index) => (
    carrierSet.has(index) ? level / strongestCarrier : 0
  )) as [number, number, number, number];
  const modulationScale = 8.2 + source.feedback * 0.72;
  const operatorModulation = operatorLevels.map((level, index) => (
    carrierSet.has(index) ? 0 : Math.min(5.4, Math.max(0.04, level * modulationScale))
  )) as [number, number, number, number];
  const carrierAttackRate = average(source.attackRates, carriers);
  const carrierDecayRate = average(source.decayRates, carriers);
  const carrierSustainLevel = average(source.sustainLevels, carriers);
  const carrierReleaseRate = average(source.releaseRates, carriers);
  const peakGain = 0.019 * strongestCarrier / Math.sqrt(carriers.length);
  const sustainRatio = Math.max(0.002, 2 ** (-carrierSustainLevel / 2));

  return {
    algorithm: source.algorithm,
    ratios: source.ratios,
    modulation: [0, 0, 0],
    operatorModulation,
    // YM2151の自己フィードバック演算器を持たないため、M1だけ三角波で近似する。
    waveforms: [source.feedback >= 6 ? "triangle" : "sine", "sine", "sine", "sine"],
    operatorDetuneCents: source.detune1.map((detune) => DT1_CENTS[detune]) as [
      number,
      number,
      number,
      number,
    ],
    carrierGains,
    filterFrequency: 16_200,
    filterQ: 0.58,
    attack: 0.004 + ((31 - carrierAttackRate) / 31) ** 2 * 0.3,
    decay: 0.06 + ((31 - carrierDecayRate) / 31) ** 2 * 1.1,
    peakGain,
    sustainGain: peakGain * sustainRatio,
    release: 0.04 + ((15 - carrierReleaseRate) / 15) ** 2 * 0.58,
  };
}

const fmPatches = DESTINY_PATCHES.map(convertPatch);

type RuntimeChannel = {
  destination: GainNode;
  events: (typeof DESTINY_CHANNELS)[number];
  nextEvent: number;
};

export function playDestinyTrack(context: AudioContext): () => void {
  const startAt = context.currentTime + 0.04;
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const presence = context.createBiquadFilter();
  const highShelf = context.createBiquadFilter();
  const outputFilter = context.createBiquadFilter();
  const channelBuses = CHANNEL_GAINS.map((gain) => {
    const bus = context.createGain();
    bus.gain.setValueAtTime(gain, startAt);
    bus.connect(master);
    return bus;
  });
  const sources: AudioScheduledSourceNode[] = [];
  let schedulerTimer: number | null = null;
  let disconnected = false;

  master.gain.setValueAtTime(OUTPUT_GAIN, startAt);
  master.gain.setValueAtTime(OUTPUT_GAIN, startAt + FADE_START_SECONDS);
  master.gain.linearRampToValueAtTime(0.0001, startAt + DESTINY_DURATION_SECONDS);

  compressor.threshold.setValueAtTime(-16, startAt);
  compressor.knee.setValueAtTime(13, startAt);
  compressor.ratio.setValueAtTime(2.5, startAt);
  compressor.attack.setValueAtTime(0.004, startAt);
  compressor.release.setValueAtTime(0.16, startAt);
  presence.type = "peaking";
  presence.frequency.setValueAtTime(4_300, startAt);
  presence.Q.setValueAtTime(0.72, startAt);
  presence.gain.setValueAtTime(2.1, startAt);
  highShelf.type = "highshelf";
  highShelf.frequency.setValueAtTime(6_200, startAt);
  highShelf.gain.setValueAtTime(2.6, startAt);
  outputFilter.type = "lowpass";
  outputFilter.frequency.setValueAtTime(17_200, startAt);
  outputFilter.Q.setValueAtTime(0.48, startAt);

  master.connect(compressor);
  compressor.connect(presence);
  presence.connect(highShelf);
  highShelf.connect(outputFilter);
  outputFilter.connect(context.destination);

  const channels: RuntimeChannel[] = DESTINY_CHANNELS.map((events, index) => ({
    destination: channelBuses[index],
    events,
    nextEvent: 0,
  }));

  const schedulePendingEvents = () => {
    if (disconnected) return;
    const horizon = context.currentTime + SCHEDULE_AHEAD_SECONDS;

    channels.forEach((channel) => {
      while (channel.nextEvent < channel.events.length) {
        const [startCentisecond, midiSixtyFourth, gateCentisecond, patchId] =
          channel.events[channel.nextEvent];
        const eventOffset = startCentisecond / 100;
        const noteStart = startAt + eventOffset;
        if (noteStart > horizon) break;

        const remainingTrackTime = DESTINY_DURATION_SECONDS - eventOffset;
        const duration = Math.min(
          Math.max(0.024, gateCentisecond / 100 - 0.005),
          remainingTrackTime,
        );
        if (duration > 0.01) {
          const sourcePatch = DESTINY_PATCHES[patchId];
          createFmVoice(
            context,
            channel.destination,
            sources,
            x68000VgmMidiToFrequency(midiSixtyFourth / 64),
            noteStart,
            duration,
            sourcePatch.pan === 2 ? -0.7 : sourcePatch.pan === 1 ? 0.7 : 0,
            fmPatches[patchId],
          );
        }
        channel.nextEvent += 1;
      }
    });

    if (channels.every((channel) => channel.nextEvent === channel.events.length)) {
      if (schedulerTimer !== null) window.clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  };

  schedulePendingEvents();
  schedulerTimer = window.setInterval(schedulePendingEvents, 400);

  const disconnectGraph = () => {
    if (disconnected) return;
    disconnected = true;
    channelBuses.forEach((bus) => bus.disconnect());
    master.disconnect();
    compressor.disconnect();
    presence.disconnect();
    highShelf.disconnect();
    outputFilter.disconnect();
  };
  const cleanupTimer = window.setTimeout(
    disconnectGraph,
    (DESTINY_DURATION_SECONDS + 0.7) * 1000,
  );

  return () => {
    window.clearTimeout(cleanupTimer);
    if (schedulerTimer !== null) window.clearInterval(schedulerTimer);
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
