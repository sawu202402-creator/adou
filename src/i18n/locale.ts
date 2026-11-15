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
  shovelAdTag: string;

  bannerWaveStart: (w: number) => string;
  bannerBossIncoming: (name: string, trait: string) => string;
  bannerShovelPick: string;
  bannerBenchShovelPick: string;
  bannerTileUnlocked: string;
  bannerShovelRefund: (buns: number) => string;
  bannerTombRaiderBonus: (buns: number, gotShard: boolean) => string;
  bannerShardCannotAttack: string;
  bannerHeroLevelUp: (name: string, lvl: number) => string;
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

  shovelTile: UnitText;
  shardInactiveRole: string;
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
  gameSubtitle: '1v1 Split-Board Duel · 2-Piece Hero Puzzle · Combat Leveling & Divine Armory',
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
    'Hero Puzzle Pieces cannot attack until fused [1/2 + 2/2] · Generals gain XP from hits & kills · Shovels spawn randomly in the 5 bench slots (Watch Ad for more)!',
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

  codexFusionTitle: '2-Piece Hero Puzzle: [Left Piece 1/2] + [Right Piece 2/2] = General (Cannot Attack Unfused!)',
  codexTroopsTitle: 'Five Tactical Troops & Circular Attack Ranges',
  codexSynergyTitle: 'Battlefield Formation Synergies',
  codexRuleTip:
    'Hold or tap any unit to preview its circular attack ring! Unfused Hero Puzzle Pieces [1/2, 2/2] CANNOT attack — fuse both halves to summon a General who gains XP & levels up from attacks and kills!',

  rivalTag: 'RIVAL',
  playerTag: 'YOU',
  waveLabel: (w, maxW) => (maxW ? `Wave ${w} / ${maxW}` : `Endless Wave ${w}`),
  bossNames: {
    zhangbao: { name: 'Sorcerer Zhang Bao', trait: 'Summons Raiders' },
    zhangjiao: { name: 'Sky Lord Zhang Jiao', trait: 'Low-HP Heal Pact' },
    lubu: { name: 'Warlord Lu Bu', trait: 'Heavy Armor & Gate Smash' },
  },

  btnRecruit: 'Conscript',
  btnReroll: 'Refresh 5',
  btnHeroScrollFree: 'Free Piece',
  btnHeroScrollAd: 'Hero Puzzle',
  btnSupplyAd: '+65 Buns',
  talismanLabel: 'Talisman',
  talismanReady: 'UPGRADE!',

  actFarm: 'Farmer',
  actExorcise: 'Exorcise',
  actShovel: 'Shovel',
  actFortify: 'Guard',
  shovelAdTag: '🎬 Ad +2',

  bannerWaveStart: (w) => `Wave ${w} — Escalating Enemy Force Advances!`,
  bannerBossIncoming: (name, trait) => `BOSS: ${name} (${trait}) — Drops Weapon Shard!`,
  bannerShovelPick: 'Tap any dark stone cell in your half to dig it open!',
  bannerBenchShovelPick: 'Drag or tap a dark stone cell to excavate with your Bench Shovel!',
  bannerTileUnlocked: 'New White Jade Pedestal Excavated!',
  bannerShovelRefund: (buns) => `All slots unlocked! Extra Shovel converted to +${buns} Buns`,
  bannerTombRaiderBonus: (buns, gotShard) =>
    gotShard
      ? `Tomb Raider! +${buns} Buns & Unearthed 1 Weapon Shard!`
      : `Tomb Raider! Unearthed +${buns} Bonus Buns!`,
  bannerShardCannotAttack: 'Puzzle Piece cannot attack alone! Combine [1/2] + [2/2] to summon General!',
  bannerHeroLevelUp: (name, lvl) => `✦ ${name} Leveled Up to Lv.${lvl}! (DMG & Range Up)`,
  bannerTalismanPick: 'Divine Talisman Ready: Tap any Troop or General to +1 Tier & Haste!',
  bannerTalismanUpgraded: (name, tier) => `Divine Talisman! ${name} Promoted to Tier ${tier}!`,
  bannerExorciseCast: 'Exorcism Talisman! Celestial Thunder Smites Bosses!',
  bannerMeteorStrike: 'Meteor Tome! Flaming Starfalls Crush the Enemy!',
  bannerWeaponShardDrop: (weapName) => `Boss Spoils! Obtained [${weapName}] Shard!`,
  bannerZhangJiaoHeal: 'Zhang Jiao Chants Peace Scripture — Burst Him Down!',
  bannerZhangBaoSummon: 'Zhang Bao Summons Yellow Turban Raiders!',
  bannerHeroAwakened: (name) => `Puzzle Complete · ${name} Summoned (Lv.1)!`,
  bannerRivalAwakened: (name) => `Rival Completed Puzzle & Summoned ${name}!`,
  bannerRivalFallen: 'Rival Defense Collapsed!',
  bannerFortified: 'Barricade Rebuilt & Royal Heir Healed!',
  bannerNeedRations: 'Not Enough Steamed Buns — Upgrade [Farmer] for faster income!',
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
  adRewardSupply: '+65 Steamed Buns',
  adRewardShovels: '+2 Golden Shovels (Excavate Locked Stone Cells!)',
  adRewardHero: 'Matching Hero Puzzle Half (Instant General Summon!)',
  adRewardSettle: (m) => `x${m} Gold & XP Spoils`,

  shovelTile: {
    name: 'Golden Shovel',
    role: '[Bench Tool · Drag onto Dark Stone Cell]',
    desc: 'Spawns randomly in the 5 bench slots! Drag onto any dark stone cell to unlock a new deploy slot. Watch Ad for extra shovels!',
  },
  shardInactiveRole: '[Puzzle Half · Cannot Attack Until Fused!]',

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
      subtitle: 'Classic inner-core fortress! Use Shovels from the bench to open outer slots for short-circle Blades while Archers snipe from within.',
      bossHint: 'Bosses: Zhang Bao (W5) · Lu Bu (W10)',
    },
    changban: {
      name: 'Changban Steep Bridge',
      subtitle: 'Narrow river corridors ideal for piercing Spearmen! Burst down Zhang Jiao before his heal chant.',
      bossHint: 'Bosses: Zhang Bao (W5) · Zhang Jiao (W10)',
    },
    chibi: {
      name: 'Chibi Chained Armada',
      subtitle: 'Long chained ship decks demanding Frost Inkstone slow, Siege Bombards, and high-level Generals.',
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
      desc: 'Boosts bench Shovel rate; digging bursts bonus Buns & chance for a Weapon Shard!',
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
      desc: 'Raises Hero Puzzle Piece appearance chance when conscripting',
      val: (lvl) => `+${(lvl * 4.5).toFixed(1)}% Puzzle`,
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
      role: '[Circle: 1.5R Melee] · Highest Cleave DMG',
      desc: 'Highest base damage, small melee circle! Excavate outer road-side cells to reach foes.',
    },
    spear: {
      name: 'Crimson Spearman',
      role: '[Circle: 2.1R Medium] · Line-Piercing Lance',
      desc: 'Thrusts piercing shockwaves hitting up to 4+ enemies in a straight line.',
    },
    lancer: {
      name: 'Iron Cavalry',
      role: '[Circle: 2.4R Agile] · Rapid Sweep',
      desc: 'Balanced medium-wide circle with fast strikes — reliable wave clearer.',
    },
    archer: {
      name: 'Horn-Bow Marksman',
      role: '[Circle: 3.4R Sniper] · +30% Boss DMG',
      desc: 'Wide sniper circle reaching outer roads safely from deep inner tiles!',
    },
    mortar: {
      name: 'Siege Bombard',
      role: '[Circle: 1.2-3.6R Ring] · Armor-Piercing AoE',
      desc: 'Inner blindspot ring, wide outer siege blast crushing armored shieldmen!',
    },
  },

  heroes: {
    zhaoyun: {
      shard1Name: 'Zhao Yun · Puzzle 1/2',
      shard2Name: 'Zhao Yun · Puzzle 2/2',
      heroName: 'Zhao Yun · White Dragon',
      role: '◈ 2.5R Martial Circle · Levels Up via Hits & Kills',
      desc: 'Inert until 2 puzzle halves fuse! Gains XP on every hit & kill to level up; Dragon Spear fires full-board spears.',
    },
    guanyu: {
      shard1Name: 'Guan Yu · Puzzle 1/2',
      shard2Name: 'Guan Yu · Puzzle 2/2',
      heroName: 'Guan Yu · Martial Saint',
      role: '☾ 2.4R Martial Circle · Levels Up & Executes',
      desc: 'Inert until 2 puzzle halves fuse! Gains XP from hits & kills, executing low-HP foes outright.',
    },
    zhangfei: {
      shard1Name: 'Zhang Fei · Puzzle 1/2',
      shard2Name: 'Zhang Fei · Puzzle 2/2',
      heroName: 'Zhang Fei · Warcry Titan',
      role: '❖ 2.4R Martial Circle · Levels Up & Quake Stun',
      desc: 'Inert until 2 puzzle halves fuse! Gains XP in combat and stuns surrounding waves & Bosses.',
    },
    zhuge: {
      shard1Name: 'Zhuge Liang · Puzzle 1/2',
      shard2Name: 'Zhuge Liang · Puzzle 2/2',
      heroName: 'Zhuge Liang · Storm Sage',
      role: '☯ 3.5R Mystic Circle · Levels Up & Chain Thunder',
      desc: 'Inert until 2 puzzle halves fuse! Gains XP from hits & kills, calling multi-jump lightning.',
    },
    zhenji: {
      shard1Name: 'Zhen Ji · Puzzle 1/2',
      shard2Name: 'Zhen Ji · Puzzle 2/2',
      heroName: 'Zhen Ji · Frost Consort',
      role: '✻ 3.4R Mystic Circle · Levels Up & Blizzard',
      desc: 'Inert until 2 puzzle halves fuse! Gains XP in battle while freezing whole lanes.',
    },
    shangxiang: {
      shard1Name: 'Shangxiang · Puzzle 1/2',
      shard2Name: 'Shangxiang · Puzzle 2/2',
      heroName: 'Shangxiang · Sky Archer',
      role: '✦ 4.3R Giant Circle · Levels Up & Flame Volley',
      desc: 'Inert until 2 puzzle halves fuse! Gains XP rapidly from multi-arrow flame barrages.',
    },
  },
};

