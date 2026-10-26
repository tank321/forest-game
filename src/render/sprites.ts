import type { BuildingKind } from '../core/buildings';
import type { DecorKind } from '../core/decor';
import type { Season } from '../core/seasons';
import type { Job } from '../core/types';

/**
 * Pixel-art sprites as character grids: one char per pixel, '.' transparent, other chars looked up
 * in the matching TREE_/GROUND_/BUILDING_/UI_PALETTE. Ground tiles are 16×16. Tree sprites are 16×20;
 * the bottom 16 rows cover the tile and the top 4 overhang the tile above, so a forest reads as
 * dense canopy. Building sprites overhang the same way. The shapes were generated from simple
 * primitives lit from the top left; they are plain grids so they can be hand-edited.
 */
export const SPRITE_W = 16; // also the ground tile size
export const OVERHANG_PX = 4; // rows a tree or building sprite reaches into the tile above
export const TREE_H = SPRITE_W + OVERHANG_PX;

export type Rgba = readonly [number, number, number, number];

/** RGBA per tree grid char. */
export const TREE_PALETTE: Record<string, Rgba> = {
  o: [16, 40, 26, 255], // #10281a
  d: [31, 82, 40, 255], // #1f5228
  m: [46, 122, 51, 255], // #2e7a33
  l: [79, 156, 60, 255], // #4f9c3c
  h: [134, 196, 84, 255], // #86c454
  D: [59, 94, 31, 255], // #3b5e1f
  M: [95, 138, 42, 255], // #5f8a2a
  L: [139, 178, 58, 255], // #8bb23a
  H: [194, 214, 90, 255], // #c2d65a
  p: [20, 63, 44, 255], // #143f2c
  q: [30, 94, 60, 255], // #1e5e3c
  r: [47, 125, 72, 255], // #2f7d48
  w: [87, 163, 92, 255], // #57a35c
  E: [47, 102, 48, 255], // #2f6630
  F: [79, 148, 64, 255], // #4f9440
  G: [127, 191, 85, 255], // #7fbf55
  J: [191, 227, 138, 255], // #bfe38a
  b: [236, 232, 220, 255], // #ece8dc
  B: [181, 173, 156, 255], // #b5ad9c
  k: [43, 39, 34, 255], // #2b2722
  t: [107, 68, 38, 255], // #6b4426
  T: [69, 42, 23, 255], // #452a17
  R: [180, 138, 88, 255], // #b48a58
  s: [0, 0, 0, 90], // #000000
  n: [244, 248, 252, 255], // #f4f8fc snow
  N: [188, 203, 220, 255], // #bccbdc snow in shade
};

export const TREE_SPECIES = ['oak', 'lime', 'birch', 'pine'] as const;
export type TreeSpecies = (typeof TREE_SPECIES)[number];

/** Growth stages per species, largest first; the renderer picks one by remaining wood. */
export const TREES: Record<TreeSpecies, readonly (readonly string[])[]> = {
  oak: [
    [
      '.....dd.........',
      '...ddhlo.ddoo...',
      '..dhhhlldhhllo..',
      '..dhhllmlhhlmo..',
      '..dlllmdlmlmmo..',
      '...omdhhhldmdo..',
      '..dhhhhhlllmdo..',
      '.dllhhhlllmmdlo.',
      'dhlllllllmmmdlmo',
      'dlmmlllmmmmdlmdo',
      'dlldmmmmmmddmdo.',
      '.omdmmmmdddooo..',
      '..ooodddddo.....',
      '.....ommddo.....',
      '......oooo......',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '....ssstTssss...',
      '......sssss.....',
    ],
    [
      '................',
      '................',
      '................',
      '................',
      '....dddo.dd.....',
      '....dhlldhho....',
      '...dhllmlhlmo...',
      '...dlldhlmmmo...',
      '....ohhhllmdo...',
      '..ddlhhlllmdlo..',
      '..dllllllmmdlo..',
      '..dmmlmmmmddmo..',
      '..omdmmmdddooo..',
      '...oooddddo.....',
      '......omdo......',
      '.......oo.......',
      '.......tT.......',
      '.......tT.......',
      '.....sstTsss....',
      '......sssss.....',
    ],
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '......d.........',
      '.....dhoddo.....',
      '.....oldllmo....',
      '.....odhldo.....',
      '....dlhllmmo....',
      '...dllllmmdmo...',
      '...dmmmmmddo....',
      '....ooddddo.....',
      '......oooo......',
      '.......tT.......',
      '.......tT.......',
      '.....sstTsss....',
      '......sssss.....',
    ],
  ],
  lime: [
    [
      '.....DDo........',
      '....DHHLo.DD....',
      '...DHHHLMDHHo...',
      '...DLLLMMHHLLo..',
      '...oLLMMDLLLMo..',
      '....oMDHHMMMDo..',
      '.DDDHHHHLLLDHLo.',
      '.DHLHHHLLLMMLLo.',
      'DLLMLLLLLLMMMMo.',
      '.oLDLLLLMMMDMDo.',
      '.oMDMMMMMMDDDo..',
      '..DMMMMMDDDDo...',
      '...oDDDDDDDo....',
      '...oooooDDDo....',
      '........ooo.....',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '....ssstTssss...',
      '......sssss.....',
    ],
    [
      '................',
      '................',
      '................',
      '................',
      '.....DDoo.......',
      '....DHHLMDoo....',
      '....DLLMDHLMo...',
      '....oMMDDMMMo...',
      '...DLHHHLLDDLo..',
      '..DHMHHHLLMLMo..',
      '..DLMLLLLMMMMo..',
      '..oMDLLLMMDDo...',
      '...oDMMMMDDo....',
      '....oDDDDDDo....',
      '....ooooooo.....',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '.....sstTsss....',
      '......sssss.....',
    ],
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '......DD........',
      '.....DHLoDo.....',
      '.....DLMDLMo....',
      '.....DDDLDDo....',
      '....DHHHLMLo....',
      '...DMLLLLMMo....',
      '....oMMMMDDo....',
      '.....oDDDDo.....',
      '.....ooooo......',
      '.......tT.......',
      '.......tT.......',
      '.....sstTsss....',
      '......sssss.....',
    ],
  ],
  birch: [
    [
      '.....EEo........',
      '....EJJGoEoo....',
      '....EJGFGJGFo...',
      '....oGFEGFGFo...',
      '....EJJJGGEo....',
      '....EJJGGGFEo...',
      '...EGGGGGFFEFo..',
      '..EGEGGFFFEGFo..',
      '..EGFFFFEEEFEo..',
      '..oFFEEEEEEoo...',
      '...oooGGFEo.....',
      '......oooo......',
      '.......bB.......',
      '.......bB.......',
      '.......kB.......',
      '.......bB.......',
      '.......bB.......',
      '.......bk.......',
      '....sssbBssss...',
      '......sssss.....',
    ],
    [
      '................',
      '................',
      '................',
      '......E.........',
      '.....EJooEo.....',
      '....EJGGGJGo....',
      '.....oFEGFFo....',
      '.....EJJGGEo....',
      '....EGGGGFEo....',
      '...EGFGFFFEFo...',
      '...EGFFFEEFEo...',
      '....oFEEEEoo....',
      '.....ooooo......',
      '.......bB.......',
      '.......kB.......',
      '.......bB.......',
      '.......bB.......',
      '.......bk.......',
      '.....ssbBsss....',
      '......sssss.....',
    ],
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '......Eo........',
      '.....EJGEoo.....',
      '......oJGFo.....',
      '.....EJGGFo.....',
      '.....EGGFEFo....',
      '....EFEEEEo.....',
      '.....ooGFo......',
      '.......oo.......',
      '.......bB.......',
      '.......bB.......',
      '.......bk.......',
      '.....ssbBsss....',
      '......sssss.....',
    ],
  ],
  pine: [
    [
      '.......po.......',
      '......pwro......',
      '......prro......',
      '.....pwrrqo.....',
      '....pwrrqqpo....',
      '....oooooooo....',
      '.....pwrrqo.....',
      '....pwrrrqqo....',
      '...pwrrrqqqpo...',
      '..oooooooooooo..',
      '....pwrrrqqo....',
      '...pwrrrrqqpo...',
      '..pwrrrrqqqqpo..',
      '.pwrrrrrqqqqppo.',
      'oooooooooooooooo',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '....ssstTssss...',
      '......sssss.....',
    ],
    [
      '................',
      '................',
      '................',
      '.......po.......',
      '.......po.......',
      '......prro......',
      '.....pwrqqo.....',
      '.....oooooo.....',
      '.....pwrrqo.....',
      '.....prrqqo.....',
      '....pwrrqqpo....',
      '...oooooooooo...',
      '....pwrrqqqo....',
      '...pwrrrqqqpo...',
      '..oooooooooooo..',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '.....sstTsss....',
      '......sssss.....',
    ],
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.......po.......',
      '......prqo......',
      '......prqo......',
      '.....oooooo.....',
      '.....pwrqqo.....',
      '.....oooooo.....',
      '.....pwrqqo.....',
      '....pwrrqqpo....',
      '...oooooooooo...',
      '.......tT.......',
      '.......tT.......',
      '.....sstTsss....',
      '.......sss......',
    ],
  ],
};

/** Shown for a nearly felled tree of any species. */
export const STUMP: readonly string[] = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '......RRRR......',
  '.....tRRRRT.....',
  '.....ttttTT.....',
  '....sttttTTs....',
  '.....ssssss.....',
];

/**
 * Leaf colors per season over TREE_PALETTE (summer is the base), by species. Winter trees use
 * WINTER_TREES instead; pines keep their needles all year.
 */
export const TREE_TINTS: Record<Season, Partial<Record<TreeSpecies, Record<string, Rgba>>>> = {
  spring: {
    // fresh greens; lime highlights are its blossom
    oak: { o: [26, 58, 28, 255], d: [47, 107, 44, 255], m: [70, 150, 58, 255], l: [111, 190, 74, 255], h: [168, 222, 106, 255] },
    lime: { D: [74, 122, 36, 255], M: [116, 168, 52, 255], L: [162, 204, 72, 255], H: [226, 236, 138, 255] },
    birch: { E: [60, 124, 52, 255], F: [98, 174, 72, 255], G: [150, 212, 98, 255], J: [210, 240, 160, 255] },
  },
  summer: {},
  autumn: {
    // russet oak, butter-yellow lime, golden birch
    oak: { o: [58, 26, 14, 255], d: [110, 42, 20, 255], m: [156, 63, 26, 255], l: [200, 100, 42, 255], h: [232, 150, 74, 255] },
    lime: { o: [62, 58, 18, 255], D: [126, 112, 24, 255], M: [184, 164, 40, 255], L: [224, 210, 74, 255], H: [244, 236, 138, 255] },
    birch: { o: [74, 42, 10, 255], E: [160, 94, 16, 255], F: [208, 138, 26, 255], G: [238, 176, 44, 255], J: [248, 212, 104, 255] },
  },
  winter: {},
};

/** Winter trees, stage for stage like TREES: bare branches under snow; pines keep their needles. */
export const WINTER_TREES: Record<TreeSpecies, readonly (readonly string[])[]> = {
  oak: [
    [
      '..n..n......N...',
      '..T..T...N..T...',
      '..Tn.T...T.NT...',
      '.n.T..T..T.T..N.',
      '.T.T..T..T.T.NT.',
      'n.T.T.T..T.TNTNN',
      'TT.TTnT..T.TT.TT',
      '.....TT.T.T.....',
      '.nn...TnTT...NN.',
      '.TT.nn.TT.NNNTT.',
      '...TTT.tTNTTT...',
      '......TTTT......',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '....ssstTssss...',
      '......sssss.....',
    ],
    [
      '................',
      '................',
      '................',
      '......n.........',
      '....n.T....N....',
      '....T.T..N.T....',
      '...nT.T..T.T....',
      '...TT.T..T.TT...',
      '....TnTn.T.T....',
      '.....TnTT.T.....',
      '..nn..TTTT..NN..',
      '..TTnn.TT.N.TT..',
      '....TT.tTNTT....',
      '......TTTT......',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '.....sstTsss....',
      '......sssss.....',
    ],
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '......n.........',
      '....n.T..N.N....',
      '....T.T..T.T....',
      '....TnTn.T.T....',
      '.....TnTT.T.....',
      '....nnTTTT.N....',
      '....TTnTT.TT....',
      '......TTTT......',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '.....sstTsss....',
      '......sssss.....',
    ],
  ],
  lime: [
    [
      '....n.T...N.....',
      '....T.T...T.N...',
      '...nT..T..TTTN..',
      '...TT..T..T..T..',
      '..n.Tn.T..T..T..',
      '..T..T.T..T.T...',
      '..Tn.T.T.T.NT.N.',
      '.n.T.TnTnTNT..T.',
      '.T.T.nTTTNT..NT.',
      '.Tn.TTTTTT.NNT..',
      '..TT.nTTTN.TT...',
      '....TTnTTTT.....',
      '......TTT.......',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '....ssstTssss...',
      '......sssss.....',
    ],
    [
      '................',
      '................',
      '................',
      '.......n..N.....',
      '.....n.T..T.....',
      '.....T.T..T.N...',
      '.....T.T..T.T...',
      '...n.T.T..T.T...',
      '...T.T.T.T.NT...',
      '...Tn.TTnTTT....',
      '...TTnTTTT.NN...',
      '.....TTTT.NTT...',
      '.......TTTT.....',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '.....sstTsss....',
      '......sssss.....',
    ],
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.........N......',
      '......n..T......',
      '......T..T......',
      '....n.T..T.N....',
      '....T.T..T.T....',
      '....T.T.T.NT....',
      '.....TTTTTT.....',
      '.......TT.......',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '.....sstTsss....',
      '......sssss.....',
    ],
  ],
  birch: [
    [
      '....n..n...N....',
      '....t..b...t....',
      '.....t.b...t....',
      '......tbB.t.....',
      '....n..tBt......',
      '....t.nbt..N....',
      '...t.ttbBN.t....',
      '...t...tBtt.t...',
      '....nn.kt...t...',
      '....ttnbB.NN....',
      '...t..ttBNtt....',
      '.......btt..t...',
      '.......bB.......',
      '.......bB.......',
      '.......kB.......',
      '.......bB.......',
      '.......bB.......',
      '.......bk.......',
      '....sssbBssss...',
      '......sssss.....',
    ],
    [
      '................',
      '................',
      '.......n........',
      '....nn.b...N....',
      '....tt.b...t....',
      '......tbB.t.....',
      '.......tBt......',
      '.....nnkt.......',
      '.....ttbB.......',
      '....t..tB.N.....',
      '.......bkttN....',
      '.......bt..t....',
      '.......bB.......',
      '.......bB.......',
      '.......kB.......',
      '.......bB.......',
      '.......bB.......',
      '.......bk.......',
      '.....ssbBsss....',
      '......sssss.....',
    ],
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.......n........',
      '.....n.b........',
      '.....t.b..N.....',
      '......tbB.t.....',
      '.......tBt......',
      '.......bt.N.....',
      '.......bktt.....',
      '.......bt.......',
      '.......bB.......',
      '.......kB.......',
      '.......bB.......',
      '.......bk.......',
      '.....ssbBsss....',
      '......sssss.....',
    ],
  ],
  pine: [
    [
      '.......nN.......',
      '......nwrN......',
      '......prro......',
      '.....nwrrqN.....',
      '....nwrrqqpN....',
      '....oooooooo....',
      '.....pwrrqo.....',
      '....nwrrrqqN....',
      '...nwrrrqqqpN...',
      '..oooooooooooo..',
      '....pwrrrqqo....',
      '...nwrrrrqqpN...',
      '..nwrrrrqqqqpN..',
      '.nwrrrrrqqqqppN.',
      'oooooooooooooooo',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '....ssstTssss...',
      '......sssss.....',
    ],
    [
      '................',
      '................',
      '................',
      '.......nN.......',
      '.......po.......',
      '......nrrN......',
      '.....nwrqqN.....',
      '.....oooooo.....',
      '.....pwrrqo.....',
      '.....prrqqo.....',
      '....nwrrqqpN....',
      '...oooooooooo...',
      '....pwrrqqqo....',
      '...nwrrrqqqpN...',
      '..oooooooooooo..',
      '.......tT.......',
      '.......tT.......',
      '.......tT.......',
      '.....sstTsss....',
      '......sssss.....',
    ],
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.......nN.......',
      '......nrqN......',
      '......prqo......',
      '.....oooooo.....',
      '.....pwrqqo.....',
      '.....oooooo.....',
      '.....pwrqqo.....',
      '....nwrrqqpN....',
      '...oooooooooo...',
      '.......tT.......',
      '.......tT.......',
      '.....sstTsss....',
      '.......sss......',
    ],
  ],
};

/** STUMP under a cap of snow. */
export const WINTER_STUMP: readonly string[] = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....nnnnN......',
  '.....tnnNNT.....',
  '.....ttttTT.....',
  '....sttttTTs....',
  '.....ssssss.....',
];

/** RGBA per ground grid char. */
export const GROUND_PALETTE: Record<string, Rgba> = {
  g: [111, 158, 79, 255], // #6f9e4f
  a: [98, 144, 74, 255], // #62904a
  A: [127, 174, 88, 255], // #7fae58
  d: [79, 125, 60, 255], // #4f7d3c
  l: [148, 196, 100, 255], // #94c464
  w: [244, 241, 228, 255], // #f4f1e4
  y: [242, 207, 72, 255], // #f2cf48
  Y: [232, 168, 56, 255], // #e8a838
  p: [229, 138, 160, 255], // #e58aa0
  v: [164, 135, 216, 255], // #a487d8
  P: [205, 201, 184, 255], // #cdc9b8
  Q: [156, 152, 139, 255], // #9c988b
  z: [85, 127, 64, 255], // #557f40
};

/** Ground colors per season over GROUND_PALETTE (summer is the base). */
export const GROUND_TINTS: Record<Season, Record<string, Rgba>> = {
  spring: {
    // brighter grass, livelier flowers
    g: [116, 170, 82, 255], a: [100, 154, 74, 255], A: [140, 190, 98, 255], d: [79, 138, 60, 255], l: [164, 210, 108, 255], z: [90, 140, 66, 255],
    w: [255, 255, 255, 255], y: [255, 216, 58, 255], Y: [243, 154, 44, 255], p: [242, 122, 158, 255], v: [156, 108, 234, 255],
  },
  summer: {},
  autumn: {
    // olive and straw grass; flowers become fallen leaves
    g: [140, 154, 82, 255], a: [124, 138, 72, 255], A: [163, 173, 98, 255], d: [104, 120, 58, 255], l: [192, 180, 106, 255], z: [108, 122, 62, 255],
    w: [216, 116, 42, 255], y: [168, 68, 30, 255], Y: [140, 76, 34, 255], p: [188, 58, 32, 255], v: [124, 70, 38, 255],
  },
  winter: {
    // snow, shaded at the tufts; flowers buried, pebbles poke through
    g: [228, 235, 242, 255], a: [210, 220, 231, 255], A: [245, 248, 251, 255], d: [174, 188, 205, 255], l: [198, 210, 223, 255], z: [188, 200, 214, 255],
    w: [228, 235, 242, 255], y: [228, 235, 242, 255], Y: [228, 235, 242, 255], p: [228, 235, 242, 255], v: [228, 235, 242, 255], P: [127, 123, 114, 255], Q: [87, 84, 77, 255],
  },
};

/** A 16×16 ground tile; each tile picks one variant, in proportion to weight. */
export interface GroundTile {
  weight: number;
  grid: readonly string[];
}

/** Ground for every visible cell: under trees, buildings and cleared land. */
export const GRASS: readonly GroundTile[] = [
  {
    weight: 10, // plain
    grid: [
      'gggagggggggggggg',
      'gggggggAgggggggg',
      'gggggggaggagaggg',
      'ggggggggggAggggg',
      'gggggggggagaggAg',
      'ggaggggggggggggg',
      'gggggggggggggggg',
      'gAggggggggggaggg',
      'gggggggggggggggg',
      'ggggggAggggggggg',
      'gggggggggggggggg',
      'aggAgggggggggggg',
      'gggggggggggggggg',
      'gggggggggagAgggg',
      'gggggAgggaggAaag',
      'gggggggggaggggAg',
    ],
  },
  {
    weight: 4, // tufts
    grid: [
      'ggggAgggaggggggg',
      'gggggggggggggggg',
      'gggggggggAglglgg',
      'gglAlglggggdldgg',
      'ggdldldggggaggga',
      'gggdddgggggggggg',
      'ggggggggggggggga',
      'ggggggaggggggggg',
      'gAgggagggggggggg',
      'ggggggggAggggggg',
      'ggagAggggglalggg',
      'gggaggggggdldggg',
      'ggggggggagggggga',
      'ggggagggggggggAg',
      'ggggggaAgggggggg',
      'gggAgggggggggggg',
    ],
  },
  {
    weight: 1, // daisies
    grid: [
      'gggggggggggggggg',
      'gggagggaggAggggg',
      'ggagwgggAgaggggg',
      'gggwywggggglalgg',
      'ggggwggggggdldgg',
      'ggggdgaggggggggg',
      'ggggggAggggggAgg',
      'gggggAggAggggggg',
      'aggggggggggggggg',
      'gggggggggAgwgggg',
      'ggggggggggwywggg',
      'gggggggggggwgggg',
      'gaggggAggggdaggg',
      'gggaggggagggggag',
      'AggggggggggAgggg',
      'gggggggggggggggg',
    ],
  },
  {
    weight: 1, // wildflowers
    grid: [
      'ggggggggAagggaag',
      'ggggggggagggAggg',
      'gggggAggggpggggg',
      'ggglglagapypgagg',
      'gggdldggggpggggg',
      'gggggAggggdgaggg',
      'gggggggggggggggg',
      'gggggggggggggggg',
      'gggggggggAgggggg',
      'gggygggggggggggg',
      'agyYygggagAggggA',
      'gagdggggggggvggg',
      'ggggagAAggggdvgg',
      'gggagggggAgggggg',
      'gggggggggggggagg',
      'gggggggggggggggg',
    ],
  },
  {
    weight: 1, // pebbles
    grid: [
      'gAgggggggggggggg',
      'ggggAgggAggggggg',
      'ggggaagaggglglgg',
      'gggggggggggdldgg',
      'gggPQgagggaggagg',
      'gggzzggggggggagg',
      'gagggggggggggggg',
      'gggggaggaggggggg',
      'gggggggggPPggggg',
      'gggggggAPPQQgggg',
      'gggggggggzzgAgag',
      'gggggggggggggggg',
      'gAgggggggggggggA',
      'gggggggggggggggg',
      'ggggggggggaggAgg',
      'gggggggggAggaggg',
    ],
  },
];

/** RGBA per road grid char. Roads are laid over the grass (chars kept apart from GROUND_PALETTE's). */
export const ROAD_PALETTE: Record<string, Rgba> = {
  e: [104, 80, 52, 255], // #685034 edge
  r: [146, 112, 72, 255], // #927048 dirt
  R: [168, 134, 88, 255], // #a88658 worn
  k: [120, 92, 60, 255], // #785c3c rut
  o: [126, 122, 110, 255], // #7e7a6e pebble
  O: [170, 164, 146, 255], // #aaa492 pebble lit
};

/** Road colors per season over ROAD_PALETTE (summer is the base). */
export const ROAD_TINTS: Record<Season, Record<string, Rgba>> = {
  spring: {},
  summer: {},
  autumn: {},
  winter: {
    // trodden snow over the dirt
    e: [128, 118, 110, 255], r: [176, 166, 156, 255], R: [206, 204, 204, 255], k: [146, 136, 128, 255],
  },
};

/** Road pad in the middle of its tile; an arm (ROAD_ARMS) joins it to each road or building beside it. */
export const ROAD_CENTER: readonly string[] = [
  '................',
  '................',
  '................',
  '...eeeeeeeeee...',
  '...erRrrrrRre...',
  '...errrorrrre...',
  '...eRrrrrkrre...',
  '...errkrrrrRe...',
  '...errrrRrrre...',
  '...erOrrrrrre...',
  '...errrrrorRe...',
  '...eRrrkrrrre...',
  '...eeeeeeeeee...',
  '................',
  '................',
  '................',
];

/** Arms toward the north, east, south and west neighbor (bits 1, 2, 4, 8 of a road mask). */
export const ROAD_ARMS: readonly (readonly string[])[] = [
  [
    '...errRrrrrre...',
    '...errrrrkrre...',
    '...eRrrorrrre...',
    '...errrrrrRre...',
    ...Array(12).fill('................'),
  ],
  [
    ...Array(3).fill('................'),
    '............eeee',
    '............rrRr',
    '............rrrr',
    '............rrkr',
    '............Rrrr',
    '............rrrR',
    '............rorr',
    '............rrrr',
    '............rrRr',
    '............eeee',
    ...Array(3).fill('................'),
  ],
  [
    ...Array(12).fill('................'),
    '...errRrrrrre...',
    '...errrrkrrre...',
    '...erRrrrrore...',
    '...errrrrrRre...',
  ],
  [
    ...Array(3).fill('................'),
    'eeee............',
    'rrRr............',
    'rrrr............',
    'rkrr............',
    'rrrR............',
    'Rrrr............',
    'rror............',
    'rrrr............',
    'rRrr............',
    'eeee............',
    ...Array(3).fill('................'),
  ],
];

/**
 * The footprint column, on its bottom row, where a building's art has its way in (a door or a gap in
 * the fence). A road just below it joins the building there. Kinds without one join at any side.
 */
export const BUILDING_ENTRANCES: Partial<Record<BuildingKind, number>> = {
  house: 0,
  lumberCamp: 0,
  barn: 0,
  taxOffice: 0,
  tradingPost: 0,
  tailor: 0,
  farm: 1,
  sheepFarm: 1,
  cottonPlantation: 3,
  outpost: 1,
  masonsYard: 1,
};

/** A road tile: the pad plus an arm for each set bit of `mask` (1 north, 2 east, 4 south, 8 west). */
export function composeRoad(mask: number): string[] {
  const g = ROAD_CENTER.map((r) => [...r]);
  ROAD_ARMS.forEach((arm, k) => {
    if (mask & (1 << k)) arm.forEach((r, y) => [...r].forEach((c, x) => c !== '.' && (g[y][x] = c)));
  });
  return g.map((r) => r.join(''));
}

