export type Lang = 'en' | 'zh';

export type GameMode = 'standard' | 'endless';

export type AdPlacement =
  | 'revive_guardian'
  | 'free_rations_supply'
  | 'bonus_shovels'
  | 'hero_scroll_summon'
  | 'settlement_multiplier';

export type HeroKey = 'zhaoyun' | 'guanyu' | 'zhangfei' | 'zhuge' | 'zhenji' | 'shangxiang';
export type TroopKey = 'blade' | 'spear' | 'lancer' | 'archer' | 'mortar';
export type WeaponId = `weap_${HeroKey}`;

export type SkillId =
  | 'rank_up'
  | 'haste_scroll'
  | 'meteor_art'
  | 'tomb_raider'
  | 'exorcist_seal'
  | 'hero_decree'
  | 'granary_art'
  | 'frost_inkstone';

/**
 * Tile IDs on Board & Bench (Zero Hanzi):
 * - 5 Base Troops: 'blade' (刀) | 'spear' (枪) | 'lancer' (骑) | 'archer' (弓) | 'mortar' (炮)
 * - 6 Hero Shard I (Left Portrait Tally ◐): 'shard1_<hero>'
 * - 6 Hero Shard II (Right Totem Tally ◑): 'shard2_<hero>'
 * - 6 Awakened Generals (Fused I + II): 'hero_<hero>'
 */
export type UnitId =
  | TroopKey
  | `shard1_${HeroKey}`
  | `shard2_${HeroKey}`
  | `hero_${HeroKey}`;

export type TileCategory = 'troop' | 'shard1' | 'shard2' | 'awakened';

export type SynergyTag = 'vanguard' | 'marksman' | 'mystic';

/**
 * Grid-Cell Range Archetypes (faithful to 赵云与阿斗 tactical positioning):
 * - 'melee_1': Adjacent 3x3 cells only (Chebyshev <= 1) — high damage, must hug the road!
 * - 'spear_line_2': Straight/cross 2-cell corridors + line pierce!
 * - 'cavalry_2': Agile 2-cell diamond/square around unit!
 * - 'archer_3': Long 3-cell inner-core sniper coverage!
 * - 'mortar_ring_3': Siege 1.2..3.2 cell ring (1-cell melee blindspot, heavy AoE)!
 * - 'shard_sentry': 1.8-cell weak sentry while waiting for partner shard!
 * - 'hero_2' / 'hero_3' / 'hero_full': Hero-specific tactical grids!
 */
export type RangeShape =
  | 'melee_1'
  | 'spear_line_2'
  | 'cavalry_2'
  | 'archer_3'
  | 'mortar_ring_3'
  | 'shard_sentry'
  | 'hero_melee_2'
  | 'hero_caster_3'
  | 'hero_global_4';

export type AttackPattern =
  | 'cleave'
  | 'pierce_lance'
  | 'cavalry_slash'
  | 'arrow'
  | 'mortar_aoe'
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
  heroKey?: HeroKey;
  spriteKey: string;
  accentColor: string;
  frameColor: string;
  crestSymbol: string;
  synergy: SynergyTag;
  rangeShape: RangeShape;
  pattern: AttackPattern;
  baseDamage: number;
  attackInterval: number;
  minRangeCells: number;
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
  tier: number; // 1..5
  cooldown: number;
  attackCount: number;
  recoilTimer: number;
  recoilAngle: number;
  mergeAnimTimer: number;
  frenzyTimer: number; // boosted by 神兵符 / 攻速符
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
  rows: number; // 10
  dividerRow: number; // 5
  layout: string[];
  aiLane: DuelLane;
  playerLane: DuelLane;
  finalBoss: 'lubu' | 'zhangjiao';
}

export type EnemyKind = 'grunt' | 'wolf' | 'shield' | 'zhangjiao' | 'lubu';

export type BossArchetype = 'none' | 'zhangbao' | 'zhangjiao' | 'lubu';

export interface SaveData {
  lang?: Lang;
  commanderLevel: number;
  commanderXp: number;
  gold: number;
  skills: Record<SkillId, number>;
  weaponShards: Record<WeaponId, number>;
  weapons: Record<WeaponId, number>; // 0 = locked, 1..5 = star rank
  equippedWeapons: Partial<Record<HeroKey, WeaponId>>;
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
  droppedShards: WeaponId[];
}
