import {
  ActiveSynergyInfo,
  HeroKey,
  RangeShape,
  SynergyTag,
  TileUnit,
  TroopKey,
  UnitDef,
  UnitId,
} from '../types';

export const TROOP_KEYS: TroopKey[] = ['blade', 'spear', 'lancer', 'archer', 'mortar'];
export const HERO_KEYS: HeroKey[] = [
  'zhaoyun',
  'guanyu',
  'zhangfei',
  'zhuge',
  'zhenji',
  'shangxiang',
];

/** 5 Classic Rarity Ranks: 1(White) -> 2(Green) -> 3(Blue) -> 4(Purple) -> 5(Orange/Gold) */
export const MAX_TILE_TIER = 5;

/** Awakened Generals level up in battle from Lv.1 to Lv.12 via attack & kill XP! */
export const MAX_HERO_COMBAT_LEVEL = 12;

interface HeroThemeSpec {
  accent: string;
  frame: string;
  crest: string;
  synergy: SynergyTag;
  rangeShape: RangeShape;
  pattern: UnitDef['pattern'];
  awakenedDamage: number;
  interval: number;
  range: number;
  projSpeed: number;
  aoe?: number;
  slow?: number;
  slowDur?: number;
  stunDur?: number;
  skillEveryN: number;
}

const HERO_SPECS: Record<HeroKey, HeroThemeSpec> = {
  zhaoyun: {
    accent: '#2c7da0',
    frame: '#1d5b79',
    crest: '◈',
    synergy: 'vanguard',
    rangeShape: 'hero_melee_2',
    pattern: 'dragon_boomerang',
    awakenedDamage: 68,
    interval: 0.86,
    range: 2.65,
    projSpeed: 10.6,
    aoe: 0.65,
    skillEveryN: 4,
  },
  guanyu: {
    accent: '#2d6a4f',
    frame: '#1b4332',
    crest: '☾',
    synergy: 'vanguard',
    rangeShape: 'hero_melee_2',
    pattern: 'crescent_execute',
    awakenedDamage: 124,
    interval: 1.25,
    range: 2.5,
    projSpeed: 8.4,
    aoe: 1.05,
    skillEveryN: 3,
  },
  zhangfei: {
    accent: '#b5451b',
    frame: '#7f2b0a',
    crest: '❖',
    synergy: 'vanguard',
    rangeShape: 'hero_melee_2',
    pattern: 'roar_quake',
    awakenedDamage: 74,
    interval: 1.04,
    range: 2.45,
    projSpeed: 0,
    aoe: 2.35,
    stunDur: 1.25,
    skillEveryN: 4,
  },
  zhuge: {
    accent: '#b08928',
    frame: '#785914',
    crest: '☯',
    synergy: 'mystic',
    rangeShape: 'hero_caster_3',
    pattern: 'chain_lightning',
    awakenedDamage: 72,
    interval: 1.05,
    range: 3.55,
    projSpeed: 14.0,
    aoe: 1.45,
    skillEveryN: 3,
  },
  zhenji: {
    accent: '#2b6cb0',
    frame: '#1e4e8c',
    crest: '✻',
    synergy: 'mystic',
    rangeShape: 'hero_caster_3',
    pattern: 'frost_vortex',
    awakenedDamage: 56,
    interval: 1.02,
    range: 3.45,
    projSpeed: 9.2,
    aoe: 1.5,
    slow: 0.52,
    slowDur: 2.6,
    stunDur: 1.1,
    skillEveryN: 4,
  },
  shangxiang: {
    accent: '#a42424',
    frame: '#7a1818',
    crest: '✦',
    synergy: 'marksman',
    rangeShape: 'hero_global_4',
    pattern: 'phoenix_multishot',
    awakenedDamage: 52,
    interval: 0.72,
    range: 4.35,
    projSpeed: 13.0,
    aoe: 1.45,
    skillEveryN: 4,
  },
};