/** Where `joinFarm` samples the crop rows: one repeat (4 px wide, 12 rows tall) clear of the scarecrow. */
const FARM_CROPS = { x: 8, y: 21, w: 4, h: 12 };
const FARM_SIDE = 3; // tiles along each side of a farm
const MARGIN_PX = 6; // columns from each side of the farm grid kept bare beside the fence: 0–5 and 43–47
const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * A farm's grid with its fence opened where other farms touch it, so touching farms read as one field. `mask` has a bit
 * per edge tile: north tiles 0–2 (bits 0–2, west to east), east 3–5 and west 9–11 (north to south), south 6–8.
 * Opened fence is filled with crops repeated from the field: a farm is a whole number of repeats each way, so the rows
 * line up across the seam with a neighbor in line. Where only part of a side is joined, the fence turns along the
 * neighbor's fence; at a corner joined on one side only, the fence runs straight on into the neighbor's.
 */
export function joinFarm(grid: readonly string[], mask: number): string[] {
  if (!mask) return [...grid];
  const g = grid.map((r) => [...r]);
  const { x: cx, y: cy, w: cw, h: ch } = FARM_CROPS;
  const on = (bit: number) => (mask >> bit) & 1;
  const W = grid[0].length;
  const T = SPRITE_W;
  const top = 0, topEnd = OVERHANG_PX + 4; // north fence: posts in the overhang, rail, shadow and the bare margin
  const bottom = grid.length - 7; // south fence: the bare margin, posts, rail and its shadow
  const left = 0, right = W - 2; // side fences, two px wide
  // The field leaves bare soil beside its side fences (a crop there would overlap the fence); a joined side fills it.
  const margin = MARGIN_PX;
  const sideOn = (first: number, y: number) =>
    on(first + (y <= topEnd ? 0 : y >= bottom ? FARM_SIDE - 1 : Math.min(FARM_SIDE - 1, Math.floor((y - OVERHANG_PX) / T))));
  const crop = (x: number, y: number) => {
    const row = grid[cy + mod(y - cy, ch)];
    const bare = (x < margin && !sideOn(9, y)) || (x >= W - margin + 1 && !sideOn(3, y));
    return bare ? row[x] : row[cx + mod(x - cx, cw)];
  };
  // Pieces two px wide, top row at (x, y); '*' is crops.
  const paint = (x: number, y: number, rows: readonly string[]) =>
    rows.forEach((r, dy) => [...r].forEach((c, dx) => (g[y + dy][x + dx] = c === '*' ? crop(x + dx, y + dy) : c)));
  const fill = (x0: number, x1: number, y0: number, y1: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = crop(x, y);
  };
  const rep = (row: string, n: number) => Array<string>(n).fill(row);
  for (let i = 0; i < FARM_SIDE; i++) {
    const x0 = Math.max(i * T, 2), x1 = Math.min(i * T + T - 1, W - 3);
    const y0 = Math.max(OVERHANG_PX + i * T, topEnd + 1), y1 = Math.min(OVERHANG_PX + i * T + T - 1, bottom - 1);
    if (on(i)) {
      fill(x0, x1, top, topEnd);
      // A neighbor offset sideways: its side fence comes down to this farm's rail.
      if (i > 0 && !on(i - 1)) paint(i * T, top, [...rep('Ll', 6), '**', '**', '**']);
      if (i < FARM_SIDE - 1 && !on(i + 1)) paint(i * T + T - 2, top, [...rep('lL', 6), '**', '**', '**']);
    }
    if (on(6 + i)) {
      fill(x0, x1, bottom, grid.length - 1);
      if (i > 0 && !on(6 + i - 1)) paint(i * T, bottom, ['**', '**', '**', '**', 'Ll', 'Ll', 'Ll']);
      if (i < FARM_SIDE - 1 && !on(6 + i + 1)) paint(i * T + T - 2, bottom, ['**', '**', '**', '**', 'lL', 'lL', 'lL']);
    }
    // A neighbor offset up or down: its rail runs into this farm's side fence.
    if (on(9 + i)) {
      fill(left, margin - 1, y0, y1);
      if (i > 0 && !on(9 + i - 1)) paint(left, y0, ['jl', 'll']);
      if (i < FARM_SIDE - 1 && !on(9 + i + 1)) paint(left, y1 - 2, ['jl', 'll', 'Ll']);
    }
    if (on(3 + i)) {
      fill(W - margin + 1, right + 1, y0, y1);
      if (i > 0 && !on(3 + i - 1)) paint(right, y0, ['lj', 'll']);
      if (i < FARM_SIDE - 1 && !on(3 + i + 1)) paint(right, y1 - 2, ['lj', 'll', 'lL']);
    }
  }
  const corner = (x: number, y: number, along: number, across: number, straight: string, onward: readonly string[]) => {
    const rows = y === top ? topEnd + 1 : grid.length - bottom;
    if (on(along) && on(across)) fill(x, x + 1, y, y + rows - 1);
    else if (on(along)) paint(x, y, rep(straight, rows)); // the side fence runs on into the neighbor's
    else if (on(across)) paint(x, y, onward); // the rail runs on into the neighbor's
  };
  // The west end keeps its post, the east end drops it: posts stay 6 px apart across the seam.
  corner(left, top, 0, 9, 'Ll', ['..', '..', 'ox', 'Lx', 'Lj', 'll', 'xx', 'nn', 'nn']);
  corner(right, top, 2, 3, 'lL', ['..', '..', '..', '..', 'jj', 'll', 'xx', 'nn', 'nn']);
  corner(left, bottom, 6, 11, 'Ll', ['nn', 'nn', 'jn', 'Ln', 'Lj', 'll', 'xx']);
  corner(right, bottom, 8, 5, 'lL', ['nn', 'nn', 'nn', 'nn', 'jj', 'll', 'xx']);
  return g.map((r) => r.join(''));
}

/** RGBA per building grid char. */
export const BUILDING_PALETTE: Record<string, Rgba> = {
  o: [36, 22, 12, 255], // #24160c
  r: [122, 59, 34, 255], // #7a3b22
  R: [156, 79, 44, 255], // #9c4f2c
  u: [192, 108, 60, 255], // #c06c3c
  l: [90, 58, 31, 255], // #5a3a1f
  L: [138, 90, 48, 255], // #8a5a30
  j: [168, 116, 63, 255], // #a8743f
  D: [51, 32, 15, 255], // #33200f
  e: [201, 156, 92, 255], // #c99c5c
  E: [162, 118, 62, 255], // #a2763e
  b: [107, 68, 38, 255], // #6b4426
  h: [176, 136, 80, 255], // #b08850
  S: [195, 202, 210, 255], // #c3cad2
  s: [120, 131, 142, 255], // #78838e
  x: [0, 0, 0, 70], // #000000
  n: [107, 74, 42, 255], // #6b4a2a
  Y: [239, 203, 98, 255], // #efcb62
  y: [201, 154, 58, 255], // #c99a3a
  g: [154, 160, 74, 255], // #9aa04a
  k: [216, 192, 138, 255], // #d8c08a
  N: [78, 52, 28, 255], // #4e341c
  m: [138, 99, 56, 255], // #8a6338
  B: [74, 111, 165, 255], // #4a6fa5
  v: [138, 101, 38, 255], // #8a6526
  W: [194, 171, 130, 255], // #c2ab82
  w: [234, 217, 178, 255], // #ead9b2
  c: [159, 208, 236, 255], // #9fd0ec
  a: [154, 163, 172, 255], // #9aa3ac
  Z: [64, 71, 79, 255], // #40474f
  K: [95, 104, 115, 255], // #5f6873
  d: [163, 131, 90, 255], // #a3835a
  i: [119, 89, 58, 255], // #77593a
  q: [143, 113, 73, 255], // #8f7149
  f: [132, 42, 32, 255], // #842a20
  F: [178, 59, 46, 255], // #b23b2e
  V: [242, 239, 230, 255], // #f2efe6
  U: [58, 120, 176, 255], // #3a78b0
  G: [79, 125, 60, 255], // #4f7d3c
  H: [127, 174, 88, 255], // #7fae58
  I: [214, 208, 192, 255], // #d6d0c0
  T: [46, 92, 42, 255], // #2e5c2a
  z: [242, 246, 250, 255], // #f2f6fa snow
  A: [190, 204, 220, 255], // #becddc snow in shade
  P: [112, 58, 104, 255], // #703a68
  p: [150, 84, 138, 255], // #96548a
  t: [186, 120, 170, 255], // #ba78aa
};

/**
 * Building sprites, w·SPRITE_W wide and h·SPRITE_W + OVERHANG_PX tall for a w×h footprint.
 * Buildings without one are drawn as colored rectangles.
 */
