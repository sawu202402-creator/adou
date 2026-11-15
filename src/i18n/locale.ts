import {
  BossArchetype,
  HeroKey,
  Lang,
  SkillId,
  TroopKey,
  UnitId,
  WeaponId,
} from '../types';

function detectDefaultLang(): Lang {
  try {
    const nav = (navigator.language || '').toLowerCase();
    if (nav.startsWith('zh')) return 'zh';
  } catch {
    // ignore
  }
  return 'en';
}

let currentLang: Lang = detectDefaultLang();

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }
}

export interface UnitText {
  name: string;
  role: string;
  desc: string;
}

interface Dict {
  gameTitle: string;
  gameSubtitle: string;
  tabStages: string;
  tabArmory: string;
  tabSkills: string;
  tabCodex: string;
  modeStandard: string;
  modeEndless: string;
  stageCleared: string;
  stageDifficulty: (n: number) => string;
  endlessBest: (w: number) => string;
  endlessReady: string;
  btnPlayStandard: string;
  btnPlayEndless: string;
  hubFooterTip: string;
  commanderRank: (lvl: number, rankTitle: string, bonusPct: number) => string;
  maxLevel: string;
  upgradeBtn: (cost: number) => string;

  armoryTitle: string;
  armoryTip: string;
  shardCount: (have: number, need: number | null) => string;
  btnForgeWeapon: (need: number) => string;
  btnStarUpWeapon: (need: number) => string;
  btnEquipTo: (heroName: string) => string;
  equippedOn: (heroName: string) => string;
  unequippedLabel: string;

  codexFusionTitle: string;
  codexTroopsTitle: string;
  codexSynergyTitle: string;
  codexRuleTip: string;

  rivalTag: string;
  playerTag: string;
  waveLabel: (w: number, maxW: number | null) => string;
  bossNames: Record<Exclude<BossArchetype, 'none'>, { name: string; trait: string }>;

  btnRecruit: string;
  btnReroll: string;
  btnHeroScrollFree: string;
  btnHeroScrollAd: string;
  btnSupplyAd: string;
  talismanLabel: string;
  talismanReady: string;

  actFarm: string;
  actExorcise: string;
  actShovel: string;
  actFortify: string;

  bannerWaveStart: (w: number) => string;
  bannerBossIncoming: (name: string, trait: string) => string;
  bannerShovelPick: string;
  bannerTileUnlocked: string;
  bannerTombRaiderBonus: (buns: number, gotShard: boolean) => string;
  bannerTalismanPick: string;
  bannerTalismanUpgraded: (name: string, tier: number) => string;
  bannerExorciseCast: string;
  bannerMeteorStrike: string;
  bannerWeaponShardDrop: (weapName: string) => string;
  bannerZhangJiaoHeal: string;
  bannerZhangBaoSummon: string;
  bannerHeroAwakened: (name: string) => string;
  bannerRivalAwakened: (name: string) => string;
  bannerRivalFallen: string;
  bannerFortified: string;
  bannerNeedRations: string;
  bannerMaxLevel: string;

  synergyNames: {
    vanguard: string;
    marksman: string;
    mystic: string;
    dragon_guard: string;
  };
  synergyDescs: {
    vanguard: string;
    marksman: string;
    mystic: string;
    dragon_guard: string;
  };

  pauseTitle: string;
  btnResume: string;
  btnMuteOn: string;
  btnMuteOff: string;
  btnLangSwitch: string;
  btnRetreat: string;

  reviveTitle: string;
  reviveSub: (wave: number, kills: number) => string;
  revivePerk1: string;
  revivePerk2: string;
  revivePerk3: string;
  btnReviveAd: string;
  btnSkipRevive: string;

  victoryTitle: string;
  victoryRivalKoTitle: string;
  defeatTitle: string;
  settleSub: (wave: number, kills: number, merges: number) => string;
  settleDropsTitle: string;
  settleSkillShopTitle: string;
  btnMultClaim: string;
  btnNormalClaim: string;

  mockAdBadge: (placement: string) => string;
  mockAdCalling: string;
  mockAdReward: (title: string) => string;
  mockAdTimer: (sec: string) => string;
  mockAdCancel: string;

  adRewardRevive: string;
  adRewardSupply: string;
  adRewardShovels: string;
  adRewardHero: string;
  adRewardSettle: (mult: number) => string;

  rankTitles: string[];
  stages: Record<string, { name: string; subtitle: string; bossHint: string }>;
  skills: Record<SkillId, { name: string; shortTag: string; desc: string; val: (lvl: number) => string }>;
  weapons: Record<WeaponId, { name: string; desc: string; sigBonus: string }>;
  troops: Record<TroopKey, UnitText>;
  heroes: Record<
    HeroKey,
    {
      shard1Name: string;
      shard2Name: string;
      heroName: string;
      role: string;
      desc: string;
    }
  >;
}

