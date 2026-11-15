import { SoundFX } from '../audio/SoundFX';
import {
  checkTileCombine,
  computeSynergies,
  getTierDamageMultiplier,
  getTierRangeBonus,
  getTierSpeedMultiplier,
  HERO_KEYS,
  TROOP_KEYS,
  UNITS,
} from '../data/units';
import { getUnitDisplayText, t } from '../i18n/locale';
import { SaveManager } from '../meta/SaveManager';
import { PlatformSDK } from '../platform/PlatformSDK';
import {
  ActiveSynergyInfo,
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
  isBoss: boolean;
  isMiniBoss: boolean;
  waypointIndex: number;
  segProgress: number; // 0..1 between waypoint[i] and waypoint[i+1]
  x: number; // in grid space (col + 0.5)
  y: number; // in grid space (row + 0.5)
  hp: number;
  maxHp: number;
  speed: number; // grid cells per sec
  armor: number; // flat dmg reduction ratio 0..0.42
  rewardRations: number;
  hitFlash: number;
  slowTimer: number;
  slowPower: number;
  stunTimer: number;
  burnTimer: number;
  burnDps: number;
  bashTimer: number;
  auraTimer: number;
  radius: number; // in grid units
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
    | 'frost'
    | 'spirit'
    | 'dragon'
    | 'glaive'
    | 'lotus'
    | 'phoenix';
  color: string;
  damage: number;
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
    | 'heal_ring';
  x: number;
  y: number;
  x2?: number;
  y2?: number;
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
  board: (TileUnit | null)[][]; // [row][col]
  bench: (TileUnit | null)[]; // 5 player camp slots

  // Player stats
  hearts: number;
  maxHearts: number;
  playerBarricade: LaneBarricade;

  // Rival AI stats
  aiHearts: number;
  aiMaxHearts: number;
  aiCollapsed: boolean;
  aiBarricade: LaneBarricade;
  aiActionTimer: number;
  aiExcavated: number;
  aiFortifiedOnce: boolean;

  // Economy & tools
  rations: number;
  passiveRationAcc: number;
  recruitCost: number;
  recruitCount: number;
  farmLevel: number;
  decreeLevel: number;
  shovels: number;
  shovelMode: boolean;

  // Ultimate & Ad flags
  ultCharge: number; // 0..100
  reviveUsed: boolean;
  heroScrollAdUsed: boolean;
  supplyAdCooldown: number;

  // Entities
  spawnQueue: SpawnOrder[];
  spawnTimer: number;
  enemies: EnemyEntity[];
  projectiles: ProjectileEntity[];
  effects: VisualEffect[];
  floatTexts: FloatingText[];

  // Synergies
  synergies: ActiveSynergyInfo[];
  synBonuses: ReturnType<typeof computeSynergies>;
  aiSynBonuses: ReturnType<typeof computeSynergies>;

  // Telemetry & UI feedback
  kills: number;
  merges: number;
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
    const aiBarricadeHp = 290;

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

      aiHearts: 10,
      aiMaxHearts: 10,
      aiCollapsed: false,
      aiBarricade: {
        side: 'ai',
        col: stage.aiLane.barricadeCell.col,
        row: stage.aiLane.barricadeCell.row,
        hp: aiBarricadeHp,
        maxHp: aiBarricadeHp,
        shakeTimer: 0,
      },
      aiActionTimer: 1.6,
      aiExcavated: 0,
      aiFortifiedOnce: false,

      rations: meta.startRations,
      passiveRationAcc: 0,
      recruitCost: 12,
      recruitCount: 0,
      farmLevel: 1,
      decreeLevel: 1,
      shovels: meta.startShovels,
      shovelMode: false,

      ultCharge: 35,
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
      bannerText: '',
      bannerTimer: 0,
      screenShake: 0,
      selectedSource: null,
      selectedUnitInfo: null,
    };

    // Give Player starter War-Camp tiles (including 1 Hero Soul so they immediately see the 2-piece crest system!)
    const starterHero: HeroKey = HERO_KEYS[Math.floor(Math.random() * HERO_KEYS.length)];
    this.state.bench[0] = this.makeTile('blade', 1);
    this.state.bench[1] = this.makeTile(`soul_${starterHero}`, 1);
    this.state.bench[2] = this.makeTile('archer', 1);

    // Seed Player 1 frontline guard on a deploy cell
    const playerDeploys = this.getSideCells('player', 'deploy');
    if (playerDeploys.length > 0) {
      const p0 = playerDeploys[1] || playerDeploys[0];
      this.state.board[p0.row][p0.col] = this.makeTile('lancer', 1);
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
      cooldown: Math.random() * 0.35,
      attackCount: 0,
      recoilTimer: 0,
      recoilAngle: 0,
      mergeAnimTimer: 0.25,
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

    // Reserve rows + 0.24 gap + 1.04 bench height
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

    // Tent + 5 bench slots centered under the board
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

    if (s.bannerTimer > 0) {
      s.bannerTimer = Math.max(0, s.bannerTimer - dt);
    }
    if (s.screenShake > 0) {
      s.screenShake = Math.max(0, s.screenShake - dt * 2.8);
    }

    if (this.paused || this.modalPaused || s.wavePhase === 'ended' || s.wavePhase === 'revive_wait') {
      return;
    }

    if (s.supplyAdCooldown > 0) {
      s.supplyAdCooldown = Math.max(0, s.supplyAdCooldown - dt);
    }

    // Passive Granary grain income
    const meta = SaveManager.getEffectiveBonuses();
    const rationsPerSec = 1.05 + (s.farmLevel - 1) * 0.58 + meta.passiveRationBonus;
    s.passiveRationAcc += rationsPerSec * dt;
    if (s.passiveRationAcc >= 1) {
      const whole = Math.floor(s.passiveRationAcc);
      s.rations += whole;
      s.passiveRationAcc -= whole;
    }

    // Passive Ultimate charge
    s.ultCharge = Math.min(100, s.ultCharge + dt * 1.65);

    // Wave state machine
    this.updateWaveFlow(s, dt);

    // Simulated Rival AI on Top Half (rows 0..4)
    if (!s.aiCollapsed) {
      this.updateRivalAI(s, dt);
    }

    // Units fire on both halves
    this.updateBoardUnits(s, dt);

    // Projectiles, Enemies, Effects
    this.updateProjectiles(s, dt);
    this.updateEnemies(s, dt);
    this.updateEffectsAndTexts(s, dt);

    if (s.playerBarricade.shakeTimer > 0) {
      s.playerBarricade.shakeTimer = Math.max(0, s.playerBarricade.shakeTimer - dt);
    }
    if (s.aiBarricade.shakeTimer > 0) {
      s.aiBarricade.shakeTimer = Math.max(0, s.aiBarricade.shakeTimer - dt);
    }
  }

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
            s.phaseTimer = 3.2;
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
    const isBossWave = w % 10 === 0;
    const isMiniBossWave = !isBossWave && w % 5 === 0;

    const queue: SpawnOrder[] = [];
    const totalCount = 6 + Math.floor(w * 2.1);

    for (let i = 0; i < totalCount; i++) {
      let kind: EnemyKind = 'grunt';
      const roll = Math.random();
      if (w >= 3 && roll < 0.24) {
        kind = 'shield';
      } else if (w >= 2 && roll < 0.54) {
        kind = 'wolf';
      }
      const gap = Math.max(0.36, 1.08 - w * 0.032) * (kind === 'wolf' ? 0.78 : 1.0);
      queue.push({ delay: i === 0 ? 0.2 : gap, kind, isBoss: false, isMiniBoss: false });
    }

    if (isMiniBossWave) {
      queue.push({ delay: 1.1, kind: 'shield', isBoss: false, isMiniBoss: true });
    }

    if (isBossWave) {
      queue.push({ delay: 1.35, kind: 'lubu', isBoss: true, isMiniBoss: false });
      SoundFX.alarm();
      this.showBanner(t().bannerBoss, 3.2);
    } else {
      SoundFX.recruit();
      this.showBanner(t().bannerWaveStart(w), 2.1);
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
    const stageMult = 1 + s.stage.index * 0.2;
    const waveMult = Math.pow(1.21, w - 1) * stageMult;

    let hp = 68 * waveMult;
    let speed = 0.92;
    let armor = 0;
    let reward = 3;
    let radius = 0.3;

    if (order.kind === 'wolf') {
      hp = 46 * waveMult;
      speed = 1.48;
      reward = 3;
      radius = 0.28;
    } else if (order.kind === 'shield') {
      hp = 138 * waveMult;
      speed = 0.68;
      armor = 0.28;
      reward = 5;
      radius = 0.34;
    } else if (order.kind === 'lubu') {
      hp = 820 * waveMult;
      speed = 0.56;
      armor = 0.22;
      reward = 35;
      radius = 0.44;
    }

    if (order.isMiniBoss) {
      hp *= 2.85;
      speed = 0.58;
      armor = 0.32;
      reward = 18;
      radius = 0.4;
    }

    const wp0 = lane.waypoints[0];
    s.enemies.push({
      id: this.nextEnemyId++,
      side,
      kind: order.kind,
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
      rewardRations: reward,
      hitFlash: 0,
      slowTimer: 0,
      slowPower: 0,
      stunTimer: 0,
      burnTimer: 0,
      burnDps: 0,
      bashTimer: 0,
      auraTimer: 0,
      radius,
    });
  }

  // ==================== SIMULATED RIVAL AI (TOP HALF) ====================

  private updateRivalAI(s: RunState, dt: number): void {
    s.aiActionTimer -= dt;
    if (s.aiActionTimer > 0) return;

    // Pace AI actions naturally (every 2.4s .. 3.5s)
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

    // 1) Priority: Fuse matching Soul + Weapon into Awakened General!
    for (let i = 0; i < occupied.length; i++) {
      for (let j = i + 1; j < occupied.length; j++) {
        const a = occupied[i];
        const b = occupied[j];
        const res = checkTileCombine(a.unit, b.unit);
        if (res && res.mode === 'awaken') {
          s.board[b.row][b.col] = this.makeTile(res.resultId, res.resultTier);
          s.board[a.row][a.col] = null;
          this.spawnCombineFX(b.col + 0.5, b.row + 0.5, res.mode, res.resultId);
          const heroTxt = getUnitDisplayText(res.resultId);
          this.showBanner(t().bannerRivalAwakened(heroTxt.name), 2.4);
          this.recalcSynergies();
          return;
        }
      }
    }

    // 2) Priority: Merge identical same-tier units!
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

    // 3) Occasionally excavate a locked cell on AI side as waves progress
    const targetExcavations = Math.min(4, Math.floor(s.wave / 2));
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

    // 4) Emergency AI barricade repair once per match
    if (
      !s.aiFortifiedOnce &&
      s.aiBarricade.hp < s.aiBarricade.maxHp * 0.3 &&
      s.aiHearts <= 6
    ) {
      s.aiFortifiedOnce = true;
      s.aiBarricade.hp = Math.min(s.aiBarricade.maxHp, s.aiBarricade.hp + s.aiBarricade.maxHp * 0.65);
      s.aiHearts = Math.min(s.aiMaxHearts, s.aiHearts + 1);
      s.effects.push({
        kind: 'heal_ring',
        x: s.stage.aiLane.vipCell.col + 0.5,
        y: s.stage.aiLane.vipCell.row + 0.5,
        radius: 0.9,
        color: '#52b788',
        timer: 0,
        duration: 0.6,
      });
      return;
    }

    // 5) Conscript onto an empty AI deploy pedestal
    if (emptyDeploys.length > 0) {
      const slot = emptyDeploys[Math.floor(Math.random() * emptyDeploys.length)];
      const unitId = this.rollUnitForSide('ai');
      s.board[slot.row][slot.col] = this.makeTile(unitId, 1);
      this.recalcSynergies();
      return;
    }

    // 6) If all AI deploy slots are full and deadlocked, cycle weakest T1 tile into a matching partner!
    const lowTiles = occupied.filter(
      (o) => o.unit.tier === 1 && UNITS[o.unit.unitId].category !== 'awakened'
    );
    if (lowTiles.length >= 2) {
      const victim = lowTiles[0];
      const partnerTarget = lowTiles[1].unit;
      const partnerDef = UNITS[partnerTarget.unitId];
      let replacementId: UnitId = partnerTarget.unitId;
      if (partnerDef.category === 'soul' && partnerDef.heroKey) {
        replacementId = `weap_${partnerDef.heroKey}`;
      } else if (partnerDef.category === 'weapon' && partnerDef.heroKey) {
        replacementId = `soul_${partnerDef.heroKey}`;
      }
      s.board[victim.row][victim.col] = this.makeTile(replacementId, 1);
      this.recalcSynergies();
    }
  }

  // ==================== DRAFTING & SMART 2-TILE PAIRING ====================

  public getHeroDraftChance(): number {
    const s = this.state;
    const meta = SaveManager.getEffectiveBonuses();
    const decreeBonus = s ? (s.decreeLevel - 1) * 0.055 : 0;
    return Math.min(0.58, 0.22 + meta.heroChanceBonus + decreeBonus);
  }

  private findUnmatchedHeroPieces(side: SideOwner): { heroKey: HeroKey; missingId: UnitId }[] {
    const s = this.state;
    if (!s) return [];

    const hasSoul = new Set<HeroKey>();
    const hasWeap = new Set<HeroKey>();

    const scanUnit = (u: TileUnit | null) => {
      if (!u) return;
      const def = UNITS[u.unitId];
      if (def.category === 'soul' && def.heroKey) hasSoul.add(def.heroKey);
      else if (def.category === 'weapon' && def.heroKey) hasWeap.add(def.heroKey);
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
      if (hasSoul.has(h) && !hasWeap.has(h)) {
        unmatched.push({ heroKey: h, missingId: `weap_${h}` });
      } else if (hasWeap.has(h) && !hasSoul.has(h)) {
        unmatched.push({ heroKey: h, missingId: `soul_${h}` });
      }
    }
    return unmatched;
  }

  private rollUnitForSide(side: SideOwner): UnitId {
    const heroChance = side === 'player' ? this.getHeroDraftChance() : 0.25;
    if (Math.random() < heroChance) {
      const unmatched = this.findUnmatchedHeroPieces(side);
      // Smart Pity: 44% chance to roll the exact missing partner so 2-tile Hero Fusion feels rewarding!
      if (unmatched.length > 0 && Math.random() < 0.44) {
        return unmatched[Math.floor(Math.random() * unmatched.length)].missingId;
      }
      const h = HERO_KEYS[Math.floor(Math.random() * HERO_KEYS.length)];
      return Math.random() < 0.5 ? `soul_${h}` : `weap_${h}`;
    }
    return TROOP_KEYS[Math.floor(Math.random() * TROOP_KEYS.length)];
  }

  // ==================== PLAYER COMMANDS & ECONOMY ====================

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
      // Bench full -> Refresh all 5 bench slots!
      for (let i = 0; i < s.bench.length; i++) {
        s.bench[i] = this.makeTile(this.rollUnitForSide('player'), 1);
      }
    }

    s.selectedSource = null;
    SoundFX.recruit();
  }

  public grantGuaranteedHero(): void {
    const s = this.state;
    if (!s) return;

    const unmatched = this.findUnmatchedHeroPieces('player');
    if (unmatched.length > 0) {
      // Spawn the exact missing counterpart so the player can immediately fuse!
      const pair = unmatched[0];
      const emptyIdx = s.bench.findIndex((b) => b === null);
      const targetIdx = emptyIdx >= 0 ? emptyIdx : 0;
      s.bench[targetIdx] = this.makeTile(pair.missingId, 1);
      const txt = getUnitDisplayText(pair.missingId);
      SoundFX.merge(3, true);
      this.showBanner(`✦ ${txt.name}`, 2.4);
      return;
    }

    // Otherwise grant a matched [Soul + Weapon] pair onto the bench!
    const h = HERO_KEYS[Math.floor(Math.random() * HERO_KEYS.length)];
    const slots: number[] = [];
    for (let i = 0; i < s.bench.length; i++) {
      if (s.bench[i] === null) slots.push(i);
    }
    for (let i = 0; i < s.bench.length && slots.length < 2; i++) {
      if (!slots.includes(i)) slots.push(i);
    }
    s.bench[slots[0]] = this.makeTile(`soul_${h}`, 1);
    s.bench[slots[1]] = this.makeTile(`weap_${h}`, 1);
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

  public getDecreeCost(): number {
    const s = this.state;
    if (!s) return 24;
    return 24 + (s.decreeLevel - 1) * 18;
  }

  public upgradeDecree(): void {
    const s = this.state;
    if (!s) return;
    if (s.decreeLevel >= 5) {
      this.showBanner(t().bannerMaxLevel, 1.4);
      return;
    }
    const cost = this.getDecreeCost();
    if (s.rations < cost) {
      this.showBanner(t().bannerNeedRations, 1.4);
      return;
    }
    s.rations -= cost;
    s.decreeLevel += 1;
    SoundFX.tileClack(true);
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
      s.playerBarricade.hp + Math.round(s.playerBarricade.maxHp * 0.55)
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

  public castDragonUlt(): void {
    const s = this.state;
    if (!s || s.ultCharge < 100) return;

    s.ultCharge = 0;
    s.screenShake = 0.65;
    SoundFX.dragonUlt();
    this.showBanner(t().bannerUltCast, 2.2);

    s.effects.push({
      kind: 'dragon_ult',
      x: s.stage.cols * 0.5,
      y: s.stage.dividerRow + (s.stage.rows - s.stage.dividerRow) * 0.5,
      radius: 4.5,
      color: '#38bdf8',
      timer: 0,
      duration: 0.85,
    });

    const meta = SaveManager.getEffectiveBonuses();
    const ultDmg = (210 + s.wave * 48) * meta.damageMult;

    for (const e of s.enemies) {
      if (e.side !== 'player') continue;
      this.damageEnemy(s, e, ultDmg, true, '#38bdf8');
      e.stunTimer = Math.max(e.stunTimer, 1.35);
    }
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

    // Wipe non-boss enemies on player side and heavily damage bosses
    for (const e of s.enemies) {
      if (e.side !== 'player') continue;
      if (e.isBoss) {
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

  // ==================== COMBAT: UNITS, PROJECTILES & ENEMIES ====================

  private updateBoardUnits(s: RunState, dt: number): void {
    const meta = SaveManager.getEffectiveBonuses();

    for (let r = 0; r < s.stage.rows; r++) {
      const side: SideOwner = r < s.stage.dividerRow ? 'ai' : 'player';
      if (side === 'ai' && s.aiCollapsed) continue;

      const syn = side === 'player' ? s.synBonuses : s.aiSynBonuses;
      const sideDmgScale = side === 'player' ? meta.damageMult : 0.88;

      for (let c = 0; c < s.stage.cols; c++) {
        const u = s.board[r][c];
        if (!u) continue;

        if (u.recoilTimer > 0) u.recoilTimer = Math.max(0, u.recoilTimer - dt);
        if (u.mergeAnimTimer > 0) u.mergeAnimTimer = Math.max(0, u.mergeAnimTimer - dt);

        // Skip attacking if currently dragged by player
        if (
          this.drag?.active &&
          this.drag.sourceType === 'board' &&
          this.drag.col === c &&
          this.drag.row === r
        ) {
          continue;
        }

        const def = UNITS[u.unitId];
        const speedMult = getTierSpeedMultiplier(u.tier) * syn.globalAspdMult;
        u.cooldown -= dt * speedMult;
        if (u.cooldown > 0) continue;

        const range = def.rangeCells + getTierRangeBonus(u.tier);
        const ux = c + 0.5;
        const uy = r + 0.5;

        const target = this.pickTarget(s, side, ux, uy, range);
        if (!target) {
          u.cooldown = 0.12;
          continue;
        }

        u.cooldown = def.attackInterval;
        u.attackCount += 1;

        const angle = Math.atan2(target.y - uy, target.x - ux);
        u.recoilAngle = angle;
        u.recoilTimer = 0.14;

        let dmg =
          def.baseDamage *
          getTierDamageMultiplier(u.tier) *
          syn.globalDmgMult *
          sideDmgScale;

        if (def.synergy === 'mystic') {
          dmg *= syn.mysticPowerMult;
        }
        if (Math.random() < syn.critChance) {
          dmg *= 1.65;
        }

        const skillPeriod = def.skillEveryN
          ? Math.max(2, def.skillEveryN - (syn.heroSkillFaster ? 1 : 0))
          : 0;
        const isSkillStrike = skillPeriod > 0 && u.attackCount % skillPeriod === 0;

        this.executeUnitAttack(s, side, u, def, ux, uy, target, angle, dmg, isSkillStrike);
      }
    }
  }

  private pickTarget(
    s: RunState,
    side: SideOwner,
    ux: number,
    uy: number,
    range: number
  ): EnemyEntity | null {
    const r2 = range * range;
    let best: EnemyEntity | null = null;
    let bestScore = -1;

    for (const e of s.enemies) {
      if (e.side !== side || e.hp <= 0) continue;
      const dx = e.x - ux;
      const dy = e.y - uy;
      if (dx * dx + dy * dy <= r2) {
        const progress = e.waypointIndex + e.segProgress;
        if (progress > bestScore) {
          bestScore = progress;
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
    isSkill: boolean
  ): void {
    const playSfx = side === 'player';

    switch (def.pattern) {
      case 'cleave': {
        const aoe = def.aoeRadiusCells || 1.45;
        if (playSfx) SoundFX.attack('slash');
        s.effects.push({
          kind: 'slash',
          x: ux,
          y: uy,
          radius: aoe,
          color: def.accentColor,
          timer: 0,
          duration: 0.22,
          angle,
        });
        for (const e of s.enemies) {
          if (e.side !== side) continue;
          if (Math.hypot(e.x - ux, e.y - uy) <= aoe + e.radius) {
            this.damageEnemy(s, e, dmg, false, def.accentColor);
          }
        }
        break;
      }

      case 'arrow': {
        if (playSfx) SoundFX.attack('bow');
        this.spawnProj(s, side, ux, uy, target, 'arrow', def.accentColor, dmg, def.projectileSpeed);
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
          color: '#e07a5f',
          damage: dmg,
          aoeRadius: 0,
          pierceLeft: 3 + Math.floor(u.tier / 2),
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
          aoeRadius: def.aoeRadiusCells || 1.38,
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

      case 'frost_bolt': {
        if (playSfx) SoundFX.attack('frost');
        const p = this.spawnProj(
          s,
          side,
          ux,
          uy,
          target,
          'frost',
          '#38bdf8',
          dmg,
          def.projectileSpeed
        );
        p.slowFactor = def.slowFactor || 0.42;
        p.slowDur = def.slowDuration || 2.2;
        break;
      }

      case 'spirit_strike': {
        if (playSfx) SoundFX.attack('bow');
        this.spawnProj(
          s,
          side,
          ux,
          uy,
          target,
          'spirit',
          def.accentColor,
          dmg,
          def.projectileSpeed
        );
        break;
      }

      case 'dragon_sweep': {
        if (playSfx) SoundFX.attack('lance');
        s.effects.push({
          kind: 'slash',
          x: ux,
          y: uy,
          radius: 1.75,
          color: '#38bdf8',
          timer: 0,
          duration: 0.25,
          angle,
        });
        for (const e of s.enemies) {
          if (e.side === side && Math.hypot(e.x - ux, e.y - uy) <= 1.85) {
            this.damageEnemy(s, e, dmg, false, '#38bdf8');
          }
        }
        if (isSkill) {
          s.projectiles.push({
            side,
            x: ux,
            y: uy,
            vx: Math.cos(angle) * 10.5,
            vy: Math.sin(angle) * 10.5,
            tx: target.x,
            ty: target.y,
            kind: 'dragon',
            color: '#38bdf8',
            damage: dmg * 1.65,
            aoeRadius: 0.75,
            pierceLeft: 8,
            hitIds: new Set(),
            slowFactor: 0,
            slowDur: 0,
            stunDur: 0.35,
            executeRatio: 0,
            burnDps: 0,
            life: 0,
            maxLife: 0.65,
          });
        }
        break;
      }

      case 'jade_execute': {
        if (playSfx) SoundFX.attack('slash');
        s.effects.push({
          kind: 'slash',
          x: ux,
          y: uy,
          radius: 1.75,
          color: '#2dd4bf',
          timer: 0,
          duration: 0.26,
          angle,
        });
        for (const e of s.enemies) {
          if (e.side === side && Math.hypot(e.x - ux, e.y - uy) <= 1.8) {
            if (!e.isBoss && e.hp / e.maxHp <= 0.22) {
              this.damageEnemy(s, e, e.hp * 2, true, '#10b981');
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
            vx: Math.cos(angle) * 9.0,
            vy: Math.sin(angle) * 9.0,
            tx: target.x,
            ty: target.y,
            kind: 'glaive',
            color: '#10b981',
            damage: dmg * 1.5,
            aoeRadius: 0.7,
            pierceLeft: 6,
            hitIds: new Set(),
            slowFactor: 0,
            slowDur: 0,
            stunDur: 0,
            executeRatio: 0.22,
            burnDps: 0,
            life: 0,
            maxLife: 0.58,
          });
        }
        break;
      }

      case 'roar_quake': {
        const rad = (def.aoeRadiusCells || 2.15) * (isSkill ? 1.25 : 1.0);
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
              e.stunTimer = Math.max(e.stunTimer, def.stunDuration || 1.1);
            }
          }
        }
        break;
      }

      case 'chain_lightning': {
        if (playSfx) SoundFX.attack('thunder');
        const maxJumps = isSkill ? 6 : 3;
        const visited = new Set<number>();
        const pts: { x: number; y: number }[] = [{ x: ux, y: uy }];
        let cur: EnemyEntity | null = target;
        let curDmg = dmg * (isSkill ? 1.35 : 1.0);

        for (let j = 0; j < maxJumps && cur; j++) {
          visited.add(cur.id);
          pts.push({ x: cur.x, y: cur.y });
          this.damageEnemy(s, cur, curDmg, true, '#eab308');
          curDmg *= 0.86;

          let nextEnemy: EnemyEntity | null = null;
          let bestD = 2.6;
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
        p.slowFactor = def.slowFactor || 0.52;
        p.slowDur = def.slowDuration || 2.6;
        if (isSkill) p.stunDur = def.stunDuration || 0.85;
        break;
      }

      case 'phoenix_volley': {
        if (playSfx) SoundFX.attack('bow');
        const targets = s.enemies
          .filter((e) => e.side === side && Math.hypot(e.x - ux, e.y - uy) <= def.rangeCells + 0.4)
          .slice(0, isSkill ? 4 : 2);
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
            dmg * (isSkill ? 1.25 : 0.92),
            def.projectileSpeed
          );
          p.burnDps = dmg * 0.32;
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

      // Homing adjustment for single-target bolts
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
              if (sub.side !== p.side) continue;
              if (Math.hypot(sub.x - e.x, sub.y - e.y) <= p.aoeRadius) {
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

      if (remove) {
        s.projectiles.splice(i, 1);
      }
    }
  }

  private applyProjHit(s: RunState, p: ProjectileEntity, e: EnemyEntity): void {
    if (p.executeRatio > 0 && !e.isBoss && e.hp / e.maxHp <= p.executeRatio) {
      this.damageEnemy(s, e, e.hp * 2, true, p.color);
    } else {
      this.damageEnemy(s, e, p.damage, p.kind === 'dragon' || p.kind === 'phoenix', p.color);
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
    const effArmor = armorPiercing ? e.armor * 0.25 : e.armor;
    const finalDmg = Math.max(1, rawDmg * (1 - effArmor));
    e.hp -= finalDmg;
    e.hitFlash = 0.11;

    if (e.side === 'player' && Math.random() < 0.42) {
      s.floatTexts.push({
        x: e.x + (Math.random() - 0.5) * 0.3,
        y: e.y - 0.25,
        vy: -0.9,
        text: `${Math.round(finalDmg)}`,
        color: floatColor,
        scale: finalDmg > 95 ? 1.15 : 0.92,
        timer: 0,
        duration: 0.52,
      });
    }

    if (e.hp <= 0) {
      if (e.side === 'player') {
        s.kills += 1;
        s.rations += e.rewardRations;
        s.ultCharge = Math.min(100, s.ultCharge + (e.isBoss ? 25 : 2.1));
        SoundFX.enemyKill();
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

  private updateEnemies(s: RunState, dt: number): void {
    for (let i = s.enemies.length - 1; i >= 0; i--) {
      const e = s.enemies[i];
      if (e.hp <= 0) {
        s.enemies.splice(i, 1);
        continue;
      }

      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
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
      if (e.stunTimer > 0) {
        e.stunTimer = Math.max(0, e.stunTimer - dt);
        continue;
      }

      const lane = e.side === 'ai' ? s.stage.aiLane : s.stage.playerLane;
      const barricade = e.side === 'ai' ? s.aiBarricade : s.playerBarricade;

      // Check if blocked by Spike Barricade
      if (barricade.hp > 0) {
        const bx = barricade.col + 0.5;
        const by = barricade.row + 0.5;
        if (Math.hypot(e.x - bx, e.y - by) <= 0.52) {
          e.bashTimer -= dt;
          if (e.bashTimer <= 0) {
            e.bashTimer = 0.65;
            const bashDmg = e.isBoss ? 85 : e.isMiniBoss ? 42 : e.kind === 'shield' ? 24 : 15;
            barricade.hp = Math.max(0, barricade.hp - bashDmg);
            barricade.shakeTimer = 0.16;
          }
          continue;
        }
      }

      const effSpeed = e.speed * (1 - e.slowPower);
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
          // Player outlasted the Rival Warlord in Standard 10-Wave Duel!
          this.finishRun(true, true);
        } else {
          // Endless mode: award spoils & let player keep climbing waves!
          s.rations += 45;
          SoundFX.fanfare();
          this.showBanner(t().bannerRivalFallen, 3.0);
        }
      }
      return;
    }

    // Player VIP breached
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
        } else if (e.key === 'q' || e.key === 'Q' || e.key === 'e' || e.key === 'E') {
          this.castDragonUlt();
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

    // 1) Golden Shovel Excavation (Strictly Player's Bottom Half: row >= stage.dividerRow)
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
        this.showBanner(t().bannerTileUnlocked, 1.8);
      } else {
        s.shovelMode = false;
      }
      return;
    }

    // 2) Inspect AI Top Half unit if tapped (read-only!)
    if (cellHit && cellHit.row < s.stage.dividerRow) {
      const aiUnit = s.board[cellHit.row][cellHit.col];
      s.selectedUnitInfo = aiUnit ? { unitId: aiUnit.unitId, tier: aiUnit.tier } : null;
      s.selectedSource = null;
      return;
    }

    // 3) Player Bench or Player Bottom Half Board Tile
    const benchIdx = this.hitTestBench(sx, sy);
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
        // Quick tap on locked basalt cell offers Shovel if available
        if (s.shovels > 0) {
          this.toggleShovelMode();
        }
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

    // Tap without drag -> support click-to-select & tap-to-merge!
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

    // Drag drop target
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

    // 1) Empty destination -> Move!
    if (!dstUnit) {
      this.setUnitAt(dst, srcUnit);
      this.setUnitAt(src, null);
      srcUnit.mergeAnimTimer = 0.16;
      SoundFX.tileClack(true);
      this.recalcSynergies();
      return true;
    }

    // 2) Check 2-Tile Hero Awakening OR Same-Tier Upgrade Merge!
    const combo = checkTileCombine(srcUnit, dstUnit);
    if (combo) {
      const created = this.makeTile(combo.resultId, combo.resultTier);
      this.setUnitAt(dst, created);
      this.setUnitAt(src, null);

      s.merges += 1;
      s.selectedUnitInfo = { unitId: created.unitId, tier: created.tier };

      if (combo.mode === 'awaken') {
        s.ultCharge = Math.min(100, s.ultCharge + 18);
        s.screenShake = 0.32;
        SoundFX.dragonUlt();
        const heroTxt = getUnitDisplayText(combo.resultId);
        this.showBanner(t().bannerHeroAwakened(heroTxt.name), 2.6);
      } else {
        s.ultCharge = Math.min(100, s.ultCharge + 6);
        SoundFX.merge(combo.resultTier, UNITS[combo.resultId].category === 'awakened');
      }

      if (dst.type === 'board') {
        this.spawnCombineFX(dst.col + 0.5, dst.row + 0.5, combo.mode, combo.resultId);
      }

      this.recalcSynergies();
      return true;
    }

    // 3) Otherwise swap positions cleanly!
    this.setUnitAt(dst, srcUnit);
    this.setUnitAt(src, dstUnit);
    SoundFX.tileClack(false);
    this.recalcSynergies();
    return true;
  }
}