export const BUILDING_SPRITES: Partial<Record<BuildingKind, readonly string[]>> = {
  lumberCamp: [
    '.ooooooooooooooooooooo..........',
    '.ouuRuuRuuRuuRuuRuuRuoxx........',
    '.ouuRuuRuuRuuRuuRuuRuoxx........',
    '.ouuRuuRuuRuuRuuRuuRuoxx........',
    '.ouuRuuRuuRuuRuuRuuRuoxx........',
    '.ouuRuuRuuRuuRuuRuuRuoxx........',
    '.ojjjjjjjjjjjjjjjjjjjoxx........',
    '.orrlrrlrrlrrlrrlrrlroxx........',
    '.orrlrrlrrlrrlrrlrrlroxx........',
    '.orrlrrlrrlrrlrrlrrlroxx........',
    '.orrlrrlrrlrrlrrlrrlroxx........',
    '.orrlrrlrrlrrlrrlrrlroxx........',
    '.orrlrrlrrlrrlrrlrrlroxx........',
    '.ollllllllllllllllllloxx........',
    '.bjjjjjjjjjjjjjjjjjjjbxx........',
    'bEbLLLLLLLLLLLLLLLLLbEbx........',
    '.blllllllllllllDDDDllbxxx.......',
    '.bjjjjjjjDDDDDjDbbDjjbxx........',
    'bEbLLLLLLDlllDLDbbDLbEbx........',
    '.blllllllDlllDlDDDDllbxxx.......',
    '.bjjjjjjjDlllDjjjjjjjbxx........',
    'bEbLLLLLLDlljDLLLLLLbEbx........',
    '.blllllllDlhlDlllllllbxxxbbbb...',
    '.bjjjjjjjDhllDjjjjjjjbxx.beebxx.',
    'bEbooLLoLhoooooooooobEbxbeEEebx.',
    '.bxxxSSxhxxxxxxxxxxxxbxxbeEEebxx',
    '..xesSShexx...........xx.beebxxx',
    '..eeEssEeex............bbbbbbbb.',
    '...eeeeeexxx..e.......beeebbeeeb',
    '...bbbbboxx....xx.....beEebbeEeb',
    '...bbbbboxx.e......e..beeebbeeeb',
    '...bbbbboxx..xx.....xx.bbbxxbbbx',
    '....xxxxxxx.....e.......xxxx.xxx',
    '...........e.....xx.............',
    '............xx..................',
    '................................',
  ],
  farm: [
    '................................................',
    '................................................',
    'ox....ox....ox....ox....ox....ox....ox....ox...o',
    'Lx....Lx....Lx....Lx....Lx....Lx....Lx....Lx...L',
    'LljjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjlL',
    'llllllllllllllllllllllllllllllllllllllllllllllll',
    'LlxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxlL',
    'LlnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnlL',
    'LlnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnlL',
    'LlnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnYoooYnnnYnlL',
    'LlnYyYnYyYnYyYnYyYnYyYnYyYnYyYnYyYnYoDDDoYnYyYlL',
    'LlnyYynyYynyYynyYynyYynyYynyYynyYynoDDDDDonyYylL',
    'LlnngnnngnnngnnngnnngnnngnnngnnngnnngkkkgnnngnlL',
    'LlNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgkDkgNNNgNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmhhBBBhhmmmmlL',
    'LlnnnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnYnnBBBnnYnnnlL',
    'LlnnnYyYnYyYnYyYnYyYnYyYnYyYnYyYnYyYnBBBnYyYnnlL',
    'LlnnnyYynyYynyYynyYynyYynyYynyYynyYynyhynyYynnlL',
    'LlnnnngnnngnnngnnngnnngnnngnnngnnngnnnhnnngnnnlL',
    'LlNNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnYnlL',
    'LlnYyYnYyYnYyYnYyYnYyYnYyYnYyYnYyYnYyYnYyYnYyYlL',
    'LlnyYynyYynyYynyYynyYynyYynyYynyYynyYynyYynyYylL',
    'LlnngnnngnnngnnngnnngnnngnnngnnngnnngnnngnnngnlL',
    'LlNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnlL',
    'LlnnnYyYnYyYnYyYnYyYnYyYnYyYnYyYnYyYnYyYnYyYnnlL',
    'LlnnnyYynyYynyYynyYynyYynyYynyYynyYynyYynyYynnlL',
    'LlnnnngnnngnnngnnngnnngnnngnnngnnngnnngnnngnnnlL',
    'LlNNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnYnlL',
    'LlnYyYnYyYnYyYnYyYnYyYnYyYnYyYnYyYnYyYnYyYnYyYlL',
    'LlnyYynyYynyYynyYynyYynyYynyYynyYynyYynyYynyYylL',
    'LlnngnnngnnngnnngnnngnnngnnngnnngnnngnnngnnngnlL',
    'LlNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnYnnnlL',
    'LlnnnYyYnYyYnYyYnYyYnYyYnYyYnYyYnYyYnYyYnYyYnnlL',
    'LlnnnyYynyYynyYynyYynyYynyYynyYynyYynyYynyYynnlL',
    'LlnnnngnnngnnngnnngnnngnnngnnngnnngnnngnnngnnnlL',
    'LlNNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNgNNNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnlL',
    'LlnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnlL',
    'jlnnnnjnnnnnjnnnnnjnjnnnnnnjnnjnnnnnjnnnnnjnnnlj',
    'LlnnnnLnnnnnLnnnnnLnLnnnnnnLnnLnnnnnLnnnnnLnnnlL',
    'LljjjjLjjjjjLjjjjjLjLxxxxxxLjjLjjjjjLjjjjjLjjjlL',
    'lllllllllllllllllllllx.....lllllllllllllllllllll',
    '.xxxxxxxxxxxxxxxxxxxxx......xxxxxxxxxxxxxxxxxxxx',
  ],
  house: [
    '..........oo....',
    '.oooooooooSsooo.',
    '.oyYYYYyYYSsyYox',
    '.oYyYYYYyYSsYyox',
    '.oYYyYYYYySsYYox',
    '.oYYYyYYYYyYYYox',
    '.ommmmmmmmmmmmox',
    '.ovyyyyvyyyyvyox',
    '.oyvyyyyvyyyyvox',
    '.oyyvyyyyvyyyyox',
    '.ovvvvvvvvvvvvox',
    '..oWWWWWWWWWWoxx',
    '..owwwwwwwwwwoxx',
    '..owDDDwwLLLLoxx',
    '..owDLDwwLccLoxx',
    '..owDLDwwLLLLoxx',
    '..owDLDwwwwwwoxx',
    '..ooooooooooooxx',
    '...xxxxxxxxxxxxx',
    '................',
  ],
  quarry: [
    '................................',
    '................................',
    '................................',
    '.................oooo...........',
    '................oSSSSox.........',
    '.........oooo..oSSSSaaoxoooo....',
    '....oooooSSSaooSSSSaassoSSSSox..',
    '..oossssSSSaaZKZaaaassKSSSSaaox.',
    '..oKasssZaaasZKKZasssZSSSSaaaoxx',
    '.osssKssKZZZZKKsKZZZZKSSSaaasZox',
    '.osssasKsKKKKKssaKKKKKZaaaassZox',
    '.osssssssKsassssssssssKZssssZKox',
    '.ossssassssKsssssasssssKZZZKSSox',
    '.ossssssssssaKsssssssssaKKKSSSao',
    '.oKssssasssssssKssassssssssZaaso',
    '.oasKssZZZZZZZZZZKssssssassKZZox',
    '.osssLjjLKKKKKKKKZsassssssssKKox',
    '.osaZLKKLoooooooKKZZsKsssassssox',
    '.ossKLjjLZZZZZZZoKKKassKssssssox',
    '.osZKLoZLooooooZZoKKZssssKasssox',
    '.osKKLjjLoooooooZZKKKasSSSSSssox',
    '.osKKLZZLoooooooZZoKKssSSSSsZKox',
    '.osKKLjjLoooooooZZaKKsaaaaasZsox',
    '.osKKLZZLooooooaZZKKKssaaaasZsox',
    '.osaKLjjLaaaaaaZZaKKasKaaaasZsox',
    '.ossKKKaZZZZZZZZaKKKssSZZZZZZaox',
    '.oasaaKKaaaaaaaaKKassssSSsSSSSox',
    '.oKsssaKKKKKKKKKKasaShSSsZSSSSso',
    '.osaKssaaaaaaaaaaKsshaaasZaaaaso',
    '.ossssKssasssssssssKhaaasZaaaaso',
    '.ossasssKssssssassshaaaasZaaaaso',
    '..osssssssasssssssshZZZZZZZZZZoo',
    '..oosassssssKsssassssssssKsaooxx',
    '...xooooooooooooooooooooooooxxxx',
    '.....xxxxxxxxxxxxxxxxxxxxxxxxx..',
    '................................',
  ],
  townCenter: [
    '............................................................h...',
    '...............................oo...........................hBBB',
    '.....oooooooooooooooooooooooooouuoooooooooooooooooooooooooo.hBBB',
    '.....ouuRuuRuuRuuRuuRuuRuuRuuRuuuuRRuuRuuRuuRuuRuuRuuRuuRuoxhccc',
    '.....ouuRuuRuuRuuRuuRuuRuuRuRuuuuuuRuuRuuRuuRuuRuuRuuRuuRuoxhBBB',
    '.....ouuRuuRuuRuuRuuRuuRuuRRRRRRRRRRRuRuuRuuRuuRuuRuuRuuRuoxhBBB',
    '.....ouuRuuRuuRuuRuuRuuRuuRuwDDDDDDWuuRuuRuuRuuRuuRuuRuuRuoxhBBB',
    '....douuRuuRuuRuuRuuRuuRuuRuwDDYYDDWuuRuuRuuRuuRuuRuuRuuRuoihxxx',
    '...ddouuRuuRuuRuuRuuRuuRuuRuwDYYYYDWuuRuuRuuRuuRuuRuuRuuRuoihxx.',
    '..dddouuRuuRuuRuuRuuRuuRuuRuwDDyyDDWuuRuuRuuRuuRuuRuuRuuRuoihix.',
    '.qdddouuRuuRuuRuuRuuRuuRuuRuwDDDDDDWuuRuuRuuRuuRuuRuuRuuRuoihii.',
    '.ddddouuRuuRuuRuuRuuRuuRuuRubbbbbbbbuuRuuRuuRuuRuuRuuRuuRuoihii.',
    '.ddddojjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjoihii.',
    '.ddddorrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlroihii.',
    '.dddqorrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlroihii.',
    '.ddddorrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlroihii.',
    '.ddddorrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlroihii.',
    '.ddqdorrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlroihii.',
    '.ddddorrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlroihii.',
    '.ddddorrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlroihii.',
    '.dqddorrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlroihii.',
    '.ddddorrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlrrlroihii.',
    '.ddddolllllllllllllllllllllllllllllllllllllllllllllllllllloihii.',
    '.qddddbWWWWWWWbWWWWWWWbWWWWWWWbWWWWWWWbWWWWWWWbWWWWWWWbWWbiihii.',
    '.ddddqbwwwwwwwbwwwwwwwbwwwwwwwbwwwwwwwbwwwwwwwbwwwwwwwbwwbiihii.',
    '.dddddbwwwwLLLLLwwwLLLLLwwwwwwbwwwwwwwbwLLLLLwbwLLLLLwbwwbiidii.',
    '.dddddbwwwwLcLcLwwwLcLcLwwwwwwbwwwwwwwbwLcLcLwbwLcLcLwbwwbiiddd.',
    '.dddqdbwwwwLcLcLwwwLcLcLwwwwwwbwwwwwwwbwLcLcLwbwLcLcLwbwwbiiddd.',
    '.dddddbwwwwLcLcLwwwLcLcLwwwwwwbwwwwwwwbwLcLcLwbwLcLcLwbwwbiiqdd.',
    '.dddddbwwwwLLLLLwwwLLLLLwwwwwwbwwwwwwwbwLLLLLwbwLLLLLwbwwbiiddd.',
    '.ddqddbwwwwwwwbwwwwwwwbwwwwwwwbwwwwwwwbwwwwwwwbwwwwwwwbwwbiiddd.',
    '.dddddbbbbbbbbbbbbbbbbbbbbDDDDDDDDDDDDbbbbbbbbbbbbbbbbbbbbiiddd.',
    '.dddddbwwwwwwwbwwwwwwwbwwwDLjLjDDjLjLDbwwwwwwwbwwwwwwwbwwbiiddd.',
    '.dqdddbwwwwwwwbwwwwwwwbwwwDLjLjDDjLjLDbwwwwwwwbwwwwwwwbwwbiiddd.',
    '.dddddbwwwwwwwbwwwwwwwbwwwDLjLjDDjLjLDbwwwwwwwbwwwwwwwbwwbiiddd.',
    '.dddddbwwwwwwwbwwwwwwwbwwwDLjLjDDjLjLDbwwwwwwwbwwwwwwwbwwbiiddq.',
    '.qddddbwwwwwwwbwwwwwwwbwwwDLjLjDDjLjLDbwwwwwwwbwwwwwwwbwwbiiddd.',
    '.ddddqbwwwwwwwbwwwwwwwbwwwDLjLjDDjLjLDbwwwwwwwbwwwwwwwbwwbiiddd.',
    '.dddddbwwwwwwwbwwwwwwwbwwwDLjLjDDjLjLDbwwwwwwwbwwwwwwwbwwbiidqd.',
    '.dddddbwwwwwwwbwwwwwwwbwwwDLjLjDDjLjLDbwwwwwwwbwwwwwwwbwwbiiddd.',
    '.dddqdbwwwwwwwbwwwwwwwbwwwDLjLjDDjLjLDbwwwwwwwbwwwwwwwbwwbiiddd.',
    '.dddddSSSSSSSSSSSSSSSSSSSSDLjLjDDjLjLDSSSSSSSSSSSSSSSSSSSSiiqdd.',
    '.dddddoasaaasaaasaaasaaasaDLjLjDDjLjLDaasaaasaaasaaasaaasoiiddd.',
    '.ddqddsaaasaaasaaasaaasaaaDLjLjDDjLjLDsaaasaaasaaasaaasaaoiiddd.',
    '.dddddoosooosooosooosooosaDLjLjDDjLjLDaasooosooosooosooosoiiddd.',
    '.ddddddiiiiiiiiiiiiiiiiiSSSSSSSSSSSSSSSSiiiiiiiiiiiiiiiiiiiiddd.',
    '.dqddddddddddddqddddddddoaaaaaaaaaaaaaaoiiddddddddddddqdddddddd.',
    '.dddddqddddddbbbdddqddssssssssssssssssssssdddqddddddddddddqdddd.',
    '.dddddddddqdbeeebidddddiiiiiiiiiiiiiiiiiiiiidddddqddddddddddddq.',
    '.qddddddddddbeEebiiddddddddqddddddddddddqddddddddddddqddddddddd.',
    '.ddddqddddddbeEebiiddddddddddddqddddddddddddqddddddddddddqddddd.',
    '.ddddddddqddbeeebiidddqddddddddddddqddddddddddddqddddddddddddqd.',
    '.ddddddddddbbbbbbbidddddddqddddddddddddqddddddooodddqddSSSSSddd.',
    '.dddqddddbbeebibeebbddddddddddqddddddddddddqdddoiiiooodSSSSsZid.',
    '.dddddddqbeEEebeEEebiiddddddddddddqdddddddddddokoiddoiioaaasZii.',
    '.ddddddddbeEEebeEEebiidddqddddddddddddqddddddokkkoiokoioaaasZii.',
    '.ddqdddddbbeebibeebbiidddddddqddddddddddddqddokkkWokkkoaaaasZii.',
    '.ddddddqbbibbbbbbbibbidddddddddddqddddddddddddoooYokkkWZZZZZZii.',
    '.ddddddbeebibeeebibeebidqddddddddddddqdddddddddiioiooSSSSSSSSSi.',
    '.dqdddbeEEebbeEebbeEEebiddddqddddddddddddqddddddokoiiSSSSSSSSsZx',
    '.dddddbeEEebbeEebbeEEebiidddddddqddddddddddddqdokkkoioaaaaaaasZx',
    '.ddddddbeebibeeebibeebiiidddddddddddqddddddddddokkkoioaaaaaaasZx',
    '..ddddddbbiiibbbiiibbiiidddqddddddddddddqdddddddoooiioaaaaaaasZx',
    '...ddqdddiiiddiiiiqdiiiddddddddqddddddddddddqddddiiiiZZZZZZZZZZx',
    '....dddddqddddddddddddqddddddddddddqddddddddddddqdddddiiiiiixxxx',
    '.....ddddddddqddddddddddddqddddddddddddqddddddddddddqdddddd.....',
    '................................................................',
    '................................................................',
  ],
  barn: [
    '................................',
    '.oooooooooooooooooooooooooooo...',
    '.oaaKaaKaaKaaKaaKaaKaaKaaKaaoxx.',
    '.oaaKaaKaaKaaKaaKaaKaaKaaKaaoxx.',
    '.oaaKaaKaaKaaKaaKaaKaaKaaKaaoxx.',
    '.oaaKaaKaaKaaKaaKaaKaaKaaKaaoxx.',
    '.oaaKaaKaaKaaKaaKaaKaaKaaKaaoxx.',
    '.oSSSSSSSSSSSSSSSSSSSSSSSSSSoxx.',
    '.oKKZKKZKKZKKZKKZKKZKKZKKZKKoxx.',
    '.oKKZKKZKKZKKZKKZKKZKKZKKZKKoxx.',
    '.oKKZKKZKKZKKZKKZKKZKKZKKZKKoxx.',
    '.oKKZKKZKKZKKZKKZKKZKKZKKZKKoxx.',
    '.oKKZKKZKKZKKZKKZKKZKKZKKZKKoxx.',
    '.oZZZZZZZZZZZZZZZZZZZZZZZZZZoxx.',
    '..offffffffffffffffffffffffoxxx.',
    '..oFfFFfFFfVVVVVVVVfFFfFFfFoxx..',
    '..oFfFFfFFfVDDDDDDVfFFfFFfFoxx..',
    '..oFfFFfFFfVDYDDyDVfFFfFFfFoxx..',
    '..oFfFFfFFfVYYYYYYVfFFfFFfFoxx..',
    '..oFfFFfFFfVyyyyyyVfFFfFFfFoxx..',
    '..oFfFFfFFfFFfFFfFFfFFfFFfFoxx..',
    '..oFfFFfVVVVVVVVVVVVVVfFFfFoxx..',
    '..oFfFFfVVffffVVffffVVfFFfFoxx..',
    '..oFfFFfVfVffVVVVffVfVfFFfFoxx..',
    '..oFfFFfVfVffVVVVffVfVfFFfFoxx..',
    '..oFfFFfVffVVfVVfVVffVfFFfFoxx..',
    '..oFfFFfVffVVfVVfVVffVfFFfFoxx..',
    '..oFfFFfVffVVfVVfVVffVfFFYFoxYy.',
    '..oFfFFfVffVVfVVfVVffVfFYYYmYYYY',
    '..oFfFFfVfVffVVVVffVfVfFYYYmYYYY',
    '..oFfFFfVfVffVVVVffVfVfFmmmmmmmo',
    '..ooooooooooooooooooooooyyymyyyy',
    '...xxxxxxxxxxxxxxxxxxxxxyyymyyyy',
    '........................yyyoyyyy',
    '.........................xxxxxxx',
    '................................',
  ],
  sheepFarm: [
    '................................................',
    '................................................',
    'ox....ox....ox....ox....ox....ox....ox....ox...o',
    'Lx....Lx....Lx....Lx....Lx....Lx....Lx....Lx...L',
    'LljjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjlL',
    'llllllllllllllllllllllllllllllllllllllllllllllll',
    'LlxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxlL',
    'Ll............................................lL',
    'Ll............................................lL',
    'Ll............G.H.............................lL',
    'Ll...........GHGHG..................G.H.......lL',
    'Ll.....ooooooo.....................GHGHG......lL',
    'Ll....oVVVVVVVoooo............................lL',
    'Ll...oVVVVVVVVoZZo............................lL',
    'Ll...oVVIVVVVVoZZo............................lL',
    'Ll...oIVVVVVVIoooo............ooooooo.........lL',
    'Ll....oIIIIIIIo...........ooooVVVVVVVo........lL',
    'Ll.....oZo..oZo...........oZZoVVVVVVVVo.......lL',
    'Ll.....xxxxxxxx...........oZZoVVVVVIVVo.......lL',
    'Ll...................G.H..ooooIVVVVVVIo.......lL',
    'Ll..................GHGHG....oIIIIIIIo........lL',
    'Ll...........................oZo..oZo.........lL',
    'Ll...........................xxxxxxxx.........lL',
    'Ll............................................lL',
    'Ll............................................lL',
    'Ll.............ooooooo........................lL',
    'Ll............oVVVVVVVoooo....................lL',
    'Ll...........oVVVVVVVVoZZo....................lL',
    'Ll...........oVVIVVVVVoZZo....................lL',
    'Ll...........oIVVVVVVIoooo....................lL',
    'Ll............oIIIIIIIo...........ooooooo.....lL',
    'Ll.....G.H.....oZo..oZo.......ooooVVVVVVVo....lL',
    'Ll....GHGHG....xxxxxxxx.......oZZoVVVVVVVVo...lL',
    'Ll............................oZZoVVVVVIVVo...lL',
    'Ll............................ooooIVVVVVVIo...lL',
    'Ll...............................oIIIIIIIo....lL',
    'Ll...............................oZo..oZo.....lL',
    'Ll...............................xxxxxxxx.....lL',
    'Ll............................................lL',
    'Ll............................................lL',
    'Ll.....................................G.H....lL',
    'Ll....................................GHGHG...lL',
    'Ll............................................lL',
    'Ll............................................lL',
    'Ll............................................lL',
    'Ll............................................lL',
    'Ll............................................lL',
    'jl....j.....j.....j...........j.....j.....j...lj',
    'Ll....L.....L.....L...........L.....L.....L...lL',
    'LljjjjLjjjjjLjjjjjLjj......jjjLjjjjjLjjjjjLjjjlL',
    'lllllllllllllllllllll......lllllllllllllllllllll',
    '.xxxxxxxxxxxxxxxxxxxx......xxxxxxxxxxxxxxxxxxxxx',
  ],
  well: [
    '................',
    '.oooooooooooooo.',
    '.oRRRRRRRRRRRRox',
    '.orrlrrlrrlrrlox',
    '.orrrrrrrrrrrrox',
    '..ooooooloooooxx',
    '..oxxxxxoxxxxoxx',
    '..oxx...oxx..oxx',
    '..oxx...oxx..oxx',
    '..oxoooobooo.oxx',
    '..ooSSZLLLSSooxx',
    '..oSZZZZZZZZSoxx',
    '.oaacUUUcUUUaaox',
    '.oaaaaUcUUaaaaox',
    '.oaaaaaaaaaasaox',
    '.osaaasaaasaaaox',
    '.oooooooooooooox',
    '..xxxxxxxxxxxxxx',
    '................',
    '................',
  ],
  market: [
    '................................',
    '................................',
    '................................',
    '................................',
    '.ooooooooooooooooooooooooooooo..',
    '.oFFVVVFFFVVVFFFVVVFFFVVVFFFVo..',
    '.oFFVVVFFFVVVFFFVVVFFFVVVFFFVo..',
    '.oFFVVVFFFVVVFFFVVVFFFVVVFFFVo..',
    '.oFFVVVFFFVVVFFFVVVFFFVVVFFFVo..',
    '.oFFVVVFFFVVVFFFVVVFFFVVVFFFVox.',
    '.offIIIfffIIIfffIIIfffIIIfffIox.',
    '.ofooIoofooIoofooIoofooIoofooIx.',
    '..olLiiiiiiiiiiiiiiiiiiiiiilLxx.',
    '...llnnnnnnnnoooooonnnnnnnnllxx.',
    '...lliiiiiiiiokVYkoiiiiiiiillxx.',
    '...llnnnnnnnnokYYkonnnnnnnnllxx.',
    '...lliiiiiiiiokYykoiiiiiiiillxx.',
    '...llnnnnnnnnoooooonnnnnnnnllxx.',
    '...lliiiiiiiiiiiiiiiiiiiiiillxx.',
    '...llnnnnnnnnnnnnnnnnnnnnnnllxx.',
    '...llGHGHiiaSSiiiiYiiiiuuuillxx.',
    '...llHHGHnnSSsnnnYYynnnuuRnllxx.',
    '..oooooooooooooooooooooooooooxx.',
    '..hhhhhhhhhhhhhhhhhhhhhhhhhhhxx.',
    '..oLbLLLbLLLbLLLbLLLbLLLbLLLoxx.',
    '..oLbLLLbLLLbLLLbLLLbLLLbLLLoxx.',
    '..oLbLLLbLLLbLLLbLLLbLLLbLLLoxx.',
    '..oLbLLLbLLLbLLLbLLLbLLLbLLLoxx.',
    '..oLbLLLbLLLbLLLbLLLbLLLbLLLoxx.',
    '..oLbLLLbLLLbLLLbLLLbLLLbLLLoxx.',
    '..oLbLLLbLLLbLLLbLLLbLLLbLLLoxx.',
    '..oooooooooooooooooooooooooooxxx',
    '...xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    '...xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    '...xxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    '................................',
  ],
  taxOffice: [
    '.......ooooooooooooooooso.......',
    '......oKKKKKKKKKKKKKKKsss.......',
    '.....oZZZZZZZZZZZZZZZZsss.......',
    '....oKKKKKKKKKKKKKKKKKssso......',
    '...oZZZZZZZZZZZZZZZZZZZZZZo.....',
    '..oKKKKKKKKKKKKKKKKKKKKKKKKo....',
    '.oZZZZZZZZZZZZZZZZZZZZZZZZZZoxx.',
    '.oKKKKKKKKKKKKKKKKKKKKKKKKKKoxx.',
    '.oZZZZZZZZZZZZZZZZZZZZZZZZZZoxx.',
    '.oKKKKKKKKKKKKKKKKKKKKKKKKKKoxx.',
    '.oZZZZZZZZZZZZZZZZZZZZZZZZZZoxx.',
    '.oKKKKKKKKKKKKKKKKKKKKKKKKKKoxx.',
    '.ooooooooooooooooooooooooooooxx.',
    '..oSSSSSaSSSSSooaSSSSSSSaSSoxxx.',
    '..oSSSSSaSSooooooooSSSSSaSSoxxx.',
    '..oaaaaaaaaovVYYYvoaaaaaaaaoxxx.',
    '..oSSooooSaovYYyyvoSSooooSaoxxx.',
    '..oSSoVcoSaovYYyyvoSSoVcoSaoxxx.',
    '..oaaooooaaovYYyyvoaaooooaaoxxx.',
    '..oSSoccoSSooooooooSSoccoSSoxxx.',
    '..oSSoccoSSSSSSSaSSSSoccoSSoxxx.',
    '..oaaooooaaaooooooaaaooooaaoxxx.',
    '..oSSSSSSSaSobNNboaSSSSSSSaoxxx.',
    '..oSSSSSSSaSobNNboaSSSSSSSaoxxx.',
    '..oaaaaaaaaaobNNboaaaaaaaaaoxxx.',
    '..oSSSSSaSSSobNNboSSSSSSaSSoxxx.',
    '..oSSSSSaSSSobNNYoSSSSSSaSSoxxx.',
    '..oaaaaaaaaaobNNboaaaaaaaaaoxxx.',
    '..oSSSSSSSaSobNNboaSSSSSSSaoxxx.',
    '..oSSSSSSSaSobNNboaSSSSSSSaoxxx.',
    '..oaaaaaaaaaobNNboaaaaaaaaaoxxx.',
    '..ooooooooooooooooooooooooooxxx.',
    '..xxxxxxxxxssssssssxxxxxxxxxxxx.',
    '..xxxxxxxxaaaaaaaaaaxxxxxxxxxxx.',
    '..xxxxxxxxxxxxxxxxxxxxxxxxxxxxx.',
    '................................',
  ],
  cottonPlantation: [
    '................................................................................................',
    '................................................................................................',
    'ox....ox....ox....ox....ox....ox....ox....ox....ox....ox....ox....ox....ox....ox....ox....ox...o',
    'Lx....Lx....Lx....Lx....Lx....Lx....Lx....Lx....Lx....Lx....Lx....Lx....Lx....Lx....Lx....Lx...L',
    'LljjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjlL',
    'llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll',
    'LlxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxlL',
    'LlnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnlL',
    'LlnnVnnnVnnnVnnnVnnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnlL',
    'LlnVIVnVIVnVIVnHIVnHIVnVIHnVIVnVIVnVIVnVIVnVIVnVIVnVIHnVIVnVIVnVIVnVIHnVIVnHIHnVIVnVIVnVIVnVIVlL',
    'LlnHGVnHGGnHGVnHGVnHGGnHGGnHGGnHGGnHGVnHGGnHGGnHGGnHGVnHGGnHGGnHGGnHGGnHGGnHGGnHGGnHGGnHGGnHGGlL',
    'LlnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnlL',
    'LlNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnnnVnnnVnnnVnnnVnnnVnnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnnnnnVnnnVnnnnnnnVnnnlL',
    'LlnnnHIVnHIHnVIVnVIVnVIHnVIVnVIHnVIVnVIVnVIVnVIVnVIVnVIHnVIVnVIHnHIVnVIVnVIVnVIVnVIHnHIHnVIVnnlL',
    'LlnnnHGGnHGVnHGGnHGGnHGGnHGVnHGGnHGGnHGVnHGVnHGGnHGGnHGGnHGVnHGVnHGVnHGGnHGGnHGGnHGGnHGGnHGVnnlL',
    'LlnnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnlL',
    'LlNNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnVnnnnnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnlL',
    'LlnVIVnVIHnVIVnVIVnVIVnVIHnVIVnHIHnHIVnVIHnHIHnVIVnVIVnHIHnVIVnVIVnVIVnHIVnVIVnVIVnVIVnVIVnVIVlL',
    'LlnHGGnHGGnHGVnHGGnHGGnHGGnHGGnHGGnHGVnHGGnHGGnHGVnHGGnHGVnHGGnHGGnHGGnHGGnHGVnHGGnHGGnHGGnHGGlL',
    'LlnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnlL',
    'LlNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnlL',
    'LlnnnVIHnVIVnVIVnHIHnHIHnVIVnVIVnVIVnHIVnVIHnVIVnVIVnVIVnVIVnHIVnVIVnHIHnHIVnVIVnHIVnHIVnVIVnnlL',
    'LlnnnHGGnHGGnHGGnHGGnHGVnHGVnHGGnHGVnHGGnHGGnHGGnHGVnHGGnHGGnHGGnHGVnHGGnHGGnHGGnHGGnHGGnHGGnnlL',
    'LlnnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnlL',
    'LlNNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnnnnnVnlL',
    'LlnVIVnVIVnVIVnVIVnVIVnVIHnVIVnVIVnHIVnVIVnVIVnHIHnVIVnVIVnVIVnVIVnVIVnVIVnVIVnVIVnHIVnVIVnHIHlL',
    'LlnHGVnHGVnHGGnHGVnHGGnHGVnHGGnHGGnHGGnHGVnHGVnHGGnHGGnHGGnHGGnHGGnHGGnHGGnHGVnHGGnHGGnHGGnHGGlL',
    'LlnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnlL',
    'LlNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnlL',
    'LlnnnHIVnHIHnHIVnVIVnHIVnVIVnVIVnVIVnVIVnHIVnVIVnVIVnVIVnVIVnVIVnVIHnHIVnHIVnHIVnVIHnVIHnHIVnnlL',
    'LlnnnHGGnHGGnHGGnHGGnHGGnHGVnHGGnHGGnHGVnHGGnHGGnHGGnHGVnHGGnHGGnHGVnHGGnHGGnHGGnHGVnHGGnHGVnnlL',
    'LlnnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnlL',
    'LlNNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnVnnnVnnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnlL',
    'LlnVIVnVIVnVIHnVIHnVIHnVIVnHIVnVIVnHIHnHIHnVIVnVIVnVIVnVIHnVIVnVIVnVIHnVIVnVIVnHIVnVIVnVIHnVIHlL',
    'LlnHGGnHGGnHGVnHGGnHGGnHGVnHGGnHGVnHGGnHGGnHGGnHGVnHGGnHGGnHGGnHGGnHGGnHGVnHGGnHGGnHGGnHGVnHGVlL',
    'LlnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnlL',
    'LlNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnnnVnnnnnnnVnnnVnnnVnnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnnnnnnnnnVnnnVnnnVnnnVnnnnnnnVnnnVnnnlL',
    'LlnnnVIVnHIHnVIHnVIVnHIHnVIVnVIVnVIVnHIVnVIVnVIVnVIVnVIHnVIVnVIVnVIVnHIVnVIVnVIVnVIHnVIVnVIVnnlL',
    'LlnnnHGGnHGVnHGGnHGGnHGVnHGGnHGGnHGGnHGGnHGGnHGGnHGVnHGGnHGVnHGVnHGGnHGVnHGVnHGVnHGVnHGGnHGGnnlL',
    'LlnnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnlL',
    'LlNNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnnnnnVnnnnnnnVnnnVnnnnnnnVnnnVnnnVnlL',
    'LlnHIVnHIVnVIHnHIHnHIVnVIVnVIVnVIHnHIHnVIVnVIHnHIVnVIHnHIVnVIVnVIVnVIHnVIHnVIVnVIHnVIVnVIVnVIVlL',
    'LlnHGGnHGVnHGGnHGGnHGVnHGGnHGGnHGVnHGGnHGGnHGVnHGVnHGGnHGGnHGGnHGGnHGVnHGGnHGGnHGGnHGGnHGVnHGVlL',
    'LlnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnlL',
    'LlNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnnnnnnnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnlL',
    'LlnnnVIVnHIVnVIVnVIVnHIVnVIVnVIVnHIVnHIVnVIHnHIHnVIVnVIHnVIVnVIVnVIVnVIVnVIVnVIVnVIVnVIVnVIVnnlL',
    'LlnnnHGGnHGVnHGGnHGGnHGVnHGGnHGVnHGGnHGVnHGVnHGGnHGVnHGGnHGGnHGGnHGVnHGVnHGVnHGGnHGGnHGGnHGGnnlL',
    'LlnnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnlL',
    'LlNNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnnnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnlL',
    'LlnVIVnHIVnVIVnHIVnVIVnHIVnVIVnHIVnHIVnHIVnVIHnVIVnHIHnVIVnVIVnVIVnVIVnVIVnVIVnVIVnVIVnVIVnVIVlL',
    'LlnHGGnHGVnHGGnHGGnHGGnHGGnHGGnHGGnHGVnHGVnHGGnHGVnHGVnHGGnHGGnHGVnHGGnHGGnHGGnHGVnHGVnHGGnHGVlL',
    'LlnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnlL',
    'LlNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnnnVnnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnlL',
    'LlnnnVIVnVIVnVIHnHIVnHIHnHIVnVIHnVIVnVIVnVIVnHIVnVIVnVIVnHIVnVIHnVIVnVIHnHIVnVIVnVIVnVIVnVIVnnlL',
    'LlnnnHGGnHGGnHGGnHGGnHGVnHGGnHGGnHGGnHGGnHGGnHGGnHGGnHGGnHGGnHGGnHGVnHGGnHGGnHGVnHGGnHGVnHGGnnlL',
    'LlnnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnlL',
    'LlNNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnVnnnVnnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnnnnnVnnnnnnnVnnnVnlL',
    'LlnVIVnVIVnVIVnVIVnVIVnVIHnHIVnVIVnVIHnVIVnVIVnHIVnHIVnVIVnVIVnHIVnVIVnVIHnVIVnHIVnVIVnVIVnHIVlL',
    'LlnHGVnHGGnHGGnHGGnHGGnHGGnHGGnHGGnHGVnHGGnHGGnHGGnHGGnHGVnHGGnHGGnHGGnHGVnHGVnHGGnHGGnHGGnHGGlL',
    'LlnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnlL',
    'LlNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnnnVnnnVnnnVnnnVnnnVnnnVnnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnnnnnVnnnVnnnnnnnVnnnVnnnVnnnVnnnVnnnlL',
    'LlnnnVIVnVIVnVIVnVIVnVIVnVIVnHIVnHIVnVIHnHIVnVIVnVIVnVIVnVIHnVIVnVIVnVIHnVIVnVIVnVIVnHIVnVIVnnlL',
    'LlnnnHGGnHGGnHGGnHGVnHGGnHGGnHGGnHGVnHGGnHGGnHGVnHGGnHGGnHGGnHGGnHGVnHGVnHGGnHGGnHGGnHGVnHGGnnlL',
    'LlnnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnGnnnlL',
    'LlNNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNGNNNlL',
    'LlmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmlL',
    'LlnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnlL',
    'LlnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnlL',
    'LlnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnlL',
    'jlnnnnjnnnnnjnnnnnjnnnnnjnnnnnjnnnnnjnnnnnjnnjnnnnnjnnjnnnnnjnnnnnjnnnnnjnnnnnjnnnnnjnnnnnjnnnlj',
    'LlnnnnLnnnnnLnnnnnLnnnnnLnnnnnLnnnnnLnnnnnLnnLnnnnnLnnLnnnnnLnnnnnLnnnnnLnnnnnLnnnnnLnnnnnLnnnlL',
    'LljjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjLxxxxxLjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjjjLjjjlL',
    'llllllllllllllllllllllllllllllllllllllllllllllx....lllllllllllllllllllllllllllllllllllllllllllll',
    '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx......xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  ],
  orchard: [
    '................................................................................',
    '.....ooooo........ooooo........ooooo........ooooo........ooooo........ooooo.....',
    '....oHHHGGo......oHHHGGo......oHHHGGo......oHHHGGo......oHHFGGo......oFHHGFo....',
    '...oHHHGGGTo....oHHHGGGTo....oHFHGGGTo....oFHHGFGTo....oHHHfGGTo....oHfHGGFTo...',
    '..oHHGGGGGGTo..oFFGGGGGGTo..oFHfGGGGGTo..oHfGGGfGGTo..oHHGGGGGGTo..oHHGGGGfGTo..',
    '..oHGGGGGGGTo..offGGGGGGTo..ofGGGGGGGTo..oFGGGGGGGTo..oHGGGGGFGTo..oHGGGGGGGTo..',
    '..oGFFGGFGTTo..oGGGGGFGTTo..oGFGFGGGTTo..ofGGGGGGTTo..oGFGGGGfTTo..oGGGGGGFTTo..',
    '...ofFGGfTTo....oGGGFfTTo....ofGfGGTTo....oFGGGGTTo....ofGGGFTTo....oGGGGGfTo...',
    '....ooTTToo......ooTTToo......ooTTToo......ooTTToo......ooTTToo......ooTTToo....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '.....xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox....',
    '......xxxx.........xxxx.........xxxx.........xxxx.........xxxx.........xxxx.....',
    '................................................................................',
    '................................................................................',
    '.....ooooo........ooooo........ooooo........ooooo........ooooo........ooooo.....',
    '....oHHFFGo......oHFHGGo......oHHHGGo......oFHHGGo......oHHHGGo......oHHHGGo....',
    '...oHHHffGTo....oHHfGGGTo....oHHHGGGTo....oHfHGGGTo....oFHHGGGTo....oFHHGGGTo...',
    '..oHFGGFGGGTo..oHHGGGGGGTo..oHFGGGGGGTo..oHHGFGGGFTo..oHfGGGGFGTo..oHfGGGFGGTo..',
    '..oHfGGfGGGTo..oHFGGGGGGTo..oHfGGGGGGTo..oHGGfGGGfTo..oHGGGGGfFTo..oHFGGGfGGTo..',
    '..oGGGGGGGTTo..oGfFGGGGTTo..oGFGGGGFTTo..oGGGGFGGTTo..oGGFGGGGfTo..oGfGGGGGTTo..',
    '...oGGGGGTTo....oGfGGFTTo....ofGGFGfTo....oGGGfGTTo....oGfGGGTTo....oGFGGGTTo...',
    '....ooTTToo......ooTTToo......ooTTToo......ooTTToo......ooTTToo......ooTTToo....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '.....xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox....',
    '......xxxx.........xxxx.........xxxx.........xxxx.........xxxx.........xxxx.....',
    '................................................................................',
    '................................................................................',
    '.....ooooo........ooooo........ooooo........ooooo........ooooo........ooooo.....',
    '....oHFHGGo......oHHHGFo......oHHHGFo......oFFHFGo......oHHHGGo......oHHHGFo....',
    '...oHHfGGGTo....oHFHGGfTo....oHFHGGfTo....oHffGfGTo....oHHHGGGTo....oHHHGGfTo...',
    '..oHHGFGGGFTo..oHHfGGGGGTo..oHHfGGGGFTo..oHHFGGGGGTo..oHHGGGGGGTo..oHFGGGGFGTo..',
    '..oHGGfGGGfTo..oHGGGGGFGTo..oHGGGGFGfTo..oHGfGGGGGTo..oHGGGGFFFTo..oHfGGGGfGTo..',
    '..oGGGGGFGTTo..oGGGGGGfTTo..oGGGGGfGTTo..oGGGGGGGTTo..oGGGFGfffTo..oGGGGGGGTTo..',
    '...oGGGGfTTo....oGGFGGTTo....oGGGGGTTo....oGGGGGTTo....oGGfGGTTo....oGGFGGTTo...',
    '....ooTTToo......ooTTToo......ooTTToo......ooTTToo......ooTTToo......ooTTToo....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '.....xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox....',
    '......xxxx.........xxxx.........xxxx.........xxxx.........xxxx.........xxxx.....',
    '................................................................................',
    '................................................................................',
    '.....ooooo........ooooo........ooooo........ooooo........ooooo........ooooo.....',
    '....oFHHGGo......oHHHGGo......oFHHFGo......oHHHGGo......oHHHGGo......oHHHGGo....',
    '...oFfHGGGTo....oHHFFGGTo....oHFHGfGTo....oHHHGGGTo....oHHHFGGTo....oHHFGGGTo...',
    '..oHfGGGGGGTo..oHHGfFGGGTo..oHHfGGGGGTo..oFFGGGGGGTo..oHFGGfGGGTo..oHHGfGGGGTo..',
    '..oFGFGGGGGTo..oHGGGfGGFTo..oHGGGGGGGTo..offGGGGGGTo..oHfGGGGGGTo..oHGGGGFFFTo..',
    '..ofGfGGGGTTo..oGGGGGGGfTo..oGGFGGGGTTo..oGGGGFGGTTo..oGFGGGFGTTo..oGGGGGfffTo..',
    '...oGGGGGTTo....oGGGGGTTo....oGfGGGTTo....oGFGfGTTo....ofGGGfTTo....oGGGGGTTo...',
    '....ooTTToo......ooTTToo......ooTTToo......ooTTToo......ooTTToo......ooTTToo....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '.....xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox....',
    '......xxxx.........xxxx.........xxxx.........xxxx.........xxxx.........xxxx.....',
    '................................................................................',
    '................................................................................',
    '.....ooooo........ooooo........ooooo........ooooo........ooooo........ooooo.....',
    '....oFHHGGo......oHFHGGo......oHHHGGo......oHHFGGo......oFHHGGo......oHHHGFo....',
    '...oHfHGGGTo....oHHfGGGTo....oHHHGGGTo....oHFHfFGTo....oHfHGGGTo....oFHHGGfTo...',
    '..oHHFGGGFGTo..oHHFGGGGGTo..oFHGGGGGGTo..oHHFGGfGGTo..oHHGGGFGGTo..oHfGGGGGFTo..',
    '..oHGfGGGfFTo..oFGfGGGGGTo..ofGGGGGFGTo..oHGfGGGGGTo..oHGFGGfGGTo..oHGGGGFGfTo..',
    '..oGGGGGGGfTo..ofGGGGGGTTo..oGGGGGGfTTo..oGGGGGGGTTo..oGFfGGGGTTo..oGGGGGfGTTo..',
    '...oGGGGGTTo....oGGGFGTTo....oGGFGFTTo....oGGGGGTTo....ofGGGGTTo....oGGGGGTTo...',
    '....ooTTToo......ooTTToo......ooTTToo......ooTTToo......ooTTToo......ooTTToo....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '.....xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox....',
    '......xxxx.........xxxx.........xxxx.........xxxx.........xxxx.........xxxx.....',
    '................................................................................',
    '................................................................................',
    '.....ooooo........ooooo........ooooo........ooooo........ooooo........ooooo.....',
    '....oFHHGGo......oHHHGGo......oHHHGGo......oHHHGGo......oHHHGGo......oHHHGGo....',
    '...oHfHGGGTo....oHHHFGGTo....oHHHFGGTo....oHHHGFGTo....oHHHGGFTo....oHHHGGGTo...',
    '..oHHFGFGGGTo..oHHGGfGGGTo..oHHGGfGGGTo..oFHGGGfGGTo..oHFGFFGfGTo..oHFGGGGGGTo..',
    '..oHGfGfGGGTo..oHGGGFGGGTo..oHGGGGGGGTo..oFGGGGFGGTo..oHfGffGGGTo..oHfGGGFGGTo..',
    '..oGGGGGGGTTo..oGGFGfGGTTo..oGGGFGGGTTo..ofGGGGfGTTo..oGGGGGGGTTo..oGGGFGfGTTo..',
    '...oGGGFGTTo....oGfGGFTTo....oGGFFGTTo....oGGGGGTTo....oGGGGGTTo....oGFfGGTTo...',
    '....ooTTToo......ooTTToo......ooTTToo......ooTTToo......ooTTToo......ooTTToo....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '.....xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox....',
    '......xxxx.........xxxx.........xxxx.........xxxx.........xxxx.........xxxx.....',
    '................................................................................',
    '................................................................................',
    '................................................................................',
    '................................................................................',
    '................................................................................',
    '................................................................................',
    '................................................................................',
  ],
  tradingPost: [
    '................................',
    '................................',
    '................................',
    '..oooooooooooooooooo............',
    '.rrurrrurrrurrrurrrur...........',
    '.RRuRRRuRRRuRRRuRRRuR...........',
    '.rrurrrurrrurrrurrrur...........',
    '.RRuRRRuRRRuRRRuRRRuR...........',
    '.rrurrrurrrurrrurrrurx..........',
    '.RRuRRRuRRRuRRRuRRRuRx..........',
    '.oooooooooooooooooooox..........',
    '..oeLLLLLLLLLLLLLLeoxx..........',
    '..olloooooooooooolloxx..........',
    '..oeLokYYkmmmmmkoLeoxx..........',
    '..ollokYYkmmmmkkolloxx..........',
    '..oeLooooooooooooLeoxx..........',
    '..olllllllllllllllloxx..........',
    '..oeLLLLooooooLLLLeoxo.o........',
    '..ollllloNNNNollllloxqoq........',
    '..oeLLLLoNNNNoLLLLeooqqqo.......',
    '..oloooooNNNNolllllooqoqo.......',
    '..oeoeeeoNNNNoLLLLeooqqqqoooooo.',
    '..oloEEEoNNNNolllllooddqqkkkkkqo',
    '..oeoeeeoNNNNoLLLLeoxoooqkYYYkqo',
    '.ooooooooNNNNollllloxx.oqkkWkkqi',
    '.oEvEEoLoNNNNoooboooxx.oqqqqqqqi',
    '.oEvEEoloNNNNooWWWooxx.oqqqqqqqo',
    '.ovvvvoooNNNNookkkooxx.ooooooooo',
    '.oEvEEoxxxxxxxokkkoxxxxxixixxixi',
    '.oEvEEoxxxxxxxokkkoxxxxxixixxixi',
    '.ooooooxxxxxxxoooooxxxxxixixxixi',
    '.xxxxxxxxxxxxxxxxxxxxxxxoxoxxoxo',
    '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    '.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    '................................',
    '................................',
  ],
  tailor: [
    '.......oooooooooooooooo.........',
    '......opptppptppptppptpo........',
    '.....oPtPPPtPPPtPPPtPPPto.......',
    '....opptppptppptppptppptpo......',
    '...oPtPPPtPPPtPPPtPPPtPPPto.....',
    '..opptppptppptppptppptppptpo....',
    '.oPtPPPtPPPtPPPtPPPtPPPtPPPtox..',
    '.optppptppptppptppptppptppptoxx.',
    '.oPPPtPPPtPPPtPPPtPPPtPPPtPPoxx.',
    '.oppptppptppptppptppptppptppoxx.',
    '.oPtPPPtPPPtPPPtPPPtPPPtPPPtoxx.',
    '.optppptppptppptppptppptppptoxx.',
    '.ooooooooooooooooooooooooooooxx.',
    '..oLLLLLLLLLLLLLLLLLLLLLLLLoxx..',
    '..oLWWWWWWWWLWWWWWWWWWWWWWLoxx..',
    '..oLwwwwwwwwLoooooooooooooLoxx..',
    '..oLooooooooLpVVppVVppVVppLoxx..',
    '..oLokyppykoLpVVppVVppVVppLoxx..',
    '..oLokyppykoLPWWPPWWPPWWPPLoxx..',
    '..oLooooooooLwooooooooooooLoxx..',
    '..oLwwwwwwwwLwolllllllllloLoxx..',
    '..oLwwwwwwwwLwoBBccBBcFFcoLoxx..',
    '..oLwoooooowLwoBBBBBBcFFcoLoxx..',
    '..oLwoNbNNowLwocBBBBcFFFFoLoxx..',
    '..oLwoNbNNowLwocBBBBcFFFFoLoxx..',
    '..oLwoNbNNowLwocBBBBcFFFFoLoxx..',
    '..oLwoNbNYowLwoccccccccccoLoxx..',
    '..oLwoNbNNowLwooooooooooooLoxx..',
    '..oLwoNbNNowLhhhhhhhhhhhhhLoxx..',
    '..oLwoNbNNowLWWWWWWWWWWWWWLoxx..',
    '..oLwoNbNNowLwwwwwwwwwwwwwLoxx..',
    '..ooooooooooooooooooooooooooxx..',
    '...xxxxxxxxxxxxxxxxxxxxxxxxxxx..',
    '...xxxxxxxxxxxxxxxxxxxxxxxxxxx..',
    '...xxxxxxxxxxxxxxxxxxxxxxxxxxx..',
    '................................',
  ],
  outpost: [
    '....................................obFFFFF.....',
    '....................................obFFFF......',
    '....................................obfff.......',
    '....................................obo.........',
    '...................................ouuRo........',
    '..................................ouuuRRo.......',
    '.................................orrrrrrro......',
    '..o..o..o..o..o..o..o..o..o..o..ouuuuuRRRRo.o...',
    '.oLooLooLooLooLooLooLooLooLooLoouuuuuuRRRRRoLo..',
    '.jLljLljLljLljLljLljLljLljLljLorrrrrrrrrrrrrol.x',
    '.jLljLljLljLljLljLljLljLljLljouuuuuuuuRRRRRRRo.x',
    '.jlljlljlljlljlljlljlljlljllouuuuuuuuuRRRRRRRRox',
    '.jLljLljLljLljLljLljLljLljLorrrrrrrrrrrrrrrrrrrx',
    '.jLljLljLljLljLljLljLljLljLoooooooooooooooooooox',
    '.jlljlljlljlljlljlljlljlljlljooooooooooooooooo.x',
    '.jLljLljLljLljLljLljLljLljLljohhhhhhhhhhhhhhho.x',
    '.jLljLljLljLljLljLljLljLljLljohhbhhbhhbhhbhhho.x',
    '.ooooooooooooooooooooooooooooohhhhhhhhhhhhhhhoox',
    '.ojLodddddddddqddddddddddddddobbbbbbbbbbbbbbboox',
    '.oLloddddddddddddddddddddddddoooooooooooooooooox',
    '.ooooddddddddddddddddddddddddddojlodddddojlodoox',
    '.ojLodddddddoodddddddddddddqdddojlodddddojlodLox',
    '.oLloddddddoVIoddddddddddddddddojlodddddojlodlox',
    '.oooodddddoVVIIodddddddddddddddojlodddddojlodoox',
    '.ojLoddddoVVVIIIodddddddoodddddojlodddddojlodLox',
    '.oLlodqddoVVoDIIoddddddoFYoddddojlodddddojlodlox',
    '.oooodddoVVoDDDIIodddddoYFYodddojlodddddojlodoox',
    '.ojLodddoVVoDDDIIoddddoolloodddojlooooooojlodLox',
    '.oLloddoVVVoDDDIIIodddolnnlodddojlidididojlodlox',
    '.ooooddoooooooooooodddoooooddddojloididiojlodoox',
    '.ojLodddxxxxxxxxxxxxdddddddddddojlooooooojlodLox',
    '.oLloddddddddddddddddddddddddddojlodddddojlodlox',
    '.ooooddddddddddddddddddddddddddojlodddddojlodoox',
    '.ojLoddddddddddddddddddddddddddojlodddddojlodLox',
    '.oLlodddqdddddooooooooooooooooooooodddddojlodlox',
    '.oooodddddddddonnnnnnnnnnnnnnnnnnnodddddojlodoox',
    '.ojLodddddddddobbbbbbbbbbbbbbbbbbbodddddojlodLox',
    '.oLlodddddddddooooooooooooooooooooodddddoooodlox',
    '.oooodddddddddojloiiiiiiiiiiiiiojloxxxxxxxxxxoox',
    '.ooLooddoddoddojlodddddddddddddojlooddoddodooLox',
    '.oLooLooLooLooojlodddddddddddddojloLooLooLooLoox',
    '.jLljLljLljLljojlodddddddddddddojloLljLljLljLlox',
    '.jLljLljLljLljojlodddddddddddddojloLljLljLljLl.x',
    '.jlljlljlljlljojlodddddddddddddojlolljlljlljll.x',
    '.jLljLljLljLljojloddddqddddddddojloLljLljLljLl.x',
    '.jLljLljLljLljojlodddddddddddddojloLljLljLljLl.x',
    '.jlljlljlljlljojlodddddddddddddojlolljlljlljll.x',
    '.jLljLljLljLljojlodddddddddddddojloLljLljLljLl.x',
    '.jLljLljLljLljojlodddddddddddddojloLljLljLljLl.x',
    '.ooooooooooooooooodddddddddqdddoooooooooooooooox',
    '..xxxxxxxxxxxxxxxxdddddddddddddxxxxxxxxxxxxxxxx.',
    '..................ddddddddddddd.................',
  ],
  masonsYard: [
    '.....oooooooooooooooooooooooooooooo.............................',
    '....ouuRuuRuuRuuRuuRuuRuuRuuRuuRuuRox.ooooooooooooooooox........',
    '....ouuRuuRuuRuuRuuRuuRuuRuuRuuRuuRoxojjjjjjjjjjjjjjjjjx........',
    '....ouuRuuRuuRuuRuuRuuRuuRuuRuuRuuRoxoLLLLLLLLLLLLLLLLLx........',
    '.oooouuRuuRuuRuuRuuRuuRuuRuuRuuRuuRoqooooooooooooooooooqooooooo.',
    '.oddouuRuuRuuRuuRuuRuuRuuRuuRuuRuuRoqdhdDdddddddddLojLoqkdddddox',
    '.oddouuRuuRuuRuuRuuRuuRuuRuuRuuRuuRoqdddDdkddddddLoojLoqhdddddox',
    '.oddouuRuuRuuRuuRuuRuuRuuRuuRuuRuuRoqddkDdddddddLodojLoqqddddqox',
    '.oddouuRuuRuuRuuRuuRuuRuuRuuRuuRuuRoqhddDddddddLoddojLoqddddddox',
    '.oddouuRuuRuuRuuRuuRuuRuuRuuRuuRuuRoqdddDddddhLodddojLoqddddddox',
    '.oddouuRuuRuuRuuRuuRuuRuuRuuRuuRuuRoqdddDddddLodddhojLoqddddddox',
    '.oddouuRuuRuuRuuRuuRuuRuuRuuRuuRuuRoqdddDddddodddddojLoqddddddox',
    '.oddouuRuuRuuRuuRuuRuuRuuRuuRuuRuuRoqddkDdddddddkddojLoqdddddqox',
    '.oddouuRuuRuuRuuRuuRuuRuuRuuRuuRuuRoqdddDdddddhddhhojLoqkdddddox',
    '.oddojjjjjjjjjjjjjjjjjjjjjjjjjjjjjjoqdddDddhdddkhddojLoqhdddddox',
    '.oddolllllllllllllllllllllllllllllloqddqDddddddddddojLoqhdddkdox',
    '.oddoLLlLLLlLLLlLLLlLLLlLLLlLLLlLLLoqkddDddkdddddddojLoqdddddkox',
    '.oddoLLlLLLlLLLlLLLlLLLlLLLlLLLlLLLoqdddDdhddkdddddojLoqddddddox',
    '.oddoLLlLLLloooooooooooooooooooooLLoqdddDdhddddddhdojLoqddddddox',
    '.oddoooooooloDDDDDDDDDDDDDDDDDDDoLLoqddKKKdddddddddojLoqddddddox',
    '.ohdooccccoloDDDDDDDDDDDDDDDDDDDoLLoooooooooodddhddojLoqddhddhox',
    '.odqooccccoloDDDDDoooooooooDDDDDoLLooSSSSSSsoddddddojLoqhkdqdqox',
    '.oddoocoocoloDDDDDoSSSSSSsoDDDDDoLLooSaaaaasoddddddojLoqqdddddox',
    '.oddooccccoloDDDDDoSaaaaasoSDDDDoLLooSaaaaasodhddddojLoqqddddqox',
    '.oddooccccoloDDDDDosssssssoKDDDDoLLooSaaaaasodkddkdojLoqddddddox',
    '.oddoooooooloDDDDDoooooooooDKDDDoLLooSaaaaasohdddddojLoqdddqddox',
    '.oddoLLlLLLloDjjjjjjjjjjjjjjjjjDoLLoosssssssodddddqojLoqddqdddox',
    '.oddoLLlLLLloDjjjjjjjjjjjjjjjjjDoLLooooooooooddqqkdojLoqddddddox',
    '.oddoLLlLLLloDDbbDDDDDDDDDDDbbDDoLLoqddhdddddddddqdojLoqddhdddox',
    '.oddoLLlLLLloDDbbDDDDDDDDDDDbbDDoLLoqdddddddddddkdhojLoqdddkqdox',
    '.oddoLLlLLLloDDbbDDDDDDDDDDDbbDDoLLoqddddhkddddqdddojLoqddddddox',
    '.oddoLLlLLLloDDbbDDDDDDDDDDDbbDDoLLoqhdqdddddddddddojLoqdqddddox',
    '.oddooooooooooooooooooooooooooooooooddddddddqddddddojLoqdddddkox',
    '.okddqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqddqdkddqdddqddojLoqddddqkox',
    '.osssdddddkdddddkhekkkekkkekWWdddddddddddddddddddddojLoqdddsssox',
    '.oasSddddddhddddddekkkekkkekWWddddhkkkddhhddddddddhojLoqdqdaaaox',
    '.oSaadddddddddqdddeeeeeeeeeeeeddddhddddddddddddddddojLoqdddaSsox',
    '.osssqhdddddddddddWWekkkekkkekkddddddddddddddddddddojLoqdddsssox',
    '.oaaSdddddkdddddddWWekkkekkkekdddddddhhdddkdqddddddojLoqhddaasox',
    '.oaasdddqddddddkddeeeeeeeeeeeedddddddqddddddddooooooooooooosaaox',
    '.osssddddddddddddkekWWeWkkekkkdddhddddkqddddddojjjjjjjjjjjosssox',
    '.oaasddddhddddddddekWWeWkkekkkhdddddddddddddddoLLLLLLLLLLLoqaSox',
    '.osaahddddhqddddddeeeeeeeeeeeedddkddhdddddhdddoLLssLssLssLoqaaox',
    '.osssdddddddddddddkkekkkeWWWekddddkdddkkdddkqdoLLssLssLssLoqssox',
    '.osaSddddqddddqdqdkkekkkeWWWekddddkdddddddddhdoLLssLssLssLoqaaox',
    '.oaaakddddddddddddeeeeeeeeeeeedddddddddhddooooooooLLLLLLLLoqsaox',
    '.osssdddddkdddddddekkkekkkekWWddddddqdddddoSSSSSsoLLLLLLLLoqssox',
    '.oaaaddkqddkddddddekkkekkkekWWdddqdddhddddoSaaaasooooooooooqsaox',
    '.oasSdddddoooooodkeeeeeeeeeeeedddddddddqddoSaaaasoqqqqqqqqqqaaox',
    '.osssddddhoaaaaoddWWekkkekkkekdddddddddqddossssssodddddddddsssox',
    '.oasSdddddoaKKZokhWWekkkekkkekhdddddddoooooooooooooooodddddaaaox',
    '.oaaSooooooKKKZoddeeeeeeeeeeeeddddhqqkoSSSSSsooSSSSSsodddddaasox',
    '.osssoaaaaoKKKZoddekWWeWkkekkkdddkddddoSaaaasooSaaaasodddddsssox',
    '.oaSaoaKKoooooooddekWWeWkkekkkdddqdhhkoSaaaasooSaaaasodddddaasox',
    '.oaasoKKKoaaaaaoddeeeeeeeeeeeekdddddddossssssoossssssodddddsaaox',
    '.osssoooooooKKZoddkkekkkeWWWekddddoooooooooooooooooooooooodsssox',
    '.oaasoaaaaaoKKZodkkkekkkeWWWekddddoSSSSSsooSSSSSsooSSSSSsoqsaaox',
    '.osaaoaKKKZoKKZoddeeeeeeeeeeeeddddoSaaaasooSaaaasooSaaaasoqaaSox',
    '.osssoKKKKZoooooddekkkekkkekWWddodoSaaaasooSaaaasooSaaaasoqsssox',
    '.osSaoKKKKZodddKkdekkkekkkekWWhqKhossssssoossssssoossssssoqaSaox',
    '.oaaaooooooodhdKddeeeeeeeeeeeeddKdooooooooooooooooooooooooqasaox',
    '.ossshqqdddddddKddWWekkkekkkekddKddqqqqqqqqqqqqqqqqqqqqqqqqsssox',
    '.osssssssssssssKddWWekkkekkkekddKsssssssssssssssssssssssssssssox',
    '.oasSaaSsaaaasaKddeeeeeeeeeeeeddKsaaaasaSaasaSaasaaaasSSaasaaaox',
    '.oasaaaSsaaaasaKdkekWWeWkkekkkqdKsaaSasaaaSsSaaSsSaaasaaaasaaaox',
    '.oooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooox',
    '..xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    '................................................................',
  ],
};

/** A house rebuilt in stone at the Mason's Yard: the house's roof (slate, `STONE_HOUSE_TINT`) over dressed stone, so its snow, lights and smoke still fit. */
export const STONE_HOUSE: readonly string[] = [
  ...BUILDING_SPRITES.house!.slice(0, 11),
  '..ossssssssssoxx',
  '..oaSaasaSaasoxx',
  '..oaDDDSaLLLLoxx',
  '..osDLDsaLccLoxx',
  '..oaDLDaSLLLLoxx',
  '..oSDLDsaaSaaoxx',
  ...BUILDING_SPRITES.house!.slice(17),
];
/** The stone house's slate roof, recolored over the thatch (in winter the snow covers it). */
export const STONE_HOUSE_TINT: Record<string, Rgba> = {
  Y: [128, 140, 156, 255], // #808c9c
  y: [102, 114, 130, 255], // #667282
  m: [86, 96, 112, 255], // #566070
  v: [70, 79, 94, 255], // #464f5e
};

/** The orchard in winter: bare fruit trees with snow on their branches. */
const WINTER_ORCHARD: readonly string[] = [
    '................................................................................',
    '.....z.z..A.......z.z..A.......z.z..A.......z.z..A.......z.z..A.......z.z..A....',
    '...zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N....',
    '...NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN...',
    '...z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N....',
    '...N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A...',
    '....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN...',
    '......NLlN.........NLlN.........NLlN.........NLlN.........NLlN.........NLlN.....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '.....xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox....',
    '......xxxx.........xxxx.........xxxx.........xxxx.........xxxx.........xxxx.....',
    '................................................................................',
    '................................................................................',
    '.....z.z..A.......z.z..A.......z.z..A.......z.z..A.......z.z..A.......z.z..A....',
    '...zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N....',
    '...NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN...',
    '...z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N....',
    '...N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A...',
    '....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN...',
    '......NLlN.........NLlN.........NLlN.........NLlN.........NLlN.........NLlN.....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '.....xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox....',
    '......xxxx.........xxxx.........xxxx.........xxxx.........xxxx.........xxxx.....',
    '................................................................................',
    '................................................................................',
    '.....z.z..A.......z.z..A.......z.z..A.......z.z..A.......z.z..A.......z.z..A....',
    '...zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N....',
    '...NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN...',
    '...z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N....',
    '...N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A...',
    '....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN...',
    '......NLlN.........NLlN.........NLlN.........NLlN.........NLlN.........NLlN.....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '.....xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox....',
    '......xxxx.........xxxx.........xxxx.........xxxx.........xxxx.........xxxx.....',
    '................................................................................',
    '................................................................................',
    '.....z.z..A.......z.z..A.......z.z..A.......z.z..A.......z.z..A.......z.z..A....',
    '...zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N....',
    '...NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN...',
    '...z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N....',
    '...N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A...',
    '....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN...',
    '......NLlN.........NLlN.........NLlN.........NLlN.........NLlN.........NLlN.....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '.....xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox....',
    '......xxxx.........xxxx.........xxxx.........xxxx.........xxxx.........xxxx.....',
    '................................................................................',
    '................................................................................',
    '.....z.z..A.......z.z..A.......z.z..A.......z.z..A.......z.z..A.......z.z..A....',
    '...zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N....',
    '...NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN...',
    '...z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N....',
    '...N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A...',
    '....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN...',
    '......NLlN.........NLlN.........NLlN.........NLlN.........NLlN.........NLlN.....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '.....xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox....',
    '......xxxx.........xxxx.........xxxx.........xxxx.........xxxx.........xxxx.....',
    '................................................................................',
    '................................................................................',
    '.....z.z..A.......z.z..A.......z.z..A.......z.z..A.......z.z..A.......z.z..A....',
    '...zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N.....zzN.N..N....',
    '...NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN....NNN.N..NN...',
    '...z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N.....z.NzN..N....',
    '...N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A....N.zNN.N.A...',
    '....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN.....NNzLl.NN...',
    '......NLlN.........NLlN.........NLlN.........NLlN.........NLlN.........NLlN.....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '......oLlo.........oLlo.........oLlo.........oLlo.........oLlo.........oLlo.....',
    '.....xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox.......xoLlox....',
    '......xxxx.........xxxx.........xxxx.........xxxx.........xxxx.........xxxx.....',
    '................................................................................',
    '................................................................................',
    '................................................................................',
    '................................................................................',
    '................................................................................',
    '................................................................................',
    '................................................................................',
];

const SNOW: Rgba = [228, 235, 242, 255]; // the winter ground
const SNOW_SHADE: Rgba = [196, 208, 222, 255];
const SOIL: Rgba = [107, 74, 42, 255]; // n

/** Per season, recolors over BUILDING_PALETTE and replacement grids where the shape changes; summer is the base art. */
export const BUILDING_SEASONS: Record<Season, Partial<Record<BuildingKind, { tint?: Record<string, Rgba>; grid?: readonly string[] }>>> = {
  spring: {
    farm: { tint: { Y: SOIL, y: SOIL, g: [127, 191, 74, 255] } }, // sprouts, no grain yet
    orchard: { tint: { F: [244, 184, 200, 255], f: [251, 238, 240, 255] } }, // blossom where the fruit hangs
    cottonPlantation: { tint: { V: [168, 208, 112, 255] } }, // green buds, the odd early boll
    sheepFarm: { tint: { G: [90, 154, 68, 255], H: [154, 208, 112, 255] } },
  },
  summer: {},
  autumn: {
    farm: { tint: { Y: [248, 216, 74, 255], y: [216, 160, 48, 255], g: [200, 164, 64, 255] } }, // ripe wheat
    orchard: { tint: { H: [232, 176, 64, 255], G: [200, 122, 42, 255], T: [138, 74, 26, 255], F: [214, 48, 36, 255], f: [160, 30, 24, 255] } },
    cottonPlantation: { tint: { H: [242, 239, 230, 255] } }, // bolls burst open
    sheepFarm: { tint: { G: [138, 122, 58, 255], H: [192, 176, 96, 255] } },
  },
  winter: {
    farm: { tint: { n: SNOW, m: SNOW_SHADE, Y: SNOW, y: SNOW, g: [138, 112, 72, 255] } }, // snow between bare furrows
    orchard: { grid: WINTER_ORCHARD },
    cottonPlantation: { tint: { m: SNOW, N: SNOW_SHADE, G: [122, 96, 64, 255], H: [184, 168, 136, 255] } }, // bolls on dead stalks, snow between the rows
    sheepFarm: { tint: { G: SNOW_SHADE, H: SNOW } },
  },
};

const WATER: Rgba = [86, 156, 214, 255];
const DAMP: Rgba = [84, 56, 30, 255]; // wet soil
const DAMP_SHADE: Rgba = [60, 38, 20, 255];

/**
 * Per season, recolors over a farm's seasonal palette when a Well boosts it: damp soil, lusher crops,
 * and the ridges between the beds (m) turned to water channels, frozen to ice in winter.
 */
export const WELL_FARM_TINTS: Record<Season, Record<string, Rgba>> = {
  spring: { n: DAMP, N: DAMP_SHADE, m: WATER, Y: DAMP, y: DAMP, g: [92, 178, 58, 255] },
  summer: { n: DAMP, N: DAMP_SHADE, m: WATER, Y: [250, 214, 84, 255], y: [214, 160, 44, 255], g: [112, 168, 58, 255] },
  autumn: { n: DAMP, N: DAMP_SHADE, m: WATER, Y: [255, 228, 70, 255], y: [228, 172, 40, 255], g: [196, 170, 56, 255] },
  winter: { m: [176, 214, 236, 255] },
};

interface RoofSection {
  rows: readonly [number, number]; // first and last row
  snow: string; // chars that turn to snow (z)
  shade: string; // chars that turn to snow in shade (A)
}

/** Roof sections per building that snow covers in winter; a ridge splits a roof whose slopes reuse chars. */
export const ROOFS: Partial<Record<BuildingKind, readonly RoofSection[]>> = {
  lumberCamp: [{ rows: [1, 12], snow: 'urj', shade: 'Rl' }],
  townCenter: [{ rows: [3, 21], snow: 'urj', shade: 'Rl' }],
  house: [{ rows: [2, 10], snow: 'Yy', shade: 'vm' }],
  barn: [
    { rows: [2, 7], snow: 'aS', shade: 'K' },
    { rows: [8, 12], snow: 'K', shade: 'Z' },
  ],
  well: [{ rows: [2, 4], snow: 'Rr', shade: 'l' }],
  market: [{ rows: [5, 6], snow: 'V', shade: 'F' }],
  taxOffice: [{ rows: [1, 11], snow: 'K', shade: 'Z' }],
  tradingPost: [{ rows: [4, 9], snow: 'ur', shade: 'R' }],
  tailor: [{ rows: [1, 11], snow: 'pt', shade: 'P' }],
  outpost: [{ rows: [3, 12], snow: 'ur', shade: 'R' }],
  masonsYard: [{ rows: [1, 13], snow: 'u', shade: 'R' }],
};

/** Where smoke leaves a building's chimney in winter, in art pixels from its sprite's top-left: the middle of the chimney's top. */
export const CHIMNEYS: Partial<Record<BuildingKind, readonly [number, number]>> = {
  house: [11, 0],
};

/** RGBA per Christmas light grid char: a bulb lit (lower case) or dimmed (upper case) as it twinkles, on a dark wire. */
export const LIGHTS_PALETTE: Record<string, Rgba> = {
  k: [34, 64, 40, 255], // #224028 wire
  r: [236, 52, 44, 255], // #ec342c red
  R: [150, 30, 30, 255],
  g: [72, 210, 92, 255], // #48d25c green
  G: [30, 110, 50, 255],
  b: [80, 150, 255, 255], // #5096ff blue
  B: [40, 70, 150, 255],
  y: [255, 214, 64, 255], // #ffd640 yellow
  Y: [160, 120, 30, 255],
};

/** Christmas lights some houses hang in winter: colored bulbs swagged under the eave, drawn over the house sprite at its size, in two frames that twinkle. */
export const HOUSE_LIGHTS: readonly (readonly string[])[] = [
  [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.k...k...k...k..',
    '..r.g.b.y.r.g...',
    '...b...r...y....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.k...k...k...k..',
    '..r.G.b.Y.r.G...',
    '...B...r...Y....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
];

/**
 * A building's grid and palette in a season: its seasonal grid and tint over the summer art, and in winter snow on its roof.
 * `wellFed` adds the farm's `WELL_FARM_TINTS`; `art` stands in for the summer art (the stone house).
 */
export function seasonalBuilding(
  kind: BuildingKind, season: Season, wellFed = false, art = BUILDING_SPRITES[kind],
): { grid: readonly string[]; palette: Record<string, Rgba> } | undefined {
  if (!art) return undefined;
  const { grid = art, tint } = BUILDING_SEASONS[season][kind] ?? {};
  const roof = season === 'winter' ? (ROOFS[kind] ?? []) : [];
  const snowy = (row: string, y: number) => {
    const r = roof.find(({ rows }) => y >= rows[0] && y <= rows[1]);
    return r ? row.replace(/./g, (ch) => (r.snow.includes(ch) ? 'z' : r.shade.includes(ch) ? 'A' : ch)) : row;
  };
  return { grid: grid.map(snowy), palette: { ...BUILDING_PALETTE, ...tint, ...(wellFed ? WELL_FARM_TINTS[season] : {}) } };
}

/** RGBA per decoration grid char. */
export const DECOR_PALETTE: Record<string, Rgba> = {
  o: [36, 22, 12, 255], // #24160c outline
  x: [0, 0, 0, 70], // #000000 shadow
  b: [90, 58, 31, 255], // #5a3a1f wood dark
  B: [138, 90, 48, 255], // #8a5a30 wood
  h: [168, 116, 63, 255], // #a8743f wood lit
  w: [242, 239, 230, 255], // #f2efe6 white paint, snow
  W: [196, 190, 174, 255], // #c4beae white in shade
  S: [195, 202, 210, 255], // #c3cad2 stone lit
  a: [154, 163, 172, 255], // #9aa3ac stone
  s: [120, 131, 142, 255], // #78838e stone shade
  g: [31, 82, 40, 255], // #1f5228 leaf dark
  G: [46, 122, 51, 255], // #2e7a33 leaf
  H: [79, 156, 60, 255], // #4f9c3c leaf lit
  J: [134, 196, 84, 255], // #86c454 leaf highlight
  y: [239, 203, 98, 255], // #efcb62 gold lit
  Y: [201, 154, 58, 255], // #c99a3a gold
  v: [138, 101, 38, 255], // #8a6526 gold shade
  c: [159, 208, 236, 255], // #9fd0ec water lit
  u: [86, 156, 214, 255], // #569cd6 water
  U: [58, 120, 176, 255], // #3a78b0 deep water
  r: [178, 59, 46, 255], // #b23b2e red cloth
  R: [132, 42, 32, 255], // #842a20 red in shade
  p: [229, 138, 160, 255], // #e58aa0 pink
  P: [246, 190, 206, 255], // #f6bece pink lit
  q: [196, 96, 128, 255], // #c46080 pink deep
  e: [252, 240, 246, 255], // #fcf0f6 blossom white
  f: [255, 240, 160, 255], // #fff0a0 lamplight
  F: [246, 190, 70, 255], // #f6be46 lamplight edge
  n: [107, 74, 42, 255], // #6b4a2a soil
  N: [78, 52, 28, 255], // #4e341c soil dark
  k: [43, 39, 34, 255], // #2b2722 iron
  K: [86, 82, 78, 255], // #56524e iron lit
  t: [222, 196, 132, 255], // #dec484 straw lit
  T: [180, 142, 78, 255], // #b48e4e straw
  i: [74, 111, 165, 255], // #4a6fa5 blue cloth
  I: [50, 78, 120, 255], // #324e78 blue in shade
  l: [164, 135, 216, 255], // #a487d8 violet
  L: [232, 140, 48, 255], // #e88c30 orange
  '1': [204, 196, 178, 255], // #ccc4b2 paving lit
  '2': [172, 164, 146, 255], // #aca492 paving
  '3': [140, 132, 116, 255], // #8c8474 paving shade
  '4': [104, 96, 84, 255], // #686054 paving joint
  d: [184, 150, 104, 255], // #b89668 dirt path lit
  D: [160, 126, 84, 255], // #a07e54 dirt path
  m: [124, 94, 60, 255], // #7c5e3c dirt path edge
  '5': [195, 202, 210, 255], // #c3cad2 wall cap (stone lit; snowed over in winter)
  '6': [154, 163, 172, 255], // #9aa3ac wall cap edge
  M: [92, 128, 58, 255], // #5c803a moss
  E: [250, 178, 86, 255], // #fab256 pumpkin lit
  O: [180, 92, 30, 255], // #b45c1e pumpkin shade
};

/**
 * Decoration sprites (core/decor.ts): props are w·SPRITE_W × h·SPRITE_W + OVERHANG_PX like buildings; ground
 * decorations lie flat at w·SPRITE_W × h·SPRITE_W. A joining kind's sprite is its lone piece (see composeDecor).
 */
export const DECOR_SPRITES: Record<DecorKind, readonly string[]> = {
  flowerBed: [
    '................',
    '....NNNNNNNN....',
    '..NNGHpPGHyYNN..',
    '.NGpPpGlLGyyHGN.',
    '.NHGpGHlllGGpPN.',
    'NGyYGHGGlGHppPpN',
    'NGyyGpPGHGGGpGHN',
    'NHGGHpPpGyYGHGlN',
    'NGlLGGpGGyyGGllN',
    'NGllGHGGHGGpPGGN',
    '.NHGyYGpPGlLGHN.',
    '.NGGyyGPpGlllGN.',
    '..NNGHGGpGGHNN..',
    '....NNNNNNNN....',
    '................',
    '................',
  ],
  paving: [
    '1111112411111124',
    '1222223412222234',
    '2333333423333334',
    '4444444444444444',
    '1124111111241111',
    '2234122222341222',
    '3334233333342333',
    '4444444444444444',
    '1111112411111124',
    '1222223412222234',
    '2333333423333334',
    '4444444444444444',
    '1124111111241111',
    '2234122222341222',
    '3334233333342333',
    '4444444444444444',
  ],
  fence: [
    ...Array(7).fill('................'),
    '.......oo.......',
    '......owwo......',
    '......owWo......',
    '......owWo......',
    '......owWo......',
    '......owWo......',
    '......owWo......',
    '......owWo......',
    '......owWo......',
    '......owWo......',
    '......oooox.....',
    '.......xxx......',
    '................',
  ],
  hedge: [
    ...Array(6).fill('................'),
    '.....oooooo.....',
    '....oJJHHHHo....',
    '...oJHHHJHHHo...',
    '...oHHHHHHHGo...',
    '...oHHHJHGHGo...',
    '...oGHGHGGGgo...',
    '...oGGGGGgGgo...',
    '...ogGGgGGggo...',
    '...oGgGGggGgo...',
    '...ogggGggggo...',
    '....oggggggo....',
    '.....oooooo.....',
    '................',
    '................',
  ],
  lamp: [
    '................',
    '.......oo.......',
    '......okko......',
    '.....okKKko.....',
    '....okkkkkko....',
    '.....ofFFfox....',
    '.....oFfffox....',
    '.....oFfffox....',
    '.....ofFFfox....',
    '....okkkkkkox...',
    '......oKkoxx....',
    '......oKkox.....',
    '......oKkox.....',
    '......oKkox.....',
    '......oKkox.....',
    '......oKkox.....',
    '.....okKkkox....',
    '....okKkkkkox...',
    '....oooooooox...',
    '.....xxxxxxxx...',
  ],
  bench: [
    ...Array(7).fill('................'),
    '..oooooooooooo..',
    '..ohhhhhhhhhhox.',
    '..oBBBBBBBBBBox.',
    '..oooooooooooox.',
    '..ohhhhhhhhhhox.',
    '..oBBBBBBBBBBox.',
    '.oooooooooooooo.',
    '.ohhhhhhhhhhhhox',
    '.obbbbbbbbbbbbox',
    '.oooooooooooooox',
    '..oko......okoxx',
    '..ooo......ooox.',
    '...xx.......xx..',
  ],
  scarecrow: [
    '................',
    '......oooo......',
    '.....otttTo.....',
    '.....otTTTo.....',
    '...ootttttToo...',
    '...oTTTTTTTTox..',
    '....oottttoox...',
    '.....okttkox....',
    '.....otttTox....',
    '.oo.ooiiiiooo.o.',
    'otToiiiiIiiiiotT',
    'oTtiiiiiIiiiiiTo',
    '.oooooiiIiiooooo',
    '.....oiiIiiox...',
    '.....oIIIIIox...',
    '.....oToTtTox...',
    '.......obox.....',
    '......obbbox....',
    '.....oooooox....',
    '......xxxxx.....',
  ],
  cherry: [
    '.....oooooo.....',
    '...ooPPePPPoo...',
    '..oPPePPPPpPPo..',
    '.oPPPPPPpPPePPo.',
    '.oPePPPppPPPppo.',
    'oPPPPPpPPPePPppo',
    'oPPPPpPPPPPPpppo',
    'opPPePPPPpPPpqpo',
    'oppPPPpPPPPppqpo',
    '.oppppPPpppppqo.',
    '.oqppppppppqqqo.',
    '..ooqqpqqqqqoo..',
    '....ooobBooo....',
    '.......bBx......',
    '.......bBx......',
    '......obBxo.....',
    '....oSabBaSox...',
    '....osaaaasoxx..',
    '.....oooooox....',
    '......xxxxxx....',
  ],
  pond: [
    '................................',
    '................................',
    '...........SsSSSasaaa...........',
    '........sSSSSsUUUUsaaaas........',
    '.......SSsUUUUUUUUUUUUaas.......',
    '.....sSSUUUUUUuuuuUUUUUUasa.....',
    '....SSsUUUuuuuuuuuuuuuUUUasa....',
    '....SSUUuuuuuuuuuuuuuuuuUUas....',
    '...sSUUuuuuuuuuuuuuuuuuuuUUas...',
    '..SSUUuuuuuuuuuuuuuuuuuuuuUUas..',
    '..SSUuuuuuuuuuuuuuuuuccuuuuUaa..',
    '.sSUuuuuuuuuuuuuuuuuuuuuuuuuUaa.',
    '.asUuuuuuuuuuuuuuuuuuuuuuuuuUaa.',
    '.aauuuuucccuuuuuuuuuuPpGuuuuuaa.',
    '.aUuuuuuuuuuuuuuuuuuGHPHGuuuuUa.',
    '.aUuuuuuuuuuuuuuuuuuGHHuGuuuuUs.',
    '.suuuuuuuuuuuuuuuuuuuGgGuuuuuua.',
    '.auuuuuPpGuuuuuuuuuuuuuuuuuuuua.',
    '.aauuuGHPHGuuuuuuuuuuuuuuuuuuaa.',
    '.aauuuGHHuGuuuuuuuuuuuuuuuuuusa.',
    '.aauuuuGgGuGGGuuuuuccccuuuuuuas.',
    '..aauuuuuuGHHHGuuuuuuuuuuuuuaa..',
    '..sauuuuuuGHHuGuuuuuuuuuuuuuaa..',
    '...sauuuuuuGgGuuuuuuuuuuuuuas...',
    '....sauuuuuuuuuuuuuuuuuuuuaa....',
    '....asauuuuuuuuuuuuuuuuuusaa....',
    '.....asauuuuuuuuuuuuuuuuaas.....',
    '.......saauuuuuuuuuuuusaa.......',
    '........saaaasuuuusaaaas........',
    '...........aaasaaaasa...........',
    '................................',
    '................................',
  ],
  path: [
    '................',
    '................',
    '................',
    '....mmmmmmmm....',
    '...mDDdDDDaDm...',
    '...mmDDmdDdDm...',
    '...mDdDDDDDDm...',
    '...mDDdaDDdDm...',
    '...mDDDDDDDdm...',
    '...mDDDDDmDDm...',
    '...mdDDDdDDDm...',
    '...mDDdDDDDdm...',
    '....mmmmmmmm....',
    '................',
    '................',
    '................',
  ],
  wall: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '...oooooooooo...',
    '...o5555M555o...',
    '...o66666666o...',
    '...oSsSSSSsSo...',
    '...oasaaaasao...',
    '...oasaaaasao...',
    '...osssssssso...',
    '...oSSSSsSSSo...',
    '...oMMaasMaao...',
    '...oMMaasaaao...',
    '...osssssssso...',
    '...oooooooooo...',
    '....xxxxxxxxxx..',
    '................',
  ],
  vegPatch: [
    '................',
    '..NNNNNNNNNNNN..',
    '.NGHGnGHGnGHGnN.',
    '.NHJHnHJHnHJHnN.',
    '.NgGgngGgngGgnN.',
    '.NNNNNNNNNNNNNN.',
    '.NGHGnGHGnGHGnN.',
    '.NHJHnHJHnHJHnN.',
    '.NgGgngGgngGgnN.',
    '.NNNNNNNNNNNNNN.',
    '.NGHGnGHGnGHGnN.',
    '.NHJHnHJHnHJHnN.',
    '.NgGgngGgngGgnN.',
    '.NnnnnnnnnnnnnN.',
    '..NNNNNNNNNNNN..',
    '................',
  ],
  woodpile: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......ooo......',
    '......ohhBo.....',
    '......ohBbo.....',
    '......oBbbo.....',
    '.....ooooooo....',
    '....ohhBohhBo...',
    '....ohBbohBbo...',
    '....oBbboBbbo...',
    '...ooooooooooo..',
    '..ohhBohhBohhBo.',
    '..ohBbohBbohBbo.',
    '..oBbboBbboBbbo.',
    '...ooo.ooo.ooo..',
    '...xxxxxxxxxxxxx',
    '................',
  ],
  stall: [
    '................................',
    '.oooooooooooooooooooooooooooooo.',
    '.orrrrwwwwrrrrwwwwrrrrwwwwrrrro.',
    '.orrrrwwwwrrrrwwwwrrrrwwwwrrrro.',
    '.orrrrwwwwrrrrwwwwrrrrwwwwrrrro.',
    '.orrrrwwwwrrrrwwwwrrrrwwwwrrrro.',
    '.oRRRRWWWWRRRRWWWWRRRRWWWWRRRRo.',
    '.oorrrowwworrrowwworrrowwworrro.',
    '...ooBooo..oo..oo..oo..oo.oBo...',
    '....oBo..oooo..ooo..oooo..oBo...',
    '....oBo.orrrRooHJGootttTo.oBo...',
    '....oBo.oRrRRooGGgooTTTvo.oBo...',
    '...oooooooooooooooooooooooooo...',
    '...ohhhhhhhhhhhhhhhhhhhhhhhho...',
    '...oBBBBBbBBBBBbBBBBBbBBBBBbo...',
    '...oBBBBBbBBBBBbBBBBBbBBBBBbo...',
    '...oBBBBBbBBBBBbBBBBBbBBBBBbo...',
    '...oooooooooooooooooooooooooo...',
    '....xxxxxxxxxxxxxxxxxxxxxxxxxxx.',
    '................................',
  ],
  haystack: [
    '................',
    '................',
    '................',
    '................',
    '.....oooooo.....',
    '....ottTtTTo....',
    '...otTttttTTo...',
    '...ottttttTTo...',
    '..otTtttttTTvo..',
    '..otttttttvTTo..',
    '.ottttttttTTTTo.',
    '.ottttTttTTTTTo.',
    '.ottttttTtTTTvo.',
    '.otttTttTtTTTTo.',
    'ottttttttttTTTTo',
    'otTttTtttttTTTTo',
    'ovTvTTTTTTTTTvTo',
    'oooooooooooooooo',
    '..xxxxxxxxxxxxxx',
    '................',
  ],
  square: [
    '..ssssssssssssssssssssssssssssssssssssssssssss..',
    '.SSSSaSSSSSaSSSSSaSSSSSaSSSSSaSSSSSaSSSSSaSSSSS.',
    'sSaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaas',
    'sSa111141111411114111141111411114111141111411aSs',
    'sSa222242222422224222242222422224222242222422aSs',
    'saa444444444444444444444444444444444444444444aSs',
    'sSa114111141111411114111141111411114111141111aSs',
    'sSa224222242222422224222241111422224222242222aSs',
    'sSa444444444444444444444444444444444444444444aas',
    'sSa111141111411114111141111411114111141111411aSs',
    'sSa111141111411114111142222422224222242222422aSs',
    'saa4444444444444444ssssssssss4444444444444444aSs',
    'sSa11411114111142ssasaaaaaasass22224111142222aSs',
    'sSa1141111422224sssSSsSssSsSSsss3334222243333aSs',
    'sSa444444444444saassssssssssssaas444444444444aas',
    'sSa11114111142ssSSss33344111ssSSss11141111411aSs',
    'sSa2222411114saSss333334411111ssSas2242222422aSs',
    'saa444444444ssaSs43333344111114sSass444444444aSs',
    'sSa224111141ssss1143333441111433ssss111141111aSs',
    'sSa33422224saSss1114333441114333ssSas22242222aSs',
    'sSa44444444ssSs1111143aaaa1433333sSss44444444aas',
    'sSa11114111sass111111aaSSaa333333ssas42222411aSs',
    'sSa22224222saSs11111aaSSSSaa33333sSas43333422aSs',
    'saa44444444sass44444aSSSSSSa44444ssas44444444aSs',
    'sSa11411114sass44444aSSSSSSa44444ssas11141111aSs',
    'sSa22422224saSs33333aaSSSSaa11111sSas22242222aSs',
    'sSa44444444sass333333aaSSaa111111ssas44444444aas',
    'sSa11114111ssSs3333341aaaa3411111sSss41111422aSs',
    'sSa22224222saSss3334111443334111ssSas42222433aSs',
    'saa444444444ssss3341111443333411ssss444444444aSs',
    'sSa224222242ssaSs41111144333334sSass111141111aSs',
    'sSa3343333433saSss111114433333ssSas4222242222aSs',
    'sSa44444444444ssSSss11144333ssSSss44444444444aas',
    'sSa111141111411saassssssssssssaas111141111411aSs',
    'sSa2222422224222sssSSsSssSsSSsss4222242222422aSs',
    'saa44444444444444ssasaaaaaasass44444444444444aSs',
    'sSa1142222411114111ssssssssss1411114111141111aSs',
    'sSa224333342222422224222242222422224222242222aSs',
    'sSa444444444444444444444444444444444444444444aas',
    'sSa222241111411114111142222411114222242222422aSs',
    'sSa333342222422224222243333422224333343333433aSs',
    'saa444444444444444444444444444444444444444444aSs',
    'sSa114111141111411114111141111411114111142222aSs',
    'sSa224222241111411114111142222411114222243333aSs',
    'sSa444444444444444444444444444444444444444444aas',
    'sSaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaSs',
    '.SaSSSSSaSSSSSaSSSSSaSSSSSaSSSSSaSSSSSaSSSSSaSS.',
    '..ssssssssssssssssssssssssssssssssssssssssssss..',
  ],
  garden: [
    '..mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm..',
    '.mmDDDdDmDDmDmDDdDDDDdDDdDDDDDdDdddDDdDDDaDDdDm.',
    'mDmNNNNNNNNNNNNNNNNmDDdadaDDmNNNNNNNNNNNNNNNNmDm',
    'mdNnnnnnnnnnnnnnnnnNmDDDDaDDNnnnnnnnnnnnnnnnnNDm',
    'mDNnHggHGGHGHHggHGnNDdDaDDdDNnGGGggGHgHGGgHGnNdm',
    'mDNnGgHrrggrrGGrrGnNDDDDDDdDNnGGGPpGgPpHgPpGnNDm',
    'mDNnGGgrRHGrRgGrRGnNDmmddDdDNnGGGpqGHpqHGpqgnNdm',
    'mDNnHGHgHgHgggHggGnNdDddDdDDNngHgGgGGggGggGGnNDm',
    'mDNnGrrgGrrGgrrHGHnNddDDDDDaNnHPpgGPpggPpGgGnNDm',
    'mDNngrRGHrRGgrRGGgnNDDDDdDadNngpqGGpqHHpqgHgnNDm',
    'mdNnGGHHGggGggGgHHnNmDmDDDmdNngHgGgggGgGgGGHnNam',
    'mDNnnnnnnnnnnnnnnnnNdDssssDdNnnnnnnnnnnnnnnnnNdm',
    'mdmNNNNNNNNNNNNNNNNmssSSSSssmNNNNNNNNNNNNNNNNmDm',
    'mDdDDdddDddDDDaDDDdDsSGGGGSsDDdddddDddaDDDDDaddm',
    'mDDDDDdDDddDDDadDDDsSGprprGSsDDddmDdmdDDDDDDmDDm',
    'mDdDmDDDDDDmDDDDDdDsSGrprpGSsDDDDDddDdDDDdDdDDdm',
    'mDdDdmDdDddDaDdDDDDsaGprprGasdDdmdDdDDDDmmdDDdDm',
    'mDDdDDdDDDaDdDDdDDDsaGrprpGasDmDDDDdDDDDdDdDDdDm',
    'mDDdDDdmDDDDDDDDDDdDsaGGGGasDDDdDddDdDdDmDdDmmDm',
    'mDmNNNNNNNNNNNNNNNNmssaaaassmNNNNNNNNNNNNNNNNmmm',
    'mDNnnnnnnnnnnnnnnnnNDdssssaDNnnnnnnnnnnnnnnnnNDm',
    'mDNngGGHGGggGGGHgGnNddaDDDDDNngGgHGGGHHHgHHHnNDm',
    'mDNnGHGPpggPpGGPpgnNDdDDdDadNngHgrrggrrggrrGnNdm',
    'mDNnGGGpqggpqGgpqgnNmDDDDDDDNnGgHrRHHrRGHrRGnNDm',
    'mdNnGGGgHHHgHGgggGnNDddDDDDDNnHgGGggHGGGGgGgnNmm',
    'mDNnHPpGHPpHgPpGHHnNDDdmDDDmNnGrrggrrGGrrgGGnNdm',
    'mDNnGpqGHpqGGpqHHGnNDDDDDdDmNnGrRGgrRHgrRgGHnNDm',
    'mDNnGGGgHgGHgGGHHgnNDDdaDDaDNnGHgGGGGHHgHHgGnNDm',
    'mDNnnnnnnnnnnnnnnnnNDDdDDmDDNnnnnnnnnnnnnnnnnNDm',
    'mdmNNNNNNNNNNNNNNNNmDDddmDDamNNNNNNNNNNNNNNNNmdm',
    '.dDddDdDDdDdaDDdDmDadDDDDDmDDDadDDdDmDDDDDDDdmd.',
    '..mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm..',
  ],
  topiary: [
    '................',
    '....oo....oo....',
    '...oJHo..oJHo...',
    '...oHGo..oHGo...',
    '...oHGo..oHGo...',
    '....oHGooHGo....',
    '...oJHHHHHHGo...',
    '..oJHHHHHHHGgo..',
    '..oHHkHHHHkGgo..',
    '..oHHHHppHHGgo..',
    '...oGHHHHHGgo...',
    '..oJHHHHHHHHGo..',
    '.oJHHHHHHHHHGgo.',
    '.oHHHHHHHHHHGgo.',
    '.oGHHHHHHHHGggo.',
    '..ogGGGGGGGggo..',
    '...oSSSSSSSSox..',
    '....oaaaaaasox..',
    '....oooooooox...',
    '.....xxxxxxxx...',
  ],
  birdBath: [
    '................',
    '................',
    '................',
    '..........ooo...',
    '.........oBBkoL.',
    '......ooooBBBo..',
    '.....obbBrrrBo..',
    '......ooorrrBo..',
    '..oooooooooooo..',
    '.oSccuuuuuuuuSo.',
    '.oSuuuuuuUUUUSo.',
    '..oaaaaaaaaaaox.',
    '...osssssssox...',
    '......oSaox.....',
    '......oSaox.....',
    '......oSaox.....',
    '......oSaox.....',
    '....ooSSaasoo...',
    '...oSSaaaasssox.',
    '...oooooooooooxx',
  ],
  beehives: [
    '................',
    '..........yk....',
    '..yk............',
    '.......yk.......',
    '...ooo....ooo...',
    '..ottTo..ottTo..',
    '.otttTTootttTTo.',
    '.oTTTTvooTTTTvo.',
    '.otttTTootttTTo.',
    '.oTTTTvooTTTTvo.',
    '.otNNtTootNNtTo.',
    '.otNNTTootNNTTo.',
    '.oooooooooooooo.',
    '.ohhhhhhhhhhhhox',
    '.oBBBBBBBBBBBBox',
    '.oooooooooooooox',
    '..obo......oboxx',
    '..obo......obox.',
    '..ooo......ooox.',
    '...xx.......xx..',
  ],
  signpost: [
    '................',
    '.......oooo.....',
    '.......ohbo.....',
    '...ooooooooooo..',
    '...ohhhhhhhhhho.',
    '...ohbhbbhbhhhho',
    '...oBBBBBBBBBBo.',
    '...ooooooooooo..',
    '.......ohbox....',
    '..ooooooooooo...',
    '.ohhhhhhhhhho...',
    'ohhhhbhbbhbho...',
    '.oBBBBBBBBBBox..',
    '..oooooooooooxx.',
    '.......ohbox....',
    '.......ohbox....',
    '.......ohbox....',
    '......ohhbbox...',
    '......oooooox...',
    '.......xxxxxx...',
  ],
  washingLine: [
    '................................',
    '.oooo......................oooo.',
    '.ohbo......................ohbo.',
    '.ohboT....................Tohbo.',
    '.ohbo.TkTTkT.........TkTkT.ohbo.',
    '.ohbo.ooooooTTkTTTkTTooooo.ohbo.',
    '.ohbo.orrrRo.ooooooo.oiiIo.ohbo.',
    '.ohbo.orrrRo.owwwwWo.oiiIo.ohbo.',
    '.ohbo.oorRoo.owwwwWo.oiIIo.ohbo.',
    '.ohbo..orRo..owwwwWo.oioIo.ohbo.',
    '.ohbo..orRo..owwwwWo.oioIo.ohbo.',
    '.ohbo..oooo..owwwwWo.ooooo.ohbo.',
    '.ohbo........owwwWWo.......ohbo.',
    '.ohbo........ooooooo.......ohbo.',
    '.ohbo......................ohbo.',
    '.ohbo......................ohbo.',
    '.ohbo......................ohbo.',
    'ohhbbox...................ohhbbo',
    'oooooox...................oooooo',
    '.xxxxxx....................xxxxx',
  ],
  axeStatue: [
    '................',
    '............oo..',
    '...........oyvo.',
    '..........oyvox.',
    '.........oyvox..',
    '........oyvox...',
    '.......oyvox....',
    '...oooooyvox....',
    '..oyyyyyyvo.....',
    '..oyYYYYYvo.....',
    '...oYYYYvvooo...',
    '..ohovvvvohhhox.',
    '.ohhBooooBBBhhox',
    '.ohhhhhhhhhhhhox',
    '.obBbBBBbBBbBbox',
    '.oBbBBbBBbBBbbox',
    '.obBBbBBbBBbBbox',
    'oobbobbbbbbobboo',
    '.oo.oooooooo.oox',
    '..xxxxxxxxxxxxx.',
  ],
  shrine: [
    '................',
    '......oooo......',
    '.....oSaaso.....',
    '.....oSaYsox....',
    '.....oSYysox....',
    '.....oSaYsox....',
    '.....oSYasox....',
    '.....oSaysox....',
    '.....oSYYsox....',
    '..o..oSaasox.o..',
    '.ofo.oSaasoxofo.',
    '.oFo.oSaasoxoFo.',
    '.oto.oSaasoxoto.',
    '.oooooooooooooo.',
    '.oSSSSSSSSSSSaox',
    '.oSaaaaaaaaaasox',
    '.ossssssssssssox',
    '.oooooooooooooox',
    '..xxxxxxxxxxxxxx',
    '................',
  ],
  banner: [
    '..oo............',
    '.oyYo...........',
    '..oboooooooooo..',
    '..obhhhhhhhhhho.',
    '..oboooooooooox.',
    '..obo.orrrrrRox.',
    '..obo.orrrrrRox.',
    '..obo.oryyyrRox.',
    '..obo.orYvYrRox.',
    '..obo.oryyyrRox.',
    '..obo.orrrrrRox.',
    '..obo.orrrrrRox.',
    '..obo.orrorrRox.',
    '..obo.oro.orRox.',
    '..obo.oo...ooxx.',
    '..obox..........',
    '..obox..........',
    '.obbbox.........',
    '.ooooox.........',
    '..xxxxx.........',
  ],
  fountain: [
    '................................',
    '.............c....c.............',
    '...............cc...............',
    '............c.cuuc.c............',
    '..............oaso..............',
    '..............oSao..............',
    '.............oSaaso.............',
    '.............oSaaso.............',
    '..........oooSSSSSSooo..........',
    '.........oSSuuuuuuuuSSo.........',
    '........oacauuuuuuuuacao........',
    '.........oaaaaaaaaaaaao.........',
    '.........cossssssssssoc.........',
    '...........oooSaasooo...........',
    '.........c.oooSaasooo.c.........',
    '.......o.ooSSSSaasSSSoo.o.......',
    '.....ooScSSSSSSaasSSSSScSoo.....',
    '....oSSSSUUUUUSaasUUUUUSSSSo....',
    '...oSSSUUUUUUUSaasUUUUUUUSSSo...',
    '..oSSuuuuuuccuSaasuuuuuuuuuSSo..',
    '.oSSuuuuuuuuuuSaasuuuuccuuuuSSo.',
    '.oSSuuuuuuuuuuSaasuuuuuuuuuuSSox',
    'oaauuuuuuuuuuuSaasuuuuuuuuuuuaao',
    'oSaauuucccuuuuSaasuuuuuuuuuuaaso',
    'oSaauuuuuuuuuuuuuuuuccccuuuuaaso',
    'oSSaauuuuuuuuuuuuuuuuuuuuuuaasso',
    'oSSSaaauuuuuuuuuuuuuuuuuuaaassso',
    '.oSSSaaaauuuuuuuuuuuuuuaaaassso.',
    '.oSSSSSaaaaaaaaaaaaaaaaaasssssox',
    '..oSSSSSSSaaaaaaaaaaaassssssso.x',
    '...oSSSSSSaaaaaaaaaaaasssssso.x.',
    '....oSSSSSaaaaaaaaaaaassssso.x..',
    '.....ooSSSaaaaaaaaaaaasssoo.x...',
    '.......oooooooooooooooooo.x.....',
    '........xxxxxxxxxxxxxxxxxx......',
    '................................',
  ],
  snowman: [
    '................',
    '......oooo......',
    '......okKox.....',
    '......okkox.....',
    '....oooooooox...',
    '.....owwwwox....',
    '....owkwwkWox...',
    '....owwLLwWox...',
    '.....owwwWox....',
    '....orrrrrrRo...',
    '.b..owwwrRWWo.b.',
    '..bowwwwwwwWWob.',
    '...owwwkwwwWWox.',
    '..owwwwwwwwwWWox',
    '..owwwwkwwwwWWox',
    '..owwwwwwwwwWWox',
    '...owwwwwwwWWox.',
    '....oooooooooox.',
    '.....xxxxxxxxx..',
    '................',
  ],
};
/** Arms a joining decoration adds toward the north, east, south and west piece of its kind (bits 1, 2, 4, 8 of its mask). */
export const DECOR_ARMS: Partial<Record<DecorKind, readonly (readonly string[])[]>> = {
  fence: [
    [
      '................',
      '......oooo......',
      '......owWo......',
      '......owWo......',
      '......owWo......',
      '......owWo......',
      '......owWo......',
      ...Array(13).fill('................'),
    ],
    [
      ...Array(7).fill('................'),
      '...............o',
      '..............ow',
      '..........ooooow',
      '..........wwwwow',
      '..........ooooow',
      '..............ow',
      '..........ooooow',
      '..........wwwwow',
      '..........ooooow',
      '..............ow',
      '..............oo',
      '...........xxxxx',
      '................',
    ],
    [], // south: the piece below reaches up to meet this one
    [
      ...Array(7).fill('................'),
      'o...............',
      'Wo..............',
      'Wooooo..........',
      'Wowwww..........',
      'Wooooo..........',
      'Wo..............',
      'Wooooo..........',
      'Wowwww..........',
      'Wooooo..........',
      'Wo..............',
      'oo..............',
      'xxxxxx..........',
      '................',
    ],
  ],
  hedge: [
    [
      '...oHHJHHHHHo...',
      '...oHHHHHJHHo...',
      '...oJHHHHHHHo...',
      '...oHHHHJHHHo...',
      '...oHJHHHHHHo...',
      '...oHHHHHHJHo...',
      '...oHHJHHHHHo...',
      '...oHHHHHHHHo...',
      '...oHHHHJHHHo...',
      '...oHJHHHHHHo...',
      '...oHHHHHHHHo...',
      ...Array(9).fill('................'),
    ],
    [
      ...Array(6).fill('................'),
      '........oooooooo',
      '........JJJJJJJJ',
      '........HHHHJHHH',
      '........HHJHHHHH',
      '........JHHHHHHJ',
      '........gGGGGgGG',
      '........GGGgGGGG',
      '........gggggggg',
      '........GGGGgGGG',
      '........gggggggg',
      '........gggggggg',
      '........oooooooo',
      '................',
      '................',
    ],
    [
      ...Array(11).fill('................'),
      '...oHHHHHHJHo...',
      '...oHJHHHHHHo...',
      '...oHHHHHHHHo...',
      '...oHHHJHHHHo...',
      '...oHHHHHHHHo...',
      '...oJHHHHHJHo...',
      '...oHHHHHHHHo...',
      '...oHHHJHHHHo...',
      '................',
    ],
    [
      ...Array(6).fill('................'),
      'oooooooo........',
      'JJJJJJJJ........',
      'HHHHHJHH........',
      'HHHJHHHH........',
      'HJHHHHHH........',
      'GGGgGGGG........',
      'GgGGGGgG........',
      'gggggggg........',
      'GGgGGGGg........',
      'gggggggg........',
      'gggggggg........',
      'oooooooo........',
      '................',
      '................',
    ],
  ],
  path: [
    [
      '...mDDDDDaDam...',
      '...mDDdDmDDmm...',
      '...mdDDdDDDDm...',
      '...maDDDDdDDm...',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    [
      '................',
      '................',
      '................',
      '............mmmm',
      '............ddaD',
      '............DDdm',
      '............DDad',
      '............DDaD',
      '............DDad',
      '............DDDd',
      '............DDDm',
      '............mdmD',
      '............mmmm',
      '................',
      '................',
      '................',
    ],
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '...mDDDDDDDDm...',
      '...mDdddDddDm...',
      '...mDDdDDddDm...',
      '...mmDDDDDDmm...',
    ],
    [
      '................',
      '................',
      '................',
      'mmmm............',
      'DDDd............',
      'dDdd............',
      'DDDD............',
      'DDDD............',
      'DDDD............',
      'DDDD............',
      'DdDm............',
      'DDDD............',
      'mmmm............',
      '................',
      '................',
      '................',
    ],
  ],
  wall: [
    [
      '...oM5555M55o...',
      '...o55555555o...',
      '...o5MM5M555o...',
      '...o55555555o...',
      '...o55M55555o...',
      '...oMM5M5555o...',
      '...o555M5MM5o...',
      '...o5555M555o...',
      '...oMM555555o...',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '............oooo',
      '............5555',
      '............6666',
      '............SSSs',
      '............aaas',
      '............aaas',
      '............ssss',
      '............SsSS',
      '............asaM',
      '............asaM',
      '............ssss',
      '............oooo',
      '............xxxx',
      '................',
    ],
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '...o5M555555o...',
      '...oM5555555o...',
      '...o5M5M5555o...',
      '...oM5555555o...',
      '...o55555555o...',
      '...o55555555o...',
      '...o55M55555o...',
      '...oM5MMM5MMo...',
      '...oM5MM555Mo...',
      '...oM55555M5o...',
      '...o55555M5Mo...',
    ],
    [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      'oooo............',
      '5M55............',
      '6666............',
      'sSSS............',
      'saaa............',
      'saaa............',
      'ssss............',
      'SSSs............',
      'aMas............',
      'aaas............',
      'ssss............',
      'oooo............',
      'xxxx............',
      '................',
    ],
  ],
};

