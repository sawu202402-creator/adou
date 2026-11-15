import { SoundFX } from '../audio/SoundFX';
import {
  ALL_UNIT_IDS,
  computeSynergies,
  getTierDamageMultiplier,
  getTierRangeBonus,
  getTierSpeedMultiplier,
  HERO_IDS,
  MAX_TILE_TIER,
  TROOP_IDS,
  UNITS,
} from '../data/units';
import { t } from '../i18n/locale';
import { SaveManager } from '../meta/SaveManager';
import { PlatformSDK } from '../platform/PlatformSDK';
import {
  ActiveSynergyInfo,
  CellType,
  EnemyKind,
  GameMode,
  GridPoint,
  RunSummary,
  StageDef,
  TileUnit,
  UnitId,
} from '../types';

export interface LaneBarricade {
  laneId: string;
  col: number;
  row: number;
  hp: number;
  maxHp: number;
  shakeTimer: number;
}

export interface EnemyEntity {
  id: number;
  kind: EnemyKind;
  laneIndex: number;
  waypointIndex: number;
  segProgress: number; // 0..1 between waypoint[i] and waypoint[i+1]
  x: number; // in grid space (col + 0.5)
  y: number; // in grid space (row + 0.5)
  hp: number;
  maxHp: number;
  speed: number; // grid cells per sec
  armor: number; // flat dmg reduction ratio 0..0.45
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
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetId?: number;
  tx: number;
  ty: number;
  kind: 'arrow' | 'lance' | 'mortar' | 'frost' | 'dragon' | 'glaive' | 'lotus' | 'phoenix';
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
  kind: 'slash' | 'ring' | 'explosion' | 'lightning' | 'merge_burst' | 'dragon_ult' | 'heal_ring';
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
  moved: boolean;
}

export interface SelectedSource {
  sourceType: 'bench' | 'board';
  benchIdx: number;
  col: number;
  row: number;
}

export interface LayoutMetrics {
  cellSize: number;
  boardX: number;
  boardY: number;
  boardW: number;
  boardH: number;
  benchY: number;
  benchH: number;
  tentRect: { x: number; y: number; w: number; h: number };
  benchSlots: { x: number; y: number; size: number }[];
}

export interface EngineCallbacks {
  onTogglePause: () => void;
  onRequestRevive: (canRevive: boolean) => void;
  onRunFinished: (victory: boolean, summary: RunSummary) => void;
  onRequestShovelAd: () => void;
}

export interface BattleState {
  stage: StageDef;
  mode: GameMode;
  cells: CellType[][];
  board: (TileUnit | null)[][];
  bench: (TileUnit | null)[];
  barricades: LaneBarricade[];

  hearts: number;
  maxHearts: number;
  hurtFlash: number;
  screenShake: number;

  rations: number;
  rationAccum: number;
  recruitCost: number;
  recruitCount: number;

  farmLevel: number;
  decreeLevel: number;
  shovels: number;
  shovelMode: boolean;
  heroScrollAdUsed: boolean;
  supplyAdCooldown: number;

  ultCharge: number; // 0..100

  wave: number;
  maxWaves: number | null;
  wavePhase: 'prep' | 'spawning' | 'clearing' | 'ended';
  phaseTimer: number;
  spawnQueue: { kind: EnemyKind; delay: number }[];
  spawnTimer: number;

  enemies: EnemyEntity[];
  projectiles: ProjectileEntity[];
  effects: VisualEffect[];
  floats: FloatingText[];

  synergies: ActiveSynergyInfo[];
  synergyBonuses: {
    globalDmgMult: number;
    globalAspdMult: number;
    mysticPowerMult: number;
    heroSkillFaster: boolean;
    critChance: number;
  };

  kills: number;
  merges: number;
  reviveUsed: boolean;

  bannerText: string;
  bannerTimer: number;

  selectedUnitInfo: { unitId: UnitId; tier: number } | null;
  selectedInfoTimer: number;
}

export class GameEngine {
  public state: BattleState | null = null;
  public paused = false;
  public modalPaused = false;
  public drag: DragState | null = null;
  public selected: SelectedSource | null = null;
  public layout: LayoutMetrics = {
    cellSize: 48,
    boardX: 0,
    boardY: 60,
    boardW: 384,
    boardH: 432,
    benchY: 504,
    benchH: 52,
    tentRect: { x: 0, y: 504, w: 50, h: 50 },
    benchSlots: [],
  };

  private nextUid = 1;
  private nextEnemyId = 1;

  constructor(
    private canvas: HTMLCanvasElement,
    private callbacks: EngineCallbacks
  ) {
    this.bindPointerEvents();
    window.addEventListener('keydown', (e) => {
      if (!this.state) return;
      if (e.key === 'Escape') {
        if (this.state.shovelMode) {
          this.state.shovelMode = false;
          return;
        }
        this.callbacks.onTogglePause();
      } else if (e.key === ' ' || e.key === 'r' || e.key === 'R') {
        if (!this.paused && !this.modalPaused) {
          this.recruitBench();
        }
      }
    });
  }

  public computeLayout(viewW: number, viewH: number): LayoutMetrics {
    const cols = this.state?.stage.cols ?? 8;
    const rows = this.state?.stage.rows ?? 9;
    const topSafe = viewH < 660 ? 50 : 58;
    const bottomSafe = viewH < 660 ? 112 : 128;

    const availW = Math.max(240, viewW - 16);
    const availH = Math.max(280, viewH - topSafe - bottomSafe);

    const cellByW = availW / cols;
    const cellByH = availH / (rows + 1.38);
    const cellSize = Math.max(28, Math.min(68, Math.floor(Math.min(cellByW, cellByH))));

    const boardW = cols * cellSize;
    const boardH = rows * cellSize;
    const totalBlockH = boardH + Math.round(cellSize * 1.34);
    const boardX = Math.floor((viewW - boardW) / 2);
    const boardY = Math.floor(topSafe + Math.max(0, (availH - totalBlockH) * 0.42));

    const benchY = boardY + boardH + Math.round(cellSize * 0.24);
    const slotGap = Math.max(4, Math.round(cellSize * 0.1));
    const tentW = Math.round(cellSize * 1.04);
    const remainingW = boardW - tentW - slotGap * 5;
    const slotSize = Math.max(28, Math.min(Math.round(cellSize * 1.04), Math.floor(remainingW / 5)));
    const totalBenchRowW = tentW + slotGap + 5 * slotSize + 4 * slotGap;
    const benchStartX = Math.floor((viewW - totalBenchRowW) / 2);

    const tentRect = {
      x: benchStartX,
      y: benchY,
      w: tentW,
      h: slotSize,
    };

    const benchSlots: { x: number; y: number; size: number }[] = [];
    for (let i = 0; i < 5; i++) {
      benchSlots.push({
        x: benchStartX + tentW + slotGap + i * (slotSize + slotGap),
        y: benchY,
        size: slotSize,
      });
    }

    this.layout = {
      cellSize,
      boardX,
      boardY,
      boardW,
      boardH,
      benchY,
      benchH: slotSize,
      tentRect,
      benchSlots,
    };
    return this.layout;
  }

