import { SoundFX } from '../audio/SoundFX';
import {
  checkTileCombine,
  computeSynergies,
  getTierDamageMultiplier,
  getTierSpeedMultiplier,
  HERO_KEYS,
  isCellInUnitRange,
  MAX_TILE_TIER,
  TROOP_KEYS,
  UNITS,
} from '../data/units';
import { getUnitDisplayText, t } from '../i18n/locale';
import { SaveManager } from '../meta/SaveManager';
import { PlatformSDK } from '../platform/PlatformSDK';
import {
  ActiveSynergyInfo,
  BossArchetype,
  CellType,
  DuelLane,
  EnemyKind,
  GameMode,
  HeroKey,
  RunSummary,
  SideOwner,
  StageDef,
  TileUnit,
  UnitId,
  WeaponId,
} from '../types';

export interface LaneBarricade {
  side: SideOwner;
  col: number;
  row: number;
  hp: number;
  maxHp: number;
  shakeTimer: number;
}

export interface EnemyEntity {
  id: number;
  side: SideOwner;
  kind: EnemyKind;
  bossType: BossArchetype;
  isBoss: boolean;
  isMiniBoss: boolean;
  waypointIndex: number;
  segProgress: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  armor: number;
  armorBrokenTimer: number;
  rewardRations: number;
  hitFlash: number;
  slowTimer: number;
  slowPower: number;
  stunTimer: number;
  burnTimer: number;
  burnDps: number;
  bashTimer: number;
  bossSkillTimer: number;
  healChantUsed: boolean;
  regenTimer: number;
  radius: number;
}

export interface ProjectileEntity {
  side: SideOwner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetId?: number;
  tx: number;
  ty: number;
  kind:
    | 'arrow'
    | 'lance'
    | 'mortar'
    | 'spirit'
    | 'dragon'
    | 'glaive'
    | 'lotus'
    | 'phoenix';
  color: string;
  damage: number;
  bossBonusMult: number;
  aoeRadius: number;
  pierceLeft: number;
  hitIds: Set<number>;
  slowFactor: number;
  slowDur: number;
  stunDur: number;
  executeRatio: number;
  burnDps: number;
  life: number;
  maxLife: number;
}

export interface VisualEffect {
  kind:
    | 'slash'
    | 'ring'
    | 'explosion'
    | 'lightning'
    | 'merge_burst'
    | 'awaken_pillar'
    | 'dragon_ult'
    | 'heal_ring'
    | 'chest_drop';
  x: number;
  y: number;
  points?: { x: number; y: number }[];
  radius: number;
  color: string;
  timer: number;
  duration: number;
  angle?: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  scale: number;
  timer: number;
  duration: number;
}

export interface DragState {
  active: boolean;
  pointerId: number;
  sourceType: 'bench' | 'board';
  benchIdx: number;
  col: number;
  row: number;
  unit: TileUnit;
  startScreenX: number;
  startScreenY: number;
  screenX: number;
  screenY: number;
  movedEnough: boolean;
}

export interface SelectedSource {
  type: 'bench' | 'board';
  benchIdx: number;
  col: number;
  row: number;
}

export interface BoardLayoutMetrics {
  viewW: number;
  viewH: number;
  cellSize: number;
  boardX: number;
  boardY: number;
  boardW: number;
  boardH: number;
  dividerY: number;
  benchTileSize: number;
  benchX: number;
  benchY: number;
  benchGap: number;
  tentX: number;
  tentY: number;
}

interface SpawnOrder {
  delay: number;
  kind: EnemyKind;
  bossType: BossArchetype;
  isBoss: boolean;
  isMiniBoss: boolean;
}

export interface RunState {
  stage: StageDef;
  mode: GameMode;
  wave: number;
  maxWaves: number | null;
  wavePhase: 'prep' | 'combat' | 'intermission' | 'revive_wait' | 'ended';
  phaseTimer: number;

  cells: CellType[][];
  board: (TileUnit | null)[][];
  bench: (TileUnit | null)[];

  hearts: number;
  maxHearts: number;
  playerBarricade: LaneBarricade;

  aiHearts: number;
  aiMaxHearts: number;
  aiCollapsed: boolean;
  aiBarricade: LaneBarricade;
  aiActionTimer: number;
  aiExcavated: number;
  aiFortifiedOnce: boolean;

  rations: number;
  passiveRationAcc: number;
  recruitCost: number;
  recruitCount: number;
  farmLevel: number;
  exorciseCooldown: number;
  shovels: number;
  shovelMode: boolean;
  talismanMode: boolean; // 神兵符 target selection mode!
  meteorTimer: number;

  ultCharge: number; // 0..100 for 神兵符 (Divine Upgrade Talisman)
  reviveUsed: boolean;
  heroScrollAdUsed: boolean;
  supplyAdCooldown: number;

  spawnQueue: SpawnOrder[];
  spawnTimer: number;
  enemies: EnemyEntity[];
  projectiles: ProjectileEntity[];
  effects: VisualEffect[];
  floatTexts: FloatingText[];

  synergies: ActiveSynergyInfo[];
  synBonuses: ReturnType<typeof computeSynergies>;
  aiSynBonuses: ReturnType<typeof computeSynergies>;

  kills: number;
  merges: number;
  droppedShards: WeaponId[];
  bannerText: string;
  bannerTimer: number;
  screenShake: number;
  selectedSource: SelectedSource | null;
  selectedUnitInfo: { unitId: UnitId; tier: number } | null;
}

export interface EngineCallbacks {
  onTogglePause: () => void;
  onRequestRevive: (canRevive: boolean) => void;
  onRunFinished: (victory: boolean, summary: RunSummary) => void;
  onRequestShovelAd: () => void;
}

export class GameEngine {
  public state: RunState | null = null;
  public drag: DragState | null = null;
  public paused = false;
  public modalPaused = false;
  public layout: BoardLayoutMetrics = {
    viewW: 390,
    viewH: 844,
    cellSize: 44,
    boardX: 19,
    boardY: 64,
    boardW: 352,
    boardH: 440,
    dividerY: 284,
    benchTileSize: 46,
    benchX: 60,
    benchY: 516,
    benchGap: 6,
    tentX: 12,
    tentY: 516,
  };

  private nextUid = 1;
  private nextEnemyId = 1;

  constructor(
    private canvas: HTMLCanvasElement,
    private callbacks: EngineCallbacks
  ) {
    this.bindInput();
  }

  // ==================== RUN INITIALIZATION ====================

  public startRun(stage: StageDef, mode: GameMode): void {
    const meta = SaveManager.getEffectiveBonuses();
    const save = SaveManager.get();
    save.totalRuns += 1;
    SaveManager.save();

    const cells: CellType[][] = [];
    const board: (TileUnit | null)[][] = [];

    for (let r = 0; r < stage.rows; r++) {
      const cellRow: CellType[] = [];
      const unitRow: (TileUnit | null)[] = [];
      const rowStr = stage.layout[r];
      for (let c = 0; c < stage.cols; c++) {
        const ch = rowStr[c];
        if (ch === '#') cellRow.push('wall');
        else if (ch === 'P') cellRow.push('path');
        else if (ch === 'D') cellRow.push('deploy');
        else if (ch === 'L') cellRow.push('locked');
        else if (ch === 'V') cellRow.push('vip');
        else cellRow.push('wall');
        unitRow.push(null);
      }
      cells.push(cellRow);
      board.push(unitRow);
    }

    const baseBarricadeHp = Math.round(280 * meta.barricadeHpMult);
    const emptySyn = computeSynergies([]);

    this.state = {
      stage,
      mode,
      wave: 0,
      maxWaves: mode === 'standard' ? 10 : null,
      wavePhase: 'prep',
      phaseTimer: 2.2,

      cells,
      board,
      bench: [null, null, null, null, null],

      hearts: meta.maxHearts,
      maxHearts: meta.maxHearts,
      playerBarricade: {
        side: 'player',
        col: stage.playerLane.barricadeCell.col,
        row: stage.playerLane.barricadeCell.row,
        hp: baseBarricadeHp,
        maxHp: baseBarricadeHp,
        shakeTimer: 0,
      },

      aiHearts: 9,
      aiMaxHearts: 9,
      aiCollapsed: false,
      aiBarricade: {
        side: 'ai',
        col: stage.aiLane.barricadeCell.col,
        row: stage.aiLane.barricadeCell.row,
        hp: 290,
        maxHp: 290,
        shakeTimer: 0,
      },
      aiActionTimer: 1.8,
      aiExcavated: 0,
      aiFortifiedOnce: false,

      rations: meta.startRations,
      passiveRationAcc: 0,
      recruitCost: 12,
      recruitCount: 0,
      farmLevel: 1,
      exorciseCooldown: 0,
      shovels: meta.startShovels,
      shovelMode: false,
      talismanMode: false,
      meteorTimer: 7.5,

      ultCharge: 45,
      reviveUsed: false,
      heroScrollAdUsed: false,
      supplyAdCooldown: 0,

      spawnQueue: [],
      spawnTimer: 0,
      enemies: [],
      projectiles: [],
      effects: [],
      floatTexts: [],

      synergies: emptySyn.list,
      synBonuses: emptySyn,
      aiSynBonuses: emptySyn,

      kills: 0,
      merges: 0,
      droppedShards: [],
      bannerText: '',
      bannerTimer: 0,
      screenShake: 0,
      selectedSource: null,
      selectedUnitInfo: null,
    };

    // Starter War-Camp tiles: 1 Blade (1-cell melee), 1 Hero Shard I (◐), 1 Archer (3-cell inner sniper)
    const starterHero: HeroKey = 'zhaoyun';
    this.state.bench[0] = this.makeTile('blade', 1);
    this.state.bench[1] = this.makeTile(`shard1_${starterHero}`, 1);
    this.state.bench[2] = this.makeTile('archer', 1);

    // Place 1 starter Cavalry on a deploy pedestal adjacent to road
    const playerDeploys = this.getSideCells('player', 'deploy');
    if (playerDeploys.length > 0) {
      const roadAdj = playerDeploys[playerDeploys.length - 1];
      this.state.board[roadAdj.row][roadAdj.col] = this.makeTile('lancer', 1);
    }

    // Seed Rival AI 2 starting tiles on Top Half deploy cells
    const aiDeploys = this.getSideCells('ai', 'deploy');
    if (aiDeploys.length >= 2) {
      this.state.board[aiDeploys[0].row][aiDeploys[0].col] = this.makeTile('lancer', 1);
      this.state.board[aiDeploys[1].row][aiDeploys[1].col] = this.makeTile('archer', 1);
    }

    this.recalcSynergies();
    PlatformSDK.gameplayStart();
  }