/** A joining decoration's piece: the lone piece plus an arm for each set bit of `mask` (1 north, 2 east, 4 south, 8 west). */
export function composeDecor(kind: DecorKind, mask: number, art: readonly string[] = DECOR_SPRITES[kind]): string[] {
  const g = art.map((r) => [...r]);
  const arms = DECOR_ARMS[kind];
  // East and west first, then north and south over them, so a run north to south reads as one unbroken top.
  if (arms) for (const k of [1, 3, 0, 2]) if (mask & (1 << k)) arms[k].forEach((r, y) => [...r].forEach((c, x) => c !== '.' && (g[y][x] = c)));
  return g.map((r) => r.join(''));
}

/** The ornamental cherry in winter: bare branches with snow on them, like the forest's winter trees. */
const WINTER_CHERRY: readonly string[] = [
  '..w..w......W...',
  '..b..b...W..b...',
  '..bw.b...b.Wb...',
  '.w.b..b..b.b..W.',
  '.b.b..b..b.b.Wb.',
  'w.b.b.b..b.bWbWW',
  'bb.bbwb..b.bb.bb',
  '.....bb.b.b.....',
  '.ww...bwbb...WW.',
  '.bb.ww.bb.WWWbb.',
  '...bbb.BbWbbb...',
  '......bbbb......',
  '.......bB.......',
  '.......bBx......',
  '.......bBx......',
  '......obBxo.....',
  '....owabBaWox...',
  '....osaaaasoxx..',
  '.....oooooox....',
  '......xxxxxx....',
];

