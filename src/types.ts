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
 * Tile IDs on Board & 5-Slot Bench (Zero Hanzi):
 * - 5 Base Troops: 'blade' | 'spear' | 'lancer' | 'archer' | 'mortar'
 * - 1 Bench Tool Item: 'shovel' (Golden Shovel randomly rolled in the 5 bench slots!)
 * - 6 Hero Puzzle Piece I (Left Portrait Puzzle 1/2 — CANNOT attack until fused!): 'shard1_<hero>'
 * - 6 Hero Puzzle Piece II (Right Totem Puzzle 2/2 — CANNOT attack until fused!): 'shard2_<hero>'
 * - 6 Awakened Generals (Fused I + II — Attacks & gains XP/Levels from hits & kills!): 'hero_<hero>'
 */
export type UnitId =
  | TroopKey
  | 'shovel'
  | `shard1_${HeroKey}`
  | `shard2_${HeroKey}`
  | `hero_${HeroKey}`;

export type TileCategory = 'troop' | 'item' | 'shard1' | 'shard2' | 'awakened';

export type SynergyTag = 'vanguard' | 'marksman' | 'mystic' | 'none';

export type RangeShape =
  | 'none'
  | 'melee_1'
  | 'spear_line_2'
  | 'cavalry_2'
  | 'archer_3'
  | 'mortar_ring_3'
  | 'hero_melee_2'
  | 'hero_caster_3'
  | 'hero_global_4';

export type AttackPattern =
  | 'none'
  | 'single_chop'
  | 'pierce_lance'
  | 'cavalry_aoe'
  | 'focus_arrow'
  | 'mortar_siege'
  | 'dragon_boomerang'
  | 'crescent_execute'
  | 'roar_quake'
  | 'chain_lightning'
  | 'frost_vortex'
  | 'phoenix_multishot';

export interface UnitDef {
  id: UnitId;
  category: TileCategory;
  cellSpan: 1 | 2;
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
  tier: number; // 1..5 merge rarity tier
  cellSpan: 1 | 2; // 1 for troops/puzzle pieces, 2 for Awakened Generals (2x1 or 1x2)!
  anchorCol: number;
  anchorRow: number;
  secCol: number;
  secRow: number;
  combatLevel: number; // 1..12 combat XP level for Awakened Generals!
  xp: number;
  maxXp: number;
  levelUpAnimTimer: number;
  cooldown: number;
  attackCount: number;
  focusTargetId: number;
  focusStacks: number;
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
