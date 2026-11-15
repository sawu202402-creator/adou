import { ActiveSynergyInfo, TileUnit, UnitDef, UnitId } from '../types';

export const TROOP_IDS: UnitId[] = ['blade', 'archer', 'lancer', 'mortar', 'frostbow'];
export const HERO_IDS: UnitId[] = ['zhaoyun', 'guanyu', 'zhangfei', 'zhenji', 'zhuge', 'shangxiang'];
export const ALL_UNIT_IDS: UnitId[] = [...TROOP_IDS, ...HERO_IDS];

export const UNITS: Record<UnitId, UnitDef> = {
  // ==================== 5 BASE TROOPS (IVORY WAR-TILES) ====================
  blade: {
    id: 'blade',
    isHero: false,
    spriteKey: 'unit_blade',
    accentColor: '#dc2626',
    tileBgTop: '#fffdf9',
    tileBgBottom: '#e7e0d2',
    synergy: 'vanguard',
    pattern: 'cleave',
    baseDamage: 26,
    attackInterval: 0.92,
    rangeCells: 2.15,
    projectileSpeed: 0,
    aoeRadiusCells: 1.45,
  },
  archer: {
    id: 'archer',
    isHero: false,
    spriteKey: 'unit_archer',
    accentColor: '#16a34a',
    tileBgTop: '#fffdf9',
    tileBgBottom: '#e7e0d2',
    synergy: 'marksman',
    pattern: 'arrow',
    baseDamage: 21,
    attackInterval: 0.62,
    rangeCells: 3.45,
    projectileSpeed: 11.5,
  },
  lancer: {
    id: 'lancer',
    isHero: false,
    spriteKey: 'unit_lancer',
    accentColor: '#2563eb',
    tileBgTop: '#fffdf9',
    tileBgBottom: '#e7e0d2',
    synergy: 'vanguard',
    pattern: 'pierce_lance',
    baseDamage: 30,
    attackInterval: 1.08,
    rangeCells: 2.85,
    projectileSpeed: 9.5,
  },
  mortar: {
    id: 'mortar',
    isHero: false,
    spriteKey: 'unit_mortar',
    accentColor: '#9333ea',
    tileBgTop: '#fffdf9',
    tileBgBottom: '#e7e0d2',
    synergy: 'mystic',
    pattern: 'mortar_aoe',
    baseDamage: 40,
    attackInterval: 1.48,
    rangeCells: 3.25,
    projectileSpeed: 7.4,
    aoeRadiusCells: 1.35,
  },
  frostbow: {
    id: 'frostbow',
    isHero: false,
    spriteKey: 'unit_frostbow',
    accentColor: '#0891b2',
    tileBgTop: '#fffdf9',
    tileBgBottom: '#e7e0d2',
    synergy: 'marksman',
    pattern: 'frost_bolt',
    baseDamage: 18,
    attackInterval: 0.86,
    rangeCells: 3.15,
    projectileSpeed: 10.2,
    slowFactor: 0.42,
    slowDuration: 2.2,
  },

  // ==================== 6 LEGENDARY DYNASTY HEROES (GILDED JADE TILES) ====================
  zhaoyun: {
    id: 'zhaoyun',
    isHero: true,
    spriteKey: 'hero_zhaoyun',
    accentColor: '#0284c7',
    tileBgTop: '#fef9c3',
    tileBgBottom: '#fde047',
    synergy: 'vanguard',
    pattern: 'dragon_sweep',
    baseDamage: 46,
    attackInterval: 0.78,
    rangeCells: 2.65,
    projectileSpeed: 11.0,
    aoeRadiusCells: 1.65,
    skillEveryN: 4,
  },
  guanyu: {
    id: 'guanyu',
    isHero: true,
    spriteKey: 'hero_guanyu',
    accentColor: '#15803d',
    tileBgTop: '#fef9c3',
    tileBgBottom: '#fde047',
    synergy: 'vanguard',
    pattern: 'jade_execute',
    baseDamage: 68,
    attackInterval: 1.18,
    rangeCells: 2.45,
    projectileSpeed: 9.2,
    aoeRadiusCells: 1.6,
    skillEveryN: 3,
  },
  zhangfei: {
    id: 'zhangfei',
    isHero: true,
    spriteKey: 'hero_zhangfei',
    accentColor: '#c2410c',
    tileBgTop: '#fef9c3',
    tileBgBottom: '#fde047',
    synergy: 'vanguard',
    pattern: 'roar_quake',
    baseDamage: 48,
    attackInterval: 1.05,
    rangeCells: 2.35,
    projectileSpeed: 0,
    aoeRadiusCells: 2.1,
    stunDuration: 1.05,
    skillEveryN: 4,
  },
  zhenji: {
    id: 'zhenji',
    isHero: true,
    spriteKey: 'hero_zhenji',
    accentColor: '#0284c7',
    tileBgTop: '#fef9c3',
    tileBgBottom: '#fde047',
    synergy: 'mystic',
    pattern: 'lotus_blizzard',
    baseDamage: 38,
    attackInterval: 1.02,
    rangeCells: 3.35,
    projectileSpeed: 8.8,
    aoeRadiusCells: 1.5,
    slowFactor: 0.5,
    slowDuration: 2.6,
    stunDuration: 0.85,
    skillEveryN: 4,
  },
  zhuge: {
    id: 'zhuge',
    isHero: true,
    spriteKey: 'hero_zhuge',
    accentColor: '#ca8a04',
    tileBgTop: '#fef9c3',
    tileBgBottom: '#fde047',
    synergy: 'mystic',
    pattern: 'chain_lightning',
    baseDamage: 44,
    attackInterval: 1.12,
    rangeCells: 3.65,
    projectileSpeed: 14.0,
    skillEveryN: 3,
  },
  shangxiang: {
    id: 'shangxiang',
    isHero: true,
    spriteKey: 'hero_shangxiang',
    accentColor: '#dc2626',
    tileBgTop: '#fef9c3',
    tileBgBottom: '#fde047',
    synergy: 'marksman',
    pattern: 'phoenix_volley',
    baseDamage: 32,
    attackInterval: 0.68,
    rangeCells: 3.75,
    projectileSpeed: 12.2,
    skillEveryN: 4,
  },
};