function buildUnitRegistry(): Record<UnitId, UnitDef> {
  const reg: Partial<Record<UnitId, UnitDef>> = {
    // Bench Tool Tile: Golden Shovel (randomly spawned in the 5 bench slots!)
    shovel: {
      id: 'shovel',
      category: 'item',
      cellSpan: 1,
      spriteKey: 'icon_shovel',
      accentColor: '#d97706',
      frameColor: '#92400e',
      crestSymbol: '',
      synergy: 'none',
      rangeShape: 'none',
      pattern: 'none',
      baseDamage: 0,
      attackInterval: 99,
      minRangeCells: 0,
      rangeCells: 0,
      projectileSpeed: 0,
    },

    // 1. 刀兵: STRICTLY SINGLE-TARGET! Massive heavy chop + armor shred every 4th hit!
    blade: {
      id: 'blade',
      category: 'troop',
      cellSpan: 1,
      spriteKey: 'unit_blade',
      accentColor: '#9e2a2b',
      frameColor: '#5c4b3c',
      crestSymbol: '',
      synergy: 'vanguard',
      rangeShape: 'melee_1',
      pattern: 'single_chop',
      baseDamage: 80,
      attackInterval: 0.88,
      minRangeCells: 0,
      rangeCells: 1.48,
      projectileSpeed: 0,
      skillEveryN: 4,
    },

    // 2. 枪兵: STRAIGHT-LINE PIERCE! Pierces 5+ foes in a line (+15% dmg per pierced foe)!
    spear: {
      id: 'spear',
      category: 'troop',
      cellSpan: 1,
      spriteKey: 'unit_spear',
      accentColor: '#b91c1c',
      frameColor: '#5c4b3c',
      crestSymbol: '',
      synergy: 'vanguard',
      rangeShape: 'spear_line_2',
      pattern: 'pierce_lance',
      baseDamage: 34,
      attackInterval: 0.86,
      minRangeCells: 0,
      rangeCells: 2.18,
      projectileSpeed: 12.0,
    },

    // 3. 骑兵: AREA-OF-EFFECT SWEEP! Wide halberd trample splashing enemy packs!
    lancer: {
      id: 'lancer',
      category: 'troop',
      cellSpan: 1,
      spriteKey: 'unit_lancer',
      accentColor: '#2b5b6c',
      frameColor: '#5c4b3c',
      crestSymbol: '',
      synergy: 'vanguard',
      rangeShape: 'cavalry_2',
      pattern: 'cavalry_aoe',
      baseDamage: 27,
      attackInterval: 0.8,
      minRangeCells: 0,
      rangeCells: 2.35,
      projectileSpeed: 0,
      aoeRadiusCells: 1.28,
      slowFactor: 0.28,
      slowDuration: 0.35,
    },

    // 4. 弓兵: LONG-RANGE SINGLE-TARGET FOCUS! Homing arrows stacking +14% consecutive hit mark!
    archer: {
      id: 'archer',
      category: 'troop',
      cellSpan: 1,
      spriteKey: 'unit_archer',
      accentColor: '#386641',
      frameColor: '#5c4b3c',
      crestSymbol: '',
      synergy: 'marksman',
      rangeShape: 'archer_3',
      pattern: 'focus_arrow',
      baseDamage: 24,
      attackInterval: 0.56,
      minRangeCells: 0,
      rangeCells: 3.45,
      projectileSpeed: 13.2,
    },

    // 5. 神威炮: PARABOLIC SIEGE AoE + BLINDSPOT! Ignores 75% armor & leaves burning embers!
    mortar: {
      id: 'mortar',
      category: 'troop',
      cellSpan: 1,
      spriteKey: 'unit_mortar',
      accentColor: '#7f4f24',
      frameColor: '#5c4b3c',
      crestSymbol: '',
      synergy: 'mystic',
      rangeShape: 'mortar_ring_3',
      pattern: 'mortar_siege',
      baseDamage: 56,
      attackInterval: 1.55,
      minRangeCells: 1.2,
      rangeCells: 3.6,
      projectileSpeed: 7.4,
      aoeRadiusCells: 1.45,
    },
  };

  for (const h of HERO_KEYS) {
    const sp = HERO_SPECS[h];
    const s1: UnitId = `shard1_${h}`;
    const s2: UnitId = `shard2_${h}`;
    const heroId: UnitId = `hero_${h}`;

    // Hero Puzzle Piece I (Left Half 1/2 — 1 cell, CANNOT attack until fused with Piece II!)
    reg[s1] = {
      id: s1,
      category: 'shard1',
      cellSpan: 1,
      heroKey: h,
      spriteKey: `soul_${h}`,
      accentColor: sp.accent,
      frameColor: sp.frame,
      crestSymbol: sp.crest,
      synergy: 'none',
      rangeShape: 'none',
      pattern: 'none',
      baseDamage: 0,
      attackInterval: 99,
      minRangeCells: 0,
      rangeCells: 0,
      projectileSpeed: 0,
    };

    // Hero Puzzle Piece II (Right Half 2/2 — 1 cell, CANNOT attack until fused with Piece I!)
    reg[s2] = {
      id: s2,
      category: 'shard2',
      cellSpan: 1,
      heroKey: h,
      spriteKey: `crest_${h}`,
      accentColor: sp.accent,
      frameColor: sp.frame,
      crestSymbol: sp.crest,
      synergy: 'none',
      rangeShape: 'none',
      pattern: 'none',
      baseDamage: 0,
      attackInterval: 99,
      minRangeCells: 0,
      rangeCells: 0,
      projectileSpeed: 0,
    };

    // Awakened Legendary General (Occupies 2 Adjacent Board Cells! Levels up via Combat XP!)
    reg[heroId] = {
      id: heroId,
      category: 'awakened',
      cellSpan: 2,
      heroKey: h,
      spriteKey: `hero_${h}`,
      accentColor: sp.accent,
      frameColor: '#c59b27',
      crestSymbol: sp.crest,
      synergy: sp.synergy,
      rangeShape: sp.rangeShape,
      pattern: sp.pattern,
      baseDamage: sp.awakenedDamage,
      attackInterval: sp.interval,
      minRangeCells: 0,
      rangeCells: sp.range,
      projectileSpeed: sp.projSpeed,
      aoeRadiusCells: sp.aoe,
      slowFactor: sp.slow,
      slowDuration: sp.slowDur,
      stunDuration: sp.stunDur,
      skillEveryN: sp.skillEveryN,
    };
  }

  return reg as Record<UnitId, UnitDef>;
}

