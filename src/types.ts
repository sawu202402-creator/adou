export type Lang = 'en' | 'zh';

export type GameMode = 'standard' | 'endless';

export type AdPlacement =
  | 'revive_guardian'
  | 'free_rations_supply'
  | 'bonus_shovels'
  | 'hero_scroll_summon'
  | 'settlement_multiplier';

export type HeroKey = 'zhaoyun' | 'guanyu' | 'zhangfei' | 'zhuge' | 'zhenji' | 'shangxiang';
export type TroopKey = 'blade' | 'archer' | 'lancer' | 'mortar' | 'frostbow';

/**
 * Tile IDs:
 * - 5 Base Troops: 'blade' | 'archer' | 'lancer' | 'mortar' | 'frostbow'
 * - 6 Hero Souls (Part A): 'soul_zhaoyun' | ...
 * - 6 Divine Weapons (Part B): 'weap_zhaoyun' | ...
 * - 6 Awakened True Heroes (Fused A+B): 'hero_zhaoyun' | ...
 */
export type UnitId =
  | TroopKey
  | `soul_${HeroKey}`
  | `weap_${HeroKey}`
  | `hero_${HeroKey}`;

export type TileCategory = 'troop' | 'soul' | 'weapon' | 'awakened';

export type SynergyTag = 'vanguard' | 'marksman' | 'mystic';

export type AttackPattern =
  | 'cleave'
  | 'arrow'
  | 'pierce_lance'
  | 'mortar_aoe'
  | 'frost_bolt'
  | 'spirit_strike'
  | 'dragon_sweep'
  | 'jade_execute'
  | 'roar_quake'
  | 'chain_lightning'
  | 'lotus_blizzard'
  | 'phoenix_volley';

export interface UnitDef {
  id: UnitId;
  category: TileCategory;
  heroKey?: HeroKey; // links soul_<x>, weap_<x>, and hero_<x>
  spriteKey: string;
  accentColor: string;
  frameColor: string;
  crestSymbol: string; // non-text geometric/elemental mark for instant visual pairing
  synergy: SynergyTag;
  pattern: AttackPattern;
  baseDamage: number;
  attackInterval: number;
  rangeCells: number;
  projectileSpeed: number;
  aoeRadiusCells?: number;
  slowFactor?: number;
  slowDuration?: number;
  stunDuration?: number;
  skillEveryN?: number;
}

export interface TileUnit {
  uid: number;
  unitId: UnitId;
  tier: number; // 1..4
  cooldown: number;
  attackCount: number;
  recoilTimer: number;
  recoilAngle: number;
  mergeAnimTimer: number;
}

export type SideOwner = 'ai' | 'player';

export type CellType = 'wall' | 'path' | 'deploy' | 'locked' | 'vip';

export interface GridPoint {
  col: number;
  row: number;
}

export interface DuelLane {
  owner: SideOwner;
  waypoints: GridPoint[];
  barricadeCell: GridPoint;
  vipCell: GridPoint;
}

export type MapTheme = 'pass' | 'river' | 'fleet';

export interface StageDef {
  id: string;
  index: number;
  theme: MapTheme;
  cols: number; // 8
  rows: number; // 10 (rows 0..4 = AI Top Half, rows 5..9 = Player Bottom Half)
  dividerRow: number; // 5 (horizontal Great Wall between row 4 and row 5)
  layout: string[];
  aiLane: DuelLane;
  playerLane: DuelLane;
}

export type EnemyKind = 'grunt' | 'wolf' | 'shield' | 'lubu';

export interface MetaUpgradeLevels {
  hearts: number;
  granary: number;
  might: number;
  decree: number;
  shovels: number;
}

export interface SaveData {
  lang?: Lang;
  commanderLevel: number;
  commanderXp: number;
  gold: number;
  upgrades: MetaUpgradeLevels;
  clearedStages: string[];
  endlessBestWave: Record<string, number>;
  totalRuns: number;
  freeHeroScrollUsed: boolean;
}

export interface ActiveSynergyInfo {
  id: 'vanguard' | 'marksman' | 'mystic' | 'dragon_guard';
  count: number;
  tier: 0 | 1 | 2;
}

export interface RunSummary {
  stageId: string;
  mode: GameMode;
  wave: number;
  kills: number;
  merges: number;
  victory: boolean;
  aiDefeated: boolean;
}
