import { createFmVoice, midiToFrequency, type FmPatch } from "~/lib/fm_synth";

type NoteEvent = readonly [start: number, note: number, length: number];
type ArrangementDensity = "intro" | "light" | "full";

// 提供音源のオンセット間隔は約75 BPM。BEATは譜面上の八分音符1つ分。
const BPM = 75;
const BEAT = 60 / BPM / 2;
const HARMONY_BEATS = 4;
const FIRST_THEME_BEAT = 32;
const FIRST_FULL_BEAT = 64;
const INTERLUDE_BEAT = 176;
const SECOND_FULL_BEAT = 208;
const OUTRO_BEAT = 320;
const CODA_BEAT = 352;
const FINAL_CHORD_BEAT = 384;
const TRACK_BEATS = 394;
const TRACK_DURATION = TRACK_BEATS * BEAT;
const LEAD_ECHO_DELAY = BEAT / 4;
const SCHEDULE_AHEAD_SECONDS = 18;

const brassPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2.002, 1.003, 3.01],
  modulation: [1.06, 0, 0.58],
  waveforms: ["triangle", "sine", "sine", "sine"],
  filterFrequency: 5600,
  filterQ: 0.82,
  attack: 0.04,
  decay: 0.3,
  peakGain: 0.014,
  sustainGain: 0.008,
  release: 0.5,
};

const stringPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 2, 3, 4.005],
  modulation: [0.32, 0.14, 0.06],
  waveforms: ["sine", "sine", "triangle", "sine"],
  filterFrequency: 3900,
  filterQ: 0.56,
  attack: 0.11,
  decay: 0.52,
  peakGain: 0.0056,
  sustainGain: 0.0042,
  release: 0.78,
};

const bassPatch: FmPatch = {
  algorithm: "serial",
  ratios: [1, 1.002, 2, 3],
  modulation: [1.2, 0.62, 0.22],
  operatorCount: 2,
  waveforms: ["triangle", "sine", "sine", "sine"],
  filterFrequency: 2200,
  filterQ: 0.74,
  attack: 0.008,
  decay: 0.1,
  peakGain: 0.052,
  sustainGain: 0.022,
  release: 0.18,
};

const leadPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 1.998, 3.005, 4.01],
  modulation: [0.98, 0.44, 0.17],
  waveforms: ["triangle", "sine", "sine", "sine"],
  filterFrequency: 7600,
  filterQ: 0.92,
  attack: 0.022,
  decay: 0.24,
  peakGain: 0.025,
  sustainGain: 0.014,
  release: 0.58,
  vibratoRate: 5.15,
  vibratoCents: 6,
};

const softLeadPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2.003, 1.004, 3.01],
  modulation: [0.62, 0, 0.28],
  waveforms: ["sine", "triangle", "sine", "sine"],
  filterFrequency: 5400,
  filterQ: 0.7,
  attack: 0.035,
  decay: 0.3,
  peakGain: 0.012,
  sustainGain: 0.007,
  release: 0.66,
  vibratoRate: 5.05,
  vibratoCents: 4.2,
};

const leadEchoPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 2.004, 2.997, 4.02],
  modulation: [0.78, 0.34, 0.12],
  waveforms: ["sine", "sine", "triangle", "sine"],
  filterFrequency: 6400,
  filterQ: 0.68,
  attack: 0.032,
  decay: 0.3,
  peakGain: 0.0095,
  sustainGain: 0.0052,
  release: 0.68,
  vibratoRate: 5,
  vibratoCents: 4.5,
};

const arpeggioPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2.01, 3.002, 5.01],
  modulation: [0.76, 0, 0.44],
  waveforms: ["sine", "sine", "triangle", "sine"],
  filterFrequency: 9100,
  filterQ: 1.05,
  attack: 0.006,
  decay: 0.1,
  peakGain: 0.0068,
  sustainGain: 0.0018,
  release: 0.18,
};

const counterPatch: FmPatch = {
  algorithm: "fan",
  ratios: [1, 2.002, 3, 4.008],
  modulation: [0.68, 0.3, 0.13],
  waveforms: ["sine", "triangle", "sine", "sine"],
  filterFrequency: 6200,
  filterQ: 0.72,
  attack: 0.038,
  decay: 0.26,
  peakGain: 0.0085,
  sustainGain: 0.0046,
  release: 0.48,
  vibratoRate: 4.85,
  vibratoCents: 3.4,
};

const bellPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 2.5, 4.01, 7.02],
  modulation: [1.56, 0, 1.82],
  waveforms: ["sine", "sine", "sine", "sine"],
  filterFrequency: 11200,
  filterQ: 1.1,
  attack: 0.003,
  decay: 0.08,
  peakGain: 0.01,
  sustainGain: 0.001,
  release: 0.82,
};

const finalPatch: FmPatch = {
  algorithm: "dual",
  ratios: [1, 3.002, 1.004, 2.01],
  modulation: [1.42, 0, 0.66],
  waveforms: ["triangle", "sine", "sine", "sine"],
  filterFrequency: 6800,
  filterQ: 0.76,
  attack: 0.018,
  decay: 0.28,
  peakGain: 0.019,
  sustainGain: 0.011,
  release: 1.25,
};

const harmonies = {
  am: {
    bass: [55, 82.41],
    notes: [110, 130.81, 164.81],
    arpeggio: [110, 164.81, 220, 261.63],
    bells: [880, 1318.51],
  },
  dm: {
    bass: [73.42, 110],
    notes: [146.83, 174.61, 220],
    arpeggio: [146.83, 220, 293.66, 349.23],
    bells: [880, 1174.66],
  },
  e7: {
    bass: [82.41, 123.47],
    notes: [164.81, 207.65, 246.94, 293.66],
    arpeggio: [164.81, 246.94, 329.63, 415.3],
    bells: [987.77, 1244.51],
  },
} as const;

const chordProgression = [
  harmonies.am, harmonies.am, harmonies.e7, harmonies.e7,
  harmonies.am, harmonies.dm, harmonies.e7, harmonies.e7,
  harmonies.am, harmonies.am, harmonies.dm, harmonies.dm,
  harmonies.am, harmonies.e7, harmonies.am, harmonies.am,
  harmonies.am, harmonies.am, harmonies.dm, harmonies.dm,
  harmonies.am, harmonies.e7, harmonies.am, harmonies.am,
] as const;

// ロシア語版「Вот мчится тройка почтовая」の旋律。
// [開始位置（八分音符単位）, MIDIノート, 長さ]
const leadSequence: readonly NoteEvent[] = [
  [0, 64, 1], [1, 69, 3], [4, 69, 1], [5, 69, 1], [6, 69, 1], [7, 68, 1],
  [8, 69, 1], [9, 71, 3], [12, 68, 1], [13, 64, 2],
  [16, 64, 1], [17, 72, 2], [19, 69, 2], [21, 60, 1], [22, 60, 1], [23, 62, 1],
  [24, 62, 1], [25, 64, 6],
  [32, 64, 1], [33, 69, 3], [36, 71, 1], [37, 72, 1], [38, 71, 1], [39, 69, 1],
  [40, 67, 1], [41, 62, 3], [44, 65, 1], [45, 69, 2], [47, 71, 1],
  [48, 69, 1], [49, 64, 3], [52, 65, 1], [53, 64, 1], [54, 62, 1], [55, 60, 1],
  [56, 59, 1], [57, 57, 4],
  [64, 64, 1], [65, 69, 3], [68, 71, 1], [69, 72, 1], [70, 71, 1], [71, 69, 1],
  [72, 67, 1], [73, 62, 3], [76, 65, 1], [77, 69, 2], [79, 71, 1],
  [80, 69, 1], [81, 64, 3], [84, 65, 1], [85, 64, 1], [86, 62, 1], [87, 60, 1],
  [88, 59, 1], [89, 57, 4],
];

const cadenceSequence: readonly NoteEvent[] = [
  [0, 69, 3], [3, 64, 3], [6, 65, 2], [8, 64, 2],
  [10, 62, 2], [12, 59, 2], [14, 57, 2],
];

const codaSequence: readonly NoteEvent[] = [
  [0, 69, 4], [4, 72, 4], [8, 71, 4], [12, 69, 8],
  [20, 64, 4], [24, 67, 4], [28, 69, 10],
];

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.3), context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0;
  for (let index = 0; index < data.length; index += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.64 + white * 0.36;
    data[index] = previous;
  }
  return buffer;
}

