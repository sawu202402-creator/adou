import { SoundFX } from '../audio/SoundFX';
import {
  checkTileCombine,
  computeSynergies,
  doesCircleReachLane,
  getCombatLevelDamageMult,
  getCombatLevelSpeedMult,
  getHeroXpForNextLevel,
  getTierDamageMultiplier,
  getTierSpeedMultiplier,
  getUnitCircleRange,
  HERO_KEYS,
  MAX_HERO_COMBAT_LEVEL,
  MAX_TILE_TIER,
  RANGE_HIT_PAD,
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
  brittleTimer: number;
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
  sourceUnitUid?: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetId?: number;
  tx: number;
  ty: number;
  kind:
    | 'arrow'
    | 'sun_arrow'
    | 'lance'
    | 'mortar'
    | 'dragon'
    | 'boomerang_lance'
    | 'glaive'
    | 'lotus'
    | 'fireball'
    | 'chakram'
    | 'phoenix';
  color: string;
  damage: number;
  bossBonusMult: number;
  armorPen: number;
  aoeRadius: number;
  hitRadiusBonus: number;
  pierceLeft: number;
  pierceEscalation: number;
  returning: boolean;
  spawnZoneOnHit?: 'frost_zone' | 'fire_patch';
  hitIds: Set<number>;
  slowFactor: number;
  slowDur: number;
  stunDur: number;
  executeRatio: number;
  burnDps: number;
  life: number;
  maxLife: number;
}

export interface GroundZone {
  side: SideOwner;
  sourceUnitUid?: number;
  kind: 'thunder_sigil' | 'frost_zone' | 'fire_patch';
  x: number;
  y: number;
  radius: number;
  dps: number;
  slowFactor: number;
  tickTimer: number;
  timer: number;
  duration: number;
}

export interface VisualEffect {
  kind:
    | 'slash'
    | 'heavy_chop'
    | 'lance_beam'
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
  endX?: number;
  endY?: number;
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
  matchHeroes: HeroKey[];

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
  shovels: number; // Extra ad-granted shovel charges (bench shovels live directly inside bench[0..4]!)
  shovelMode: boolean;
  benchShovelRolledOnce: boolean;
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
  zones: GroundZone[];
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
  selectedUnitInfo: {
    uid: number;
    unitId: UnitId;
    tier: number;
    combatLevel: number;
    xp: number;
    maxXp: number;
    boardCol?: number;
    boardRow?: number;
  } | null;
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

  // ==================== PROGRESSIVE RECRUIT COST ====================