  private makeTile(unitId: UnitId, tier: number): TileUnit {
    return {
      uid: this.nextUid++,
      unitId,
      tier,
      cooldown: Math.random() * 0.3,
      attackCount: 0,
      recoilTimer: 0,
      recoilAngle: 0,
      mergeAnimTimer: 0.25,
      frenzyTimer: 0,
    };
  }

  private getSideCells(side: SideOwner, cellType: CellType): { col: number; row: number }[] {
    const s = this.state;
    if (!s) return [];
    const rStart = side === 'ai' ? 0 : s.stage.dividerRow;
    const rEnd = side === 'ai' ? s.stage.dividerRow : s.stage.rows;
    const out: { col: number; row: number }[] = [];
    for (let r = rStart; r < rEnd; r++) {
      for (let c = 0; c < s.stage.cols; c++) {
        if (s.cells[r][c] === cellType) {
          out.push({ col: c, row: r });
        }
      }
    }
    return out;
  }

  // ==================== LAYOUT METRICS ====================

  public computeLayout(viewW: number, viewH: number): void {
    const cols = this.state ? this.state.stage.cols : 8;
    const rows = this.state ? this.state.stage.rows : 10;
    const dividerRow = this.state ? this.state.stage.dividerRow : 5;

    const topHudH = viewH < 700 ? 54 : 62;
    const bottomDockH = viewH < 700 ? 106 : 118;
    const availH = Math.max(260, viewH - topHudH - bottomDockH);
    const availW = Math.max(260, viewW - 18);

    const cellSize = Math.max(
      26,
      Math.min(64, Math.floor(Math.min(availW / cols, availH / (rows + 1.32))))
    );

    const boardW = cellSize * cols;
    const boardH = cellSize * rows;
    const benchTileSize = Math.round(cellSize * 1.02);
    const benchGap = Math.max(4, Math.round(cellSize * 0.1));
    const totalBlockH = boardH + Math.round(cellSize * 0.22) + benchTileSize;

    const boardX = Math.floor((viewW - boardW) / 2);
    const extraY = Math.max(0, availH - totalBlockH);
    const boardY = topHudH + Math.floor(extraY * 0.42);
    const dividerY = boardY + dividerRow * cellSize;

    const tentW = benchTileSize;
    const totalBenchRowW = tentW + benchGap * 1.4 + 5 * benchTileSize + 4 * benchGap;
    const rowStartX = Math.floor((viewW - totalBenchRowW) / 2);
    const benchY = boardY + boardH + Math.max(6, Math.round(cellSize * 0.2));

    this.layout = {
      viewW,
      viewH,
      cellSize,
      boardX,
      boardY,
      boardW,
      boardH,
      dividerY,
      benchTileSize,
      tentX: rowStartX,
      tentY: benchY,
      benchX: Math.round(rowStartX + tentW + benchGap * 1.4),
      benchY,
      benchGap,
    };
  }

  // ==================== MAIN UPDATE LOOP ====================

  public update(dt: number, viewW: number, viewH: number): void {
    this.computeLayout(viewW, viewH);
    const s = this.state;
    if (!s) return;

    if (s.bannerTimer > 0) s.bannerTimer = Math.max(0, s.bannerTimer - dt);
    if (s.screenShake > 0) s.screenShake = Math.max(0, s.screenShake - dt * 2.8);

    if (this.paused || this.modalPaused || s.wavePhase === 'ended' || s.wavePhase === 'revive_wait') {
      return;
    }

    if (s.supplyAdCooldown > 0) s.supplyAdCooldown = Math.max(0, s.supplyAdCooldown - dt);
    if (s.exorciseCooldown > 0) s.exorciseCooldown = Math.max(0, s.exorciseCooldown - dt);

    // Passive Granary Steamed Bun income
    const meta = SaveManager.getEffectiveBonuses();
    const rationsPerSec = 1.05 + (s.farmLevel - 1) * 0.62 + meta.passiveRationBonus;
    s.passiveRationAcc += rationsPerSec * dt;
    if (s.passiveRationAcc >= 1) {
      const whole = Math.floor(s.passiveRationAcc);
      s.rations += whole;
      s.passiveRationAcc -= whole;
    }

    // Passive 神兵符 charge
    s.ultCharge = Math.min(100, s.ultCharge + dt * 2.1);

    // Passive Meteor Tome Skill (天降陨石)
    if (meta.meteorLevel > 0 && s.wavePhase === 'combat') {
      s.meteorTimer -= dt;
      if (s.meteorTimer <= 0) {
        s.meteorTimer = 10.2;
        this.triggerMeteorTome(s, meta.meteorLevel, meta.damageMult);
      }
    }

    this.updateWaveFlow(s, dt);

    if (!s.aiCollapsed) {
      this.updateRivalAI(s, dt);
    }

    this.updateBoardUnits(s, dt);
    this.updateProjectiles(s, dt);
    this.updateEnemies(s, dt, meta.roadSlowRatio);
    this.updateEffectsAndTexts(s, dt);

    if (s.playerBarricade.shakeTimer > 0) {
      s.playerBarricade.shakeTimer = Math.max(0, s.playerBarricade.shakeTimer - dt);
    }
    if (s.aiBarricade.shakeTimer > 0) {
      s.aiBarricade.shakeTimer = Math.max(0, s.aiBarricade.shakeTimer - dt);
    }
  }

  private triggerMeteorTome(s: RunState, meteorLvl: number, dmgMult: number): void {
    const playerFoes = s.enemies.filter((e) => e.side === 'player' && e.hp > 0);
    if (playerFoes.length === 0) return;

    SoundFX.attack('cannon');
    const count = Math.min(meteorLvl, playerFoes.length);
    for (let i = 0; i < count; i++) {
      const tgt = playerFoes[Math.floor(Math.random() * playerFoes.length)];
      const mDmg = (95 + s.wave * 26) * dmgMult * (1 + (meteorLvl - 1) * 0.2);
      s.effects.push({
        kind: 'explosion',
        x: tgt.x,
        y: tgt.y,
        radius: 1.55,
        color: '#f97316',
        timer: 0,
        duration: 0.42,
      });
      for (const e of s.enemies) {
        if (e.side === 'player' && Math.hypot(e.x - tgt.x, e.y - tgt.y) <= 1.55) {
          this.damageEnemy(s, e, mDmg, true, '#fb923c');
        }
      }
    }
  }

  // ==================== WAVE & DISTINCT BOSS SPAWNING ====================

  private updateWaveFlow(s: RunState, dt: number): void {
    if (s.wavePhase === 'prep' || s.wavePhase === 'intermission') {
      s.phaseTimer -= dt;
      if (s.phaseTimer <= 0) {
        this.beginNextWave(s);
      }
      return;
    }

    if (s.wavePhase === 'combat') {
      if (s.spawnQueue.length > 0) {
        s.spawnTimer -= dt;
        while (s.spawnQueue.length > 0 && s.spawnTimer <= 0) {
          const order = s.spawnQueue.shift()!;
          this.spawnSymmetricOrder(s, order);
          if (s.spawnQueue.length > 0) {
            s.spawnTimer += s.spawnQueue[0].delay;
          }
        }
      } else {
        const playerRemaining = s.enemies.some((e) => e.side === 'player');
        const aiRemaining = !s.aiCollapsed && s.enemies.some((e) => e.side === 'ai');
        if (!playerRemaining && !aiRemaining) {
          if (s.maxWaves !== null && s.wave >= s.maxWaves) {
            this.finishRun(true, false);
          } else {
            s.rations += 14 + s.farmLevel * 3;
            s.wavePhase = 'intermission';
            s.phaseTimer = 3.0;
          }
        }
      }
    }
  }

  private beginNextWave(s: RunState): void {
    s.wave += 1;
    s.wavePhase = 'combat';

    if (s.mode === 'endless') {
      SaveManager.recordEndlessWave(s.stage.id, s.wave);
    }

    const w = s.wave;
    const isFinalBossWave = w % 10 === 0;
    const isEliteBossWave = !isFinalBossWave && w % 5 === 0;

    const queue: SpawnOrder[] = [];
    const totalCount = 6 + Math.floor(w * 2.1);

    for (let i = 0; i < totalCount; i++) {
      let kind: EnemyKind = 'grunt';
      const roll = Math.random();
      if (w >= 3 && roll < 0.25) kind = 'shield';
      else if (w >= 2 && roll < 0.55) kind = 'wolf';

      const gap = Math.max(0.36, 1.06 - w * 0.03) * (kind === 'wolf' ? 0.78 : 1.0);
      queue.push({ delay: i === 0 ? 0.2 : gap, kind, bossType: 'none', isBoss: false, isMiniBoss: false });
    }

    const dict = t();

    if (isEliteBossWave) {
      // Wave 5 / 15 / 25: Sorcerer Zhang Bao (summons Yellow Turban raiders & drops Weapon Shard!)
      queue.push({
        delay: 1.2,
        kind: 'zhangjiao',
        bossType: 'zhangbao',
        isBoss: false,
        isMiniBoss: true,
      });
      SoundFX.alarm();
      const bInfo = dict.bossNames.zhangbao;
      this.showBanner(dict.bannerBossIncoming(bInfo.name, bInfo.trait), 3.4);
    } else if (isFinalBossWave) {
      // Wave 10 / 20 / 30: Stage Final Boss (Zhang Jiao on Stage 2 / even 20s, Lu Bu on Stage 1&3)
      const bType: 'lubu' | 'zhangjiao' =
        w === 10
          ? s.stage.finalBoss
          : (w / 10) % 2 === 0
            ? 'zhangjiao'
            : 'lubu';
      queue.push({
        delay: 1.4,
        kind: bType,
        bossType: bType,
        isBoss: true,
        isMiniBoss: false,
      });
      SoundFX.alarm();
      const bInfo = dict.bossNames[bType];
      this.showBanner(dict.bannerBossIncoming(bInfo.name, bInfo.trait), 3.6);
    } else {
      SoundFX.recruit();
      this.showBanner(dict.bannerWaveStart(w), 2.0);
    }

    s.spawnQueue = queue;
    s.spawnTimer = queue[0]?.delay ?? 0.2;
  }