/** The vegetable patch in spring: seedlings in the rows. */
const SPRING_VEG: readonly string[] = [
  '................',
  '..NNNNNNNNNNNN..',
  '.NnnnnnnnnnnnnN.',
  '.NnJnnnJnnnJnnN.',
  '.NHgHnHgHnHgHnN.',
  '.NNNNNNNNNNNNNN.',
  '.NnnnnnnnnnnnnN.',
  '.NnJnnnJnnnJnnN.',
  '.NHgHnHgHnHgHnN.',
  '.NNNNNNNNNNNNNN.',
  '.NnnnnnnnnnnnnN.',
  '.NnJnnnJnnnJnnN.',
  '.NHgHnHgHnHgHnN.',
  '.NnnnnnnnnnnnnN.',
  '..NNNNNNNNNNNN..',
  '................',
];
/** The vegetable patch in autumn: pumpkins. */
const AUTUMN_VEG: readonly string[] = [
  '................',
  '..NNNNNNNNNNNN..',
  '.NngnnngnnngnnN.',
  '.NELOnELOnELOnN.',
  '.NLLOnLLOnLLOnN.',
  '.NNNNNNNNNNNNNN.',
  '.NngnnngnnngnnN.',
  '.NELOnELOnELOnN.',
  '.NLLOnLLOnLLOnN.',
  '.NNNNNNNNNNNNNN.',
  '.NngnnngnnngnnN.',
  '.NELOnELOnELOnN.',
  '.NLLOnLLOnLLOnN.',
  '.NnnnnnnnnnnnnN.',
  '..NNNNNNNNNNNN..',
  '................',
];
/** The vegetable patch in winter: bare furrows (snow lies on the ridges; see DECOR_SEASONS). */
const WINTER_VEG: readonly string[] = [
  '................',
  '..NNNNNNNNNNNN..',
  '.NnnnnnnnnnnnnN.',
  '.NnnnnnnnnnnnnN.',
  '.NNNNnNNNnNNNnN.',
  '.NNNNNNNNNNNNNN.',
  '.NnnnnnnnnnnnnN.',
  '.NnnnnnnnnnnnnN.',
  '.NNNNnNNNnNNNnN.',
  '.NNNNNNNNNNNNNN.',
  '.NnnnnnnnnnnnnN.',
  '.NnnnnnnnnnnnnN.',
  '.NNNNnNNNnNNNnN.',
  '.NnnnnnnnnnnnnN.',
  '..NNNNNNNNNNNN..',
  '................',
];
/** The woodpile stacked high for winter. */
const AUTUMN_WOODPILE: readonly string[] = [
  '................',
  '.......ooo......',
  '......ohhBo.....',
  '......ohBbo.....',
  '......oBbbo.....',
  '.....ooooooo....',
  '....ohhBohhBo...',
  '....ohBbohBbo...',
  '....oBbboBbbo...',
  '...ooooooooooo..',
  '..ohhBohhBohhBo.',
  '..ohBbohBbohBbo.',
  '..oBbboBbboBbbo.',
  '...ooooooooooo..',
  '..ohhBohhBohhBo.',
  '..ohBbohBbohBbo.',
  '..oBbboBbboBbbo.',
  '...ooo.ooo.ooo..',
  '...xxxxxxxxxxxxx',
  '................',
];
/** The woodpile burned down by winter, snow on the logs. */
const WINTER_WOODPILE: readonly string[] = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....ooo.ooo....',
  '.....www.www....',
  '....ohhBohhBo...',
  '....ohBbohBbo...',
  '...ooBbboBbboo..',
  '...wwooowoooww..',
  '..ohhBohhBohhBo.',
  '..ohBbohBbohBbo.',
  '..oBbboBbboBbbo.',
  '...ooo.ooo.ooo..',
  '...xxxxxxxxxxxxx',
  '................',
];

