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

export function syncDocumentAppMeta(lang: Lang): void {
  if (typeof document === 'undefined') return;
  const isZh = lang === 'zh';
  document.documentElement.lang = isZh ? 'zh-CN' : 'en';
  document.title = isZh ? '千里护主录' : 'Dynasty Jade Guard';
  const shortName = isZh ? '千里护主录' : 'Jade Guard';
  const appleMeta = document.getElementById('meta-apple-title');
  if (appleMeta) appleMeta.setAttribute('content', shortName);
  const appMeta = document.getElementById('meta-app-name');
  if (appMeta) appMeta.setAttribute('content', shortName);
  const mf = document.getElementById('app-manifest');
  if (mf) mf.setAttribute('href', isZh ? './manifest.zh.json?v=1' : './manifest.en.json?v=1');
}

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  syncDocumentAppMeta(lang);
}

export interface UnitText {
  name: string;
  role: string;
  desc: string;
}

interface Dict {
  appShortName: string;
  installAppBtn: string;
  installBadgeTag: string;
  installModalTitle: string;
  installModalSub: string;
  installWechatStep1: string;
  installWechatStep2: string;
  installIosStep1: string;
  installIosStep2: string;
  installAndroidStep1: string;
  installAndroidStep2: string;
  installDesktopStep1: string;
  installDesktopStep2: string;
  installNativeBtn: string;
  installCopyUrlBtn: string;
  installUrlCopied: string;
  installGotItBtn: string;
  gameTitle: string;
  gameSubtitle: string;
  tabStages: string;
  tabDuel: string;
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
  btnConfirmOverwrite: string;
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
  bannerLockedStoneHint: string;
  bannerTileUnlocked: string;
  bannerShovelRefund: (buns: number) => string;
  bannerTombRaiderBonus: (buns: number, gotShard: boolean) => string;
  bannerShardCannotAttack: string;
  bannerNeedTwoCellsForHero: string;
  bannerHeroCannotBench: string;
  bannerHeroAlreadyActive: (name: string) => string;
  bannerHeroShardUpgraded: (name: string, lvl: number, tier: number) => string;
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
  bannerConfirmBenchOverwrite: string;
  bannerTentRecycleHint: string;
  bannerUnitRecycled: (name: string, buns: number) => string;

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

  shovelModalTitle: string;
  shovelModalSub: string;
  btnWatchShovelAd: string;
  btnCancelShovelAd: string;

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
  btnRetryStage: string;
  btnNormalClaim: string;

  // === 2P ONLINE DUEL (czgame P2P / MQTT-WSS + CrazyGames v3) ===
  duelTitle: string;
  duelSubtitle: string;
  duelCallsignLabel: string;
  duelQuickMatch: string;
  duelCreatePublic: string;
  duelCreatePrivate: string;
  duelJoinPlaceholder: string;
  duelBtnJoinCode: string;
  duelPublicHallTitle: string;
  duelBtnRefreshHall: string;
  duelHallEmpty: string;
  duelHallJoinBtn: string;
  duelConnecting: string;
  duelRoomCodeLabel: string;
  duelPublicBadge: string;
  duelPrivateBadge: string;
  duelBtnCopyCode: string;
  duelBtnCopyLink: string;
  duelCopiedToast: string;
  duelSlotHost: string;
  duelSlotGuest: string;
  duelWaitingChallenger: string;
  duelReadyTag: string;
  duelNotReadyTag: string;
  duelBtnStartMatch: string;
  duelBtnWaitOpponent: string;
  duelBtnToggleReady: (isReady: boolean) => string;
  duelBtnLeaveRoom: string;
  duelRulesTip: string;
  duelBtnRaidPanel: string;
  duelRaidWolf: string;
  duelRaidShield: string;
  duelRaidSorcerer: string;
  duelBuyShovelTag: (cost: number) => string;
  duelEmotes: {
    salute: string;
    praise: string;
    charge: string;
    hold: string;
  };
  bannerPvpRaidSent: (raidName: string, incomeBonus: string) => string;
  bannerPvpRaidIncoming: (sender: string, raidName: string) => string;
  bannerPvpSpeedLocked: string;
  bannerPvpShovelBought: string;
  pvpVictoryKoTitle: string;
  pvpVictoryRaceTitle: string;
  pvpVictoryForfeitTitle: string;
  pvpDefeatKoTitle: string;
  pvpDefeatRaceTitle: string;
  pvpSettleVsLine: (rivalName: string, rivalWave: number, rivalKills: number) => string;
  btnPvpRematch: string;
  btnPvpBackRoom: string;
  btnPvpLeaveHub: string;

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
  appShortName: 'Jade Guard',
  installAppBtn: '📲 Add App',
  installBadgeTag: 'HOME SCREEN SHORTCUT',
  installModalTitle: 'Add "Jade Guard" to Home Screen',
  installModalSub: 'Launch full-screen with 1 tap like a native app — progress & Armory saves persist!',
  installWechatStep1: '1. Tap the top-right [···] menu and choose "Open in Browser" (Safari / System Browser).',
  installWechatStep2: '2. In your browser menu, tap "Add to Home Screen" to place the Jade Guard icon on your phone.',
  installIosStep1: '1. Tap the Safari bottom [Share ↑] button.',
  installIosStep2: '2. Scroll down and tap "Add to Home Screen" -> "Add" in the top-right corner.',
  installAndroidStep1: '1. Open browser menu [⋮ / ≡] -> tap "Add to Home Screen" or "Create Desktop Shortcut".',
  installAndroidStep2: '2. Confirm "Add" (ensure Browser "Home Screen Shortcuts" permission is enabled in system settings).',
  installDesktopStep1: '1. Click the [Install App ⊕] icon on the right side of the browser address bar (Chrome / Edge).',
  installDesktopStep2: '2. Or open browser menu [⋮] -> "Save and Share / Apps" -> "Install Jade Guard".',
  installNativeBtn: '⚡ Install Now',
  installCopyUrlBtn: '🔗 Copy Game URL',
  installUrlCopied: '✓ URL Copied!',
  installGotItBtn: 'Got It',
  gameTitle: 'Dynasty Jade Guard',
  gameSubtitle: '1v1 Split-Board Duel · 2-Piece Hero Puzzle · Combat Leveling & Divine Armory',
  tabStages: 'Passes',
  tabDuel: '⚔ 2P Duel',
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