  private spawnSymmetricOrder(s: RunState, order: SpawnOrder): void {
    this.spawnEnemyOnLane(s, 'player', s.stage.playerLane, order);
    if (!s.aiCollapsed) {
      this.spawnEnemyOnLane(s, 'ai', s.stage.aiLane, order);
    }
  }

  private spawnEnemyOnLane(
    s: RunState,
    side: SideOwner,
    lane: DuelLane,
    order: SpawnOrder
  ): void {
    const w = s.wave;
    const stageMult = 1 + s.stage.index * 0.18;
    const waveMult = Math.pow(1.2, w - 1) * stageMult;

    let hp = 66 * waveMult;
    let speed = 0.92;
    let armor = 0;
    let reward = 3;
    let radius = 0.3;

    if (order.kind === 'wolf') {
      hp = 45 * waveMult;
      speed = 1.48;
      reward = 3;
      radius = 0.28;
    } else if (order.kind === 'shield') {
      hp = 136 * waveMult;
      speed = 0.68;
      armor = 0.3;
      reward = 5;
      radius = 0.34;
    }

    if (order.bossType === 'zhangbao') {
      hp = 420 * waveMult;
      speed = 0.56;
      armor = 0.15;
      reward = 22;
      radius = 0.4;
    } else if (order.bossType === 'zhangjiao') {
      hp = 760 * waveMult;
      speed = 0.54;
      armor = 0.18;
      reward = 40;
      radius = 0.44;
    } else if (order.bossType === 'lubu') {
      hp = 880 * waveMult;
      speed = 0.58;
      armor = 0.36;
      reward = 45;
      radius = 0.45;
    }

    const wp0 = lane.waypoints[0];
    s.enemies.push({
      id: this.nextEnemyId++,
      side,
      kind: order.kind,
      bossType: order.bossType,
      isBoss: order.isBoss,
      isMiniBoss: order.isMiniBoss,
      waypointIndex: 0,
      segProgress: 0,
      x: wp0.col + 0.5,
      y: wp0.row + 0.5,
      hp,
      maxHp: hp,
      speed,
      armor,
      armorBrokenTimer: 0,
      rewardRations: reward,
      hitFlash: 0,
      slowTimer: 0,
      slowPower: 0,
      stunTimer: 0,
      burnTimer: 0,
      burnDps: 0,
      bashTimer: 0,
      bossSkillTimer: 4.5,
      healChantUsed: false,
      regenTimer: 0,
      radius,
    });
  }

  // ==================== SIMULATED RIVAL AI (TOP HALF) ====================

  private updateRivalAI(s: RunState, dt: number): void {
    s.aiActionTimer -= dt;
    if (s.aiActionTimer > 0) return;
    s.aiActionTimer = 2.4 + Math.random() * 1.1;

    const rMax = s.stage.dividerRow;
    const occupied: { col: number; row: number; unit: TileUnit }[] = [];
    const emptyDeploys: { col: number; row: number }[] = [];

    for (let r = 0; r < rMax; r++) {
      for (let c = 0; c < s.stage.cols; c++) {
        if (s.cells[r][c] === 'deploy') {
          const u = s.board[r][c];
          if (u) occupied.push({ col: c, row: r, unit: u });
          else emptyDeploys.push({ col: c, row: r });
        }
      }
    }

    // 1) Fuse matching Shard I + Shard II into Awakened General
    for (let i = 0; i < occupied.length; i++) {
      for (let j = i + 1; j < occupied.length; j++) {
        const a = occupied[i];
        const b = occupied[j];
        const res = checkTileCombine(a.unit, b.unit);
        if (res && res.mode === 'awaken') {
          s.board[b.row][b.col] = this.makeTile(res.resultId, res.resultTier);
          s.board[a.row][a.col] = null;
          this.spawnCombineFX(b.col + 0.5, b.row + 0.5, 'awaken', res.resultId);
          const heroTxt = getUnitDisplayText(res.resultId);
          this.showBanner(t().bannerRivalAwakened(heroTxt.name), 2.3);
          this.recalcSynergies();
          return;
        }
      }
    }

    // 2) Merge identical same-tier units
    for (let i = 0; i < occupied.length; i++) {
      for (let j = i + 1; j < occupied.length; j++) {
        const a = occupied[i];
        const b = occupied[j];
        const res = checkTileCombine(a.unit, b.unit);
        if (res && res.mode === 'merge') {
          s.board[b.row][b.col] = this.makeTile(res.resultId, res.resultTier);
          s.board[a.row][a.col] = null;
          this.spawnCombineFX(b.col + 0.5, b.row + 0.5, 'merge', res.resultId);
          this.recalcSynergies();
          return;
        }
      }
    }

    // 3) Excavate outer-ring locked cells so AI melee units reach the road too!
    const targetExcavations = Math.min(4, Math.floor((s.wave + 1) / 2));
    if (s.aiExcavated < targetExcavations) {
      const lockedCells = this.getSideCells('ai', 'locked');
      if (lockedCells.length > 0) {
        const pick = lockedCells[Math.floor(Math.random() * lockedCells.length)];
        s.cells[pick.row][pick.col] = 'deploy';
        s.aiExcavated += 1;
        s.effects.push({
          kind: 'ring',
          x: pick.col + 0.5,
          y: pick.row + 0.5,
          radius: 0.75,
          color: '#d4af37',
          timer: 0,
          duration: 0.45,
        });
        return;
      }
    }

    // 4) Emergency AI barricade repair once
    if (!s.aiFortifiedOnce && s.aiBarricade.hp < s.aiBarricade.maxHp * 0.3 && s.aiHearts <= 5) {
      s.aiFortifiedOnce = true;
      s.aiBarricade.hp = Math.min(s.aiBarricade.maxHp, s.aiBarricade.hp + s.aiBarricade.maxHp * 0.6);
      s.aiHearts = Math.min(s.aiMaxHearts, s.aiHearts + 1);
      return;
    }

    // 5) Conscript smartly onto empty deploy cell (avoid placing 1-cell Blade far from road!)
    if (emptyDeploys.length > 0) {
      const slot = emptyDeploys[Math.floor(Math.random() * emptyDeploys.length)];
      let unitId = this.rollUnitForSide('ai');
      if (unitId === 'blade' && !this.cellHasRoadInMelee(s, 'ai', slot.col, slot.row)) {
        unitId = 'archer';
      }
      s.board[slot.row][slot.col] = this.makeTile(unitId, 1);
      this.recalcSynergies();
      return;
    }

    // 6) Anti-deadlock partner cycle
    const lowTiles = occupied.filter(
      (o) => o.unit.tier === 1 && UNITS[o.unit.unitId].category !== 'awakened'
    );
    if (lowTiles.length >= 2) {
      const victim = lowTiles[0];
      const partnerTarget = lowTiles[1].unit;
      const partnerDef = UNITS[partnerTarget.unitId];
      let replacementId: UnitId = partnerTarget.unitId;
      if (partnerDef.category === 'shard1' && partnerDef.heroKey) {
        replacementId = `shard2_${partnerDef.heroKey}`;
      } else if (partnerDef.category === 'shard2' && partnerDef.heroKey) {
        replacementId = `shard1_${partnerDef.heroKey}`;
      }
      s.board[victim.row][victim.col] = this.makeTile(replacementId, 1);
      this.recalcSynergies();
    }
  }

  private cellHasRoadInMelee(s: RunState, side: SideOwner, col: number, row: number): boolean {
    const rStart = side === 'ai' ? 0 : s.stage.dividerRow;
    const rEnd = side === 'ai' ? s.stage.dividerRow : s.stage.rows;
    for (let r = Math.max(rStart, row - 1); r < Math.min(rEnd, row + 2); r++) {
      for (let c = Math.max(0, col - 1); c < Math.min(s.stage.cols, col + 2); c++) {
        if (s.cells[r][c] === 'path') return true;
      }
    }
    return false;
  }

  // ==================== DRAFTING & 2-SHARD HERO PAIRING ====================

  public getHeroDraftChance(): number {
    const meta = SaveManager.getEffectiveBonuses();
    return Math.min(0.55, 0.24 + meta.heroChanceBonus);
  }

  private findUnmatchedHeroShards(side: SideOwner): { heroKey: HeroKey; missingId: UnitId }[] {
    const s = this.state;
    if (!s) return [];

    const hasS1 = new Set<HeroKey>();
    const hasS2 = new Set<HeroKey>();

    const scanUnit = (u: TileUnit | null) => {
      if (!u) return;
      const def = UNITS[u.unitId];
      if (def.category === 'shard1' && def.heroKey) hasS1.add(def.heroKey);
      else if (def.category === 'shard2' && def.heroKey) hasS2.add(def.heroKey);
    };

    const rStart = side === 'ai' ? 0 : s.stage.dividerRow;
    const rEnd = side === 'ai' ? s.stage.dividerRow : s.stage.rows;
    for (let r = rStart; r < rEnd; r++) {
      for (let c = 0; c < s.stage.cols; c++) {
        scanUnit(s.board[r][c]);
      }
    }

    if (side === 'player') {
      for (const b of s.bench) scanUnit(b);
    }

    const unmatched: { heroKey: HeroKey; missingId: UnitId }[] = [];
    for (const h of HERO_KEYS) {
      if (hasS1.has(h) && !hasS2.has(h)) {
        unmatched.push({ heroKey: h, missingId: `shard2_${h}` });
      } else if (hasS2.has(h) && !hasS1.has(h)) {
        unmatched.push({ heroKey: h, missingId: `shard1_${h}` });
      }
    }
    return unmatched;
  }

  private rollUnitForSide(side: SideOwner): UnitId {
    const heroChance = side === 'player' ? this.getHeroDraftChance() : 0.24;
    if (Math.random() < heroChance) {
      const unmatched = this.findUnmatchedHeroShards(side);
      // 46% smart pity to roll the missing second shard of an already-held Hero shard!
      if (unmatched.length > 0 && Math.random() < 0.46) {
        return unmatched[Math.floor(Math.random() * unmatched.length)].missingId;
      }
      const h = HERO_KEYS[Math.floor(Math.random() * HERO_KEYS.length)];
      return Math.random() < 0.5 ? `shard1_${h}` : `shard2_${h}`;
    }
    return TROOP_KEYS[Math.floor(Math.random() * TROOP_KEYS.length)];
  }

  // ==================== PLAYER COMMANDS & TACTICAL SKILLS ====================