const EN_DICT: Dict = {
  gameTitle: 'Dynasty Jade Guard',
  gameSubtitle: '1v1 Split-Board Duel · 2-Shard Hero Fusion · Divine Weapons & Skill Scrolls',
  tabStages: 'Passes',
  tabArmory: 'Divine Armory',
  tabSkills: 'Skill Shop',
  tabCodex: 'Range & Codex',
  modeStandard: '10-Wave Duel',
  modeEndless: 'Endless Siege',
  stageCleared: 'Cleared',
  stageDifficulty: (n) => `Rank ${'I'.repeat(n)}`,
  endlessBest: (w) => `Best Wave ${w}`,
  endlessReady: 'Survival Duel',
  btnPlayStandard: 'Enter Pass Duel (10 Waves)',
  btnPlayEndless: 'Enter Endless Siege',
  hubFooterTip:
    'Combine [Shard I ◐] + [Shard II ◑] to summon Generals · Defeat Bosses for Weapon Shards · Buy Skills after every battle!',
  commanderRank: (lvl, rankTitle, bonusPct) =>
    `Rank: ${rankTitle} (Lv.${lvl})  ·  Global Might +${bonusPct}%`,
  maxLevel: 'MAX',
  upgradeBtn: (cost) => `Buy · ${cost}G`,

  armoryTitle: 'Divine Armory — Synthesize Weapon Shards & Equip onto Generals',
  armoryTip:
    'Bosses & Stage Victories drop Weapon Shards! Collect 3 Shards to forge a Divine Weapon, then equip it onto its General to display on their tile and unlock awakened weapon skills.',
  shardCount: (have, need) => (need === null ? `5★ MAX (${have} extra)` : `Shards: ${have} / ${need}`),
  btnForgeWeapon: (need) => `Forge (${need} Shards)`,
  btnStarUpWeapon: (need) => `Refine ★ (${need})`,
  btnEquipTo: (heroName) => `Equip -> ${heroName}`,
  equippedOn: (heroName) => `Equipped: ${heroName}`,
  unequippedLabel: 'Tap to Equip',

  codexFusionTitle: 'Two-Shard Hero Summoning: [Portrait Shard ◐] + [Totem Shard ◑] = General',
  codexTroopsTitle: 'Five Tactical Troops & Exact Grid Attack Ranges',
  codexSynergyTitle: 'Battlefield Formation Synergies',
  codexRuleTip:
    'Drag or tap any unit on the board to see its exact highlighted target cells! Melee Blades (1-cell) must hug the road; Archers (3-cell) snipe safely from the inner core.',

  rivalTag: 'RIVAL',
  playerTag: 'YOU',
  waveLabel: (w, maxW) => (maxW ? `Wave ${w} / ${maxW}` : `Endless Wave ${w}`),
  bossNames: {
    zhangbao: { name: 'Sorcerer Zhang Bao', trait: 'Summons Raiders' },
    zhangjiao: { name: 'Sky Lord Zhang Jiao', trait: 'Low-HP Heal Pact' },
    lubu: { name: 'Warlord Lu Bu', trait: 'Heavy Armor & Gate Smash' },
  },

  btnRecruit: 'Conscript',
  btnReroll: 'Refresh',
  btnHeroScrollFree: 'Free Shard',
  btnHeroScrollAd: 'Hero Tally',
  btnSupplyAd: '+65 Buns',
  talismanLabel: 'Talisman',
  talismanReady: 'UPGRADE!',

  actFarm: 'Farmer',
  actExorcise: 'Exorcise',
  actShovel: 'Shovel',
  actFortify: 'Guard',

  bannerWaveStart: (w) => `Wave ${w} — Enemy Vanguard Advances!`,
  bannerBossIncoming: (name, trait) => `BOSS: ${name} (${trait}) — Drops Weapon Shard!`,
  bannerShovelPick: 'Tap a dark stone cell in your half to excavate',
  bannerTileUnlocked: 'New White Jade Pedestal Excavated!',
  bannerTombRaiderBonus: (buns, gotShard) =>
    gotShard
      ? `Tomb Raider! +${buns} Buns & Unearthed 1 Weapon Shard!`
      : `Tomb Raider! Unearthed +${buns} Bonus Buns!`,
  bannerTalismanPick: 'Divine Talisman Ready: Tap any unit/General to +1 Tier & Haste!',
  bannerTalismanUpgraded: (name, tier) => `Divine Talisman! ${name} Promoted to Tier ${tier}!`,
  bannerExorciseCast: 'Exorcism Talisman! Celestial Thunder Smites Bosses!',
  bannerMeteorStrike: 'Meteor Tome! Flaming Starfalls Crush the Enemy!',
  bannerWeaponShardDrop: (weapName) => `Boss Spoils! Obtained [${weapName}] Shard!`,
  bannerZhangJiaoHeal: 'Zhang Jiao Chants Peace Scripture — Burst Him Down!',
  bannerZhangBaoSummon: 'Zhang Bao Summons Yellow Turban Raiders!',
  bannerHeroAwakened: (name) => `2 Shards United · ${name} Summoned!`,
  bannerRivalAwakened: (name) => `Rival Summoned ${name}!`,
  bannerRivalFallen: 'Rival Defense Collapsed!',
  bannerFortified: 'Barricade Rebuilt & Royal Heir Healed!',
  bannerNeedRations: 'Not Enough Steamed Buns',
  bannerMaxLevel: 'Maximum Rank Reached',

  synergyNames: {
    vanguard: 'Vanguard Phalanx',
    marksman: 'Volley Watch',
    mystic: 'Grand Strategy',
    dragon_guard: 'Sworn Generals',
  },
  synergyDescs: {
    vanguard: '2 / 4 Melee, Spear & Cavalry types: Global DMG +16% / +36%',
    marksman: '2 / 3 Bow & Phoenix types: Attack Speed +18% / +38%',
    mystic: '2 / 3 Bombard, Sage & Frost types: Skill & AoE DMG +25% / +55%',
    dragon_guard: '2 / 3 Summoned Generals: Faster Skills & +14% / +22% Crit',
  },

  pauseTitle: 'War Council Paused',
  btnResume: 'Resume Battle',
  btnMuteOn: 'Audio: Muted',
  btnMuteOff: 'Audio: Active',
  btnLangSwitch: 'Language: EN / 切换中文',
  btnRetreat: 'Return to Scroll',

  reviveTitle: 'The Royal Heir Is in Peril!',
  reviveSub: (wave, kills) => `Fought to Wave ${wave} · Vanquished ${kills} Foes`,
  revivePerk1: 'Full-Lane Dragon Clear',
  revivePerk2: '+6 Royal Hearts',
  revivePerk3: 'Rebuild Spike Gate',
  btnReviveAd: 'Watch Ad · Dragon Rescue',
  btnSkipRevive: 'Settle Spoils',

  victoryTitle: 'Pass Defended · Grand Victory!',
  victoryRivalKoTitle: 'Rival Outlasted · Duel Victory!',
  defeatTitle: 'Battle Settlement & Skill Shop',
  settleSub: (wave, kills, merges) => `Wave ${wave} · ${kills} Slain · ${merges} Merges`,
  settleDropsTitle: 'Weapon Shards & Spoils Earned',
  settleSkillShopTitle: 'Post-Battle Skill Shop (Spend Gold to Unlock Skills)',
  btnMultClaim: 'Bonus Gold & Return',
  btnNormalClaim: 'Confirm & Return to Hub',

  mockAdBadge: (placement) => `Preview · Simulated Rewarded Video (${placement})`,
  mockAdCalling: 'Summoning Imperial Decree...',
  mockAdReward: (title) => `Granting: <strong>${title}</strong>`,
  mockAdTimer: (sec) => `Game paused & muted · ${sec}s remaining`,
  mockAdCancel: 'Cancel',

  adRewardRevive: 'Dragon Rescue + Full Barricade Rebuild',
  adRewardSupply: '+65 Buns + 1 Golden Shovel',
  adRewardShovels: '+2 Golden Shovels',
  adRewardHero: 'Matching Hero Shard (Instant Summon!)',
  adRewardSettle: (m) => `x${m} Gold & XP Spoils`,

  rankTitles: [
    'Foot Soldier',
    'Gate Captain',
    'Commandant',
    'Vanguard General',
    'Tiger General',
    'Grand Marshal',
    'Imperial Regent',
    'Supreme Chancellor',
  ],

  stages: {
    hulao: {
      name: 'Hulao Twin Pass',
      subtitle: 'Classic inner-core fortress! Use Shovels to open outer slots for 1-cell Blades while Archers snipe from within.',
      bossHint: 'Bosses: Zhang Bao (W5) · Lu Bu (W10)',
    },
    changban: {
      name: 'Changban Steep Bridge',
      subtitle: 'Narrow river corridors ideal for 2-cell piercing Spearmen! Burst down Zhang Jiao before his heal chant.',
      bossHint: 'Bosses: Zhang Bao (W5) · Zhang Jiao (W10)',
    },
    chibi: {
      name: 'Chibi Chained Armada',
      subtitle: 'Long chained ship decks demanding Frost Inkstone slow, Siege Bombards, and weapon-equipped Generals.',
      bossHint: 'Bosses: Zhang Bao (W5) · Demon Lu Bu (W10)',
    },
  },

  skills: {
    rank_up: {
      name: 'Rank Promotion',
      shortTag: 'Rank',
      desc: 'Promotes military rank (Soldier -> Chancellor), boosting all damage & starting Buns',
      val: (lvl) => `Lv.${lvl} (+${(lvl - 1) * 10}% DMG)`,
    },
    haste_scroll: {
      name: 'Haste Talisman',
      shortTag: 'Haste',
      desc: 'Increases attack speed of all Troops & Generals permanently',
      val: (lvl) => `+${lvl * 12}% ASPD`,
    },
    meteor_art: {
      name: 'Meteor Tome',
      shortTag: 'Meteor',
      desc: 'Automatically calls flaming meteors onto enemy clusters every 10s',
      val: (lvl) => (lvl === 0 ? 'Locked' : `${lvl}x Meteor AoE`),
    },
    tomb_raider: {
      name: 'Tomb Raider',
      shortTag: 'Raider',
      desc: 'Digging with a Shovel bursts out bonus Buns & chance for a Weapon Shard!',
      val: (lvl) => (lvl === 0 ? 'Locked' : `+${12 + lvl * 6} Buns/Dig`),
    },
    exorcist_seal: {
      name: 'Exorcist Seal',
      shortTag: 'Boss+',
      desc: 'Boosts damage vs Bosses & empowers the active Exorcism thunder button',
      val: (lvl) => `+${lvl * 25}% vs Boss`,
    },
    hero_decree: {
      name: 'Hero Decree',
      shortTag: 'Decree',
      desc: 'Raises Hero Shard I & II appearance chance when conscripting',
      val: (lvl) => `+${(lvl * 4.5).toFixed(1)}% Shard`,
    },
    granary_art: {
      name: 'Peasant Granary',
      shortTag: 'Farm',
      desc: 'Passively harvests extra Steamed Buns every second during battle',
      val: (lvl) => `+${(lvl * 0.45).toFixed(2)}/s`,
    },
    frost_inkstone: {
      name: 'Frost Inkstone',
      shortTag: 'InkSlow',
      desc: 'Coats your road in chilling ink, slowing all incoming enemies',
      val: (lvl) => (lvl === 0 ? 'Locked' : `-${10 + lvl * 4.5}% Spd`),
    },
  },

  weapons: {
    weap_zhaoyun: {
      name: 'Dragon Gall Silver Spear',
      desc: 'Signature Spear of Zhao Yun. Greatly boosts attack & pierce.',
      sigBonus: 'Zhao Yun Exclusive: Launches full-board flying Dragon Spears!',
    },
    weap_guanyu: {
      name: 'Green Dragon Crescent Glaive',
      desc: 'Signature Glaive of Guan Yu. Massive cleave & execute power.',
      sigBonus: 'Guan Yu Exclusive: Raises instant execute threshold to <30% HP!',
    },
    weap_zhangfei: {
      name: 'Coiled Serpent Steel Pike',
      desc: 'Signature Pike of Zhang Fei. Amplifies warcry shockwaves.',
      sigBonus: 'Zhang Fei Exclusive: Warcry stuns longer & shreds Boss armor!',
    },
    weap_zhuge: {
      name: 'Eight-Trigrams Feather Fan',
      desc: 'Signature Fan of Zhuge Liang. Channels celestial thunder.',
      sigBonus: 'Zhuge Exclusive: Chain lightning jumps +3 extra targets!',
    },
    weap_zhenji: {
      name: 'Frost Lotus Jade Flute',
      desc: 'Signature Flute of Zhen Ji. Deepens freezing blizzards.',
      sigBonus: 'Zhen Ji Exclusive: Blizzard freezes enemies solid for 1.2s!',
    },
    weap_shangxiang: {
      name: 'Vermilion Phoenix Warbow',
      desc: 'Signature Bow of Shangxiang. Ignites full-screen arrow storms.',
      sigBonus: 'Shangxiang Exclusive: Fires +2 blazing Phoenix arrows per volley!',
    },
  },

  troops: {
    blade: {
      name: 'Heavy Blade Guard',
      role: '[Range: 1-Cell 3x3] · Extreme Melee Cleave',
      desc: 'Highest base damage, but short 1-cell reach! Must be placed directly beside the road.',
    },
    spear: {
      name: 'Crimson Spearman',
      role: '[Range: 2-Cell Cross] · Straight-Line Pierce',
      desc: 'Thrusts piercing shockwaves down straight 2-cell corridors, hitting multiple foes.',
    },
    lancer: {
      name: 'Iron Cavalry',
      role: '[Range: 2-Cell Diamond] · Fast Raid',
      desc: 'Agile 2-cell reach with rapid strikes — best early-wave clearer.',
    },
    archer: {
      name: 'Horn-Bow Marksman',
      role: '[Range: 3-Cell 7x7] · Inner-Core Boss Sniper',
      desc: 'Covers outer roads safely from deep inner tiles. +30% bonus damage vs Bosses!',
    },
    mortar: {
      name: 'Siege Bombard',
      role: '[Range: 2-3 Cell Ring] · 1-Cell Blindspot AoE',
      desc: 'Cannot hit adjacent cells, but shells distant roads with armor-shattering blasts!',
    },
  },

  heroes: {
    zhaoyun: {
      shard1Name: 'Zhao Yun · Shard I (◐)',
      shard2Name: 'Zhao Yun · Shard II (◑)',
      heroName: 'Zhao Yun · White Dragon',
      role: '◈ 2-Cell Martial Zone · Piercing Dragon Surge',
      desc: 'Combine Shard I + II! Sweeps wide arcs; with Dragon Spear equipped, fires full-board flying spears.',
    },
    guanyu: {
      shard1Name: 'Guan Yu · Shard I (◐)',
      shard2Name: 'Guan Yu · Shard II (◑)',
      heroName: 'Guan Yu · Martial Saint',
      role: '☾ 2-Cell Martial Zone · Instant Execute',
      desc: 'Combine Shard I + II! Executes low-HP enemies outright and hurls emerald crescent waves.',
    },
    zhangfei: {
      shard1Name: 'Zhang Fei · Shard I (◐)',
      shard2Name: 'Zhang Fei · Shard II (◑)',
      heroName: 'Zhang Fei · Warcry Titan',
      role: '❖ 2-Cell Martial Zone · AoE Quake Stun',
      desc: 'Combine Shard I + II! Roars fiery tremors that stun all surrounding invaders & Bosses.',
    },
    zhuge: {
      shard1Name: 'Zhuge Liang · Shard I (◐)',
      shard2Name: 'Zhuge Liang · Shard II (◑)',
      heroName: 'Zhuge Liang · Storm Sage',
      role: '☯ 3-Cell Mystic Zone · Chain Lightning',
      desc: 'Combine Shard I + II! Calls celestial lightning jumping across enemy formations.',
    },
    zhenji: {
      shard1Name: 'Zhen Ji · Shard I (◐)',
      shard2Name: 'Zhen Ji · Shard II (◑)',
      heroName: 'Zhen Ji · Frost Consort',
      role: '✻ 3-Cell Mystic Zone · Lotus Blizzard',
      desc: 'Combine Shard I + II! Blankets the road in freezing lotus storms that immobilize waves.',
    },
    shangxiang: {
      shard1Name: 'Shangxiang · Shard I (◐)',
      shard2Name: 'Shangxiang · Shard II (◑)',
      heroName: 'Shangxiang · Sky Archer',
      role: '✦ Full Half-Board Sniper · Blazing Volley',
      desc: 'Combine Shard I + II! Fires multi-arrow flame barrages across the entire half-board.',
    },
  },
};

