export type Lang = 'en' | 'zh';

export type GameMode = 'standard' | 'endless';

export type AdPlacement =
  | 'revive_guardian'
  | 'free_rations_supply'
  | 'bonus_shovels'
  | 'hero_scroll_summon'
  | 'settlement_multiplier';

export type UnitId =
  | 'blade'
  | 'archer'
  | 'lancer'
  | 'mortar'
  | 'frostbow'
  | 'zhaoyun'
  | 'guanyu'
  | 'zhangfei'
  | 'zhenji'
  | 'zhuge'
  | 'shangxiang';

export type SynergyTag = 'vanguard' | 'marksman' | 'mystic';

export type AttackPattern =
  | 'cleave'
  | 'arrow'
  | 'pierce_lance'
  | 'mortar_aoe'
  | 'frost_bolt'
  | 'dragon_sweep'
  | 'jade_execute'
  | 'roar_quake'
  | 'lotus_blizzard'
  | 'chain_lightning'
  | 'phoenix_volley';

export interface UnitDef {
  id: UnitId;
  isHero: boolean;
  spriteKey: string;
  accentColor: string;
  tileBgTop: string;
  tileBgBottom: string;
  synergy: SynergyTag;
  pattern: AttackPattern;
  baseDamage: number;
  attackInterval: number; // seconds between attacks at Tier 1
  rangeCells: number; // range in grid cell units
  projectileSpeed: number;
  aoeRadiusCells?: number;
  slowFactor?: number;
  slowDuration?: number;
  stunDuration?: number;
  skillEveryN?: number; // Hero signature burst every Nth attack
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

export type CellType = 'void' | 'wall' | 'path' | 'deploy' | 'locked' | 'vip';

export interface GridPoint {
  col: number;
  row: number;
}

export interface PathLane {
  id: string;
  waypoints: GridPoint[]; // grid coordinates from spawn -> barricade -> vip
  barricadeCell: GridPoint;
  vipCell: GridPoint;
  entryDir: 'down' | 'up' | 'right' | 'left';
}

export type MapTheme = 'pass' | 'river' | 'fleet';

export interface StageDef {
  id: string;
  index: number;
  theme: MapTheme;
  cols: number;
  rows: number;
  /**
   * Legend:
   * '#' = wall (dark parapet)
   * '.' = outer border ground / road edge
   * 'P' = enemy marching path
   * 'D' = unlocked white jade deploy cell
   * 'L' = locked dark slate cell (unlockable via Golden Shovel)
   * 'V' = Protected Young Lord cradle cell
   */
  layout: string[];
  lanes: PathLane[];
}

export type EnemyKind = 'grunt' | 'wolf' | 'shield' | 'shaman' | 'ram' | 'lubu';

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
  tier: 0 | 1 | 2; // 0 = inactive, 1 = bronze/silver, 2 = gold
}

export interface RunSummary {
  stageId: string;
  mode: GameMode;
  wave: number;
  kills: number;
  merges: number;
  victory: boolean;
}
