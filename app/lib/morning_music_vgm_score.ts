// X68000版『出たな!!ツインビー』の「Morning Music (Load BGM)」VGMから
// スプラッシュ〜ドライバ読み込み用の冒頭4.58秒を抽出したYM2151イベント。
// 元VGZは同梱せず、44.1kHzログを10ms・1/64半音単位へ量子化して保持する。
// VGM 1.51 / YM2151 4MHz / 8ch / 75 notes / 8 patches。
// このトラックではOKIM6258への書き込みはなく、全パートがOPMで構成される。
// Source SHA-256: d8f01734a4e011f2a1f4608f617d7b76dc734fa95b06278bb61d6b82d9291d67
export type MorningMusicEvent = readonly [
  startCentisecond: number,
  midiSixtyFourth: number,
  gateCentisecond: number,
  patchId: number,
];

export type MorningMusicPatch = {
  algorithm: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  feedback: number;
  pan: number;
  ratios: readonly [number, number, number, number];
  detune1: readonly [number, number, number, number];
  totalLevels: readonly [number, number, number, number];
  attackRates: readonly [number, number, number, number];
  decayRates: readonly [number, number, number, number];
  sustainRates: readonly [number, number, number, number];
  sustainLevels: readonly [number, number, number, number];
  releaseRates: readonly [number, number, number, number];
};

export const MORNING_MUSIC_DURATION_SECONDS = 4.58;

export const MORNING_MUSIC_PATCHES: readonly MorningMusicPatch[] = [
  {
    algorithm: 0, feedback: 7, pan: 3,
    ratios: [2,1,2,2],
    detune1: [7,0,3,0],
    totalLevels: [12,59,39,7],
    attackRates: [18,17,11,15],
    decayRates: [14,16,4,4],
    sustainRates: [3,2,0,0],
    sustainLevels: [6,5,2,0],
    releaseRates: [5,5,5,6],
  },
  {
    algorithm: 4, feedback: 0, pan: 3,
    ratios: [7,1,1,1],
    detune1: [7,3,3,7],
    totalLevels: [49,25,31,25],
    attackRates: [31,31,27,27],
    decayRates: [6,11,4,4],
    sustainRates: [4,8,3,3],
    sustainLevels: [3,2,2,2],
    releaseRates: [6,4,3,4],
  },
  {
    algorithm: 0, feedback: 7, pan: 2,
    ratios: [2,1,2,2],
    detune1: [7,0,3,0],
    totalLevels: [12,59,39,15],
    attackRates: [18,17,11,15],
    decayRates: [14,16,4,4],
    sustainRates: [3,2,0,0],
    sustainLevels: [6,5,2,0],
    releaseRates: [5,5,5,6],
  },
  {
    algorithm: 4, feedback: 5, pan: 3,
    ratios: [2,2,2,2],
    detune1: [7,7,3,3],
    totalLevels: [25,14,23,14],
    attackRates: [31,15,31,15],
    decayRates: [1,3,1,3],
    sustainRates: [1,1,1,1],
    sustainLevels: [1,2,1,2],
    releaseRates: [0,7,0,7],
  },
  {
    algorithm: 4, feedback: 5, pan: 2,
    ratios: [2,2,2,2],
    detune1: [7,7,3,3],
    totalLevels: [25,22,23,22],
    attackRates: [31,15,31,15],
    decayRates: [1,3,1,3],
    sustainRates: [1,1,1,1],
    sustainLevels: [1,2,1,2],
    releaseRates: [0,7,0,7],
  },
  {
    algorithm: 6, feedback: 0, pan: 1,
    ratios: [2,2,2,1],
    detune1: [1,1,2,1],
    totalLevels: [56,17,17,13],
    attackRates: [10,12,12,18],
    decayRates: [0,0,0,0],
    sustainRates: [2,4,2,0],
    sustainLevels: [0,0,2,2],
    releaseRates: [5,5,3,6],
  },
  {
    algorithm: 4, feedback: 7, pan: 3,
    ratios: [2,2,1,2],
    detune1: [3,3,5,0],
    totalLevels: [27,24,18,24],
    attackRates: [31,31,31,31],
    decayRates: [7,31,7,31],
    sustainRates: [0,0,0,0],
    sustainLevels: [1,0,1,0],
    releaseRates: [4,7,5,7],
  },
  {
    algorithm: 4, feedback: 5, pan: 3,
    ratios: [2,2,2,2],
    detune1: [7,7,3,3],
    totalLevels: [25,37,23,37],
    attackRates: [31,15,31,15],
    decayRates: [1,3,1,3],
    sustainRates: [1,1,1,1],
    sustainLevels: [1,2,1,2],
    releaseRates: [0,7,0,7],
  },
] as const;

