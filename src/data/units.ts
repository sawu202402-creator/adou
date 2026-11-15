import {
  ActiveSynergyInfo,
  HeroKey,
  SynergyTag,
  TileUnit,
  TroopKey,
  UnitDef,
  UnitId,
} from '../types';

export const TROOP_KEYS: TroopKey[] = ['blade', 'archer', 'lancer', 'mortar', 'frostbow'];
export const HERO_KEYS: HeroKey[] = [
  'zhaoyun',
  'guanyu',
  'zhangfei',
  'zhuge',
  'zhenji',
  'shangxiang',
];

export const MAX_TILE_TIER = 4;

interface HeroThemeSpec {
  accent: string;
  frame: string;
  crest: string;
  synergy: SynergyTag;
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
    pattern: 'dragon_sweep',
    awakenedDamage: 68,
    interval: 0.74,
    range: 2.75,
    projSpeed: 11.2,
    aoe: 1.7,
    skillEveryN: 4,
  },
  guanyu: {
    accent: '#2d6a4f',
    frame: '#1b4332',
    crest: '☾',
    synergy: 'vanguard',
    pattern: 'jade_execute',
    awakenedDamage: 94,
    interval: 1.12,
    range: 2.55,
    projSpeed: 9.4,
    aoe: 1.65,
    skillEveryN: 3,
  },
  zhangfei: {
    accent: '#b5451b',
    frame: '#7f2b0a',
    crest: '❖',
    synergy: 'vanguard',
    pattern: 'roar_quake',
    awakenedDamage: 70,
    interval: 0.98,
    range: 2.35,
    projSpeed: 0,
    aoe: 2.15,
    stunDur: 1.1,
    skillEveryN: 4,
  },
  zhuge: {
    accent: '#b08928',
    frame: '#785914',
    crest: '☯',
    synergy: 'mystic',
    pattern: 'chain_lightning',
    awakenedDamage: 64,
    interval: 1.05,
    range: 3.7,
    projSpeed: 14.0,
    skillEveryN: 3,
  },
  zhenji: {
    accent: '#2b6cb0',
    frame: '#1e4e8c',
    crest: '✻',
    synergy: 'mystic',
    pattern: 'lotus_blizzard',
    awakenedDamage: 56,
    interval: 0.96,
    range: 3.4,
    projSpeed: 9.0,
    aoe: 1.55,
    slow: 0.52,
    slowDur: 2.6,
    stunDur: 0.85,
    skillEveryN: 4,
  },
  shangxiang: {
    accent: '#a42424',
    frame: '#7a1818',
    crest: '✦',
    synergy: 'marksman',
    pattern: 'phoenix_volley',
    awakenedDamage: 48,
    interval: 0.66,
    range: 3.8,
    projSpeed: 12.4,
    skillEveryN: 4,
  },
};