/** The washing line in winter: the laundry taken in. */
const BARE_LINE: readonly string[] = [
  '................................',
  '.oooo......................oooo.',
  '.ohbo......................ohbo.',
  '.ohboT....................Tohbo.',
  '.ohbo.TTTTTT.........TTTTT.ohbo.',
  '.ohbo.......TTTTTTTTT......ohbo.',
  '.ohbo......................ohbo.',
  '.ohbo......................ohbo.',
  '.ohbo......................ohbo.',
  '.ohbo......................ohbo.',
  '.ohbo......................ohbo.',
  '.ohbo......................ohbo.',
  '.ohbo......................ohbo.',
  '.ohbo......................ohbo.',
  '.ohbo......................ohbo.',
  '.ohbo......................ohbo.',
  '.ohbo......................ohbo.',
  'ohhbbox...................ohhbbo',
  'oooooox...................oooooo',
  '.xxxxxx....................xxxxx',
];

/** `grid` with the chars of its rows through `last` swapped by `snow`: snow lying on a roof or a stack. */
const snowOn = (grid: readonly string[], last: number, snow: Record<string, string>): string[] =>
  grid.map((r, y) => (y > last ? r : r.replace(/./g, (c) => snow[c] ?? c)));
/** `grid` with its rows through `last` cleared: a bird flown or bees gone for the season. */
const gone = (grid: readonly string[], last: number): string[] => grid.map((r, y) => (y > last ? r : '.'.repeat(r.length)));
/** The signpost with snow on its cap and on top of both arms. */
const SNOWY_SIGNPOST = DECOR_SPRITES.signpost.map((r, y) => ([2, 4, 10].includes(y) ? r.replace(/h/g, 'w') : r));

const ICE: Rgba = [196, 222, 240, 255];
const ICE_DEEP: Rgba = [168, 204, 232, 255];
const ICE_GLINT: Rgba = [236, 246, 252, 255];
/** Leaf colors in autumn: olive and amber. */
const AUTUMN_LEAVES = { g: [74, 82, 34, 255], G: [118, 120, 46, 255], H: [160, 150, 60, 255], J: [204, 176, 84, 255] } satisfies Record<string, Rgba>;
const FROZEN = { c: ICE_GLINT, u: ICE, U: ICE_DEEP } satisfies Record<string, Rgba>;
const TRODDEN_SNOW: Rgba = [214, 220, 228, 255];
/** The flower garden's roses as spring tulips: yellow and pink. */
const TULIPS = { r: [255, 216, 58, 255], R: [243, 154, 44, 255], p: [242, 122, 158, 255], P: [250, 176, 200, 255], q: [200, 80, 120, 255] } satisfies Record<string, Rgba>;
/** The flower garden in autumn: the roses gone over to brown. */
const BARE_BEDS = { r: [140, 76, 34, 255], R: [110, 60, 30, 255], p: [168, 96, 46, 255], P: [190, 120, 60, 255], q: [120, 66, 32, 255] } satisfies Record<string, Rgba>;

/** Seasonal looks over the summer art, like BUILDING_SEASONS: a tint, or a grid where the shape changes. */
export const DECOR_SEASONS: Record<Season, Partial<Record<DecorKind, { tint?: Record<string, Rgba>; grid?: readonly string[] }>>> = {
  spring: {
    flowerBed: { tint: { y: [255, 216, 58, 255], Y: [243, 154, 44, 255], p: [242, 122, 158, 255], l: [156, 108, 234, 255], G: [56, 138, 58, 255], H: [96, 172, 70, 255] } }, // livelier, like the ground's flowers
    hedge: { tint: { H: [92, 170, 66, 255], J: [156, 210, 96, 255] } },
    vegPatch: { grid: SPRING_VEG },
    garden: { tint: TULIPS },
    topiary: { tint: { H: [92, 170, 66, 255], J: [156, 210, 96, 255] } },
  },
  summer: {},
  autumn: {
    flowerBed: { tint: { y: [168, 68, 30, 255], Y: [140, 76, 34, 255], p: [188, 58, 32, 255], P: [232, 150, 64, 255], l: [124, 70, 38, 255], L: [216, 116, 42, 255], G: AUTUMN_LEAVES.G, H: AUTUMN_LEAVES.H } }, // fallen leaves
    hedge: { tint: AUTUMN_LEAVES },
    cherry: { tint: { e: [250, 214, 120, 255], P: [240, 150, 60, 255], p: [214, 90, 40, 255], q: [160, 50, 30, 255] } }, // red and orange leaves
    pond: { tint: { H: [160, 150, 60, 255], G: [118, 120, 46, 255] } },
    wall: { tint: { M: AUTUMN_LEAVES.G } },
    vegPatch: { grid: AUTUMN_VEG },
    woodpile: { grid: AUTUMN_WOODPILE },
    haystack: { tint: { t: [240, 214, 110, 255], T: [208, 162, 66, 255] } }, // fresh from the harvest
    garden: { tint: { ...BARE_BEDS, g: AUTUMN_LEAVES.g, G: AUTUMN_LEAVES.G, H: AUTUMN_LEAVES.H } },
    topiary: { tint: AUTUMN_LEAVES },
    beehives: { grid: gone(DECOR_SPRITES.beehives, 3) }, // the bees are in for the year
  },
  winter: {
    flowerBed: { tint: { G: SNOW_SHADE, H: SNOW, p: SNOW, P: SNOW, y: SNOW, Y: SNOW, l: SNOW, L: SNOW } }, // buried
    paving: { tint: { '1': SNOW, '2': TRODDEN_SNOW } },
    hedge: { tint: { J: SNOW, H: SNOW, G: [36, 92, 52, 255] } }, // snow on top
    bench: { tint: { h: SNOW } },
    cherry: { grid: WINTER_CHERRY, tint: { w: SNOW, W: SNOW_SHADE } },
    pond: { tint: { ...FROZEN, G: ICE_DEEP, H: ICE, g: ICE_DEEP, P: ICE_GLINT, p: ICE, S: SNOW } },
    fountain: { tint: FROZEN },
    axeStatue: { tint: { h: SNOW } },
    path: { tint: { d: SNOW, D: TRODDEN_SNOW } },
    wall: { tint: { '5': SNOW, '6': SNOW_SHADE, M: SNOW_SHADE } }, // snow on top
    vegPatch: { grid: WINTER_VEG, tint: { n: SNOW } },
    woodpile: { grid: WINTER_WOODPILE, tint: { w: SNOW } },
    stall: { grid: snowOn(DECOR_SPRITES.stall, 3, { r: 'w' }), tint: { w: SNOW } },
    haystack: { grid: snowOn(DECOR_SPRITES.haystack, 7, { t: 'w', T: 'W', v: 'W' }), tint: { w: SNOW, W: SNOW_SHADE } },
    square: { tint: { '1': SNOW, '2': TRODDEN_SNOW, S: SNOW } },
    garden: { tint: { g: SNOW_SHADE, G: SNOW, H: SNOW, r: SNOW, R: SNOW_SHADE, p: SNOW, P: SNOW, q: SNOW_SHADE, n: SNOW, d: SNOW, D: TRODDEN_SNOW, S: SNOW } }, // buried
    topiary: { grid: snowOn(DECOR_SPRITES.topiary, 6, { J: 'w', H: 'w' }), tint: { w: SNOW, G: [36, 92, 52, 255] } }, // snow on the ears
    birdBath: { grid: gone(DECOR_SPRITES.birdBath, 7), tint: FROZEN },
    beehives: { grid: snowOn(gone(DECOR_SPRITES.beehives, 3), 6, { t: 'w', T: 'W', v: 'W' }), tint: { w: SNOW, W: SNOW_SHADE, h: SNOW } },
    signpost: { grid: SNOWY_SIGNPOST, tint: { w: SNOW } },
    washingLine: { grid: snowOn(BARE_LINE, 2, { h: 'w', b: 'W' }), tint: { w: SNOW, W: SNOW_SHADE, T: [214, 226, 236, 255] } }, // frost on the line
  },
};

/** A decoration's grid and palette in a season (`mask`: a joining kind's neighbors). */
export function seasonalDecor(kind: DecorKind, season: Season, mask = 0): { grid: readonly string[]; palette: Record<string, Rgba> } {
  const { grid = DECOR_SPRITES[kind], tint } = DECOR_SEASONS[season][kind] ?? {};
  return { grid: composeDecor(kind, mask, grid), palette: { ...DECOR_PALETTE, ...tint } };
}

/** RGBA per relic grid char. */
export const RELIC_PALETTE: Record<string, Rgba> = {
  o: [30, 35, 41, 255], // #1e2329
  S: [195, 202, 210, 255], // #c3cad2
  a: [154, 163, 172, 255], // #9aa3ac
  s: [120, 131, 142, 255], // #78838e
  m: [79, 125, 60, 255], // #4f7d3c
  M: [120, 168, 78, 255], // #78a84e
  f: [46, 122, 51, 255], // #2e7a33
  F: [87, 163, 92, 255], // #57a35c
  y: [156, 122, 44, 255], // #9c7a2c
  Y: [255, 213, 74, 255], // #ffd54a
  w: [255, 246, 200, 255], // #fff6c8
  H: [255, 215, 64, 110], // #ffd740 at 43%
  h: [255, 215, 64, 50], // #ffd740 at 20%
  x: [0, 0, 0, 70], // #000000 at 27%
  n: [244, 248, 252, 255], // #f4f8fc snow
  N: [188, 203, 220, 255], // #bccbdc snow in shade
};

/** A relic: a mossy rune stone, SPRITE_W × TREE_H like a tree. */
export const RELIC: readonly string[] = [
  '................',
  '.......ooo......',
  '.......oaaox....',
  '......oSaaoxx...',
  '......oSaasox...',
  '.....MSSaasoxx..',
  '......oSassoxx..',
  '.....mSayssoxx..',
  '.....oSyaysoxx..',
  '.....oSayssoxx..',
  '....oSSyaysoxx..',
  '....oSayayssox..',
  '....oSaaassoxxx.',
  '....oSaaMsssox..',
  '.F.oMmamaMmsoxF.',
  '..fFoMmamsMoFfx.',
  '...omoMmomoMox..',
  '....xasxxxxxaxx.',
  '................',
  '................',
];