  public recruitBench(): void {
    const s = this.state;
    if (!s || this.paused || this.modalPaused) return;

    if (s.rations < s.recruitCost) {
      this.showBanner(t().bannerNeedRations, 1.4);
      return;
    }

    s.rations -= s.recruitCost;
    s.recruitCount += 1;
    s.recruitCost = Math.min(34, 12 + Math.floor(s.recruitCount / 3) * 2);

    const hasEmpty = s.bench.some((b) => b === null);
    if (hasEmpty) {
      for (let i = 0; i < s.bench.length; i++) {
        if (s.bench[i] === null) {
          s.bench[i] = this.makeTile(this.rollUnitForSide('player'), 1);
        }
      }
    } else {
      for (let i = 0; i < s.bench.length; i++) {
        s.bench[i] = this.makeTile(this.rollUnitForSide('player'), 1);
      }
    }

    s.selectedSource = null;
    s.talismanMode = false;
    SoundFX.recruit();
  }

  public grantGuaranteedHero(): void {
    const s = this.state;
    if (!s) return;

    const unmatched = this.findUnmatchedHeroShards('player');
    if (unmatched.length > 0) {
      const pair = unmatched[0];
      const emptyIdx = s.bench.findIndex((b) => b === null);
      const targetIdx = emptyIdx >= 0 ? emptyIdx : 0;
      s.bench[targetIdx] = this.makeTile(pair.missingId, 1);
      const txt = getUnitDisplayText(pair.missingId);
      SoundFX.merge(3, true);
      this.showBanner(`✦ ${txt.name}`, 2.4);
      return;
    }

    const h = HERO_KEYS[Math.floor(Math.random() * HERO_KEYS.length)];
    const slots: number[] = [];
    for (let i = 0; i < s.bench.length; i++) {
      if (s.bench[i] === null) slots.push(i);
    }
    for (let i = 0; i < s.bench.length && slots.length < 2; i++) {
      if (!slots.includes(i)) slots.push(i);
    }
    s.bench[slots[0]] = this.makeTile(`shard1_${h}`, 1);
    s.bench[slots[1]] = this.makeTile(`shard2_${h}`, 1);
    SoundFX.merge(3, true);
    const hName = getUnitDisplayText(`hero_${h}`).name;
    this.showBanner(`◈ ${hName}`, 2.4);
  }

  public getFarmCost(): number {
    const s = this.state;
    if (!s) return 18;
    return 18 + (s.farmLevel - 1) * 14;
  }

  public upgradeFarm(): void {
    const s = this.state;
    if (!s) return;
    if (s.farmLevel >= 6) {
      this.showBanner(t().bannerMaxLevel, 1.4);
      return;
    }
    const cost = this.getFarmCost();
    if (s.rations < cost) {
      this.showBanner(t().bannerNeedRations, 1.4);
      return;
    }
    s.rations -= cost;
    s.farmLevel += 1;
    SoundFX.tileClack(true);
  }

  public getExorciseCost(): number {
    return 20;
  }

  /**
   * Bottom Green Talisman Button: 【降妖】 (Exorcism Thunder — Boss Bane & Armor Shred!)
   */
  public castExorcism(): void {
    const s = this.state;
    if (!s || s.exorciseCooldown > 0) return;

    const cost = this.getExorciseCost();
    if (s.rations < cost) {
      this.showBanner(t().bannerNeedRations, 1.4);
      return;
    }

    const foes = s.enemies
      .filter((e) => e.side === 'player' && e.hp > 0)
      .sort((a, b) => b.hp - a.hp);
    if (foes.length === 0) return;

    s.rations -= cost;
    s.exorciseCooldown = 7.5;
    s.screenShake = 0.4;
    SoundFX.attack('thunder');
    this.showBanner(t().bannerExorciseCast, 2.2);

    const meta = SaveManager.getEffectiveBonuses();
    const baseStrike = (145 + s.wave * 38) * meta.damageMult * meta.bossDmgMult;

    const targets = foes.slice(0, 4);
    const pts: { x: number; y: number }[] = [];
    for (const foe of targets) {
      pts.push({ x: foe.x, y: foe.y });
      const mult = foe.isBoss || foe.isMiniBoss ? 1.55 : 1.0;
      this.damageEnemy(s, foe, baseStrike * mult, true, '#4ade80');
      foe.armorBrokenTimer = 6.0;
      foe.stunTimer = Math.max(foe.stunTimer, 1.05);
      // Interrupt Zhang Jiao's low-HP heal chant!
      foe.regenTimer = 0;
    }

    if (pts.length >= 1) {
      s.effects.push({
        kind: 'awaken_pillar',
        x: pts[0].x,
        y: pts[0].y,
        radius: 1.4,
        color: '#22c55e',
        timer: 0,
        duration: 0.55,
      });
    }
  }

  /**
   * Left Circle Orb: 【神兵符】 (Divine Upgrade Talisman — +1 Tier to chosen unit + Global Haste!)
   */
  public activateDivineTalisman(): void {
    const s = this.state;
    if (!s || s.ultCharge < 100) return;

    // If clicked a second time while already in talismanMode, auto-apply to strongest board unit!
    if (s.talismanMode) {
      let best: { r: number; c: number; u: TileUnit } | null = null;
      for (let r = s.stage.dividerRow; r < s.stage.rows; r++) {
        for (let c = 0; c < s.stage.cols; c++) {
          const u = s.board[r][c];
          if (!u) continue;
          const isHero = UNITS[u.unitId].category === 'awakened';
          if (
            !best ||
            (isHero && UNITS[best.u.unitId].category !== 'awakened') ||
            (u.tier < MAX_TILE_TIER && u.tier > best.u.tier)
          ) {
            best = { r, c, u };
          }
        }
      }
      if (best) {
        this.applyDivineTalismanToUnit(best.u, best.c + 0.5, best.r + 0.5);
      } else {
        s.talismanMode = false;
      }
      return;
    }

    s.talismanMode = true;
    s.shovelMode = false;
    s.selectedSource = null;
    SoundFX.tileClack(true);
    this.showBanner(t().bannerTalismanPick, 2.8);
  }

  private applyDivineTalismanToUnit(u: TileUnit, gx: number, gy: number): void {
    const s = this.state;
    if (!s) return;

    s.ultCharge = 0;
    s.talismanMode = false;
    s.screenShake = 0.45;

    if (u.tier < MAX_TILE_TIER) {
      u.tier += 1;
      s.merges += 1;
    }
    u.mergeAnimTimer = 0.3;

    // Grant 7s Attack Speed Frenzy to ALL player units (神兵符 + 攻速符 burst!)
    for (let r = s.stage.dividerRow; r < s.stage.rows; r++) {
      for (let c = 0; c < s.stage.cols; c++) {
        const ally = s.board[r][c];
        if (ally) ally.frenzyTimer = 7.0;
      }
    }

    SoundFX.dragonUlt();
    this.spawnCombineFX(gx, gy, 'awaken', u.unitId);
    const txt = getUnitDisplayText(u.unitId);
    this.showBanner(t().bannerTalismanUpgraded(txt.name, u.tier), 2.5);
  }

  public toggleShovelMode(): void {
    const s = this.state;
    if (!s) return;

    const playerLocked = this.getSideCells('player', 'locked');
    if (playerLocked.length === 0) {
      this.showBanner(t().bannerMaxLevel, 1.4);
      return;
    }

    if (s.shovelMode) {
      s.shovelMode = false;
      return;
    }

    s.talismanMode = false;

    if (s.shovels > 0) {
      s.shovelMode = true;
      s.selectedSource = null;
      this.showBanner(t().bannerShovelPick, 2.4);
      SoundFX.tileClack(false);
      return;
    }

    if (s.rations >= 35) {
      s.rations -= 35;
      s.shovels += 1;
      s.shovelMode = true;
      s.selectedSource = null;
      this.showBanner(t().bannerShovelPick, 2.4);
      SoundFX.tileClack(true);
      return;
    }

    this.callbacks.onRequestShovelAd();
  }

  public getFortifyCost(): number {
    return 26;
  }

  public fortifyLord(): void {
    const s = this.state;
    if (!s) return;
    const cost = this.getFortifyCost();
    if (s.rations < cost) {
      this.showBanner(t().bannerNeedRations, 1.4);
      return;
    }
    s.rations -= cost;
    s.hearts = Math.min(s.maxHearts, s.hearts + 2);
    s.playerBarricade.hp = Math.min(
      s.playerBarricade.maxHp,
      s.playerBarricade.hp + Math.round(s.playerBarricade.maxHp * 0.6)
    );
    s.effects.push({
      kind: 'heal_ring',
      x: s.stage.playerLane.vipCell.col + 0.5,
      y: s.stage.playerLane.vipCell.row + 0.5,
      radius: 1.15,
      color: '#52b788',
      timer: 0,
      duration: 0.65,
    });
    SoundFX.fanfare();
    this.showBanner(t().bannerFortified, 1.8);
  }

  public applyDragonRevive(): void {
    const s = this.state;
    if (!s) return;

    s.reviveUsed = true;
    s.hearts = Math.min(s.maxHearts, 6);
    s.playerBarricade.hp = s.playerBarricade.maxHp;
    s.wavePhase = 'combat';
    s.screenShake = 0.7;
    SoundFX.dragonUlt();

    for (const e of s.enemies) {
      if (e.side !== 'player') continue;
      if (e.isBoss || e.isMiniBoss) {
        this.damageEnemy(s, e, e.maxHp * 0.35, true, '#fbbf24');
        e.waypointIndex = Math.max(0, e.waypointIndex - 3);
        e.segProgress = 0;
      } else {
        e.hp = 0;
      }
    }
    s.enemies = s.enemies.filter((e) => e.hp > 0);

    s.effects.push({
      kind: 'dragon_ult',
      x: s.stage.cols * 0.5,
      y: s.stage.dividerRow + 2.5,
      radius: 5.0,
      color: '#fbbf24',
      timer: 0,
      duration: 0.9,
    });

    PlatformSDK.gameplayStart();
  }

  public showBanner(text: string, duration = 2.0): void {
    if (!this.state) return;
    this.state.bannerText = text;
    this.state.bannerTimer = duration;
  }

  private recalcSynergies(): void {
    const s = this.state;
    if (!s) return;

    const playerUnits: (TileUnit | null)[] = [];
    const aiUnits: (TileUnit | null)[] = [];

    for (let r = 0; r < s.stage.rows; r++) {
      for (let c = 0; c < s.stage.cols; c++) {
        const u = s.board[r][c];
        if (!u) continue;
        if (r < s.stage.dividerRow) aiUnits.push(u);
        else playerUnits.push(u);
      }
    }

    s.synBonuses = computeSynergies(playerUnits);
    s.synergies = s.synBonuses.list;
    s.aiSynBonuses = computeSynergies(aiUnits);
  }