function buildUnitRegistry(): Record<UnitId, UnitDef> {
  const reg: Partial<Record<UnitId, UnitDef>> = {
    blade: {
      id: 'blade',
      category: 'troop',
      spriteKey: 'unit_blade',
      accentColor: '#9e2a2b',
      frameColor: '#5c4b3c',
      crestSymbol: '',
      synergy: 'vanguard',
      pattern: 'cleave',
      baseDamage: 26,
      attackInterval: 0.9,
      rangeCells: 2.15,
      projectileSpeed: 0,
      aoeRadiusCells: 1.45,
    },
    archer: {
      id: 'archer',
      category: 'troop',
      spriteKey: 'unit_archer',
      accentColor: '#386641',
      frameColor: '#5c4b3c',
      crestSymbol: '',
      synergy: 'marksman',
      pattern: 'arrow',
      baseDamage: 21,
      attackInterval: 0.62,
      rangeCells: 3.45,
      projectileSpeed: 11.5,
    },
    lancer: {
      id: 'lancer',
      category: 'troop',
      spriteKey: 'unit_lancer',
      accentColor: '#2b5b6c',
      frameColor: '#5c4b3c',
      crestSymbol: '',
      synergy: 'vanguard',
      pattern: 'pierce_lance',
      baseDamage: 30,
      attackInterval: 1.06,
      rangeCells: 2.85,
      projectileSpeed: 9.6,
    },
    mortar: {
      id: 'mortar',
      category: 'troop',
      spriteKey: 'unit_mortar',
      accentColor: '#7f4f24',
      frameColor: '#5c4b3c',
      crestSymbol: '',
      synergy: 'mystic',
      pattern: 'mortar_aoe',
      baseDamage: 42,
      attackInterval: 1.45,
      rangeCells: 3.25,
      projectileSpeed: 7.5,
      aoeRadiusCells: 1.38,
    },
    frostbow: {
      id: 'frostbow',
      category: 'troop',
      spriteKey: 'unit_frostbow',
      accentColor: '#2c7da0',
      frameColor: '#5c4b3c',
      crestSymbol: '',
      synergy: 'marksman',
      pattern: 'frost_bolt',
      baseDamage: 19,
      attackInterval: 0.84,
      rangeCells: 3.15,
      projectileSpeed: 10.2,
      slowFactor: 0.42,
      slowDuration: 2.2,
    },
  };

  for (const h of HERO_KEYS) {
    const sp = HERO_SPECS[h];
    const soulId: UnitId = `soul_${h}`;
    const weapId: UnitId = `weap_${h}`;
    const heroId: UnitId = `hero_${h}`;

    // Unawakened Hero Soul Tile (Part A — fights with medium martial strikes, waiting for Weapon!)
    reg[soulId] = {
      id: soulId,
      category: 'soul',
      heroKey: h,
      spriteKey: `soul_${h}`,
      accentColor: sp.accent,
      frameColor: sp.frame,
      crestSymbol: sp.crest,
      synergy: sp.synergy,
      pattern: sp.synergy === 'vanguard' ? 'cleave' : 'spirit_strike',
      baseDamage: Math.round(sp.awakenedDamage * 0.44),
      attackInterval: sp.interval * 1.12,
      rangeCells: Math.max(2.15, sp.range - 0.35),
      projectileSpeed: 10.2,
      aoeRadiusCells: 1.35,
    };

    // Unawakened Divine Weapon Tile (Part B — fires spirit qi bolts, waiting for Soul!)
    reg[weapId] = {
      id: weapId,
      category: 'weapon',
      heroKey: h,
      spriteKey: `weap_${h}`,
      accentColor: sp.accent,
      frameColor: sp.frame,
      crestSymbol: sp.crest,
      synergy: sp.synergy,
      pattern: 'spirit_strike',
      baseDamage: Math.round(sp.awakenedDamage * 0.42),
      attackInterval: sp.interval * 1.1,
      rangeCells: sp.range,
      projectileSpeed: 11.0,
    };

    // Fused Awakened Legendary General (Soul + Weapon -> True Hero!)
    reg[heroId] = {
      id: heroId,
      category: 'awakened',
      heroKey: h,
      spriteKey: `hero_${h}`,
      accentColor: sp.accent,
      frameColor: '#c59b27',
      crestSymbol: sp.crest,
      synergy: sp.synergy,
      pattern: sp.pattern,
      baseDamage: sp.awakenedDamage,
      attackInterval: sp.interval,
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
 * Determines if two tiles can combine:
 * - 'awaken': Matching Hero Soul + Divine Weapon (any tier!) -> Fuses into Awakened Hero!
 * - 'merge': Identical UnitId + Identical Tier (< MAX_TILE_TIER) -> Tier + 1!
 */
export function checkTileCombine(
  a: TileUnit,
  b: TileUnit
): { mode: 'awaken' | 'merge'; resultId: UnitId; resultTier: number } | null {
  if (a.uid === b.uid) return null;

  const defA = UNITS[a.unitId];
  const defB = UNITS[b.unitId];

  // 1) 2-Piece Hero Synthesis: Soul + Weapon of the same HeroKey!
  if (
    defA.heroKey &&
    defA.heroKey === defB.heroKey &&
    ((defA.category === 'soul' && defB.category === 'weapon') ||
      (defA.category === 'weapon' && defB.category === 'soul'))
  ) {
    const heroId: UnitId = `hero_${defA.heroKey}`;
    const fusedTier = Math.min(MAX_TILE_TIER, Math.max(a.tier, b.tier));
    return { mode: 'awaken', resultId: heroId, resultTier: fusedTier };
  }

  // 2) Standard Same-Unit + Same-Tier Upgrade Merge
  if (a.unitId === b.unitId && a.tier === b.tier && a.tier < MAX_TILE_TIER) {
    return { mode: 'merge', resultId: a.unitId, resultTier: a.tier + 1 };
  }

  return null;
}

export function getTierDamageMultiplier(tier: number): number {
  return Math.pow(1.92, tier - 1);
}

export function getTierSpeedMultiplier(tier: number): number {
  return 1 + (tier - 1) * 0.14;
}

export function getTierRangeBonus(tier: number): number {
  return (tier - 1) * 0.16;
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
