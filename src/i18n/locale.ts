import { HeroKey, Lang, MetaUpgradeLevels, TroopKey, UnitId } from '../types';

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
  tabCodex: string;
  tabUpgrades: string;
  modeStandard: string;
  modeEndless: string;
  stageCleared: string;
  stageDifficulty: (n: number) => string;
  endlessBest: (w: number) => string;
  endlessReady: string;
  btnPlayStandard: string;
  btnPlayEndless: string;
  hubFooterTip: string;
  commanderRank: (lvl: number, bonusPct: number, xp: number, nextXp: number) => string;
  maxLevel: string;
  upgradeBtn: (cost: number) => string;

  codexFusionTitle: string;
  codexTroopsTitle: string;
  codexSynergyTitle: string;
  codexRuleTip: string;

  rivalTag: string;
  playerTag: string;
  waveLabel: (w: number, maxW: number | null) => string;
  bossName: string;

  btnRecruit: string;
  btnReroll: string;
  btnHeroScrollFree: string;
  btnHeroScrollAd: string;
  btnSupplyAd: string;
  ultReady: string;

  actFarm: string;
  actDecree: string;
  actShovel: string;
  actFortify: string;

  bannerWaveStart: (w: number) => string;
  bannerBoss: string;
  bannerShovelPick: string;
  bannerTileUnlocked: string;
  bannerHeroAwakened: (name: string) => string;
  bannerRivalAwakened: (name: string) => string;
  bannerRivalFallen: string;
  bannerUltCast: string;
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

  stages: Record<string, { name: string; subtitle: string }>;
  upgrades: Record<keyof MetaUpgradeLevels, { name: string; desc: string; val: (lvl: number) => string }>;
  troops: Record<TroopKey, UnitText>;
  heroes: Record<
    HeroKey,
    {
      soulName: string;
      weapName: string;
      heroName: string;
      role: string;
      desc: string;
    }
  >;
}

