import { Lang, MetaUpgradeLevels, UnitId } from '../types';

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

  codexTroopsTitle: string;
  codexHeroesTitle: string;
  codexSynergyTitle: string;
  codexRuleTip: string;

  waveLabel: (w: number, maxW: number | null) => string;
  bossIncoming: string;
  bossName: string;
  miniBossName: string;

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
  shovelPrompt: string;
  recycleLabel: string;

  bannerWaveStart: (w: number) => string;
  bannerBoss: string;
  bannerShovelPick: string;
  bannerTileUnlocked: string;
  bannerHeroAwakened: (name: string) => string;
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
  units: Record<UnitId, UnitText>;
}

const EN_DICT: Dict = {
  gameTitle: 'Dynasty Tile Guard',
  gameSubtitle: 'Merge War-Tiles · Command Iconic Heroes · Protect the Baby Heir!',
  tabStages: '🗺️ Battlefields',
  tabCodex: '📖 Hero Codex',
  tabUpgrades: '⚡ Citadel Tech',
  modeStandard: '🛡️ 10-Wave Siege',
  modeEndless: '♾️ Endless Horde',
  stageCleared: '✅ Cleared',
  stageDifficulty: (n) => `Difficulty ★${n}`,
  endlessBest: (w) => `Best Wave ${w}`,
  endlessReady: 'Survival Mode',
  btnPlayStandard: '▶ Defend Pass (10 Waves)',
  btnPlayEndless: '▶ Enter Endless Siege',
  hubFooterTip:
    '💡 Drag identical tiles to MERGE (1→2→3→4★) · Use Golden Shovels to unlock dark stone slots · Zero-text universal crests!',
  commanderRank: (lvl, bonusPct, xp, nextXp) =>
    `🎖️ Warlord Lv.${lvl} (All Unit DMG +${bonusPct}% · XP ${xp}/${nextXp})`,
  maxLevel: 'MAXED',
  upgradeBtn: (cost) => `🪙 ${cost} Upgrade`,

  codexTroopsTitle: '⚔️ Vanguard & Ranged Troop Tiles (Universal Weapon Crests)',
  codexHeroesTitle: '👑 Legendary Dynasty Heroes (Gilded Aura Tiles)',
  codexSynergyTitle: '☯️ Automatic Formation Synergies',
  codexRuleTip:
    'Recruit tiles into your 5-slot Barracks Tent, drag onto White Jade slots, and merge matching tiles of the same Tier! Upgrade Royal Decree in battle to summon more Legendary Heroes.',

  waveLabel: (w, maxW) => (maxW ? `Wave ${w}/${maxW}` : `Wave ${w} ∞`),
  bossIncoming: '⚠️ DEMON WARLORD APPROACHING!',
  bossName: '👹 Demon Warlord',
  miniBossName: '🐏 Siege Ram',

  btnRecruit: 'Recruit',
  btnReroll: 'Refresh',
  btnHeroScrollFree: '🎁 Free Hero',
  btnHeroScrollAd: '🎬 Hero Summon',
  btnSupplyAd: '🎬 +65 🍙',
  ultReady: 'READY!',

  actFarm: 'Granary',
  actDecree: 'Promote',
  actShovel: 'Shovel',
  actFortify: 'Guard',
  shovelPrompt: 'Tap any DARK STONE cell to unlock!',
  recycleLabel: 'Sell +🍙',

  bannerWaveStart: (w) => `⚔️ Wave ${w} Assault!`,
  bannerBoss: '👹 Demon Warlord Lu Bu Enters!',
  bannerShovelPick: '🪏 Tap a Dark Stone Tile to Excavate!',
  bannerTileUnlocked: '✨ New Jade Deploy Slot Unlocked!',
  bannerHeroAwakened: (name) => `🌟 ${name} Joined the Guard!`,
  bannerUltCast: '🐉 Silver Dragon Crescent Storm!',
  bannerFortified: '🛡️ Barricades Rebuilt & Heir Healed!',
  bannerNeedRations: '🍙 Need More Rice Rations!',
  bannerMaxLevel: '✨ Already at Max Level!',

  synergyNames: {
    vanguard: 'Vanguard Pact',
    marksman: 'Volley Formation',
    mystic: 'Mystic Wisdom',
    dragon_guard: 'Dragon Guardians',
  },
  synergyDescs: {
    vanguard: '2 / 4 Melee & Cavalry types: All DMG +16% / +35%',
    marksman: '2 / 4 Bow & Crossbow types: Attack Speed +18% / +38%',
    mystic: '2 / 4 Cannon, Frost & Sage types: Skill & AoE DMG +25% / +55%',
    dragon_guard: '3+ Unique Heroes on board: Hero Skill Rate +35% & Global Crit +15%',
  },

  pauseTitle: '⏸ Battle Paused',
  btnResume: '▶ Resume Battle',
  btnMuteOn: '🔇 Sound: Muted',
  btnMuteOff: '🔊 Sound: On',
  btnLangSwitch: '🌐 Language: English (切中文)',
  btnRetreat: '🏠 Retreat to Hub',

  reviveTitle: '🚨 The Baby Heir Is in Danger!',
  reviveSub: (wave, kills) => `Held until Wave ${wave} · Defeated ${kills} Invaders`,
  revivePerk1: '🐉 Full-Map Dragon Wipe',
  revivePerk2: '❤️ Restore +6 Royal Hearts',
  revivePerk3: '🛡️ Rebuild All Barricades',
  btnReviveAd: '🎬 Dragon Rescue Revive',
  btnSkipRevive: 'Settle Rewards',

  victoryTitle: '🏆 Heir Protected · Victory!',
  defeatTitle: '🎖️ Siege Concluded',
  settleSub: (wave, kills, merges) => `Wave ${wave} · ${kills} Defeated · ${merges} Merges`,
  btnMultClaim: '🎬 Bonus Claim',
  btnNormalClaim: 'Claim Rewards',

  mockAdBadge: (placement) => `Dev Preview · Simulated Rewarded Video (${placement})`,
  mockAdCalling: '🐉 Summoning Imperial Reinforcements...',
  mockAdReward: (title) => `Unlocking: <strong>${title}</strong>`,
  mockAdTimer: (sec) => `Game auto-paused & muted · ${sec}s remaining`,
  mockAdCancel: 'Cancel',

  adRewardRevive: 'Dragon Rescue + Full Barricade Rebuild',
  adRewardSupply: '+65 Rice Rations + 1 Golden Shovel',
  adRewardShovels: '+2 Golden Shovels',
  adRewardHero: 'Guaranteed Legendary Hero Tile',
  adRewardSettle: (m) => `x${m} Battle Rewards Multiplier`,

  stages: {
    hulao: {
      name: 'Hulao Twin Gate',
      subtitle: 'Classic twin-flank pass! Guard both Royal Cradles from pincer siege waves.',
    },
    changban: {
      name: 'Changban Dragon Bridge',
      subtitle: 'Winding river crossing! Hold the central jade island to shred bridge raiders.',
    },
    chibi: {
      name: 'Chibi Chained Fleet',
      subtitle: 'Twin warship gangplanks converging on the Imperial Flagship Cradle!',
    },
  },

  upgrades: {
    hearts: {
      name: 'Royal Guard Escort',
      desc: 'Increases Young Lord starting Hearts & Barricade durability',
      val: (lvl) => `❤️ ${10 + lvl * 2} Hearts`,
    },
    granary: {
      name: 'Imperial Granary',
      desc: 'Start battles with extra Rice Rations & faster passive income',
      val: (lvl) => `🍙 ${28 + lvl * 10} Start`,
    },
    might: {
      name: 'Forged Steel',
      desc: 'Permanently boosts all Troop & Hero damage',
      val: (lvl) => `+${lvl * 8}% DMG`,
    },
    decree: {
      name: 'Noble Prestige',
      desc: 'Boosts base Legendary Hero draft chance in Barracks',
      val: (lvl) => `+${lvl * 3.5}% Hero Rate`,
    },
    shovels: {
      name: 'Pioneer Shovels',
      desc: 'Begin every battle with extra free Golden Shovels',
      val: (lvl) => `🪏 ${1 + Math.floor((lvl + 1) / 2)} Start`,
    },
  },

  units: {
    blade: {
      name: 'Dao Vanguard',
      role: 'Crimson Broadsword · AoE Slash',
      desc: 'Sweeps a wide crimson blade arc hitting nearby enemies with fast cleaves.',
    },
    archer: {
      name: 'Jade Marksman',
      role: 'Emerald War-Bow · Rapid Volley',
      desc: 'Long-range rapid archer with high attack speed and sharp single-target DPS.',
    },
    lancer: {
      name: 'Heavy Lancer',
      role: 'Cobalt Warhorse · Piercing Line',
      desc: 'Hurls a shockwave cavalry lance that pierces straight through multiple foes.',
    },
    mortar: {
      name: 'Dragon Bombard',
      role: 'Violet Cannon · Explosive AoE',
      desc: 'Shells enemy clusters with heavy splash explosions that crush armored shields.',
    },
    frostbow: {
      name: 'Frost Sentinel',
      role: 'Cyan Crossbow · Chilling Slow',
      desc: 'Fires ice-crystal bolts that slow enemy movement by up to 45%.',
    },
    zhaoyun: {
      name: 'Zhao Yun · Silver Dragon',
      role: 'Silver Dragon Helm · Sweeping Dash',
      desc: 'Unleashes piercing azure dragon arcs; every 4th strike launches a full-lane Dragon Surge!',
    },
    guanyu: {
      name: 'Guan Yu · Jade War God',
      role: 'Crimson Face & Green Glaive · Execute',
      desc: 'Devastating crescent cleaves; instantly executes non-boss enemies below 20% HP!',
    },
    zhangfei: {
      name: 'Zhang Fei · Roar Berserker',
      role: 'Lion Mane & Serpent Pike · AoE Stun',
      desc: 'Every 4th attack slams a Warcry Quake around him, stunning nearby foes!',
    },
    zhenji: {
      name: 'Zhen Ji · Frost Empress',
      role: 'Ice Lotus Crown · Blizzard Freeze',
      desc: 'Casts Frozen Lotus vortexes that chill groups and freeze enemies solid!',
    },
    zhuge: {
      name: 'Zhuge Liang · Storm Sage',
      role: 'Star Crown & Feather Fan · Chain Bolt',
      desc: 'Calls down golden-blue Chain Lightning bouncing across up to 6 enemies!',
    },
    shangxiang: {
      name: 'Shangxiang · Phoenix Bow',
      role: 'Twin Red Plumes · Fire Arrow Rain',
      desc: 'Fires multi-arrow blazing volleys that ignite enemies over time!',
    },
  },
};