function createNoiseHit(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  noiseBuffer: AudioBuffer,
  startAt: number,
  duration: number,
  frequency: number,
  gain: number,
  type: BiquadFilterType,
): void {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  source.buffer = noiseBuffer;
  filter.type = type;
  filter.frequency.setValueAtTime(frequency, startAt);
  filter.Q.setValueAtTime(type === "bandpass" ? 0.9 : 0.48, startAt);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.linearRampToValueAtTime(gain, startAt + 0.005);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  source.connect(filter);
  filter.connect(envelope);
  envelope.connect(destination);
  source.start(startAt);
  source.stop(startAt + duration);
  sources.push(source);
}

function createKick(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  startAt: number,
  gain = 0.1,
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(142, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(46, startAt + 0.17);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.004);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.2);
  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.21);
  sources.push(oscillator);
}

function createTom(
  context: AudioContext,
  destination: AudioNode,
  sources: AudioScheduledSourceNode[],
  startAt: number,
  frequency: number,
  gain: number,
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.56, startAt + 0.16);
  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.005);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.2);
  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + 0.21);
  sources.push(oscillator);
}

function createFourBitCurve(): Float32Array {
  const curve = new Float32Array(256);
  const maxFourBitValue = 15;
  for (let index = 0; index < curve.length; index += 1) {
    const input = index / (curve.length - 1) * 2 - 1;
    const normalized = (input + 1) / 2;
    curve[index] = Math.round(normalized * maxFourBitValue) / maxFourBitValue * 2 - 1;
  }
  return curve;
}

function getDensity(beat: number): ArrangementDensity {
  if (beat < FIRST_THEME_BEAT) return "intro";
  if (beat < FIRST_FULL_BEAT) return "light";
  if (beat < INTERLUDE_BEAT) return "full";
  if (beat < SECOND_FULL_BEAT) return "light";
  if (beat < OUTRO_BEAT) return "full";
  return "light";
}