export const UNITS: Record<UnitId, UnitDef> = buildUnitRegistry();

/**
 * Circular Attack Range Evaluator (in board cell units):
 * - Puzzle pieces ('shard1' / 'shard2') and tools ('item') have canAttack = false & maxR = 0.
 * - Troops gain slight range expansion with merge tier; Awakened Generals gain range with Combat Level!
 */
export function getUnitCircleRange(unit: TileUnit): {
  canAttack: boolean;
  minR: number;
  maxR: number;
} {
  const def = UNITS[unit.unitId];
  if (def.category === 'shard1' || def.category === 'shard2' || def.category === 'item') {
    return { canAttack: false, minR: 0, maxR: 0 };
  }
  const tierBonus = (unit.tier - 1) * 0.08;
  const heroLvlBonus = def.category === 'awakened' ? (unit.combatLevel - 1) * 0.08 : 0;
  return {
    canAttack: true,
    minR: def.minRangeCells,
    maxR: def.rangeCells + tierBonus + heroLvlBonus,
  };
}

export function getHeroXpForNextLevel(combatLevel: number): number {
  return 35 + (combatLevel - 1) * 28;
}

export function getCombatLevelDamageMult(combatLevel: number): number {
  return 1 + (combatLevel - 1) * 0.18;
}

export function getCombatLevelSpeedMult(combatLevel: number): number {
  return 1 + (combatLevel - 1) * 0.055;
}

/**
 * Checks if two tiles can combine:
 * 1) 'awaken': Matching Hero Puzzle Piece I + Hero Puzzle Piece II -> Awakened General!
 * 2) 'merge': Identical UnitId (except 'shovel') + Identical Tier (< MAX_TILE_TIER) -> Tier + 1!
 */
