import {
  ActiveSynergyInfo,
  GridPoint,
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
    pattern: 'dragon_sweep',
    awakenedDamage: 74,
    interval: 0.72,
    range: 2.35,
    projSpeed: 11.8,
    aoe: 1.65,
    skillEveryN: 4,
  },
  guanyu: {
    accent: '#2d6a4f',
    frame: '#1b4332',
    crest: '☾',
    synergy: 'vanguard',
    rangeShape: 'hero_melee_2',
    pattern: 'jade_execute',
    awakenedDamage: 102,
    interval: 1.08,
    range: 2.25,
    projSpeed: 9.6,
    aoe: 1.6,
    skillEveryN: 3,
  },
  zhangfei: {
    accent: '#b5451b',
    frame: '#7f2b0a',
    crest: '❖',
    synergy: 'vanguard',
    rangeShape: 'hero_melee_2',
    pattern: 'roar_quake',
    awakenedDamage: 76,
    interval: 0.96,
    range: 2.2,
    projSpeed: 0,
    aoe: 2.15,
    stunDur: 1.15,
    skillEveryN: 4,
  },
  zhuge: {
    accent: '#b08928',
    frame: '#785914',
    crest: '☯',
    synergy: 'mystic',
    rangeShape: 'hero_caster_3',
    pattern: 'chain_lightning',
    awakenedDamage: 68,
    interval: 1.02,
    range: 3.4,
    projSpeed: 14.0,
    skillEveryN: 3,
  },
  zhenji: {
    accent: '#2b6cb0',
    frame: '#1e4e8c',
    crest: '✻',
    synergy: 'mystic',
    rangeShape: 'hero_caster_3',
    pattern: 'lotus_blizzard',
    awakenedDamage: 58,
    interval: 0.94,
    range: 3.3,
    projSpeed: 9.2,
    aoe: 1.55,
    slow: 0.5,
    slowDur: 2.6,
    stunDur: 0.9,
    skillEveryN: 4,
  },
  shangxiang: {
    accent: '#a42424',
    frame: '#7a1818',
    crest: '✦',
    synergy: 'marksman',
    rangeShape: 'hero_global_4',
    pattern: 'phoenix_volley',
    awakenedDamage: 52,
    interval: 0.65,
    range: 4.5,
    projSpeed: 12.8,
    skillEveryN: 4,
  },
};