const ZH_DICT: Dict = {
  gameTitle: '少主护卫战 · 全球纹章版',
  gameSubtitle: '零汉字高辨识纹章棋子 · 名将脸谱合成 · 誓死护卫襁褓少主！',
  tabStages: '🗺️ 战役选关',
  tabCodex: '📖 兵种武将图鉴',
  tabUpgrades: '⚡ 主公科技',
  modeStandard: '🛡️ 10波守关',
  modeEndless: '♾️ 无尽尸潮/敌潮',
  stageCleared: '✅ 已通关',
  stageDifficulty: (n) => `难度 ★${n}`,
  endlessBest: (w) => `最高 ${w} 波`,
  endlessReady: '极限生存',
  btnPlayStandard: '▶ 出征护主 (10波)',
  btnPlayEndless: '▶ 挑战无尽敌潮',
  hubFooterTip:
    '💡 拖拽相同同阶棋子二合一升阶 (1→2→3→4★) · 金铲子可挖开深色石格 · 棋盘纯图标零汉字全球通用！',
  commanderRank: (lvl, bonusPct, xp, nextXp) =>
    `🎖️ 统帅等级 Lv.${lvl}（全军伤害 +${bonusPct}% · 经验 ${xp}/${nextXp}）`,
  maxLevel: '已满级',
  upgradeBtn: (cost) => `🪙 ${cost} 升级`,

  codexTroopsTitle: '⚔️ 五大基础兵种（去汉字冷兵器纹章，一眼辨识）',
  codexHeroesTitle: '👑 六大传奇名将（鎏金边框 + 鲜明头饰脸谱）',
  codexSynergyTitle: '☯️ 自动阵营羁绊（上阵即生效）',
  codexRuleTip:
    '点击「征兵」在下方 5 格兵营刷出棋子，拖拽至白色玉石格部署，同兵种同阶即可二合一升阶！局内升级「升职诏书」可大幅提高传奇名将刷新率。',

  waveLabel: (w, maxW) => (maxW ? `第 ${w}/${maxW} 波` : `无尽第 ${w} 波`),
  bossIncoming: '⚠️ 魔神吕布率精锐来袭！',
  bossName: '👹 魔神吕布',
  miniBossName: '🐏 攻城冲车',

  btnRecruit: '征兵',
  btnReroll: '换一批',
  btnHeroScrollFree: '🎁 免费名将',
  btnHeroScrollAd: '🎬 必出名将',
  btnSupplyAd: '🎬 +65 粮草',
  ultReady: '可释放!',

  actFarm: '屯田',
  actDecree: '升职',
  actShovel: '金铲',
  actFortify: '护主',
  shovelPrompt: '请点击任意深色石块格挖开空位！',
  recycleLabel: '回收 +🍙',

  bannerWaveStart: (w) => `⚔️ 第 ${w} 波敌军压境！`,
  bannerBoss: '👹 魔神吕布驾临战场！',
  bannerShovelPick: '🪏 点击棋盘上的深色石格即可扩建部署位！',
  bannerTileUnlocked: '✨ 成功开辟新的白玉部署格！',
  bannerHeroAwakened: (name) => `🌟 传奇名将【${name}】入阵！`,
  bannerUltCast: '🐉 神兵现世 · 银龙横扫千军！',
  bannerFortified: '🛡️ 拒马重筑 & 少主恢复体力！',
  bannerNeedRations: '🍙 粮草不足，请稍候或升级屯田！',
  bannerMaxLevel: '✨ 该项已达本局最高等级！',

  synergyNames: {
    vanguard: '锋矢近卫',
    marksman: '神射齐发',
    mystic: '奇门天机',
    dragon_guard: '护主龙将',
  },
  synergyDescs: {
    vanguard: '上阵 2 / 4 种近战骑兵系：全军伤害 +16% / +35%',
    marksman: '上阵 2 / 4 种弓弩远程系：全军攻速 +18% / +38%',
    mystic: '上阵 2 / 4 种火炮冰法系：技能与范围伤害 +25% / +55%',
    dragon_guard: '同时在场 3 名以上不同名将：名将大招频率 +35% 且暴击 +15%',
  },

  pauseTitle: '⏸ 战局已暂停',
  btnResume: '▶ 继续战斗',
  btnMuteOn: '🔇 音效：已静音',
  btnMuteOff: '🔊 音效：开启中',
  btnLangSwitch: '🌐 语言：中文 (Switch EN)',
  btnRetreat: '🏠 撤回主城大厅',

  reviveTitle: '🚨 少主危在旦夕！',
  reviveSub: (wave, kills) => `鏖战至第 ${wave} 波 · 已歼敌 ${kills} 名`,
  revivePerk1: '🐉 银龙全屏清场',
  revivePerk2: '❤️ 少主恢复 6 颗红心',
  revivePerk3: '🛡️ 全路拒马满血重筑',
  btnReviveAd: '🎬 单骑救主复活',
  btnSkipRevive: '直接结算',

  victoryTitle: '🏆 护主大捷 · 凯旋！',
  defeatTitle: '🎖️ 战役结算',
  settleSub: (wave, kills, merges) => `坚守第 ${wave} 波 · 歼敌 ${kills} · 合成 ${merges} 次`,
  btnMultClaim: '🎬 翻倍领取',
  btnNormalClaim: '普通领取',

  mockAdBadge: (placement) => `开发调试 · 模拟激励视频 (${placement})`,
  mockAdCalling: '🐉 正在传召虎符援军...',
  mockAdReward: (title) => `即将解锁：<strong>${title}</strong>`,
  mockAdTimer: (sec) => `游戏已自动静音并暂停 · 剩余 ${sec} 秒`,
  mockAdCancel: '放弃奖励',

  adRewardRevive: '单骑救主清场 + 拒马全满修复',
  adRewardSupply: '+65 粮草补给 + 赠送 1 把金铲子',
  adRewardShovels: '紧急空投 +2 把金铲子',
  adRewardHero: '必出一名随机传奇名将棋子',
  adRewardSettle: (m) => `结算奖励 x${m} 倍暴击领取`,

  stages: {
    hulao: {
      name: '虎牢双关',
      subtitle: '致敬经典双路雄关！左右双路包抄，合理布阵守护两侧襁褓少主。',
    },
    changban: {
      name: '长坂龙桥',
      subtitle: '湍流S型栈桥要道！抢占河心白玉台，交叉火力阻断追兵。',
    },
    chibi: {
      name: '赤壁连环寨',
      subtitle: '双舷铁索甲板合围中军旗舰，善用范围火炮与名将控制锁死敌潮！',
    },
  },

  upgrades: {
    hearts: {
      name: '御林铁卫',
      desc: '永久提升少主初始红心上限与拒马耐久',
      val: (lvl) => `❤️ ${10 + lvl * 2} 颗心`,
    },
    granary: {
      name: '开局粮仓',
      desc: '每局自带更多初始粮草并加快基础产粮',
      val: (lvl) => `🍙 ${28 + lvl * 10} 开局`,
    },
    might: {
      name: '百炼神兵',
      desc: '永久提升所有兵种与名将棋子基础伤害',
      val: (lvl) => `+${lvl * 8}% 伤害`,
    },
    decree: {
      name: '名望虎符',
      desc: '永久提升征兵刷新出传奇名将的基础概率',
      val: (lvl) => `+${lvl * 3.5}% 名将率`,
    },
    shovels: {
      name: '开疆金铲',
      desc: '每局开战额外附赠免费金铲子用于扩建格子',
      val: (lvl) => `🪏 开局 ${1 + Math.floor((lvl + 1) / 2)} 把`,
    },
  },

  units: {
    blade: {
      name: '环首刀卫',
      role: '赤红战刀 · 近程横扫',
      desc: '挥舞赤红弧光刀气，同时斩击周围路径上的多名敌军。',
    },
    archer: {
      name: '翠竹神弓',
      role: '翡翠长弓 · 高频点射',
      desc: '超远射程急速连射，擅长精准收割残血与高速斥候。',
    },
    lancer: {
      name: '玄甲铁骑',
      role: '苍蓝战马 · 直线贯穿',
      desc: '刺出破空骑枪冲击波，直线贯穿路径上一整排敌军并附带击退。',
    },
    mortar: {
      name: '紫金神炮',
      role: '紫金火炮 · 范围轰炸',
      desc: '发射高爆轰天雷，大范围溅射爆炸，克制重甲盾卫集群。',
    },
    frostbow: {
      name: '玄冰连弩',
      role: '寒冰劲弩 · 减速控制',
      desc: '发射寒霜冰晶箭，大幅降低敌军移速，为全队创造输出空间。',
    },
    zhaoyun: {
      name: '赵云 · 银龙枪神',
      role: '银翼龙盔 · 苍龙破阵',
      desc: '挥洒大范围银蓝枪芒；每第 4 击召唤贯穿整条战线的苍龙虚影！',
    },
    guanyu: {
      name: '关羽 · 青龙武圣',
      role: '丹凤红脸 · 偃月斩杀',
      desc: '霸道翡翠刀气横劈；对低于 20% 血量的非首领敌军直接触发一刀斩杀！',
    },
    zhangfei: {
      name: '张飞 · 咆哮猛将',
      role: '狂狮黑髯 · 震地眩晕',
      desc: '丈八蛇矛重击周围；每第 4 击爆发当阳怒吼，震晕范围内全部敌军！',
    },
    zhenji: {
      name: '甄姬 · 洛水冰姬',
      role: '冰莲凤冠 · 极寒冰封',
      desc: '召唤洛水冰莲风暴，群体减速并周期性将路径敌军彻底冰封！',
    },
    zhuge: {
      name: '诸葛亮 · 卧龙天师',
      role: '星冠羽扇 · 八卦连环雷',
      desc: '挥动白羽扇引动九天神雷，闪电链在最多 6 名敌军之间弹跳轰击！',
    },
    shangxiang: {
      name: '孙尚香 · 凤羽弓姬',
      role: '双红凤翎 · 烈焰箭雨',
      desc: '同时齐射多支烈焰凤羽箭，覆盖超远距离并持续灼烧敌军！',
    },
  },
};

export function t(): Dict {
  return currentLang === 'zh' ? ZH_DICT : EN_DICT;
}
