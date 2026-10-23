import type { BuildingKind } from '../core/buildings';
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
};

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

/** Flag planted in a marked tree's canopy; SPRITE_W × TREE_H, aligned with the tree sprite. */
export const FLAG: readonly string[] = [
  '.....o..........',
  '....okooo.......',
  '....oPcccoo.....',
  '....oPccccCo....',
  '....oPcccCCo....',
  '....oPccCoo.....',
  '....oPCoo.......',
  '....oPo.........',
  '....oPo.........',
  '....oPo.........',
  '....oPo.........',
  '....oPo.........',
  '....oPo.........',
  '....oPo.........',
  '....oPox........',
  '.....oxx........',
  '................',
  '................',
  '................',
  '................',
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
};

/** Shirt per job: c = cloth, C = its shade. */
export const VILLAGER_CLOTH: Record<Job, { c: Rgba; C: Rgba }> = {
  lumber: { c: [192, 57, 43, 255], C: [126, 35, 24, 255] }, // #c0392b
  farm: { c: [90, 154, 58, 255], C: [58, 110, 42, 255] }, // #5a9a3a
  mine: { c: [138, 106, 62, 255], C: [94, 68, 38, 255] }, // #8a6a3e
  herd: { c: [74, 120, 176, 255], C: [46, 82, 128, 255] }, // #4a78b0
  trade: { c: [142, 90, 168, 255], C: [94, 58, 116, 255] }, // #8e5aa8
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
  trade: {
    hat: [
      '............',
      '............',
      '......Y.....',
      '....qqqq....',
      '...QQQQQQ...',
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
      '.........y..',
      '........yYy.',
      '........YYYy',
      '........sYy.',
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
      '.........yy.',
      '........yYYy',
      '........yYyy',
      '.........yy.',
      '............',
    ],
    load: [
      '...kkkkkk...',
      '..kkkYkkkK..',
      '..KKKKKKKK..',
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

export const UI_ICON_W = 12;
export const UI_ICON_NAMES = [
  'wood', 'food', 'stone', 'leather', 'pop', 'land', 'trees', 'relic', 'skills', 'export', 'import', 'chop', 'mark',
  'basket', 'boot', 'bolt', 'house', 'hammer', 'pick', 'pair', 'drop', 'gold',
] as const;
export type UiIcon = (typeof UI_ICON_NAMES)[number];

/** UI_ICON_W-square icons for resources, stats, tools, menu buttons and skills. */
export const UI_ICONS: Record<UiIcon, readonly string[]> = {
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
  leather: [
    '............',
    '.oo......oo.',
    '.onoooooono.',
    '..onhhhhno..',
    '..ohhhhhmo..',
    '.ohhhhhmmmo.',
    '.ohhhhmmmmo.',
    '..ohhmmmdo..',
    '..ommmmddo..',
    '.omoooooomo.',
    '.oo......oo.',
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
};