  codexFusionTitle:
    'Unique 2-Cell Generals: [1/2] + [2/2] = Unique General · Feed Extra Shards Afterwards to Upgrade!',
  codexTroopsTitle: 'Five Troops Range Ladder: Blade 1.5R ➔ Cav 2.0R (+0.5) ➔ Spear 2.5R (+0.5) ➔ Bow 3.5R (+1.0) ➔ Bombard 4.0R (+0.5)',
  codexSynergyTitle: 'Battlefield Formation Synergies',
  codexRuleTip:
    'Each General is UNIQUE (max 1 on board, occupies 2 cells)! Shards have zero effect before synthesis; once synthesized, drag ANY new shard of that General directly onto them to upgrade!',

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
  btnConfirmOverwrite: 'Tap to Replace!',
  btnHeroScrollFree: 'Free Piece',
  btnHeroScrollAd: 'Hero Shard',
  btnSupplyAd: '+38 Buns',
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
  bannerLockedStoneHint: 'Sealed stone cell — drag a Bench Shovel onto it (or tap [Shovel] below) to excavate!',
  bannerTileUnlocked: 'New White Jade Pedestal Excavated!',
  bannerShovelRefund: (buns) => `All slots unlocked! Extra Shovel converted to +${buns} Buns`,
  bannerTombRaiderBonus: (buns, gotShard) =>
    gotShard
      ? `Tomb Raider! +${buns} Buns & Unearthed 1 Weapon Shard!`
      : `Tomb Raider! Unearthed +${buns} Bonus Buns!`,
  bannerShardCannotAttack: 'Shards have zero effect before synthesis! Fuse [1/2]+[2/2] first, or feed to an awakened General!',
  bannerNeedTwoCellsForHero: 'Generals are fixed horizontal (2×1)! Free an adjacent left/right slot or dig with a Shovel!',
  bannerHeroCannotBench: '2×1 Generals cannot return to a 1-slot camp bench!',
  bannerHeroAlreadyActive: (name) =>
    `${name} is already on the board (max 1)! Drag new shards directly onto ${name} to upgrade!`,
  bannerHeroShardUpgraded: (name, lvl, tier) =>
    `✦ Shard Absorbed! ${name} Upgraded to Lv.${lvl} · ★${tier}!`,
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
  bannerConfirmBenchOverwrite: 'Bench holds a Shovel or Ready Hero Pair! Tap [Conscript] again to replace!',
  bannerTentRecycleHint: 'Camp Tent: Drag any unwanted unit or orphan shard here to dismiss & refund Buns!',
  bannerUnitRecycled: (name, buns) => `Dismissed ${name} at Camp Tent · Refunded +${buns} Buns!`,

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

  shovelModalTitle: 'Request Golden Shovels',
  shovelModalSub:
    'Shovels appear randomly when conscripting in the 5 bench slots. Watch a short rewarded video now to immediately claim +2 Golden Shovels?',
  btnWatchShovelAd: '🎬 Watch Ad · +2 Shovels',
  btnCancelShovelAd: 'Not Now',

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
  btnRetryStage: 'Play Stage Again',
  btnNormalClaim: 'Confirm & Return to Hub',

