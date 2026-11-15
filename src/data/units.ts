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

export const TROOP_KEYS: TroopKey[] = ['blade', 'lancer', 'spear', 'archer', 'mortar'];
export const HERO_KEYS: HeroKey[] = [
  'zhaoyun',
  'guanyu',
  'zhangfei',
  'machao',
  'huangzhong',
  'lubu',
  'zhuge',
  'zhouyu',
  'zhenji',
  'diaochan',
  'shangxiang',
  'caocao',
];

/** 5 Classic Rarity Ranks: 1(White) -> 2(Green) -> 3(Blue) -> 4(Purple) -> 5(Orange/Gold) */
export const MAX_TILE_TIER = 5;

/** Awakened Generals level up in battle from Lv.1 to Lv.15 via combat XP & feeding extra hero shards! */
export const MAX_HERO_COMBAT_LEVEL = 15;

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
    awakenedDamage: 52,
    interval: 0.92,
    range: 2.2,
    projSpeed: 10.6,
    aoe: 0.62,
    skillEveryN: 4,
  },
  guanyu: {
    accent: '#2d6a4f',
    frame: '#1b4332',
    crest: '☾',
    synergy: 'vanguard',
    rangeShape: 'hero_melee_2',
    pattern: 'crescent_execute',
    awakenedDamage: 96,
    interval: 1.32,
    range: 2.05,
    projSpeed: 8.4,
    aoe: 0.98,
    skillEveryN: 3,
  },
  zhangfei: {
    accent: '#b5451b',
    frame: '#7f2b0a',
    crest: '❖',
    synergy: 'vanguard',
    rangeShape: 'hero_melee_2',
    pattern: 'roar_quake',
    awakenedDamage: 58,
    interval: 1.12,
    range: 1.95,
    projSpeed: 0,
    aoe: 1.95,
    stunDur: 1.1,
    skillEveryN: 4,
  },
  zhuge: {
    accent: '#b08928',
    frame: '#785914',
    crest: '☯',
    synergy: 'mystic',
    rangeShape: 'hero_caster_3',
    pattern: 'chain_lightning',
    awakenedDamage: 54,
    interval: 1.14,
    range: 3.05,
    projSpeed: 14.0,
    aoe: 1.32,
    skillEveryN: 3,
  },
  zhenji: {
    accent: '#2b6cb0',
    frame: '#1e4e8c',
    crest: '✻',
    synergy: 'mystic',
    rangeShape: 'hero_caster_3',
    pattern: 'frost_vortex',
    awakenedDamage: 42,
    interval: 1.08,
    range: 2.95,
    projSpeed: 9.2,
    aoe: 1.38,
    slow: 0.48,
    slowDur: 2.3,
    stunDur: 0.95,
    skillEveryN: 4,
  },
  shangxiang: {
    accent: '#a42424',
    frame: '#7a1818',
    crest: '✦',
    synergy: 'marksman',
    rangeShape: 'hero_global_4',
    pattern: 'phoenix_multishot',
    awakenedDamage: 38,
    interval: 0.78,
    range: 3.45,
    projSpeed: 13.0,
    aoe: 1.32,
    skillEveryN: 4,
  },
  machao: {
    accent: '#6d28d9',
    frame: '#4c1d95',
    crest: '⚡',
    synergy: 'vanguard',
    rangeShape: 'hero_melee_2',
    pattern: 'iron_stampede',
    awakenedDamage: 50,
    interval: 0.86,
    range: 2.45,
    projSpeed: 13.5,
    aoe: 0.75,
    slow: 0.36,
    slowDur: 1.25,
    skillEveryN: 4,
  },
  huangzhong: {
    accent: '#ca8a04',
    frame: '#854d0e',
    crest: '◎',
    synergy: 'marksman',
    rangeShape: 'hero_global_4',
    pattern: 'sun_snipe',
    awakenedDamage: 112,
    interval: 1.36,
    range: 4.15,
    projSpeed: 16.5,
    stunDur: 0.65,
    skillEveryN: 3,
  },
  lubu: {
    accent: '#9f1239',
    frame: '#6b0f2a',
    crest: '⚔',
    synergy: 'vanguard',
    rangeShape: 'hero_melee_2',
    pattern: 'halberd_cleave',
    awakenedDamage: 88,
    interval: 1.18,
    range: 2.15,
    projSpeed: 0,
    aoe: 1.35,
    skillEveryN: 3,
  },
  zhouyu: {
    accent: '#dc2626',
    frame: '#991b1b',
    crest: '✹',
    synergy: 'mystic',
    rangeShape: 'hero_caster_3',
    pattern: 'inferno_burn',
    awakenedDamage: 46,
    interval: 1.08,
    range: 3.15,
    projSpeed: 10.4,
    aoe: 1.22,
    skillEveryN: 3,
  },
  diaochan: {
    accent: '#db2777',
    frame: '#9d174d',
    crest: '✿',
    synergy: 'mystic',
    rangeShape: 'hero_caster_3',
    pattern: 'moon_charm',
    awakenedDamage: 40,
    interval: 0.92,
    range: 3.05,
    projSpeed: 11.2,
    slow: 0.38,
    slowDur: 2.0,
    skillEveryN: 3,
  },
  caocao: {
    accent: '#4338ca',
    frame: '#312e81',
    crest: '♛',
    synergy: 'marksman',
    rangeShape: 'hero_caster_3',
    pattern: 'imperial_decree',
    awakenedDamage: 44,
    interval: 1.0,
    range: 3.25,
    projSpeed: 13.8,
    aoe: 2.15,
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

    // 1. 刀兵 (Base 1.15R): STRICTLY SINGLE-TARGET! Adjacent melee heavy chop + armor shred!
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
      baseDamage: 54,
      attackInterval: 0.92,
      minRangeCells: 0,
      rangeCells: 1.15,
      projectileSpeed: 0,
      skillEveryN: 4,
    },

    // 2. 骑兵 (Blade + 0.5 = 1.65R): SHORT-REACH AoE SWEEP! Splashes tight clusters!
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
      baseDamage: 21,
      attackInterval: 0.85,
      minRangeCells: 0,
      rangeCells: 1.65,
      projectileSpeed: 0,
      aoeRadiusCells: 0.82,
      slowFactor: 0.25,
      slowDuration: 0.3,
    },

    // 3. 枪兵 (Lancer + 0.5 = 2.15R): STRAIGHT-LINE PIERCE! Pierces 5+ foes in a line!
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
      baseDamage: 25,
      attackInterval: 0.9,
      minRangeCells: 0,
      rangeCells: 2.15,
      projectileSpeed: 12.0,
    },

    // 4. 弓兵 (Spear + 1.0 = 3.15R): LONG-RANGE SINGLE-TARGET FOCUS! Homing arrows!
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
      baseDamage: 18,
      attackInterval: 0.6,
      minRangeCells: 0,
      rangeCells: 3.15,
      projectileSpeed: 13.2,
    },

    // 5. 神威炮 (Archer + 0.5 = 3.65R): PARABOLIC SIEGE AoE + 1.15R BLINDSPOT!
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
      baseDamage: 44,
      attackInterval: 1.65,
      minRangeCells: 1.15,
      rangeCells: 3.65,
      projectileSpeed: 7.4,
      aoeRadiusCells: 1.25,
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
  const heroLvlBonus = def.category === 'awakened' ? (unit.combatLevel - 1) * 0.035 : 0;
  return {
    canAttack: true,
    minR: def.minRangeCells,
    maxR: def.rangeCells + heroLvlBonus,
  };
}