  // ==================== COMBAT: STRICT GRID-CELL TARGETING & WEAPON SKILLS ====================

  private updateBoardUnits(s: RunState, dt: number): void {
    const meta = SaveManager.getEffectiveBonuses();

    for (let r = 0; r < s.stage.rows; r++) {
      const side: SideOwner = r < s.stage.dividerRow ? 'ai' : 'player';
      if (side === 'ai' && s.aiCollapsed) continue;

      const syn = side === 'player' ? s.synBonuses : s.aiSynBonuses;
      const sideDmgScale = side === 'player' ? meta.damageMult : 0.88;
      const sideAspdScale = side === 'player' ? meta.aspdMult : 1.0;

      for (let c = 0; c < s.stage.cols; c++) {
        const u = s.board[r][c];
        if (!u) continue;

        if (u.recoilTimer > 0) u.recoilTimer = Math.max(0, u.recoilTimer - dt);
        if (u.mergeAnimTimer > 0) u.mergeAnimTimer = Math.max(0, u.mergeAnimTimer - dt);
        if (u.frenzyTimer > 0) u.frenzyTimer = Math.max(0, u.frenzyTimer - dt);

        if (
          this.drag?.active &&
          this.drag.movedEnough &&
          this.drag.sourceType === 'board' &&
          this.drag.col === c &&
          this.drag.row === r
        ) {
          continue;
        }

        const def = UNITS[u.unitId];

        // Check equipped Divine Weapon bonus if Awakened Hero on Player side!
        const weapBonus =
          side === 'player' && def.category === 'awakened' && def.heroKey
            ? SaveManager.getHeroWeaponBonus(def.heroKey)
            : { weaponId: null, star: 0, isSignature: false, dmgMult: 1, aspdMult: 1 };

        const frenzyMult = u.frenzyTimer > 0 ? 1.75 : 1.0;
        const speedMult =
          getTierSpeedMultiplier(u.tier) *
          syn.globalAspdMult *
          sideAspdScale *
          weapBonus.aspdMult *
          frenzyMult;

        u.cooldown -= dt * speedMult;
        if (u.cooldown > 0) continue;

        // Pick target strictly inside this unit's exact Grid-Cell Attack Range!
        const target = this.pickTargetInGridRange(s, side, def, u.tier, c, r);
        if (!target) {
          u.cooldown = 0.1;
          continue;
        }

        u.cooldown = def.attackInterval;
        u.attackCount += 1;

        const ux = c + 0.5;
        const uy = r + 0.5;
        const angle = Math.atan2(target.y - uy, target.x - ux);
        u.recoilAngle = angle;
        u.recoilTimer = 0.14;

        let dmg =
          def.baseDamage *
          getTierDamageMultiplier(u.tier) *
          syn.globalDmgMult *
          sideDmgScale *
          weapBonus.dmgMult;

        if (def.synergy === 'mystic') {
          dmg *= syn.mysticPowerMult;
        }
        if (Math.random() < syn.critChance) {
          dmg *= 1.65;
        }

        const skillPeriod = def.skillEveryN
          ? Math.max(2, def.skillEveryN - (syn.heroSkillFaster || weapBonus.weaponId ? 1 : 0))
          : 0;
        const isSkillStrike = skillPeriod > 0 && u.attackCount % skillPeriod === 0;

        this.executeUnitAttack(
          s,
          side,
          u,
          def,
          ux,
          uy,
          target,
          angle,
          dmg,
          isSkillStrike,
          weapBonus.isSignature
        );
      }
    }
  }

  private pickTargetInGridRange(
    s: RunState,
    side: SideOwner,
    def: (typeof UNITS)[UnitId],
    tier: number,
    uCol: number,
    uRow: number
  ): EnemyEntity | null {
    let best: EnemyEntity | null = null;
    let bestProgress = -1;

    for (const e of s.enemies) {
      if (e.side !== side || e.hp <= 0) continue;
      const eCol = Math.floor(e.x);
      const eRow = Math.floor(e.y);
      if (isCellInUnitRange(def, tier, uCol, uRow, eCol, eRow)) {
        const progress = e.waypointIndex + e.segProgress;
        if (progress > bestProgress) {
          bestProgress = progress;
          best = e;
        }
      }
    }
    return best;
  }

  private executeUnitAttack(
    s: RunState,
    side: SideOwner,
    u: TileUnit,
    def: (typeof UNITS)[UnitId],
    ux: number,
    uy: number,
    target: EnemyEntity,
    angle: number,
    dmg: number,
    isSkill: boolean,
    hasSigWeapon: boolean
  ): void {
    const playSfx = side === 'player';

    switch (def.pattern) {
      case 'cleave': {
        if (playSfx) SoundFX.attack('slash');
        s.effects.push({
          kind: 'slash',
          x: ux,
          y: uy,
          radius: 1.25,
          color: def.accentColor,
          timer: 0,
          duration: 0.2,
          angle,
        });
        for (const e of s.enemies) {
          if (e.side !== side) continue;
          if (Math.hypot(e.x - target.x, e.y - target.y) <= 0.95) {
            this.damageEnemy(s, e, dmg, false, def.accentColor);
          }
        }
        break;
      }

      case 'pierce_lance': {
        if (playSfx) SoundFX.attack('lance');
        s.projectiles.push({
          side,
          x: ux,
          y: uy,
          vx: Math.cos(angle) * def.projectileSpeed,
          vy: Math.sin(angle) * def.projectileSpeed,
          tx: target.x,
          ty: target.y,
          kind: 'lance',
          color: '#dc2626',
          damage: dmg,
          bossBonusMult: 1.0,
          aoeRadius: 0,
          pierceLeft: 4 + Math.floor(u.tier / 2),
          hitIds: new Set(),
          slowFactor: 0,
          slowDur: 0,
          stunDur: 0,
          executeRatio: 0,
          burnDps: 0,
          life: 0,
          maxLife: 0.42,
        });
        break;
      }

      case 'cavalry_slash': {
        if (playSfx) SoundFX.attack('slash');
        s.effects.push({
          kind: 'slash',
          x: target.x,
          y: target.y,
          radius: 0.95,
          color: '#38bdf8',
          timer: 0,
          duration: 0.18,
          angle,
        });
        for (const e of s.enemies) {
          if (e.side === side && Math.hypot(e.x - target.x, e.y - target.y) <= 1.05) {
            this.damageEnemy(s, e, dmg, false, '#38bdf8');
          }
        }
        break;
      }

      case 'arrow': {
        if (playSfx) SoundFX.attack('bow');
        const p = this.spawnProj(
          s,
          side,
          ux,
          uy,
          target,
          'arrow',
          def.accentColor,
          dmg,
          def.projectileSpeed
        );
        p.bossBonusMult = 1.3; // Archer Boss-Slayer trait!
        break;
      }

      case 'mortar_aoe': {
        if (playSfx) SoundFX.attack('cannon');
        s.projectiles.push({
          side,
          x: ux,
          y: uy,
          vx: 0,
          vy: 0,
          tx: target.x,
          ty: target.y,
          kind: 'mortar',
          color: '#d97706',
          damage: dmg,
          bossBonusMult: 1.15,
          aoeRadius: def.aoeRadiusCells || 1.35,
          pierceLeft: 1,
          hitIds: new Set(),
          slowFactor: 0,
          slowDur: 0,
          stunDur: 0,
          executeRatio: 0,
          burnDps: 0,
          life: 0,
          maxLife: Math.max(0.22, Math.hypot(target.x - ux, target.y - uy) / def.projectileSpeed),
        });
        break;
      }

      case 'spirit_strike': {
        if (playSfx) SoundFX.attack('bow');
        this.spawnProj(s, side, ux, uy, target, 'spirit', def.accentColor, dmg, def.projectileSpeed);
        break;
      }

      case 'dragon_sweep': {
        if (playSfx) SoundFX.attack('lance');
        s.effects.push({
          kind: 'slash',
          x: ux,
          y: uy,
          radius: 1.7,
          color: '#38bdf8',
          timer: 0,
          duration: 0.24,
          angle,
        });
        for (const e of s.enemies) {
          if (e.side === side && Math.hypot(e.x - ux, e.y - uy) <= 1.85) {
            this.damageEnemy(s, e, dmg, true, '#38bdf8');
          }
        }
        if (isSkill) {
          const spearCount = hasSigWeapon ? 3 : 1;
          const allSideFoes = s.enemies.filter((e) => e.side === side && e.hp > 0);
          for (let k = 0; k < spearCount; k++) {
            const spTarget = allSideFoes[k % Math.max(1, allSideFoes.length)] || target;
            const spAng = Math.atan2(spTarget.y - uy, spTarget.x - ux);
            s.projectiles.push({
              side,
              x: ux,
              y: uy,
              vx: Math.cos(spAng) * 11.5,
              vy: Math.sin(spAng) * 11.5,
              tx: spTarget.x,
              ty: spTarget.y,
              kind: 'dragon',
              color: '#38bdf8',
              damage: dmg * 1.65,
              bossBonusMult: 1.2,
              aoeRadius: 0.75,
              pierceLeft: 8,
              hitIds: new Set(),
              slowFactor: 0,
              slowDur: 0,
              stunDur: 0.35,
              executeRatio: 0,
              burnDps: 0,
              life: 0,
              maxLife: 0.72,
            });
          }
        }
        break;
      }

      case 'jade_execute': {
        if (playSfx) SoundFX.attack('slash');
        const execThresh = hasSigWeapon ? 0.3 : 0.22;
        s.effects.push({
          kind: 'slash',
          x: ux,
          y: uy,
          radius: 1.75,
          color: '#10b981',
          timer: 0,
          duration: 0.26,
          angle,
        });
        for (const e of s.enemies) {
          if (e.side === side && Math.hypot(e.x - ux, e.y - uy) <= 1.85) {
            if (!e.isBoss && e.hp / e.maxHp <= execThresh) {
              this.damageEnemy(s, e, e.hp * 2.5, true, '#10b981');
            } else {
              this.damageEnemy(s, e, dmg, false, '#10b981');
            }
          }
        }
        if (isSkill) {
          s.projectiles.push({
            side,
            x: ux,
            y: uy,
            vx: Math.cos(angle) * 9.2,
            vy: Math.sin(angle) * 9.2,
            tx: target.x,
            ty: target.y,
            kind: 'glaive',
            color: '#10b981',
            damage: dmg * 1.55,
            bossBonusMult: 1.2,
            aoeRadius: 0.75,
            pierceLeft: 6,
            hitIds: new Set(),
            slowFactor: 0,
            slowDur: 0,
            stunDur: 0,
            executeRatio: execThresh,
            burnDps: 0,
            life: 0,
            maxLife: 0.62,
          });
        }
        break;
      }

      case 'roar_quake': {
        const rad = (def.aoeRadiusCells || 2.15) * (isSkill ? (hasSigWeapon ? 1.4 : 1.2) : 1.0);
        if (playSfx) SoundFX.attack(isSkill ? 'cannon' : 'slash');
        s.effects.push({
          kind: 'ring',
          x: ux,
          y: uy,
          radius: rad,
          color: isSkill ? '#f97316' : '#c2410c',
          timer: 0,
          duration: 0.34,
        });
        for (const e of s.enemies) {
          if (e.side !== side) continue;
          if (Math.hypot(e.x - ux, e.y - uy) <= rad) {
            this.damageEnemy(s, e, dmg * (isSkill ? 1.45 : 1.0), isSkill, '#f97316');
            if (isSkill) {
              e.stunTimer = Math.max(e.stunTimer, (def.stunDuration || 1.15) + (hasSigWeapon ? 0.45 : 0));
              if (hasSigWeapon) e.armorBrokenTimer = 5.0;
            }
          }
        }
        break;
      }

      case 'chain_lightning': {
        if (playSfx) SoundFX.attack('thunder');
        const maxJumps = (isSkill ? 5 : 3) + (hasSigWeapon ? 3 : 0);
        const visited = new Set<number>();
        const pts: { x: number; y: number }[] = [{ x: ux, y: uy }];
        let cur: EnemyEntity | null = target;
        let curDmg = dmg * (isSkill ? 1.35 : 1.0);

        for (let j = 0; j < maxJumps && cur; j++) {
          visited.add(cur.id);
          pts.push({ x: cur.x, y: cur.y });
          this.damageEnemy(s, cur, curDmg, true, '#eab308');
          if (hasSigWeapon && isSkill) cur.stunTimer = Math.max(cur.stunTimer, 0.35);
          curDmg *= 0.88;

          let nextEnemy: EnemyEntity | null = null;
          let bestD = 2.8;
          for (const cand of s.enemies) {
            if (cand.side !== side || visited.has(cand.id) || cand.hp <= 0) continue;
            const d = Math.hypot(cand.x - cur.x, cand.y - cur.y);
            if (d < bestD) {
              bestD = d;
              nextEnemy = cand;
            }
          }
          cur = nextEnemy;
        }

        s.effects.push({
          kind: 'lightning',
          x: ux,
          y: uy,
          points: pts,
          radius: 1,
          color: '#facc15',
          timer: 0,
          duration: 0.24,
        });
        break;
      }

      case 'lotus_blizzard': {
        if (playSfx) SoundFX.attack('frost');
        const p = this.spawnProj(
          s,
          side,
          ux,
          uy,
          target,
          'lotus',
          '#60a5fa',
          dmg * (isSkill ? 1.4 : 1.0),
          def.projectileSpeed
        );
        p.aoeRadius = def.aoeRadiusCells || 1.55;
        p.slowFactor = def.slowFactor || 0.5;
        p.slowDur = def.slowDuration || 2.6;
        if (isSkill) p.stunDur = hasSigWeapon ? 1.25 : def.stunDuration || 0.85;
        break;
      }

      case 'phoenix_volley': {
        if (playSfx) SoundFX.attack('bow');
        const maxArrows = (isSkill ? 4 : 2) + (hasSigWeapon ? 2 : 0);
        const targets = s.enemies.filter((e) => e.side === side && e.hp > 0).slice(0, maxArrows);
        if (targets.length === 0) targets.push(target);
        for (const tEnemy of targets) {
          const p = this.spawnProj(
            s,
            side,
            ux,
            uy,
            tEnemy,
            'phoenix',
            '#ef4444',
            dmg * (isSkill ? 1.25 : 0.95),
            def.projectileSpeed
          );
          p.burnDps = dmg * (hasSigWeapon ? 0.55 : 0.3);
        }
        break;
      }
    }
  }