  duelTitle: '2-Player Live Split-Board Duel',
  duelSubtitle:
    'Fair Competitive Rules · Synchronized Waves · Real-Time 180° Mirrored Board · Dispatch Mercenary Raids!',
  duelCallsignLabel: 'Commander Name',
  duelQuickMatch: '⚡ Quick Match 1v1',
  duelCreatePublic: '🏯 Create Public Room',
  duelCreatePrivate: '🔒 Private Friend Room',
  duelJoinPlaceholder: '5-Char Code',
  duelBtnJoinCode: 'Join Room',
  duelPublicHallTitle: 'Live Open Duel Rooms',
  duelBtnRefreshHall: '↻ Refresh',
  duelHallEmpty: 'No open public rooms right now — click [Quick Match] or [Create Public Room] to host!',
  duelHallJoinBtn: 'Challenge',
  duelConnecting: 'Connecting to multi-region duel relays...',
  duelRoomCodeLabel: 'Room Code',
  duelPublicBadge: 'Public Hall',
  duelPrivateBadge: 'Private Invite',
  duelBtnCopyCode: 'Copy Code',
  duelBtnCopyLink: '🔗 Invite Friend Link',
  duelCopiedToast: 'Copied!',
  duelSlotHost: 'Host (P1)',
  duelSlotGuest: 'Challenger (P2)',
  duelWaitingChallenger: 'Waiting for Challenger (Share Invite Link or Room Code)...',
  duelReadyTag: '✓ READY',
  duelNotReadyTag: 'Preparing...',
  duelBtnStartMatch: '⚔ Launch 1v1 Duel!',
  duelBtnWaitOpponent: 'Waiting for Challenger...',
  duelBtnToggleReady: (isReady) => (isReady ? '✓ Ready (Waiting Host)' : 'Tap When Ready!'),
  duelBtnLeaveRoom: 'Leave Room',
  duelRulesTip:
    'Fair 1v1 Rules: Equal starting Hearts & Buns · Shared Hero Pool & Wave Seed · Spend Buns in battle to Raid your rival’s lane & boost Bun income! Knock out rival’s Heir or clear Wave 10 first to win!',
  duelBtnRaidPanel: '⚔ Raid',
  duelRaidWolf: 'Dire Wolves',
  duelRaidShield: 'Iron Shields',
  duelRaidSorcerer: 'Sorcerer Boss',
  duelBuyShovelTag: (cost) => `${cost} Buns`,
  duelEmotes: {
    salute: '🤜 Well Met!',
    praise: '✦ Nice Merge!',
    charge: '⚔ Eat My Raid!',
    hold: '🛡 Hold Fast!',
  },
  bannerPvpRaidSent: (raidName, incomeBonus) =>
    `⚔ Dispatched [${raidName}] to Rival's Lane! (Bun Tribute +${incomeBonus}/s)`,
  bannerPvpRaidIncoming: (sender, raidName) =>
    `⚠ ${sender} Dispatched [${raidName}] Raid onto Your Road!`,
  bannerPvpSpeedLocked: 'Live 2P Duel is locked to 1x synchronized speed!',
  bannerPvpShovelBought: 'Forged +1 Golden Shovel — Tap any dark stone cell to excavate!',
  pvpVictoryKoTitle: 'Rival Heir Fallen · 2P Duel Knockout Victory!',
  pvpVictoryRaceTitle: 'Cleared Wave 10 First · 2P Speed-Duel Victory!',
  pvpVictoryForfeitTitle: 'Opponent Retreated · Duel Victory!',
  pvpDefeatKoTitle: 'Royal Heir Breached · Duel Defeat',
  pvpDefeatRaceTitle: 'Opponent Cleared Wave 10 First · Duel Defeat',
  pvpSettleVsLine: (rivalName, rivalWave, rivalKills) =>
    `VS ${rivalName} (Wave ${rivalWave} · ${rivalKills} Kills)`,
  btnPvpRematch: '⚔ Instant Rematch',
  btnPvpBackRoom: '🏯 Return to Duel Room',
  btnPvpLeaveHub: 'Leave Room & Hub',

  mockAdBadge: (placement) => `Preview · Simulated Rewarded Video (${placement})`,
  mockAdCalling: 'Summoning Imperial Decree...',
  mockAdReward: (title) => `Granting: <strong>${title}</strong>`,
  mockAdTimer: (sec) => `Game paused & muted · ${sec}s remaining`,
  mockAdCancel: 'Cancel',