const ZH_DICT: Dict = {
  gameTitle: '千里护主录 · 国风双阵塔防',
  gameSubtitle: '1V1双阵竞速 · 双拼图合武将 · 杀敌升级 · 五格随机刷铲',
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
    '武将需【两块拼图合成】后才可攻击 · 武将攻击与杀敌获经验升级 · 金铲随机刷在下方5格中（更多金铲看广告获取）！',
  commanderRank: (lvl, rankTitle, bonusPct) =>
    `当前军衔：【${rankTitle}】(统帅 Lv.${lvl})  ·  全军战力加成 +${bonusPct}%`,
  maxLevel: '已满阶',
  upgradeBtn: (cost) => `${cost} 金铢购买`,

  armoryTitle: '神兵专武阁 —— 收集过关 Boss 武器碎片 · 锻造并给武将穿戴神兵',
  armoryTip:
    '过关斩杀第5波精英与第10波守关 Boss 必掉【神兵碎片】！集齐 3 片即可锻造神兵并佩戴给武将：上阵后棋牌右下角显示专武图标，并激活超强专武绝技！',
  shardCount: (have, need) => (need === null ? `5★满星 (余${have}片)` : `武器碎片：${have} / ${need}`),
  btnForgeWeapon: (need) => `合成神兵 (${need}片)`,
  btnStarUpWeapon: (need) => `升星精炼 (${need}片)`,
  btnEquipTo: (heroName) => `佩戴给${heroName}`,
  equippedOn: (heroName) => `已装备：${heroName}`,
  unequippedLabel: '点击装备武将',

  codexFusionTitle: '武将双拼图合成：【左拼图 1/2】＋【右拼图 2/2】＝ 真名将（单块拼图不可攻击！实战杀敌升级）',
  codexTroopsTitle: '五大基础兵种 · 圆形攻击范围详解',
  codexSynergyTitle: '军阵奇门羁绊（上阵自动激活）',
  codexRuleTip:
    '按住或点击棋子可查看【圆形攻击范围框】！未合成的武将拼图不可攻击；合成为真武将后每次攻击和杀敌都会涨经验升级（攻击力、攻速、圆圈射程全面成长）！',

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
  btnHeroScrollFree: '赐拼图(免)',
  btnHeroScrollAd: '招贤拼图',
  btnSupplyAd: '+65 馒头',
  talismanLabel: '神兵符',
  talismanReady: '直升一阶!',

  actFarm: '农田',
  actExorcise: '降妖',
  actShovel: '金铲',
  actFortify: '护主',
  shovelAdTag: '🎬广告+2',

  bannerWaveStart: (w) => `第 ${w} 波强敌压境 · 难度攀升！`,
  bannerBossIncoming: (name, trait) => `首领降临：【${name}】(${trait}) · 击杀必掉神兵碎片！`,
  bannerShovelPick: '请点击我方区域的深色石格开辟白玉阵位！',
  bannerBenchShovelPick: '拖动或点击深色石格，即可用备战格【金铲】挖开新阵位！',
  bannerTileUnlocked: '金铲辟地 · 开启全新外圈白玉阵位！',
  bannerShovelRefund: (buns) => `深色石格已全部挖完，多余金铲折算 +${buns} 馒头！`,
  bannerTombRaiderBonus: (buns, gotShard) =>
    gotShard
      ? `摸金校尉触发！挖出 +${buns} 馒头，并惊喜出土 1 枚【神兵碎片】！`
      : `摸金校尉触发！额外挖出 +${buns} 馒头军粮！`,
  bannerShardCannotAttack: '单块武将拼图无法攻击！请集齐【1/2 + 2/2】两块拼图合成真武将',
  bannerHeroLevelUp: (name, lvl) => `✦【${name}】杀敌历练升至 Lv.${lvl}！伤害与射程提升！`,
  bannerTalismanPick: '【神兵符】已出鞘：点击任意士兵或武将，无条件升阶并全军狂暴！',
  bannerTalismanUpgraded: (name, tier) => `神兵符显灵！【${name}】跃升至 ${tier} 阶并攻速狂飙！`,
  bannerExorciseCast: '【降妖符】敕令九天落雷，重创首领并碎裂护甲！',
  bannerMeteorStrike: '【天降陨石】火流星轰击敌群！',
  bannerWeaponShardDrop: (weapName) => `斩杀首领！掉落【${weapName}】碎片 ×1！`,
  bannerZhangJiaoHeal: '张角吟唱太平回血咒！速用【降妖】或高等级名将秒杀！',
  bannerZhangBaoSummon: '张宝施展妖术，召唤黄巾斥候突袭！',
  bannerHeroAwakened: (name) => `双拼图合璧 · 召唤【${name}】(Lv.1) 参战！`,
  bannerRivalAwakened: (name) => `上方对手拼出双图召唤了【${name}】！`,
  bannerRivalFallen: '上方对手阿斗失守！',
  bannerFortified: '铁刺鹿砦重筑，阿斗恢复红心！',
  bannerNeedRations: '馒头不足（每次征兵递增涨价，请及时升级【农田】！）',
  bannerMaxLevel: '已全部开启或升至满阶',

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
  adRewardSupply: '+65 蒸笼馒头粮饷',
  adRewardShovels: '赐 2 把洛阳金铲（可立即挖开外圈石格！）',
  adRewardHero: '定向赐予配对武将另一块拼图（即刻合成真名将！）',
  adRewardSettle: (m) => `战功金铢与历练 x${m} 倍奉还`,

  shovelTile: {
    name: '洛阳金铲',
    role: '【五格随机刷出 · 拖至深色石格辟地】',
    desc: '征兵时随机刷在5个备战格里！拖到我方深色石格即可挖开新阵位；想要更多铲子可点下方【金铲】看广告获取。',
  },
  shardInactiveRole: '【未合成拼图 · 集齐两块合成后才可攻击！】',

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
      subtitle: '经典外路环绕阵！用备战格刷出的金铲挖开外圈石格放近战【刀兵】，内圈放【弓兵】圆圈狙击。',
      bossHint: '镇守首领：第5波 张宝 · 第10波 魔神吕布',
    },
    changban: {
      name: '长坂古桥',
      subtitle: '水陆狭长直道极利【枪兵】穿透与名将刷经验升级！小心第10波张角回血咒，留好【降妖】打断！',
      bossHint: '镇守首领：第5波 张宝 · 第10波 太平张角',
    },
    chibi: {
      name: '赤壁水寨',
      subtitle: '铁索连舟超长防线！敌军波次强度极高，需尽快拼出名将持续杀敌升级并穿戴专武镇守。',
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
      desc: '提高5格刷出金铲概率；每挖开1格石块爆大量馒头，且有概率挖出【神兵碎片】！',
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
      desc: '永久提高征兵刷出武将【左右拼图】的概率，更快合成真名将',
      val: (lvl) => `拼图率 +${(lvl * 4.5).toFixed(1)}%`,
    },
    granary_art: {
      name: '屯田农政',
      shortTag: '农术',
      desc: '大幅加快局内每秒自动产出的蒸笼馒头数量，应对征兵涨价压力',
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
      role: '【圆圈射程：1.5格近战】· 极致重斩',
      desc: '基础伤害断层最高！但圆圈很小仅够打贴身道路，需用金铲挖开外圈石格贴路部署。',
    },
    spear: {
      name: '红缨枪兵',
      role: '【圆圈射程：2.1格中程】· 直线贯穿',
      desc: '中等圆圈射程，刺出破阵枪芒直线贯穿 4 名以上敌军！最适合摆在直道口。',
    },
    lancer: {
      name: '铁浮屠骑',
      role: '【圆圈射程：2.4格机动】· 高频快攻',
      desc: '圆圈覆盖较广且攻速轻快，前中期清理小怪潮性价比极高。',
    },
    archer: {
      name: '雕翎弓兵',
      role: '【圆圈射程：3.4格大圆】· 克制首领',
      desc: '超大圆形射程，缩在安全的内圈白格也能覆盖外围远路，对 Boss 额外 +30% 伤害！',
    },
    mortar: {
      name: '神威火炮',
      role: '【圆环射程：1.2~3.6格】· 破甲重轰',
      desc: '贴身小圈盲区、外围大圆重炮轰炸，范围爆炸无视盾兵厚甲！',
    },
  },

  heroes: {
    zhaoyun: {
      shard1Name: '赵云·左拼图 [1/2]',
      shard2Name: '赵云·右拼图 [2/2]',
      heroName: '真·赵云',
      role: '◈ 2.5格圆圈 · 攻击与杀敌获经验升级',
      desc: '单块拼图不可攻击！集齐两块拼图合成参战，攻击与杀敌不断升级；配【龙胆亮银枪】触发全场飞枪！',
    },
    guanyu: {
      shard1Name: '关羽·左拼图 [1/2]',
      shard2Name: '关羽·右拼图 [2/2]',
      heroName: '真·关羽',
      role: '☾ 2.4格圆圈 · 杀敌升级 · 残血处决',
      desc: '单块拼图不可攻击！集齐两块拼图合成参战，攻击与斩杀敌军飞速升级，重刀秒杀残血敌军！',
    },
    zhangfei: {
      shard1Name: '张飞·左拼图 [1/2]',
      shard2Name: '张飞·右拼图 [2/2]',
      heroName: '真·张飞',
      role: '❖ 2.4格圆圈 · 杀敌升级 · 怒吼群晕',
      desc: '单块拼图不可攻击！集齐两块拼图合成参战，激战升级扩大震地范围，怒吼震晕群怪与 Boss！',
    },
    zhuge: {
      shard1Name: '诸葛·左拼图 [1/2]',
      shard2Name: '诸葛·右拼图 [2/2]',
      heroName: '真·诸葛亮',
      role: '☯ 3.5格大圆 · 杀敌升级 · 九天连环雷',
      desc: '单块拼图不可攻击！集齐两块拼图合成参战，落雷电杀敌群快速升级，电弧在敌阵连环跳跃！',
    },
    zhenji: {
      shard1Name: '甄姬·左拼图 [1/2]',
      shard2Name: '甄姬·右拼图 [2/2]',
      heroName: '真·甄姬',
      role: '✻ 3.4格大圆 · 杀敌升级 · 洛神冰封',
      desc: '单块拼图不可攻击！集齐两块拼图合成参战，寒岚控场杀敌升级，大范围减速冰封整条道路！',
    },
    shangxiang: {
      shard1Name: '尚香·左拼图 [1/2]',
      shard2Name: '尚香·右拼图 [2/2]',
      heroName: '真·孙尚香',
      role: '✦ 4.3格巨圆 · 杀敌升级 · 漫天凤羽箭',
      desc: '单块拼图不可攻击！集齐两块拼图合成参战，超大圆圈齐射火雨，收割人头极快冲刺满级！',
    },
  },
};

export function t(): Dict {
  return currentLang === 'zh' ? ZH_DICT : EN_DICT;
}

export function getUnitDisplayText(unitId: UnitId): UnitText {
  const dict = t();
  if (unitId === 'shovel') {
    return dict.shovelTile;
  }
  if (unitId in dict.troops) {
    return dict.troops[unitId as TroopKey];
  }
  const [prefix, hKey] = unitId.split('_') as ['shard1' | 'shard2' | 'hero', HeroKey];
  const h = dict.heroes[hKey];
  if (prefix === 'shard1') {
    return { name: h.shard1Name, role: dict.shardInactiveRole, desc: h.desc };
  }
  if (prefix === 'shard2') {
    return { name: h.shard2Name, role: dict.shardInactiveRole, desc: h.desc };
  }
  return { name: h.heroName, role: h.role, desc: h.desc };
}
