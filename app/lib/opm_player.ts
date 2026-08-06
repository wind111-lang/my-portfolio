import {
  createFmVoice,
  type FmPatch,
  x68000VgmMidiToFrequency,
} from "~/lib/fm_synth";
import {
  ARPEGGIO_BLOCK_ORDER,
  ARPEGGIO_PATTERN_A,
  ARPEGGIO_PATTERN_B,
  ARPEGGIO_PATTERN_C,
  BASS_FIRST_NOTES,
  BASS_RETURN_NOTES,
  CENTER_LEAD_EVENTS,
  CHORD_CHANNEL_3_NOTES,
  CHORD_CHANNEL_4_NOTES,
  CHORD_CHANNEL_5_NOTES,
  STEREO_LEAD_EVENTS,
  type VgmNoteEvent,
} from "~/lib/opm_vgm_score";

const VGM_STEP_SECONDS = 0.1;
const VGM_FIRST_NOTE_SECONDS = 0.75;
const VGM_KEY_FRACTION_SEMITONES = 5 / 64;
const VGM_LOOP_START_STEP = 386;
const VGM_LOOP_LENGTH_STEP = 576;
const VGM_SCORE_END_STEP = 962;
const TRACK_DURATION_SECONDS = 137.99;
const FADE_START_SECONDS = 128.8;
const OUTPUT_GAIN = 0.92;
const SCHEDULE_AHEAD_SECONDS = 5;

// VGM channel 0: CON=2 / FB=7 / MUL=2,9,1,1 / TL=36,32,55,8。
// M1/C1/M2/C2の接続と倍率を原ログのまま保つ高音主旋律。
const stereoLeadPatch: FmPatch = {
  algorithm: 2,
  ratios: [2, 9, 1, 1],
  modulation: [0, 0, 0],
  operatorModulation: [0.84, 1.38, 0.5, 0],
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [0, 0, 0, 0],
  carrierGains: [0, 0, 0, 1],
  filterFrequency: 14200,
  filterStartFrequency: 5800,
  filterAttack: 0.028,
  filterQ: 0.62,
  attack: 0.014,
  decay: 0.24,
  peakGain: 0.019,
  sustainGain: 0.0105,
  release: 0.2,
  vibratoRate: 5.15,
  vibratoCents: 5.2,
};

// VGM channel 6はchannel 0を0.1秒遅らせ、C2のTLを13段下げた片側成分。
const stereoLeadDelayPatch: FmPatch = {
  ...stereoLeadPatch,
  peakGain: 0.0063,
  sustainGain: 0.0035,
  release: 0.22,
};

// VGM channel 2: CON=2 / FB=7 / MUL=1,5,1,1 / TL=34,45,50,14。
// 12.8秒から入る中央主旋律で、ステレオ主旋律より丸い音色を担当する。
const centerLeadPatch: FmPatch = {
  algorithm: 2,
  ratios: [1, 5, 1, 1],
  modulation: [0, 0, 0],
  operatorModulation: [0.96, 0.66, 0.46, 0],
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [0, 0, 0, 0],
  carrierGains: [0, 0, 0, 1],
  filterFrequency: 11200,
  filterStartFrequency: 4100,
  filterAttack: 0.05,
  filterQ: 0.7,
  pitchAttackCents: -5,
  pitchAttackTime: 0.04,
  attack: 0.024,
  decay: 0.3,
  peakGain: 0.016,
  sustainGain: 0.0088,
  release: 0.25,
};

// VGM channel 1: CON=3 / MUL=6,0.5,0.5,1。
// 0.4秒刻みの短いOPM低音で、人工キックは重ねない。
const bassPatch: FmPatch = {
  algorithm: 3,
  ratios: [6, 0.5, 0.5, 1],
  modulation: [0, 0, 0],
  operatorModulation: [0.52, 0.72, 0.42, 0],
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [-3.5, 0, 0, 4.5],
  carrierGains: [0, 0, 0, 1],
  filterFrequency: 3600,
  filterStartFrequency: 1250,
  filterAttack: 0.018,
  filterQ: 0.88,
  pitchAttackCents: 7,
  pitchAttackTime: 0.022,
  attack: 0.004,
  decay: 0.105,
  peakGain: 0.021,
  sustainGain: 0.0048,
  release: 0.1,
};