  adRewardRevive: 'Dragon Rescue + Full Barricade Rebuild',
  adRewardSupply: '+38 Steamed Buns',
  adRewardShovels: '+2 Golden Shovels (Excavate Locked Stone Cells!)',
  adRewardHero: '1 Random General Puzzle Shard',
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
      desc: 'Slightly raises rare Hero Puzzle Piece chance when conscripting',
      val: (lvl) => `+${(lvl * 1.5).toFixed(1)}% Shard`,
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
    weap_machao: {
      name: 'Tiger-Head Gold Spear',
      desc: 'Signature Spear of Ma Chao. Unleashes Xiliang lightning cavalry charges.',
      sigBonus: 'Ma Chao Exclusive: Stampede launches 3 parallel lightning lances & deeper knockback!',
    },
    weap_huangzhong: {
      name: 'Ten-Stone Sunfall Bow',
      desc: 'Signature Greatbow of Huang Zhong. Pierces the heaviest Boss armor.',
      sigBonus: 'Huang Zhong Exclusive: Sunfall Bullseye deals 2.45x DMG & executes <26% HP!',
    },
    weap_lubu: {
      name: 'Sky Piercer Halberd',
      desc: 'Signature Crescent Halberd of Lu Bu. Peerless devastation.',
      sigBonus: 'Lu Bu Exclusive: Peerless Annihilation radius +15% & 2.05x True DMG!',
    },
    weap_zhouyu: {
      name: 'Guding Crimson Sword',
      desc: 'Signature Flame Sword of Zhou Yu. Commands Red Cliffs firestorms.',
      sigBonus: 'Zhou Yu Exclusive: Burn DoT +50% & massive Red Cliffs combustion blasts!',
    },
    weap_diaochan: {
      name: 'Moonlit Ribbon Chakrams',
      desc: 'Signature Twin Rings of Diao Chan. Dances gracefully across crowds.',
      sigBonus: 'Diao Chan Exclusive: +2 extra bounces, stronger slow & longer charm stun!',
    },
    weap_caocao: {
      name: 'Heaven-Reliant Sword',
      desc: 'Signature Imperial Sword of Cao Cao. Rallies the entire formation.',
      sigBonus: 'Cao Cao Exclusive: +2 Imperial Bolts & expands Attack-Speed Aura to 2.85R!',
    },
  },

  troops: {
    blade: {
      name: 'Heavy Blade Guard',
      role: '[Single-Target · 1.5R] · Armor-Cracking Chop',
      desc: 'Base 1.5R surrounding 1-cell ring! Strictly SINGLE-TARGET chop ignoring 35% armor; every 4th hit deals 1.85x Guillotine Crit & breaks armor!',
    },
    lancer: {
      name: 'Iron Cavalry',
      role: '[AoE Sweep · 2.0R (+0.5)] · Cluster Trample',
      desc: 'Blade +0.5R (2.0R)! Sweeps tight enemy clusters inside its 2.0R ring with brief stagger — weak vs heavy armor!',
    },
    spear: {
      name: 'Crimson Spearman',
      role: '[Line Pierce · 2.5R (+0.5)] · +15% DMG/Pierce',
      desc: 'Cavalry +0.5R (2.5R)! Thrusts a straight spear beam along its 2.5R reach through 6+ foes, dealing +15% escalating DMG per enemy pierced!',
    },
    archer: {
      name: 'Horn-Bow Marksman',
      role: '[Focus Homing · 3.5R (+1.0)] · Boss Killer',
      desc: 'Spear +1.0R (3.5R)! Homing single-target arrows stack +14% Focus DMG (up to +70%) & +30% vs Bosses! Lv.3+ fires twin shots.',
    },
    mortar: {
      name: 'Siege Bombard',
      role: '[Siege AoE · 4.0R (+0.5)] · Armor-Ignore & Scorch',
      desc: 'Archer +0.5R (4.0R)! Longest troop range — parabolic shell ignores 75% armor and leaves a burning ember zone!',
    },
  },

  heroes: {
    zhaoyun: {
      shard1Name: 'Zhao Yun · Puzzle 1/2',
      shard2Name: 'Zhao Yun · Puzzle 2/2',
      heroName: 'Zhao Yun · White Dragon',
      role: '◈ [2-Cell · 2.65R] · Boomerang Dragon Lance',
      desc: 'Occupies 2 cells! Throws a Silver Dragon Spear that pierces out AND boomerangs back hitting foes twice; every 4th hit fires multi-lane spears!',
    },
    guanyu: {
      shard1Name: 'Guan Yu · Puzzle 1/2',
      shard2Name: 'Guan Yu · Puzzle 2/2',
      heroName: 'Guan Yu · Martial Saint',
      role: '☾ [2-Cell · 2.45R] · Giant Crescent Wave & Execute',
      desc: 'Occupies 2 cells! Cleaves a wide emerald crescent wave ignoring 50% armor & instantly executing non-Boss foes below 22% HP!',
    },
    zhangfei: {
      shard1Name: 'Zhang Fei · Puzzle 1/2',
      shard2Name: 'Zhang Fei · Puzzle 2/2',
      heroName: 'Zhang Fei · Warcry Titan',
      role: '❖ [2-Cell · 2.35R] · 360° Quake & Knockback Stun',
      desc: 'Occupies 2 cells! Unleashes a 360° seismic warcry hitting all foes in his circle; every 4th roar stuns & knocks enemies backward!',
    },
    zhuge: {
      shard1Name: 'Zhuge Liang · Puzzle 1/2',
      shard2Name: 'Zhuge Liang · Puzzle 2/2',
      heroName: 'Zhuge Liang · Storm Sage',
      role: '☯ [2-Cell · 3.35R] · Chain Thunder & Trigram Array',
      desc: 'Occupies 2 cells! Instant armor-ignoring Chain Lightning jumping across foes; every 3rd cast drops a pulsing Eight-Trigrams Thunder Zone!',
    },
    zhenji: {
      shard1Name: 'Zhen Ji · Puzzle 1/2',
      shard2Name: 'Zhen Ji · Puzzle 2/2',
      heroName: 'Zhen Ji · Frost Consort',
      role: '✻ [2-Cell · 3.25R] · Ice Vortex Pool & Brittle Freeze',
      desc: 'Occupies 2 cells! Creates chilling Ice Vortex pools on the road (48% slow + DoT); every 4th cast freezes foes solid (+25% brittle DMG taken)!',
    },
    shangxiang: {
      shard1Name: 'Shangxiang · Puzzle 1/2',
      shard2Name: 'Shangxiang · Puzzle 2/2',
      heroName: 'Shangxiang · Sky Archer',
      role: '✦ [2-Cell · 3.85R] · Split Multishot & Fire Rain',
      desc: 'Occupies 2 cells! Locks onto 3-5 separate targets simultaneously with stacking Scorch Arrows; every 4th volley rains fire on the road!',
    },
    machao: {
      shard1Name: 'Ma Chao · Puzzle 1/2',
      shard2Name: 'Ma Chao · Puzzle 2/2',
      heroName: 'Ma Chao · Xiliang Rider',
      role: '⚡ [2-Cell · 2.8R] · Lightning Cavalry Stampede',
      desc: 'Occupies 2 cells! Pierces whole lanes with a Xiliang lightning spear that slows foes; every 4th charge knocks enemies backward!',
    },
    huangzhong: {
      shard1Name: 'Huang Zhong · Puzzle 1/2',
      shard2Name: 'Huang Zhong · Puzzle 2/2',
      heroName: 'Huang Zhong · Sun Sniper',
      role: '◎ [2-Cell · 4.35R] · Ultra-Range Boss Snipe',
      desc: 'Longest range (4.35R)! Prioritizes Bosses & high-HP armor with 85% Armor Pen; every 3rd shot is a 2x Sunfall Bullseye stun!',
    },
    lubu: {
      shard1Name: 'Lu Bu · Puzzle 1/2',
      shard2Name: 'Lu Bu · Puzzle 2/2',
      heroName: 'Lu Bu · War God',
      role: '⚔ [2-Cell · 2.5R] · Halberd Cleave & True DMG',
      desc: 'Occupies 2 cells! Sweeps his Sky Piercer Halberd to shred armor; every 3rd hit unleashes a 360° True-Damage Peerless Tempest!',
    },
    zhouyu: {
      shard1Name: 'Zhou Yu · Puzzle 1/2',
      shard2Name: 'Zhou Yu · Puzzle 2/2',
      heroName: 'Zhou Yu · Flame Viceroy',
      role: '✹ [2-Cell · 3.4R] · Red Cliffs Burn & Detonate',
      desc: 'Occupies 2 cells! Hurls explosive fireballs that detonate already-burning foes for bonus True DMG & spreads seas of fire!',
    },
    diaochan: {
      shard1Name: 'Diao Chan · Puzzle 1/2',
      shard2Name: 'Diao Chan · Puzzle 2/2',
      heroName: 'Diao Chan · Moon Dancer',
      role: '✿ [2-Cell · 3.3R] · Bouncing Charm & +25% Vuln',
      desc: 'Occupies 2 cells! Bounces Moonlit Chakrams across 3-7 foes, slowing them and applying Brittle Charm (+25% DMG taken from all allies)!',
    },
    caocao: {
      shard1Name: 'Cao Cao · Puzzle 1/2',
      shard2Name: 'Cao Cao · Puzzle 2/2',
      heroName: 'Cao Cao · Wei Hegemon',
      role: '♛ [2-Cell · 3.5R] · Volley & Allied Haste Aura',
      desc: 'Occupies 2 cells! Commands multi-bolt crossbows; every 4th decree buffs all nearby Troops & Generals with +45% Attack Speed!',
    },
  },
};