export function playOpmTrack(context: AudioContext): () => void {
  const startAt = context.currentTime + 0.04;
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const fmBus = context.createGain();
  const percussionBus = context.createGain();
  const toneFilter = context.createBiquadFilter();
  const quantizer = context.createWaveShaper();
  const noiseBuffer = createNoiseBuffer(context);
  const sources: AudioScheduledSourceNode[] = [];
  let disconnected = false;

  master.gain.setValueAtTime(0.46, startAt);
  compressor.threshold.setValueAtTime(-15, startAt);
  compressor.knee.setValueAtTime(18, startAt);
  compressor.ratio.setValueAtTime(3.1, startAt);
  compressor.attack.setValueAtTime(0.009, startAt);
  compressor.release.setValueAtTime(0.24, startAt);
  fmBus.gain.setValueAtTime(0.82, startAt);
  percussionBus.gain.setValueAtTime(0.31, startAt);
  toneFilter.type = "lowpass";
  toneFilter.frequency.setValueAtTime(12200, startAt);
  toneFilter.Q.setValueAtTime(0.68, startAt);
  quantizer.curve = createFourBitCurve();
  quantizer.oversample = "none";

  fmBus.connect(toneFilter);
  toneFilter.connect(master);
  percussionBus.connect(quantizer);
  quantizer.connect(master);
  master.connect(compressor);
  compressor.connect(context.destination);

  const scheduleHarmonySegment = (segmentIndex: number) => {
    const beatOffset = segmentIndex * HARMONY_BEATS;
    const segmentStart = startAt + beatOffset * BEAT;
    const chord = chordProgression[segmentIndex % chordProgression.length];
    const density = getDensity(beatOffset);
    const chordPatch = density === "full" ? brassPatch : stringPatch;
    const noteDuration = (density === "intro" ? 3.88 : 3.62) * BEAT;

    chord.notes.forEach((frequency, noteIndex) => {
      createFmVoice(
        context,
        fmBus,
        sources,
        frequency,
        segmentStart,
        noteDuration,
        (noteIndex - (chord.notes.length - 1) / 2) * 0.27,
        chordPatch,
        noteIndex % 2 === 0 ? -2.2 : 2.2,
      );
    });

    const bassSteps = density === "intro" ? 1 : 2;
    chord.bass.slice(0, bassSteps).forEach((frequency, step) => {
      createFmVoice(
        context,
        fmBus,
        sources,
        frequency,
        segmentStart + step * 2 * BEAT,
        (density === "intro" ? 3.72 : 1.68) * BEAT,
        step % 2 === 0 ? -0.08 : 0.08,
        bassPatch,
      );
    });

    const arpeggioStep = density === "full" ? 0.5 : density === "light" ? 1 : 2;
    const arpeggioCount = Math.round(HARMONY_BEATS / arpeggioStep);
    for (let step = 0; step < arpeggioCount; step += 1) {
      const frequency = chord.arpeggio[step % chord.arpeggio.length];
      createFmVoice(
        context,
        fmBus,
        sources,
        frequency,
        segmentStart + step * arpeggioStep * BEAT,
        arpeggioStep * BEAT * 0.72,
        step % 2 === 0 ? -0.55 : 0.55,
        arpeggioPatch,
        step % 2 === 0 ? -2.8 : 2.8,
      );
    }

    if (density === "full") {
      createFmVoice(
        context,
        fmBus,
        sources,
        chord.notes[1] * 2,
        segmentStart,
        3.7 * BEAT,
        segmentIndex % 2 === 0 ? 0.32 : -0.32,
        counterPatch,
      );
      if (segmentIndex % 2 === 0) {
        createFmVoice(
          context,
          fmBus,
          sources,
          chord.bells[segmentIndex % chord.bells.length],
          segmentStart + (segmentIndex % 4 === 0 ? 1 : 3) * BEAT,
          0.85 * BEAT,
          segmentIndex % 4 === 0 ? -0.7 : 0.7,
          bellPatch,
        );
      }
    }
  };

  const scheduleLeadEvents = (
    sequence: readonly NoteEvent[],
    startBeat: number,
    patch: FmPatch,
    full: boolean,
  ) => {
    sequence.forEach(([beatOffset, midiNote, durationInBeats], index) => {
      const noteStart = startAt + (startBeat + beatOffset) * BEAT;
      const noteDuration = durationInBeats * BEAT;
      const leadPan = index % 2 === 0 ? -0.18 : 0.12;
      createFmVoice(
        context,
        fmBus,
        sources,
        midiToFrequency(midiNote),
        noteStart,
        noteDuration,
        leadPan,
        patch,
      );
      createFmVoice(
        context,
        fmBus,
        sources,
        midiToFrequency(midiNote),
        noteStart + LEAD_ECHO_DELAY,
        noteDuration,
        leadPan < 0 ? 0.42 : -0.42,
        leadEchoPatch,
        leadPan < 0 ? 4.2 : -4.2,
      );
      if (full && beatOffset >= 32) {
        createFmVoice(
          context,
          fmBus,
          sources,
          midiToFrequency(midiNote - 12),
          noteStart,
          noteDuration,
          index % 2 === 0 ? 0.3 : -0.3,
          counterPatch,
          index % 2 === 0 ? -2 : 2,
        );
      }
    });
  };

  const previewSequence = leadSequence.filter(([beatOffset]) => beatOffset < 32);
  const outroSequence: readonly NoteEvent[] = leadSequence
    .filter(([beatOffset]) => beatOffset >= 64)
    .map(([beatOffset, note, length]) => [beatOffset - 64, note, length] as const);
  const melodySections = [
    { startBeat: FIRST_THEME_BEAT, sequence: previewSequence, patch: softLeadPatch, full: false },
    { startBeat: FIRST_FULL_BEAT, sequence: leadSequence, patch: leadPatch, full: true },
    { startBeat: 160, sequence: cadenceSequence, patch: leadPatch, full: true },
    { startBeat: INTERLUDE_BEAT, sequence: previewSequence, patch: softLeadPatch, full: false },
    { startBeat: SECOND_FULL_BEAT, sequence: leadSequence, patch: leadPatch, full: true },
    { startBeat: 304, sequence: cadenceSequence, patch: leadPatch, full: true },
    { startBeat: OUTRO_BEAT, sequence: outroSequence, patch: softLeadPatch, full: false },
  ] as const;

  const schedulePercussionBlock = (blockStartBeat: number, blockIndex: number) => {
    for (let halfBeat = 0; halfBeat < 32; halfBeat += 1) {
      const beatPosition = halfBeat / 2;
      const hitAt = startAt + (blockStartBeat + beatPosition) * BEAT;
      if (halfBeat % 8 === 0) {
        createKick(context, percussionBus, sources, hitAt, halfBeat === 0 ? 0.12 : 0.085);
      }
      if (halfBeat % 8 === 4) {
        createNoiseHit(context, percussionBus, sources, noiseBuffer, hitAt, 0.16, 1450, 0.044, "bandpass");
        createNoiseHit(context, percussionBus, sources, noiseBuffer, hitAt + 0.01, 0.1, 3700, 0.014, "bandpass");
      }
      createNoiseHit(
        context,
        percussionBus,
        sources,
        noiseBuffer,
        hitAt,
        halfBeat % 8 === 6 ? 0.11 : 0.045,
        halfBeat % 4 === 0 ? 7200 : 10100,
        halfBeat % 8 === 6 ? 0.008 : 0.0045,
        "highpass",
      );
    }
    if (blockIndex % 4 === 3) {
      [158, 126, 98].forEach((frequency, index) => {
        createTom(
          context,
          percussionBus,
          sources,
          startAt + (blockStartBeat + 13 + index * 1.25) * BEAT,
          frequency,
          0.052 - index * 0.006,
        );
      });
    }
  };

  const percussionBlocks = [
    ...Array.from({ length: 7 }, (_, index) => FIRST_FULL_BEAT + index * 16),
    ...Array.from({ length: 7 }, (_, index) => SECOND_FULL_BEAT + index * 16),
  ];

  const scheduleCoda = () => {
    scheduleLeadEvents(codaSequence, CODA_BEAT, softLeadPatch, false);
    const finalStart = startAt + FINAL_CHORD_BEAT * BEAT;
    [45, 57, 60, 64, 69].forEach((note, index) => {
      createFmVoice(
        context,
        fmBus,
        sources,
        midiToFrequency(note),
        finalStart,
        8 * BEAT,
        (index - 2) * 0.25,
        finalPatch,
        (index - 2) * 1.6,
      );
    });
    createKick(context, percussionBus, sources, finalStart, 0.09);
    createNoiseHit(context, percussionBus, sources, noiseBuffer, finalStart, 0.45, 4900, 0.035, "highpass");
  };

  const harmonySegmentCount = CODA_BEAT / HARMONY_BEATS;
  let nextHarmonySegment = 0;
  let nextMelodySection = 0;
  let nextPercussionBlock = 0;
  let codaScheduled = false;
  let schedulerTimer: number | null = null;

  const schedulePendingEvents = () => {
    if (disconnected) return;
    const horizon = context.currentTime + SCHEDULE_AHEAD_SECONDS;

    while (
      nextHarmonySegment < harmonySegmentCount
      && startAt + nextHarmonySegment * HARMONY_BEATS * BEAT <= horizon
    ) {
      scheduleHarmonySegment(nextHarmonySegment);
      nextHarmonySegment += 1;
    }

    while (
      nextMelodySection < melodySections.length
      && startAt + melodySections[nextMelodySection].startBeat * BEAT <= horizon
    ) {
      const section = melodySections[nextMelodySection];
      scheduleLeadEvents(section.sequence, section.startBeat, section.patch, section.full);
      nextMelodySection += 1;
    }

    while (
      nextPercussionBlock < percussionBlocks.length
      && startAt + percussionBlocks[nextPercussionBlock] * BEAT <= horizon
    ) {
      schedulePercussionBlock(percussionBlocks[nextPercussionBlock], nextPercussionBlock);
      nextPercussionBlock += 1;
    }

    if (!codaScheduled && startAt + CODA_BEAT * BEAT <= horizon) {
      scheduleCoda();
      codaScheduled = true;
    }

    if (
      nextHarmonySegment === harmonySegmentCount
      && nextMelodySection === melodySections.length
      && nextPercussionBlock === percussionBlocks.length
      && codaScheduled
      && schedulerTimer !== null
    ) {
      window.clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  };

  schedulePendingEvents();
  schedulerTimer = window.setInterval(schedulePendingEvents, 750);

  const fadeStart = startAt + (TRACK_BEATS - 12) * BEAT;
  master.gain.setValueAtTime(0.46, fadeStart);
  master.gain.exponentialRampToValueAtTime(0.0001, startAt + TRACK_DURATION);

  const disconnectGraph = () => {
    if (disconnected) return;
    disconnected = true;
    fmBus.disconnect();
    percussionBus.disconnect();
    toneFilter.disconnect();
    quantizer.disconnect();
    master.disconnect();
    compressor.disconnect();
  };
  const cleanupTimer = window.setTimeout(disconnectGraph, (TRACK_DURATION + 0.3) * 1000);

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