// VGM channels 3-5: 同一のCON=3 / FB=5 / MUL=6,4,1,1。
// 左・中央・右で異なる音程を短く鳴らし、原曲のサビの三声を作る。
const chordPulsePatch: FmPatch = {
  algorithm: 3,
  ratios: [6, 4, 1, 1],
  modulation: [0, 0, 0],
  operatorModulation: [0.34, 0.52, 0.66, 0],
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [4.2, -1.8, -1.8, 4.2],
  carrierGains: [0, 0, 0, 1],
  filterFrequency: 8600,
  filterStartFrequency: 3000,
  filterAttack: 0.022,
  filterQ: 0.68,
  attack: 0.006,
  decay: 0.12,
  peakGain: 0.0088,
  sustainGain: 0.0027,
  release: 0.12,
  vibratoRate: 5.15,
  vibratoCents: 2.2,
};

// VGM channel 7: CON=5 / FB=7 / MUL=1,12,3,1。
// 冒頭から連続する「タッタカ」はADPCMではなく、この高速OPMアルペジオ。
const arpeggioPatch: FmPatch = {
  algorithm: 5,
  ratios: [1, 12, 3, 1],
  modulation: [0, 0, 0],
  operatorModulation: [1.04, 0, 0, 0],
  waveforms: ["sine", "sine", "sine", "sine"],
  operatorDetuneCents: [-1.8, 0, 4.2, 0],
  carrierGains: [0, 0.018, 0.042, 1],
  filterFrequency: 9600,
  filterStartFrequency: 3900,
  filterAttack: 0.012,
  filterQ: 0.72,
  attack: 0.003,
  decay: 0.1,
  peakGain: 0.0145,
  sustainGain: 0.0025,
  release: 0.09,
};

function createPulseEvents(
  startStep: number,
  intervalSteps: number,
  notes: readonly number[],
  gateSteps = 2,
): VgmNoteEvent[] {
  return notes.map((note, index) => [
    startStep + index * intervalSteps,
    note,
    gateSteps,
  ] as const);
}

function createArpeggioEvents(): VgmNoteEvent[] {
  const patterns = {
    A: ARPEGGIO_PATTERN_A,
    B: ARPEGGIO_PATTERN_B,
    C: ARPEGGIO_PATTERN_C,
  } as const;

  return [...ARPEGGIO_BLOCK_ORDER].flatMap((patternName, blockIndex) =>
    patterns[patternName as keyof typeof patterns].map((note, noteIndex) => [
      blockIndex * 64 + noteIndex * 2,
      note,
      2,
    ] as const),
  );
}

function offsetEvents(
  events: readonly VgmNoteEvent[],
  stepOffset: number,
): VgmNoteEvent[] {
  return events.map(([startStep, note, gateSteps]) => {
    const shiftedStart = startStep + stepOffset;
    return [
      shiftedStart,
      note,
      Math.min(gateSteps, VGM_SCORE_END_STEP - shiftedStart),
    ] as const;
  });
}

function appendPartialLoop(events: readonly VgmNoteEvent[]): VgmNoteEvent[] {
  const loopedEvents = events
    .filter(([startStep]) => startStep >= VGM_LOOP_START_STEP)
    .map(([startStep, note, gateSteps]) => [
      startStep + VGM_LOOP_LENGTH_STEP,
      note,
      gateSteps,
    ] as const)
    .filter(([startStep]) =>
      VGM_FIRST_NOTE_SECONDS + startStep * VGM_STEP_SECONDS < TRACK_DURATION_SECONDS,
    );
  return [...events, ...loopedEvents];
}

const bassEvents = [
  ...createPulseEvents(256, 4, BASS_FIRST_NOTES),
  ...createPulseEvents(832, 4, BASS_RETURN_NOTES),
];

const baseChannelEvents = [
  STEREO_LEAD_EVENTS,
  bassEvents,
  CENTER_LEAD_EVENTS,
  createPulseEvents(386, 4, CHORD_CHANNEL_3_NOTES),
  createPulseEvents(386, 4, CHORD_CHANNEL_4_NOTES),
  createPulseEvents(386, 4, CHORD_CHANNEL_5_NOTES),
  offsetEvents(STEREO_LEAD_EVENTS, 1),
  createArpeggioEvents(),
] as const;

const channelEvents = baseChannelEvents.map(appendPartialLoop);

type RuntimeChannel = {
  events: readonly VgmNoteEvent[];
  patch: FmPatch;
  destination: AudioNode;
  pan: number;
  nextEvent: number;
};