  public startRun(stage: StageDef, mode: GameMode): void {
    const save = SaveManager.get();
    save.totalRuns += 1;
    SaveManager.save();

    const bonuses = SaveManager.getEffectiveBonuses();
    const cells: CellType[][] = [];
    const board: (TileUnit | null)[][] = [];

    for (let r = 0; r < stage.rows; r++) {
      const cRow: CellType[] = [];
      const bRow: (TileUnit | null)[] = [];
      const line = stage.layout[r] || '';
      for (let c = 0; c < stage.cols; c++) {
        const ch = line[c] || '#';
        const ct: CellType =
          ch === 'P'
            ? 'path'
            : ch === 'D'
              ? 'deploy'
              : ch === 'L'
                ? 'locked'
                : ch === 'V'
                  ? 'vip'
                  : 'wall';
        cRow.push(ct);
        bRow.push(null);
      }
      cells.push(cRow);
      board.push(bRow);
    }

    const barricades: LaneBarricade[] = [];
    const seenBarricades = new Set<string>();
    for (const lane of stage.lanes) {
      const key = `${lane.barricadeCell.col},${lane.barricadeCell.row}`;
      if (seenBarricades.has(key)) continue;
      seenBarricades.add(key);
      const maxHp = Math.round(240 * bonuses.barricadeHpMult);
      barricades.push({
        laneId: lane.id,
        col: lane.barricadeCell.col,
        row: lane.barricadeCell.row,
        hp: maxHp,
        maxHp,
        shakeTimer: 0,
      });
    }

    const starterPair: UnitId = TROOP_IDS[Math.floor(Math.random() * 3)];
    const bench: (TileUnit | null)[] = [
      this.createTile(starterPair, 1),
      this.createTile(starterPair, 1),
      this.createTile('archer', 1),
      this.createTile('zhaoyun', 1),
      null,
    ];

    this.drag = null;
    this.selected = null;
    this.paused = false;
    this.modalPaused = false;

    const syn = computeSynergies([]);

    this.state = {
      stage,
      mode,
      cells,
      board,
      bench,
      barricades,
      hearts: bonuses.maxHearts,
      maxHearts: bonuses.maxHearts,
      hurtFlash: 0,
      screenShake: 0,
      rations: bonuses.startRations,
      rationAccum: 0,
      recruitCost: 12,
      recruitCount: 0,
      farmLevel: 1,
      decreeLevel: 1,
      shovels: bonuses.startShovels,
      shovelMode: false,
      heroScrollAdUsed: false,
      supplyAdCooldown: 0,
      ultCharge: 35,
      wave: 1,
      maxWaves: mode === 'standard' ? 10 : null,
      wavePhase: 'prep',
      phaseTimer: 2.2,
      spawnQueue: [],
      spawnTimer: 0,
      enemies: [],
      projectiles: [],
      effects: [],
      floats: [],
      synergies: syn.list,
      synergyBonuses: syn,
      kills: 0,
      merges: 0,
      reviveUsed: false,
      bannerText: t().bannerWaveStart(1),
      bannerTimer: 2.2,
      selectedUnitInfo: null,
      selectedInfoTimer: 0,
    };

    PlatformSDK.gameplayStart();
  }

  private createTile(unitId: UnitId, tier: number): TileUnit {
    return {
      uid: this.nextUid++,
      unitId,
      tier,
      cooldown: Math.random() * 0.25,
      attackCount: 0,
      recoilTimer: 0,
      recoilAngle: 0,
      mergeAnimTimer: 0.32,
    };
  }

  private refreshSynergies(): void {
    if (!this.state) return;
    const flat: (TileUnit | null)[] = [];
    for (const row of this.state.board) {
      for (const cell of row) flat.push(cell);
    }
    const syn = computeSynergies(flat);
    this.state.synergies = syn.list;
    this.state.synergyBonuses = syn;
  }

  public showBanner(msg: string, dur = 2.0): void {
    if (!this.state) return;
    this.state.bannerText = msg;
    this.state.bannerTimer = dur;
  }

  // ==================== PLAYER ACTIONS ====================

  public getHeroDraftChance(): number {
    if (!this.state) return 0.15;
    const metaBonus = SaveManager.getEffectiveBonuses().heroChanceBonus;
    return Math.min(0.68, 0.14 + (this.state.decreeLevel - 1) * 0.11 + metaBonus);
  }

  private rollRandomUnit(): TileUnit {
    const heroProb = this.getHeroDraftChance();
    const isHero = Math.random() < heroProb;
    const pool = isHero ? HERO_IDS : TROOP_IDS;
    const id = pool[Math.floor(Math.random() * pool.length)];
    const highTierProb = this.state && this.state.decreeLevel >= 3 ? (this.state.decreeLevel - 2) * 0.08 : 0;
    const tier = Math.random() < highTierProb ? 2 : 1;
    return this.createTile(id, tier);
  }

  public recruitBench(): boolean {
    const s = this.state;
    if (!s || s.wavePhase === 'ended') return false;
    if (s.rations < s.recruitCost) {
      this.showBanner(t().bannerNeedRations, 1.4);
      return false;
    }

    s.rations -= s.recruitCost;
    s.recruitCount += 1;
    // Gentle recruit cost curve capped at 26 so merging stays fast & addictive
    s.recruitCost = Math.min(26, 12 + Math.floor(s.recruitCount / 3) * 2);

    const hasEmpty = s.bench.some((slot) => slot === null);
    if (hasEmpty) {
      for (let i = 0; i < s.bench.length; i++) {
        if (s.bench[i] === null) {
          s.bench[i] = this.rollRandomUnit();
        }
      }
    } else {
      // Bench full: refresh all 5 bench slots so player never deadlocks!
      for (let i = 0; i < s.bench.length; i++) {
        s.bench[i] = this.rollRandomUnit();
      }
    }

    this.selected = null;
    SoundFX.recruit();
    return true;
  }

  public grantGuaranteedHero(): void {
    const s = this.state;
    if (!s) return;
    const heroId = HERO_IDS[Math.floor(Math.random() * HERO_IDS.length)];
    const heroTile = this.createTile(heroId, 1);

    // Place in empty bench slot first; otherwise empty deploy cell; otherwise overwrite bench[0]
    const emptyBench = s.bench.findIndex((b) => b === null);
    if (emptyBench >= 0) {
      s.bench[emptyBench] = heroTile;
    } else {
      let placed = false;
      for (let r = 0; r < s.stage.rows && !placed; r++) {
        for (let c = 0; c < s.stage.cols && !placed; c++) {
          if (s.cells[r][c] === 'deploy' && !s.board[r][c]) {
            s.board[r][c] = heroTile;
            this.refreshSynergies();
            placed = true;
          }
        }
      }
      if (!placed) {
        s.bench[0] = heroTile;
      }
    }

    SoundFX.merge(2, true);
    this.showBanner(t().bannerHeroAwakened(t().units[heroId].name), 2.4);
  }

  public getFarmCost(): number {
    if (!this.state) return 18;
    return 18 + (this.state.farmLevel - 1) * 16;
  }

  public upgradeFarm(): boolean {
    const s = this.state;
    if (!s) return false;
    if (s.farmLevel >= 6) {
      this.showBanner(t().bannerMaxLevel, 1.3);
      return false;
    }
    const cost = this.getFarmCost();
    if (s.rations < cost) {
      this.showBanner(t().bannerNeedRations, 1.3);
      return false;
    }
    s.rations -= cost;
    s.farmLevel += 1;
    SoundFX.merge(2, false);
    return true;
  }

  public getDecreeCost(): number {
    if (!this.state) return 24;
    return 24 + (this.state.decreeLevel - 1) * 22;
  }