/** Relic recolors per season over RELIC_PALETTE: its moss browns in autumn, and in winter the grass is buried. */
export const RELIC_TINTS: Record<Season, Record<string, Rgba>> = {
  spring: {},
  summer: {},
  autumn: { m: [122, 90, 44, 255], M: [160, 122, 60, 255], f: [106, 68, 34, 255], F: [154, 106, 52, 255] },
  winter: { f: SNOW_SHADE, F: SNOW },
};

/** RELIC under a cap of snow. */
export const WINTER_RELIC: readonly string[] = [
  '.......nnN......',
  '......nnnNN.....',
  '.......oaaox....',
  '......oSaaoxx...',
  '......oSaasox...',
  '.....MSSaasoxx..',
  '......oSassoxx..',
  '.....mSayssoxx..',
  '.....oSyaysoxx..',
  '.....oSayssoxx..',
  '....oSSyaysoxx..',
  '....oSayayssox..',
  '....oSaaassoxxx.',
  '....oSaaMsssox..',
  '.F.oMmamaMmsoxF.',
  '..fFoMmamsMoFfx.',
  '...omoMmomoMox..',
  '....xasxxxxxaxx.',
  '................',
  '................',
];

/** Drawn over RELIC, pulsing, once the relic can be collected: lit rune and a halo. */
export const RELIC_GLOW: readonly string[] = [
  '.....hHHHHHh....',
  '.....hH...HHh...',
  '....hHH....Hh...',
  '....hH.....HHh..',
  '...hHH......Hh..',
  '...hH.......Hh..',
  '...hHH......Hh..',
  '...hH...Y...Hh..',
  '...hH..Y.Y..Hh..',
  '..hHH...w...Hh..',
  '..hH...Y.Y..HHh.',
  '..hH...Y.Y...Hh.',
  '..hH........HHh.',
  '.hHH.........Hh.',
  '.hH..........Hh.',
  '.hHH........HHh.',
  '.hH..........Hh.',
  '.hHHHHHHHHHHHHh.',
  '..hhhhhhhhhhhh..',
  '................',
];

/** RGBA per mark-flag grid char; 'c'/'C' (cloth) come from FLAG_CLOTH. */
export const FLAG_PALETTE: Record<string, Rgba> = {
  o: [26, 18, 12, 255], // #1a120c
  P: [90, 58, 31, 255], // #5a3a1f
  k: [216, 192, 138, 255], // #d8c08a
  x: [0, 0, 0, 70], // #000000 at 27%
};

/** Flag cloth: red on a marked tree villagers can reach now, yellow until the land touches it. */
export const FLAG_CLOTH: Record<'reachable' | 'unreachable', { c: Rgba; C: Rgba }> = {
  reachable: { c: [229, 57, 53, 255], C: [163, 37, 31, 255] }, // #e53935
  unreachable: { c: [253, 216, 53, 255], C: [201, 162, 39, 255] }, // #fdd835
};

/** A short flag planted beside a marked tree's trunk, about a third of a grown tree's height; SPRITE_W × TREE_H, aligned with the tree sprite. */
export const FLAG: readonly string[] = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....o..........',
  '....okoooo......',
  '....oPcccCo.....',
  '....oPcCCoo.....',
  '....oPoo........',
  '....oPo.........',
  '....oPo.........',
  '....oPox........',
  '.....oxx........',
];

export const VILLAGER_W = 12;
export const VILLAGER_H = 15;
/** Pixel in a villager sprite that sits on the villager's position (between the feet). */
export const VILLAGER_FEET = { x: 6, y: 14 } as const;

/** RGBA per villager grid char; 'c'/'C' (shirt) come from VILLAGER_CLOTH. */
export const VILLAGER_PALETTE: Record<string, Rgba> = {
  o: [26, 18, 12, 255], // #1a120c
  z: [0, 0, 0, 60], // #000000 at 24%
  h: [90, 58, 31, 255], // #5a3a1f
  s: [240, 196, 154, 255], // #f0c49a
  S: [201, 154, 116, 255], // #c99a74
  e: [42, 26, 16, 255], // #2a1a10
  p: [74, 88, 120, 255], // #4a5878
  P: [54, 66, 96, 255], // #364260
  b: [58, 38, 22, 255], // #3a2616
  q: [107, 68, 38, 255], // #6b4426
  Q: [74, 46, 24, 255], // #4a2e18
  Y: [232, 194, 90, 255], // #e8c25a
  y: [168, 128, 46, 255], // #a8802e
  G: [163, 171, 180, 255], // #a3abb4
  g: [111, 120, 130, 255], // #6f7882
  w: [255, 243, 160, 255], // #fff3a0
  t: [160, 112, 58, 255], // #a0703a
  x: [211, 217, 224, 255], // #d3d9e0
  X: [120, 131, 142, 255], // #78838e
  L: [138, 90, 48, 255], // #8a5a30
  l: [90, 58, 31, 255], // #5a3a1f
  n: [208, 164, 100, 255], // #d0a464
  k: [216, 192, 138, 255], // #d8c08a
  K: [168, 142, 94, 255], // #a88e5e
  a: [163, 171, 180, 255], // #a3abb4
  A: [111, 120, 130, 255], // #6f7882
  r: [192, 57, 43, 255], // #c0392b
  R: [126, 35, 24, 255], // #7e2318
};

/** Shirt per job: c = cloth, C = its shade. */
export const VILLAGER_CLOTH: Record<Job, { c: Rgba; C: Rgba }> = {
  lumber: { c: [192, 57, 43, 255], C: [126, 35, 24, 255] }, // #c0392b
  farm: { c: [90, 154, 58, 255], C: [58, 110, 42, 255] }, // #5a9a3a
  orchard: { c: [214, 120, 40, 255], C: [150, 78, 24, 255] }, // #d67828
  mine: { c: [138, 106, 62, 255], C: [94, 68, 38, 255] }, // #8a6a3e
  herd: { c: [74, 120, 176, 255], C: [46, 82, 128, 255] }, // #4a78b0
  cotton: { c: [222, 208, 170, 255], C: [160, 142, 102, 255] }, // #ded0aa
  tax: { c: [44, 62, 110, 255], C: [28, 40, 74, 255] }, // #2c3e6e
};

export const VILLAGER_FRAMES = ['stand', 'walk1', 'walk2', 'work1', 'work2', 'carry1', 'carry2'] as const;
export type VillagerFrame = (typeof VILLAGER_FRAMES)[number];

/** Body poses, facing right, without outline (composeVillager adds it around the silhouette). */
export const VILLAGER_POSES: Record<VillagerFrame, readonly string[]> = {
  stand: [
    '............',
    '............',
    '............',
    '............',
    '....hhhh....',
    '....hsss....',
    '....hsse....',
    '.....SS.....',
    '....cccc....',
    '....CcCC....',
    '....scCs....',
    '....pppP....',
    '....p..P....',
    '....b..b....',
    '............',
  ],
  walk1: [
    '............',
    '............',
    '............',
    '............',
    '....hhhh....',
    '....hsss....',
    '....hsse....',
    '.....SS.....',
    '....cccc....',
    '....CcCC....',
    '....scCs....',
    '....pppP....',
    '...p....P...',
    '..bb....bb..',
    '............',
  ],
  walk2: [
    '............',
    '............',
    '............',
    '............',
    '....hhhh....',
    '....hsss....',
    '....hsse....',
    '.....SS.....',
    '....cccc....',
    '....CcCC....',
    '....scCs....',
    '....pppP....',
    '....p..P....',
    '....b..b....',
    '............',
  ],
  work1: [
    '............',
    '............',
    '............',
    '............',
    '....hhhh....',
    '....hsss....',
    '....hsse....',
    '.....SS.....',
    '....cccc....',
    '....CcCC....',
    '....sccC....',
    '....pppP....',
    '....p..P....',
    '....b..b....',
    '............',
  ],
  work2: [
    '............',
    '............',
    '............',
    '............',
    '....hhhh....',
    '....hsss....',
    '....hsse....',
    '.....SS.....',
    '....cccc....',
    '....CcCC....',
    '....sccC....',
    '....pppP....',
    '...p....P...',
    '..bb....bb..',
    '............',
  ],
  carry1: [
    '............',
    '............',
    '............',
    '....s..s....',
    '...chhhhc...',
    '...chsssc...',
    '...chssec...',
    '.....SS.....',
    '....cccc....',
    '....CcCC....',
    '....cccC....',
    '....pppP....',
    '...p....P...',
    '..bb....bb..',
    '............',
  ],
  carry2: [
    '............',
    '............',
    '............',
    '....s..s....',
    '...chhhhc...',
    '...chsssc...',
    '...chssec...',
    '.....SS.....',
    '....cccc....',
    '....CcCC....',
    '....cccC....',
    '....pppP....',
    '....p..P....',
    '....b..b....',
    '............',
  ],
};