export function getHeroXpForNextLevel(combatLevel: number): number {
  return 45 + (combatLevel - 1) * 36;
}

export function getCombatLevelDamageMult(combatLevel: number): number {
  return 1 + (combatLevel - 1) * 0.14;
}

export function getCombatLevelSpeedMult(combatLevel: number): number {
  return 1 + (combatLevel - 1) * 0.045;
}

/**
 * Checks if two tiles can combine:
 * 1) 'upgrade_hero': Feeding ANY matching shard ('shard1_X' or 'shard2_X') into an ALREADY-AWAKENED General ('hero_X') upgrades that General!
 * 2) 'awaken': Matching Hero Puzzle Piece I + Hero Puzzle Piece II -> Summons the UNIQUE 2-Cell Awakened General!
 * 3) 'merge': Identical Troop + Identical Tier (< MAX_TILE_TIER) -> Tier + 1!
 *    (Unfused shards have zero effect before synthesis and NEVER merge with identical shards; Generals are unique 1-per-hero!)
 */
export function checkTileCombine(
  a: TileUnit,
  b: TileUnit
): { mode: 'awaken' | 'merge' | 'upgrade_hero'; resultId: UnitId; resultTier: number } | null {
  if (a.uid === b.uid) return null;

  const defA = UNITS[a.unitId];
  const defB = UNITS[b.unitId];

  if (defA.category === 'item' || defB.category === 'item') {
    return null;
  }

  // After a General is synthesized, feeding ANY new shard of that General upgrades them!
  if (defA.heroKey && defA.heroKey === defB.heroKey) {
    const aIsHero = defA.category === 'awakened';
    const bIsHero = defB.category === 'awakened';
    const aIsShard = defA.category === 'shard1' || defA.category === 'shard2';
    const bIsShard = defB.category === 'shard1' || defB.category === 'shard2';
    if ((aIsHero && bIsShard) || (bIsHero && aIsShard)) {
      const heroTile = aIsHero ? a : b;
      if (heroTile.tier < MAX_TILE_TIER || heroTile.combatLevel < MAX_HERO_COMBAT_LEVEL) {
        return {
          mode: 'upgrade_hero',
          resultId: heroTile.unitId,
          resultTier: Math.min(MAX_TILE_TIER, heroTile.tier + 1),
        };
      }
      return null;
    }
  }

  // Synthesize [1/2] + [2/2] -> Unique 2-Cell Awakened General!
  if (
    defA.heroKey &&
    defA.heroKey === defB.heroKey &&
    ((defA.category === 'shard1' && defB.category === 'shard2') ||
      (defA.category === 'shard2' && defB.category === 'shard1'))
  ) {
    const heroId: UnitId = `hero_${defA.heroKey}`;
    return { mode: 'awaken', resultId: heroId, resultTier: 1 };
  }

  // Only standard troops merge with identical troops (shards do nothing before synthesis!)
  if (
    defA.category === 'troop' &&
    defB.category === 'troop' &&
    a.unitId === b.unitId &&
    a.tier === b.tier &&
    a.tier < MAX_TILE_TIER
  ) {
    return { mode: 'merge', resultId: a.unitId, resultTier: a.tier + 1 };
  }

  return null;
}

export function getTierDamageMultiplier(tier: number, isAwakened = false): number {
  if (isAwakened) {
    return 1 + (tier - 1) * 0.3;
  }
  return Math.pow(1.68, tier - 1);
}

export function getTierSpeedMultiplier(tier: number, isAwakened = false): number {
  return 1 + (tier - 1) * (isAwakened ? 0.06 : 0.1);
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