  public upgradeDecree(): boolean {
    const s = this.state;
    if (!s) return false;
    if (s.decreeLevel >= 5) {
      this.showBanner(t().bannerMaxLevel, 1.3);
      return false;
    }
    const cost = this.getDecreeCost();
    if (s.rations < cost) {
      this.showBanner(t().bannerNeedRations, 1.3);
      return false;
    }
    s.rations -= cost;
    s.decreeLevel += 1;
    SoundFX.merge(3, true);
    return true;
  }

  public toggleShovelMode(): void {
    const s = this.state;
    if (!s) return;
    const hasLockedCells = s.cells.some((row) => row.some((c) => c === 'locked'));
    if (!hasLockedCells) return;

    if (s.shovels <= 0) {
      // Offer Ration purchase if player has >= 35 Rations, otherwise trigger optional Ad callback
      if (s.rations >= 35) {
        s.rations -= 35;
        s.shovels += 1;
        s.shovelMode = true;
        SoundFX.tileClack(true);
        this.showBanner(t().bannerShovelPick, 2.2);
      } else {
        this.callbacks.onRequestShovelAd();
      }
      return;
    }

    s.shovelMode = !s.shovelMode;
    if (s.shovelMode) {
      this.selected = null;
      this.showBanner(t().bannerShovelPick, 2.2);
    }
  }

  public getFortifyCost(): number {
    return 26;
  }

  public fortifyLord(): boolean {
    const s = this.state;
    if (!s) return false;
    const needHeal =
      s.hearts < s.maxHearts || s.barricades.some((b) => b.hp < b.maxHp);
    if (!needHeal) return false;

    const cost = this.getFortifyCost();
    if (s.rations < cost) {
      this.showBanner(t().bannerNeedRations, 1.3);
      return false;
    }
    s.rations -= cost;
    s.hearts = Math.min(s.maxHearts, s.hearts + 3);
    for (const b of s.barricades) {
      b.hp = b.maxHp;
    }
    for (const lane of s.stage.lanes) {
      s.effects.push({
        kind: 'heal_ring',
        x: lane.vipCell.col + 0.5,
        y: lane.vipCell.row + 0.5,
        radius: 1.5,
        color: '#4ade80',
        timer: 0,
        duration: 0.55,
      });
    }
    SoundFX.merge(2, true);
    this.showBanner(t().bannerFortified, 1.8);
    return true;
  }

  public castDragonUlt(): boolean {
    const s = this.state;
    if (!s || s.ultCharge < 100) return false;
    s.ultCharge = 0;
    s.screenShake = 0.45;
    SoundFX.dragonUlt();
    this.showBanner(t().bannerUltCast, 2.2);

    const dmg = Math.round((165 + s.wave * 36) * SaveManager.getEffectiveBonuses().damageMult);
    for (let i = s.enemies.length - 1; i >= 0; i--) {
      const e = s.enemies[i];
      e.stunTimer = Math.max(e.stunTimer, 1.75);
      this.damageEnemy(e, dmg, '#38bdf8', true);
    }

    s.effects.push({
      kind: 'dragon_ult',
      x: s.stage.cols / 2,
      y: s.stage.rows / 2,
      radius: Math.max(s.stage.cols, s.stage.rows),
      color: '#38bdf8',
      timer: 0,
      duration: 0.85,
    });
    return true;
  }

  public applyDragonRevive(): void {
    const s = this.state;
    if (!s) return;
    s.reviveUsed = true;
    s.hearts = Math.min(s.maxHearts, Math.max(6, Math.ceil(s.maxHearts * 0.65)));
    for (const b of s.barricades) {
      b.hp = b.maxHp;
    }
    // Massive shockwave clearing normal enemies & heavily damaging bosses
    for (let i = s.enemies.length - 1; i >= 0; i--) {
      const e = s.enemies[i];
      if (e.kind === 'lubu' || e.kind === 'ram') {
        e.stunTimer = 2.5;
        e.waypointIndex = Math.max(0, e.waypointIndex - 3);
        this.damageEnemy(e, e.maxHp * 0.35, '#38bdf8', true);
      } else {
        this.damageEnemy(e, e.hp + 9999, '#38bdf8', true);
      }
    }
    s.ultCharge = 100;
    s.screenShake = 0.5;
    s.effects.push({
      kind: 'dragon_ult',
      x: s.stage.cols / 2,
      y: s.stage.rows / 2,
      radius: Math.max(s.stage.cols, s.stage.rows),
      color: '#facc15',
      timer: 0,
      duration: 0.95,
    });
    PlatformSDK.gameplayStart();
  }

  // ==================== WAVE SPAWNER & UPDATE LOOP ====================

  private buildWaveQueue(wave: number): { kind: EnemyKind; delay: number }[] {
    const list: { kind: EnemyKind; delay: number }[] = [];
    const count = 8 + wave * 3 + Math.floor(wave / 3) * 2;
    const baseGap = Math.max(0.32, 0.92 - wave * 0.045);

    for (let i = 0; i < count; i++) {
      let kind: EnemyKind = 'grunt';
      const r = Math.random();
      if (wave >= 2 && r < 0.28) {
        kind = 'wolf';
      } else if (wave >= 3 && r >= 0.28 && r < 0.5) {
        kind = 'shield';
      } else if (wave >= 4 && r >= 0.5 && r < 0.64) {
        kind = 'shaman';
      }
      list.push({ kind, delay: i === 0 ? 0.2 : baseGap * (0.75 + Math.random() * 0.5) });
    }

    if (wave % 5 === 0) {
      // Midpoint Siege Ram
      list.splice(Math.floor(list.length / 2), 0, { kind: 'ram', delay: 1.0 });
    }
    if (wave % 10 === 0 || (this.state?.mode === 'endless' && wave >= 15 && wave % 5 === 0)) {
      // Demon Warlord Lu Bu Boss!
      list.push({ kind: 'lubu', delay: 1.4 });
    } else if (wave >= 7 && wave % 2 === 1) {
      list.push({ kind: 'ram', delay: 1.1 });
    }

    return list;
  }

  private spawnEnemy(kind: EnemyKind): void {
    const s = this.state;
    if (!s) return;
    const laneIdx = Math.floor(Math.random() * s.stage.lanes.length);
    const lane = s.stage.lanes[laneIdx];
    const start = lane.waypoints[0];

    const w = s.wave;
    const hpScale = Math.pow(1.24, w - 1) * (w > 10 ? Math.pow(1.08, w - 10) : 1);

    let baseHp = 68;
    let speed = 1.02;
    let armor = 0;
    let reward = 3;
    let radius = 0.34;

    if (kind === 'wolf') {
      baseHp = 48;
      speed = 1.62;
      reward = 3;
      radius = 0.31;
    } else if (kind === 'shield') {
      baseHp = 150;
      speed = 0.74;
      armor = 0.28;
      reward = 5;
      radius = 0.38;
    } else if (kind === 'shaman') {
      baseHp = 92;
      speed = 0.92;
      reward = 5;
      radius = 0.35;
    } else if (kind === 'ram') {
      baseHp = 480;
      speed = 0.64;
      armor = 0.22;
      reward = 14;
      radius = 0.44;
    } else if (kind === 'lubu') {
      baseHp = 1550;
      speed = 0.58;
      armor = 0.18;
      reward = 35;
      radius = 0.48;
      this.showBanner(t().bannerBoss, 2.8);
      SoundFX.alarm();
    }

    const maxHp = Math.round(baseHp * hpScale);
    s.enemies.push({
      id: this.nextEnemyId++,
      kind,
      laneIndex: laneIdx,
      waypointIndex: 0,
      segProgress: 0,
      x: start.col + 0.5,
      y: start.row + 0.5,
      hp: maxHp,
      maxHp,
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
      auraTimer: 1.5,
      radius,
    });
  }