  private spawnProj(
    s: RunState,
    side: SideOwner,
    ux: number,
    uy: number,
    target: EnemyEntity,
    kind: ProjectileEntity['kind'],
    color: string,
    damage: number,
    speed: number
  ): ProjectileEntity {
    const angle = Math.atan2(target.y - uy, target.x - ux);
    const p: ProjectileEntity = {
      side,
      x: ux,
      y: uy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      targetId: target.id,
      tx: target.x,
      ty: target.y,
      kind,
      color,
      damage,
      bossBonusMult: 1.0,
      aoeRadius: 0,
      pierceLeft: 1,
      hitIds: new Set(),
      slowFactor: 0,
      slowDur: 0,
      stunDur: 0,
      executeRatio: 0,
      burnDps: 0,
      life: 0,
      maxLife: 1.2,
    };
    s.projectiles.push(p);
    return p;
  }

  private updateProjectiles(s: RunState, dt: number): void {
    for (let i = s.projectiles.length - 1; i >= 0; i--) {
      const p = s.projectiles[i];
      p.life += dt;

      if (p.kind === 'mortar') {
        const tRatio = Math.min(1, p.life / p.maxLife);
        p.x += (p.tx - p.x) * Math.min(1, dt * 8);
        p.y += (p.ty - p.y) * Math.min(1, dt * 8);
        if (tRatio >= 1) {
          s.effects.push({
            kind: 'explosion',
            x: p.tx,
            y: p.ty,
            radius: p.aoeRadius,
            color: p.color,
            timer: 0,
            duration: 0.32,
          });
          for (const e of s.enemies) {
            if (e.side !== p.side) continue;
            if (Math.hypot(e.x - p.tx, e.y - p.ty) <= p.aoeRadius + e.radius) {
              this.damageEnemy(s, e, p.damage, true, p.color);
            }
          }
          s.projectiles.splice(i, 1);
        }
        continue;
      }

      if (p.targetId !== undefined && p.pierceLeft === 1) {
        const tgt = s.enemies.find((e) => e.id === p.targetId && e.hp > 0);
        if (tgt) {
          const spd = Math.hypot(p.vx, p.vy);
          const ang = Math.atan2(tgt.y - p.y, tgt.x - p.x);
          p.vx = Math.cos(ang) * spd;
          p.vy = Math.sin(ang) * spd;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      let remove = p.life >= p.maxLife;
      for (const e of s.enemies) {
        if (e.side !== p.side || e.hp <= 0 || p.hitIds.has(e.id)) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) <= e.radius + 0.28) {
          p.hitIds.add(e.id);

          if (p.aoeRadius > 0 && p.kind === 'lotus') {
            s.effects.push({
              kind: 'ring',
              x: e.x,
              y: e.y,
              radius: p.aoeRadius,
              color: p.color,
              timer: 0,
              duration: 0.3,
            });
            for (const sub of s.enemies) {
              if (sub.side === p.side && Math.hypot(sub.x - e.x, sub.y - e.y) <= p.aoeRadius) {
                this.applyProjHit(s, p, sub);
              }
            }
          } else {
            this.applyProjHit(s, p, e);
          }

          p.pierceLeft -= 1;
          if (p.pierceLeft <= 0) {
            remove = true;
            break;
          }
        }
      }

      if (remove) s.projectiles.splice(i, 1);
    }
  }

  private applyProjHit(s: RunState, p: ProjectileEntity, e: EnemyEntity): void {
    const bossScale = e.isBoss || e.isMiniBoss ? p.bossBonusMult : 1.0;
    if (p.executeRatio > 0 && !e.isBoss && e.hp / e.maxHp <= p.executeRatio) {
      this.damageEnemy(s, e, e.hp * 2.5, true, p.color);
    } else {
      this.damageEnemy(
        s,
        e,
        p.damage * bossScale,
        p.kind === 'dragon' || p.kind === 'phoenix',
        p.color
      );
    }
    if (p.slowFactor > 0) {
      e.slowPower = Math.max(e.slowPower, p.slowFactor);
      e.slowTimer = Math.max(e.slowTimer, p.slowDur);
    }
    if (p.stunDur > 0) {
      e.stunTimer = Math.max(e.stunTimer, p.stunDur);
    }
    if (p.burnDps > 0) {
      e.burnDps = Math.max(e.burnDps, p.burnDps);
      e.burnTimer = 2.5;
    }
  }

  private damageEnemy(
    s: RunState,
    e: EnemyEntity,
    rawDmg: number,
    armorPiercing: boolean,
    floatColor: string
  ): void {
    if (e.hp <= 0) return;

    const meta = SaveManager.getEffectiveBonuses();
    let scaled = rawDmg;
    if (e.side === 'player' && (e.isBoss || e.isMiniBoss)) {
      scaled *= meta.bossDmgMult;
    }

    const baseArmor = e.armorBrokenTimer > 0 ? 0 : e.armor;
    const effArmor = armorPiercing ? baseArmor * 0.25 : baseArmor;
    const finalDmg = Math.max(1, scaled * (1 - effArmor));
    e.hp -= finalDmg;
    e.hitFlash = 0.11;

    if (e.side === 'player' && Math.random() < 0.42) {
      s.floatTexts.push({
        x: e.x + (Math.random() - 0.5) * 0.3,
        y: e.y - 0.25,
        vy: -0.9,
        text: `${Math.round(finalDmg)}`,
        color: floatColor,
        scale: finalDmg > 110 ? 1.15 : 0.92,
        timer: 0,
        duration: 0.52,
      });
    }

    if (e.hp <= 0) {
      if (e.side === 'player') {
        s.kills += 1;
        s.rations += e.rewardRations;
        s.ultCharge = Math.min(100, s.ultCharge + (e.isBoss ? 35 : e.isMiniBoss ? 20 : 2.4));
        SoundFX.enemyKill();

        // Boss / Elite Boss Death -> Guaranteed Divine Weapon Shard Chest Drop!!
        if (e.isBoss || e.isMiniBoss) {
          const dropCount = e.isBoss ? 2 : 1;
          let lastShard: WeaponId = 'weap_zhaoyun';
          for (let d = 0; d < dropCount; d++) {
            lastShard = SaveManager.grantRandomWeaponShard('weap_zhaoyun');
            s.droppedShards.push(lastShard);
          }
          SoundFX.fanfare();
          s.effects.push({
            kind: 'chest_drop',
            x: e.x,
            y: e.y,
            radius: 1.1,
            color: '#fde047',
            timer: 0,
            duration: 1.25,
          });
          const wName = t().weapons[lastShard].name;
          this.showBanner(t().bannerWeaponShardDrop(wName), 2.8);
        }
      }
      s.effects.push({
        kind: 'ring',
        x: e.x,
        y: e.y,
        radius: e.isBoss ? 1.2 : 0.45,
        color: '#d4af37',
        timer: 0,
        duration: 0.24,
      });
    }
  }