export function checkTileCombine(
  a: TileUnit,
  b: TileUnit
): { mode: 'awaken' | 'merge'; resultId: UnitId; resultTier: number } | null {
  if (a.uid === b.uid) return null;

  const defA = UNITS[a.unitId];
  const defB = UNITS[b.unitId];

  if (defA.category === 'item' || defB.category === 'item') {
    return null;
  }

  if (
    defA.heroKey &&
    defA.heroKey === defB.heroKey &&
    ((defA.category === 'shard1' && defB.category === 'shard2') ||
      (defA.category === 'shard2' && defB.category === 'shard1'))
  ) {
    const heroId: UnitId = `hero_${defA.heroKey}`;
    const fusedTier = Math.min(MAX_TILE_TIER, Math.max(a.tier, b.tier));
    return { mode: 'awaken', resultId: heroId, resultTier: fusedTier };
  }

  if (a.unitId === b.unitId && a.tier === b.tier && a.tier < MAX_TILE_TIER) {
    return { mode: 'merge', resultId: a.unitId, resultTier: a.tier + 1 };
  }

  return null;
}

export function getTierDamageMultiplier(tier: number): number {
  return Math.pow(1.85, tier - 1);
}

export function getTierSpeedMultiplier(tier: number): number {
  return 1 + (tier - 1) * 0.13;
}

export function computeSynergies(boardUnits: (TileUnit | null)[]): {
  list: ActiveSynergyInfo[];
  globalDmgMult: number;
  globalAspdMult: number;
  mysticPowerMult: number;
  heroSkillFaster: boolean;
  critChance: number;
} {
  const seenUids = new Set<number>();
  const uniqueTypes = new Set<string>();
  const uniqueAwakenedHeroes = new Set<HeroKey>();

  for (const u of boardUnits) {
    if (!u || seenUids.has(u.uid)) continue;
    seenUids.add(u.uid);
    const def = UNITS[u.unitId];
    if (def.category === 'shard1' || def.category === 'shard2' || def.category === 'item') continue;
    uniqueTypes.add(def.heroKey || def.id);
    if (def.category === 'awakened' && def.heroKey) {
      uniqueAwakenedHeroes.add(def.heroKey);
    }
  }

  let vanguardCount = 0;
  let marksmanCount = 0;
  let mysticCount = 0;

  uniqueTypes.forEach((key) => {
    const sampleId = (HERO_KEYS.includes(key as HeroKey) ? `hero_${key}` : key) as UnitId;
    const tag = UNITS[sampleId].synergy;
    if (tag === 'vanguard') vanguardCount++;
    else if (tag === 'marksman') marksmanCount++;
    else if (tag === 'mystic') mysticCount++;
  });

  const heroCount = uniqueAwakenedHeroes.size;
  const vTier: 0 | 1 | 2 = vanguardCount >= 4 ? 2 : vanguardCount >= 2 ? 1 : 0;
  const mTier: 0 | 1 | 2 = marksmanCount >= 3 ? 2 : marksmanCount >= 2 ? 1 : 0;
  const sTier: 0 | 1 | 2 = mysticCount >= 3 ? 2 : mysticCount >= 2 ? 1 : 0;
  const dTier: 0 | 1 | 2 = heroCount >= 3 ? 2 : heroCount >= 2 ? 1 : 0;

  return {
    list: [
      { id: 'vanguard', count: vanguardCount, tier: vTier },
      { id: 'marksman', count: marksmanCount, tier: mTier },
      { id: 'mystic', count: mysticCount, tier: sTier },
      { id: 'dragon_guard', count: heroCount, tier: dTier },
    ],
    globalDmgMult: 1 + (vTier === 2 ? 0.36 : vTier === 1 ? 0.16 : 0),
    globalAspdMult: 1 + (mTier === 2 ? 0.38 : mTier === 1 ? 0.18 : 0),
    mysticPowerMult: 1 + (sTier === 2 ? 0.55 : sTier === 1 ? 0.25 : 0),
    heroSkillFaster: dTier >= 1,
    critChance: 0.06 + (dTier === 2 ? 0.22 : dTier === 1 ? 0.14 : 0),
  };
}
