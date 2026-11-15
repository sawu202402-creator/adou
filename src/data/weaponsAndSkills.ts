import { HeroKey, SkillId, WeaponId } from '../types';

export interface SkillTrackSpec {
  id: SkillId;
  badgeSymbol: string;
  badgeColor: string;
  spriteKey: string;
  maxLevel: number;
  baseCost: number;
  costStep: number;
}

/**
 * 8 Original-Inspired Tactical Skills (《赵云与阿斗》经典局外/战后购买技能体系):
 * - rank_up: 升职军衔 (Soldier -> Captain -> General -> Grand Chancellor)
 * - haste_scroll: 攻速符 (Global Attack Speed + Divine Talisman Frenzy duration)
 * - meteor_art: 天降陨石 (Periodic AoE meteor strikes on dense monsters & Bosses)
 * - tomb_raider: 摸金校尉 (Excavating locked stone cells bursts out Steamed Buns + Weapon Shard chance!)
 * - exorcist_seal: 降妖敕令 (Extra Boss/Elite damage + empowers green Exorcism button)
 * - hero_decree: 招贤金榜 (Raises Hero Shard I/II conscription rate)
 * - granary_art: 屯田农政 (Passive Steamed Bun production + starting supply)
 * - frost_inkstone: 寒冰砚台 (Chilling ink-mire on road slowing all invaders)
 */
export const SKILL_SPECS: SkillTrackSpec[] = [
  {
    id: 'rank_up',
    badgeSymbol: '印',
    badgeColor: '#991b1b',
    spriteKey: 'vip_lord',
    maxLevel: 8,
    baseCost: 75,
    costStep: 55,
  },
  {
    id: 'haste_scroll',
    badgeSymbol: '速',
    badgeColor: '#6d28d9',
    spriteKey: 'unit_archer',
    maxLevel: 6,
    baseCost: 85,
    costStep: 65,
  },
  {
    id: 'meteor_art',
    badgeSymbol: '星',
    badgeColor: '#c2410c',
    spriteKey: 'unit_mortar',
    maxLevel: 5,
    baseCost: 110,
    costStep: 80,
  },
  {
    id: 'tomb_raider',
    badgeSymbol: '铲',
    badgeColor: '#a16207',
    spriteKey: 'icon_shovel',
    maxLevel: 5,
    baseCost: 95,
    costStep: 70,
  },
  {
    id: 'exorcist_seal',
    badgeSymbol: '敕',
    badgeColor: '#15803d',
    spriteKey: 'crest_zhuge',
    maxLevel: 6,
    baseCost: 90,
    costStep: 65,
  },
  {
    id: 'hero_decree',
    badgeSymbol: '贤',
    badgeColor: '#b45309',
    spriteKey: 'crest_zhaoyun',
    maxLevel: 6,
    baseCost: 100,
    costStep: 75,
  },
  {
    id: 'granary_art',
    badgeSymbol: '粮',
    badgeColor: '#4d7c0f',
    spriteKey: 'icon_rice',
    maxLevel: 6,
    baseCost: 80,
    costStep: 60,
  },
  {
    id: 'frost_inkstone',
    badgeSymbol: '砚',
    badgeColor: '#0369a1',
    spriteKey: 'crest_zhenji',
    maxLevel: 5,
    baseCost: 105,
    costStep: 75,
  },
];

export interface WeaponSpec {
  id: WeaponId;
  signatureHero: HeroKey;
  spriteKey: string;
  accentColor: string;
  unlockShards: number; // 3 shards to synthesize weapon
  starUpShards: number[]; // shards needed for 2★, 3★, 4★, 5★
  baseDmgBonus: number; // +35% at 1★
  aspdBonus: number; // +15%
}

export const WEAPON_IDS: WeaponId[] = [
  'weap_zhaoyun',
  'weap_guanyu',
  'weap_zhangfei',
  'weap_zhuge',
  'weap_zhenji',
  'weap_shangxiang',
];

export const WEAPON_SPECS: Record<WeaponId, WeaponSpec> = {
  weap_zhaoyun: {
    id: 'weap_zhaoyun',
    signatureHero: 'zhaoyun',
    spriteKey: 'weap_zhaoyun',
    accentColor: '#2c7da0',
    unlockShards: 3,
    starUpShards: [3, 4, 5, 6],
    baseDmgBonus: 0.36,
    aspdBonus: 0.16,
  },
  weap_guanyu: {
    id: 'weap_guanyu',
    signatureHero: 'guanyu',
    spriteKey: 'weap_guanyu',
    accentColor: '#2d6a4f',
    unlockShards: 3,
    starUpShards: [3, 4, 5, 6],
    baseDmgBonus: 0.42,
    aspdBonus: 0.12,
  },
  weap_zhangfei: {
    id: 'weap_zhangfei',
    signatureHero: 'zhangfei',
    spriteKey: 'weap_zhangfei',
    accentColor: '#b5451b',
    unlockShards: 3,
    starUpShards: [3, 4, 5, 6],
    baseDmgBonus: 0.34,
    aspdBonus: 0.14,
  },
  weap_zhuge: {
    id: 'weap_zhuge',
    signatureHero: 'zhuge',
    spriteKey: 'weap_zhuge',
    accentColor: '#b08928',
    unlockShards: 3,
    starUpShards: [3, 4, 5, 6],
    baseDmgBonus: 0.38,
    aspdBonus: 0.15,
  },
  weap_zhenji: {
    id: 'weap_zhenji',
    signatureHero: 'zhenji',
    spriteKey: 'weap_zhenji',
    accentColor: '#2b6cb0',
    unlockShards: 3,
    starUpShards: [3, 4, 5, 6],
    baseDmgBonus: 0.32,
    aspdBonus: 0.18,
  },
  weap_shangxiang: {
    id: 'weap_shangxiang',
    signatureHero: 'shangxiang',
    spriteKey: 'weap_shangxiang',
    accentColor: '#a42424',
    unlockShards: 3,
    starUpShards: [3, 4, 5, 6],
    baseDmgBonus: 0.35,
    aspdBonus: 0.2,
  },
};