const EN_DICT: Dict = {
  gameTitle: 'Dynasty Jade Guard',
  gameSubtitle: 'Rival Duel Siege · Fuse Soul + Divine Weapon · Guard the Royal Heir',
  tabStages: 'Passes',
  tabCodex: 'Hero Fusion',
  tabUpgrades: 'Imperial Tech',
  modeStandard: '10-Wave Duel',
  modeEndless: 'Endless Siege',
  stageCleared: 'Cleared',
  stageDifficulty: (n) => `Rank ${'I'.repeat(n)}`,
  endlessBest: (w) => `Best Wave ${w}`,
  endlessReady: 'Survival Duel',
  btnPlayStandard: 'Enter Pass Duel (10 Waves)',
  btnPlayEndless: 'Enter Endless Siege',
  hubFooterTip:
    'Top Half: Live Rival Warlord · Bottom Half: Your Guard · Drag matching [General Soul] + [Divine Weapon] tiles to AWAKEN True Heroes!',
  commanderRank: (lvl, bonusPct, xp, nextXp) =>
    `Grand Marshal Lv.${lvl}  ·  All Unit Might +${bonusPct}%  ·  XP ${xp}/${nextXp}`,
  maxLevel: 'MAX',
  upgradeBtn: (cost) => `${cost} Gold`,

  codexFusionTitle: 'Two-Tile Hero Awakening: [General Soul] + [Divine Weapon] = True General',
  codexTroopsTitle: 'Five Imperial Soldier Crests (Merge Same Tier 1→2→3→4)',
  codexSynergyTitle: 'Battlefield Formation Synergies',
  codexRuleTip:
    'Matching color frames & corner crests pair together! Drag any General Soul tile onto its matching Divine Weapon tile to awaken a Gilded Legendary General.',

  rivalTag: 'RIVAL',
  playerTag: 'YOU',
  waveLabel: (w, maxW) => (maxW ? `Wave ${w} / ${maxW}` : `Endless Wave ${w}`),
  bossName: 'Warlord Lu Bu',

  btnRecruit: 'Conscript',
  btnReroll: 'Refresh',
  btnHeroScrollFree: 'Free Tally',
  btnHeroScrollAd: 'Tiger Tally',
  btnSupplyAd: '+65 Rations',
  ultReady: 'UNLEASH',

  actFarm: 'Granary',
  actDecree: 'Decree',
  actShovel: 'Excavate',
  actFortify: 'Fortify',

  bannerWaveStart: (w) => `Wave ${w} — Drums of War!`,
  bannerBoss: 'Demon Warlord Lu Bu Approaches Both Gates!',
  bannerShovelPick: 'Select a dark basalt stone slot in your half to excavate',
  bannerTileUnlocked: 'White Jade Deploy Pedestal Unlocked!',
  bannerHeroAwakened: (name) => `Awakened: ${name}!`,
  bannerRivalAwakened: (name) => `Rival Awakened ${name}!`,
  bannerRivalFallen: 'Rival Defense Collapsed!',
  bannerUltCast: 'Azure Dragon Sweeps the Pass!',
  bannerFortified: 'Barricade Restored & Royal Heir Healed',
  bannerNeedRations: 'Insufficient Rations',
  bannerMaxLevel: 'Maximum Rank Reached',

  synergyNames: {
    vanguard: 'Vanguard Phalanx',
    marksman: 'Volley Watch',
    mystic: 'Grand Strategy',
    dragon_guard: 'Sworn Generals',
  },
  synergyDescs: {
    vanguard: '2 / 4 Melee & Cavalry types: Global DMG +16% / +36%',
    marksman: '2 / 3 Bow & Crossbow types: Attack Speed +18% / +38%',
    mystic: '2 / 3 Cannon, Frost & Sage types: Skill & AoE DMG +25% / +55%',
    dragon_guard: '2 / 3 Awakened Generals: Faster Skills & +14% / +22% Crit',
  },

  pauseTitle: 'War Council Paused',
  btnResume: 'Resume Battle',
  btnMuteOn: 'Audio: Muted',
  btnMuteOff: 'Audio: Active',
  btnLangSwitch: 'Language: EN / 切换中文',
  btnRetreat: 'Return to Scroll',

  reviveTitle: 'The Royal Cradle Is Breached!',
  reviveSub: (wave, kills) => `Fought to Wave ${wave} · Vanquished ${kills} Raiders`,
  revivePerk1: 'Full-Lane Dragon Clear',
  revivePerk2: '+6 Royal Hearts',
  revivePerk3: 'Rebuild Barricade',
  btnReviveAd: 'Watch Ad · Dragon Rescue',
  btnSkipRevive: 'Conclude Battle',

  victoryTitle: 'Pass Defended · Grand Victory!',
  victoryRivalKoTitle: 'Rival Outlasted · Duel Victory!',
  defeatTitle: 'Campaign Concluded',
  settleSub: (wave, kills, merges) => `Wave ${wave} · ${kills} Slain · ${merges} Syntheses`,
  btnMultClaim: 'Bonus Claim',
  btnNormalClaim: 'Standard Claim',

  mockAdBadge: (placement) => `Preview · Simulated Rewarded Video (${placement})`,
  mockAdCalling: 'Summoning Imperial Tiger Tally...',
  mockAdReward: (title) => `Granting: <strong>${title}</strong>`,
  mockAdTimer: (sec) => `Game paused & muted · ${sec}s remaining`,
  mockAdCancel: 'Cancel',

  adRewardRevive: 'Dragon Rescue + Full Barricade Rebuild',
  adRewardSupply: '+65 Rations + 1 Golden Shovel',
  adRewardShovels: '+2 Golden Shovels',
  adRewardHero: 'Matching Hero Partner Tile (Instant Fusion!)',
  adRewardSettle: (m) => `x${m} Campaign Spoils`,

  stages: {
    hulao: {
      name: 'Hulao Twin Pass',
      subtitle: 'Outlast the rival warlord across the Great Wall parapet as twin legions storm the gates.',
    },
    changban: {
      name: 'Changban Steep Bridge',
      subtitle: 'Hold the jade island amidst misty rapids while your rival defends the northern bank.',
    },
    chibi: {
      name: 'Chibi Chained Armada',
      subtitle: 'Command the southern flagship deck in a fierce survival race against the northern fleet.',
    },
  },

  upgrades: {
    hearts: {
      name: 'Imperial Guard',
      desc: 'Raises starting Royal Hearts and spike barricade durability',
      val: (lvl) => `${10 + lvl * 2} Hearts`,
    },
    granary: {
      name: 'State Granary',
      desc: 'Increases starting Rations and passive grain harvest',
      val: (lvl) => `${30 + lvl * 10} Start`,
    },
    might: {
      name: 'Wootz Forging',
      desc: 'Permanently increases all Soldier and General damage',
      val: (lvl) => `+${lvl * 8}% Might`,
    },
    decree: {
      name: 'Tiger Tally',
      desc: 'Boosts Soul & Divine Weapon appearance rate when conscripting',
      val: (lvl) => `+${lvl * 4}% Hero Rate`,
    },
    shovels: {
      name: 'Gilt Shovels',
      desc: 'Begin battles with extra ceremonial Golden Shovels',
      val: (lvl) => `${1 + Math.floor((lvl + 1) / 2)} Shovels`,
    },
  },

  troops: {
    blade: {
      name: 'Dao Heavy Guard',
      role: 'Curved Broadsword · Sweeping Arc',
      desc: 'Cleaves adjacent enemies with wide crimson ink-blade arcs.',
    },
    archer: {
      name: 'Horn-Bow Marksman',
      role: 'Recurve War-Bow · Rapid Volley',
      desc: 'Long-range rapid archer excelling against swift raiders.',
    },
    lancer: {
      name: 'Iron Cavalry',
      role: 'Armored Steed · Line Pierce',
      desc: 'Drives a shockwave lance straight through multiple foes in a line.',
    },
    mortar: {
      name: 'Dragon Bombard',
      role: 'Bronze Cannon · Armor-Piercing AoE',
      desc: 'Shells enemy clusters with explosive fireballs that shatter heavy shields.',
    },
    frostbow: {
      name: 'Zhuge Frostbow',
      role: 'Repeating Crossbow · Chilling Bolts',
      desc: 'Chills enemy movement speed by 42%, buying time for your generals.',
    },
  },

  heroes: {
    zhaoyun: {
      soulName: 'Soul · Silver Lancer',
      weapName: 'Spear · Dragon Gall',
      heroName: 'Zhao Yun · Azure Dragon',
      role: '◈ Silver-Cyan Pair · Piercing Dragon Surge',
      desc: 'Fuse Silver Lancer + Dragon Spear! Sweeps wide arcs and launches a full-lane Azure Dragon every 4th strike.',
    },
    guanyu: {
      soulName: 'Soul · Crimson Saint',
      weapName: 'Glaive · Green Dragon',
      heroName: 'Guan Yu · Martial God',
      role: '☾ Jade-Green Pair · Instant Execute',
      desc: 'Fuse Crimson Saint + Crescent Glaive! Executes wounded foes (<22% HP) outright and hurls emerald dragon waves.',
    },
    zhangfei: {
      soulName: 'Soul · Fierce Tiger',
      weapName: 'Pike · Coiled Serpent',
      heroName: 'Zhang Fei · Warcry Titan',
      role: '❖ Flame-Iron Pair · Quake Stun',
      desc: 'Fuse Fierce Tiger + Serpent Pike! Unleashes fiery warcry tremors that stun all surrounding invaders.',
    },
    zhuge: {
      soulName: 'Soul · Star Strategist',
      weapName: 'Fan · Eight Trigrams',
      heroName: 'Zhuge Liang · Storm Sage',
      role: '☯ Gold-Indigo Pair · Chain Thunder',
      desc: 'Fuse Star Strategist + Feather Fan! Summons celestial lightning jumping across up to 6 enemies.',
    },
    zhenji: {
      soulName: 'Soul · River Consort',
      weapName: 'Flute · Frost Lotus',
      heroName: 'Zhen Ji · Ice Empress',
      role: '✻ Sapphire Pair · Lotus Blizzard',
      desc: 'Fuse River Consort + Frost Flute! Blankets the road in freezing lotus storms that immobilize waves.',
    },
    shangxiang: {
      soulName: 'Soul · Plumed Maiden',
      weapName: 'Bow · Vermilion Phoenix',
      heroName: 'Shangxiang · Fire Phoenix',
      role: '✦ Crimson-Gold Pair · Blazing Barrage',
      desc: 'Fuse Plumed Maiden + Phoenix Bow! Fires multi-arrow flame volleys across the entire half-board.',
    },
  },
};