const ZH_DICT: Dict = {
  gameTitle: '千里护主录 · 国风双阵塔防',
  gameSubtitle: '1V1双阵竞速 · 双碎片合名将 · 斩Boss爆神兵碎片 · 凯旋秘籍商店',
  tabStages: '烽火关卡',
  tabArmory: '神兵专武阁',
  tabSkills: '秘籍技能店',
  tabCodex: '射程与合成谱',
  modeStandard: '十波竞速破关',
  modeEndless: '无尽死守模式',
  stageCleared: '已破关',
  stageDifficulty: (n) => `险度 ${'★'.repeat(n)}`,
  endlessBest: (w) => `最高 ${w} 波`,
  endlessReady: '极限竞速',
  btnPlayStandard: '擂鼓出阵（十波Boss战）',
  btnPlayEndless: '死守雄关（无尽刷碎片）',
  hubFooterTip:
    '拖拽同武将【左碎片◐】+【右碎片◑】召唤名将 · 击败第5/10波 Boss 掉落神兵武器碎片 · 每局胜利后可购买秘籍技能！',
  commanderRank: (lvl, rankTitle, bonusPct) =>
    `当前军衔：【${rankTitle}】(统帅 Lv.${lvl})  ·  全军战力加成 +${bonusPct}%`,
  maxLevel: '已满阶',
  upgradeBtn: (cost) => `${cost} 金铢购买`,

  armoryTitle: '神兵专武阁 —— 收集过关 Boss 武器碎片 · 锻造并给武将穿戴神兵',
  armoryTip:
    '过关斩杀第5波精英与第10波守关 Boss 必掉【神兵碎片】！集齐 3 片即可锻造神兵并佩戴给武将：上阵后棋牌右上角将显示专武图标，并激活超强专武绝技！',
  shardCount: (have, need) => (need === null ? `5★满星 (余${have}片)` : `武器碎片：${have} / ${need}`),
  btnForgeWeapon: (need) => `合成神兵 (${need}片)`,
  btnStarUpWeapon: (need) => `升星精炼 (${need}片)`,
  btnEquipTo: (heroName) => `佩戴给${heroName}`,
  equippedOn: (heroName) => `已装备：${heroName}`,
  unequippedLabel: '点击装备武将',

  codexFusionTitle: '武将双碎片召唤：【左半将魂碎片 ◐】＋【右半命格碎片 ◑】＝ 真·三国名将',
  codexTroopsTitle: '五大基础兵种 · 严格棋盘格攻击范围详解',
  codexSynergyTitle: '军阵奇门羁绊（上阵自动激活）',
  codexRuleTip:
    '局内按住或点击任意棋子，棋盘会直接逐格高亮其真实攻击范围：【刀兵】仅打贴身周围1格但伤害极高（需放外圈贴路格）；【枪兵】打十字直线2格贯穿；【弓兵】缩在内圈也能打3格远路！',

  rivalTag: '敌方守军',
  playerTag: '我方阿斗',
  waveLabel: (w, maxW) => (maxW ? `第 ${w} / ${maxW} 波` : `无尽第 ${w} 波`),
  bossNames: {
    zhangbao: { name: '妖术祭酒·张宝', trait: '召唤黄巾妖兵' },
    zhangjiao: { name: '太平天公·张角', trait: '残血回春大咒' },
    lubu: { name: '无双魔神·吕布', trait: '玄铁重甲·碎砦' },
  },

  btnRecruit: '征兵',
  btnReroll: '换批征兵',
  btnHeroScrollFree: '赐碎片(免)',
  btnHeroScrollAd: '招贤虎符',
  btnSupplyAd: '+65 馒头',
  talismanLabel: '神兵符',
  talismanReady: '直升一阶!',

  actFarm: '农田',
  actExorcise: '降妖',
  actShovel: '金铲',
  actFortify: '护主',

  bannerWaveStart: (w) => `第 ${w} 波敌军擂鼓攻关！`,
  bannerBossIncoming: (name, trait) => `首领降临：【${name}】(${trait}) · 击杀必掉神兵碎片！`,
  bannerShovelPick: '请点击我方区域的深色石格开辟白玉阵位',
  bannerTileUnlocked: '金铲辟地 · 开启全新外圈阵位！',
  bannerTombRaiderBonus: (buns, gotShard) =>
    gotShard
      ? `摸金校尉触发！挖出 +${buns} 馒头，并惊喜出土 1 枚【神兵碎片】！`
      : `摸金校尉触发！额外挖出 +${buns} 馒头军粮！`,
  bannerTalismanPick: '【神兵符】已出鞘：请点击任意我方士兵或武将，无条件直升 1 阶并狂暴！',
  bannerTalismanUpgraded: (name, tier) => `神兵符显灵！【${name}】跃升至 ${tier} 阶并攻速狂飙！`,
  bannerExorciseCast: '【降妖符】敕令九天落雷，重创首领并碎裂护甲！',
  bannerMeteorStrike: '【天降陨石】火流星轰击敌群！',
  bannerWeaponShardDrop: (weapName) => `斩杀首领！掉落【${weapName}】碎片 ×1！`,
  bannerZhangJiaoHeal: '张角吟唱太平回血咒！速用【降妖】或名将集火秒杀！',
  bannerZhangBaoSummon: '张宝施展妖术，召唤黄巾斥候突袭！',
  bannerHeroAwakened: (name) => `双碎片合璧 · 召唤【${name}】登场！`,
  bannerRivalAwakened: (name) => `上方对手凑齐双碎片召唤了【${name}】！`,
  bannerRivalFallen: '上方对手阿斗失守！',
  bannerFortified: '铁刺鹿砦重筑，阿斗恢复红心！',
  bannerNeedRations: '馒头军粮不足，可升级【农田】加快产出',
  bannerMaxLevel: '已升至最高阶',

  synergyNames: {
    vanguard: '锋矢铁卫',
    marksman: '神臂齐射',
    mystic: '奇门遁甲',
    dragon_guard: '五虎名将',
  },
  synergyDescs: {
    vanguard: '上阵 2 / 4 种刀枪骑猛将：全军伤害 +16% / +36%',
    marksman: '上阵 2 / 3 种弓箭远程系：全军攻速 +18% / +38%',
    mystic: '上阵 2 / 3 种火炮谋士系：技能与范围伤害 +25% / +55%',
    dragon_guard: '召唤 2 / 3 尊以上真名将：绝技加速且暴击 +14% / +22%',
  },

  pauseTitle: '中军议事（已暂停）',
  btnResume: '继续督战',
  btnMuteOn: '金鼓音效：关闭',
  btnMuteOff: '金鼓音效：开启',
  btnLangSwitch: '界面语言：中文 / Switch EN',
  btnRetreat: '班师回朝（返回画卷）',

  reviveTitle: '鹿砦告破 · 阿斗危急！',
  reviveSub: (wave, kills) => `激战至第 ${wave} 波 · 斩敌 ${kills} 级`,
  revivePerk1: '苍龙清扫我方全路',
  revivePerk2: '恢复 6 颗阿斗红心',
  revivePerk3: '满血重筑铁刺鹿砦',
  btnReviveAd: '单骑救主（激励救援）',
  btnSkipRevive: '收兵结算并逛技能店',

  victoryTitle: '雄关屹立 · 护主大捷！',
  victoryRivalKoTitle: '对手溃败 · 竞速完胜！',
  defeatTitle: '沙场论功 · 凯旋秘籍店',
  settleSub: (wave, kills, merges) => `第 ${wave} 波 · 斩敌 ${kills} · 合成升阶 ${merges} 次`,
  settleDropsTitle: '本局战利品与掉落神兵碎片',
  settleSkillShopTitle: '凯旋秘籍商店（用战功金铢购买永久技能）',
  btnMultClaim: '虎符翻倍赏金并返回',
  btnNormalClaim: '收下赏金并返回大营',

  mockAdBadge: (placement) => `开发预览 · 模拟激励视频 (${placement})`,
  mockAdCalling: '八百里加急传召虎符援军...',
  mockAdReward: (title) => `即将赐予：<strong>${title}</strong>`,
  mockAdTimer: (sec) => `战局已静音暂停 · 尚余 ${sec} 秒`,
  mockAdCancel: '婉拒赏赐',

  adRewardRevive: '单骑救主清场 + 鹿砦重筑',
  adRewardSupply: '+65 蒸笼馒头 + 赐 1 把金铲',
  adRewardShovels: '赐 2 把洛阳金铲',
  adRewardHero: '定向赐予配对武将另一半碎片（即刻合成名将！）',
  adRewardSettle: (m) => `战功金铢与历练 x${m} 倍奉还`,

  rankTitles: [
    '义勇步卒',
    '守关什长',
    '牙门校尉',
    '折冲中郎',
    '讨逆偏将',
    '镇军大将',
    '骠骑大司马',
    '武乡大丞相',
  ],

  stages: {
    hulao: {
      name: '虎牢雄关',
      subtitle: '经典外路环绕阵！用金铲砸开外圈石格部署1格【刀兵】堵路，内圈安放【弓兵】远程点杀。',
      bossHint: '镇守首领：第5波 张宝 · 第10波 魔神吕布',
    },
    changban: {
      name: '长坂古桥',
      subtitle: '青绿水陆狭长直道，极利【枪兵】直线贯穿！小心第10波张角残血回春，留好【降妖】秒杀！',
      bossHint: '镇守首领：第5波 张宝 · 第10波 太平张角',
    },
    chibi: {
      name: '赤壁水寨',
      subtitle: '铁索连舟超长防线！搭配【寒冰砚台】减速、【天降陨石】与穿戴专武的名将镇守大营。',
      bossHint: '镇守首领：第5波 张宝 · 第10波 无双吕布',
    },
  },

  skills: {
    rank_up: {
      name: '升职军衔',
      shortTag: '升职',
      desc: '晋升官职军衔（步卒→丞相），永久提升全军基础伤害、阿斗血量与初始馒头',
      val: (lvl) => `Lv.${lvl} (伤害+${(lvl - 1) * 10}%)`,
    },
    haste_scroll: {
      name: '攻速神符',
      shortTag: '攻速',
      desc: '全军士兵与名将攻击速度永久大幅提升，强化神兵符狂暴效果',
      val: (lvl) => `攻速 +${lvl * 12}%`,
    },
    meteor_art: {
      name: '天降陨石',
      shortTag: '陨石',
      desc: '战斗中每 10 秒自动在敌军密集处召唤赤焰陨石群轰炸，清怪打 Boss 神技',
      val: (lvl) => (lvl === 0 ? '未解锁' : `每次 ${lvl} 颗火流星`),
    },
    tomb_raider: {
      name: '摸金校尉',
      shortTag: '摸金',
      desc: '每次用金铲挖开石格立即爆出大量馒头，且有概率直接挖出【神兵碎片】！',
      val: (lvl) => (lvl === 0 ? '未解锁' : `每铲+${12 + lvl * 6}馒头`),
    },
    exorcist_seal: {
      name: '降妖敕令',
      shortTag: '降妖',
      desc: '对精英与 Boss 伤害大幅提高，并强化底栏绿色【降妖】落雷破甲神技',
      val: (lvl) => `对Boss +${lvl * 25}%`,
    },
    hero_decree: {
      name: '招贤金榜',
      shortTag: '招贤',
      desc: '永久提高征兵刷出名将【左/右碎片】的概率，更快凑齐双碎片合成名将',
      val: (lvl) => `碎片率 +${(lvl * 4.5).toFixed(1)}%`,
    },
    granary_art: {
      name: '屯田农政',
      shortTag: '农术',
      desc: '大幅加快局内每秒自动产出的蒸笼馒头数量，并增加开局粮草储备',
      val: (lvl) => `每秒 +${(lvl * 0.45).toFixed(2)}粮`,
    },
    frost_inkstone: {
      name: '寒冰砚台',
      shortTag: '砚台',
      desc: '水墨寒霜铺满我方行军道路，令所有踏入的敌军与 Boss 持续减速',
      val: (lvl) => (lvl === 0 ? '未解锁' : `全场减速 ${10 + lvl * 4.5}%`),
    },
  },

  weapons: {
    weap_zhaoyun: {
      name: '龙胆亮银枪',
      desc: '常山赵子龙本命神兵，大幅提高攻击力与攻速。',
      sigBonus: '赵云穿戴质变：每4击触发【七进七出全场飞枪】无视距离贯穿敌潮！',
    },
    weap_guanyu: {
      name: '青龙偃月刀',
      desc: '武圣关云长冷艳锯，刀势沉猛霸道。',
      sigBonus: '关羽穿戴质变：斩杀线提升至 30% 血量，并劈出巨型翡翠青龙刀波！',
    },
    weap_zhangfei: {
      name: '丈八点钢矛',
      desc: '燕人张翼德重矛，刚猛无匹震慑敌胆。',
      sigBonus: '张飞穿戴质变：当阳怒吼范围扩大、眩晕延长并震碎 Boss 护甲！',
    },
    weap_zhuge: {
      name: '八卦白羽扇',
      desc: '卧龙先生奇门法器，引动九天神雷。',
      sigBonus: '诸葛亮穿戴质变：紫金连环雷额外多弹跳 3 个目标并附带麻痹！',
    },
    weap_zhenji: {
      name: '寒玉冰莲笛',
      desc: '洛神甄宓寒玉笛，吹奏千里冰封。',
      sigBonus: '甄姬穿戴质变：冰莲暴风雪将范围内敌军彻底冻结定身 1.2 秒！',
    },
    weap_shangxiang: {
      name: '丹凤烈焰弓',
      desc: '枭姬孙尚香神射宝弓，箭若流星火雨。',
      sigBonus: '孙尚香穿戴质变：全屏齐射箭数 +2 支，烈焰灼烧伤害翻倍！',
    },
  },

  troops: {
    blade: {
      name: '玄铁刀兵',
      role: '【射程：贴身1格(3×3)】· 极致近战重斩',
      desc: '基础攻击力断层最高！但射程仅限周围紧邻1格，必须部署在紧贴道路的外圈格堵门。',
    },
    spear: {
      name: '红缨枪兵',
      role: '【射程：十字直线2格】· 直线贯穿刺击',
      desc: '向正对通道刺出破阵枪芒，直线贯穿一串敌军！最适合摆在直道拐角口。',
    },
    lancer: {
      name: '铁浮屠骑',
      role: '【射程：周围2格菱形】· 高机动快攻',
      desc: '覆盖周围2格机动区域且攻速轻快，前期开荒清理成群小怪性价比最高。',
    },
    archer: {
      name: '雕翎弓兵',
      role: '【射程：内圈远射3格(7×7)】· 远程克制Boss',
      desc: '射程极远，缩在最安全的内圈白格也能覆盖外围道路，对首领额外造成 +30% 伤害！',
    },
    mortar: {
      name: '神威火炮',
      role: '【射程：远端2~3格环】· 近身1格盲区重轰',
      desc: '无法攻击贴身1格敌人，但能隔墙轰炸远端道路，范围爆炸专破重甲盾兵！',
    },
  },

  heroes: {
    zhaoyun: {
      shard1Name: '赵云·将魂碎片Ⅰ(◐)',
      shard2Name: '赵云·龙盔碎片Ⅱ(◑)',
      heroName: '真·赵云',
      role: '◈ 周围2格战区 · 贯穿苍龙枪',
      desc: '集齐【左/右两枚碎片】拖拽合成！高攻速银枪横扫；装备【龙胆亮银枪】后触发全场飞枪！',
    },
    guanyu: {
      shard1Name: '关羽·将魂碎片Ⅰ(◐)',
      shard2Name: '关羽·青龙印碎片Ⅱ(◑)',
      heroName: '真·关羽',
      role: '☾ 周围2格战区 · 残血一刀斩',
      desc: '集齐【左/右两枚碎片】拖拽合成！重刀劈斩直接处决残血敌军；装备【青龙偃月刀】斩杀线大幅提升！',
    },
    zhangfei: {
      shard1Name: '张飞·将魂碎片Ⅰ(◐)',
      shard2Name: '张飞·猛虎印碎片Ⅱ(◑)',
      heroName: '真·张飞',
      role: '❖ 周围2格战区 · 怒吼群控眩晕',
      desc: '集齐【左/右两枚碎片】拖拽合成！周期爆发当阳怒吼震晕周围群怪；装备【丈八点钢矛】破甲控Boss！',
    },
    zhuge: {
      shard1Name: '诸葛·将魂碎片Ⅰ(◐)',
      shard2Name: '诸葛·八卦冠碎片Ⅱ(◑)',
      heroName: '真·诸葛亮',
      role: '☯ 远程3格谋略区 · 九天连环雷',
      desc: '集齐【左/右两枚碎片】拖拽合成！召唤天雷在敌阵间连环弹跳；装备【八卦白羽扇】雷电增至7连跳！',
    },
    zhenji: {
      shard1Name: '甄姬·将魂碎片Ⅰ(◐)',
      shard2Name: '甄姬·冰莲簪碎片Ⅱ(◑)',
      heroName: '真·甄姬',
      role: '✻ 远程3格控制区 · 洛神冰封雪',
      desc: '集齐【左/右两枚碎片】拖拽合成！寒岚减速整条道路；装备【寒玉冰莲笛】直接冻结定身群敌！',
    },
    shangxiang: {
      shard1Name: '尚香·将魂碎片Ⅰ(◐)',
      shard2Name: '尚香·火凤冠碎片Ⅱ(◑)',
      heroName: '真·孙尚香',
      role: '✦ 半场全屏神射 · 漫天凤羽火雨',
      desc: '集齐【左/右两枚碎片】拖拽合成！超远覆盖全半场齐射火凤箭雨；装备【丹凤烈焰弓】万箭燎原！',
    },
  },
};

export function t(): Dict {
  return currentLang === 'zh' ? ZH_DICT : EN_DICT;
}

export function getUnitDisplayText(unitId: UnitId): UnitText {
  const dict = t();
  if (unitId in dict.troops) {
    return dict.troops[unitId as TroopKey];
  }
  const [prefix, hKey] = unitId.split('_') as ['shard1' | 'shard2' | 'hero', HeroKey];
  const h = dict.heroes[hKey];
  if (prefix === 'shard1') {
    return { name: h.shard1Name, role: h.role, desc: h.desc };
  }
  if (prefix === 'shard2') {
    return { name: h.shard2Name, role: h.role, desc: h.desc };
  }
  return { name: h.heroName, role: h.role, desc: h.desc };
}