function buildUnitRegistry(): Record<UnitId, UnitDef> {
  const reg: Partial<Record<UnitId, UnitDef>> = {
    // 1. 刀兵: Highest base cleave damage, STRICT 1-cell adjacent (3x3) melee range!
    blade: {
      id: 'blade',
      category: 'troop',
      spriteKey: 'unit_blade',
      accentColor: '#9e2a2b',
      frameColor: '#5c4b3c',
      crestSymbol: '',
      synergy: 'vanguard',
      rangeShape: 'melee_1',
      pattern: 'cleave',
      baseDamage: 56,
      attackInterval: 0.88,
      minRangeCells: 0,
      rangeCells: 1.42,
      projectileSpeed: 0,
      aoeRadiusCells: 1.35,
    },

    // 2. 枪兵: Straight 2-cell cross corridors + multi-target line pierce!
    spear: {
      id: 'spear',
      category: 'troop',
      spriteKey: 'unit_spear',
      accentColor: '#b91c1c',
      frameColor: '#5c4b3c',
      crestSymbol: '',
      synergy: 'vanguard',
      rangeShape: 'spear_line_2',
      pattern: 'pierce_lance',
      baseDamage: 34,
      attackInterval: 0.82,
      minRangeCells: 0,
      rangeCells: 2.45,
      projectileSpeed: 11.2,
    },

    // 3. 骑兵: Agile 2-cell diamond zone, fast tempo wave clearer!
    lancer: {
      id: 'lancer',
      category: 'troop',
      spriteKey: 'unit_lancer',
      accentColor: '#2b5b6c',
      frameColor: '#5c4b3c',
      crestSymbol: '',
      synergy: 'vanguard',
      rangeShape: 'cavalry_2',
      pattern: 'cavalry_slash',
      baseDamage: 31,
      attackInterval: 0.68,
      minRangeCells: 0,
      rangeCells: 2.25,
      projectileSpeed: 10.5,
    },

    // 4. 弓兵: Deep inner-core 3-cell (7x7) long-range single-target Boss sniper!
    archer: {
      id: 'archer',
      category: 'troop',
      spriteKey: 'unit_archer',
      accentColor: '#386641',
      frameColor: '#5c4b3c',
      crestSymbol: '',
      synergy: 'marksman',
      rangeShape: 'archer_3',
      pattern: 'arrow',
      baseDamage: 24,
      attackInterval: 0.58,
      minRangeCells: 0,
      rangeCells: 3.45,
      projectileSpeed: 12.2,
    },

    // 5. 神威炮: Siege ring (2..3 cells away, 1-cell melee blindspot!), heavy armor-piercing AoE!
    mortar: {
      id: 'mortar',
      category: 'troop',
      spriteKey: 'unit_mortar',
      accentColor: '#7f4f24',
      frameColor: '#5c4b3c',
      crestSymbol: '',
      synergy: 'mystic',
      rangeShape: 'mortar_ring_3',
      pattern: 'mortar_aoe',
      baseDamage: 48,
      attackInterval: 1.42,
      minRangeCells: 1.45,
      rangeCells: 3.35,
      projectileSpeed: 7.8,
      aoeRadiusCells: 1.35,
    },
  };

  for (const h of HERO_KEYS) {
    const sp = HERO_SPECS[h];
    const s1: UnitId = `shard1_${h}`;
    const s2: UnitId = `shard2_${h}`;
    const heroId: UnitId = `hero_${h}`;

    // Hero Shard I (Left Portrait Tally ◐ — needs Shard II ◑ to summon Hero!)
    reg[s1] = {
      id: s1,
      category: 'shard1',
      heroKey: h,
      spriteKey: `soul_${h}`,
      accentColor: sp.accent,
      frameColor: sp.frame,
      crestSymbol: sp.crest,
      synergy: sp.synergy,
      rangeShape: 'shard_sentry',
      pattern: 'spirit_strike',
      baseDamage: 14,
      attackInterval: 1.25,
      minRangeCells: 0,
      rangeCells: 1.5,
      projectileSpeed: 9.5,
    };

    // Hero Shard II (Right Totem Crest Tally ◑ — needs Shard I ◐ to summon Hero!)
    reg[s2] = {
      id: s2,
      category: 'shard2',
      heroKey: h,
      spriteKey: `crest_${h}`,
      accentColor: sp.accent,
      frameColor: sp.frame,
      crestSymbol: sp.crest,
      synergy: sp.synergy,
      rangeShape: 'shard_sentry',
      pattern: 'spirit_strike',
      baseDamage: 14,
      attackInterval: 1.25,
      minRangeCells: 0,
      rangeCells: 1.5,
      projectileSpeed: 9.5,
    };

    // Full Awakened Legendary General (Shard I + Shard II -> Hero!)
    reg[heroId] = {
      id: heroId,
      category: 'awakened',
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
 * Exact Grid-Cell Range Evaluator:
 * Used BOTH to highlight exact targetable tiles on the 8x10 board AND to validate enemy targeting!
 */
export function isCellInUnitRange(
  def: UnitDef,
  tier: number,
  uCol: number,
  uRow: number,
  tCol: number,
  tRow: number
): boolean {
  const dc = Math.abs(tCol - uCol);
  const dr = Math.abs(tRow - uRow);
  const cheb = Math.max(dc, dr);
  const manh = dc + dr;

  switch (def.rangeShape) {
    case 'melee_1':
      // Strict 3x3 adjacent cells; Tier 4+ unlocks orthogonal 2-cell reach
      if (cheb <= 1) return true;
      if (tier >= 4 && ((dc === 0 && dr <= 2) || (dr === 0 && dc <= 2))) return true;
      return false;

    case 'spear_line_2': {
      // Straight cross corridors (2 cells, 3 cells at Tier 3+) + adjacent 3x3
      const maxLine = tier >= 3 ? 3 : 2;
      return (dc === 0 && dr <= maxLine) || (dr === 0 && dc <= maxLine) || cheb <= 1;
    }

    case 'cavalry_2':
      // Agile 2-cell rounded diamond around unit
      return cheb <= 2 && manh <= (tier >= 4 ? 4 : 3);

    case 'archer_3':
      // Long 3-cell (7x7) inner-core coverage (4 cells orthogonal at Tier 5)
      if (cheb <= 3) return true;
      if (tier >= 5 && ((dc === 0 && dr <= 4) || (dr === 0 && dc <= 4))) return true;
      return false;

    case 'mortar_ring_3':
      // 1-cell melee blindspot! Shells 2..3 cells away
      return cheb >= 2 && cheb <= 3;

    case 'shard_sentry':
      return cheb <= 1;

    case 'hero_melee_2':
      return cheb <= 2;

    case 'hero_caster_3':
      return cheb <= 3;

    case 'hero_global_4':
      return cheb <= 5;
  }
}

export function getTargetableGridCells(
  def: UnitDef,
  tier: number,
  uCol: number,
  uRow: number,
  cols: number,
  rStart: number,
  rEnd: number
): GridPoint[] {
  const out: GridPoint[] = [];
  for (let r = rStart; r < rEnd; r++) {
    for (let c = 0; c < cols; c++) {
      if (c === uCol && r === uRow) continue;
      if (isCellInUnitRange(def, tier, uCol, uRow, c, r)) {
        out.push({ col: c, row: r });
      }
    }
  }
  return out;
}

/**
 * Checks if two tiles can combine:
 * 1) 'awaken': Matching Hero Shard I (◐) + Hero Shard II (◑) -> Awakened General!
 * 2) 'merge': Identical UnitId + Identical Tier (< MAX_TILE_TIER) -> Tier + 1!
 */
export function checkTileCombine(
  a: TileUnit,
  b: TileUnit
): { mode: 'awaken' | 'merge'; resultId: UnitId; resultTier: number } | null {
  if (a.uid === b.uid) return null;

  const defA = UNITS[a.unitId];
  const defB = UNITS[b.unitId];

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
  const uniqueTypes = new Set<string>();
  const uniqueAwakenedHeroes = new Set<HeroKey>();

  for (const u of boardUnits) {
    if (!u) continue;
    const def = UNITS[u.unitId];
    if (def.category === 'shard1' || def.category === 'shard2') continue;
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