const ZH_DICT: Dict = {
  appShortName: '千里护主录',
  installAppBtn: '📲 添加桌面',
  installBadgeTag: '桌面快捷图标 · 独立全屏畅玩',
  installModalTitle: '将【千里护主录】添加到桌面',
  installModalSub: '生成专属桌面图标，一键全屏秒进大营，军衔与神兵存档永久保留！',
  installWechatStep1: '① 点击右上角【···】，选择【在默认浏览器中打开】（Safari 或系统自带浏览器）。',
  installWechatStep2: '② 在浏览器菜单中点击【添加到主屏幕 / 添加至桌面】，即可在手机桌面生成图标！',
  installIosStep1: '① 点击 Safari 底部正中的【分享按钮 ↑】。',
  installIosStep2: '② 向上滑动菜单，点击【添加到主屏幕】→ 右上角点击【添加】即可！',
  installAndroidStep1: '① 点击浏览器底部或右上角菜单【⋮ / ≡】，选择【添加至主屏幕】或【创建桌面快捷方式】。',
  installAndroidStep2: '② 点击确认添加（若未出现图标，请在手机系统设置中开启该浏览器的「桌面快捷方式」权限）。',
  installDesktopStep1: '① 点击浏览器地址栏右侧的【安装应用 ⊕】图标（Chrome / Edge）。',
  installDesktopStep2: '② 或点击右上角菜单【⋮】→【保存并分享 / 应用】→【安装 千里护主录】即可生成电脑桌面图标！',
  installNativeBtn: '⚡ 系统一键安装',
  installCopyUrlBtn: '🔗 复制游戏网址',
  installUrlCopied: '✓ 网址已复制！',
  installGotItBtn: '我知道了',
  gameTitle: '千里护主录 · 国风双阵塔防',
  gameSubtitle: '1V1双阵竞速 · 双拼图合武将 · 杀敌升级 · 五格随机刷铲',
  tabStages: '烽火关卡',
  tabDuel: '⚔ 双人对战',
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

  codexFusionTitle: '唯一双格名将：【1/2】＋【2/2】合成唯一真武将 · 合成后拖入新碎片直接给武将升级！',
  codexTroopsTitle: '五大兵种阶梯圆圈射程：刀1.5格 ➔ 骑2.0格(+0.5) ➔ 枪2.5格(+0.5) ➔ 弓3.5格(+1.0) ➔ 炮4.0格(+0.5)',
  codexSynergyTitle: '军阵奇门羁绊（上阵自动激活）',
  codexRuleTip:
    '每位武将场上【仅限1尊】（占相邻2格）！合成前碎片不起任何作用；合成上阵后，再抽到该武将任意新碎片可直接拖到武将身上升级升阶！',

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
  btnConfirmOverwrite: '再点覆盖!',
  btnHeroScrollFree: '赐拼图(免)',
  btnHeroScrollAd: '随机残卷',
  btnSupplyAd: '+38 馒头',
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
  bannerLockedStoneHint: '此处为封印石板，需拖入备战席【金铲】或点击下方【金铲】按钮开凿',
  bannerTileUnlocked: '金铲辟地 · 开启全新外圈白玉阵位！',
  bannerShovelRefund: (buns) => `深色石格已全部挖完，多余金铲折算 +${buns} 馒头！`,
  bannerTombRaiderBonus: (buns, gotShard) =>
    gotShard
      ? `摸金校尉触发！挖出 +${buns} 馒头，并惊喜出土 1 枚【神兵碎片】！`
      : `摸金校尉触发！额外挖出 +${buns} 馒头军粮！`,
  bannerShardCannotAttack: '碎片在武将合成前不起作用！请先【1/2+2/2】合成武将，合成后新碎片可拖给该武将升级',
  bannerNeedTwoCellsForHero: '真名将固定【横向占左右2格】！请先腾出左右相邻格或用金铲横向扩建',
  bannerHeroCannotBench: '名将固定横向占2格，无法收回单格备战营帐！',
  bannerHeroAlreadyActive: (name) =>
    `【${name}】已在场（同名武将仅限1尊）！请将新碎片直接拖到【${name}】身上升级！`,
  bannerHeroShardUpgraded: (name, lvl, tier) =>
    `✦ 吸收武将碎片！【${name}】突破至 Lv.${lvl} · ${tier}阶！`,
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
  bannerConfirmBenchOverwrite: '备战格留有【金铲】或【可合成/升阶名将碎片】！再点一次【征兵】确认全部覆盖',
  bannerTentRecycleHint: '左下【中军营帐】：拖入不需要的士兵或多余碎片，即可裁撤腾格并换回馒头！',
  bannerUnitRecycled: (name, buns) => `营帐裁撤【${name}】· 腾出阵位并回收 +${buns} 馒头！`,

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

  shovelModalTitle: '传召洛阳金铲',
  shovelModalSub:
    '金铲会在征兵时随机刷在下方 5 个备战格中。是否立即观看激励视频，额外领取【洛阳金铲 ×2】用于开凿外圈石格？',
  btnWatchShovelAd: '🎬 观看广告 · 领 2 把金铲',
  btnCancelShovelAd: '暂不需要',

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
  btnRetryStage: '再战本关',
  btnNormalClaim: '收下赏金并返回大营',

  duelTitle: '双人实时同屏分阵对战',
  duelSubtitle: '公平竞技属性 · 同频镜像棋盘 · 共享卡池波次 · 奇袭遣兵互攻！',
  duelCallsignLabel: '统帅名号',
  duelQuickMatch: '⚡ 快速匹配对战',
  duelCreatePublic: '🏯 创建公开房',
  duelCreatePrivate: '🔒 创建好友私密房',
  duelJoinPlaceholder: '输入5位房号',
  duelBtnJoinCode: '加入房间',
  duelPublicHallTitle: '公开招贤对战大厅（点击即入）',
  duelBtnRefreshHall: '↻ 刷新列表',
  duelHallEmpty: '当前暂无等待中的公开房 —— 点击上方【快速匹配】或【创建公开房】立即摆擂！',
  duelHallJoinBtn: '应战加入',
  duelConnecting: '正在接入多路跨网对战信令节点...',
  duelRoomCodeLabel: '对战房号',
  duelPublicBadge: '公开摆擂',
  duelPrivateBadge: '好友私密房',
  duelBtnCopyCode: '复制房号',
  duelBtnCopyLink: '🔗 复制邀请链接',
  duelCopiedToast: '已复制！',
  duelSlotHost: '擂主统帅 (P1)',
  duelSlotGuest: '应战统帅 (P2)',
  duelWaitingChallenger: '虚位以待对手加入（复制邀请链接或房号发给好友，或等待大厅匹配）...',
  duelReadyTag: '✓ 已备战',
  duelNotReadyTag: '整军中...',
  duelBtnStartMatch: '⚔ 擂鼓开战！',
  duelBtnWaitOpponent: '等待对手入阵...',
  duelBtnToggleReady: (isReady) => (isReady ? '✓ 已准备（等待房主开战）' : '点击准备应战！'),
  duelBtnLeaveRoom: '退出房间',
  duelRulesTip:
    '双人对战规则：双方同享 8 心公平开局、相同名将轮换池与同频刷怪种子；局内消耗馒头可向对手防线【遣兵奇袭】并永久提高自身每秒军粮产出！先击溃对手阿斗或率先斩杀第10波首领者获胜！',
  duelBtnRaidPanel: '⚔ 奇袭',
  duelRaidWolf: '疾风狼群',
  duelRaidShield: '玄甲铁盾',
  duelRaidSorcerer: '妖术张宝',
  duelBuyShovelTag: (cost) => `${cost}馒头`,
  duelEmotes: {
    salute: '🤜 承让抱拳！',
    praise: '✦ 好阵法！',
    charge: '⚔ 奇兵突袭！',
    hold: '🛡 稳住护主！',
  },
  bannerPvpRaidSent: (raidName, incomeBonus) =>
    `⚔ 已向对手防线派出【${raidName}】！（每秒军粮进贡 +${incomeBonus}/s）`,
  bannerPvpRaidIncoming: (sender, raidName) =>
    `⚠ 警报！【${sender}】派出【${raidName}】奇袭我方道路！`,
  bannerPvpSpeedLocked: '双人实时联机对战固定为 1x 公平同频流速！',
  bannerPvpShovelBought: '军粮锻造 +1 把洛阳金铲 —— 点击我方深色石格即可开凿！',
  pvpVictoryKoTitle: '对手阿斗失守 · 双人对战完胜！',
  pvpVictoryRaceTitle: '率先破尽十波 · 竞速夺魁大捷！',
  pvpVictoryForfeitTitle: '对手临阵退兵 · 不战而胜！',
  pvpDefeatKoTitle: '鹿砦告破 · 双人对战惜败',
  pvpDefeatRaceTitle: '对手率先斩将破关 · 竞速惜败',
  pvpSettleVsLine: (rivalName, rivalWave, rivalKills) =>
    `对战劲敌：${rivalName}（第 ${rivalWave} 波 · 斩敌 ${rivalKills}）`,
  btnPvpRematch: '⚔ 原房再战一局',
  btnPvpBackRoom: '🏯 返回对战房间',
  btnPvpLeaveHub: '退房返回大营',

  mockAdBadge: (placement) => `开发预览 · 模拟激励视频 (${placement})`,
  mockAdCalling: '八百里加急传召虎符援军...',
  mockAdReward: (title) => `即将赐予：<strong>${title}</strong>`,
  mockAdTimer: (sec) => `战局已静音暂停 · 尚余 ${sec} 秒`,
  mockAdCancel: '婉拒赏赐',

  adRewardRevive: '单骑救主清场 + 鹿砦重筑',
  adRewardSupply: '+38 蒸笼馒头粮饷',
  adRewardShovels: '赐 2 把洛阳金铲（可立即挖开外圈石格！）',
  adRewardHero: '随机赐予 1 块名将拼图残卷',
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
      desc: '小幅提高征兵刷出稀有武将拼图的概率',
      val: (lvl) => `拼图率 +${(lvl * 1.5).toFixed(1)}%`,
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
    weap_machao: {
      name: '虎头湛金枪',
      desc: '西凉锦马超神威金枪，铁骑奔雷破阵如风。',
      sigBonus: '马超穿戴质变：铁骑冲锋化为三路雷霆枪影，并大幅强化击退距离！',
    },
    weap_huangzhong: {
      name: '万石落日弓',
      desc: '定军老将黄汉升神弓，百步穿杨贯碎重甲。',
      sigBonus: '黄忠穿戴质变：落日神箭暴增至 2.45 倍真伤并直接斩杀 <26% 残敌！',
    },
    weap_lubu: {
      name: '方天画戟',
      desc: '飞将吕奉先无双魔戟，神挡杀神万夫莫敌。',
      sigBonus: '吕布穿戴质变：【天下无双】真伤旋斩范围扩大并跃升至 2.05 倍真伤！',
    },
    weap_zhouyu: {
      name: '古锭赤炎剑',
      desc: '江东美周郎佩剑，谈笑间樯橹灰飞烟灭。',
      sigBonus: '周瑜穿戴质变：赤壁业火持续灼烧提升 50%，引爆连环烈焰！',
    },
    weap_diaochan: {
      name: '闭月霓裳环',
      desc: '绝世舞姬貂蝉双月金环，流光倾城乱敌心神。',
      sigBonus: '貂蝉穿戴质变：月轮额外多弹跳 2 名敌军，减速加深并延长魅惑定身！',
    },
    weap_caocao: {
      name: '倚天青釭剑',
      desc: '魏武帝曹操镇国天剑，号令三军莫敢不从。',
      sigBonus: '曹操穿戴质变：魏武齐射弩矢 +2 支，全军狂暴号令光环扩大至 2.85 格！',
    },
  },

  troops: {
    blade: {
      name: '玄铁刀兵',
      role: '【单体破甲 · 1.5格贴圈】· 断头重劈',
      desc: '周围1整格圆圈(1.5R，含斜角路格)！纯单体高伤且无视35%护甲；每第4刀触发1.85倍断头重劈并碎甲2.5秒，专克铁盾兵与首领！',
    },
    lancer: {
      name: '铁浮屠骑',
      role: '【范围横扫 · 2.0格(刀+0.5)】· 踏阵清群',
      desc: '射程比刀兵大0.5格(2.0R)！在自身圆圈内半月挥砍横扫扎堆狼群与小兵并附带顿挫，但对重甲铁盾兵伤害乏力！',
    },
    spear: {
      name: '红缨枪兵',
      role: '【直线贯穿 · 2.5格(骑+0.5)】· 越穿越痛',
      desc: '射程比骑兵再大0.5格(2.5R)！沿2.5格枪芒直线贯穿6名以上敌军，每多贯穿1人伤害递增+15%！',
    },
    archer: {
      name: '雕翎弓兵',
      role: '【远程单体 · 3.5格(枪+1.0)】· 锁定叠伤',
      desc: '射程比枪兵再大1格(3.5R)！远程追踪单点连续命中同一目标叠【追猎印记】(最高+70%，对Boss再+30%)；3阶连发双箭！',
    },
    mortar: {
      name: '神威火炮',
      role: '【抛物重轰 · 4.0格(弓+0.5)】· 破甲焦土',
      desc: '射程比弓兵再大0.5格(4.0R全圆覆盖，无近身盲区)！远距抛物重炮无视75%护甲，落地爆炸并留下烈焰焦土持续灼烧！',
    },
  },

  heroes: {
    zhaoyun: {
      shard1Name: '赵云·左拼图 [1/2]',
      shard2Name: '赵云·右拼图 [2/2]',
      heroName: '真·赵云',
      role: '◈【占2格 · 回旋穿云枪】· 往返双段贯穿',
      desc: '占相邻2格！掷出苍龙银枪沿直线穿透敌群后自动回旋飞回，往返造成双段贯穿伤害；每4击触发【七进七出】多路飞枪！',
    },
    guanyu: {
      shard1Name: '关羽·左拼图 [1/2]',
      shard2Name: '关羽·右拼图 [2/2]',
      heroName: '真·关羽',
      role: '☾【占2格 · 青龙半月波】· 破甲斩杀',
      desc: '占相邻2格！蓄力劈出宽幅翡翠刀波无视50%护甲，直接秒杀低于22%血量的敌军；每3刀释放巨型双月斩重创残血首领！',
    },
    zhangfei: {
      shard1Name: '张飞·左拼图 [1/2]',
      shard2Name: '张飞·右拼图 [2/2]',
      heroName: '真·张飞',
      role: '❖【占2格 · 全环震地吼】· 碎甲击退群晕',
      desc: '占相邻2格！以双格为中心爆发360°咆哮音波同时震伤圈内所有敌人并破甲；每4吼触发【当阳断桥】群体眩晕并强制击退！',
    },
    zhuge: {
      shard1Name: '诸葛·左拼图 [1/2]',
      shard2Name: '诸葛·右拼图 [2/2]',
      heroName: '真·诸葛亮',
      role: '☯【占2格 · 连环天雷】· 奇门八卦雷阵',
      desc: '占相邻2格！瞬发必中紫金闪电在敌群间连环弹跳（无视护甲）；每3击在路面布下【八卦雷阵】持续电击踏入的敌军！',
    },
    zhenji: {
      shard1Name: '甄姬·左拼图 [1/2]',
      shard2Name: '甄姬·右拼图 [2/2]',
      heroName: '真·甄姬',
      role: '✻【占2格 · 洛水冰涡】· 冻土减速易伤',
      desc: '占相邻2格！在道路凝结持续2.4秒的【寒冰漩涡】大幅减速并冻伤群敌；每4击触发【千里冰封】定身并附加+25%冰脆易伤！',
    },
    shangxiang: {
      shard1Name: '尚香·左拼图 [1/2]',
      shard2Name: '尚香·右拼图 [2/2]',
      heroName: '真·孙尚香',
      role: '✦【占2格 · 多重锁定火矢】· 叠层流星火雨',
      desc: '占相邻2格！超远射程同时锁定3~5个不同敌人齐射烈焰追踪箭（灼烧无限叠层）；每4击降下【丹凤火雨】铺满火海！',
    },
    machao: {
      shard1Name: '马超·左拼图 [1/2]',
      shard2Name: '马超·右拼图 [2/2]',
      heroName: '真·马超',
      role: '⚡【占2格 · 西凉铁骑枪】· 贯穿减速击退',
      desc: '占相邻2格！刺出西凉紫电枪影直线贯穿整排敌军并减速；每4击触发【铁骑奔雷】双路冲锋并将前方敌群强制击退！',
    },
    huangzhong: {
      shard1Name: '黄忠·左拼图 [1/2]',
      shard2Name: '黄忠·右拼图 [2/2]',
      heroName: '真·黄忠',
      role: '◎【占2格 · 4.35格超远狙杀】· 专克首领重甲',
      desc: '全场最远4.35格射程！优先锁定首领与高血铁盾兵（无视85%护甲）；每3箭射出【百步穿杨】落日真伤神箭定身碎甲！',
    },
    lubu: {
      shard1Name: '吕布·左拼图 [1/2]',
      shard2Name: '吕布·右拼图 [2/2]',
      heroName: '真·吕布',
      role: '⚔【占2格 · 方天无双斩】· 全环真伤碎甲',
      desc: '占相邻2格！挥动方天画戟范围劈斩并碎裂护甲；每3击爆发【天下无双】360°血焰旋风，造成无视护甲的毁灭真伤！',
    },
    zhouyu: {
      shard1Name: '周瑜·左拼图 [1/2]',
      shard2Name: '周瑜·右拼图 [2/2]',
      heroName: '真·周瑜',
      role: '✹【占2格 · 火烧赤壁】· 爆燃引爆火海',
      desc: '占相邻2格！投掷赤炎火球范围轰炸并点燃敌群（对已灼烧目标触发额外爆燃真伤！）；每3击铺开大范围【赤壁火海】！',
    },
    diaochan: {
      shard1Name: '貂蝉·左拼图 [1/2]',
      shard2Name: '貂蝉·右拼图 [2/2]',
      heroName: '真·貂蝉',
      role: '✿【占2格 · 闭月弹射环】· 群体减速易伤',
      desc: '占相邻2格！掷出霓裳月轮在3~7名敌人之间追踪弹跳，大幅减速并附加【倾城易伤】（令全军对其伤害提升+25%）！',
    },
    caocao: {
      shard1Name: '曹操·左拼图 [1/2]',
      shard2Name: '曹操·右拼图 [2/2]',
      heroName: '真·曹操',
      role: '♛【占2格 · 魏武号令】· 齐射+全军狂暴光环',
      desc: '占相邻2格！指挥神臂弩阵多发齐射；每4击发动【魏武挥鞭】鼓舞周围友军与名将进入+45%攻速狂暴状态！',
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
