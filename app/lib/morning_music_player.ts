import {
  trackScheduledSource,
  x68000VgmMidiToFrequency,
} from "~/lib/fm_synth";
import {
  MORNING_MUSIC_CHANNELS,
  MORNING_MUSIC_DURATION_SECONDS,
} from "~/lib/morning_music_vgm_score";

const SCHEDULE_AHEAD_SECONDS = 5;
const OUTPUT_GAIN = 1.35;
// Bubble System版のゆったりしたウォームアップ感へ寄せるため、
// X68000移植版から採譜したイベントを約14%遅く再生する。
const TEMPO_SCALE = 1.16;
export const BUBBLE_SYSTEM_MORNING_MUSIC_DURATION_SECONDS =
  MORNING_MUSIC_DURATION_SECONDS * TEMPO_SCALE;
const FADE_START_SECONDS = BUBBLE_SYSTEM_MORNING_MUSIC_DURATION_SECONDS - 3.2;
const CHANNEL_GAINS = [0.82, 0.8, 0.72, 0.68, 0.78, 0.74, 0.7, 0.66] as const;

// K005289の32段階ウェーブテーブルを意識した4bit風の波形。
// 元データのFM音色は使わず、Bubble SystemらしいPSG/WSGの輪郭へ置き換える。
const BUBBLE_WAVE_TABLES = [
  [-7,-7,-7,-7,-7,-7,-7,-7,-7,-7,-7,-7,-7,-7,-7,-7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7],
  [-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,7,7,6,5,4,3,2,1,0,-1,-2,-3,-4,-5,-6,-7,-7],
  [-7,-7,-6,-6,-5,-4,-2,0,3,5,7,7,6,4,2,0,-2,-4,-5,-5,-4,-2,0,2,4,6,7,6,4,1,-3,-6],
  [-7,-5,-3,-1,1,3,5,7,7,5,3,1,-1,-3,-5,-7,-7,-4,-1,2,5,7,5,2,-1,-4,-6,-4,-2,0,2,4],
] as const;

function createBubbleWave(context: AudioContext, samples: readonly number[]): PeriodicWave {
  const harmonics = samples.length / 2;
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);

  for (let harmonic = 1; harmonic <= harmonics; harmonic += 1) {
    for (let index = 0; index < samples.length; index += 1) {
      const phase = 2 * Math.PI * harmonic * index / samples.length;
      const sample = samples[index] / 7;
      real[harmonic] += 2 * sample * Math.cos(phase) / samples.length;
      imag[harmonic] += 2 * sample * Math.sin(phase) / samples.length;
    }
  }

  return context.createPeriodicWave(real, imag, { disableNormalization: false });
}

function createBubbleSystemVoice(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  waves: readonly PeriodicWave[],
  frequency: number,
  startAt: number,
  duration: number,
  channelIndex: number,
  patchId: number,
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const panner = context.createStereoPanner();
  const isLead = channelIndex === 0 || channelIndex === 2;
  const release = isLead ? 0.1 : 0.045;
  const soundEnd = startAt + duration + release;
  const peak = isLead ? 0.034 : 0.025;

  oscillator.setPeriodicWave(waves[(channelIndex + patchId) % waves.length]);
  oscillator.frequency.setValueAtTime(frequency, startAt);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(peak, startAt + 0.006);
  envelope.gain.setValueAtTime(peak * 0.82, startAt + Math.min(0.055, duration * 0.4));
  envelope.gain.setValueAtTime(peak * 0.82, startAt + duration);
  envelope.gain.exponentialRampToValueAtTime(0.0001, soundEnd);
  panner.pan.setValueAtTime((channelIndex % 2 === 0 ? -1 : 1) * 0.12, startAt);

  oscillator.connect(envelope);
  envelope.connect(panner);
  panner.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(soundEnd + 0.02);
  trackScheduledSource(sources, oscillator, () => {
    envelope.disconnect();
    panner.disconnect();
  });
}

type RuntimeChannel = {
  destination: GainNode;
  events: (typeof MORNING_MUSIC_CHANNELS)[number];
  nextEvent: number;
};

export function playMorningMusic(context: AudioContext): () => void {
  const startAt = context.currentTime + 0.025;
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
  const bubbleWaves = BUBBLE_WAVE_TABLES.map((samples) => createBubbleWave(context, samples));
  let schedulerTimer: number | null = null;
  let disconnected = false;

  master.gain.setValueAtTime(OUTPUT_GAIN, startAt);
  master.gain.setValueAtTime(OUTPUT_GAIN, startAt + FADE_START_SECONDS);
  master.gain.linearRampToValueAtTime(
    0.0001,
    startAt + BUBBLE_SYSTEM_MORNING_MUSIC_DURATION_SECONDS,
  );
  compressor.threshold.setValueAtTime(-17, startAt);
  compressor.knee.setValueAtTime(12, startAt);
  compressor.ratio.setValueAtTime(2.4, startAt);
  compressor.attack.setValueAtTime(0.005, startAt);
  compressor.release.setValueAtTime(0.18, startAt);
  presence.type = "peaking";
  presence.frequency.setValueAtTime(2800, startAt);
  presence.Q.setValueAtTime(0.78, startAt);
  presence.gain.setValueAtTime(1.6, startAt);
  highShelf.type = "highshelf";
  highShelf.frequency.setValueAtTime(5200, startAt);
  highShelf.gain.setValueAtTime(-1.8, startAt);
  outputFilter.type = "lowpass";
  outputFilter.frequency.setValueAtTime(11200, startAt);
  outputFilter.Q.setValueAtTime(0.45, startAt);

  master.connect(compressor);
  compressor.connect(presence);
  presence.connect(highShelf);
  highShelf.connect(outputFilter);
  outputFilter.connect(context.destination);

  const channels: RuntimeChannel[] = MORNING_MUSIC_CHANNELS.map((events, index) => ({
    destination: channelBuses[index],
    events,
    nextEvent: 0,
  }));

  const schedulePendingEvents = () => {
    if (disconnected) return;
    const horizon = context.currentTime + SCHEDULE_AHEAD_SECONDS;

    channels.forEach((channel, channelIndex) => {
      while (channel.nextEvent < channel.events.length) {
        const [startCentisecond, midiSixtyFourth, gateCentisecond, patchId] =
          channel.events[channel.nextEvent];
        const eventOffset = startCentisecond / 100 * TEMPO_SCALE;
        const noteStart = startAt + eventOffset;
        if (noteStart > horizon) break;

        const remainingTrackTime = BUBBLE_SYSTEM_MORNING_MUSIC_DURATION_SECONDS - eventOffset;
        const duration = Math.min(
          Math.max(0.025, gateCentisecond / 100 * TEMPO_SCALE - 0.008),
          remainingTrackTime,
        );
        if (duration > 0.01) {
          createBubbleSystemVoice(
            context,
            channel.destination,
            sources,
            bubbleWaves,
            x68000VgmMidiToFrequency(midiSixtyFourth / 64),
            noteStart,
            duration,
            channelIndex,
            patchId,
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
    (BUBBLE_SYSTEM_MORNING_MUSIC_DURATION_SECONDS + 0.7) * 1000,
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