  /**
   * Every summon of 5 bench items becomes progressively more expensive!
   * Sequence: 10 -> 12 -> 15 -> 19 -> 24 -> 30 -> 37 -> 45 -> 54 -> 64 -> 75...
   */
  public computeNextRecruitCost(count: number): number {
    return 10 + count * 2 + Math.floor((count * (count - 1)) / 2);
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

    const baseBarricadeHp = Math.round(180 * meta.barricadeHpMult);
    const emptySyn = computeSynergies([]);

    // Build a focused 7-General rotation for this battle (always including any Generals with equipped weapons!)
    // so all 12 Generals shine across runs without diluting 2-piece puzzle pairing!
    const equippedHeroes = (Object.keys(save.equippedWeapons) as HeroKey[]).filter((hk) =>
      Boolean(save.equippedWeapons[hk])
    );
    const starterHero: HeroKey =
      save.totalRuns === 1
        ? 'zhaoyun'
        : equippedHeroes.length > 0 && Math.random() < 0.55
          ? equippedHeroes[Math.floor(Math.random() * equippedHeroes.length)]
          : HERO_KEYS[Math.floor(Math.random() * HERO_KEYS.length)];

    const poolSet = new Set<HeroKey>([starterHero, ...equippedHeroes]);
    const shuffled = [...HERO_KEYS].sort(() => Math.random() - 0.5);
    for (const hk of shuffled) {
      if (poolSet.size >= 7) break;
      poolSet.add(hk);
    }
    const matchHeroes = Array.from(poolSet);

    this.state = {
      stage,
      mode,
      wave: 0,
      maxWaves: mode === 'standard' ? 10 : null,
      wavePhase: 'prep',
      phaseTimer: 1.8,

      cells,
      board,
      bench: [null, null, null, null, null],
      matchHeroes,

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

      aiHearts: 8,
      aiMaxHearts: 8,
      aiCollapsed: false,
      aiBarricade: {
        side: 'ai',
        col: stage.aiLane.barricadeCell.col,
        row: stage.aiLane.barricadeCell.row,
        hp: 260,
        maxHp: 260,
        shakeTimer: 0,
      },
      aiActionTimer: 1.9,
      aiExcavated: 0,
      aiFortifiedOnce: false,

      rations: meta.startRations,
      passiveRationAcc: 0,
      recruitCost: this.computeNextRecruitCost(0), // Starts at 10, rises EVERY summon!
      recruitCount: 0,
      farmLevel: 1,
      exorciseCooldown: 0,
      shovels: 0, // Shovels spawn randomly in the 5 bench slots; extra shovels require watching Ad!
      shovelMode: false,
      benchShovelRolledOnce: false,
      talismanMode: false,
      meteorTimer: 9.0,

      ultCharge: 0,
      reviveUsed: false,
      heroScrollAdUsed: false,
      supplyAdCooldown: 0,

      spawnQueue: [],
      spawnTimer: 0,
      enemies: [],
      projectiles: [],
      zones: [],
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

    // Lean starter hand: 1 Blade + 1 Hero Puzzle Half in bench (varies across the 12 Generals!)
    this.state.bench[0] = this.makeTile('blade', 1);
    this.state.bench[1] = this.makeTile(`shard1_${starterHero}`, 1);

    // Seed Rival AI 2 starting tiles on Top Half deploy cells
    const aiDeploys = this.getSideCells('ai', 'deploy');
    if (aiDeploys.length >= 2) {
      this.placeBoardUnit(this.state, this.makeTile('blade', 1), aiDeploys[0].col, aiDeploys[0].row);
      this.placeBoardUnit(this.state, this.makeTile('archer', 1), aiDeploys[1].col, aiDeploys[1].row);
    }

    this.recalcSynergies();
    PlatformSDK.gameplayStart();
  }

  private makeTile(unitId: UnitId, tier: number, combatLevel = 1): TileUnit {
    const def = UNITS[unitId];
    return {
      uid: this.nextUid++,
      unitId,
      tier,
      cellSpan: def.cellSpan,
      anchorCol: -1,
      anchorRow: -1,
      secCol: -1,
      secRow: -1,
      combatLevel,
      xp: 0,
      maxXp: getHeroXpForNextLevel(combatLevel),
      levelUpAnimTimer: 0,
      cooldown: Math.random() * 0.25,
      attackCount: 0,
      focusTargetId: -1,
      focusStacks: 0,
      recoilTimer: 0,
      recoilAngle: 0,
      mergeAnimTimer: 0.25,
      frenzyTimer: 0,
    };
  }

  // ==================== 2-CELL GENERAL BOARD FOOTPRINT HELPERS ====================

  public isPrimaryBoardCell(u: TileUnit, col: number, row: number): boolean {
    return u.cellSpan === 1 || (u.anchorCol === col && u.anchorRow === row);
  }

  public getUnitBoardCenter(u: TileUnit, fallbackCol: number, fallbackRow: number): { x: number; y: number } {
    if (u.cellSpan === 2 && u.anchorCol >= 0 && u.secCol >= 0) {
      return {
        x: (u.anchorCol + u.secCol) * 0.5 + 0.5,
        y: (u.anchorRow + u.secRow) * 0.5 + 0.5,
      };
    }
    return { x: fallbackCol + 0.5, y: fallbackRow + 0.5 };
  }

  private placeBoardUnit(
    s: RunState,
    u: TileUnit,
    c1: number,
    r1: number,
    c2 = -1,
    r2 = -1
  ): void {
    if (u.cellSpan === 2 && c2 >= 0 && r2 >= 0) {
      const firstIsTopLeft = r1 < r2 || (r1 === r2 && c1 <= c2);
      const aC = firstIsTopLeft ? c1 : c2;
      const aR = firstIsTopLeft ? r1 : r2;
      const bC = firstIsTopLeft ? c2 : c1;
      const bR = firstIsTopLeft ? r2 : r1;
      u.anchorCol = aC;
      u.anchorRow = aR;
      u.secCol = bC;
      u.secRow = bR;
      s.board[aR][aC] = u;
      s.board[bR][bC] = u;
    } else {
      u.anchorCol = c1;
      u.anchorRow = r1;
      u.secCol = -1;
      u.secRow = -1;
      s.board[r1][c1] = u;
    }
  }

  private removeBoardUnit(s: RunState, u: TileUnit): void {
    if (u.anchorRow >= 0 && u.anchorCol >= 0 && s.board[u.anchorRow]?.[u.anchorCol]?.uid === u.uid) {
      s.board[u.anchorRow][u.anchorCol] = null;
    }
    if (
      u.cellSpan === 2 &&
      u.secRow >= 0 &&
      u.secCol >= 0 &&
      s.board[u.secRow]?.[u.secCol]?.uid === u.uid
    ) {
      s.board[u.secRow][u.secCol] = null;
    }
    u.anchorCol = -1;
    u.anchorRow = -1;
    u.secCol = -1;
    u.secRow = -1;
  }

  /**
   * Finds a HORIZONTALLY adjacent deploy cell (`2x1` left/right on the same row) on `side` next to `(col, row)`:
   * - Synthesized Generals are strictly fixed to horizontal orientation (`2x1`)!
   * - Priority 1: empty horizontal cell (or holding `ignoreUid`)
   * - Priority 2 (if `allowDisplaceOneCell`): horizontal cell holding a 1x1 unit
   */
  private findHorizontalDeployPartner(
    s: RunState,
    side: SideOwner,
    col: number,
    row: number,
    allowDisplaceOneCell: boolean,
    ignoreUid?: number
  ): { col: number; row: number } | null {
    const rMin = side === 'ai' ? 0 : s.stage.dividerRow;
    const rMax = side === 'ai' ? s.stage.dividerRow : s.stage.rows;
    if (row < rMin || row >= rMax) return null;

    const horizOffsets = [1, -1];

    for (const dc of horizOffsets) {
      const nc = col + dc;
      if (nc < 0 || nc >= s.stage.cols) continue;
      if (s.cells[row][nc] !== 'deploy') continue;
      const occ = s.board[row][nc];
      if (!occ || occ.uid === ignoreUid) return { col: nc, row };
    }

    if (allowDisplaceOneCell) {
      for (const dc of horizOffsets) {
        const nc = col + dc;
        if (nc < 0 || nc >= s.stage.cols) continue;
        if (s.cells[row][nc] !== 'deploy') continue;
        const occ = s.board[row][nc];
        if (occ && occ.cellSpan === 1) return { col: nc, row };
      }
    }

    return null;
  }

  private findEmptyAdjacentDeployPair(
    s: RunState,
    side: SideOwner
  ): { c1: number; r1: number; c2: number; r2: number } | null {
    const empties = this.getSideCells(side, 'deploy').filter((pt) => s.board[pt.row][pt.col] === null);
    const lane = side === 'ai' ? s.stage.aiLane : s.stage.playerLane;
    // Prefer horizontal pairs closer to road!
    empties.sort((a, b) => {
      const aRoad = doesCircleReachLane(lane, a.col + 0.5, a.row + 0.5, 0, 1.5) ? 0 : 1;
      const bRoad = doesCircleReachLane(lane, b.col + 0.5, b.row + 0.5, 0, 1.5) ? 0 : 1;
      return aRoad - bRoad;
    });

    for (const pt of empties) {
      const partner = this.findHorizontalDeployPartner(s, side, pt.col, pt.row, false);
      if (partner) {
        const c1 = Math.min(pt.col, partner.col);
        const c2 = Math.max(pt.col, partner.col);
        return { c1, r1: pt.row, c2, r2: pt.row };
      }
    }
    return null;
  }

  public previewTwoCellPlacement(
    col: number,
    row: number,
    ignoreUid?: number
  ): { c1: number; r1: number; c2: number; r2: number } | null {
    const s = this.state;
    if (!s) return null;
    if (col < 0 || col >= s.stage.cols || row < s.stage.dividerRow || row >= s.stage.rows) {
      return null;
    }
    if (s.cells[row][col] !== 'deploy') return null;

    const cur = s.board[row][col];
    if (cur && cur.cellSpan === 2 && cur.uid !== ignoreUid) {
      return { c1: cur.anchorCol, r1: cur.anchorRow, c2: cur.secCol, r2: cur.secRow };
    }

    const partner = this.findHorizontalDeployPartner(s, 'player', col, row, true, ignoreUid);
    if (!partner) return null;
    const c1 = Math.min(col, partner.col);
    const c2 = Math.max(col, partner.col);
    return { c1, r1: row, c2, r2: row };
  }

  private setSelectedInfoFromUnit(
    u: TileUnit | null,
    boardCol?: number,
    boardRow?: number
  ): void {
    if (!this.state) return;
    if (!u) {
      this.state.selectedUnitInfo = null;
      return;
    }
    this.state.selectedUnitInfo = {
      uid: u.uid,
      unitId: u.unitId,
      tier: u.tier,
      combatLevel: u.combatLevel,
      xp: Math.floor(u.xp),
      maxXp: u.maxXp,
      boardCol: boardCol ?? (u.anchorCol >= 0 ? u.anchorCol : undefined),
      boardRow: boardRow ?? (u.anchorRow >= 0 ? u.anchorRow : undefined),
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

  public isBenchShovelSelected(): boolean {
    const s = this.state;
    if (!s) return false;
    if (this.drag?.active && this.drag.unit.unitId === 'shovel') return true;
    if (s.selectedSource?.type === 'bench') {
      const u = s.bench[s.selectedSource.benchIdx];
      return Boolean(u && u.unitId === 'shovel');
    }
    return false;
  }

  public getBenchShovelIndex(): number {
    const s = this.state;
    if (!s) return -1;
    return s.bench.findIndex((u) => u !== null && u.unitId === 'shovel');
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

    // Scarce Granary Steamed Bun trickle (money grows slowly so every summon & merge counts!)
    const meta = SaveManager.getEffectiveBonuses();
    const rationsPerSec = 0.15 + (s.farmLevel - 1) * 0.14 + meta.passiveRationBonus;
    s.passiveRationAcc += rationsPerSec * dt;
    if (s.passiveRationAcc >= 1) {
      const whole = Math.floor(s.passiveRationAcc);
      s.rations += whole;
      s.passiveRationAcc -= whole;
    }

    // Passive 神兵符 charge
    s.ultCharge = Math.min(100, s.ultCharge + dt * 0.65);

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
    this.updateGroundZones(s, dt);
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
      const mDmg = (95 + s.wave * 28) * dmgMult * (1 + (meteorLvl - 1) * 0.2);
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

  // ==================== ESCALATING WAVE & BOSS SPAWNING ====================

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
            this.finishRun(true, s.aiCollapsed);
          } else {
            s.rations += 3 + s.farmLevel;
            s.wavePhase = 'intermission';
            s.phaseTimer = 1.8;
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

    // High-pressure wave size & tactical counter-composition escalation!
    const queue: SpawnOrder[] = [];
    const totalCount = 11 + Math.floor(w * 3.5) + (w >= 4 ? (w - 3) * 2 : 0);
    const shieldChance = w < 2 ? 0 : Math.min(0.5, 0.22 + (w - 2) * 0.04);
    const wolfChance = Math.min(0.42, 0.2 + (w - 1) * 0.025);

    for (let i = 0; i < totalCount; i++) {
      let kind: EnemyKind = 'grunt';
      const roll = Math.random();
      if (roll < shieldChance) kind = 'shield';
      else if (roll < shieldChance + wolfChance) kind = 'wolf';

      const gap = Math.max(0.2, 0.78 - w * 0.046) * (kind === 'wolf' ? 0.68 : 1.0);
      queue.push({
        delay: i === 0 ? 0.2 : gap,
        kind,
        bossType: 'none',
        isBoss: false,
        isMiniBoss: false,
      });
    }

    // Wave 3, 4, 6, 7, 8, 9 mid-wave Elite Armored / Sorcerer Captains!
    if (w >= 3 && !isEliteBossWave && !isFinalBossWave) {
      queue.push({
        delay: 0.75,
        kind: w <= 5 ? 'shield' : 'zhangjiao',
        bossType: w <= 5 ? 'none' : 'zhangbao',
        isBoss: false,
        isMiniBoss: true,
      });
      if (w >= 8) {
        queue.push({
          delay: 1.6,
          kind: 'shield',
          bossType: 'none',
          isBoss: false,
          isMiniBoss: true,
        });
      }
    }

    const dict = t();

    if (isEliteBossWave) {
      queue.push({
        delay: 1.1,
        kind: 'zhangjiao',
        bossType: 'zhangbao',
        isBoss: false,
        isMiniBoss: true,
      });
      SoundFX.alarm();
      const bInfo = dict.bossNames.zhangbao;
      this.showBanner(dict.bannerBossIncoming(bInfo.name, bInfo.trait), 3.4);
    } else if (isFinalBossWave) {
      const bType: 'lubu' | 'zhangjiao' =
        w === 10
          ? s.stage.finalBoss
          : (w / 10) % 2 === 0
            ? 'zhangjiao'
            : 'lubu';
      queue.push({
        delay: 1.3,
        kind: bType,
        bossType: bType,
        isBoss: true,
        isMiniBoss: false,
      });
      // Endless Wave 20+: Twin Bosses!
      if (w >= 20) {
        queue.push({
          delay: 3.2,
          kind: bType === 'lubu' ? 'zhangjiao' : 'lubu',
          bossType: bType === 'lubu' ? 'zhangjiao' : 'lubu',
          isBoss: true,
          isMiniBoss: false,
        });
      }
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
    const stageMult = 1 + s.stage.index * 0.35;
    // High-pressure difficulty curve demanding counter-troops, merges, and leveled 2-cell Generals!
    const lateSurge = w <= 2 ? 1.0 : 1 + Math.pow(w - 2, 1.28) * 0.2;
    const waveMult = Math.pow(1.38, w - 1) * lateSurge * stageMult;
    const spdScale = Math.min(1.62, 1 + (w - 1) * 0.04);
    // Diminishing per-mob bun yield as wave size grows so money never snowballs!
    const killBunTaper = 1 / (1 + Math.max(0, w - 2) * 0.12);

    let hp = 135 * waveMult;
    let speed = 1.04 * spdScale;
    let armor = Math.min(0.3, Math.max(0, (w - 2) * 0.035));
    let reward = 0.42 * killBunTaper;
    let radius = 0.3;

    if (order.kind === 'wolf') {
      hp = 92 * waveMult;
      speed = 1.72 * spdScale;
      armor = 0;
      reward = 0.42 * killBunTaper;
      radius = 0.28;
    } else if (order.kind === 'shield') {
      hp = (order.isMiniBoss ? 560 : 340) * waveMult;
      speed = 0.78 * spdScale;
      armor = Math.min(0.72, 0.55 + Math.max(0, w - 2) * 0.022);
      reward = order.isMiniBoss ? 5 : 0.72 * killBunTaper;
      radius = order.isMiniBoss ? 0.39 : 0.34;
    }

    if (order.bossType === 'zhangbao') {
      hp = 980 * waveMult;
      speed = 0.64 * spdScale;
      armor = 0.35;
      reward = 7;
      radius = 0.41;
    } else if (order.bossType === 'zhangjiao') {
      hp = 1850 * waveMult;
      speed = 0.62 * spdScale;
      armor = 0.38;
      reward = 12;
      radius = 0.44;
    } else if (order.bossType === 'lubu') {
      hp = 2250 * waveMult;
      speed = 0.66 * spdScale;
      armor = 0.54;
      reward = 14;
      radius = 0.46;
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
      brittleTimer: 0,
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
    const seenUids = new Set<number>();
    const occupied: { col: number; row: number; unit: TileUnit }[] = [];
    const emptyDeploys: { col: number; row: number }[] = [];

    for (let r = 0; r < rMax; r++) {
      for (let c = 0; c < s.stage.cols; c++) {
        if (s.cells[r][c] === 'deploy') {
          const u = s.board[r][c];
          if (u) {
            if (!seenUids.has(u.uid)) {
              seenUids.add(u.uid);
              occupied.push({ col: u.anchorCol >= 0 ? u.anchorCol : c, row: u.anchorRow >= 0 ? u.anchorRow : r, unit: u });
            }
          } else {
            emptyDeploys.push({ col: c, row: r });
          }
        }
      }
    }

    // 1A) Post-Synthesis Shard Upgrade: feed any matching shard into an ALREADY-awakened unique AI General!
    for (let i = 0; i < occupied.length; i++) {
      const occ = occupied[i];
      const def = UNITS[occ.unit.unitId];
      if ((def.category === 'shard1' || def.category === 'shard2') && def.heroKey) {
        const existingHero = this.findAwakenedHeroOnSide(s, 'ai', def.heroKey);
        if (
          existingHero &&
          (existingHero.tier < MAX_TILE_TIER || existingHero.combatLevel < MAX_HERO_COMBAT_LEVEL)
        ) {
          this.removeBoardUnit(s, occ.unit);
          if (existingHero.tier < MAX_TILE_TIER) existingHero.tier += 1;
          if (existingHero.combatLevel < MAX_HERO_COMBAT_LEVEL) {
            existingHero.combatLevel += 1;
            existingHero.maxXp = getHeroXpForNextLevel(existingHero.combatLevel);
          }
          existingHero.levelUpAnimTimer = 0.85;
          existingHero.mergeAnimTimer = 0.24;
          const ctr = this.getUnitBoardCenter(
            existingHero,
            existingHero.anchorCol,
            existingHero.anchorRow
          );
          this.spawnCombineFX(ctr.x, ctr.y, 'merge', existingHero.unitId);
          this.recalcSynergies();
          return;
        }
      }
    }

    // 1B) Fuse matching Puzzle Piece I + Puzzle Piece II into a UNIQUE 2-CELL Awakened General!
    for (let i = 0; i < occupied.length; i++) {
      for (let j = i + 1; j < occupied.length; j++) {
        const a = occupied[i];
        const b = occupied[j];
        const res = checkTileCombine(a.unit, b.unit);
        if (res && res.mode === 'awaken') {
          const hKey = UNITS[a.unit.unitId].heroKey;
          // Strictly 1 instance per General on AI side as well!
          if (hKey && this.findAwakenedHeroOnSide(s, 'ai', hKey)) {
            continue;
          }

          this.removeBoardUnit(s, a.unit);
          this.removeBoardUnit(s, b.unit);

          const adjToB = this.findHorizontalDeployPartner(s, 'ai', b.col, b.row, true);
          const anchor = adjToB
            ? { col: b.col, row: b.row, spare: a, partner: adjToB }
            : (() => {
                const adjToA = this.findHorizontalDeployPartner(s, 'ai', a.col, a.row, true);
                return adjToA ? { col: a.col, row: a.row, spare: b, partner: adjToA } : null;
              })();

          if (anchor) {
            const displaced = s.board[anchor.partner.row][anchor.partner.col];
            if (displaced && displaced.cellSpan === 1) {
              this.removeBoardUnit(s, displaced);
              this.placeBoardUnit(s, displaced, anchor.spare.col, anchor.spare.row);
            }
            const heroTile = this.makeTile(res.resultId, res.resultTier, 1);
            this.placeBoardUnit(s, heroTile, anchor.col, anchor.row, anchor.partner.col, anchor.partner.row);
            const ctr = this.getUnitBoardCenter(heroTile, anchor.col, anchor.row);
            this.spawnCombineFX(ctr.x, ctr.y, 'awaken', res.resultId);
            const heroTxt = getUnitDisplayText(res.resultId);
            this.showBanner(t().bannerRivalAwakened(heroTxt.name), 2.3);
            this.recalcSynergies();
            return;
          } else {
            // Restore if no valid horizontal 2x1 pair around b or a yet
            this.placeBoardUnit(s, a.unit, a.col, a.row);
            this.placeBoardUnit(s, b.unit, b.col, b.row);
          }
        }
      }
    }

    // 2) Merge identical same-tier 1x1 Troops (unfused shards cannot merge before synthesis!)
    for (let i = 0; i < occupied.length; i++) {
      for (let j = i + 1; j < occupied.length; j++) {
        const a = occupied[i];
        const b = occupied[j];
        const res = checkTileCombine(a.unit, b.unit);
        if (res && res.mode === 'merge') {
          this.removeBoardUnit(s, a.unit);
          this.removeBoardUnit(s, b.unit);

          const merged = this.makeTile(res.resultId, res.resultTier, 1);
          this.placeBoardUnit(s, merged, b.col, b.row);
          const ctr = this.getUnitBoardCenter(merged, b.col, b.row);
          this.spawnCombineFX(ctr.x, ctr.y, 'merge', res.resultId);
          this.recalcSynergies();
          return;
        }
      }
    }

    // 3) Excavate outer-ring locked cells progressively
    const targetExcavations = Math.min(5, Math.floor((s.wave + 1) / 2));
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
    if (!s.aiFortifiedOnce && s.aiBarricade.hp < s.aiBarricade.maxHp * 0.35 && s.aiHearts <= 5) {
      s.aiFortifiedOnce = true;
      s.aiBarricade.hp = Math.min(s.aiBarricade.maxHp, s.aiBarricade.hp + s.aiBarricade.maxHp * 0.65);
      s.aiHearts = Math.min(s.aiMaxHearts, s.aiHearts + 1);
      return;
    }

    // 5) Conscript smartly onto empty deploy cell (match troop range to lane distance!)
    if (emptyDeploys.length > 0) {
      const inertCount = occupied.filter((o) => !getUnitCircleRange(o.unit).canAttack).length;
      let unitId: UnitId =
        inertCount >= 2
          ? TROOP_KEYS[Math.floor(Math.random() * TROOP_KEYS.length)]
          : this.rollUnitForSide('ai');

      let slot = emptyDeploys[Math.floor(Math.random() * emptyDeploys.length)];
      const probeDef = UNITS[unitId];
      if (probeDef.category === 'troop') {
        const validSlots = emptyDeploys.filter((pt) =>
          doesCircleReachLane(
            s.stage.aiLane,
            pt.col + 0.5,
            pt.row + 0.5,
            probeDef.minRangeCells,
            probeDef.rangeCells
          )
        );
        if (validSlots.length > 0) {
          slot = validSlots[Math.floor(Math.random() * validSlots.length)];
        } else {
          // Pick the shortest-range troop that CAN reach the AI lane from `slot`
          const reachingTroop = TROOP_KEYS.find((tk) =>
            doesCircleReachLane(
              s.stage.aiLane,
              slot.col + 0.5,
              slot.row + 0.5,
              UNITS[tk].minRangeCells,
              UNITS[tk].rangeCells
            )
          );
          if (reachingTroop) {
            unitId = reachingTroop;
          }
        }
      }

      this.placeBoardUnit(s, this.makeTile(unitId, 1), slot.col, slot.row);
      this.recalcSynergies();
      return;
    }

    // 6) Anti-deadlock partner cycle when full (only replace 1x1 low-tier tiles!)
    const lowTiles = occupied.filter(
      (o) => o.unit.cellSpan === 1 && o.unit.tier === 1 && UNITS[o.unit.unitId].category !== 'awakened'
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
      this.removeBoardUnit(s, victim.unit);
      this.placeBoardUnit(s, this.makeTile(replacementId, 1), victim.col, victim.row);
      this.recalcSynergies();
    }
  }

  // ==================== DRAFTING, 2-PIECE PUZZLE PAIRING & RANDOM BENCH SHOVELS ====================

  public getHeroDraftChance(): number {
    const meta = SaveManager.getEffectiveBonuses();
    return Math.min(0.58, 0.32 + meta.heroChanceBonus);
  }

  /**
   * Returns the unique awakened General instance on the given side's board, or null if not yet synthesized.
   * Each General can only exist ONCE per side; subsequent shards feed into this General to upgrade!
   */
  public findAwakenedHeroOnSide(s: RunState, side: SideOwner, heroKey: HeroKey): TileUnit | null {
    const targetId: UnitId = `hero_${heroKey}`;
    const rStart = side === 'ai' ? 0 : s.stage.dividerRow;
    const rEnd = side === 'ai' ? s.stage.dividerRow : s.stage.rows;
    for (let r = rStart; r < rEnd; r++) {
      for (let c = 0; c < s.stage.cols; c++) {
        const u = s.board[r][c];
        if (u && u.unitId === targetId) {
          return u;
        }
      }
    }
    return null;
  }

  public findUnmatchedHeroShards(side: SideOwner): { heroKey: HeroKey; missingId: UnitId }[] {
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
      // Skip Generals already awakened on this side (cannot awaken a duplicate 2nd copy!)
      if (this.findAwakenedHeroOnSide(s, side, h)) continue;
      if (hasS1.has(h) && !hasS2.has(h)) {
        unmatched.push({ heroKey: h, missingId: `shard2_${h}` });
      } else if (hasS2.has(h) && !hasS1.has(h)) {
        unmatched.push({ heroKey: h, missingId: `shard1_${h}` });
      }
    }
    return unmatched;
  }

  /** Returns HeroKeys for which BOTH Piece I and Piece II are held AND that General is NOT yet awakened on player's board! */
  public getReadyPuzzleHeroKeys(): Set<HeroKey> {
    const s = this.state;
    const ready = new Set<HeroKey>();
    if (!s) return ready;

    const hasS1 = new Set<HeroKey>();
    const hasS2 = new Set<HeroKey>();

    const scan = (u: TileUnit | null) => {
      if (!u) return;
      const def = UNITS[u.unitId];
      if (def.category === 'shard1' && def.heroKey) hasS1.add(def.heroKey);
      else if (def.category === 'shard2' && def.heroKey) hasS2.add(def.heroKey);
    };

    for (let r = s.stage.dividerRow; r < s.stage.rows; r++) {
      for (let c = 0; c < s.stage.cols; c++) {
        scan(s.board[r][c]);
      }
    }
    for (const b of s.bench) scan(b);

    for (const h of HERO_KEYS) {
      if (this.findAwakenedHeroOnSide(s, 'player', h)) continue;
      if (hasS1.has(h) && hasS2.has(h)) ready.add(h);
    }
    return ready;
  }

  /** Returns HeroKeys already awakened on player's board that can still absorb new shards to upgrade! */
  public getUpgradeableAwakenedHeroKeys(): Set<HeroKey> {
    const s = this.state;
    const out = new Set<HeroKey>();
    if (!s) return out;
    for (const h of HERO_KEYS) {
      const hero = this.findAwakenedHeroOnSide(s, 'player', h);
      if (hero && (hero.tier < MAX_TILE_TIER || hero.combatLevel < MAX_HERO_COMBAT_LEVEL)) {
        out.add(h);
      }
    }
    return out;
  }

  private rollUnitForSide(side: SideOwner): UnitId {
    const s = this.state;
    const heroChance = side === 'player' ? this.getHeroDraftChance() : 0.28;
    if (Math.random() < heroChance) {
      const unmatched = this.findUnmatchedHeroShards(side);
      // Higher smart pairing chance (especially when holding >=2 halves) so 12 Generals synthesize smoothly!
      const pairProb = unmatched.length >= 2 ? 0.7 : 0.56;
      if (unmatched.length > 0 && Math.random() < pairProb) {
        return unmatched[Math.floor(Math.random() * unmatched.length)].missingId;
      }

      if (s && side === 'player') {
        const upgradeable = Array.from(this.getUpgradeableAwakenedHeroKeys());
        if (upgradeable.length > 0 && Math.random() < 0.24) {
          const uh = upgradeable[Math.floor(Math.random() * upgradeable.length)];
          return Math.random() < 0.5 ? `shard1_${uh}` : `shard2_${uh}`;
        }

        // Prefer unawakened Generals from this battle's focused 7-General pool; unlock all 12 once pool is awakened!
        const poolUnawakened = s.matchHeroes.filter(
          (hk) => !this.findAwakenedHeroOnSide(s, 'player', hk)
        );
        const allUnawakened = HERO_KEYS.filter(
          (hk) => !this.findAwakenedHeroOnSide(s, 'player', hk)
        );
        const candidates =
          poolUnawakened.length > 0
            ? poolUnawakened
            : allUnawakened.length > 0
              ? allUnawakened
              : HERO_KEYS;
        const h = candidates[Math.floor(Math.random() * candidates.length)];
        return Math.random() < 0.5 ? `shard1_${h}` : `shard2_${h}`;
      }

      const aiPool = s ? s.matchHeroes : HERO_KEYS;
      const h = aiPool[Math.floor(Math.random() * aiPool.length)];
      return Math.random() < 0.5 ? `shard1_${h}` : `shard2_${h}`;
    }
    return TROOP_KEYS[Math.floor(Math.random() * TROOP_KEYS.length)];
  }

  // ==================== PLAYER COMMANDS & RANDOM 5-SLOT SHOVELS ====================

  public recruitBench(): void {
    const s = this.state;
    if (!s || this.paused || this.modalPaused) return;

    if (s.rations < s.recruitCost) {
      this.showBanner(t().bannerNeedRations, 1.6);
      return;
    }

    s.rations -= s.recruitCost;
    s.recruitCount += 1;
    // Every single summon gets progressively more expensive!
    s.recruitCost = this.computeNextRecruitCost(s.recruitCount);

    // Clear ALL 5 bench slots first — any unused items left in the bottom bench are discarded and replaced!
    for (let i = 0; i < s.bench.length; i++) {
      s.bench[i] = null;
    }

    // Summon 5 brand-new tiles across all 5 bench slots!
    for (let i = 0; i < s.bench.length; i++) {
      const tile = this.makeTile(this.rollUnitForSide('player'), 1);
      tile.mergeAnimTimer = 0.16;
      s.bench[i] = tile;
    }

    // Random Golden Shovel appearance inside one of the 5 newly summoned bench slots!
    const hasLockedStone = this.getSideCells('player', 'locked').length > 0;
    if (hasLockedStone && s.bench.length > 0) {
      const meta = SaveManager.getEffectiveBonuses();
      const shovelProb = Math.min(0.36, 0.14 + meta.benchShovelChanceBonus * 2.2);
      if (Math.random() < shovelProb) {
        const pickSlot = Math.floor(Math.random() * s.bench.length);
        const shovelTile = this.makeTile('shovel', 1);
        shovelTile.mergeAnimTimer = 0.18;
        s.bench[pickSlot] = shovelTile;
        s.benchShovelRolledOnce = true;
      }
    }

    if (s.selectedSource?.type === 'bench') {
      s.selectedUnitInfo = null;
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

    const unawakened = HERO_KEYS.filter((hk) => !this.findAwakenedHeroOnSide(s, 'player', hk));
    if (unawakened.length > 0) {
      const h = unawakened[Math.floor(Math.random() * unawakened.length)];
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
      this.showBanner(`◈ ${hName} [1/2 + 2/2]`, 2.4);
      return;
    }

    // All 6 Generals are already on the board -> grant 2 upgrade shards for an upgradeable General!
    const upgradeable = Array.from(this.getUpgradeableAwakenedHeroKeys());
    const h =
      upgradeable.length > 0
        ? upgradeable[Math.floor(Math.random() * upgradeable.length)]
        : HERO_KEYS[Math.floor(Math.random() * HERO_KEYS.length)];
    const emptyIdx = s.bench.findIndex((b) => b === null);
    const targetIdx = emptyIdx >= 0 ? emptyIdx : 0;
    s.bench[targetIdx] = this.makeTile(`shard1_${h}`, 1);
    SoundFX.merge(3, true);
    const hName = getUnitDisplayText(`hero_${h}`).name;
    this.showBanner(`✦ ${hName} [1/2]`, 2.4);
  }

  public getFarmCost(): number {
    const s = this.state;
    if (!s) return 26;
    return 26 + (s.farmLevel - 1) * 24;
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
    return 32;
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
    s.exorciseCooldown = 16.0;
    s.screenShake = 0.4;
    SoundFX.attack('thunder');
    this.showBanner(t().bannerExorciseCast, 2.2);

    const meta = SaveManager.getEffectiveBonuses();
    const baseStrike = (115 + s.wave * 34) * meta.damageMult * meta.bossDmgMult;

    const targets = foes.slice(0, 4);
    const pts: { x: number; y: number }[] = [];
    for (const foe of targets) {
      pts.push({ x: foe.x, y: foe.y });
      const mult = foe.isBoss || foe.isMiniBoss ? 1.45 : 1.0;
      this.damageEnemy(s, foe, baseStrike * mult, true, '#4ade80');
      foe.armorBrokenTimer = 3.5;
      foe.stunTimer = Math.max(foe.stunTimer, 0.9);
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
   * Left Circle Orb: 【神兵符】 (Divine Upgrade Talisman — +1 Tier & +1 Combat Level + Global Haste!)
   */
  public activateDivineTalisman(): void {
    const s = this.state;
    if (!s || s.ultCharge < 100) return;

    if (s.talismanMode) {
      let best: { r: number; c: number; u: TileUnit } | null = null;
      for (let r = s.stage.dividerRow; r < s.stage.rows; r++) {
        for (let c = 0; c < s.stage.cols; c++) {
          const u = s.board[r][c];
          if (!u || !getUnitCircleRange(u).canAttack) continue;
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
        const center = this.getUnitBoardCenter(best.u, best.c, best.r);
        this.applyDivineTalismanToUnit(best.u, center.x, center.y);
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
    if (UNITS[u.unitId].category === 'awakened' && u.combatLevel < MAX_HERO_COMBAT_LEVEL) {
      u.combatLevel += 1;
      u.maxXp = getHeroXpForNextLevel(u.combatLevel);
      u.levelUpAnimTimer = 0.85;
    }
    u.mergeAnimTimer = 0.3;

    for (let r = s.stage.dividerRow; r < s.stage.rows; r++) {
      for (let c = 0; c < s.stage.cols; c++) {
        const ally = s.board[r][c];
        if (ally) ally.frenzyTimer = 4.5;
      }
    }

    SoundFX.dragonUlt();
    this.spawnCombineFX(gx, gy, 'awaken', u.unitId);
    const txt = getUnitDisplayText(u.unitId);
    this.showBanner(t().bannerTalismanUpgraded(txt.name, u.tier), 2.5);
    this.setSelectedInfoFromUnit(u);
  }

  /**
   * Bottom Golden Shovel Button:
   * - If a Shovel is currently in the 5-slot bench, highlights/selects it!
   * - If player has Ad-granted shovel charges (s.shovels > 0), toggles shovelMode!
   * - Otherwise, wanting more shovels requires watching a Rewarded Ad!
   */
  public toggleShovelMode(): void {
    const s = this.state;
    if (!s) return;

    const playerLocked = this.getSideCells('player', 'locked');
    if (playerLocked.length === 0) {
      this.showBanner(t().bannerMaxLevel, 1.4);
      return;
    }

    s.talismanMode = false;

    const benchShovelIdx = this.getBenchShovelIndex();
    if (benchShovelIdx >= 0) {
      if (
        s.selectedSource?.type === 'bench' &&
        s.selectedSource.benchIdx === benchShovelIdx
      ) {
        s.selectedSource = null;
      } else {
        s.selectedSource = { type: 'bench', benchIdx: benchShovelIdx, col: -1, row: -1 };
        this.setSelectedInfoFromUnit(s.bench[benchShovelIdx]);
        this.showBanner(t().bannerBenchShovelPick, 2.4);
        SoundFX.tileClack(true);
      }
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

    // Extra shovels beyond random 5-slot bench drops strictly require watching an Ad!
    this.callbacks.onRequestShovelAd();
  }

  private excavateLockedCell(col: number, row: number): void {
    const s = this.state;
    if (!s) return;

    s.cells[row][col] = 'deploy';
    SoundFX.shovelDig();
    s.effects.push({
      kind: 'merge_burst',
      x: col + 0.5,
      y: row + 0.5,
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
          x: col + 0.5,
          y: row + 0.5,
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
  }

  public getFortifyCost(): number {
    return 36;
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
    s.hearts = Math.min(s.maxHearts, s.hearts + 1);
    s.playerBarricade.hp = Math.min(
      s.playerBarricade.maxHp,
      s.playerBarricade.hp + Math.round(s.playerBarricade.maxHp * 0.45)
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

  // ==================== HERO COMBAT XP & LEVELING ====================

  private findBoardUnitByUid(
    s: RunState,
    uid: number
  ): { unit: TileUnit; col: number; row: number; side: SideOwner } | null {
    for (let r = 0; r < s.stage.rows; r++) {
      for (let c = 0; c < s.stage.cols; c++) {
        const u = s.board[r][c];
        if (u && u.uid === uid) {
          return {
            unit: u,
            col: c,
            row: r,
            side: r < s.stage.dividerRow ? 'ai' : 'player',
          };
        }
      }
    }
    return null;
  }

  private grantHeroCombatXp(
    s: RunState,
    side: SideOwner,
    u: TileUnit,
    gx: number,
    gy: number,
    xpGain: number
  ): void {
    if (UNITS[u.unitId].category !== 'awakened') return;
    if (u.combatLevel >= MAX_HERO_COMBAT_LEVEL) {
      u.xp = u.maxXp;
      return;
    }

    u.xp += xpGain;
    let leveledUp = false;
    while (u.xp >= u.maxXp && u.combatLevel < MAX_HERO_COMBAT_LEVEL) {
      u.xp -= u.maxXp;
      u.combatLevel += 1;
      u.maxXp = getHeroXpForNextLevel(u.combatLevel);
      u.levelUpAnimTimer = 0.85;
      leveledUp = true;
    }

    if (leveledUp) {
      s.effects.push({
        kind: 'awaken_pillar',
        x: gx,
        y: gy,
        radius: 1.15,
        color: '#fde047',
        timer: 0,
        duration: 0.55,
      });
      if (side === 'player') {
        SoundFX.merge(Math.min(5, u.combatLevel), true);
        s.floatTexts.push({
          x: gx,
          y: gy - 0.35,
          vy: -1.1,
          text: `Lv.${u.combatLevel} UP!`,
          color: '#fde047',
          scale: 1.18,
          timer: 0,
          duration: 0.9,
        });
        const hName = getUnitDisplayText(u.unitId).name;
        this.showBanner(t().bannerHeroLevelUp(hName, u.combatLevel), 2.0);
      }
    }

    if (s.selectedUnitInfo && s.selectedUnitInfo.uid === u.uid) {
      this.setSelectedInfoFromUnit(u);
    }
  }

  // ==================== COMBAT: 2-CELL CENTERS, DISTINCT TROOPS & GENERAL ATTACKS ====================

  private updateBoardUnits(s: RunState, dt: number): void {
    const meta = SaveManager.getEffectiveBonuses();

    for (let r = 0; r < s.stage.rows; r++) {
      const side: SideOwner = r < s.stage.dividerRow ? 'ai' : 'player';
      if (side === 'ai' && s.aiCollapsed) continue;

      const syn = side === 'player' ? s.synBonuses : s.aiSynBonuses;
      const sideDmgScale = side === 'player' ? meta.damageMult : 1.12 + s.stage.index * 0.08;
      const sideAspdScale = side === 'player' ? meta.aspdMult : 1.05;

      for (let c = 0; c < s.stage.cols; c++) {
        const u = s.board[r][c];
        if (!u) continue;
        // 2-Cell Generals occupy 2 cells on s.board — only tick once on their primary anchor cell!
        if (!this.isPrimaryBoardCell(u, c, r)) continue;

        if (u.recoilTimer > 0) u.recoilTimer = Math.max(0, u.recoilTimer - dt);
        if (u.mergeAnimTimer > 0) u.mergeAnimTimer = Math.max(0, u.mergeAnimTimer - dt);
        if (u.frenzyTimer > 0) u.frenzyTimer = Math.max(0, u.frenzyTimer - dt);
        if (u.levelUpAnimTimer > 0) u.levelUpAnimTimer = Math.max(0, u.levelUpAnimTimer - dt);

        if (
          this.drag?.active &&
          this.drag.movedEnough &&
          this.drag.sourceType === 'board' &&
          this.drag.unit.uid === u.uid
        ) {
          continue;
        }

        // Unfused Hero Puzzle Pieces ('shard1' / 'shard2') CANNOT attack!
        const rangeInfo = getUnitCircleRange(u);
        if (!rangeInfo.canAttack) continue;

        const def = UNITS[u.unitId];

        const weapBonus =
          side === 'player' && def.category === 'awakened' && def.heroKey
            ? SaveManager.getHeroWeaponBonus(def.heroKey)
            : { weaponId: null, star: 0, isSignature: false, dmgMult: 1, aspdMult: 1 };

        const isAwakened = def.category === 'awakened';
        const frenzyMult = u.frenzyTimer > 0 ? 1.45 : 1.0;
        const speedMult =
          getTierSpeedMultiplier(u.tier, isAwakened) *
          getCombatLevelSpeedMult(u.combatLevel) *
          syn.globalAspdMult *
          sideAspdScale *
          weapBonus.aspdMult *
          frenzyMult;

        u.cooldown -= dt * speedMult;
        if (u.cooldown > 0) continue;

        const center = this.getUnitBoardCenter(u, c, r);
        const ux = center.x;
        const uy = center.y;

        // Pick target inside circular attack ring (minR .. maxR) around unit/plaque center!
        const target =
          def.pattern === 'sun_snipe'
            ? this.pickSniperTargetInCircleRange(s, side, ux, uy, rangeInfo.minR, rangeInfo.maxR)
            : this.pickTargetInCircleRange(
                s,
                side,
                ux,
                uy,
                rangeInfo.minR,
                rangeInfo.maxR
              );
        if (!target) {
          u.cooldown = 0.08;
          continue;
        }

        u.cooldown = def.attackInterval;
        u.attackCount += 1;

        const angle = Math.atan2(target.y - uy, target.x - ux);
        u.recoilAngle = angle;
        u.recoilTimer = 0.14;

        let dmg =
          def.baseDamage *
          getTierDamageMultiplier(u.tier, isAwakened) *
          getCombatLevelDamageMult(u.combatLevel) *
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

        // Awakened 2-Cell Generals gain Combat XP on EVERY attack!
        if (def.category === 'awakened') {
          this.grantHeroCombatXp(s, side, u, ux, uy, isSkillStrike ? 8 : 4);
        }

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
          weapBonus.isSignature,
          rangeInfo.maxR
        );
      }
    }
  }

  private pickTargetInCircleRange(
    s: RunState,
    side: SideOwner,
    ux: number,
    uy: number,
    minR: number,
    maxR: number
  ): EnemyEntity | null {
    let best: EnemyEntity | null = null;
    let bestProgress = -1;
    const effMin = Math.max(0, minR - RANGE_HIT_PAD);
    const effMax = maxR + RANGE_HIT_PAD;

    for (const e of s.enemies) {
      if (e.side !== side || e.hp <= 0) continue;
      const dist = Math.hypot(e.x - ux, e.y - uy);
      if (dist >= effMin && dist <= effMax) {
        const progress = e.waypointIndex + e.segProgress;
        if (progress > bestProgress) {
          bestProgress = progress;
          best = e;
        }
      }
    }
    return best;
  }

  private pickSniperTargetInCircleRange(
    s: RunState,
    side: SideOwner,
    ux: number,
    uy: number,
    minR: number,
    maxR: number
  ): EnemyEntity | null {
    let best: EnemyEntity | null = null;
    let bestScore = -1;
    const effMin = Math.max(0, minR - RANGE_HIT_PAD);
    const effMax = maxR + RANGE_HIT_PAD;

    for (const e of s.enemies) {
      if (e.side !== side || e.hp <= 0) continue;
      const dist = Math.hypot(e.x - ux, e.y - uy);
      if (dist >= effMin && dist <= effMax) {
        const score =
          (e.isBoss ? 1_000_000 : e.isMiniBoss ? 250_000 : 0) +
          e.hp +
          (e.waypointIndex + e.segProgress) * 18;
        if (score > bestScore) {
          bestScore = score;
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
    hasSigWeapon: boolean,
    unitMaxRange: number
  ): void {
    const playSfx = side === 'player';

    switch (def.pattern) {
      case 'none':
        break;

      // 1) 刀兵 (Blade): STRICTLY SINGLE-TARGET! Huge armor-cracking heavy chop!
      case 'single_chop': {
        if (playSfx) SoundFX.attack('slash');
        const chopMult = isSkill ? 1.85 : 1.0;
        s.effects.push({
          kind: 'heavy_chop',
          x: target.x,
          y: target.y,
          radius: isSkill ? 0.72 : 0.52,
          color: isSkill ? '#facc15' : '#dc2626',
          timer: 0,
          duration: 0.22,
          angle,
        });
        if (isSkill) {
          target.armorBrokenTimer = Math.max(target.armorBrokenTimer, 2.5);
        }
        this.damageEnemy(
          s,
          target,
          dmg * chopMult,
          isSkill ? 0.85 : 0.35,
          isSkill ? '#facc15' : '#ef4444',
          u.uid
        );
        break;
      }

      // 2) 枪兵 (Spear): STRAIGHT-LINE PIERCE! Strictly bounded to its circular range!
      case 'pierce_lance': {
        if (playSfx) SoundFX.attack('lance');
        const travelCells = unitMaxRange + RANGE_HIT_PAD;
        s.effects.push({
          kind: 'lance_beam',
          x: ux,
          y: uy,
          endX: ux + Math.cos(angle) * travelCells,
          endY: uy + Math.sin(angle) * travelCells,
          radius: 0.22,
          color: '#ef4444',
          timer: 0,
          duration: 0.2,
          angle,
        });
        s.projectiles.push({
          side,
          sourceUnitUid: u.uid,
          startX: ux,
          startY: uy,
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
          armorPen: 0.2,
          aoeRadius: 0,
          hitRadiusBonus: 0.08,
          pierceLeft: 5 + u.tier,
          pierceEscalation: 0.15,
          returning: false,
          hitIds: new Set(),
          slowFactor: 0,
          slowDur: 0,
          stunDur: 0,
          executeRatio: 0,
          burnDps: 0,
          life: 0,
          maxLife: travelCells / def.projectileSpeed,
        });
        break;
      }

      // 3) 骑兵 (Cavalry): AREA-OF-EFFECT SWEEP! Splashes tight cluster strictly within its ring!
      case 'cavalry_aoe': {
        if (playSfx) SoundFX.attack('slash');
        const splashR = (def.aoeRadiusCells || 0.72) + (u.tier - 1) * 0.04;
        const distToTgt = Math.hypot(target.x - ux, target.y - uy);
        const fxDist = Math.min(distToTgt, Math.max(0.55, unitMaxRange - splashR * 0.45));
        const fxX = distToTgt > 0.01 ? ux + Math.cos(angle) * fxDist : target.x;
        const fxY = distToTgt > 0.01 ? uy + Math.sin(angle) * fxDist : target.y;
        s.effects.push({
          kind: 'slash',
          x: fxX,
          y: fxY,
          radius: splashR * 0.88,
          color: '#38bdf8',
          timer: 0,
          duration: 0.24,
          angle,
        });
        s.effects.push({
          kind: 'ring',
          x: target.x,
          y: target.y,
          radius: splashR * 0.75,
          color: '#7dd3fc',
          timer: 0,
          duration: 0.24,
        });
        for (const e of s.enemies) {
          if (
            e.side === side &&
            e.hp > 0 &&
            Math.hypot(e.x - target.x, e.y - target.y) <= splashR &&
            Math.hypot(e.x - ux, e.y - uy) <= unitMaxRange + 0.18
          ) {
            this.damageEnemy(s, e, dmg, 0, '#38bdf8', u.uid);
            if (!e.isBoss) {
              e.slowPower = Math.max(e.slowPower, def.slowFactor || 0.28);
              e.slowTimer = Math.max(e.slowTimer, def.slowDuration || 0.35);
            }
          }
        }
        break;
      }

      // 4) 弓兵 (Archer): HOMING SINGLE-TARGET + CONSECUTIVE FOCUS MARK STACKING!
      case 'focus_arrow': {
        if (playSfx) SoundFX.attack('bow');
        if (u.focusTargetId === target.id) {
          u.focusStacks = Math.min(5, u.focusStacks + 1);
        } else {
          u.focusTargetId = target.id;
          u.focusStacks = 1;
        }
        const focusMult = 1 + (u.focusStacks - 1) * 0.14;
        const p = this.spawnProj(
          s,
          side,
          u.uid,
          ux,
          uy,
          target,
          'arrow',
          def.accentColor,
          dmg * focusMult,
          def.projectileSpeed
        );
        p.bossBonusMult = 1.3;
        p.armorPen = 0.2;

        // Tier 3+ Marksman fires a rapid twin follow-up arrow at the same focused target!
        if (u.tier >= 3) {
          const perpX = -Math.sin(angle) * 0.14;
          const perpY = Math.cos(angle) * 0.14;
          const p2 = this.spawnProj(
            s,
            side,
            u.uid,
            ux + perpX,
            uy + perpY,
            target,
            'arrow',
            '#65a30d',
            dmg * 0.55 * focusMult,
            def.projectileSpeed * 0.92
          );
          p2.bossBonusMult = 1.3;
          p2.armorPen = 0.2;
        }
        break;
      }

      // 5) 神威炮 (Mortar): PARABOLIC SIEGE SHELL -> ARMOR-PIERCING BLAST + SCORCH ZONE!
      case 'mortar_siege': {
        if (playSfx) SoundFX.attack('cannon');
        const flightDur = Math.max(
          0.26,
          Math.hypot(target.x - ux, target.y - uy) / def.projectileSpeed
        );
        s.projectiles.push({
          side,
          sourceUnitUid: u.uid,
          startX: ux,
          startY: uy,
          x: ux,
          y: uy,
          vx: 0,
          vy: 0,
          tx: target.x,
          ty: target.y,
          kind: 'mortar',
          color: '#f97316',
          damage: dmg,
          bossBonusMult: 1.15,
          armorPen: 0.75,
          aoeRadius: def.aoeRadiusCells || 1.45,
          hitRadiusBonus: 0,
          pierceLeft: 1,
          pierceEscalation: 0,
          returning: false,
          spawnZoneOnHit: 'fire_patch',
          hitIds: new Set(),
          slowFactor: 0,
          slowDur: 0,
          stunDur: 0,
          executeRatio: 0,
          burnDps: dmg * 0.24,
          life: 0,
          maxLife: flightDur,
        });
        break;
      }

      // HERO 1 — 赵云 (Zhao Yun): BOOMERANG SILVER DRAGON LANCE (Out + Return Double Pierce!)
      case 'dragon_boomerang': {
        if (playSfx) SoundFX.attack('lance');
        const outDist = unitMaxRange + 0.15;
        s.projectiles.push({
          side,
          sourceUnitUid: u.uid,
          startX: ux,
          startY: uy,
          x: ux,
          y: uy,
          vx: Math.cos(angle) * def.projectileSpeed,
          vy: Math.sin(angle) * def.projectileSpeed,
          tx: ux + Math.cos(angle) * outDist,
          ty: uy + Math.sin(angle) * outDist,
          kind: 'boomerang_lance',
          color: '#38bdf8',
          damage: dmg * 0.78,
          bossBonusMult: 1.15,
          armorPen: 0.7,
          aoeRadius: 0,
          hitRadiusBonus: 0.2,
          pierceLeft: 14,
          pierceEscalation: 0.08,
          returning: false,
          hitIds: new Set(),
          slowFactor: 0,
          slowDur: 0,
          stunDur: 0,
          executeRatio: 0,
          burnDps: 0,
          life: 0,
          maxLife: (outDist / def.projectileSpeed) * 2,
        });

        if (isSkill) {
          const spearCount = hasSigWeapon ? 5 : 3;
          const allSideFoes = s.enemies.filter((e) => e.side === side && e.hp > 0);
          for (let k = 0; k < spearCount; k++) {
            const spTarget = allSideFoes[k % Math.max(1, allSideFoes.length)] || target;
            const spread = (k - (spearCount - 1) * 0.5) * 0.12;
            const spAng = Math.atan2(spTarget.y - uy, spTarget.x - ux) + spread;
            s.projectiles.push({
              side,
              sourceUnitUid: u.uid,
              startX: ux,
              startY: uy,
              x: ux,
              y: uy,
              vx: Math.cos(spAng) * 12.2,
              vy: Math.sin(spAng) * 12.2,
              tx: spTarget.x,
              ty: spTarget.y,
              kind: 'dragon',
              color: '#7dd3fc',
              damage: dmg * 1.45,
              bossBonusMult: 1.25,
              armorPen: 0.85,
              aoeRadius: 0,
              hitRadiusBonus: 0.26,
              pierceLeft: 10,
              pierceEscalation: 0,
              returning: false,
              hitIds: new Set(),
              slowFactor: 0,
              slowDur: 0,
              stunDur: 0.35,
              executeRatio: 0,
              burnDps: 0,
              life: 0,
              maxLife: 0.75,
            });
          }
        }
        break;
      }

      // HERO 2 — 关羽 (Guan Yu): WIDE EMERALD CRESCENT BLADE WAVE + MERCILESS EXECUTE!
      case 'crescent_execute': {
        if (playSfx) SoundFX.attack('slash');
        const execThresh = hasSigWeapon ? 0.32 : 0.22;
        s.effects.push({
          kind: 'slash',
          x: ux,
          y: uy,
          radius: isSkill ? 1.95 : 1.5,
          color: '#10b981',
          timer: 0,
          duration: 0.28,
          angle,
        });

        const waves = isSkill ? [-0.1, 0.1] : [0];
        for (const offsetAng of waves) {
          const wAng = angle + offsetAng;
          s.projectiles.push({
            side,
            sourceUnitUid: u.uid,
            startX: ux,
            startY: uy,
            x: ux,
            y: uy,
            vx: Math.cos(wAng) * def.projectileSpeed,
            vy: Math.sin(wAng) * def.projectileSpeed,
            tx: target.x,
            ty: target.y,
            kind: 'glaive',
            color: isSkill ? '#34d399' : '#10b981',
            damage: dmg * (isSkill ? 1.35 : 1.0),
            bossBonusMult: target.hp / target.maxHp <= 0.42 ? 2.15 : 1.25,
            armorPen: isSkill ? 0.75 : 0.5,
            aoeRadius: 0,
            hitRadiusBonus: isSkill ? 0.72 : 0.48,
            pierceLeft: 8,
            pierceEscalation: 0,
            returning: false,
            hitIds: new Set(),
            slowFactor: 0,
            slowDur: 0,
            stunDur: isSkill ? 0.25 : 0,
            executeRatio: execThresh,
            burnDps: 0,
            life: 0,
            maxLife: (unitMaxRange + 0.25) / def.projectileSpeed,
          });
        }
        break;
      }

      // HERO 3 — 张飞 (Zhang Fei): 360° SEISMIC WARCRY PULSE + ARMOR SHRED & KNOCKBACK STUN!
      case 'roar_quake': {
        const rad =
          unitMaxRange * (isSkill ? (hasSigWeapon ? 1.28 : 1.15) : 1.0);
        if (playSfx) SoundFX.attack(isSkill ? 'cannon' : 'slash');
        s.effects.push({
          kind: 'ring',
          x: ux,
          y: uy,
          radius: rad,
          color: isSkill ? '#f97316' : '#c2410c',
          timer: 0,
          duration: 0.36,
        });
        if (isSkill) {
          s.effects.push({
            kind: 'ring',
            x: ux,
            y: uy,
            radius: rad * 0.7,
            color: '#facc15',
            timer: 0,
            duration: 0.28,
          });
        }
        for (const e of s.enemies) {
          if (e.side !== side || e.hp <= 0) continue;
          if (Math.hypot(e.x - ux, e.y - uy) <= rad) {
            e.armorBrokenTimer = Math.max(e.armorBrokenTimer, hasSigWeapon ? 4.5 : 1.8);
            this.damageEnemy(s, e, dmg * (isSkill ? 1.5 : 1.0), 0.45, '#f97316', u.uid);
            if (isSkill && e.hp > 0) {
              e.stunTimer = Math.max(
                e.stunTimer,
                (def.stunDuration || 1.25) + (hasSigWeapon ? 0.45 : 0)
              );
              this.knockbackEnemyAlongLane(s, e, e.isBoss ? 0.35 : 0.72);
            }
          }
        }
        break;
      }

      // HERO 4 — 诸葛亮 (Zhuge Liang): INSTANT CHAIN LIGHTNING + EIGHT-TRIGRAMS THUNDER ZONE!
      case 'chain_lightning': {
        if (playSfx) SoundFX.attack('thunder');
        const maxJumps = (isSkill ? 6 : 4) + (hasSigWeapon ? 3 : 0);
        const visited = new Set<number>();
        const pts: { x: number; y: number }[] = [{ x: ux, y: uy }];
        let cur: EnemyEntity | null = target;
        let curDmg = dmg * (isSkill ? 1.3 : 1.0);

        for (let j = 0; j < maxJumps && cur; j++) {
          visited.add(cur.id);
          pts.push({ x: cur.x, y: cur.y });
          this.damageEnemy(s, cur, curDmg, 1.0, '#eab308', u.uid);
          if (hasSigWeapon && isSkill && cur.hp > 0) {
            cur.stunTimer = Math.max(cur.stunTimer, 0.4);
          }
          curDmg *= 0.88;

          let nextEnemy: EnemyEntity | null = null;
          let bestD = 2.9;
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
          duration: 0.25,
        });

        if (isSkill) {
          s.zones.push({
            side,
            sourceUnitUid: u.uid,
            kind: 'thunder_sigil',
            x: target.x,
            y: target.y,
            radius: hasSigWeapon ? 1.7 : 1.45,
            dps: dmg * 0.58,
            slowFactor: 0,
            tickTimer: 0.15,
            timer: 0,
            duration: 2.6,
          });
        }
        break;
      }

      // HERO 5 — 甄姬 (Zhen Ji): FROST VORTEX POOL + DEEP-FREEZE BRITTLE VULNERABILITY!
      case 'frost_vortex': {
        if (playSfx) SoundFX.attack('frost');
        const p = this.spawnProj(
          s,
          side,
          u.uid,
          ux,
          uy,
          target,
          'lotus',
          '#60a5fa',
          dmg * (isSkill ? 1.4 : 1.0),
          def.projectileSpeed
        );
        p.armorPen = 0.65;
        p.aoeRadius = (def.aoeRadiusCells || 1.5) * (isSkill ? 1.2 : 1.0);
        p.slowFactor = def.slowFactor || 0.52;
        p.slowDur = def.slowDuration || 2.6;
        p.spawnZoneOnHit = 'frost_zone';
        if (isSkill) {
          p.stunDur = hasSigWeapon ? 1.55 : def.stunDuration || 1.1;
        }
        break;
      }

      // HERO 6 — 孙尚香 (Sun Shangxiang): MULTI-TARGET SPLIT VOLLEY + METEORIC FIRE RAIN!
      case 'phoenix_multishot': {
        if (playSfx) SoundFX.attack('bow');
        const maxArrows = (isSkill ? 5 : 3) + (hasSigWeapon ? 2 : 0);
        const inRangeFoes = s.enemies
          .filter(
            (e) =>
              e.side === side &&
              e.hp > 0 &&
              Math.hypot(e.x - ux, e.y - uy) <= unitMaxRange + 0.35
          )
          .sort((a, b) => b.waypointIndex + b.segProgress - (a.waypointIndex + a.segProgress));

        const pool = inRangeFoes.length > 0 ? inRangeFoes : [target];
        for (let k = 0; k < maxArrows; k++) {
          const tEnemy = pool[k % pool.length];
          const p = this.spawnProj(
            s,
            side,
            u.uid,
            ux + (Math.random() - 0.5) * 0.25,
            uy + (Math.random() - 0.5) * 0.25,
            tEnemy,
            'phoenix',
            '#ef4444',
            dmg * (isSkill ? 1.15 : 0.88),
            def.projectileSpeed
          );
          p.armorPen = 0.45;
          p.burnDps = dmg * (hasSigWeapon ? 0.42 : 0.24);
        }

        if (isSkill) {
          s.zones.push({
            side,
            sourceUnitUid: u.uid,
            kind: 'fire_patch',
            x: target.x,
            y: target.y,
            radius: hasSigWeapon ? 1.75 : 1.48,
            dps: dmg * 0.52,
            slowFactor: 0,
            tickTimer: 0.15,
            timer: 0,
            duration: 2.4,
          });
        }
        break;
      }

      // HERO 7 — 马超 (Ma Chao): XILIANG IRON-CAVALRY STAMPEDE LANCE (Line Charge + Knockback & Speed-Scaling!)
      case 'iron_stampede': {
        if (playSfx) SoundFX.attack('lance');
        const travelCells = unitMaxRange + 0.18;
        const angles = isSkill && hasSigWeapon ? [angle - 0.14, angle, angle + 0.14] : isSkill ? [angle - 0.08, angle + 0.08] : [angle];
        for (const aAng of angles) {
          s.effects.push({
            kind: 'lance_beam',
            x: ux,
            y: uy,
            endX: ux + Math.cos(aAng) * travelCells,
            endY: uy + Math.sin(aAng) * travelCells,
            radius: 0.28,
            color: isSkill ? '#c084fc' : '#8b5cf6',
            timer: 0,
            duration: 0.24,
            angle: aAng,
          });
          s.projectiles.push({
            side,
            sourceUnitUid: u.uid,
            startX: ux,
            startY: uy,
            x: ux,
            y: uy,
            vx: Math.cos(aAng) * def.projectileSpeed,
            vy: Math.sin(aAng) * def.projectileSpeed,
            tx: ux + Math.cos(aAng) * travelCells,
            ty: uy + Math.sin(aAng) * travelCells,
            kind: 'dragon',
            color: isSkill ? '#e879f9' : '#a855f7',
            damage: dmg * (isSkill ? 1.32 : 1.0),
            bossBonusMult: 1.2,
            armorPen: 0.55,
            aoeRadius: 0,
            hitRadiusBonus: isSkill ? 0.34 : 0.22,
            pierceLeft: 10,
            pierceEscalation: 0.12,
            returning: false,
            hitIds: new Set(),
            slowFactor: def.slowFactor || 0.36,
            slowDur: def.slowDuration || 1.25,
            stunDur: isSkill ? 0.3 : 0,
            executeRatio: 0,
            burnDps: 0,
            life: 0,
            maxLife: travelCells / def.projectileSpeed,
          });
        }
        // Knockback enemies directly in front on Stampede skill strike!
        if (isSkill) {
          for (const e of s.enemies) {
            if (e.side !== side || e.hp <= 0) continue;
            if (Math.hypot(e.x - target.x, e.y - target.y) <= 1.15) {
              this.knockbackEnemyAlongLane(s, e, e.isBoss ? 0.22 : hasSigWeapon ? 0.65 : 0.45);
            }
          }
        }
        break;
      }

      // HERO 8 — 黄忠 (Huang Zhong): ULTRA-LONG 4.15R SUNFALL SNIPE (Boss Hunter & Armor-Breaking Bullseye!)
      case 'sun_snipe': {
        if (playSfx) SoundFX.attack('bow');
        const mult = isSkill ? (hasSigWeapon ? 2.45 : 2.0) : 1.0;
        const p = this.spawnProj(
          s,
          side,
          u.uid,
          ux,
          uy,
          target,
          'sun_arrow',
          isSkill ? '#facc15' : '#eab308',
          dmg * mult,
          def.projectileSpeed
        );
        p.armorPen = isSkill ? 1.0 : 0.85;
        p.bossBonusMult = hasSigWeapon ? 1.7 : 1.45;
        if (isSkill) {
          p.stunDur = (def.stunDuration || 0.65) + (hasSigWeapon ? 0.35 : 0);
          p.executeRatio = hasSigWeapon ? 0.26 : 0.18;
        }
        break;
      }

      // HERO 9 — 吕布 (Lu Bu): SKY PIERCER HALBERD CLEAVE + 360° PEERLESS TRUE-DAMAGE SHOCKWAVE!
      case 'halberd_cleave': {
        if (playSfx) SoundFX.attack(isSkill ? 'cannon' : 'slash');
        if (isSkill) {
          const rad = unitMaxRange * (hasSigWeapon ? 1.25 : 1.1);
          s.effects.push({
            kind: 'ring',
            x: ux,
            y: uy,
            radius: rad,
            color: '#e11d48',
            timer: 0,
            duration: 0.38,
          });
          s.effects.push({
            kind: 'slash',
            x: ux,
            y: uy,
            radius: rad * 0.95,
            color: '#fb7185',
            timer: 0,
            duration: 0.32,
            angle,
          });
          for (const e of s.enemies) {
            if (e.side !== side || e.hp <= 0) continue;
            if (Math.hypot(e.x - ux, e.y - uy) <= rad) {
              e.armorBrokenTimer = Math.max(e.armorBrokenTimer, hasSigWeapon ? 4.2 : 2.6);
              this.damageEnemy(
                s,
                e,
                dmg * (hasSigWeapon ? 2.05 : 1.75),
                1.0,
                '#fb7185',
                u.uid
              );
            }
          }
        } else {
          const cleaveR = def.aoeRadiusCells || 1.35;
          s.effects.push({
            kind: 'slash',
            x: target.x,
            y: target.y,
            radius: cleaveR,
            color: '#e11d48',
            timer: 0,
            duration: 0.26,
            angle,
          });
          for (const e of s.enemies) {
            if (e.side !== side || e.hp <= 0) continue;
            if (Math.hypot(e.x - target.x, e.y - target.y) <= cleaveR) {
              e.armorBrokenTimer = Math.max(e.armorBrokenTimer, 1.4);
              this.damageEnemy(s, e, dmg, 0.65, '#f43f5e', u.uid);
            }
          }
        }
        break;
      }

      // HERO 10 — 周瑜 (Zhou Yu): RED CLIFFS CONFLAGRATION (Blazing Fireball + Burn Detonation & Sea of Fire!)
      case 'inferno_burn': {
        if (playSfx) SoundFX.attack('cannon');
        const p = this.spawnProj(
          s,
          side,
          u.uid,
          ux,
          uy,
          target,
          'fireball',
          '#f97316',
          dmg * (isSkill ? 1.38 : 1.0),
          def.projectileSpeed
        );
        p.armorPen = 0.6;
        p.aoeRadius = (def.aoeRadiusCells || 1.22) * (isSkill ? 1.22 : 1.0);
        p.burnDps = dmg * (hasSigWeapon ? 0.62 : 0.42);
        p.bossBonusMult = hasSigWeapon ? 1.45 : 1.2;
        if (isSkill) {
          p.spawnZoneOnHit = 'fire_patch';
        }
        break;
      }

      // HERO 11 — 貂蝉 (Diao Chan): MOONLIT LOTUS CHAKRAM (Homing Multi-Bounce + Slow & +25% Brittle Charm!)
      case 'moon_charm': {
        if (playSfx) SoundFX.attack('frost');
        const bounces = (isSkill ? 5 : 3) + (hasSigWeapon ? 2 : 0);
        const p = this.spawnProj(
          s,
          side,
          u.uid,
          ux,
          uy,
          target,
          'chakram',
          '#f472b6',
          dmg * (isSkill ? 1.28 : 1.0),
          def.projectileSpeed
        );
        p.armorPen = 0.65;
        p.pierceLeft = bounces;
        p.hitRadiusBonus = 0.16;
        p.slowFactor = (def.slowFactor || 0.38) + (hasSigWeapon ? 0.12 : 0);
        p.slowDur = def.slowDuration || 2.0;
        if (isSkill) {
          p.stunDur = hasSigWeapon ? 0.75 : 0.4;
        }
        break;
      }

      // HERO 12 — 曹操 (Cao Cao): HEGEMON'S DECREE (Imperial Crossbow Volley + Allied Attack-Speed Frenzy Aura!)
      case 'imperial_decree': {
        if (playSfx) SoundFX.attack('bow');
        const bolts = (isSkill ? 5 : 3) + (hasSigWeapon ? 2 : 0);
        const inRangeFoes = s.enemies
          .filter(
            (e) =>
              e.side === side &&
              e.hp > 0 &&
              Math.hypot(e.x - ux, e.y - uy) <= unitMaxRange + 0.35
          )
          .sort((a, b) => b.waypointIndex + b.segProgress - (a.waypointIndex + a.segProgress));
        const pool = inRangeFoes.length > 0 ? inRangeFoes : [target];

        for (let k = 0; k < bolts; k++) {
          const tEnemy = pool[k % pool.length];
          const p = this.spawnProj(
            s,
            side,
            u.uid,
            ux + (k - (bolts - 1) * 0.5) * 0.1,
            uy,
            tEnemy,
            'arrow',
            isSkill ? '#facc15' : '#818cf8',
            dmg * (isSkill ? 1.15 : 0.86),
            def.projectileSpeed
          );
          p.armorPen = 0.5;
          p.bossBonusMult = 1.25;
        }

        // Hegemon's Decree Aura: inspire nearby friendly units with +45% Attack Speed Frenzy!
        if (isSkill) {
          const auraR = hasSigWeapon ? 2.85 : def.aoeRadiusCells || 2.15;
          const rStart = side === 'ai' ? 0 : s.stage.dividerRow;
          const rEnd = side === 'ai' ? s.stage.dividerRow : s.stage.rows;
          s.effects.push({
            kind: 'heal_ring',
            x: ux,
            y: uy,
            radius: auraR,
            color: '#facc15',
            timer: 0,
            duration: 0.45,
          });
          for (let rr = rStart; rr < rEnd; rr++) {
            for (let cc = 0; cc < s.stage.cols; cc++) {
              const ally = s.board[rr][cc];
              if (!ally) continue;
              const aCtr = this.getUnitBoardCenter(ally, cc, rr);
              if (Math.hypot(aCtr.x - ux, aCtr.y - uy) <= auraR) {
                ally.frenzyTimer = Math.max(ally.frenzyTimer, hasSigWeapon ? 3.4 : 2.3);
              }
            }
          }
        }
        break;
      }
    }
  }

  private spawnProj(
    s: RunState,
    side: SideOwner,
    sourceUnitUid: number,
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
      sourceUnitUid,
      startX: ux,
      startY: uy,
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
      armorPen: 0,
      aoeRadius: 0,
      hitRadiusBonus: 0,
      pierceLeft: 1,
      pierceEscalation: 0,
      returning: false,
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

      // Parabolic Siege Mortar Shell
      if (p.kind === 'mortar') {
        const tRatio = Math.min(1, p.life / p.maxLife);
        p.x = p.startX + (p.tx - p.startX) * tRatio;
        p.y = p.startY + (p.ty - p.startY) * tRatio;
        if (tRatio >= 1) {
          s.effects.push({
            kind: 'explosion',
            x: p.tx,
            y: p.ty,
            radius: p.aoeRadius,
            color: p.color,
            timer: 0,
            duration: 0.36,
          });
          for (const e of s.enemies) {
            if (e.side !== p.side || e.hp <= 0) continue;
            if (Math.hypot(e.x - p.tx, e.y - p.ty) <= p.aoeRadius + e.radius) {
              this.damageEnemy(s, e, p.damage * (e.isBoss ? p.bossBonusMult : 1), p.armorPen, p.color, p.sourceUnitUid);
            }
          }
          if (p.spawnZoneOnHit === 'fire_patch') {
            s.zones.push({
              side: p.side,
              sourceUnitUid: p.sourceUnitUid,
              kind: 'fire_patch',
              x: p.tx,
              y: p.ty,
              radius: p.aoeRadius * 0.85,
              dps: p.burnDps || p.damage * 0.24,
              slowFactor: 0,
              tickTimer: 0.25,
              timer: 0,
              duration: 1.8,
            });
          }
          s.projectiles.splice(i, 1);
        }
        continue;
      }

      // Zhao Yun's Boomerang Silver Dragon Lance: reverses at apex & hits foes again on return!
      if (p.kind === 'boomerang_lance' && !p.returning && p.life >= p.maxLife * 0.5) {
        p.returning = true;
        p.hitIds.clear();
        const spd = Math.hypot(p.vx, p.vy);
        const backAng = Math.atan2(p.startY - p.y, p.startX - p.x);
        p.vx = Math.cos(backAng) * spd;
        p.vy = Math.sin(backAng) * spd;
      } else if (p.kind === 'boomerang_lance' && p.returning) {
        const spd = Math.hypot(p.vx, p.vy);
        const backAng = Math.atan2(p.startY - p.y, p.startX - p.x);
        p.vx = Math.cos(backAng) * spd;
        p.vy = Math.sin(backAng) * spd;
      }

      // Homing tracking for single-target arrows, Phoenix arrows, Sun Snipes, Fireballs & Bouncing Chakrams!
      if (p.targetId !== undefined && (p.pierceLeft === 1 || p.kind === 'chakram')) {
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
      const hitReach = 0.28 + p.hitRadiusBonus;

      for (const e of s.enemies) {
        if (e.side !== p.side || e.hp <= 0 || p.hitIds.has(e.id)) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) <= e.radius + hitReach) {
          const hitIndex = p.hitIds.size;
          p.hitIds.add(e.id);

          if (p.aoeRadius > 0 && p.kind === 'fireball') {
            s.effects.push({
              kind: 'explosion',
              x: e.x,
              y: e.y,
              radius: p.aoeRadius,
              color: '#f97316',
              timer: 0,
              duration: 0.36,
            });
            for (const sub of s.enemies) {
              if (sub.side === p.side && sub.hp > 0 && Math.hypot(sub.x - e.x, sub.y - e.y) <= p.aoeRadius) {
                // Zhou Yu Red Cliffs Combustion: bonus burst against ALREADY burning foes!
                if (sub.burnTimer > 0) {
                  this.damageEnemy(s, sub, p.damage * 0.45, 1.0, '#fde047', p.sourceUnitUid);
                }
                this.applyProjHit(s, p, sub, 0);
              }
            }
            if (p.spawnZoneOnHit === 'fire_patch') {
              s.zones.push({
                side: p.side,
                sourceUnitUid: p.sourceUnitUid,
                kind: 'fire_patch',
                x: e.x,
                y: e.y,
                radius: p.aoeRadius * 1.1,
                dps: p.burnDps || p.damage * 0.45,
                slowFactor: 0,
                tickTimer: 0.2,
                timer: 0,
                duration: 2.8,
              });
            }
          } else if (p.aoeRadius > 0 && p.kind === 'lotus') {
            s.effects.push({
              kind: 'ring',
              x: e.x,
              y: e.y,
              radius: p.aoeRadius,
              color: p.color,
              timer: 0,
              duration: 0.34,
            });
            for (const sub of s.enemies) {
              if (sub.side === p.side && sub.hp > 0 && Math.hypot(sub.x - e.x, sub.y - e.y) <= p.aoeRadius) {
                this.applyProjHit(s, p, sub, 0);
              }
            }
            if (p.spawnZoneOnHit === 'frost_zone') {
              s.zones.push({
                side: p.side,
                sourceUnitUid: p.sourceUnitUid,
                kind: 'frost_zone',
                x: e.x,
                y: e.y,
                radius: p.aoeRadius,
                dps: p.damage * 0.32,
                slowFactor: p.slowFactor || 0.52,
                tickTimer: 0.25,
                timer: 0,
                duration: 2.4,
              });
            }
          } else {
            this.applyProjHit(s, p, e, hitIndex);
            // Diao Chan's Moonlit Chakram: apply Brittle Charm (+25% DMG taken) & bounce to nearest unhit enemy!
            if (p.kind === 'chakram') {
              e.brittleTimer = Math.max(e.brittleTimer, 3.2);
              s.effects.push({
                kind: 'ring',
                x: e.x,
                y: e.y,
                radius: 0.55,
                color: '#f472b6',
                timer: 0,
                duration: 0.22,
              });
              if (p.pierceLeft > 1) {
                let nextTgt: EnemyEntity | null = null;
                let bestD = 2.9;
                for (const cand of s.enemies) {
                  if (cand.side !== p.side || cand.hp <= 0 || p.hitIds.has(cand.id)) continue;
                  const d = Math.hypot(cand.x - e.x, cand.y - e.y);
                  if (d < bestD) {
                    bestD = d;
                    nextTgt = cand;
                  }
                }
                if (nextTgt) {
                  p.targetId = nextTgt.id;
                  p.life = Math.max(0, p.life - 0.35);
                } else {
                  p.pierceLeft = 1;
                }
              }
            } else if (p.kind === 'sun_arrow' && p.stunDur > 0) {
              e.armorBrokenTimer = Math.max(e.armorBrokenTimer, 3.0);
              s.effects.push({
                kind: 'ring',
                x: e.x,
                y: e.y,
                radius: 0.85,
                color: '#facc15',
                timer: 0,
                duration: 0.28,
              });
            }
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

  private applyProjHit(s: RunState, p: ProjectileEntity, e: EnemyEntity, hitIndex: number): void {
    const bossScale = e.isBoss || e.isMiniBoss ? p.bossBonusMult : 1.0;
    const pierceScale = 1 + hitIndex * p.pierceEscalation;
    if (p.executeRatio > 0 && !e.isBoss && e.hp / e.maxHp <= p.executeRatio) {
      this.damageEnemy(s, e, e.hp * 2.5, 1.0, '#fde047', p.sourceUnitUid);
      if (e.side === 'player') {
        s.floatTexts.push({
          x: e.x,
          y: e.y - 0.4,
          vy: -1.2,
          text: '✦!',
          color: '#fde047',
          scale: 1.22,
          timer: 0,
          duration: 0.55,
        });
      }
    } else {
      this.damageEnemy(
        s,
        e,
        p.damage * bossScale * pierceScale,
        p.armorPen,
        p.color,
        p.sourceUnitUid
      );
    }
    if (p.slowFactor > 0) {
      e.slowPower = Math.max(e.slowPower, p.slowFactor);
      e.slowTimer = Math.max(e.slowTimer, p.slowDur);
    }
    if (p.stunDur > 0) {
      e.stunTimer = Math.max(e.stunTimer, p.stunDur);
      if (p.kind === 'lotus') {
        e.brittleTimer = Math.max(e.brittleTimer, 3.5);
      }
    }
    if (p.burnDps > 0) {
      // Sun Shangxiang's Phoenix arrows stack Scorch DoT!
      e.burnDps = Math.min(p.burnDps * 4.5, e.burnDps + p.burnDps * 0.75);
      e.burnTimer = 2.6;
    }
  }

  private updateGroundZones(s: RunState, dt: number): void {
    for (let i = s.zones.length - 1; i >= 0; i--) {
      const z = s.zones[i];
      z.timer += dt;
      if (z.timer >= z.duration) {
        s.zones.splice(i, 1);
        continue;
      }

      // Continuous slow inside Zhen Ji's Frost Vortex
      if (z.slowFactor > 0) {
        for (const e of s.enemies) {
          if (e.side === z.side && e.hp > 0 && Math.hypot(e.x - z.x, e.y - z.y) <= z.radius) {
            e.slowPower = Math.max(e.slowPower, z.slowFactor);
            e.slowTimer = Math.max(e.slowTimer, 0.35);
          }
        }
      }

      z.tickTimer -= dt;
      if (z.tickTimer <= 0) {
        z.tickTimer = 0.45;
        const color =
          z.kind === 'thunder_sigil' ? '#facc15' : z.kind === 'frost_zone' ? '#60a5fa' : '#fb923c';
        const pen = z.kind === 'thunder_sigil' ? 1.0 : 0.65;
        for (const e of s.enemies) {
          if (e.side === z.side && e.hp > 0 && Math.hypot(e.x - z.x, e.y - z.y) <= z.radius) {
            this.damageEnemy(s, e, z.dps * 0.45, pen, color, z.sourceUnitUid);
          }
        }
      }
    }
  }

  private damageEnemy(
    s: RunState,
    e: EnemyEntity,
    rawDmg: number,
    armorPiercing: boolean | number,
    floatColor: string,
    attackerUid?: number
  ): void {
    if (e.hp <= 0) return;

    const meta = SaveManager.getEffectiveBonuses();
    let scaled = rawDmg;
    if (e.side === 'player' && (e.isBoss || e.isMiniBoss)) {
      scaled *= meta.bossDmgMult;
    }
    if (e.brittleTimer > 0) {
      scaled *= 1.25;
    }

    const penRatio =
      typeof armorPiercing === 'number' ? armorPiercing : armorPiercing ? 0.75 : 0;
    const baseArmor = e.armorBrokenTimer > 0 ? 0 : e.armor;
    const effArmor = baseArmor * Math.max(0, 1 - penRatio);
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
      // Attribute Kill XP to the Awakened 2-Cell General who landed the killing blow!
      if (attackerUid !== undefined) {
        const killer = this.findBoardUnitByUid(s, attackerUid);
        if (killer) {
          const killXp = e.isBoss ? 105 : e.isMiniBoss ? 50 : e.kind === 'shield' ? 16 : 11;
          const ctr = this.getUnitBoardCenter(killer.unit, killer.col, killer.row);
          this.grantHeroCombatXp(s, killer.side, killer.unit, ctr.x, ctr.y, killXp);
        }
      }

      if (e.side === 'player') {
        s.kills += 1;
        s.passiveRationAcc += e.rewardRations;
        if (s.passiveRationAcc >= 1) {
          const whole = Math.floor(s.passiveRationAcc);
          s.rations += whole;
          s.passiveRationAcc -= whole;
        }
        s.ultCharge = Math.min(100, s.ultCharge + (e.isBoss ? 24 : e.isMiniBoss ? 12 : 0.75));
        SoundFX.enemyKill();

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
      if (e.brittleTimer > 0) e.brittleTimer = Math.max(0, e.brittleTimer - dt);
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

      let lubuChargeMult = 1.0;
      if (e.bossType === 'zhangbao' && e.stunTimer <= 0) {
        e.bossSkillTimer -= dt;
        if (e.bossSkillTimer <= 0) {
          e.bossSkillTimer = 4.4;
          this.summonZhangBaoMinion(s, e);
          if (e.side === 'player') {
            this.showBanner(t().bannerZhangBaoSummon, 1.8);
          }
        }
      } else if (e.bossType === 'zhangjiao') {
        if (!e.healChantUsed && e.hp / e.maxHp <= 0.55) {
          e.healChantUsed = true;
          e.regenTimer = 4.2;
          if (e.side === 'player') {
            SoundFX.alarm();
            this.showBanner(t().bannerZhangJiaoHeal, 2.8);
          }
        }
        if (e.regenTimer > 0 && e.stunTimer <= 0) {
          e.regenTimer = Math.max(0, e.regenTimer - dt);
          e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.095 * dt);
        }
      } else if (e.bossType === 'lubu' && e.stunTimer <= 0) {
        e.bossSkillTimer -= dt;
        if (e.bossSkillTimer <= 0) {
          e.bossSkillTimer = 5.4;
          // Lu Bu Peerless Halberd Shockwave: temporarily suppresses nearby frontline units!
          const rStart = e.side === 'ai' ? 0 : s.stage.dividerRow;
          const rEnd = e.side === 'ai' ? s.stage.dividerRow : s.stage.rows;
          const shockedUids = new Set<number>();
          for (let r = rStart; r < rEnd; r++) {
            for (let c = 0; c < s.stage.cols; c++) {
              const u = s.board[r][c];
              if (!u || shockedUids.has(u.uid)) continue;
              const ctr = this.getUnitBoardCenter(u, c, r);
              if (Math.hypot(ctr.x - e.x, ctr.y - e.y) <= 1.85) {
                shockedUids.add(u.uid);
                u.cooldown += 1.05;
              }
            }
          }
          s.effects.push({
            kind: 'ring',
            x: e.x,
            y: e.y,
            radius: 1.85,
            color: '#dc2626',
            timer: 0,
            duration: 0.4,
          });
        }
        if (e.bossSkillTimer < 1.5) {
          lubuChargeMult = 1.75;
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
            e.bashTimer = 0.6;
            const bashDmg =
              e.bossType === 'lubu' ? 120 : e.isBoss ? 84 : e.isMiniBoss ? 48 : e.kind === 'shield' ? 30 : 18;
            barricade.hp = Math.max(0, barricade.hp - bashDmg);
            barricade.shakeTimer = 0.16;
          }
          continue;
        }
      }

      const passiveSlow = e.side === 'player' ? playerRoadSlow : 0;
      const totalSlow = Math.min(0.72, Math.max(e.slowPower, passiveSlow));
      const effSpeed = e.speed * lubuChargeMult * (1 - totalSlow);
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

  private knockbackEnemyAlongLane(s: RunState, e: EnemyEntity, distCells: number): void {
    const lane = e.side === 'ai' ? s.stage.aiLane : s.stage.playerLane;
    const wps = lane.waypoints;
    let remaining = distCells;

    while (remaining > 0 && e.waypointIndex >= 0) {
      const nextIdx = Math.min(wps.length - 1, e.waypointIndex + 1);
      const a = wps[e.waypointIndex];
      const b = wps[nextIdx];
      const segLen = Math.max(0.01, Math.hypot(b.col - a.col, b.row - a.row));
      const curDistInSeg = e.segProgress * segLen;

      if (curDistInSeg >= remaining) {
        e.segProgress = (curDistInSeg - remaining) / segLen;
        remaining = 0;
      } else {
        remaining -= curDistInSeg;
        if (e.waypointIndex === 0) {
          e.segProgress = 0;
          break;
        }
        e.waypointIndex -= 1;
        e.segProgress = 1;
      }
    }

    const curA = wps[e.waypointIndex];
    const curB = wps[Math.min(wps.length - 1, e.waypointIndex + 1)];
    e.x = curA.col + 0.5 + (curB.col - curA.col) * e.segProgress;
    e.y = curA.row + 0.5 + (curB.row - curA.row) * e.segProgress;
  }

  private summonZhangBaoMinion(s: RunState, boss: EnemyEntity): void {
    const minionHp = boss.maxHp * 0.13;
    const offsets = [0.06, 0.15];
    for (const off of offsets) {
      s.enemies.push({
        id: this.nextEnemyId++,
        side: boss.side,
        kind: 'wolf',
        bossType: 'none',
        isBoss: false,
        isMiniBoss: false,
        waypointIndex: boss.waypointIndex,
        segProgress: Math.min(0.95, boss.segProgress + off),
        x: boss.x,
        y: boss.y,
        hp: minionHp,
        maxHp: minionHp,
        speed: 1.5,
        armor: 0,
        armorBrokenTimer: 0,
        brittleTimer: 0,
        rewardRations: 0,
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
    }
    s.effects.push({
      kind: 'ring',
      x: boss.x,
      y: boss.y,
      radius: 0.9,
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
        s.zones = s.zones.filter((z) => z.side !== 'ai');
        // Rival AI collapse grants a modest +8 bun trophy, NOT an instant clear or huge windfall!
        s.rations += 8;
        SoundFX.fanfare();
        this.showBanner(t().bannerRivalFallen, 3.0);
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
        if (u && getUnitCircleRange(u).canAttack) {
          const center = this.getUnitBoardCenter(u, cellHit.col, cellHit.row);
          this.applyDivineTalismanToUnit(u, center.x, center.y);
          return;
        }
      }
      if (benchIdx >= 0 && s.bench[benchIdx] && getUnitCircleRange(s.bench[benchIdx]!).canAttack) {
        this.applyDivineTalismanToUnit(s.bench[benchIdx]!, 3.5, 7.5);
        return;
      }
      s.talismanMode = false;
      return;
    }

    // 1a) Selected Bench Shovel + Tap Locked Stone Cell -> Excavate & Consume Bench Shovel!
    if (
      cellHit &&
      cellHit.row >= s.stage.dividerRow &&
      s.cells[cellHit.row][cellHit.col] === 'locked' &&
      s.selectedSource?.type === 'bench' &&
      s.bench[s.selectedSource.benchIdx]?.unitId === 'shovel'
    ) {
      s.bench[s.selectedSource.benchIdx] = null;
      s.selectedSource = null;
      s.selectedUnitInfo = null;
      this.excavateLockedCell(cellHit.col, cellHit.row);
      return;
    }

    // 1b) Ad-Shovel Dig Mode (s.shovelMode)
    if (s.shovelMode && cellHit) {
      if (
        cellHit.row >= s.stage.dividerRow &&
        s.cells[cellHit.row][cellHit.col] === 'locked' &&
        s.shovels > 0
      ) {
        s.shovels -= 1;
        if (s.shovels <= 0) s.shovelMode = false;
        this.excavateLockedCell(cellHit.col, cellHit.row);
      } else {
        s.shovelMode = false;
      }
      return;
    }

    // 2) Read-only inspect AI Top Half unit (records boardCol/boardRow so its range ring previews!)
    if (cellHit && cellHit.row < s.stage.dividerRow) {
      const aiUnit = s.board[cellHit.row][cellHit.col];
      this.setSelectedInfoFromUnit(aiUnit, cellHit.col, cellHit.row);
      s.selectedSource = null;
      return;
    }

    // 3) Player Bench Tile
    if (benchIdx >= 0) {
      const unit = s.bench[benchIdx];
      if (unit) {
        // Safety valve: if all locked stone cells are already dug, tapping a leftover bench shovel converts it into +18 Buns!
        if (unit.unitId === 'shovel' && this.getSideCells('player', 'locked').length === 0) {
          s.bench[benchIdx] = null;
          s.rations += 18;
          SoundFX.fanfare();
          this.showBanner(t().bannerShovelRefund(18), 2.0);
          return;
        }

        this.setSelectedInfoFromUnit(unit);
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

    // 4) Player Bottom Half Board Cell
    if (cellHit && cellHit.row >= s.stage.dividerRow) {
      const unit = s.board[cellHit.row][cellHit.col];
      if (unit) {
        this.setSelectedInfoFromUnit(unit);
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
        // Never pop up the Shovel Ad when casually tapping empty/sealed stone cells on the board!
        if (s.selectedSource) {
          const selUnit = this.getUnitAt(s.selectedSource);
          if (selUnit && selUnit.unitId !== 'shovel') {
            this.showBanner(t().bannerLockedStoneHint, 1.9);
          }
        }
        s.selectedSource = null;
        s.selectedUnitInfo = null;
        return;
      } else if (s.selectedSource && s.cells[cellHit.row][cellHit.col] === 'deploy') {
        const selUnit = this.getUnitAt(s.selectedSource);
        if (selUnit && selUnit.unitId !== 'shovel') {
          this.tryMoveOrCombine(s.selectedSource, {
            type: 'board',
            benchIdx: -1,
            col: cellHit.col,
            row: cellHit.row,
          });
        }
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
      if (d.unit.unitId === 'shovel') {
        s.selectedSource = src;
        this.showBanner(t().bannerBenchShovelPick, 2.2);
        return;
      }

      if (s.selectedSource) {
        if (
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
      }
      s.selectedSource = src;
      return;
    }

    // Dragging a Bench Shovel directly onto a dark locked stone cell -> Excavate!!
    const boardHit = this.hitTestBoard(d.screenX, d.screenY);
    if (d.unit.unitId === 'shovel' && d.sourceType === 'bench') {
      if (
        boardHit &&
        boardHit.row >= s.stage.dividerRow &&
        s.cells[boardHit.row][boardHit.col] === 'locked'
      ) {
        s.bench[d.benchIdx] = null;
        s.selectedSource = null;
        s.selectedUnitInfo = null;
        this.excavateLockedCell(boardHit.col, boardHit.row);
        return;
      }
      const benchHit = this.hitTestBench(d.screenX, d.screenY);
      if (benchHit >= 0 && benchHit !== d.benchIdx) {
        const other = s.bench[benchHit];
        s.bench[benchHit] = d.unit;
        s.bench[d.benchIdx] = other;
        SoundFX.tileClack(false);
      }
      return;
    }

    const benchHit = this.hitTestBench(d.screenX, d.screenY);
    if (benchHit >= 0) {
      this.tryMoveOrCombine(src, { type: 'bench', benchIdx: benchHit, col: -1, row: -1 });
      s.selectedSource = null;
      return;
    }

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
    } else if (
      boardHit &&
      boardHit.row >= s.stage.dividerRow &&
      s.cells[boardHit.row][boardHit.col] === 'locked'
    ) {
      this.showBanner(t().bannerLockedStoneHint, 1.9);
      s.selectedSource = null;
    }
  }

  private getUnitAt(loc: SelectedSource): TileUnit | null {
    const s = this.state;
    if (!s) return null;
    return loc.type === 'bench' ? s.bench[loc.benchIdx] : s.board[loc.row]?.[loc.col] ?? null;
  }

  private clearSourceUnit(s: RunState, loc: SelectedSource, u: TileUnit): void {
    if (loc.type === 'bench') {
      if (s.bench[loc.benchIdx]?.uid === u.uid) {
        s.bench[loc.benchIdx] = null;
      }
    } else {
      this.removeBoardUnit(s, u);
    }
  }

  private placeSingleUnitAt(s: RunState, loc: SelectedSource, u: TileUnit): void {
    if (loc.type === 'bench') {
      u.anchorCol = -1;
      u.anchorRow = -1;
      u.secCol = -1;
      u.secRow = -1;
      s.bench[loc.benchIdx] = u;
    } else {
      this.placeBoardUnit(s, u, loc.col, loc.row);
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

    // Never allow placing a Shovel tool onto a deploy pedestal!
    if (srcUnit.unitId === 'shovel' && dst.type === 'board') {
      return false;
    }

    const dstUnit = this.getUnitAt(dst);
    if (dstUnit?.unitId === 'shovel' && src.type === 'board') {
      return false;
    }

    // Dragging from one cell of a horizontal 2x1 General onto its own second cell -> slide 1 cell horizontally!
    if (dstUnit && dstUnit.uid === srcUnit.uid) {
      if (srcUnit.cellSpan === 2 && src.type === 'board' && dst.type === 'board' && src.row === dst.row) {
        const dc = dst.col - src.col;
        const nc = dst.col + dc;
        const nr = dst.row;
        if (
          nc >= 0 &&
          nc < s.stage.cols &&
          nr >= s.stage.dividerRow &&
          nr < s.stage.rows &&
          s.cells[nr][nc] === 'deploy'
        ) {
          const stepOcc = s.board[nr][nc];
          if (!stepOcc || stepOcc.cellSpan === 1) {
            this.removeBoardUnit(s, srcUnit);
            if (stepOcc) {
              this.removeBoardUnit(s, stepOcc);
              this.placeBoardUnit(s, stepOcc, src.col, src.row);
            }
            this.placeBoardUnit(s, srcUnit, dst.col, dst.row, nc, nr);
            srcUnit.mergeAnimTimer = 0.15;
            SoundFX.tileClack(true);
            this.recalcSynergies();
            return true;
          }
        }
      }
      return false;
    }

    // 1) Combine Check (Post-Synthesis Hero Shard Upgrade, Unique 2-Piece Hero Awakening, OR Identical Troop Merge)
    const combo = dstUnit ? checkTileCombine(srcUnit, dstUnit) : null;
    if (combo && dstUnit) {
      if (combo.mode === 'upgrade_hero') {
        // Post-Synthesis Shard Upgrade: consume the new shard and upgrade the existing unique 2-cell General in place!
        const srcIsHero = UNITS[srcUnit.unitId].category === 'awakened';
        const heroTile = srcIsHero ? srcUnit : dstUnit;
        const shardTile = srcIsHero ? dstUnit : srcUnit;
        const shardLoc = srcIsHero ? dst : src;

        this.clearSourceUnit(s, shardLoc, shardTile);

        if (heroTile.tier < MAX_TILE_TIER) {
          heroTile.tier += 1;
        }
        if (heroTile.combatLevel < MAX_HERO_COMBAT_LEVEL) {
          heroTile.combatLevel += 1;
          heroTile.maxXp = getHeroXpForNextLevel(heroTile.combatLevel);
        }
        heroTile.levelUpAnimTimer = 0.9;
        heroTile.mergeAnimTimer = 0.26;

        s.merges += 1;
        s.ultCharge = Math.min(100, s.ultCharge + 10);
        s.screenShake = 0.22;
        SoundFX.merge(heroTile.tier, true);
        this.setSelectedInfoFromUnit(heroTile);
        const heroTxt = getUnitDisplayText(heroTile.unitId);
        this.showBanner(
          t().bannerHeroShardUpgraded(heroTxt.name, heroTile.combatLevel, heroTile.tier),
          2.6
        );
        const center = this.getUnitBoardCenter(heroTile, heroTile.anchorCol, heroTile.anchorRow);
        this.spawnCombineFX(center.x, center.y, 'awaken', heroTile.unitId);
        this.recalcSynergies();
        return true;
      }

      if (combo.mode === 'awaken') {
        // Enforce strictly ONE instance per General! If already synthesized on board, instruct player to drag shards onto that General!
        const hKey = UNITS[srcUnit.unitId].heroKey;
        const existingHero = hKey ? this.findAwakenedHeroOnSide(s, 'player', hKey) : null;
        if (existingHero) {
          const heroTxt = getUnitDisplayText(existingHero.unitId);
          this.setSelectedInfoFromUnit(existingHero);
          this.showBanner(t().bannerHeroAlreadyActive(heroTxt.name), 2.8);
          SoundFX.tileClack(false);
          return false;
        }

        // Awakening fuses two 1x1 puzzle halves into a UNIQUE 2-CELL Awakened General!
        if (dst.type === 'bench') {
          const pair = this.findEmptyAdjacentDeployPair(s, 'player');
          if (!pair) {
            this.showBanner(t().bannerNeedTwoCellsForHero, 2.5);
            return false;
          }
          this.clearSourceUnit(s, src, srcUnit);
          this.clearSourceUnit(s, dst, dstUnit);

          const created = this.makeTile(combo.resultId, combo.resultTier, 1);
          this.placeBoardUnit(s, created, pair.c1, pair.r1, pair.c2, pair.r2);

          s.merges += 1;
          s.ultCharge = Math.min(100, s.ultCharge + 22);
          s.screenShake = 0.35;
          SoundFX.dragonUlt();
          this.setSelectedInfoFromUnit(created);
          const heroTxt = getUnitDisplayText(combo.resultId);
          this.showBanner(t().bannerHeroAwakened(heroTxt.name), 2.6);
          const center = this.getUnitBoardCenter(created, pair.c1, pair.r1);
          this.spawnCombineFX(center.x, center.y, 'awaken', combo.resultId);
          this.recalcSynergies();
          return true;
        }

        // dst is on board! Synthesized Generals are STRICTLY HORIZONTAL (`2x1` same row)!
        const srcWasHorizAdjBoard =
          src.type === 'board' &&
          src.row === dst.row &&
          Math.abs(src.col - dst.col) === 1 &&
          s.cells[src.row][src.col] === 'deploy';

        this.clearSourceUnit(s, src, srcUnit);
        this.removeBoardUnit(s, dstUnit);

        let anchorCol = dst.col;
        let anchorRow = dst.row;
        let partner = srcWasHorizAdjBoard
          ? { col: src.col, row: src.row }
          : this.findHorizontalDeployPartner(s, 'player', dst.col, dst.row, true);

        // Fallback if dst sits on a single isolated cell: try horizontal pair at src (if on board) or any empty horizontal deploy pair!
        if (!partner && src.type === 'board' && s.cells[src.row][src.col] === 'deploy') {
          const srcPartner = this.findHorizontalDeployPartner(s, 'player', src.col, src.row, true);
          if (srcPartner) {
            anchorCol = src.col;
            anchorRow = src.row;
            partner = srcPartner;
          }
        }
        if (!partner) {
          const freePair = this.findEmptyAdjacentDeployPair(s, 'player');
          if (freePair) {
            anchorCol = freePair.c1;
            anchorRow = freePair.r1;
            partner = { col: freePair.c2, row: freePair.r2 };
          }
        }

        if (!partner) {
          // Rollback cleanly if no horizontal 2x1 deploy space is available!
          this.placeBoardUnit(s, dstUnit, dst.col, dst.row);
          this.placeSingleUnitAt(s, src, srcUnit);
          this.showBanner(t().bannerNeedTwoCellsForHero, 2.5);
          return false;
        }

        const displacedList: TileUnit[] = [];
        const occAnchor = s.board[anchorRow][anchorCol];
        if (occAnchor) {
          this.removeBoardUnit(s, occAnchor);
          displacedList.push(occAnchor);
        }
        const occPartner = s.board[partner.row][partner.col];
        if (occPartner) {
          this.removeBoardUnit(s, occPartner);
          displacedList.push(occPartner);
        }

        const created = this.makeTile(combo.resultId, combo.resultTier, 1);
        this.placeBoardUnit(s, created, anchorCol, anchorRow, partner.col, partner.row);

        // Relocate any displaced 1x1 unit into freed source/dst slot!
        for (const disp of displacedList) {
          if (dst.type === 'board' && s.board[dst.row][dst.col] === null) {
            this.placeBoardUnit(s, disp, dst.col, dst.row);
          } else {
            this.placeSingleUnitAt(s, src, disp);
          }
        }

        s.merges += 1;
        s.ultCharge = Math.min(100, s.ultCharge + 22);
        s.screenShake = 0.35;
        SoundFX.dragonUlt();
        this.setSelectedInfoFromUnit(created);
        const heroTxt = getUnitDisplayText(combo.resultId);
        this.showBanner(t().bannerHeroAwakened(heroTxt.name), 2.6);
        const center = this.getUnitBoardCenter(created, anchorCol, anchorRow);
        this.spawnCombineFX(center.x, center.y, 'awaken', combo.resultId);
        this.recalcSynergies();
        return true;
      }

      // combo.mode === 'merge' (Standard 1x1 troop merge; unfused shards do nothing before synthesis)
      this.clearSourceUnit(s, src, srcUnit);
      this.clearSourceUnit(s, dst, dstUnit);
      const created = this.makeTile(combo.resultId, combo.resultTier, 1);
      this.placeSingleUnitAt(s, dst, created);

      s.merges += 1;
      s.ultCharge = Math.min(100, s.ultCharge + 6);
      SoundFX.merge(combo.resultTier, false);
      this.setSelectedInfoFromUnit(created);
      if (dst.type === 'board') {
        this.spawnCombineFX(dst.col + 0.5, dst.row + 0.5, 'merge', combo.resultId);
      }
      this.recalcSynergies();
      return true;
    }

    // 2) Move / Swap a Horizontal 2x1 Awakened General
    if (srcUnit.cellSpan === 2) {
      if (dst.type === 'bench') {
        this.showBanner(t().bannerHeroCannotBench, 2.2);
        return false;
      }

      const oldCells = [
        { col: srcUnit.anchorCol, row: srcUnit.anchorRow },
        { col: srcUnit.secCol, row: srcUnit.secRow },
      ];

      if (dstUnit && dstUnit.cellSpan === 2) {
        const dstCells = [
          { col: dstUnit.anchorCol, row: dstUnit.anchorRow },
          { col: dstUnit.secCol, row: dstUnit.secRow },
        ];
        this.removeBoardUnit(s, srcUnit);
        this.removeBoardUnit(s, dstUnit);
        this.placeBoardUnit(s, srcUnit, dstCells[0].col, dstCells[0].row, dstCells[1].col, dstCells[1].row);
        this.placeBoardUnit(s, dstUnit, oldCells[0].col, oldCells[0].row, oldCells[1].col, oldCells[1].row);
        srcUnit.mergeAnimTimer = 0.16;
        dstUnit.mergeAnimTimer = 0.16;
        SoundFX.tileClack(true);
        this.recalcSynergies();
        return true;
      }

      this.removeBoardUnit(s, srcUnit);
      const partner = this.findHorizontalDeployPartner(s, 'player', dst.col, dst.row, true);
      if (!partner) {
        this.placeBoardUnit(s, srcUnit, oldCells[0].col, oldCells[0].row, oldCells[1].col, oldCells[1].row);
        this.showBanner(t().bannerNeedTwoCellsForHero, 2.2);
        return false;
      }

      const displaced: TileUnit[] = [];
      const occ1 = s.board[dst.row][dst.col];
      if (occ1) {
        this.removeBoardUnit(s, occ1);
        displaced.push(occ1);
      }
      const occ2 = s.board[partner.row][partner.col];
      if (occ2) {
        this.removeBoardUnit(s, occ2);
        displaced.push(occ2);
      }

      this.placeBoardUnit(s, srcUnit, dst.col, dst.row, partner.col, partner.row);
      const freeOld = oldCells.filter((pt) => s.board[pt.row][pt.col] === null);
      for (let i = 0; i < displaced.length && i < freeOld.length; i++) {
        this.placeBoardUnit(s, displaced[i], freeOld[i].col, freeOld[i].row);
      }

      srcUnit.mergeAnimTimer = 0.16;
      SoundFX.tileClack(true);
      this.recalcSynergies();
      return true;
    }

    // 3) Move / Swap a 1x1 Unit (Troop or Puzzle Shard)
    if (!dstUnit) {
      this.clearSourceUnit(s, src, srcUnit);
      this.placeSingleUnitAt(s, dst, srcUnit);
      srcUnit.mergeAnimTimer = 0.16;
      SoundFX.tileClack(true);
      if (dst.type === 'board' && !getUnitCircleRange(srcUnit).canAttack) {
        const sDef = UNITS[srcUnit.unitId];
        const existingHero = sDef.heroKey
          ? this.findAwakenedHeroOnSide(s, 'player', sDef.heroKey)
          : null;
        if (existingHero) {
          this.showBanner(
            t().bannerHeroAlreadyActive(getUnitDisplayText(existingHero.unitId).name),
            2.4
          );
        } else {
          this.showBanner(t().bannerShardCannotAttack, 2.2);
        }
      }
      this.recalcSynergies();
      return true;
    }

    if (dstUnit.cellSpan === 2) {
      const sDef = UNITS[srcUnit.unitId];
      if (
        (sDef.category === 'shard1' || sDef.category === 'shard2') &&
        sDef.heroKey === UNITS[dstUnit.unitId].heroKey
      ) {
        this.showBanner(t().bannerMaxLevel, 1.8);
        return false;
      }
      if (src.type === 'bench') {
        this.showBanner(t().bannerHeroCannotBench, 2.2);
        return false;
      }
      return this.tryMoveOrCombine(dst, src);
    }

    // Both srcUnit and dstUnit are 1x1 units -> clean swap!
    this.clearSourceUnit(s, src, srcUnit);
    this.clearSourceUnit(s, dst, dstUnit);
    this.placeSingleUnitAt(s, dst, srcUnit);
    this.placeSingleUnitAt(s, src, dstUnit);
    SoundFX.tileClack(false);
    this.recalcSynergies();
    return true;
  }
}
