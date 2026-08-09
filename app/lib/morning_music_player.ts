import {
  BUBBLE_SYSTEM_BPM,
  BUBBLE_SYSTEM_CHANNELS,
  BUBBLE_SYSTEM_DURATION_BEATS,
} from "~/lib/bubble_system_morning_score";
import { midiToFrequency, trackScheduledSource } from "~/lib/fm_synth";

const SCHEDULE_AHEAD_SECONDS = 6;
const OUTPUT_GAIN = 1.35;
const SECONDS_PER_BEAT = 60 / BUBBLE_SYSTEM_BPM;
export const BUBBLE_SYSTEM_MORNING_MUSIC_DURATION_SECONDS =
  BUBBLE_SYSTEM_DURATION_BEATS * SECONDS_PER_BEAT;
const FADE_START_SECONDS = BUBBLE_SYSTEM_MORNING_MUSIC_DURATION_SECONDS - 2.8;

// K005289の2音を、32サンプル・4bitの独立した波形メモリとして再現する。
const K005289_WAVES = [
  [-7,-7,-6,-5,-3,-1,2,5,7,7,6,4,1,-2,-5,-7,-7,-5,-2,1,4,6,7,5,2,-1,-4,-6,-7,-5,-2,1],
  [-7,-5,-3,-1,1,3,5,7,6,4,2,0,-2,-4,-6,-7,-5,-2,1,4,7,5,2,-1,-4,-6,-4,-1,2,5,3,0],
] as const;

function createK005289Wave(context: AudioContext, samples: readonly number[]): PeriodicWave {
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

function scheduleHardwareVoice(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  waves: readonly PeriodicWave[],
  kind: (typeof BUBBLE_SYSTEM_CHANNELS)[number]["kind"],
  midiNote: number,
  startAt: number,
  duration: number,
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  const isPsg = kind === "psg";
  const release = isPsg ? 0.018 : 0.045;
  const peak = isPsg ? 0.072 : 0.058;
  const noteEnd = startAt + duration;
  const soundEnd = noteEnd + release;

  if (isPsg) {
    // AY-3-8910の矩形波。FM変調やステレオ化は行わない。
    oscillator.type = "square";
  } else {
    oscillator.setPeriodicWave(waves[kind === "wsg1" ? 0 : 1]);
  }
  oscillator.frequency.setValueAtTime(midiToFrequency(midiNote), startAt);

  // 実機の4bit音量段階に近い、立ち上がりの速いキーオン／キーオフ。
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(peak, startAt + 0.003);
  envelope.gain.setValueAtTime(peak, noteEnd);
  envelope.gain.exponentialRampToValueAtTime(0.0001, soundEnd);

  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(soundEnd + 0.015);
  trackScheduledSource(sources, oscillator, () => envelope.disconnect());
}

type RuntimeChannel = {
  destination: GainNode;
  kind: (typeof BUBBLE_SYSTEM_CHANNELS)[number]["kind"];
  notes: (typeof BUBBLE_SYSTEM_CHANNELS)[number]["notes"];
  nextNote: number;
};

export function playMorningMusic(context: AudioContext): () => void {
  const startAt = context.currentTime + 0.035;
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const highPass = context.createBiquadFilter();
  const outputFilter = context.createBiquadFilter();
  const sources: AudioScheduledSourceNode[] = [];
  const waves = K005289_WAVES.map((samples) => createK005289Wave(context, samples));
  const channelBuses = BUBBLE_SYSTEM_CHANNELS.map((channel) => {
    const bus = context.createGain();
    bus.gain.setValueAtTime(channel.gain, startAt);
    bus.connect(master);
    return bus;
  });
  let schedulerTimer: number | null = null;
  let disconnected = false;

  master.gain.setValueAtTime(OUTPUT_GAIN, startAt);
  master.gain.setValueAtTime(OUTPUT_GAIN, startAt + FADE_START_SECONDS);
  master.gain.linearRampToValueAtTime(
    0.0001,
    startAt + BUBBLE_SYSTEM_MORNING_MUSIC_DURATION_SECONDS,
  );
  compressor.threshold.setValueAtTime(-14, startAt);
  compressor.knee.setValueAtTime(8, startAt);
  compressor.ratio.setValueAtTime(3.4, startAt);
  compressor.attack.setValueAtTime(0.004, startAt);
  compressor.release.setValueAtTime(0.12, startAt);
  highPass.type = "highpass";
  highPass.frequency.setValueAtTime(72, startAt);
  highPass.Q.setValueAtTime(0.45, startAt);
  outputFilter.type = "lowpass";
  outputFilter.frequency.setValueAtTime(9800, startAt);
  outputFilter.Q.setValueAtTime(0.52, startAt);

  master.connect(compressor);
  compressor.connect(highPass);
  highPass.connect(outputFilter);
  outputFilter.connect(context.destination);

  const channels: RuntimeChannel[] = BUBBLE_SYSTEM_CHANNELS.map((channel, index) => ({
    destination: channelBuses[index],
    kind: channel.kind,
    notes: channel.notes,
    nextNote: 0,
  }));

  const schedulePendingNotes = () => {
    if (disconnected) return;
    const horizon = context.currentTime + SCHEDULE_AHEAD_SECONDS;

    channels.forEach((channel) => {
      while (channel.nextNote < channel.notes.length) {
        const [startBeat, midiNote, durationBeats] = channel.notes[channel.nextNote];
        const noteStart = startAt + startBeat * SECONDS_PER_BEAT;
        if (noteStart > horizon) break;

        scheduleHardwareVoice(
          context,
          channel.destination,
          sources,
          waves,
          channel.kind,
          midiNote,
          noteStart,
          Math.max(0.035, durationBeats * SECONDS_PER_BEAT - 0.012),
        );
        channel.nextNote += 1;
      }
    });

    if (channels.every((channel) => channel.nextNote === channel.notes.length)) {
      if (schedulerTimer !== null) window.clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  };

  schedulePendingNotes();
  schedulerTimer = window.setInterval(schedulePendingNotes, 500);

  const disconnectGraph = () => {
    if (disconnected) return;
    disconnected = true;
    channelBuses.forEach((bus) => bus.disconnect());
    master.disconnect();
    compressor.disconnect();
    highPass.disconnect();
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