  public update(dt: number, viewW: number, viewH: number): void {
    this.computeLayout(viewW, viewH);
    const s = this.state;
    if (!s || this.paused || this.modalPaused || s.wavePhase === 'ended') return;

    if (s.bannerTimer > 0) s.bannerTimer = Math.max(0, s.bannerTimer - dt);
    if (s.hurtFlash > 0) s.hurtFlash = Math.max(0, s.hurtFlash - dt * 2.2);
    if (s.screenShake > 0) s.screenShake = Math.max(0, s.screenShake - dt * 2.4);
    if (s.supplyAdCooldown > 0) s.supplyAdCooldown = Math.max(0, s.supplyAdCooldown - dt);
    if (s.selectedInfoTimer > 0) {
      s.selectedInfoTimer -= dt;
      if (s.selectedInfoTimer <= 0) s.selectedUnitInfo = null;
    }

    // Passive Rice Ration income from Granary / Farm
    const passivePerSec =
      1.35 + (s.farmLevel - 1) * 0.85 + SaveManager.getEffectiveBonuses().passiveRationBonus;
    s.rationAccum += passivePerSec * dt;
    if (s.rationAccum >= 1) {
      const whole = Math.floor(s.rationAccum);
      s.rations += whole;
      s.rationAccum -= whole;
    }

    // Wave state machine
    if (s.wavePhase === 'prep') {
      s.phaseTimer -= dt;
      if (s.phaseTimer <= 0) {
        s.wavePhase = 'spawning';
        s.spawnQueue = this.buildWaveQueue(s.wave);
        s.spawnTimer = 0.1;
      }
    } else if (s.wavePhase === 'spawning') {
      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0 && s.spawnQueue.length > 0) {
        const next = s.spawnQueue.shift()!;
        this.spawnEnemy(next.kind);
        s.spawnTimer = s.spawnQueue.length > 0 ? s.spawnQueue[0].delay : 0;
      }
      if (s.spawnQueue.length === 0) {
        s.wavePhase = 'clearing';
      }
    } else if (s.wavePhase === 'clearing') {
      if (s.enemies.length === 0) {
        if (this.advanceWave()) return;
      }
    }

    // Update Barricade shake
    for (const b of s.barricades) {
      if (b.shakeTimer > 0) b.shakeTimer = Math.max(0, b.shakeTimer - dt);
    }

    // Update Board Units (cooldowns & attacks)
    this.updateBoardUnits(dt);

    // Update Bench merge animations
    for (const u of s.bench) {
      if (u && u.mergeAnimTimer > 0) u.mergeAnimTimer = Math.max(0, u.mergeAnimTimer - dt);
    }

    // Update Projectiles
    this.updateProjectiles(dt);

    // Update Enemies
    this.updateEnemies(dt);

