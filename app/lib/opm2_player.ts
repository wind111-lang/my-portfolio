import {
  createFmVoice,
  type FmPatch,
  x68000VgmMidiToFrequency,
} from "~/lib/fm_synth";
import {
  STROLLING_PLAYER_CHANNELS,
  STROLLING_PLAYER_DURATION_SECONDS,
  STROLLING_PLAYER_PATCHES,
  STROLLING_PLAYER_KEY_FRACTION_SEMITONES,
  type StrollingPlayerPatch,
} from "~/lib/strolling_player_vgm_score";

const SCHEDULE_AHEAD_SECONDS = 5;
const OUTPUT_GAIN = 1.35;
const FADE_START_SECONDS = STROLLING_PLAYER_DURATION_SECONDS - 3.2;

const DT1_CENTS = [0, 3.4, 6.8, 10.2, 0, -3.4, -6.8, -10.2] as const;
const CHANNEL_GAINS = [0.96, 0.94, 1, 0.86, 0.84, 0.86, 0.92, 0.82] as const;

function carrierIndices(algorithm: StrollingPlayerPatch["algorithm"]): readonly number[] {
  if (algorithm <= 3) return [3];
  if (algorithm === 4) return [1, 3];
  if (algorithm <= 6) return [1, 2, 3];
  return [0, 1, 2, 3];
}

function average(values: readonly number[], indices: readonly number[]): number {
  return indices.reduce((sum, index) => sum + values[index], 0) / indices.length;
}

function convertPatch(source: StrollingPlayerPatch): FmPatch {
  const carriers = carrierIndices(source.algorithm);
  const carrierSet = new Set(carriers);
  // YM2151のTLは1段あたり約0.75dB。振幅比へ直してから、
  // Web Audio側の変調深度とキャリア音量へ割り当てる。
  const operatorLevels = source.totalLevels.map((level) => 2 ** (-level / 8));
  const strongestCarrier = Math.max(...carriers.map((index) => operatorLevels[index]));
  const carrierGains = operatorLevels.map((level, index) => (
    carrierSet.has(index) ? level / strongestCarrier : 0
  )) as [number, number, number, number];
  const modulationScale = 7.5 + source.feedback * 0.65;
  const operatorModulation = operatorLevels.map((level, index) => (
    carrierSet.has(index) ? 0 : Math.min(4.8, Math.max(0.04, level * modulationScale))
  )) as [number, number, number, number];
  const carrierAttackRate = average(source.attackRates, carriers);
  const carrierDecayRate = average(source.decayRates, carriers);
  const carrierSustainLevel = average(source.sustainLevels, carriers);
  const carrierReleaseRate = average(source.releaseRates, carriers);
  const peakGain = 0.0205 * strongestCarrier / Math.sqrt(carriers.length);
  const sustainRatio = Math.max(0.002, 2 ** (-carrierSustainLevel / 2));

  return {
    algorithm: source.algorithm,
    ratios: source.ratios,
    modulation: [0, 0, 0],
    operatorModulation,
    // M1の自己フィードバックは専用演算器を持たないWeb Audio上で、
    // 高FB時だけ三角波へ置換して倍音成分を近似する。
    waveforms: [source.feedback >= 6 ? "triangle" : "sine", "sine", "sine", "sine"],
    operatorDetuneCents: source.detune1.map((detune) => DT1_CENTS[detune]) as [
      number,
      number,
      number,
      number,
    ],
    carrierGains,
    filterFrequency: 15400,
    filterQ: 0.58,
    attack: 0.004 + ((31 - carrierAttackRate) / 31) ** 2 * 0.34,
    decay: 0.07 + ((31 - carrierDecayRate) / 31) ** 2 * 1.25,
    peakGain,
    sustainGain: peakGain * sustainRatio,
    release: 0.045 + ((15 - carrierReleaseRate) / 15) ** 2 * 0.64,
  };
}

const fmPatches = STROLLING_PLAYER_PATCHES.map(convertPatch);

type RuntimeChannel = {
  destination: GainNode;
  events: (typeof STROLLING_PLAYER_CHANNELS)[number];
  nextEvent: number;
};

export function playStrollingPlayerTrack(context: AudioContext): () => void {
  const startAt = context.currentTime + 0.04;
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const presence = context.createBiquadFilter();
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
  compressor.threshold.setValueAtTime(-16, startAt);
  compressor.knee.setValueAtTime(12, startAt);
  compressor.ratio.setValueAtTime(2.4, startAt);
  compressor.attack.setValueAtTime(0.005, startAt);
  compressor.release.setValueAtTime(0.18, startAt);
  presence.type = "peaking";
  presence.frequency.setValueAtTime(5200, startAt);
  presence.Q.setValueAtTime(0.72, startAt);
  presence.gain.setValueAtTime(1.8, startAt);
  outputFilter.type = "lowpass";
  outputFilter.frequency.setValueAtTime(15800, startAt);
  outputFilter.Q.setValueAtTime(0.5, startAt);

  master.connect(compressor);
  compressor.connect(presence);
  presence.connect(outputFilter);
  outputFilter.connect(context.destination);

  const channels: RuntimeChannel[] = STROLLING_PLAYER_CHANNELS.map((events, index) => ({
    destination: channelBuses[index],
    events,
    nextEvent: 0,
  }));

  const schedulePendingEvents = () => {
    if (disconnected) return;
    const horizon = context.currentTime + SCHEDULE_AHEAD_SECONDS;

    channels.forEach((channel) => {
      while (channel.nextEvent < channel.events.length) {
        const [startCentisecond, midiNote, gateCentisecond, patchId] =
          channel.events[channel.nextEvent];
        const eventOffset = startCentisecond / 100;
        const noteStart = startAt + eventOffset;
        if (noteStart > horizon) break;

        const remainingTrackTime = STROLLING_PLAYER_DURATION_SECONDS - eventOffset;
        const duration = Math.min(
          Math.max(0.025, gateCentisecond / 100 - 0.006),
          remainingTrackTime,
        );
        if (duration > 0.01) {
          const sourcePatch = STROLLING_PLAYER_PATCHES[patchId];
          createFmVoice(
            context,
            channel.destination,
            sources,
            x68000VgmMidiToFrequency(
              midiNote + STROLLING_PLAYER_KEY_FRACTION_SEMITONES,
            ),
            noteStart,
            duration,
            sourcePatch.pan === 2 ? -0.72 : sourcePatch.pan === 1 ? 0.72 : 0,
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
  schedulerTimer = window.setInterval(schedulePendingEvents, 500);

  master.gain.setValueAtTime(OUTPUT_GAIN, startAt + FADE_START_SECONDS);
  master.gain.linearRampToValueAtTime(0.0001, startAt + STROLLING_PLAYER_DURATION_SECONDS);

  const disconnectGraph = () => {
    if (disconnected) return;
    disconnected = true;
    channelBuses.forEach((bus) => bus.disconnect());
    master.disconnect();
    compressor.disconnect();
    presence.disconnect();
    outputFilter.disconnect();
  };
  const cleanupTimer = window.setTimeout(
    disconnectGraph,
    (STROLLING_PLAYER_DURATION_SECONDS + 0.6) * 1000,
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