  // ==================== ENEMY MOVEMENT & DISTINCT BOSS AI ====================

  private updateEnemies(s: RunState, dt: number, playerRoadSlow: number): void {
    for (let i = s.enemies.length - 1; i >= 0; i--) {
      const e = s.enemies[i];
      if (e.hp <= 0) {
        s.enemies.splice(i, 1);
        continue;
      }

      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
      if (e.armorBrokenTimer > 0) e.armorBrokenTimer = Math.max(0, e.armorBrokenTimer - dt);
      if (e.slowTimer > 0) {
        e.slowTimer = Math.max(0, e.slowTimer - dt);
        if (e.slowTimer <= 0) e.slowPower = 0;
      }
      if (e.burnTimer > 0) {
        e.burnTimer = Math.max(0, e.burnTimer - dt);
        this.damageEnemy(s, e, e.burnDps * dt, true, '#ef4444');
        if (e.hp <= 0) {
          s.enemies.splice(i, 1);
          continue;
        }
      }

      // Boss Special Mechanics!
      if (e.bossType === 'zhangbao' && e.stunTimer <= 0) {
        e.bossSkillTimer -= dt;
        if (e.bossSkillTimer <= 0) {
          e.bossSkillTimer = 5.8;
          this.summonZhangBaoMinion(s, e);
          if (e.side === 'player') {
            this.showBanner(t().bannerZhangBaoSummon, 1.8);
          }
        }
      } else if (e.bossType === 'zhangjiao') {
        if (!e.healChantUsed && e.hp / e.maxHp <= 0.38) {
          e.healChantUsed = true;
          e.regenTimer = 3.2;
          if (e.side === 'player') {
            SoundFX.alarm();
            this.showBanner(t().bannerZhangJiaoHeal, 2.8);
          }
        }
        if (e.regenTimer > 0 && e.stunTimer <= 0) {
          e.regenTimer = Math.max(0, e.regenTimer - dt);
          e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.075 * dt);
        }
      }

      if (e.stunTimer > 0) {
        e.stunTimer = Math.max(0, e.stunTimer - dt);
        continue;
      }

      const lane = e.side === 'ai' ? s.stage.aiLane : s.stage.playerLane;
      const barricade = e.side === 'ai' ? s.aiBarricade : s.playerBarricade;

      if (barricade.hp > 0) {
        const bx = barricade.col + 0.5;
        const by = barricade.row + 0.5;
        if (Math.hypot(e.x - bx, e.y - by) <= 0.52) {
          e.bashTimer -= dt;
          if (e.bashTimer <= 0) {
            e.bashTimer = 0.65;
            const bashDmg =
              e.bossType === 'lubu' ? 95 : e.isBoss ? 70 : e.isMiniBoss ? 40 : e.kind === 'shield' ? 24 : 15;
            barricade.hp = Math.max(0, barricade.hp - bashDmg);
            barricade.shakeTimer = 0.16;
          }
          continue;
        }
      }

      const passiveSlow = e.side === 'player' ? playerRoadSlow : 0;
      const totalSlow = Math.min(0.72, Math.max(e.slowPower, passiveSlow));
      const effSpeed = e.speed * (1 - totalSlow);
      const wps = lane.waypoints;

      if (e.waypointIndex >= wps.length - 1) {
        this.handleEnemyBreachVip(s, e);
        s.enemies.splice(i, 1);
        if (s.wavePhase !== 'combat') return;
        continue;
      }

      const a = wps[e.waypointIndex];
      const b = wps[e.waypointIndex + 1];
      const segLen = Math.max(0.01, Math.hypot(b.col - a.col, b.row - a.row));
      e.segProgress += (effSpeed * dt) / segLen;

      while (e.segProgress >= 1 && e.waypointIndex < wps.length - 1) {
        e.segProgress -= 1;
        e.waypointIndex += 1;
      }

      if (e.waypointIndex >= wps.length - 1) {
        this.handleEnemyBreachVip(s, e);
        s.enemies.splice(i, 1);
        if (s.wavePhase !== 'combat') return;
        continue;
      }

      const curA = wps[e.waypointIndex];
      const curB = wps[e.waypointIndex + 1];
      e.x = curA.col + 0.5 + (curB.col - curA.col) * e.segProgress;
      e.y = curA.row + 0.5 + (curB.row - curA.row) * e.segProgress;
    }
  }

  private summonZhangBaoMinion(s: RunState, boss: EnemyEntity): void {
    const minionHp = boss.maxHp * 0.11;
    s.enemies.push({
      id: this.nextEnemyId++,
      side: boss.side,
      kind: 'wolf',
      bossType: 'none',
      isBoss: false,
      isMiniBoss: false,
      waypointIndex: boss.waypointIndex,
      segProgress: Math.min(0.95, boss.segProgress + 0.08),
      x: boss.x,
      y: boss.y,
      hp: minionHp,
      maxHp: minionHp,
      speed: 1.35,
      armor: 0,
      armorBrokenTimer: 0,
      rewardRations: 2,
      hitFlash: 0,
      slowTimer: 0,
      slowPower: 0,
      stunTimer: 0,
      burnTimer: 0,
      burnDps: 0,
      bashTimer: 0,
      bossSkillTimer: 99,
      healChantUsed: false,
      regenTimer: 0,
      radius: 0.28,
    });
    s.effects.push({
      kind: 'ring',
      x: boss.x,
      y: boss.y,
      radius: 0.85,
      color: '#eab308',
      timer: 0,
      duration: 0.35,
    });
  }

  private handleEnemyBreachVip(s: RunState, e: EnemyEntity): void {
    const heartLoss = e.isBoss ? 5 : e.isMiniBoss ? 3 : 1;

    if (e.side === 'ai') {
      if (s.aiCollapsed) return;
      s.aiHearts = Math.max(0, s.aiHearts - heartLoss);
      s.effects.push({
        kind: 'explosion',
        x: s.stage.aiLane.vipCell.col + 0.5,
        y: s.stage.aiLane.vipCell.row + 0.5,
        radius: 0.9,
        color: '#ef4444',
        timer: 0,
        duration: 0.35,
      });

      if (s.aiHearts <= 0) {
        s.aiCollapsed = true;
        s.enemies = s.enemies.filter((en) => en.side !== 'ai');
        s.projectiles = s.projectiles.filter((pr) => pr.side !== 'ai');

        if (s.mode === 'standard') {
          this.finishRun(true, true);
        } else {
          s.rations += 45;
          SoundFX.fanfare();
          this.showBanner(t().bannerRivalFallen, 3.0);
        }
      }
      return;
    }

    s.hearts = Math.max(0, s.hearts - heartLoss);
    s.screenShake = 0.45;
    SoundFX.alarm();
    s.effects.push({
      kind: 'explosion',
      x: s.stage.playerLane.vipCell.col + 0.5,
      y: s.stage.playerLane.vipCell.row + 0.5,
      radius: 1.0,
      color: '#dc2626',
      timer: 0,
      duration: 0.38,
    });

    if (s.hearts <= 0) {
      PlatformSDK.gameplayStop();
      if (!s.reviveUsed) {
        s.wavePhase = 'revive_wait';
        this.callbacks.onRequestRevive(true);
      } else {
        this.finishRun(false, false);
      }
    }
  }

  private finishRun(victory: boolean, aiDefeated: boolean): void {
    const s = this.state;
    if (!s || s.wavePhase === 'ended') return;
    s.wavePhase = 'ended';
    PlatformSDK.gameplayStop();

    if (victory) {
      SaveManager.markStageCleared(s.stage.id);
      // Victory Chest guarantees +1 extra Weapon Shard!
      const bonusShard = SaveManager.grantRandomWeaponShard();
      s.droppedShards.push(bonusShard);
      PlatformSDK.happyTime();
      SoundFX.fanfare();
    }
    if (s.mode === 'endless') {
      SaveManager.recordEndlessWave(s.stage.id, s.wave);
    }

    this.callbacks.onRunFinished(victory, {
      stageId: s.stage.id,
      mode: s.mode,
      wave: s.wave,
      kills: s.kills,
      merges: s.merges,
      victory,
      aiDefeated,
      droppedShards: [...s.droppedShards],
    });
  }

  private updateEffectsAndTexts(s: RunState, dt: number): void {
    for (let i = s.effects.length - 1; i >= 0; i--) {
      s.effects[i].timer += dt;
      if (s.effects[i].timer >= s.effects[i].duration) {
        s.effects.splice(i, 1);
      }
    }
    for (let i = s.floatTexts.length - 1; i >= 0; i--) {
      const ft = s.floatTexts[i];
      ft.timer += dt;
      ft.y += ft.vy * dt;
      if (ft.timer >= ft.duration) {
        s.floatTexts.splice(i, 1);
      }
    }
  }

  private spawnCombineFX(
    gx: number,
    gy: number,
    mode: 'awaken' | 'merge',
    resultId: UnitId
  ): void {
    const s = this.state;
    if (!s) return;
    if (mode === 'awaken') {
      s.effects.push({
        kind: 'awaken_pillar',
        x: gx,
        y: gy,
        radius: 1.45,
        color: UNITS[resultId].accentColor,
        timer: 0,
        duration: 0.72,
      });
    } else {
      s.effects.push({
        kind: 'merge_burst',
        x: gx,
        y: gy,
        radius: 0.95,
        color: '#d4af37',
        timer: 0,
        duration: 0.4,
      });
    }
  }

  // ==================== POINTER & KEYBOARD INPUT ====================

  private bindInput(): void {
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));

    window.addEventListener('keydown', (e) => {
      if (!this.state || this.state.wavePhase === 'ended') return;
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        this.callbacks.onTogglePause();
      } else if (!this.paused && !this.modalPaused) {
        if (e.key === ' ' || e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          this.recruitBench();
        } else if (e.key === 'q' || e.key === 'Q') {
          this.activateDivineTalisman();
        } else if (e.key === 'e' || e.key === 'E') {
          this.castExorcism();
        }
      }
    });
  }

  private hitTestBench(sx: number, sy: number): number {
    const L = this.layout;
    if (sy < L.benchY - 6 || sy > L.benchY + L.benchTileSize + 6) return -1;
    for (let i = 0; i < 5; i++) {
      const x0 = L.benchX + i * (L.benchTileSize + L.benchGap);
      if (sx >= x0 - 3 && sx <= x0 + L.benchTileSize + 3) {
        return i;
      }
    }
    return -1;
  }

  private hitTestBoard(sx: number, sy: number): { col: number; row: number } | null {
    const s = this.state;
    if (!s) return null;
    const L = this.layout;
    const col = Math.floor((sx - L.boardX) / L.cellSize);
    const row = Math.floor((sy - L.boardY) / L.cellSize);
    if (col < 0 || col >= s.stage.cols || row < 0 || row >= s.stage.rows) {
      return null;
    }
    return { col, row };
  }

  private onPointerDown(e: PointerEvent): void {
    const s = this.state;
    if (!s || this.paused || this.modalPaused || s.wavePhase === 'ended') return;

    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const cellHit = this.hitTestBoard(sx, sy);
    const benchIdx = this.hitTestBench(sx, sy);

    // 0) 神兵符 (Divine Upgrade Talisman) Target Pick!
    if (s.talismanMode) {
      if (cellHit && cellHit.row >= s.stage.dividerRow) {
        const u = s.board[cellHit.row][cellHit.col];
        if (u) {
          this.applyDivineTalismanToUnit(u, cellHit.col + 0.5, cellHit.row + 0.5);
          return;
        }
      }
      if (benchIdx >= 0 && s.bench[benchIdx]) {
        this.applyDivineTalismanToUnit(s.bench[benchIdx]!, 3.5, 7.5);
        return;
      }
      s.talismanMode = false;
      return;
    }

    // 1) Golden Shovel Excavation + Tomb Raider (摸金校尉) Passive!
    if (s.shovelMode && cellHit) {
      if (
        cellHit.row >= s.stage.dividerRow &&
        s.cells[cellHit.row][cellHit.col] === 'locked' &&
        s.shovels > 0
      ) {
        s.cells[cellHit.row][cellHit.col] = 'deploy';
        s.shovels -= 1;
        s.shovelMode = false;
        SoundFX.shovelDig();
        s.effects.push({
          kind: 'merge_burst',
          x: cellHit.col + 0.5,
          y: cellHit.row + 0.5,
          radius: 0.95,
          color: '#facc15',
          timer: 0,
          duration: 0.45,
        });

        const meta = SaveManager.getEffectiveBonuses();
        if (meta.tombRaiderLevel > 0) {
          const bonusBuns = 12 + meta.tombRaiderLevel * 6;
          s.rations += bonusBuns;
          const gotShard = Math.random() < 0.28;
          if (gotShard) {
            const sh = SaveManager.grantRandomWeaponShard();
            s.droppedShards.push(sh);
            s.effects.push({
              kind: 'chest_drop',
              x: cellHit.col + 0.5,
              y: cellHit.row + 0.5,
              radius: 0.9,
              color: '#fde047',
              timer: 0,
              duration: 1.1,
            });
          }
          this.showBanner(t().bannerTombRaiderBonus(bonusBuns, gotShard), 2.5);
        } else {
          this.showBanner(t().bannerTileUnlocked, 1.8);
        }
      } else {
        s.shovelMode = false;
      }
      return;
    }

    // 2) Read-only inspect AI Top Half unit
    if (cellHit && cellHit.row < s.stage.dividerRow) {
      const aiUnit = s.board[cellHit.row][cellHit.col];
      s.selectedUnitInfo = aiUnit ? { unitId: aiUnit.unitId, tier: aiUnit.tier } : null;
      s.selectedSource = null;
      return;
    }

    // 3) Player Bench or Player Bottom Half Board Tile
    if (benchIdx >= 0) {
      const unit = s.bench[benchIdx];
      if (unit) {
        s.selectedUnitInfo = { unitId: unit.unitId, tier: unit.tier };
        this.drag = {
          active: true,
          pointerId: e.pointerId,
          sourceType: 'bench',
          benchIdx,
          col: -1,
          row: -1,
          unit,
          startScreenX: sx,
          startScreenY: sy,
          screenX: sx,
          screenY: sy,
          movedEnough: false,
        };
        SoundFX.tileClack(false);
        return;
      } else if (s.selectedSource) {
        this.tryMoveOrCombine(s.selectedSource, { type: 'bench', benchIdx, col: -1, row: -1 });
        s.selectedSource = null;
        return;
      }
    }

    if (cellHit && cellHit.row >= s.stage.dividerRow) {
      const unit = s.board[cellHit.row][cellHit.col];
      if (unit) {
        s.selectedUnitInfo = { unitId: unit.unitId, tier: unit.tier };
        this.drag = {
          active: true,
          pointerId: e.pointerId,
          sourceType: 'board',
          benchIdx: -1,
          col: cellHit.col,
          row: cellHit.row,
          unit,
          startScreenX: sx,
          startScreenY: sy,
          screenX: sx,
          screenY: sy,
          movedEnough: false,
        };
        SoundFX.tileClack(false);
        return;
      } else if (s.cells[cellHit.row][cellHit.col] === 'locked') {
        if (s.shovels > 0) this.toggleShovelMode();
        return;
      } else if (s.selectedSource && s.cells[cellHit.row][cellHit.col] === 'deploy') {
        this.tryMoveOrCombine(s.selectedSource, {
          type: 'board',
          benchIdx: -1,
          col: cellHit.col,
          row: cellHit.row,
        });
        s.selectedSource = null;
        return;
      }
    }

    s.selectedSource = null;
    s.selectedUnitInfo = null;
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.drag || !this.drag.active || e.pointerId !== this.drag.pointerId) return;
    const rect = this.canvas.getBoundingClientRect();
    this.drag.screenX = e.clientX - rect.left;
    this.drag.screenY = e.clientY - rect.top;
    if (
      !this.drag.movedEnough &&
      Math.hypot(this.drag.screenX - this.drag.startScreenX, this.drag.screenY - this.drag.startScreenY) > 7
    ) {
      this.drag.movedEnough = true;
    }
  }

  private onPointerUp(e: PointerEvent): void {
    const s = this.state;
    if (!this.drag || !this.drag.active || e.pointerId !== this.drag.pointerId || !s) return;

    const d = this.drag;
    this.drag = null;

    const src: SelectedSource = {
      type: d.sourceType,
      benchIdx: d.benchIdx,
      col: d.col,
      row: d.row,
    };

    if (!d.movedEnough) {
      if (
        s.selectedSource &&
        !(
          s.selectedSource.type === src.type &&
          s.selectedSource.benchIdx === src.benchIdx &&
          s.selectedSource.col === src.col &&
          s.selectedSource.row === src.row
        )
      ) {
        if (this.tryMoveOrCombine(s.selectedSource, src)) {
          s.selectedSource = null;
          return;
        }
      }
      s.selectedSource = src;
      return;
    }

    const benchHit = this.hitTestBench(d.screenX, d.screenY);
    if (benchHit >= 0) {
      this.tryMoveOrCombine(src, { type: 'bench', benchIdx: benchHit, col: -1, row: -1 });
      s.selectedSource = null;
      return;
    }

    const boardHit = this.hitTestBoard(d.screenX, d.screenY);
    if (
      boardHit &&
      boardHit.row >= s.stage.dividerRow &&
      s.cells[boardHit.row][boardHit.col] === 'deploy'
    ) {
      this.tryMoveOrCombine(src, {
        type: 'board',
        benchIdx: -1,
        col: boardHit.col,
        row: boardHit.row,
      });
      s.selectedSource = null;
    }
  }

  private getUnitAt(loc: SelectedSource): TileUnit | null {
    const s = this.state;
    if (!s) return null;
    return loc.type === 'bench' ? s.bench[loc.benchIdx] : s.board[loc.row]?.[loc.col] ?? null;
  }

  private setUnitAt(loc: SelectedSource, unit: TileUnit | null): void {
    const s = this.state;
    if (!s) return;
    if (loc.type === 'bench') {
      s.bench[loc.benchIdx] = unit;
    } else {
      s.board[loc.row][loc.col] = unit;
    }
  }

  private tryMoveOrCombine(src: SelectedSource, dst: SelectedSource): boolean {
    const s = this.state;
    if (!s) return false;
    if (
      src.type === dst.type &&
      src.benchIdx === dst.benchIdx &&
      src.col === dst.col &&
      src.row === dst.row
    ) {
      return false;
    }

    const srcUnit = this.getUnitAt(src);
    if (!srcUnit) return false;

    const dstUnit = this.getUnitAt(dst);

    if (!dstUnit) {
      this.setUnitAt(dst, srcUnit);
      this.setUnitAt(src, null);
      srcUnit.mergeAnimTimer = 0.16;
      SoundFX.tileClack(true);
      this.recalcSynergies();
      return true;
    }

    const combo = checkTileCombine(srcUnit, dstUnit);
    if (combo) {
      const created = this.makeTile(combo.resultId, combo.resultTier);
      this.setUnitAt(dst, created);
      this.setUnitAt(src, null);

      s.merges += 1;
      s.selectedUnitInfo = { unitId: created.unitId, tier: created.tier };

      if (combo.mode === 'awaken') {
        s.ultCharge = Math.min(100, s.ultCharge + 22);
        s.screenShake = 0.32;
        SoundFX.dragonUlt();
        const heroTxt = getUnitDisplayText(combo.resultId);
        this.showBanner(t().bannerHeroAwakened(heroTxt.name), 2.6);
      } else {
        s.ultCharge = Math.min(100, s.ultCharge + 7);
        SoundFX.merge(combo.resultTier, UNITS[combo.resultId].category === 'awakened');
      }

      if (dst.type === 'board') {
        this.spawnCombineFX(dst.col + 0.5, dst.row + 0.5, combo.mode, combo.resultId);
      }

      this.recalcSynergies();
      return true;
    }

    this.setUnitAt(dst, srcUnit);
    this.setUnitAt(src, dstUnit);
    SoundFX.tileClack(false);
    this.recalcSynergies();
    return true;
  }
}