    // Update VFX & Floating Damage Texts
    for (let i = s.effects.length - 1; i >= 0; i--) {
      const fx = s.effects[i];
      fx.timer += dt;
      if (fx.timer >= fx.duration) s.effects.splice(i, 1);
    }
    for (let i = s.floats.length - 1; i >= 0; i--) {
      const fl = s.floats[i];
      fl.timer += dt;
      fl.y += fl.vy * dt;
      if (fl.timer >= fl.duration) s.floats.splice(i, 1);
    }
  }

  private advanceWave(): boolean {
    const s = this.state!;
    if (s.mode === 'endless') {
      SaveManager.recordEndlessWave(s.stage.id, s.wave);
    }

    if (s.maxWaves !== null && s.wave >= s.maxWaves) {
      // Stage Victory!
      s.wavePhase = 'ended';
      SaveManager.markStageCleared(s.stage.id);
      PlatformSDK.gameplayStop();
      PlatformSDK.happyTime();
      SoundFX.fanfare();
      this.callbacks.onRunFinished(true, {
        stageId: s.stage.id,
        mode: s.mode,
        wave: s.wave,
        kills: s.kills,
        merges: s.merges,
        victory: true,
      });
      return true;
    }

    // Wave clear bonus Rations & milestone Golden Shovels!
    s.rations += 10 + s.wave * 2;
    if (s.wave === 3 || s.wave === 6 || (s.mode === 'endless' && s.wave % 5 === 0)) {
      s.shovels += 1;
    }

    s.wave += 1;
    s.wavePhase = 'prep';
    s.phaseTimer = 2.0;
    this.showBanner(t().bannerWaveStart(s.wave), 2.0);
    return false;
  }

  private updateBoardUnits(dt: number): void {
    const s = this.state!;
    const metaDmg = SaveManager.getEffectiveBonuses().damageMult;
    const syn = s.synergyBonuses;
    const decreeHeroMult = 1 + (s.decreeLevel - 1) * 0.16;

    for (let r = 0; r < s.stage.rows; r++) {
      for (let c = 0; c < s.stage.cols; c++) {
        const tile = s.board[r][c];
        if (!tile) continue;

        if (tile.recoilTimer > 0) tile.recoilTimer = Math.max(0, tile.recoilTimer - dt * 4.5);
        if (tile.mergeAnimTimer > 0) tile.mergeAnimTimer = Math.max(0, tile.mergeAnimTimer - dt);

        const def = UNITS[tile.unitId];
        const speedMult = getTierSpeedMultiplier(tile.tier) * syn.globalAspdMult;
        tile.cooldown -= dt * speedMult;

        if (tile.cooldown > 0 || s.enemies.length === 0) continue;

        const range = def.rangeCells + getTierRangeBonus(tile.tier);
        const cx = c + 0.5;
        const cy = r + 0.5;

        // Pick enemy furthest along its lane within range
        let bestTarget: EnemyEntity | null = null;
        let bestProgress = -1;

        for (const e of s.enemies) {
          const dist = Math.hypot(e.x - cx, e.y - cy);
          if (dist <= range + e.radius) {
            const prog = e.waypointIndex + e.segProgress;
            if (prog > bestProgress) {
              bestProgress = prog;
              bestTarget = e;
            }
          }
        }

        if (!bestTarget) {
          tile.cooldown = 0.08;
          continue;
        }

        tile.cooldown = def.attackInterval;
        tile.attackCount += 1;
        const angle = Math.atan2(bestTarget.y - cy, bestTarget.x - cx);
        tile.recoilAngle = angle;
        tile.recoilTimer = 1;

        const mysticBonus = def.synergy === 'mystic' ? syn.mysticPowerMult : 1;
        const heroBonus = def.isHero ? decreeHeroMult : 1;
        let dmg =
          def.baseDamage *
          getTierDamageMultiplier(tile.tier) *
          metaDmg *
          syn.globalDmgMult *
          mysticBonus *
          heroBonus;

        const isCrit = Math.random() < syn.critChance;
        if (isCrit) dmg *= 1.65;

        const everyN = def.skillEveryN
          ? Math.max(2, def.skillEveryN - (syn.heroSkillFaster ? 1 : 0))
          : 0;
        const isSignatureSkill = everyN > 0 && tile.attackCount % everyN === 0;

        this.fireUnitAttack(tile, def.id, cx, cy, bestTarget, angle, dmg, isSignatureSkill);
      }
    }
  }

  private fireUnitAttack(
    tile: TileUnit,
    unitId: UnitId,
    cx: number,
    cy: number,
    target: EnemyEntity,
    angle: number,
    dmg: number,
    isSkill: boolean
  ): void {
    const s = this.state!;
    const def = UNITS[unitId];

    if (def.pattern === 'cleave') {
      SoundFX.attack('slash');
      const rad = (def.aoeRadiusCells || 1.45) + (tile.tier - 1) * 0.12;
      s.effects.push({
        kind: 'slash',
        x: cx,
        y: cy,
        radius: rad,
        color: '#ef4444',
        angle,
        timer: 0,
        duration: 0.24,
      });
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const e = s.enemies[i];
        if (Math.hypot(e.x - cx, e.y - cy) <= rad + e.radius) {
          this.damageEnemy(e, dmg, '#f87171');
        }
      }
      return;
    }

    if (def.pattern === 'roar_quake') {
      SoundFX.attack(isSkill ? 'cannon' : 'slash');
      const rad = (def.aoeRadiusCells || 2.1) * (isSkill ? 1.25 : 0.92);
      s.effects.push({
        kind: 'ring',
        x: cx,
        y: cy,
        radius: rad,
        color: isSkill ? '#f97316' : '#fb923c',
        timer: 0,
        duration: isSkill ? 0.42 : 0.26,
      });
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const e = s.enemies[i];
        if (Math.hypot(e.x - cx, e.y - cy) <= rad + e.radius) {
          if (isSkill) {
            e.stunTimer = Math.max(e.stunTimer, (def.stunDuration || 1.0) + tile.tier * 0.12);
          }
          this.damageEnemy(e, dmg * (isSkill ? 1.55 : 1), '#fb923c', isSkill);
        }
      }
      return;
    }

    if (def.pattern === 'chain_lightning') {
      SoundFX.attack('thunder');
      const bounces = (isSkill ? 5 : 3) + (tile.tier - 1);
      const visited = new Set<number>();
      const pts: { x: number; y: number }[] = [{ x: cx, y: cy }];
      let curr: EnemyEntity | null = target;

      for (let b = 0; b < bounces && curr; b++) {
        visited.add(curr.id);
        pts.push({ x: curr.x, y: curr.y });
        const jumpDmg = dmg * Math.pow(0.88, b) * (isSkill ? 1.35 : 1);
        if (isSkill && b === 0) curr.stunTimer = Math.max(curr.stunTimer, 0.45);
        this.damageEnemy(curr, jumpDmg, '#facc15', isSkill);

        // Find nearest unvisited enemy within 2.6 cells
        let nextE: EnemyEntity | null = null;
        let bestD = 2.6;
        for (const cand of s.enemies) {
          if (visited.has(cand.id) || cand.hp <= 0) continue;
          const d = Math.hypot(cand.x - curr.x, cand.y - curr.y);
          if (d <= bestD) {
            bestD = d;
            nextE = cand;
          }
        }
        curr = nextE;
      }

      s.effects.push({
        kind: 'lightning',
        x: cx,
        y: cy,
        points: pts,
        radius: isSkill ? 2 : 1,
        color: isSkill ? '#38bdf8' : '#facc15',
        timer: 0,
        duration: 0.26,
      });
      return;
    }

    if (def.pattern === 'dragon_sweep') {
      SoundFX.attack('lance');
      const rad = 1.65;
      s.effects.push({
        kind: 'slash',
        x: cx,
        y: cy,
        radius: rad,
        color: '#38bdf8',
        angle,
        timer: 0,
        duration: 0.26,
      });
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const e = s.enemies[i];
        if (Math.hypot(e.x - cx, e.y - cy) <= rad + e.radius) {
          const nearVipBonus = e.waypointIndex >= s.stage.lanes[e.laneIndex].waypoints.length - 4 ? 1.45 : 1;
          this.damageEnemy(e, dmg * nearVipBonus, '#38bdf8');
        }
      }

      if (isSkill) {
        // Launch piercing Silver Dragon down target angle!
        const spd = 9.2;
        s.projectiles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          tx: target.x,
          ty: target.y,
          kind: 'dragon',
          color: '#38bdf8',
          damage: dmg * 1.65,
          aoeRadius: 0.75,
          pierceLeft: 12,
          hitIds: new Set(),
          slowFactor: 0.3,
          slowDur: 1.2,
          stunDur: 0.35,
          executeRatio: 0,
          burnDps: 0,
          life: 0,
          maxLife: 0.65,
        });
      }
      return;
    }

    if (def.pattern === 'jade_execute') {
      SoundFX.attack('slash');
      const rad = 1.65;
      s.effects.push({
        kind: 'slash',
        x: cx,
        y: cy,
        radius: rad,
        color: '#22c55e',
        angle,
        timer: 0,
        duration: 0.28,
      });
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const e = s.enemies[i];
        if (Math.hypot(e.x - cx, e.y - cy) <= rad + e.radius) {
          if (e.kind !== 'lubu' && e.kind !== 'ram' && e.hp / e.maxHp <= 0.22) {
            this.damageEnemy(e, e.hp + 999, '#4ade80', true);
          } else {
            this.damageEnemy(e, dmg, '#4ade80');
          }
        }
      }
      if (isSkill) {
        const spd = 8.4;
        s.projectiles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          tx: target.x,
          ty: target.y,
          kind: 'glaive',
          color: '#22c55e',
          damage: dmg * 1.5,
          aoeRadius: 0.7,
          pierceLeft: 8,
          hitIds: new Set(),
          slowFactor: 0,
          slowDur: 0,
          stunDur: 0,
          executeRatio: 0.22,
          burnDps: 0,
          life: 0,
          maxLife: 0.55,
        });
      }
      return;
    }

    if (def.pattern === 'phoenix_volley') {
      SoundFX.attack('bow');
      const count = isSkill ? 3 + tile.tier : Math.min(3, 1 + Math.floor(tile.tier / 2));
      const candidates = [...s.enemies]
        .filter((e) => Math.hypot(e.x - cx, e.y - cy) <= def.rangeCells + 0.5)
        .sort((a, b) => b.waypointIndex + b.segProgress - (a.waypointIndex + a.segProgress));

      for (let i = 0; i < count; i++) {
        const tgt = candidates[i % Math.max(1, candidates.length)] || target;
        const spread = count > 1 ? ((i / (count - 1)) - 0.5) * 0.22 : 0;
        const a = Math.atan2(tgt.y - cy, tgt.x - cx) + spread;
        const spd = def.projectileSpeed;
        s.projectiles.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          targetId: tgt.id,
          tx: tgt.x,
          ty: tgt.y,
          kind: 'phoenix',
          color: '#ef4444',
          damage: dmg * (isSkill ? 1.15 : 0.88),
          aoeRadius: 0,
          pierceLeft: 1,
          hitIds: new Set(),
          slowFactor: 0,
          slowDur: 0,
          stunDur: 0,
          executeRatio: 0,
          burnDps: dmg * 0.28,
          life: 0,
          maxLife: 0.7,
        });
      }
      return;
    }

    // Standard projectile patterns: arrow, pierce_lance, mortar_aoe, frost_bolt, lotus_blizzard
    const spd = def.projectileSpeed;
    const vx = Math.cos(angle) * spd;
    const vy = Math.sin(angle) * spd;

    if (def.pattern === 'pierce_lance') {
      SoundFX.attack('lance');
      s.projectiles.push({
        x: cx,
        y: cy,
        vx,
        vy,
        tx: target.x,
        ty: target.y,
        kind: 'lance',
        color: '#3b82f6',
        damage: dmg,
        aoeRadius: 0.42,
        pierceLeft: 3 + tile.tier,
        hitIds: new Set(),
        slowFactor: 0,
        slowDur: 0,
        stunDur: 0,
        executeRatio: 0,
        burnDps: 0,
        life: 0,
        maxLife: 0.48,
      });
    } else if (def.pattern === 'mortar_aoe') {
      SoundFX.attack('cannon');
      const dist = Math.hypot(target.x - cx, target.y - cy);
      s.projectiles.push({
        x: cx,
        y: cy,
        vx,
        vy,
        tx: target.x,
        ty: target.y,
        kind: 'mortar',
        color: '#a855f7',
        damage: dmg,
        aoeRadius: (def.aoeRadiusCells || 1.35) + (tile.tier - 1) * 0.1,
        pierceLeft: 1,
        hitIds: new Set(),
        slowFactor: 0,
        slowDur: 0,
        stunDur: 0,
        executeRatio: 0,
        burnDps: 0,
        life: 0,
        maxLife: Math.max(0.18, dist / spd),
      });
    } else if (def.pattern === 'frost_bolt' || def.pattern === 'lotus_blizzard') {
      SoundFX.attack('frost');
      const isLotus = def.pattern === 'lotus_blizzard';
      s.projectiles.push({
        x: cx,
        y: cy,
        vx,
        vy,
        targetId: target.id,
        tx: target.x,
        ty: target.y,
        kind: isLotus ? 'lotus' : 'frost',
        color: '#38bdf8',
        damage: dmg * (isSkill ? 1.45 : 1),
        aoeRadius: isLotus ? (def.aoeRadiusCells || 1.45) : 0,
        pierceLeft: 1,
        hitIds: new Set(),
        slowFactor: (def.slowFactor || 0.42) + (tile.tier - 1) * 0.04,
        slowDur: def.slowDuration || 2.2,
        stunDur: isLotus && isSkill ? (def.stunDuration || 0.85) : 0,
        executeRatio: 0,
        burnDps: 0,
        life: 0,
        maxLife: 0.75,
      });
    } else {
      SoundFX.attack('bow');
      s.projectiles.push({
        x: cx,
        y: cy,
        vx,
        vy,
        targetId: target.id,
        tx: target.x,
        ty: target.y,
        kind: 'arrow',
        color: '#22c55e',
        damage: dmg,
        aoeRadius: 0,
        pierceLeft: 1,
        hitIds: new Set(),
        slowFactor: 0,
        slowDur: 0,
        stunDur: 0,
        executeRatio: 0,
        burnDps: 0,
        life: 0,
        maxLife: 0.65,
      });
    }
  }

  private updateProjectiles(dt: number): void {
    const s = this.state!;
    for (let i = s.projectiles.length - 1; i >= 0; i--) {
      const p = s.projectiles[i];
      p.life += dt;

      // Gentle homing for single-target arrows/bolts so fast wolves don't dodge unfairly
      if (p.targetId !== undefined) {
        const tgt = s.enemies.find((e) => e.id === p.targetId);
        if (tgt) {
          const ang = Math.atan2(tgt.y - p.y, tgt.x - p.x);
          const spd = Math.hypot(p.vx, p.vy);
          p.vx = Math.cos(ang) * spd;
          p.vy = Math.sin(ang) * spd;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.kind === 'mortar') {
        if (p.life >= p.maxLife) {
          s.effects.push({
            kind: 'explosion',
            x: p.tx,
            y: p.ty,
            radius: p.aoeRadius,
            color: '#c084fc',
            timer: 0,
            duration: 0.34,
          });
          for (let j = s.enemies.length - 1; j >= 0; j--) {
            const e = s.enemies[j];
            if (Math.hypot(e.x - p.tx, e.y - p.ty) <= p.aoeRadius + e.radius) {
              const shieldBreaker = e.kind === 'shield' || e.kind === 'ram' ? 1.38 : 1;
              this.damageEnemy(e, p.damage * shieldBreaker, '#e879f9');
            }
          }
          s.projectiles.splice(i, 1);
        }
        continue;
      }

      // Collision check against enemies
      let consumed = false;
      for (let j = s.enemies.length - 1; j >= 0; j--) {
        const e = s.enemies[j];
        if (p.hitIds.has(e.id)) continue;
        const hitDist = (p.kind === 'dragon' || p.kind === 'glaive' ? 0.65 : 0.36) + e.radius;
        if (Math.hypot(e.x - p.x, e.y - p.y) <= hitDist) {
          p.hitIds.add(e.id);
          p.pierceLeft -= 1;

          if (p.kind === 'lotus' && p.aoeRadius > 0) {
            s.effects.push({
              kind: 'ring',
              x: e.x,
              y: e.y,
              radius: p.aoeRadius,
              color: '#38bdf8',
              timer: 0,
              duration: 0.38,
            });
            for (let k = s.enemies.length - 1; k >= 0; k--) {
              const sub = s.enemies[k];
              if (Math.hypot(sub.x - e.x, sub.y - e.y) <= p.aoeRadius + sub.radius) {
                sub.slowTimer = Math.max(sub.slowTimer, p.slowDur);
                sub.slowPower = Math.max(sub.slowPower, p.slowFactor);
                if (p.stunDur > 0) sub.stunTimer = Math.max(sub.stunTimer, p.stunDur);
                this.damageEnemy(sub, p.damage, '#7dd3fc');
              }
            }
            consumed = true;
            break;
          }

          if (p.slowDur > 0) {
            e.slowTimer = Math.max(e.slowTimer, p.slowDur);
            e.slowPower = Math.max(e.slowPower, p.slowFactor);
          }
          if (p.stunDur > 0) {
            e.stunTimer = Math.max(e.stunTimer, p.stunDur);
          }
          if (p.burnDps > 0) {
            e.burnTimer = 3.0;
            e.burnDps = Math.max(e.burnDps, p.burnDps);
          }
          if (
            p.executeRatio > 0 &&
            e.kind !== 'lubu' &&
            e.kind !== 'ram' &&
            e.hp / e.maxHp <= p.executeRatio
          ) {
            this.damageEnemy(e, e.hp + 999, '#4ade80', true);
          } else {
            this.damageEnemy(e, p.damage, p.color);
          }

          if (p.pierceLeft <= 0) {
            consumed = true;
            break;
          }
        }
      }

      if (consumed || p.life >= p.maxLife) {
        s.projectiles.splice(i, 1);
      }
    }
  }

  private damageEnemy(e: EnemyEntity, rawDmg: number, color: string, ignoreArmor = false): void {
    const s = this.state!;
    const actual = Math.max(1, Math.round(rawDmg * (ignoreArmor ? 1 : 1 - e.armor)));
    e.hp -= actual;
    e.hitFlash = 0.11;

    if (s.floats.length < 38) {
      s.floats.push({
        x: e.x + (Math.random() - 0.5) * 0.26,
        y: e.y - 0.25,
        vy: -0.95,
        text: `${actual}`,
        color,
        scale: rawDmg >= 90 ? 1.22 : 1.0,
        timer: 0,
        duration: 0.52,
      });
    }

    if (e.hp <= 0) {
      const idx = s.enemies.indexOf(e);
      if (idx >= 0) s.enemies.splice(idx, 1);
      s.kills += 1;
      s.rations += e.rewardRations;
      s.ultCharge = Math.min(100, s.ultCharge + (e.kind === 'lubu' ? 35 : e.kind === 'ram' ? 14 : 2.8));
      SoundFX.enemyKill();
    }
  }

  private updateEnemies(dt: number): void {
    const s = this.state!;
    for (let i = s.enemies.length - 1; i >= 0; i--) {
      const e = s.enemies[i];
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);

      if (e.burnTimer > 0) {
        e.burnTimer -= dt;
        e.hp -= e.burnDps * dt;
        if (e.hp <= 0) {
          this.damageEnemy(e, 1, '#fb923c', true);
          continue;
        }
      }

      // Shaman periodic green healing pulse
      if (e.kind === 'shaman') {
        e.auraTimer -= dt;
        if (e.auraTimer <= 0) {
          e.auraTimer = 2.6;
          s.effects.push({
            kind: 'heal_ring',
            x: e.x,
            y: e.y,
            radius: 1.35,
            color: '#4ade80',
            timer: 0,
            duration: 0.4,
          });
          for (const ally of s.enemies) {
            if (Math.hypot(ally.x - e.x, ally.y - e.y) <= 1.4) {
              ally.hp = Math.min(ally.maxHp, ally.hp + ally.maxHp * 0.08);
            }
          }
        }
      }

      if (e.stunTimer > 0) {
        e.stunTimer = Math.max(0, e.stunTimer - dt);
        continue;
      }

      let spdMult = 1;
      if (e.slowTimer > 0) {
        e.slowTimer = Math.max(0, e.slowTimer - dt);
        spdMult = Math.max(0.28, 1 - e.slowPower);
      }

      const lane = s.stage.lanes[e.laneIndex];
      const wps = lane.waypoints;
      const nextIdx = e.waypointIndex + 1;
      if (nextIdx >= wps.length) {
        this.enemyReachedVip(i, e);
        continue;
      }

      // Check if blocked by Spike Barricade at next or current waypoint
      const currWp = wps[e.waypointIndex];
      const barricade = s.barricades.find(
        (b) => b.col === currWp.col && b.row === currWp.row && b.hp > 0
      );

      if (barricade) {
        e.bashTimer -= dt;
        if (e.bashTimer <= 0) {
          e.bashTimer = 0.75;
          const bashDmg = e.kind === 'ram' ? 46 : e.kind === 'lubu' ? 65 : 18;
          barricade.hp = Math.max(0, barricade.hp - bashDmg);
          barricade.shakeTimer = 0.18;
          // Spike thorns reflect damage back to attacker!
          this.damageEnemy(e, 14, '#f59e0b', true);
        }
        continue;
      }

      const p0 = wps[e.waypointIndex];
      const p1 = wps[nextIdx];
      e.segProgress += e.speed * spdMult * dt;

      while (e.segProgress >= 1 && e.waypointIndex + 1 < wps.length) {
        e.segProgress -= 1;
        e.waypointIndex += 1;
        // Stop immediately if stepping onto an intact barricade cell
        const steppedWp = wps[e.waypointIndex];
        const hitBar = s.barricades.find(
          (b) => b.col === steppedWp.col && b.row === steppedWp.row && b.hp > 0
        );
        if (hitBar) {
          e.segProgress = 0;
          break;
        }
      }

      if (e.waypointIndex >= wps.length - 1) {
        this.enemyReachedVip(i, e);
        if (s.wavePhase === 'ended' || this.modalPaused) return;
        continue;
      }

      const a = wps[e.waypointIndex];
      const b = wps[e.waypointIndex + 1];
      e.x = a.col + 0.5 + (b.col - a.col) * e.segProgress;
      e.y = a.row + 0.5 + (b.row - a.row) * e.segProgress;
    }
  }

  private enemyReachedVip(indexInArray: number, e: EnemyEntity): void {
    const s = this.state!;
    s.enemies.splice(indexInArray, 1);

    const heartLoss = e.kind === 'lubu' ? 3 : e.kind === 'ram' ? 2 : 1;
    s.hearts = Math.max(0, s.hearts - heartLoss);
    s.hurtFlash = 1.0;
    s.screenShake = 0.42;
    SoundFX.alarm();

    if (s.hearts <= 0) {
      PlatformSDK.gameplayStop();
      if (!s.reviveUsed) {
        this.modalPaused = true;
        this.callbacks.onRequestRevive(true);
      } else {
        s.wavePhase = 'ended';
        this.callbacks.onRunFinished(false, {
          stageId: s.stage.id,
          mode: s.mode,
          wave: s.wave,
          kills: s.kills,
          merges: s.merges,
          victory: false,
        });
      }
    }
  }

  // ==================== POINTER DRAG & MERGE / SHOVEL HANDLING ====================

  private getCanvasCoords(ev: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top,
    };
  }

  public hitTestBoard(x: number, y: number): GridPoint | null {
    const s = this.state;
    if (!s) return null;
    const { boardX, boardY, cellSize } = this.layout;
    const col = Math.floor((x - boardX) / cellSize);
    const row = Math.floor((y - boardY) / cellSize);
    if (col >= 0 && col < s.stage.cols && row >= 0 && row < s.stage.rows) {
      return { col, row };
    }
    return null;
  }

  public hitTestBench(x: number, y: number): number {
    for (let i = 0; i < this.layout.benchSlots.length; i++) {
      const sl = this.layout.benchSlots[i];
      if (x >= sl.x && x <= sl.x + sl.size && y >= sl.y && y <= sl.y + sl.size) {
        return i;
      }
    }
    return -1;
  }

  public hitTestTentRecycle(x: number, y: number): boolean {
    const r = this.layout.tentRect;
    return x >= r.x - 6 && x <= r.x + r.w + 6 && y >= r.y - 6 && y <= r.y + r.h + 6;
  }

  private bindPointerEvents(): void {
    this.canvas.addEventListener('pointerdown', (ev) => {
      const s = this.state;
      if (!s || this.paused || this.modalPaused || s.wavePhase === 'ended') return;
      const pt = this.getCanvasCoords(ev);

      // 1) Shovel excavation mode
      if (s.shovelMode) {
        const cell = this.hitTestBoard(pt.x, pt.y);
        if (cell && s.cells[cell.row][cell.col] === 'locked') {
          s.cells[cell.row][cell.col] = 'deploy';
          s.shovels = Math.max(0, s.shovels - 1);
          s.shovelMode = false;
          SoundFX.shovelDig();
          s.effects.push({
            kind: 'merge_burst',
            x: cell.col + 0.5,
            y: cell.row + 0.5,
            radius: 0.9,
            color: '#facc15',
            timer: 0,
            duration: 0.45,
          });
          this.showBanner(t().bannerTileUnlocked, 1.8);
          return;
        }
        s.shovelMode = false;
      }

      // 2) Check Bench slot pickup
      const bIdx = this.hitTestBench(pt.x, pt.y);
      if (bIdx >= 0) {
        const tile = s.bench[bIdx];
        if (tile) {
          this.canvas.setPointerCapture(ev.pointerId);
          SoundFX.tileClack(false);
          s.selectedUnitInfo = { unitId: tile.unitId, tier: tile.tier };
          s.selectedInfoTimer = 2.8;
          this.drag = {
            active: true,
            pointerId: ev.pointerId,
            sourceType: 'bench',
            benchIdx: bIdx,
            col: -1,
            row: -1,
            unit: tile,
            startScreenX: pt.x,
            startScreenY: pt.y,
            screenX: pt.x,
            screenY: pt.y,
            moved: false,
          };
          return;
        } else if (this.selected) {
          this.executeMoveOrMerge(this.selected, { sourceType: 'bench', benchIdx: bIdx, col: -1, row: -1 });
          this.selected = null;
          return;
        }
      }

      // 3) Check Board cell pickup or tap-place
      const gCell = this.hitTestBoard(pt.x, pt.y);
      if (gCell) {
        // Tapping a locked dark cell directly when user has shovels or wants prompt
        if (s.cells[gCell.row][gCell.col] === 'locked' && !this.selected) {
          if (s.shovels > 0) {
            s.shovelMode = true;
            this.showBanner(t().bannerShovelPick, 1.8);
          }
          return;
        }

        const bTile = s.board[gCell.row][gCell.col];
        if (bTile) {
          this.canvas.setPointerCapture(ev.pointerId);
          SoundFX.tileClack(false);
          s.selectedUnitInfo = { unitId: bTile.unitId, tier: bTile.tier };
          s.selectedInfoTimer = 2.8;
          this.drag = {
            active: true,
            pointerId: ev.pointerId,
            sourceType: 'board',
            benchIdx: -1,
            col: gCell.col,
            row: gCell.row,
            unit: bTile,
            startScreenX: pt.x,
            startScreenY: pt.y,
            screenX: pt.x,
            screenY: pt.y,
            moved: false,
          };
          return;
        } else if (this.selected && s.cells[gCell.row][gCell.col] === 'deploy') {
          this.executeMoveOrMerge(this.selected, {
            sourceType: 'board',
            benchIdx: -1,
            col: gCell.col,
            row: gCell.row,
          });
          this.selected = null;
          return;
        }
      }

      this.selected = null;
    });

    this.canvas.addEventListener('pointermove', (ev) => {
      if (!this.drag || ev.pointerId !== this.drag.pointerId) return;
      const pt = this.getCanvasCoords(ev);
      this.drag.screenX = pt.x;
      this.drag.screenY = pt.y;
      if (Math.hypot(pt.x - this.drag.startScreenX, pt.y - this.drag.startScreenY) > 7) {
        this.drag.moved = true;
      }
    });

    const finishPointer = (ev: PointerEvent) => {
      if (!this.drag || ev.pointerId !== this.drag.pointerId) return;
      const d = this.drag;
      this.drag = null;
      const s = this.state;
      if (!s) return;

      const pt = this.getCanvasCoords(ev);

      // Tap without drag -> support tap-to-select & tap-to-merge!
      if (!d.moved) {
        const tappedTarget: SelectedSource = {
          sourceType: d.sourceType,
          benchIdx: d.benchIdx,
          col: d.col,
          row: d.row,
        };
        if (
          this.selected &&
          !(
            this.selected.sourceType === tappedTarget.sourceType &&
            this.selected.benchIdx === tappedTarget.benchIdx &&
            this.selected.col === tappedTarget.col &&
            this.selected.row === tappedTarget.row
          )
        ) {
          this.executeMoveOrMerge(this.selected, tappedTarget);
          this.selected = null;
        } else {
          this.selected = tappedTarget;
        }
        return;
      }

      // Check drop onto War Tent Recycle Zone
      if (this.hitTestTentRecycle(pt.x, pt.y)) {
        const refund = 5 * Math.pow(2, d.unit.tier - 1);
        s.rations += refund;
        if (d.sourceType === 'bench') {
          s.bench[d.benchIdx] = null;
        } else {
          s.board[d.row][d.col] = null;
          this.refreshSynergies();
        }
        SoundFX.tileClack(true);
        this.selected = null;
        return;
      }

      // Check drop onto Board cell
      const dropBoard = this.hitTestBoard(pt.x, pt.y);
      if (dropBoard && s.cells[dropBoard.row][dropBoard.col] === 'deploy') {
        this.executeMoveOrMerge(
          { sourceType: d.sourceType, benchIdx: d.benchIdx, col: d.col, row: d.row },
          { sourceType: 'board', benchIdx: -1, col: dropBoard.col, row: dropBoard.row }
        );
        this.selected = null;
        return;
      }

      // Check drop onto Bench slot
      const dropBench = this.hitTestBench(pt.x, pt.y);
      if (dropBench >= 0) {
        this.executeMoveOrMerge(
          { sourceType: d.sourceType, benchIdx: d.benchIdx, col: d.col, row: d.row },
          { sourceType: 'bench', benchIdx: dropBench, col: -1, row: -1 }
        );
        this.selected = null;
      }
    };

    this.canvas.addEventListener('pointerup', finishPointer);
    this.canvas.addEventListener('pointercancel', finishPointer);
  }

  private getSlotTile(src: SelectedSource): TileUnit | null {
    if (!this.state) return null;
    return src.sourceType === 'bench'
      ? this.state.bench[src.benchIdx]
      : this.state.board[src.row][src.col];
  }

  private setSlotTile(src: SelectedSource, val: TileUnit | null): void {
    if (!this.state) return;
    if (src.sourceType === 'bench') {
      this.state.bench[src.benchIdx] = val;
    } else {
      this.state.board[src.row][src.col] = val;
    }
  }

  private executeMoveOrMerge(from: SelectedSource, to: SelectedSource): void {
    const s = this.state;
    if (!s) return;
    if (
      from.sourceType === to.sourceType &&
      from.benchIdx === to.benchIdx &&
      from.col === to.col &&
      from.row === to.row
    ) {
      return;
    }

    const srcTile = this.getSlotTile(from);
    if (!srcTile) return;

    const dstTile = this.getSlotTile(to);

    // 1) MERGE identical unit + identical tier (< MAX_TILE_TIER)
    if (
      dstTile &&
      dstTile.unitId === srcTile.unitId &&
      dstTile.tier === srcTile.tier &&
      dstTile.tier < MAX_TILE_TIER
    ) {
      this.setSlotTile(from, null);
      dstTile.tier += 1;
      dstTile.mergeAnimTimer = 0.4;
      s.merges += 1;
      s.ultCharge = Math.min(100, s.ultCharge + 10 + dstTile.tier * 3);

      const isHero = UNITS[dstTile.unitId].isHero;
      SoundFX.merge(dstTile.tier, isHero);

      if (to.sourceType === 'board') {
        s.effects.push({
          kind: 'merge_burst',
          x: to.col + 0.5,
          y: to.row + 0.5,
          radius: 1.15,
          color: isHero ? '#facc15' : '#4ade80',
          timer: 0,
          duration: 0.45,
        });
      }
      this.refreshSynergies();
      return;
    }

    // 2) Move to empty slot or Swap two different tiles!
    this.setSlotTile(to, srcTile);
    this.setSlotTile(from, dstTile);
    srcTile.mergeAnimTimer = 0.18;
    SoundFX.tileClack(true);
    this.refreshSynergies();
  }

  public getAllUnitIds(): UnitId[] {
    return ALL_UNIT_IDS;
  }
}