/** Per-job layers over the body: hat (every frame), tool (work frames), load (carry frames). */
export const VILLAGER_GEAR: Record<Job, Record<'hat' | 'tool1' | 'tool2' | 'load', readonly string[]>> = {
  lumber: {
    hat: [
      '............',
      '............',
      '............',
      '....qqqq....',
      '....QQqqqq..',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
    tool1: [
      '............',
      '..........x.',
      '.........txX',
      '.........txX',
      '.........t..',
      '.........t..',
      '.........s..',
      '........c...',
      '........c...',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
    tool2: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '........cs..',
      '..........tx',
      '..........tx',
      '..........XX',
      '............',
      '............',
    ],
    load: [
      '............',
      '..LLLLLLLn..',
      '..llllllln..',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
  },
  farm: {
    hat: [
      '............',
      '............',
      '.....YY.....',
      '....YYYY....',
      '...YyyyyYY..',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
    tool1: [
      '............',
      '............',
      '.........tx.',
      '.........t.x',
      '.........t.X',
      '.........t..',
      '.........s..',
      '........c...',
      '........c...',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
    tool2: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '........cs..',
      '..........t.',
      '...........t',
      '...........t',
      '........Xxx.',
      '............',
    ],
    load: [
      '.....kk.....',
      '...kkkkK....',
      '...kkkKK....',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
  },
  orchard: {
    hat: [
      '............',
      '............',
      '............',
      '....LLLL....',
      '....llLLLL..',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
    tool1: [
      '............',
      '............',
      '.........rR.',
      '.........rr.',
      '.........s..',
      '.........c..',
      '........c...',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
    tool2: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '........cs..',
      '.........rr.',
      '.........rR.',
      '............',
      '............',
      '............',
    ],
    load: [
      '....rrrr....',
      '...lrRrrRl..',
      '...LLLLLLL..',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
  },
  mine: {
    hat: [
      '............',
      '............',
      '.....GGG....',
      '....GGGGG...',
      '....ggggw...',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
    tool1: [
      '............',
      '............',
      '........xxx.',
      '.......X.t.X',
      '.........t..',
      '.........t..',
      '.........s..',
      '........c...',
      '........c...',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
    tool2: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '........cs.X',
      '..........tx',
      '...........t',
      '...........x',
      '..........X.',
      '............',
    ],
    load: [
      '....aaa.....',
      '...aaaaA....',
      '...aaaAA....',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
  },
  herd: {
    hat: [
      '............',
      '............',
      '............',
      '....LLLL....',
      '..llllllll..',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
    tool1: [
      '..........t.',
      '.........t.t',
      '.........t.t',
      '.........t..',
      '.........t..',
      '.........t..',
      '.........s..',
      '........c...',
      '........c...',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
    tool2: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '........cs..',
      '..........t.',
      '...........t',
      '...........t',
      '..........t.',
      '............',
    ],
    load: [
      '...tttttt...',
      '..tnttnttt..',
      '..LLLLLLLL..',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
  },
  cotton: {
    hat: [
      '............',
      '............',
      '............',
      '....nnnn....',
      '.ttnnnnnntt.',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
    tool1: [
      '............',
      '............',
      '............',
      '............',
      '.........xx.',
      '........xxX.',
      '.........s..',
      '........c...',
      '........c...',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
    tool2: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '........cs..',
      '.........xx.',
      '.........xX.',
      '............',
      '............',
      '............',
    ],
    load: [
      '....xxxx....',
      '...xxxxxX...',
      '...xXxxXX...',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
  },
  // Tax collector: a top hat with a gold band, a ledger, and a strongbox carried home.
  tax: {
    hat: [
      '............',
      '....eeee....',
      '....eeee....',
      '....YYYY....',
      '...eeeeee...',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
    tool1: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '........LLL.',
      '........xxL.',
      '........sxL.',
      '........c...',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
    tool2: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '........cs..',
      '.........LLL',
      '.........xxL',
      '.........xxL',
      '............',
      '............',
    ],
    load: [
      '...QQQQQQ...',
      '..qqqYYqqq..',
      '..QQQQQQQQ..',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
      '............',
    ],
  },
};

/** One villager frame (facing right): body + hat + tool or load, outlined, with a ground shadow. */
export function composeVillager(job: Job, frame: VillagerFrame): string[] {
  const g = VILLAGER_POSES[frame].map((r) => [...r]);
  const gear = VILLAGER_GEAR[job];
  const layers = [gear.hat];
  if (frame === 'work1') layers.push(gear.tool1);
  if (frame === 'work2') layers.push(gear.tool2);
  if (frame === 'carry1' || frame === 'carry2') layers.push(gear.load);
  for (const layer of layers) layer.forEach((r, y) => [...r].forEach((c, x) => c !== '.' && (g[y][x] = c)));
  const solid = (x: number, y: number) => g[y]?.[x] !== undefined && g[y][x] !== '.';
  const out = g.map((r) => [...r]);
  for (let y = 0; y < VILLAGER_H; y++) {
    for (let x = 0; x < VILLAGER_W; x++) {
      if (solid(x, y) || ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => solid(x + dx, y + dy))) continue;
      out[y][x] = y === VILLAGER_FEET.y ? 'z' : 'o';
    }
  }
  for (let x = 3; x <= 8; x++) if (out[VILLAGER_FEET.y][x] === '.') out[VILLAGER_FEET.y][x] = 'z';
  return out.map((r) => r.join(''));
}

export const MULE_W = 16;
export const MULE_H = 14;
/** Pixel in a mule sprite that sits on the mule's position (under its middle). */
export const MULE_FEET = { x: 7, y: 13 } as const;

/** RGBA per pack mule grid char. */
export const MULE_PALETTE: Record<string, Rgba> = {
  o: [26, 18, 12, 255], // #1a120c outline
  z: [0, 0, 0, 60], // #000000 at 24%
  m: [140, 118, 98, 255], // #8c7662 coat
  M: [104, 86, 70, 255], // #685646 coat shade, far legs
  n: [200, 184, 164, 255], // #c8b8a4 muzzle, belly
  k: [48, 36, 26, 255], // #30241a hooves, nostril
  e: [20, 14, 10, 255], // #140e0a eye
  t: [70, 54, 40, 255], // #463628 mane, tail
  r: [192, 57, 43, 255], // #c0392b saddle blanket
  R: [126, 35, 24, 255], // #7e2318
  L: [138, 90, 48, 255], // #8a5a30 packs
  l: [90, 58, 31, 255], // #5a3a1f
  Y: [232, 194, 90, 255], // #e8c25a gold
  y: [168, 128, 46, 255], // #a8802e
};

export const MULE_FRAMES = ['stand', 'walk1', 'walk2'] as const;
export type MuleFrame = (typeof MULE_FRAMES)[number];

const MULE_BODY = [
  '................',
  '..........M.M...',
  '..........m.m...',
  '.........tmmm...',
  '.........tmemm..',
  '...MMMMMMmmmmnn.',
  '..tmmmmmmmmmmnk.',
  '..tmmmmmmmmm....',
  '..tmmmmmmmmm....',
  '..tMnnnnnnnM....',
];

/** A pack mule facing right, without outline (composeMule adds it): the body, then the legs of each frame. */
export const MULE_POSES: Record<MuleFrame, readonly string[]> = {
  stand: [...MULE_BODY, '...m.M...m.M....', '...m.M...m.M....', '...k.k...k.k....', '................'],
  walk1: [...MULE_BODY, '...m.M...m.M....', '..m...M.m...M...', '..k...k.k...k...', '................'],
  walk2: [...MULE_BODY, '...mM....mM.....', '...mM....mM.....', '...kk....kk.....', '................'],
};

/** Layers over the body: the saddle blanket it always wears, and the gold-laden packs while loaded. */
export const MULE_GEAR: Record<'saddle' | 'packs', readonly string[]> = {
  saddle: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '...rrrrrrr......',
    '...RRRRRRR......',
  ],
  packs: [
    '................',
    '................',
    '.....YyY........',
    '....lLLLl.......',
    '....LLLLL.......',
    '....LLYLL.......',
    '....LLLLL.......',
    '....lLLLl.......',
  ],
};

/** One pack mule frame (facing right), loaded or not, outlined, with a ground shadow. */
export function composeMule(frame: MuleFrame, loaded: boolean): string[] {
  const g = MULE_POSES[frame].map((r) => [...r]);
  for (const layer of loaded ? [MULE_GEAR.saddle, MULE_GEAR.packs] : [MULE_GEAR.saddle]) {
    layer.forEach((r, y) => [...r].forEach((c, x) => c !== '.' && (g[y][x] = c)));
  }
  const solid = (x: number, y: number) => g[y]?.[x] !== undefined && g[y][x] !== '.';
  const out = g.map((r) => [...r]);
  for (let y = 0; y < MULE_H; y++) {
    for (let x = 0; x < MULE_W; x++) {
      if (solid(x, y) || ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => solid(x + dx, y + dy))) continue;
      out[y][x] = y === MULE_FEET.y ? 'z' : 'o';
    }
  }
  for (let x = 2; x <= 13; x++) if (out[MULE_FEET.y][x] === '.') out[MULE_FEET.y][x] = 'z';
  return out.map((r) => r.join(''));
}

/** RGBA per UI grid char: button and panel frames, icons, the sidebar's wood. */
export const UI_PALETTE: Record<string, Rgba> = {
  o: [36, 22, 12, 255], // #24160c outline
  h: [176, 136, 80, 255], // #b08850 plank
  m: [138, 90, 48, 255], // #8a5a30
  d: [107, 68, 38, 255], // #6b4426
  D: [78, 52, 28, 255], // #4e341c
  Y: [242, 215, 122, 255], // #f2d77a gold
  y: [217, 169, 60, 255], // #d9a93c
  v: [168, 128, 46, 255], // #a8802e
  V: [110, 82, 24, 255], // #6e5218
  W: [248, 239, 214, 255], // #f8efd6 parchment
  w: [234, 217, 178, 255], // #ead9b2
  k: [194, 171, 130, 255], // #c2ab82
  K: [138, 99, 56, 255], // #8a6338
  b: [58, 38, 22, 255], // #3a2616 sidebar wood
  B: [74, 46, 24, 255], // #4a2e18
  q: [46, 30, 16, 255], // #2e1e10
  Q: [28, 18, 10, 255], // #1c120a
  S: [195, 202, 210, 255], // #c3cad2 stone
  a: [154, 163, 172, 255], // #9aa3ac
  s: [120, 131, 142, 255], // #78838e
  Z: [64, 71, 79, 255], // #40474f
  f: [240, 196, 154, 255], // #f0c49a skin
  l: [90, 58, 31, 255], // #5a3a1f hair, bark
  n: [224, 184, 120, 255], // #e0b878 log end
  r: [192, 57, 43, 255], // #c0392b cloth
  R: [126, 35, 24, 255], // #7e2318
  g: [111, 158, 79, 255], // #6f9e4f grass
  G: [148, 196, 100, 255], // #94c464
  z: [79, 125, 60, 255], // #4f7d3c
  e: [31, 82, 40, 255], // #1f5228 pine
  E: [46, 122, 51, 255], // #2e7a33
  j: [79, 156, 60, 255], // #4f9c3c
  u: [196, 228, 246, 255], // #c4e4f6 water
  c: [92, 158, 214, 255], // #5c9ed6
  C: [52, 104, 168, 255], // #3468a8
};

/**
 * 9-slice frame faces, UI_FRAME_W × UI_FRAME_H with a UI_FRAME_SLICE border on every side and a
 * uniform center. `lip` is the shade of the UI_LIP rows under the face that make it look raised.
 */
export const UI_FRAME_W = 8;
export const UI_FRAME_H = 7;
export const UI_FRAME_SLICE = 3;
export const UI_LIP = 2;
export const UI_FRAMES: Record<'plank' | 'gold' | 'parchment' | 'dark', { face: readonly string[]; lip: string }> = {
  plank: {
    face: ['.oooooo.', 'ohhhhhho', 'ohmmmmdo', 'ohmmmmdo', 'ohmmmmdo', 'oddddddo', '.oooooo.'],
    lip: 'D',
  },
  gold: {
    face: ['.oooooo.', 'oYYYYYYo', 'oYyyyyvo', 'oYyyyyvo', 'oYyyyyvo', 'ovvvvvvo', '.oooooo.'],
    lip: 'V',
  },
  parchment: {
    face: ['.oooooo.', 'oWWWWWWo', 'oWwwwwko', 'oWwwwwko', 'oWwwwwko', 'okkkkkko', '.oooooo.'],
    lip: 'K',
  },
  dark: {
    face: ['.oooooo.', 'oyyyyyyo', 'oyqqqqvo', 'oyqqqqvo', 'oyqqqqvo', 'ovvvvvvo', '.oooooo.'],
    lip: 'V',
  },
};
export type UiFrame = keyof typeof UI_FRAMES;

/** A frame raised on its lip, or pressed flat: the face over UI_LIP empty rows. */
export function composeFrame(frame: UiFrame, pressed: boolean): string[] {
  const { face, lip } = UI_FRAMES[frame];
  const filler = pressed ? '.'.repeat(UI_FRAME_W) : `o${lip.repeat(UI_FRAME_W - 2)}o`;
  const rows = Array<string>(UI_LIP).fill(filler);
  return pressed ? [...face, ...rows] : [...face.slice(0, -1), ...rows, face[face.length - 1]];
}

/** Sidebar background: dark wooden boards, tiled. */
export const UI_WOOD: readonly string[] = [
  'QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ',
  'BBBbbbbbbbbBBbbbbbbbbQbbbbBBbbbb',
  'bbbbbqqqbbbbbbbbbbqqbQbbbbbbbbqq',
  'bbBBbbbbbbbbqqbbbbbbbQbqqqbbbbbb',
  'bbbbbbbbBBBbbbbbbBBbbQbbbbbbbBBb',
  'bqqbbbbbbbbbbbbbbbbbbQbbbBBBbbbb',
  'bbbbbbqqqqbbbbBbbbbqqQbbbbbbqqqb',
  'qqbbbbbbbbbbbbqqbbbbbQbbbbbbbbbb',
];

/** RGBA per forest creature grid char. Creatures are ambience only: drawn by the renderer, never part of the game state. */
export const CRITTER_PALETTE: Record<string, Rgba> = {
  o: [30, 22, 16, 255], // #1e1610 outline, legs, nose
  e: [12, 8, 6, 255], // #0c0806 eye
  b: [150, 108, 70, 255], // #966c46 brown (rabbit, sparrow)
  B: [108, 76, 48, 255], // #6c4c30
  c: [236, 226, 204, 255], // #ece2cc cream, white tail tip
  p: [226, 160, 160, 255], // #e2a0a0 inside a rabbit's ear
  r: [198, 96, 42, 255], // #c6602a russet (squirrel, fox)
  R: [140, 62, 26, 255], // #8c3e1a
  a: [122, 84, 40, 255], // #7a5428 acorn
  k: [232, 150, 48, 255], // #e89630 beak, webbed feet
  w: [246, 246, 238, 255], // #f6f6ee white
  g: [128, 118, 106, 255], // #80766a grey (hedgehog spines, goose)
  G: [78, 70, 62, 255], // #4e463e
  n: [70, 140, 70, 255], // #468c46 green (frog, drake's head)
  N: [44, 96, 44, 255], // #2c602c
  y: [246, 214, 80, 255], // #f6d650 duckling
  Y: [208, 168, 40, 255], // #d0a828
  t: [176, 128, 82, 255], // #b08052 deer
  T: [126, 88, 54, 255], // #7e5836
  '1': [246, 246, 238, 255], // butterfly wings (see CRITTER_VARIANTS)
  '2': [80, 80, 80, 255],
};

/** Recolorings of a creature's palette: the winter hare, the winter cardinal, and each butterfly. Index 0 is the plain one. */
export const CRITTER_VARIANTS: Partial<Record<CritterSprite, Record<string, Rgba>[]>> = {
  rabbit: [{}, { b: [240, 240, 236, 255], B: [196, 204, 216, 255], c: [255, 255, 255, 255] }],
  bird: [{}, { b: [200, 40, 36, 255], B: [140, 22, 20, 255], c: [214, 70, 56, 255] }],
  butterfly: [
    {},
    { '1': [250, 222, 80, 255], '2': [230, 150, 40, 255] },
    { '1': [236, 128, 36, 255], '2': [40, 26, 18, 255] },
    { '1': [120, 176, 240, 255], '2': [220, 238, 255, 255] },
  ],
};

/** Creatures drawn without an outline (thin wings that an outline would swamp). */
export const CRITTER_BARE: ReadonlySet<CritterSprite> = new Set(['butterfly']);

/**
 * Forest creature frames facing right, without outline (composeCritter adds it). Each stands on the
 * middle of its bottom row. 'o' pixels are drawn as they are and never outlined (legs stay thin). The row
 * just under the body is its outline, so a leg needs two or more rows of 'o' to show below it.
 */
export const CRITTERS = {
  rabbit: {
    sit: ['....bb.', '....pb.', '...bbb.', '.bbbbeb', 'cbbbbbb', '.BB.BB.'],
    twitch: ['...bb..', '...pb..', '...bbb.', '.bbbbeb', 'cbbbbbb', '.BB.BB.'],
    crouch: ['.......', '..bb...', '...pbb.', '.bbbbeb', 'cbbbbbb', '..BBBB.'],
    leap: ['.......', '.bb....', '..pbbb.', 'cbbbbeb', '.bbbbbb', 'B.....B'],
  },
  squirrel: {
    sit: ['rr.....', 'rRr..r.', 'rRr.rre', '.rr.rrr', '..rrrc.', '...rr..'],
    eat: ['rr.....', 'rRr..r.', 'rRr.rre', '.rr.rra', '..rrrc.', '...rr..'],
    run1: ['r......', 'rr.....', 'rRr..r.', '.rRrrre', '..rrrr.', '..R..R.'],
    run2: ['.......', 'rr.....', 'rRr..r.', '.rRrrre', '..rrrr.', '.R....R'],
  },
  bird: {
    stand: ['...bb.', 'Bbbbek', '.cccc.', '..o.o.', '..o.o.'],
    peck: ['......', 'Bbbbb.', '.ccbbe', '..o.ok', '..o.o.'],
    fly: ['..B...', '.BBbb.', 'Bbbbek', '..cc..', '......'],
  },
  butterfly: {
    open: ['11.11', '12o21', '.1o1.', '.....'],
    closed: ['.1.1.', '.1o1.', '..o..', '.....'],
  },
  frog: {
    sit: ['...nn.', '.nnnen', 'NNnnn.'],
    hop: ['....nn', '.nnnne', 'N..N..'],
  },
  duck: {
    walk1: ['.....nn.', '.....nek', 'bbbbbw..', 'Bbbbbbb.', '.BBBBB..', '..k..k..'],
    walk2: ['.....nn.', '.....nek', 'bbbbbw..', 'Bbbbbbb.', '.BBBBB..', '...kk...'],
  },
  duckling: {
    walk1: ['..yy.', '..yek', 'yyyy.', '.YY..', '.k.k.'],
    walk2: ['..yy.', '..yek', 'yyyy.', '.YY..', '..k..'],
  },
  hedgehog: {
    walk1: ['.GgGg..', 'GgGgGce', 'gGgGcco', '.o..o..', '.o..o..'],
    walk2: ['.GgGg..', 'GgGgGce', 'gGgGcco', '.o..o..', '..o..o.'],
  },
  fox: {
    stand: ['......R.R.', '......rrr.', '......recc', 'rr..rrrrc.', 'crrrrrrrr.', '...rrrrr..', '...o...o..', '...o...o..', '...o...o..'],
    trot1: ['......R.R.', '......rrr.', '......recc', 'rr..rrrrc.', 'crrrrrrrr.', '...rrrrr..', '...o...o..', '..o.....o.', '..o.....o.'],
    trot2: ['......R.R.', '......rrr.', '......recc', 'rr..rrrrc.', 'crrrrrrrr.', '...rrrrr..', '...o...o..', '....o.o...', '....o.o...'],
  },
  deer: {
    stand: ['......T.T.', '.......TT.', '......ttet', '......tt..', '.tttttttc.', 'cttttttt..', '.tcccct...', '.o.o..o.o.', '.o.o..o.o.', '.o.o..o.o.'],
    graze: ['..........', '..........', '..........', '..........', '.tttttt...', 'cttttttt..', '.tcccctTt.', '.o.o..o.tt', '.o.o..o.te', '.o.o..o..t'],
    walk: ['......T.T.', '.......TT.', '......ttet', '......tt..', '.tttttttc.', 'cttttttt..', '.tcccct...', '.o.o..o.o.', 'o..o.o...o', 'o..o.o...o'],
  },
  goose: {
    up: ['..ggg..', 'Gggggwo', '.......'],
    down: ['.......', 'Gggggwo', '..ggg..'],
  },
} as const satisfies Record<string, Record<string, readonly string[]>>;
export type CritterSprite = keyof typeof CRITTERS;

/** A creature frame with a one-pixel outline added around it (unless it is CRITTER_BARE): 2 px wider and taller. */
export function composeCritter(sprite: CritterSprite, frame: string): string[] {
  const grid = (CRITTERS[sprite] as Record<string, readonly string[]>)[frame];
  const w = grid[0].length + 2;
  const at = (x: number, y: number) => grid[y - 1]?.[x - 1] ?? '.';
  const out: string[] = [];
  for (let y = 0; y < grid.length + 2; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const ch = at(x, y);
      const body = (c: string) => c !== '.' && c !== 'o';
      const edge = !CRITTER_BARE.has(sprite) && ch === '.' && [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].some(body);
      row += edge ? 'o' : ch;
    }
    out.push(row);
  }
  return out;
}

/** The Lucky Chest, drawn in UI_PALETTE: a lid that flies off when it opens, over its base. */
export const UI_CHEST: Record<'lid' | 'base', readonly string[]> = {
  lid: [
    '...oooooooooooooo...',
    '..ohhhhhhhhhhhhhho..',
    '.ohhmhhhhhhhhhhmhho.',
    'oYyyyyyyyyyyyyyyyyYo',
    'ommdmmdmoYYomdmmdmmo',
    'oVVVVVVVoYYoVVVVVVVo',
    'oooooooooYYooooooooo',
  ],
  base: [
    'oYyyyyyyyyyyyyyyyyYo',
    'ohhmhhmhoYYohmhhmhho',
    'ommdmmdmoVVomdmmdmmo',
    'ohhmhhmhoyyohmhhmhho',
    'ommdmmdmoooomdmmdmmo',
    'oyyyyyyyyyyyyyyyyyyo',
    'ohhmhhmhhmhhmhhmhhmo',
    'ommdmmdmmdmmdmmdmmdo',
    'ohhmhhmhhmhhmhhmhhmo',
    'ovvvvvvvvvvvvvvvvvvo',
    'oooooooooooooooooooo',
  ],
};

export const UI_ICON_W = 12;
export const UI_ICON_NAMES = [
  'wood', 'food', 'stone', 'cloth', 'pop', 'land', 'trees', 'relic', 'skills', 'export', 'import', 'chop', 'mark',
  'basket', 'boot', 'bolt', 'house', 'hammer', 'pick', 'pair', 'drop', 'gold',
  'sweep', 'combo', 'eye', 'rings', 'fall', 'run', 'bowl', 'map', 'plots', 'lanes', 'fork', 'barrel', 'glass', 'sheaf',
  'meadow', 'shears', 'fleece', 'yarn', 'sheep', 'vein', 'gem', 'cobble', 'mine', 'tnt', 'toll', 'purse', 'scroll',
  'scales', 'sun', 'wagon', 'heart', 'trophy', 'sound', 'music',
] as const;
export type UiIcon = (typeof UI_ICON_NAMES)[number];

/** UI_ICON_W-square icons for resources, stats, tools, menu buttons and skills. */
export const UI_ICONS: Record<UiIcon, readonly string[]> = {
  music: [
    '............',
    '......ooo...',
    '......oYYo..',
    '......oYyYo.',
    '......oyo.o.',
    '......oyo...',
    '......oyo...',
    '...oooovo...',
    '..oYYyyvo...',
    '..oYyyyVo...',
    '...oVVVo....',
    '....ooo.....',
  ],
  sound: [
    '............',
    '.....oo.....',
    '....oYo...o.',
    '...oYyo.o..o',
    'oooYyyo..o.o',
    'oYYyyyo..o.o',
    'oYyyyyo..o.o',
    'oooVyyo..o.o',
    '...oVyo.o..o',
    '....oVo...o.',
    '.....oo.....',
    '............',
  ],
  trophy: [
    '..oooooooo..',
    'oooYYYYYyooo',
    'oYoYYYYYyoyo',
    'oYoYWYYYyoyo',
    '.ooYYYYyyoo.',
    '..ooYYyyoo..',
    '....oyvo....',
    '....oyvo....',
    '...ooyvoo...',
    '..oyyyvvvo..',
    '..oVVVVVVo..',
    '..oooooooo..',
  ],
  wood: [
    '............',
    '............',
    '..ooooooooo.',
    '.onnnohhhhho',
    'onhdhnommmmo',
    'onddhnodmmmo',
    'onhhhnommmdo',
    '.onnnoddddo.',
    '..ooooooooo.',
    '............',
    '............',
    '............',
  ],
  food: [
    '......o.....',
    '.....oYo....',
    '...o.oyo.o..',
    '..oYooYooYo.',
    '..oyYoyoYyo.',
    '...ooYyYoo..',
    '..oYooyooYo.',
    '..oyYoyoYyo.',
    '...ooovooo..',
    '.....ovo....',
    '.....ovo....',
    '......o.....',
  ],
  stone: [
    '............',
    '............',
    '....ooooo...',
    '...oSSSaaoo.',
    '..oSSaaaasso',
    '.oSSaaaaasso',
    '.oSaaaasssZo',
    '.oaaaasssZZo',
    '..osssssZZo.',
    '...oooooooo.',
    '............',
    '............',
  ],
  cloth: [
    '............',
    '...oo..oo...',
    '.ooWWooWWoo.',
    'oWWWWwwWWWko',
    'oWWWWWWWWkko',
    'okWWWWWWWkko',
    '.ooWWWWWkoo.',
    '..oWWWWWko..',
    '..oWWWWWko..',
    '..oWWWWkko..',
    '..oooooooo..',
    '............',
  ],
  pop: [
    '............',
    '....oooo....',
    '...ollllo...',
    '...ollllo...',
    '...offffo...',
    '...offffo...',
    '....oooo....',
    '..oorrrroo..',
    '.orrrrrrrro.',
    '.oRrrrrrrRo.',
    '.oRRRRRRRRo.',
    '.oooooooooo.',
  ],
  land: [
    '............',
    '.oooooooooo.',
    '.oGGGGGGGgo.',
    '.oGggGgggzo.',
    '.oGggggGgzo.',
    '.ogGggggGzo.',
    '.oGgggGggzo.',
    '.oggggggzzo.',
    '.ozzzzzzzzo.',
    '.oddddddddo.',
    '.oooooooooo.',
    '............',
  ],
  trees: [
    '.....oo.....',
    '....ojEo....',
    '...ojjEEo...',
    '..ojjEEEeo..',
    '...ojEEeo...',
    '..ojEEEEeo..',
    '.ojjEEEEEeo.',
    '.ojEEEEEeeo.',
    '.oooommoooo.',
    '....omdo....',
    '....oooo....',
    '............',
  ],
  relic: [
    '............',
    '....oooo....',
    '...oSSaao...',
    '..oSaaaaso..',
    '..oSaYaaso..',
    '..oSaYYaso..',
    '..oSaYaaso..',
    '..oSaaYaso..',
    '..oaaaasso..',
    '.ozzgggzzzo.',
    '.oooooooooo.',
    '............',
  ],
  skills: [
    '.....o......',
    '....oYo.....',
    '....oYo.....',
    'ooooYYyoooo.',
    'oYYYYYyyyyo.',
    '.oYYYyyyyo..',
    '..oYYyyyo...',
    '..oYyyyyo...',
    '.oYyyoyyyo..',
    '.oYyo.oyyo..',
    'oyyo...ovvo.',
    'ooo.....ooo.',
  ],
  export: [
    '....oooo....',
    '....oWwo....',
    '....oWwo....',
    '....oWwo....',
    '..oooWwooo..',
    '...oWWwko...',
    '....oWko....',
    '.ooo.oo.ooo.',
    '.owo....owo.',
    '.owwwwwwwwo.',
    '.oooooooooo.',
    '............',
  ],
  import: [
    '.....oo.....',
    '....oWko....',
    '...oWWwko...',
    '..oooWwooo..',
    '....oWwo....',
    '....oWwo....',
    '....oooo....',
    '.ooo....ooo.',
    '.owo....owo.',
    '.owwwwwwwwo.',
    '.oooooooooo.',
    '............',
  ],
  chop: [
    '.....oooo...',
    '.ooooohmo...',
    'oSSSaahmo...',
    'oSSaaahmo...',
    'oSaaaahmo...',
    '.osssshmo...',
    '..oooohmo...',
    '.....ohmo...',
    '.....ohmo...',
    '.....ohmo...',
    '.....odmo...',
    '.....oooo...',
  ],
  mark: [
    '..ooo.......',
    '..ohoooooo..',
    '..ohorrrrro.',
    '..ohorrrrrro',
    '..ohorrrrRRo',
    '..ohoRRRRRo.',
    '..ohoooooo..',
    '..oho.......',
    '..oho.......',
    '..oho.......',
    '..omo.......',
    '..ooo.......',
  ],
  basket: [
    '............',
    '...oooooo...',
    '..oo....oo..',
    '.oo......oo.',
    'oooooooooooo',
    'ohhmhhmhhmho',
    'ommdmmdmmdmo',
    '.ohhmhhmhho.',
    '.ommdmmdmmo.',
    '..ohhmhhmo..',
    '..oddddddo..',
    '..oooooooo..',
  ],
  boot: [
    '............',
    '..ooooooo...',
    '..ohhhhho...',
    '..ooooooo...',
    'w.ohmmmdo...',
    'wwohmmmdo...',
    '..ohmmmdooo.',
    '..ohmmmmmmdo',
    'w.ohmmmmmmdo',
    '..oddddddddo',
    '..oooooooooo',
    '............',
  ],
  bolt: [
    '.......ooo..',
    '......oYyo..',
    '.....oYyo...',
    '....oYyo....',
    '...oYyoooo..',
    '..oYYYYYyo..',
    '..ooooYyo...',
    '.....oYo....',
    '....oYo.....',
    '...oyo......',
    '...oo.......',
    '............',
  ],
  house: [
    '.....oo.....',
    '....orRo....',
    '...orrRRo...',
    '..orrrRRRo..',
    '.orrrrRRRRo.',
    'oooooooooooo',
    '.oWWWWWWWko.',
    '.oWoooWoooo.',
    '.oWohoWoYoo.',
    '.oWohoWoooo.',
    '.okohokkkko.',
    'oooooooooooo',
  ],
  hammer: [
    '............',
    '.ooooooooo..',
    'oSSSSSaaaso.',
    'oaaaasssZZo.',
    '.oooohmoooo.',
    '....ohmo....',
    '....ohmo....',
    '....ohmo....',
    '....ohmo....',
    '....ohdo....',
    '....ohdo....',
    '....oooo....',
  ],
  pick: [
    '............',
    '...oooooo...',
    '.ooSSSaaaoo.',
    'oSSoohmoosso',
    'oSo.ohmo.oso',
    'oo..ohmo..oo',
    '....ohmo....',
    '....ohmo....',
    '....ohmo....',
    '....ohdo....',
    '....ohdo....',
    '....oooo....',
  ],
  pair: [
    '............',
    '.oooo..oooo.',
    '.ollo..ollo.',
    '.offo..offo.',
    '.oooo..oooo.',
    'orrrrooggggo',
    'orrrrooggggo',
    'oRrrRoozggzo',
    'oRRRRoozzzzo',
    'oooooooooooo',
    '............',
    '............',
  ],
  drop: [
    '.....oo.....',
    '....ouco....',
    '....occo....',
    '...ouccco...',
    '..oucccCCo..',
    '.oucccccCCo.',
    '.occcccccCo.',
    '.occcccccCo.',
    '.oCcccccCCo.',
    '..oCCCCCCo..',
    '...oooooo...',
    '............',
  ],
  gold: [
    '............',
    '............',
    '..oooooooo..',
    '.oYYYYYYYyo.',
    '.oyyyyyyyvo.',
    '.ovvvvvvvVo.',
    '.oYYYYYYYyo.',
    '.ovvvvvvvVo.',
    '.oYYYYYYYyo.',
    '.ovvvvvvvVo.',
    '..oooooooo..',
    '............',
  ],
  sweep: [
    '.oo.oooo....',
    'oWWoohmoooo.',
    'oWo.ohmSSSao',
    'oWo.ohmSSaao',
    'oko.ohmSaaso',
    'oko.ohmssso.',
    'okkoohmoooo.',
    '.oo.ohmo....',
    '....ohmo....',
    '....ohmo....',
    '....ohdo....',
    '....oooo....',
  ],
  combo: [
    '.....oo.....',
    '....oYyo....',
    '...oYooyo...',
    '..oYooooyo..',
    '.oYooYyooyo.',
    '.oooYooyooo.',
    '..oYooooyo..',
    '.oYooYyooyo.',
    '.oooYooyooo.',
    '..oYo..oyo..',
    '.oYo....oyo.',
    '.oo......oo.',
  ],
  eye: [
    '............',
    '............',
    '....oooo....',
    '..ooWWWWoo..',
    '.oWWcucCWko.',
    'oWWWcooCWkko',
    'okWWcooCkkKo',
    '.okkCCCCkKo.',
    '..ookkkkoo..',
    '....oooo....',
    '............',
    '............',
  ],
  rings: [
    '............',
    '....oooo....',
    '..oolllloo..',
    '.ollnnnnllo.',
    '.olnmmmmnlo.',
    'olnmmrrmmnlo',
    'olnmmrRmmnlo',
    '.olnmmmmnlo.',
    '.ollnnnnllo.',
    '..oolllloo..',
    '....oooo....',
    '............',
  ],
  fall: [
    '.........oo.',
    '..oo....ojEo',
    '..okkoojjEEo',
    '.okoojjEEEeo',
    '.oko.ojEEeo.',
    '..o.ojEEEEeo',
    '..ojjEEEEEeo',
    '..ojEEEEEeeo',
    '..oooommoooo',
    '.....omdo...',
    '....omdo....',
    '....oooo....',
  ],
  run: [
    '.....oooo...',
    '....ollllo..',
    '....ollffo..',
    '....offffo..',
    '.....oooo...',
    '..oorrrrooo.',
    '.ofoorrrrfo.',
    '..o.oRRRoo..',
    '...oDooooDo.',
    '..oDo...oDo.',
    '.oDo.....oo.',
    '.oo.........',
  ],
  bowl: [
    '............',
    '............',
    '....oooo....',
    '..ooGrYyoo..',
    '.oYYrryYGyo.',
    'oooooooooooo',
    'ohhhhhhhhhmo',
    'ohmmmmmmmmdo',
    '.ommmmmmmdo.',
    '..oddddddo..',
    '...oooooo...',
    '............',
  ],
  map: [
    '............',
    '.oooooooooo.',
    '.oWWWWWWWko.',
    '.oWWWWrWrko.',
    '.oWWWWWrWko.',
    '.oWWWWrWrko.',
    '.oWWWmWWWko.',
    '.oWWmWWWWko.',
    '.oWmWWWWWko.',
    '.oWmWWWWWko.',
    '.okkkkkkkko.',
    '.oooooooooo.',
  ],
  plots: [
    '............',
    '.oooooooooo.',
    '.oGzGzYYYYo.',
    '.oGzGzyyyyo.',
    '.oGzGzYYYYo.',
    '.oGzGzyyyyo.',
    '.oddddGzGzo.',
    '.ogdgdGzGzo.',
    '.oddddGzGzo.',
    '.ogdgdGzGzo.',
    '.oDDDDDDDDo.',
    '.oooooooooo.',
  ],
  lanes: [
    '............',
    '.oooooooooo.',
    '.oGzmhGzGzo.',
    '.oGzmhGzGzo.',
    '.oGzmhGzGzo.',
    '.oGzGmhzGzo.',
    '.oGzGmhzGzo.',
    '.oGzGmhzGzo.',
    '.oGzGzmhGzo.',
    '.oGzGzmhGzo.',
    '.oGzGzmhGzo.',
    '.oooooooooo.',
  ],
  fork: [
    '..oooooooo..',
    '..oSoSSoSo..',
    '..oSoSaoSo..',
    '..oaoaaoao..',
    '..oaaaaaso..',
    '..ooohmooo..',
    '....ohmo....',
    '....ohmo....',
    '....ohmo....',
    '....ohmo....',
    '....ohdo....',
    '....oooo....',
  ],
  barrel: [
    '............',
    '...oooooo...',
    '..onnnnnno..',
    '..oaaaaaso..',
    '.ohhmmmmmdo.',
    '.ohmmmmmmdo.',
    '.oaaaaaasso.',
    '.ohmmmmmmdo.',
    '.ohhmmmmmdo.',
    '..oaaaaaso..',
    '...oooooo...',
    '............',
  ],
  glass: [
    '............',
    '.....oo.....',
    '....oWWo....',
    '...oWucWo...',
    '..oWuuccWo..',
    '.oWWWWWWWWo.',
    '.oucWucWcCo.',
    '.oucWucWcCo.',
    '.oGgWGgWgzo.',
    '.oGgWGgWgzo.',
    '.oooooooooo.',
    '............',
  ],
  sheaf: [
    '..o..oo..o..',
    '.oYooYyooYo.',
    '.oyooyYooyo.',
    '.oYooYyooYo.',
    '..ovoyvovo..',
    '...ovyyvo...',
    '...orrrRo...',
    '...ovyyvo...',
    '..ovoyvovo..',
    '.ovooyvoovo.',
    '.oo.oooo.oo.',
    '............',
  ],
  meadow: [
    '............',
    '.ooo....ooo.',
    '.oho....oho.',
    'oohoooooohoo',
    'ohhhhhhhhhmo',
    'oohoooooohoo',
    '.oho....oho.',
    'oohoooooohoo',
    'ohhhhhhhhhmo',
    'oohoooooohoo',
    'oGgGgGGgGgzo',
    'oooooooooooo',
  ],
  shears: [
    '.oo......oo.',
    '.oSo....oSo.',
    '..oSo..oSo..',
    '...oSooSo...',
    '....oSSo....',
    '....oaao....',
    '...oaooao...',
    '.ooro..oroo.',
    'orrRo..orrRo',
    'oRoRo..oRoRo',
    'oRRRo..oRRRo',
    '.ooo....ooo.',
  ],
  fleece: [
    '............',
    '.ooo....ooo.',
    'oYYyooooYyyo',
    'oYWYYyYYyYvo',
    '.ooYyYYyYoo.',
    '..oYYyYYyo..',
    '..oyYYyYYo..',
    '..oYyYYyvo..',
    '.ooYYyYyvoo.',
    'oYyYvYyvYvvo',
    'oyyvooooyvvo',
    '.ooo....ooo.',
  ],
  yarn: [
    '............',
    '...oooo.....',
    '.oorrrRoo...',
    'orrrrRrrRo..',
    'orrrRrrRrRo.',
    'orrRrrRrrRo.',
    'orRrrRrrRRo.',
    'oRrrRrrRRro.',
    '.oRRrrRRRooo',
    '..ooRRRoorro',
    '....oooooRo.',
    '........oo..',
  ],
  sheep: [
    '............',
    '............',
    '..ooooo.....',
    '.oWWWWWoooo.',
    'oWWwWWWoZZZo',
    'oWwWWwkoZZZo',
    'okWwWkkkooo.',
    '.okkkkkko...',
    '.oooooooo...',
    '..oZo.oZo...',
    '..oZo.oZo...',
    '..ooo.ooo...',
  ],
  vein: [
    '............',
    '............',
    '....ooooo...',
    '...oSSYaaoo.',
    '..oSSaYaasso',
    '.oSSaYyaasso',
    '.oSaaYasssZo',
    '.oaaYysssZZo',
    '..osYsssZZo.',
    '...oooooooo.',
    '............',
    '............',
  ],
  gem: [
    '............',
    '............',
    '...oooooo...',
    '..oWucccCo..',
    '.ouuuccccCo.',
    '.oucccccCCo.',
    '..oucccCCo..',
    '...oucCCo...',
    '....ocCo....',
    '.....oo.....',
    '............',
    '............',
  ],
  cobble: [
    'oooooooooooo',
    'oGgSSaoSagzo',
    'oggassoasgzo',
    'oGgoooooogzo',
    'ogzaoSSSagzo',
    'oGgsoassZgzo',
    'ogzooooooggo',
    'oGgSSaoSagzo',
    'oggassoasgzo',
    'ozzoooooozzo',
    'oddddddddddo',
    'oooooooooooo',
  ],
  mine: [
    '....oooo....',
    '..ooWWWWoo..',
    '.oWWWwSaaso.',
    'oSaaaasssZZo',
    'oooooooooooo',
    'ohhhhhhhhhmo',
    'ohdoQQQQohmo',
    'ohdoQQQQohmo',
    'ohdoqQQqohmo',
    'ohdoqQQqohmo',
    'ohdoqqqqohmo',
    'oooooooooooo',
  ],
  tnt: [
    '........oo..',
    '.......oYyo.',
    '......okoo..',
    '.....oko....',
    '...oooooo...',
    '...orrrRo...',
    '...orrrRo...',
    '...oWWWko...',
    '...orrrRo...',
    '...orrrRo...',
    '...oRRRRo...',
    '...oooooo...',
  ],
  toll: [
    '............',
    '............',
    '............',
    '.oooo.......',
    '.ohmoooooooo',
    '.ohmrrWWrrWo',
    '.ohmRRkkRRko',
    '.ohmoooooooo',
    '.ohmo...oo..',
    '.ohmo..oYyo.',
    '.ohdo..oyvo.',
    '.oooo...oo..',
  ],
  purse: [
    '............',
    '....oooo....',
    '...okkKKo...',
    '....orRo....',
    '..ookkkKoo..',
    '.okkooooKKo.',
    'okkoYYYyoKKo',
    'okkoYyyvoKKo',
    'okkoyyvvoKKo',
    'okkkooooKKKo',
    '.oKKKKKKKKo.',
    '..oooooooo..',
  ],
  scroll: [
    '............',
    '.oooooooooo.',
    'oWWWWWWWWWko',
    'okkkkkkkkkKo',
    '.oWkkkkkwko.',
    '.oWwwwwwwko.',
    '.oWkkkwrrko.',
    '.oWwwwrrRko.',
    '.oWkkwwRRko.',
    'oWWWWWWWWWko',
    'okkkkkkkkkKo',
    '.oooooooooo.',
  ],
  scales: [
    '.....oo.....',
    '.ooooYyoooo.',
    '.oYYYYyyyyvo',
    '.o..oYyo..o.',
    'ooo.oYyo.ooo',
    'oYyooYyooYyo',
    '.oo.oYyo.oo.',
    '....oYyo....',
    '....oYyo....',
    '...ooYyoo...',
    '..oYYYyyvo..',
    '..oooooooo..',
  ],
  sun: [
    '.....oo.....',
    '.oo.oYyo.oo.',
    '.oYooYyooyo.',
    '..oYYYYyyo..',
    '.ooYYYYyyyoo',
    'oYYYYYYyyyyo',
    'oyYYYYyyyyvo',
    '.ooYyyyyyvoo',
    '..oyyyyvvo..',
    '.oyoovvoovo.',
    '.oo.ovvo.oo.',
    '.....oo.....',
  ],
  wagon: [
    '..oooooooo..',
    '.oWWkWWkWko.',
    'oWWWkWWkWWko',
    'oWWWkWWkWWko',
    'okkkKkkKkkKo',
    'oooooooooooo',
    'ohhhhhhhhhmo',
    'oooooooooooo',
    'ohmho..ohmho',
    'omomoooomomo',
    'ohmho..ohmho',
    '.ooo....ooo.',
  ],
  heart: [
    '............',
    '..oo....oo..',
    '.oWro..orro.',
    'oWrrroorrrro',
    'orrrrrrrrrRo',
    'orrrrrrrrrRo',
    '.orrrrrrrRo.',
    '..orrrrrRo..',
    '...orrrRo...',
    '....orRo....',
    '.....oo.....',
    '............',
  ],
};