export const MORNING_MUSIC_CHANNELS: readonly (readonly MorningMusicEvent[])[] = [
  [ // YM2151 channel 0: 10 events
    [51, 2048, 49, 3], [103, 1792, 48, 3], [155, 1920, 47, 3], [205, 1728, 48, 3], [256, 1792, 48, 3],
    [307, 1408, 47, 3], [357, 1472, 23, 3], [383, 1600, 23, 3], [409, 1728, 23, 3], [434, 1472, 24, 3],
  ],
  [ // YM2151 channel 1: 15 events
    [0, 3776, 25, 0], [51, 4096, 22, 0], [78, 4224, 21, 0], [103, 4352, 20, 0], [129, 4096, 20, 0],
    [155, 4416, 61, 0], [231, 4352, 9, 0], [243, 4224, 10, 0], [256, 4352, 21, 0], [281, 4096, 20, 0],
    [307, 3904, 20, 0], [333, 4224, 20, 0], [357, 4032, 31, 0], [396, 3904, 10, 0], [409, 3776, 41, 0],
  ],
  [ // YM2151 channel 2: 3 events
    [51, 4544, 241, 4], [307, 4224, 118, 4], [434, 4416, 24, 4],
  ],
  [ // YM2151 channel 3: 4 events
    [51, 5120, 97, 5], [155, 4992, 95, 5], [256, 4864, 96, 5], [358, 4800, 96, 5],
  ],
  [ // YM2151 channel 4: 15 events
    [0, 4542, 25, 1], [51, 4862, 22, 1], [78, 4990, 21, 1], [103, 5118, 20, 1], [129, 4862, 20, 1],
    [155, 5182, 61, 1], [231, 5118, 9, 1], [243, 4990, 10, 1], [256, 5118, 21, 1], [281, 4862, 20, 1],
    [307, 4670, 20, 1], [333, 4990, 20, 1], [358, 4798, 31, 1], [396, 4670, 10, 1], [409, 4542, 41, 1],
  ],
  [ // YM2151 channel 5: 15 events
    [25, 3780, 26, 2], [78, 4100, 21, 2], [103, 4228, 20, 2], [129, 4356, 20, 2], [155, 4100, 20, 2],
    [180, 4420, 62, 2], [256, 4356, 10, 2], [269, 4228, 9, 2], [281, 4356, 20, 2], [307, 4100, 20, 2],
    [333, 3908, 20, 2], [358, 4228, 21, 2], [383, 4036, 31, 2], [421, 3908, 10, 2], [434, 3780, 24, 2],
  ],
  [ // YM2151 channel 6: 3 events
    [72, 4547, 238, 7], [326, 4227, 118, 7], [454, 4419, 4, 7],
  ],
  [ // YM2151 channel 7: 10 events
    [51, 2816, 49, 6], [104, 2560, 48, 6], [155, 2688, 47, 6], [205, 2496, 48, 6], [256, 2560, 48, 6],
    [307, 2176, 47, 6], [358, 2240, 23, 6], [383, 2368, 23, 6], [409, 2496, 23, 6], [434, 2240, 24, 6],
  ],
] as const;