export function playOpmTrack(context: AudioContext): () => void {
  const startAt = context.currentTime + 0.04;
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const outputFilter = context.createBiquadFilter();
  const leadPresence = context.createBiquadFilter();
  const leadBus = context.createGain();
  const bassBus = context.createGain();
  const harmonyBus = context.createGain();
  const arpeggioBus = context.createGain();
  const sources: AudioScheduledSourceNode[] = [];
  let schedulerTimer: number | null = null;
  let disconnected = false;

  master.gain.setValueAtTime(OUTPUT_GAIN, startAt);
  compressor.threshold.setValueAtTime(-15, startAt);
  compressor.knee.setValueAtTime(14, startAt);
  compressor.ratio.setValueAtTime(2.2, startAt);
  compressor.attack.setValueAtTime(0.006, startAt);
  compressor.release.setValueAtTime(0.2, startAt);
  outputFilter.type = "lowpass";
  outputFilter.frequency.setValueAtTime(15200, startAt);
  outputFilter.Q.setValueAtTime(0.5, startAt);
  leadPresence.type = "peaking";
  leadPresence.frequency.setValueAtTime(5900, startAt);
  leadPresence.Q.setValueAtTime(0.72, startAt);
  leadPresence.gain.setValueAtTime(2.4, startAt);
  leadBus.gain.setValueAtTime(1, startAt);
  bassBus.gain.setValueAtTime(0.92, startAt);
  harmonyBus.gain.setValueAtTime(0.86, startAt);
  arpeggioBus.gain.setValueAtTime(0.82, startAt);

  leadBus.connect(leadPresence);
  leadPresence.connect(master);
  bassBus.connect(master);
  harmonyBus.connect(master);
  arpeggioBus.connect(master);
  master.connect(compressor);
  compressor.connect(outputFilter);
  outputFilter.connect(context.destination);

  const channels: RuntimeChannel[] = [
    { events: channelEvents[0], patch: stereoLeadPatch, destination: leadBus, pan: -0.72, nextEvent: 0 },
    { events: channelEvents[1], patch: bassPatch, destination: bassBus, pan: 0, nextEvent: 0 },
    { events: channelEvents[2], patch: centerLeadPatch, destination: leadBus, pan: 0, nextEvent: 0 },
    { events: channelEvents[3], patch: chordPulsePatch, destination: harmonyBus, pan: -0.68, nextEvent: 0 },
    { events: channelEvents[4], patch: chordPulsePatch, destination: harmonyBus, pan: 0, nextEvent: 0 },
    { events: channelEvents[5], patch: chordPulsePatch, destination: harmonyBus, pan: 0.68, nextEvent: 0 },
    { events: channelEvents[6], patch: stereoLeadDelayPatch, destination: leadBus, pan: 0.72, nextEvent: 0 },
    { events: channelEvents[7], patch: arpeggioPatch, destination: arpeggioBus, pan: 0, nextEvent: 0 },
  ];

  const schedulePendingEvents = () => {
    if (disconnected) return;
    const horizon = context.currentTime + SCHEDULE_AHEAD_SECONDS;

    channels.forEach((channel) => {
      while (channel.nextEvent < channel.events.length) {
        const [startStep, midiNote, gateSteps] = channel.events[channel.nextEvent];
        const eventOffset = VGM_FIRST_NOTE_SECONDS + startStep * VGM_STEP_SECONDS;
        const noteStart = startAt + eventOffset;
        if (noteStart > horizon) break;

        const remainingTrackTime = TRACK_DURATION_SECONDS - eventOffset;
        const vgmGate = Math.max(0.04, gateSteps * VGM_STEP_SECONDS - 0.01);
        const duration = Math.min(vgmGate, remainingTrackTime);
        if (duration > 0.01) {
          createFmVoice(
            context,
            channel.destination,
            sources,
            x68000VgmMidiToFrequency(midiNote + VGM_KEY_FRACTION_SEMITONES),
            noteStart,
            duration,
            channel.pan,
            channel.patch,
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
  master.gain.linearRampToValueAtTime(0.0001, startAt + TRACK_DURATION_SECONDS);

  const disconnectGraph = () => {
    if (disconnected) return;
    disconnected = true;
    leadBus.disconnect();
    bassBus.disconnect();
    harmonyBus.disconnect();
    arpeggioBus.disconnect();
    leadPresence.disconnect();
    master.disconnect();
    compressor.disconnect();
    outputFilter.disconnect();
  };
  const cleanupTimer = window.setTimeout(
    disconnectGraph,
    (TRACK_DURATION_SECONDS + 0.5) * 1000,
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