const ZH_DICT: Dict = {
  gameTitle: '千里护主录 · 国风双阵对决',
  gameSubtitle: '上下双阵同波竞速 · 将魂神兵二合一觉醒 · 无字纹章全球通识',
  tabStages: '烽火雄关',
  tabCodex: '名将合璧谱',
  tabUpgrades: '中军武库',
  modeStandard: '十波竞速对决',
  modeEndless: '无尽死守模式',
  stageCleared: '已破关',
  stageDifficulty: (n) => `险度 ${'★'.repeat(n)}`,
  endlessBest: (w) => `最高 ${w} 波`,
  endlessReady: '极限竞速',
  btnPlayStandard: '擂鼓出阵（十波对决）',
  btnPlayEndless: '死守雄关（无尽敌潮）',
  hubFooterTip:
    '上方为 AI 对手实时布阵，下方为我军防线 · 拖拽同色系【名将将魂】+【本命神兵】两牌合璧，即可觉醒无双真名将！',
  commanderRank: (lvl, bonusPct, xp, nextXp) =>
    `中军统帅 Lv.${lvl}  ·  全军战力加成 +${bonusPct}%  ·  历练 ${xp}/${nextXp}`,
  maxLevel: '已臻化境',
  upgradeBtn: (cost) => `${cost} 金铢精研`,

  codexFusionTitle: '名将双牌合璧谱：【将魂牌】＋【本命神兵牌】＝ 觉醒无双真名将',
  codexTroopsTitle: '五营精锐兵种（同阶二合一升阶 1→2→3→4）',
  codexSynergyTitle: '军阵奇门羁绊（上阵自动激活）',
  codexRuleTip:
    '无需任何汉字！每尊名将拥有专属配色边框与角标徽记：将左半璧【将魂头像牌】与右半璧【专属神兵牌】拖拽重叠，即刻合璧化为鎏金真名将！',

  rivalTag: '敌阵对手',
  playerTag: '我方大营',
  waveLabel: (w, maxW) => (maxW ? `第 ${w} / ${maxW} 波` : `无尽第 ${w} 波`),
  bossName: '魔神·吕布',

  btnRecruit: '征召兵马',
  btnReroll: '换防重募',
  btnHeroScrollFree: '赐虎符(免)',
  btnHeroScrollAd: '招贤虎符',
  btnSupplyAd: '+65 军粮',
  ultReady: '苍龙破!',

  actFarm: '屯田',
  actDecree: '招贤',
  actShovel: '金铲',
  actFortify: '固防',

  bannerWaveStart: (w) => `第 ${w} 波敌军擂鼓攻关！`,
  bannerBoss: '温侯吕布魔影亲临，双阵同受考验！',
  bannerShovelPick: '请点击下方我军区域的深色青石格开辟玉台',
  bannerTileUnlocked: '已辟出全新羊脂白玉阵位！',
  bannerHeroAwakened: (name) => `神兵认主 · 【${name}】真身觉醒！`,
  bannerRivalAwakened: (name) => `上方对手合璧觉醒了【${name}】！`,
  bannerRivalFallen: '上方对手防线告破！',
  bannerUltCast: '龙胆亮银 · 苍龙横扫千军！',
  bannerFortified: '鹿砦重筑，幼主安泰！',
  bannerNeedRations: '军粮不足，可静待屯田产出',
  bannerMaxLevel: '此策已升至满阶',

  synergyNames: {
    vanguard: '锋矢铁卫',
    marksman: '神臂齐射',
    mystic: '奇门遁甲',
    dragon_guard: '五虎群英',
  },
  synergyDescs: {
    vanguard: '上阵 2 / 4 种刀骑猛将系：全军伤害 +16% / +36%',
    marksman: '上阵 2 / 3 种弓弩远程系：全军攻速 +18% / +38%',
    mystic: '上阵 2 / 3 种火炮奇谋系：技能与范围伤害 +25% / +55%',
    dragon_guard: '觉醒 2 / 3 尊以上真名将：大招加速且暴击 +14% / +22%',
  },

  pauseTitle: '军帐议事（已暂停）',
  btnResume: '继续督战',
  btnMuteOn: '金鼓音效：关闭',
  btnMuteOff: '金鼓音效：开启',
  btnLangSwitch: '界面语言：中文 / Switch EN',
  btnRetreat: '班师回朝（返回画卷）',

  reviveTitle: '鹿砦失守 · 幼主危急！',
  reviveSub: (wave, kills) => `血战至第 ${wave} 波 · 斩敌 ${kills} 级`,
  revivePerk1: '苍龙清扫我方全路',
  revivePerk2: '恢复 6 颗护主丹心',
  revivePerk3: '满耐久重筑铁刺鹿砦',
  btnReviveAd: '单骑救主（激励救援）',
  btnSkipRevive: '收兵论功结算',

  victoryTitle: '雄关屹立 · 护主大捷！',
  victoryRivalKoTitle: '对手溃败 · 竞速完胜！',
  defeatTitle: '沙场论功结算',
  settleSub: (wave, kills, merges) => `第 ${wave} 波 · 斩敌 ${kills} · 合璧升阶 ${merges} 次`,
  btnMultClaim: '虎符翻倍领赏',
  btnNormalClaim: '常规领赏',

  mockAdBadge: (placement) => `开发预览 · 模拟激励视频 (${placement})`,
  mockAdCalling: '八百里加急传召虎符援军...',
  mockAdReward: (title) => `即将赐予：<strong>${title}</strong>`,
  mockAdTimer: (sec) => `战局已静音暂停 · 尚余 ${sec} 秒`,
  mockAdCancel: '婉拒赏赐',

  adRewardRevive: '单骑救主清场 + 鹿砦重筑',
  adRewardSupply: '+65 军粮笼包 + 赐 1 把金铲',
  adRewardShovels: '赐 2 把开山金铲',
  adRewardHero: '定向赐予配对将魂/神兵牌（即刻合璧名将！）',
  adRewardSettle: (m) => `战功赏金 x${m} 倍奉还`,

  stages: {
    hulao: {
      name: '虎牢雄关',
      subtitle: '长城城垛横贯南北！上方 AI 对手与我方同守双关，比拼布阵合璧之术。',
    },
    changban: {
      name: '长坂古桥',
      subtitle: '青绿山水湍流栈桥！与北岸对手同波竞速，扼守白玉河洲力护幼主。',
    },
    chibi: {
      name: '赤壁水寨',
      subtitle: '铁索连舟烽火对垒！南北战船甲板镜像迎敌，善用名将绝技横扫敌潮。',
    },
  },

  upgrades: {
    hearts: {
      name: '羽林宿卫',
      desc: '永久提升我方幼主初始红心与铁刺鹿砦耐久',
      val: (lvl) => `${10 + lvl * 2} 颗丹心`,
    },
    granary: {
      name: '常平丰仓',
      desc: '开局自带更多蒸笼军粮并加快每秒产粮效率',
      val: (lvl) => `开局 ${30 + lvl * 10} 粮`,
    },
    might: {
      name: '百炼玄铁',
      desc: '永久提升所有兵种与觉醒名将的基础杀伤',
      val: (lvl) => `战力 +${lvl * 8}%`,
    },
    decree: {
      name: '求贤金印',
      desc: '永久提高征兵刷出名将【将魂/神兵】的概率',
      val: (lvl) => `名将率 +${lvl * 4}%`,
    },
    shovels: {
      name: '摸金玉铲',
      desc: '每局出阵额外获赠免费开山金铲扩建玉台',
      val: (lvl) => `开局 ${1 + Math.floor((lvl + 1) / 2)} 把`,
    },
  },

  troops: {
    blade: {
      name: '玄铁刀卫',
      role: '赤穗环首刀 · 近身群斩',
      desc: '挥动沉重环首大刀横扫近身敌军，前期稳固防线利器。',
    },
    archer: {
      name: '雕翎弓手',
      role: '角弓狼牙箭 · 疾速点射',
      desc: '远射程高频攒射，精准狙杀疾风狼骑斥候。',
    },
    lancer: {
      name: '铁浮屠骑',
      role: '重甲战马 · 破阵贯穿',
      desc: '红缨铁枪刺出劲气，直线贯穿整列来犯敌卒。',
    },
    mortar: {
      name: '神威龙炮',
      role: '铜铸龙口炮 · 破甲轰炸',
      desc: '轰出赤焰震天雷，大范围溅射并对重盾铁卫造成额外重创。',
    },
    frostbow: {
      name: '诸葛寒弩',
      role: '玄冰连弩 · 迟滞敌军',
      desc: '劲射寒铁冰矢，令敌军步履维艰，配合名将收割。',
    },
  },

  heroes: {
    zhaoyun: {
      soulName: '将魂·白马银枪',
      weapName: '神兵·龙胆亮银枪',
      heroName: '真·赵云（苍龙枪神）',
      role: '◈ 苍蓝配对 · 七进七出苍龙破',
      desc: '【银甲将魂】+【龙胆银枪】合璧觉醒！大范围银枪横扫，每4击召唤苍龙虚影贯穿全路！',
    },
    guanyu: {
      soulName: '将魂·美髯丹凤',
      weapName: '神兵·青龙偃月刀',
      heroName: '真·关羽（威震华夏）',
      role: '☾ 翡翠配对 · 青龙残血立斩',
      desc: '【红脸将魂】+【青龙大刀】合璧觉醒！霸道青龙刀气对低于22%血量敌卒直接一刀斩杀！',
    },
    zhangfei: {
      soulName: '将魂·燕颔虎须',
      weapName: '神兵·丈八点钢矛',
      heroName: '真·张飞（当阳怒吼）',
      role: '❖ 赤焰配对 · 虎啸震地眩晕',
      desc: '【猛张飞将魂】+【丈八蛇矛】合璧觉醒！烈焰矛影横扫，周期爆发当阳怒吼震晕群敌！',
    },
    zhuge: {
      soulName: '将魂·纶巾卧龙',
      weapName: '神兵·八卦白羽扇',
      heroName: '真·诸葛亮（奇门天雷）',
      role: '☯ 紫金配对 · 九天八卦落雷',
      desc: '【卧龙将魂】+【八卦羽扇】合璧觉醒！挥扇引动紫金神雷，在多达6名敌军间连环弹跳！',
    },
    zhenji: {
      soulName: '将魂·洛水仙妃',
      weapName: '神兵·寒玉冰莲笛',
      heroName: '真·甄姬（洛神凝冰）',
      role: '✻ 冰蓝配对 · 冰莲千里雪封',
      desc: '【洛神将魂】+【冰莲玉笛】合璧觉醒！吹奏洛水寒岚群体减速，并将路径敌潮彻底冰封！',
    },
    shangxiang: {
      soulName: '将魂·枭姬凤翎',
      weapName: '神兵·丹凤烈焰弓',
      heroName: '真·孙尚香（火凤燎原）',
      role: '✦ 朱红配对 · 漫天凤羽火雨',
      desc: '【凤翎将魂】+【烈焰宝弓】合璧觉醒！展翅齐射漫天火凤羽箭，超远覆盖并持续灼烧！',
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
  const [prefix, hKey] = unitId.split('_') as ['soul' | 'weap' | 'hero', HeroKey];
  const h = dict.heroes[hKey];
  if (prefix === 'soul') {
    return { name: h.soulName, role: h.role, desc: h.desc };
  }
  if (prefix === 'weap') {
    return { name: h.weapName, role: h.role, desc: h.desc };
  }
  return { name: h.heroName, role: h.role, desc: h.desc };
}