export const MAX_TILE_TIER = 4;

export function getTierDamageMultiplier(tier: number): number {
  // Tier 1 = 1x, Tier 2 = 1.95x, Tier 3 = 3.7x, Tier 4 = 7.2x
  return Math.pow(1.93, tier - 1);
}

export function getTierSpeedMultiplier(tier: number): number {
  return 1 + (tier - 1) * 0.14;
}

export function getTierRangeBonus(tier: number): number {
  return (tier - 1) * 0.18;
}

export function computeSynergies(boardUnits: (TileUnit | null)[]): {
  list: ActiveSynergyInfo[];
  globalDmgMult: number;
  globalAspdMult: number;
  mysticPowerMult: number;
  heroSkillFaster: boolean;
  critChance: number;
} {
  const uniqueIds = new Set<UnitId>();
  const uniqueHeroes = new Set<UnitId>();

  for (const u of boardUnits) {
    if (!u) continue;
    uniqueIds.add(u.unitId);
    if (UNITS[u.unitId].isHero) {
      uniqueHeroes.add(u.unitId);
    }
  }

  let vanguardCount = 0;
  let marksmanCount = 0;
  let mysticCount = 0;

  uniqueIds.forEach((id) => {
    const tag = UNITS[id].synergy;
    if (tag === 'vanguard') vanguardCount++;
    else if (tag === 'marksman') marksmanCount++;
    else if (tag === 'mystic') mysticCount++;
  });

  const heroCount = uniqueHeroes.size;

  const vTier: 0 | 1 | 2 = vanguardCount >= 4 ? 2 : vanguardCount >= 2 ? 1 : 0;
  const mTier: 0 | 1 | 2 = marksmanCount >= 3 ? 2 : marksmanCount >= 2 ? 1 : 0;
  const sTier: 0 | 1 | 2 = mysticCount >= 3 ? 2 : mysticCount >= 2 ? 1 : 0;
  const dTier: 0 | 1 | 2 = heroCount >= 4 ? 2 : heroCount >= 3 ? 1 : 0;

  return {
    list: [
      { id: 'vanguard', count: vanguardCount, tier: vTier },
      { id: 'marksman', count: marksmanCount, tier: mTier },
      { id: 'mystic', count: mysticCount, tier: sTier },
      { id: 'dragon_guard', count: heroCount, tier: dTier },
    ],
    globalDmgMult: 1 + (vTier === 2 ? 0.35 : vTier === 1 ? 0.16 : 0),
    globalAspdMult: 1 + (mTier === 2 ? 0.38 : mTier === 1 ? 0.18 : 0),
    mysticPowerMult: 1 + (sTier === 2 ? 0.55 : sTier === 1 ? 0.25 : 0),
    heroSkillFaster: dTier >= 1,
    critChance: 0.06 + (dTier === 2 ? 0.22 : dTier === 1 ? 0.14 : 0),
  };
}
