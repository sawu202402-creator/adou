import {
  checkTileCombine,
  doesCircleReachLane,
  getUnitCircleRange,
  isRoadCellInCircleRange,
  MAX_HERO_COMBAT_LEVEL,
  pointToSegmentDist,
  RANGE_HIT_PAD,
  UNITS,
} from '../data/units';
import { t } from '../i18n/locale';
import { SaveManager } from '../meta/SaveManager';
import { CellType, DuelLane, HeroKey, TileUnit } from '../types';
import { Assets } from './AssetLoader';
import {
  GameEngine,
  GroundZone,
  LaneBarricade,
  ProjectileEntity,
  RunState,
  VisualEffect,
} from './GameEngine';

export class BoardRenderer {
  private animClock = 0;

  public render(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    viewW: number,
    viewH: number,
    dt: number
  ): void {
    this.animClock += dt;
    const s = engine.state;
    if (!s) return;

    const L = engine.layout;
    const readyPuzzles = engine.getReadyPuzzleHeroKeys();
    const upgradeableHeroes = engine.getUpgradeableAwakenedHeroKeys();

    ctx.save();

    if (s.screenShake > 0) {
      const mag = s.screenShake * 7;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    // 1. Qinglu Shanshui & Xuan-paper backdrop
    this.drawBackdrop(ctx, s, viewW, viewH);

    // 2. 8x10 Fortress Duel Board + Persistent Ground Zones
    this.drawBoardFrameAndCells(ctx, engine, s);
    this.drawGroundZones(ctx, engine, s.zones);

    // 3. Entry arrows & VIP Royal Heirs + Heart clusters
    this.drawLaneSpawnArrow(ctx, engine, s.stage.aiLane, '#b91c1c');
    this.drawLaneSpawnArrow(ctx, engine, s.stage.playerLane, '#b91c1c');
    this.drawVipHeirAndHearts(ctx, engine, s, 'ai');
    this.drawVipHeirAndHearts(ctx, engine, s, 'player');

    // 4. Spike Barricades
    this.drawBarricade(ctx, engine, s.aiBarricade);
    this.drawBarricade(ctx, engine, s.playerBarricade);

    // 5. Deployed Board War-Tiles (1x1 Troops/Shards & 2-Cell Awakened Generals!)
    const activeUnit = this.getActiveHeldUnit(engine, s);
    for (let r = 0; r < s.stage.rows; r++) {
      for (let c = 0; c < s.stage.cols; c++) {
        const u = s.board[r][c];
        if (!u || !engine.isPrimaryBoardCell(u, c, r)) continue;
        if (
          engine.drag?.active &&
          engine.drag.movedEnough &&
          engine.drag.sourceType === 'board' &&
          engine.drag.unit.uid === u.uid
        ) {
          continue;
        }

        const x = L.boardX + c * L.cellSize;
        const y = L.boardY + r * L.cellSize;
        const isPlayerSide = r >= s.stage.dividerRow;

        const isSelectedOnBoard =
          s.selectedSource?.type === 'board' &&
          ((s.selectedSource.col === c && s.selectedSource.row === r) ||
            (u.cellSpan === 2 &&
              s.selectedSource.col === u.secCol &&
              s.selectedSource.row === u.secRow));

        let highlight: 'none' | 'merge' | 'awaken' | 'selected' | 'talisman' = 'none';
        if (isPlayerSide && s.talismanMode && getUnitCircleRange(u).canAttack) {
          highlight = 'talisman';
        } else if (isSelectedOnBoard) {
          highlight = 'selected';
        } else if (isPlayerSide && activeUnit && activeUnit.uid !== u.uid) {
          const combo = checkTileCombine(activeUnit, u);
          if (combo) {
            if (combo.mode === 'upgrade_hero') {
              highlight = 'awaken';
            } else if (combo.mode === 'awaken') {
              const hk = UNITS[u.unitId].heroKey;
              highlight = hk && engine.findAwakenedHeroOnSide(s, 'player', hk) ? 'none' : 'awaken';
            } else {
              highlight = 'merge';
            }
          }
        } else if (isPlayerSide) {
          const def = UNITS[u.unitId];
          if ((def.category === 'shard1' || def.category === 'shard2') && def.heroKey) {
            if (readyPuzzles.has(def.heroKey)) {
              highlight = 'awaken';
            } else if (upgradeableHeroes.has(def.heroKey)) {
              highlight = 'merge';
            }
          }
        }

        if (u.cellSpan === 2 && u.secCol >= 0 && u.secRow >= 0) {
          const spanW = (u.secCol - u.anchorCol + 1) * L.cellSize - 4;
          const spanH = (u.secRow - u.anchorRow + 1) * L.cellSize - 4;
          this.drawDoubleWarTile(
            ctx,
            u,
            x + 2,
            y + 2,
            spanW,
            spanH,
            L.cellSize,
            highlight,
            !isPlayerSide && s.aiCollapsed,
            isPlayerSide
          );
        } else {
          this.drawWarTile(
            ctx,
            u,
            x + 2,
            y + 2,
            L.cellSize - 4,
            highlight,
            !isPlayerSide && s.aiCollapsed,
            isPlayerSide
          );
        }
      }
    }

    if (s.aiCollapsed) {
      ctx.fillStyle = 'rgba(20, 18, 16, 0.42)';
      ctx.fillRect(L.boardX, L.boardY, L.boardW, s.stage.dividerRow * L.cellSize);
    }

    // 6. Central Great Wall Divider
    this.drawGreatWallDivider(ctx, engine, s);

    // 7. Circular Attack Range Ring & 2-Cell Footprint Preview (drawn crisply above board & units!)
    this.drawActiveCircleRangePreview(ctx, engine, s);

    // 8. Enemies, Projectiles, VFX & Floating Damage
    this.drawEnemies(ctx, engine, s);
    this.drawProjectiles(ctx, engine, s.projectiles);
    this.drawEffects(ctx, engine, s.effects);
    this.drawFloatingTexts(ctx, engine, s);

    // 9. Player War-Camp Tent & 5-Slot Bench Row
    this.drawCampBench(ctx, engine, s, activeUnit, readyPuzzles, upgradeableHeroes);

    // 9B. Combine / Synthesis Guide Curves to Matching Partners!
    if (activeUnit) {
      this.drawCombineGuideLinks(ctx, engine, s, activeUnit);
    }

    // 10. Floating Dragged Tile (1x1 or 2-Cell Double Plaque!)
    if (engine.drag && engine.drag.active && engine.drag.movedEnough) {
      const du = engine.drag.unit;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.48)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;
      if (du.cellSpan === 2) {
        const w = 2 * L.cellSize * 1.02 - 4;
        const h = L.cellSize * 1.02 - 4;
        this.drawDoubleWarTile(
          ctx,
          du,
          engine.drag.screenX - w * 0.5,
          engine.drag.screenY - h * 0.55,
          w,
          h,
          L.cellSize * 1.02,
          'selected',
          false,
          true
        );
      } else {
        const sz = L.cellSize * 1.06;
        this.drawWarTile(
          ctx,
          du,
          engine.drag.screenX - sz * 0.5,
          engine.drag.screenY - sz * 0.55,
          sz,
          'selected',
          false,
          true
        );
      }
      ctx.restore();
    }

    ctx.restore();
  }

  private getActiveHeldUnit(engine: GameEngine, s: RunState): TileUnit | null {
    if (engine.drag?.active) return engine.drag.unit;
    if (s.selectedSource) {
      if (s.selectedSource.type === 'bench') {
        return s.bench[s.selectedSource.benchIdx];
      }
      return s.board[s.selectedSource.row]?.[s.selectedSource.col] ?? null;
    }
    return null;
  }

  // ==================== 1. GUOFENG BACKDROP ====================

  private drawBackdrop(
    ctx: CanvasRenderingContext2D,
    s: RunState,
    viewW: number,
    viewH: number
  ): void {
    const grad = ctx.createLinearGradient(0, 0, 0, viewH);
    if (s.stage.theme === 'river') {
      grad.addColorStop(0, '#8ba399');
      grad.addColorStop(0.5, '#9cb0a5');
      grad.addColorStop(1, '#7c9086');
    } else if (s.stage.theme === 'fleet') {
      grad.addColorStop(0, '#7c766d');
      grad.addColorStop(0.5, '#8f877b');
      grad.addColorStop(1, '#6d665e');
    } else {
      grad.addColorStop(0, '#9aa396');
      grad.addColorStop(0.5, '#adb5a8');
      grad.addColorStop(1, '#8c9688');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, viewW, viewH);

    const bgArt = Assets.get('hub_scroll_bg');
    if (bgArt) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      const scale = Math.max(viewW / bgArt.width, viewH / bgArt.height);
      const dw = bgArt.width * scale;
      const dh = bgArt.height * scale;
      ctx.drawImage(bgArt, (viewW - dw) * 0.5, (viewH - dh) * 0.5, dw, dh);
      ctx.restore();
    }
  }

  // ==================== 2. 8x10 SPLIT BOARD CELLS ====================

  private drawBoardFrameAndCells(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    s: RunState
  ): void {
    const L = engine.layout;
    const cs = L.cellSize;
    const hasFrostInk = SaveManager.get().skills.frost_inkstone > 0;
    const digHighlight = s.shovelMode || engine.isBenchShovelSelected();

    ctx.save();
    ctx.fillStyle = '#241f1c';
    this.roundRect(ctx, L.boardX - 5, L.boardY - 5, L.boardW + 10, L.boardH + 10, 6);
    ctx.fill();
    ctx.strokeStyle = '#9c7c38';
    ctx.lineWidth = 1.6;
    this.roundRect(ctx, L.boardX - 4, L.boardY - 4, L.boardW + 8, L.boardH + 8, 5);
    ctx.stroke();
    ctx.restore();

    for (let r = 0; r < s.stage.rows; r++) {
      const isPlayerHalf = r >= s.stage.dividerRow;
      for (let c = 0; c < s.stage.cols; c++) {
        const cell = s.cells[r][c];
        const x = L.boardX + c * cs;
        const y = L.boardY + r * cs;
        this.drawSingleCell(
          ctx,
          s,
          cell,
          x,
          y,
          cs,
          c,
          r,
          isPlayerHalf,
          digHighlight,
          isPlayerHalf && hasFrostInk
        );
      }
    }
  }

  private isRoadCellOnSameSide(s: RunState, col: number, row: number, isPlayerHalf: boolean): boolean {
    if (col < 0 || col >= s.stage.cols) return false;
    const rMin = isPlayerHalf ? s.stage.dividerRow : 0;
    const rMax = isPlayerHalf ? s.stage.rows : s.stage.dividerRow;
    if (row < rMin || row >= rMax) return false;
    const ct = s.cells[row][col];
    return ct === 'path' || ct === 'vip';
  }

  private drawSingleCell(
    ctx: CanvasRenderingContext2D,
    s: RunState,
    cell: CellType,
    x: number,
    y: number,
    cs: number,
    col: number,
    row: number,
    isPlayerHalf: boolean,
    digHighlight: boolean,
    frostRoad: boolean
  ): void {
    if (cell === 'wall') {
      ctx.fillStyle = (col + row) % 2 === 0 ? '#5c6159' : '#535850';
      ctx.fillRect(x, y, cs, cs);
      ctx.strokeStyle = '#2b2d29';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
      return;
    }

    if (cell === 'path' || cell === 'vip') {
      // Continuous single-lane stone road with faint internal stone joints & crisp dark curb ONLY against non-road cells!
      ctx.fillStyle = (col + row) % 2 === 0 ? '#c8cdc2' : '#c2c7bc';
      ctx.fillRect(x, y, cs, cs);
      if (frostRoad && cell === 'path') {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
        ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
      }
      ctx.strokeStyle = 'rgba(55, 58, 52, 0.14)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);

      // Outer road curb along any side bordering a placement cell ('D' or 'L')
      ctx.strokeStyle = '#1f221e';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      if (!this.isRoadCellOnSameSide(s, col, row - 1, isPlayerHalf)) {
        ctx.moveTo(x, y + 1);
        ctx.lineTo(x + cs, y + 1);
      }
      if (!this.isRoadCellOnSameSide(s, col, row + 1, isPlayerHalf)) {
        ctx.moveTo(x, y + cs - 1);
        ctx.lineTo(x + cs, y + cs - 1);
      }
      if (!this.isRoadCellOnSameSide(s, col - 1, row, isPlayerHalf)) {
        ctx.moveTo(x + 1, y);
        ctx.lineTo(x + 1, y + cs);
      }
      if (!this.isRoadCellOnSameSide(s, col + 1, row, isPlayerHalf)) {
        ctx.moveTo(x + cs - 1, y);
        ctx.lineTo(x + cs - 1, y + cs);
      }
      ctx.stroke();
      return;
    }

    if (cell === 'locked') {
      // Dark slate-grey sealed placement grid square (matching original game — requires Golden Shovel to turn into White 'D'!)
      ctx.fillStyle = (col + row) % 2 === 0 ? '#6f736d' : '#686c66';
      ctx.fillRect(x, y, cs, cs);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.fillRect(x + 1, y + 1, cs - 2, 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(x + 1, y + cs - 3, cs - 2, 2);

      ctx.strokeStyle = '#323531';
      ctx.lineWidth = 1.3;
      ctx.strokeRect(x + 0.65, y + 0.65, cs - 1.3, cs - 1.3);

      if (digHighlight && isPlayerHalf) {
        const pulse = 0.55 + 0.4 * Math.sin(this.animClock * 6.5);
        ctx.save();
        ctx.strokeStyle = `rgba(250, 204, 21, ${pulse})`;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x + 2.5, y + 2.5, cs - 5, cs - 5);
        const shImg = Assets.get('icon_shovel');
        if (shImg) {
          ctx.globalAlpha = 0.85;
          ctx.drawImage(shImg, x + cs * 0.24, y + cs * 0.24, cs * 0.52, cs * 0.52);
        }
        ctx.restore();
      }
      return;
    }

    if (cell === 'deploy') {
      const jGrad = ctx.createLinearGradient(x, y, x, y + cs);
      jGrad.addColorStop(0, '#fbf8ef');
      jGrad.addColorStop(1, '#ebe3d1');
      ctx.fillStyle = jGrad;
      ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);

      ctx.strokeStyle = '#b7ab93';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 1.5, y + 1.5, cs - 3, cs - 3);

      ctx.strokeStyle = 'rgba(156, 138, 104, 0.42)';
      ctx.lineWidth = 1;
      const m = 5;
      const len = Math.max(4, cs * 0.14);
      ctx.beginPath();
      ctx.moveTo(x + m, y + m + len);
      ctx.lineTo(x + m, y + m);
      ctx.lineTo(x + m + len, y + m);

      ctx.moveTo(x + cs - m - len, y + m);
      ctx.lineTo(x + cs - m, y + m);
      ctx.lineTo(x + cs - m, y + m + len);

      ctx.moveTo(x + m, y + cs - m - len);
      ctx.lineTo(x + m, y + cs - m);
      ctx.lineTo(x + m + len, y + cs - m);

      ctx.moveTo(x + cs - m - len, y + cs - m);
      ctx.lineTo(x + cs - m, y + cs - m);
      ctx.lineTo(x + cs - m, y + cs - m - len);
      ctx.stroke();
    }
  }

  // ==================== 2B. PERSISTENT GROUND ZONES (BAGUA THUNDER / FROST VORTEX / FIRE PATCH) ====================

  private drawGroundZones(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    zones: GroundZone[]
  ): void {
    if (zones.length === 0) return;
    const L = engine.layout;
    const cs = L.cellSize;

    for (const z of zones) {
      const px = L.boardX + z.x * cs;
      const py = L.boardY + z.y * cs;
      const radPx = z.radius * cs;
      const fadeIn = Math.min(1, z.timer / 0.28);
      const fadeOut = Math.min(1, Math.max(0, (z.duration - z.timer) / 0.35));
      const fade = fadeIn * fadeOut;

      ctx.save();
      ctx.translate(px, py);
      ctx.globalAlpha = 0.9 * fade;

      if (z.kind === 'thunder_sigil') {
        const sp = Assets.get('vfx_zone_thunder');
        const sz = radPx * 2.15;
        ctx.rotate(this.animClock * 1.15);
        if (sp) {
          ctx.drawImage(sp, -sz * 0.5, -sz * 0.5, sz, sz);
        }
      } else if (z.kind === 'frost_zone') {
        const sp = Assets.get('vfx_zone_frost');
        const sz = radPx * 2.18;
        ctx.rotate(-this.animClock * 1.25);
        if (sp) {
          ctx.drawImage(sp, -sz * 0.5, -sz * 0.5, sz, sz);
        }
      } else {
        // 'fire_patch'
        const sp = Assets.get('vfx_zone_fire');
        const pulse = 0.94 + 0.09 * Math.sin(this.animClock * 9.5 + z.x);
        const sz = radPx * 2.18 * pulse;
        ctx.rotate(Math.sin(this.animClock * 1.6 + z.y) * 0.14);
        if (sp) {
          ctx.drawImage(sp, -sz * 0.5, -sz * 0.5, sz, sz);
        }
      }

      ctx.restore();
    }
  }

  // ==================== 3. CIRCULAR ATTACK RANGE RING & 2-CELL FOOTPRINT PREVIEW ====================

  private drawActiveCircleRangePreview(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    s: RunState
  ): void {
    const L = engine.layout;
    const cs = L.cellSize;

    let centerGridX = -1;
    let centerGridY = -1;
    let previewUnit: TileUnit | null = null;
    let rStart = s.stage.dividerRow;
    let rEnd = s.stage.rows;
    let twoCellFootprint: { c1: number; r1: number; c2: number; r2: number } | null = null;
    let blockedTwoCell = false;

    if (engine.drag?.active && engine.drag.movedEnough) {
      const dragUnit = engine.drag.unit;
      if (dragUnit.unitId === 'shovel') return;
      const col = Math.floor((engine.drag.screenX - L.boardX) / cs);
      const row = Math.floor((engine.drag.screenY - L.boardY) / cs);
      if (col >= 0 && col < s.stage.cols && row >= s.stage.dividerRow && row < s.stage.rows) {
        const hoveredBoardUnit = s.board[row][col];
        const hoverCombo =
          hoveredBoardUnit && hoveredBoardUnit.uid !== dragUnit.uid
            ? checkTileCombine(dragUnit, hoveredBoardUnit)
            : null;

        if (dragUnit.cellSpan === 2) {
          twoCellFootprint = engine.previewTwoCellPlacement(col, row, dragUnit.uid);
          previewUnit = dragUnit;
          if (twoCellFootprint) {
            centerGridX = (twoCellFootprint.c1 + twoCellFootprint.c2) * 0.5 + 0.5;
            centerGridY = (twoCellFootprint.r1 + twoCellFootprint.r2) * 0.5 + 0.5;
          } else {
            blockedTwoCell = true;
            centerGridX = col + 0.5;
            centerGridY = row + 0.5;
          }
        } else if (
          hoverCombo &&
          hoverCombo.mode === 'upgrade_hero' &&
          hoveredBoardUnit &&
          hoveredBoardUnit.cellSpan === 2
        ) {
          // Previewing feeding a new shard into your existing unique 2-Cell General!
          twoCellFootprint = {
            c1: hoveredBoardUnit.anchorCol,
            r1: hoveredBoardUnit.anchorRow,
            c2: hoveredBoardUnit.secCol,
            r2: hoveredBoardUnit.secRow,
          };
          previewUnit = hoveredBoardUnit;
          centerGridX = (twoCellFootprint.c1 + twoCellFootprint.c2) * 0.5 + 0.5;
          centerGridY = (twoCellFootprint.r1 + twoCellFootprint.r2) * 0.5 + 0.5;
        } else if (
          hoverCombo &&
          hoverCombo.mode === 'awaken' &&
          !(
            UNITS[dragUnit.unitId].heroKey &&
            engine.findAwakenedHeroOnSide(s, 'player', UNITS[dragUnit.unitId].heroKey!)
          )
        ) {
          // Previewing 1/2 + 2/2 fusion into a unique horizontal 2x1 Awakened General right on the board!
          twoCellFootprint = engine.previewTwoCellPlacement(col, row, dragUnit.uid);
          previewUnit = {
            ...dragUnit,
            unitId: hoverCombo.resultId,
            tier: hoverCombo.resultTier,
            cellSpan: 2,
          };
          if (twoCellFootprint) {
            centerGridX = (twoCellFootprint.c1 + twoCellFootprint.c2) * 0.5 + 0.5;
            centerGridY = (twoCellFootprint.r1 + twoCellFootprint.r2) * 0.5 + 0.5;
          } else {
            blockedTwoCell = true;
            centerGridX = col + 0.5;
            centerGridY = row + 0.5;
          }
        } else {
          previewUnit = dragUnit;
          centerGridX = col + 0.5;
          centerGridY = row + 0.5;
        }
      }
    } else if (s.selectedSource?.type === 'board') {
      const uCol = s.selectedSource.col;
      const uRow = s.selectedSource.row;
      const u = s.board[uRow]?.[uCol] ?? null;
      if (u) {
        previewUnit = u;
        const center = engine.getUnitBoardCenter(u, uCol, uRow);
        centerGridX = center.x;
        centerGridY = center.y;
        if (uRow < s.stage.dividerRow) {
          rStart = 0;
          rEnd = s.stage.dividerRow;
        }
      }
    } else if (
      s.selectedSource?.type === 'bench' &&
      s.bench[s.selectedSource.benchIdx] &&
      getUnitCircleRange(s.bench[s.selectedSource.benchIdx]!).canAttack
    ) {
      // Bench troop selected (before dragging): indicate which open deploy cells can reach the road!
      const benchUnit = s.bench[s.selectedSource.benchIdx]!;
      const bRange = getUnitCircleRange(benchUnit);
      ctx.save();
      for (let r = s.stage.dividerRow; r < s.stage.rows; r++) {
        for (let c = 0; c < s.stage.cols; c++) {
          if (s.cells[r][c] !== 'deploy' || s.board[r][c] !== null) continue;
          const canReach = doesCircleReachLane(
            s.stage.playerLane,
            c + 0.5,
            r + 0.5,
            bRange.minR,
            bRange.maxR
          );
          const x = L.boardX + c * cs + 3.5;
          const y = L.boardY + r * cs + 3.5;
          const sz = cs - 7;
          ctx.strokeStyle = canReach
            ? 'rgba(16, 185, 129, 0.72)'
            : 'rgba(239, 68, 68, 0.42)';
          ctx.lineWidth = canReach ? 1.8 : 1.3;
          ctx.setLineDash(canReach ? [] : [4, 3]);
          this.roundRect(ctx, x, y, sz, sz, 5);
          ctx.stroke();
        }
      }
      ctx.restore();
      return;
    } else if (
      !s.selectedSource &&
      s.selectedUnitInfo?.boardCol !== undefined &&
      s.selectedUnitInfo?.boardRow !== undefined
    ) {
      const uCol = s.selectedUnitInfo.boardCol;
      const uRow = s.selectedUnitInfo.boardRow;
      const u = s.board[uRow]?.[uCol] ?? null;
      if (u && u.uid === s.selectedUnitInfo.uid) {
        previewUnit = u;
        const center = engine.getUnitBoardCenter(u, uCol, uRow);
        centerGridX = center.x;
        centerGridY = center.y;
        if (uRow < s.stage.dividerRow) {
          rStart = 0;
          rEnd = s.stage.dividerRow;
        }
      }
    }

    if (!previewUnit || centerGridX < 0) return;

    const cx = L.boardX + centerGridX * cs;
    const cy = L.boardY + centerGridY * cs;
    const rangeInfo = getUnitCircleRange(previewUnit);

    ctx.save();
    // Clip circle to that player's/AI's half-board so the circle stays tidy inside the battlefield!
    const clipY = rStart === 0 ? L.boardY : L.dividerY;
    const clipH = (rEnd - rStart) * cs;
    ctx.beginPath();
    ctx.rect(L.boardX, clipY, L.boardW, clipH);
    ctx.clip();

    // Draw 2-Cell Drop-Target Footprint Highlight if dragging/awakening a 2-Cell General!
    if (twoCellFootprint) {
      const fx = L.boardX + twoCellFootprint.c1 * cs + 2;
      const fy = L.boardY + twoCellFootprint.r1 * cs + 2;
      const fw = (twoCellFootprint.c2 - twoCellFootprint.c1 + 1) * cs - 4;
      const fh = (twoCellFootprint.r2 - twoCellFootprint.r1 + 1) * cs - 4;
      ctx.fillStyle = 'rgba(250, 204, 21, 0.24)';
      this.roundRect(ctx, fx, fy, fw, fh, 7);
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.8;
      this.roundRect(ctx, fx, fy, fw, fh, 7);
      ctx.stroke();
    } else if (blockedTwoCell) {
      const bx = L.boardX + Math.floor(centerGridX) * cs + 2;
      const by = L.boardY + Math.floor(centerGridY) * cs + 2;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
      this.roundRect(ctx, bx, by, cs - 4, cs - 4, 6);
      ctx.fill();
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2.6;
      this.roundRect(ctx, bx, by, cs - 4, cs - 4, 6);
      ctx.stroke();
    }

    // Unfused Puzzle Piece -> show compact dashed amber ring indicating 0 attack range!
    if (!rangeInfo.canAttack) {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, cs * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Exact combat-identical check against this half-board's actual enemy lane!
    const sideLane = rStart === 0 ? s.stage.aiLane : s.stage.playerLane;
    const hitsRoad =
      !blockedTwoCell &&
      doesCircleReachLane(
        sideLane,
        centerGridX,
        centerGridY,
        rangeInfo.minR,
        rangeInfo.maxR
      );

    // Highlight covered road tiles whose lane centerline falls inside combat firing reach!
    if (hitsRoad) {
      const wps = sideLane.waypoints;
      const effMin = Math.max(0, rangeInfo.minR - RANGE_HIT_PAD);
      const effMax = rangeInfo.maxR + RANGE_HIT_PAD;
      const litCells = new Set<string>();

      for (let i = 0; i < wps.length; i++) {
        const wp = wps[i];
        let covered = isRoadCellInCircleRange(
          wp.col,
          wp.row,
          centerGridX,
          centerGridY,
          rangeInfo.minR,
          rangeInfo.maxR
        );
        if (!covered && i + 1 < wps.length) {
          const nx = wps[i + 1];
          const midX = (wp.col + nx.col) * 0.5 + 0.5;
          const midY = (wp.row + nx.row) * 0.5 + 0.5;
          const segD = pointToSegmentDist(
            centerGridX,
            centerGridY,
            wp.col + 0.5,
            wp.row + 0.5,
            midX,
            midY
          );
          if (segD >= effMin && segD <= effMax) covered = true;
        }
        if (!covered && i > 0) {
          const pv = wps[i - 1];
          const midX = (wp.col + pv.col) * 0.5 + 0.5;
          const midY = (wp.row + pv.row) * 0.5 + 0.5;
          const segD = pointToSegmentDist(
            centerGridX,
            centerGridY,
            pv.col + 0.5,
            pv.row + 0.5,
            midX,
            midY
          );
          if (segD >= effMin && segD <= effMax) covered = true;
        }
        if (covered) {
          const key = `${wp.col},${wp.row}`;
          if (!litCells.has(key)) {
            litCells.add(key);
            const rx = L.boardX + wp.col * cs + 2;
            const ry = L.boardY + wp.row * cs + 2;
            ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
            this.roundRect(ctx, rx, ry, cs - 4, cs - 4, 4);
            ctx.fill();
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
            ctx.lineWidth = 1.3;
            ctx.setLineDash([]);
            this.roundRect(ctx, rx, ry, cs - 4, cs - 4, 4);
            ctx.stroke();
          }
        }
      }
    }

    const maxPx = rangeInfo.maxR * cs;
    const minPx = rangeInfo.minR * cs;

    // Translucent radial fill
    const rGrad = ctx.createRadialGradient(cx, cy, minPx, cx, cy, maxPx);
    if (hitsRoad) {
      rGrad.addColorStop(0, 'rgba(52, 211, 153, 0.08)');
      rGrad.addColorStop(0.75, 'rgba(52, 211, 153, 0.16)');
      rGrad.addColorStop(1, 'rgba(250, 204, 21, 0.28)');
    } else {
      rGrad.addColorStop(0, 'rgba(239, 68, 68, 0.08)');
      rGrad.addColorStop(1, 'rgba(239, 68, 68, 0.28)');
    }

    ctx.beginPath();
    ctx.arc(cx, cy, maxPx, 0, Math.PI * 2);
    if (minPx > 0) {
      ctx.arc(cx, cy, minPx, 0, Math.PI * 2, true);
    }
    ctx.fillStyle = rGrad;
    ctx.fill();

    // Outer circular ring
    ctx.strokeStyle = hitsRoad ? 'rgba(110, 231, 183, 0.95)' : 'rgba(248, 113, 113, 0.95)';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([7, 4]);
    ctx.lineDashOffset = -this.animClock * 18;
    ctx.beginPath();
    ctx.arc(cx, cy, maxPx, 0, Math.PI * 2);
    ctx.stroke();

    // Inner blindspot ring for Siege Mortar
    if (minPx > 0) {
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.85)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, minPx, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ==================== 4. ENTRY ARROWS, VIP HEIR & GREAT WALL DIVIDER ====================

  private drawLaneSpawnArrow(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    lane: DuelLane,
    _color: string
  ): void {
    if (lane.waypoints.length < 2) return;
    const L = engine.layout;
    const cs = L.cellSize;
    const w0 = lane.waypoints[0];
    const w1 = lane.waypoints[1];
    const cx = L.boardX + (w0.col + 0.5) * cs;
    const cy = L.boardY + (w0.row + 0.5) * cs;
    const ang = Math.atan2(w1.row - w0.row, w1.col - w0.col);

    const pulse = 0.62 + 0.3 * Math.sin(this.animClock * 4.2);
    const nudge = Math.sin(this.animClock * 4.2) * cs * 0.06;
    const arrowImg = Assets.get('icon_spawn_arrow');
    if (!arrowImg) return;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.globalAlpha = pulse;
    const sz = cs * 0.64;
    ctx.drawImage(arrowImg, -sz * 0.5 + nudge, -sz * 0.5, sz, sz);
    ctx.restore();
  }

  private drawVipHeirAndHearts(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    s: RunState,
    side: 'ai' | 'player'
  ): void {
    const L = engine.layout;
    const cs = L.cellSize;
    const lane = side === 'ai' ? s.stage.aiLane : s.stage.playerLane;
    const hearts = side === 'ai' ? s.aiHearts : s.hearts;

    const vx = L.boardX + lane.vipCell.col * cs;
    const vy = L.boardY + lane.vipCell.row * cs;

    ctx.save();
    const auraImg = Assets.get('vfx_shockwave_gold');
    if (auraImg) {
      ctx.save();
      ctx.globalAlpha = 0.42 + 0.14 * Math.sin(this.animClock * 3.0);
      ctx.translate(vx + cs * 0.5, vy + cs * 0.52);
      ctx.rotate(this.animClock * 0.55);
      ctx.drawImage(auraImg, -cs * 0.48, -cs * 0.48, cs * 0.96, cs * 0.96);
      ctx.restore();
    }

    const vipImg = Assets.get('vip_lord');
    if (vipImg) {
      const bob = Math.sin(this.animClock * 2.6 + (side === 'ai' ? 1.5 : 0)) * 1.5;
      ctx.drawImage(vipImg, vx + cs * 0.06, vy + cs * 0.06 + bob, cs * 0.88, cs * 0.88);
    }

    const heartImg = Assets.get('icon_heart');
    const heartAnchorY = side === 'ai' ? vy - cs * 0.34 : vy - cs * 0.3;
    const colsPerRow = 4;
    const hSize = Math.max(8, cs * 0.22);
    const startX = vx + (cs - colsPerRow * (hSize + 1)) * 0.5;
    const shownHearts = Math.min(12, hearts);

    if (heartImg) {
      for (let i = 0; i < shownHearts; i++) {
        const hc = i % colsPerRow;
        const hr = Math.floor(i / colsPerRow);
        const hx = startX + hc * (hSize + 1);
        const hy = heartAnchorY - hr * (hSize * 0.92);
        ctx.drawImage(heartImg, hx, hy - hSize * 0.5, hSize, hSize);
      }
    }
    ctx.restore();
  }

  private drawBarricade(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    bar: LaneBarricade
  ): void {
    if (bar.hp <= 0) return;
    const L = engine.layout;
    const cs = L.cellSize;
    const shake = bar.shakeTimer > 0 ? (Math.random() - 0.5) * 4.5 : 0;
    const x = L.boardX + bar.col * cs + shake;
    const y = L.boardY + bar.row * cs;

    ctx.save();
    const barImg = Assets.get('prop_barricade');
    if (barImg) {
      ctx.save();
      ctx.translate(x + cs * 0.5, y + cs * 0.48);
      if (bar.side === 'player') {
        ctx.scale(-1, 1);
      }
      const sz = cs * 0.94;
      ctx.drawImage(barImg, -sz * 0.5, -sz * 0.5, sz, sz);
      ctx.restore();
    }

    if (bar.hp < bar.maxHp) {
      const bw = cs * 0.78;
      const bx = x + (cs - bw) * 0.5;
      const by = y + cs - 6.5;
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(bx, by, bw, 4);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(bx, by, bw * (bar.hp / bar.maxHp), 4);
    }
    ctx.restore();
  }

  private drawGreatWallDivider(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    s: RunState
  ): void {
    const L = engine.layout;
    const y = L.dividerY;

    ctx.save();
    ctx.fillStyle = '#363833';
    ctx.fillRect(L.boardX - 2, y - 4, L.boardW + 4, 8);

    ctx.fillStyle = '#4e524b';
    ctx.strokeStyle = '#1f211e';
    ctx.lineWidth = 1;
    const merlonW = Math.max(10, Math.floor(L.cellSize * 0.34));
    for (let mx = L.boardX + 4; mx < L.boardX + L.boardW - merlonW; mx += merlonW * 1.7) {
      ctx.fillRect(mx, y - 4, merlonW, 8);
      ctx.strokeRect(mx, y - 4, merlonW, 8);
    }

    const dict = t();
    ctx.font = '700 10px "STKaiti", "KaiTi", "Noto Serif SC", Georgia, serif';
    ctx.textBaseline = 'middle';

    const aiLabel = s.aiCollapsed
      ? `${dict.rivalTag} ✕`
      : `${dict.rivalTag} ♥${s.aiHearts}`;
    const lw = ctx.measureText(aiLabel).width + 12;
    ctx.fillStyle = 'rgba(28, 22, 20, 0.88)';
    this.roundRect(ctx, L.boardX + L.cellSize + 4, y - 9, lw, 18, 9);
    ctx.fill();
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = s.aiCollapsed ? '#9ca3af' : '#fca5a5';
    ctx.fillText(aiLabel, L.boardX + L.cellSize + 10, y + 0.5);

    const plLabel = `${dict.playerTag} ♥${s.hearts}`;
    const rw = ctx.measureText(plLabel).width + 12;
    const rx = L.boardX + L.boardW - L.cellSize - rw - 4;
    ctx.fillStyle = 'rgba(22, 34, 28, 0.9)';
    this.roundRect(ctx, rx, y - 9, rw, 18, 9);
    ctx.fill();
    ctx.strokeStyle = '#d4af37';
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.fillText(plLabel, rx + 6, y + 0.5);

    ctx.restore();
  }

  // ==================== 6. TILES: PUZZLE PIECES, BENCH SHOVEL & LEVELING GENERALS ====================

  public drawWarTile(
    ctx: CanvasRenderingContext2D,
    u: TileUnit,
    x: number,
    y: number,
    size: number,
    highlight: 'none' | 'merge' | 'awaken' | 'selected' | 'talisman',
    dimmed: boolean,
    isPlayerSide: boolean
  ): void {
    const def = UNITS[u.unitId];
    const isAwakened = def.category === 'awakened';
    const isShard = def.category === 'shard1' || def.category === 'shard2';
    const isItem = def.category === 'item';

    ctx.save();
    if (dimmed) ctx.globalAlpha = 0.52;

    let cx = x + size * 0.5;
    let cy = y + size * 0.5;
    let scale = 1;
    if (u.mergeAnimTimer > 0) {
      scale = 1 + Math.sin((u.mergeAnimTimer / 0.25) * Math.PI) * 0.16;
    } else if (u.levelUpAnimTimer > 0) {
      scale = 1 + Math.sin((u.levelUpAnimTimer / 0.85) * Math.PI) * 0.12;
    }
    if (u.recoilTimer > 0) {
      const kick = (u.recoilTimer / 0.14) * 3.2;
      cx += Math.cos(u.recoilAngle) * kick;
      cy += Math.sin(u.recoilAngle) * kick;
    }

    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    const tx = -size * 0.5;
    const ty = -size * 0.5;
    const rad = Math.max(5, size * 0.13);
    const lip = Math.max(3, size * 0.085);

    if (highlight !== 'none' || u.frenzyTimer > 0 || u.levelUpAnimTimer > 0) {
      const pulse = 0.65 + 0.35 * Math.sin(this.animClock * 7.5);
      ctx.save();
      ctx.strokeStyle =
        highlight === 'awaken' || highlight === 'talisman' || u.levelUpAnimTimer > 0
          ? `rgba(250, 204, 21, ${pulse})`
          : highlight === 'merge'
            ? `rgba(52, 211, 153, ${pulse})`
            : u.frenzyTimer > 0
              ? 'rgba(192, 132, 252, 0.9)'
              : 'rgba(251, 191, 36, 0.95)';
      ctx.lineWidth = highlight === 'awaken' || highlight === 'talisman' ? 3.2 : 2.4;
      ctx.shadowColor = highlight === 'merge' ? '#34d399' : '#facc15';
      ctx.shadowBlur = 11;
      this.roundRect(ctx, tx - 2, ty - 2, size + 4, size + 4, rad + 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3D Carved Mahjong Lip
    ctx.fillStyle = isAwakened
      ? '#784b08'
      : isItem
        ? '#78350f'
        : isShard
          ? def.frameColor
          : '#b5aa94';
    this.roundRect(ctx, tx, ty + lip, size, size - lip, rad);
    ctx.fill();

    const faceH = size - lip;
    if (isAwakened) {
      const g = ctx.createLinearGradient(tx, ty, tx + size, ty + faceH);
      g.addColorStop(0, '#fef3c7');
      g.addColorStop(0.5, '#f5d061');
      g.addColorStop(1, '#d4af37');
      ctx.fillStyle = g;
    } else if (isItem) {
      const g = ctx.createLinearGradient(tx, ty, tx, ty + faceH);
      g.addColorStop(0, '#fef08a');
      g.addColorStop(1, '#f59e0b');
      ctx.fillStyle = g;
    } else if (isShard) {
      // Slightly muted stone-parchment face so unfused puzzle pieces clearly look sealed/inert!
      const g = ctx.createLinearGradient(tx, ty, tx, ty + faceH);
      g.addColorStop(0, '#efe9da');
      g.addColorStop(1, '#d8ceba');
      ctx.fillStyle = g;
    } else {
      const g = ctx.createLinearGradient(tx, ty, tx, ty + faceH);
      g.addColorStop(0, '#fcf9f0');
      g.addColorStop(1, '#ede5d2');
      ctx.fillStyle = g;
    }
    this.roundRect(ctx, tx, ty, size, faceH, rad);
    ctx.fill();

    // Clipped Inner Gongbi Painting
    const pad = isAwakened ? Math.max(3, size * 0.075) : Math.max(2.5, size * 0.06);
    ctx.save();
    this.roundRect(ctx, tx + pad, ty + pad, size - pad * 2, faceH - pad * 2, Math.max(3, rad - 2));
    ctx.clip();
    const sprite = Assets.get(def.spriteKey);
    if (sprite) {
      if (isShard) ctx.globalAlpha *= 0.88;
      ctx.drawImage(sprite, tx + pad, ty + pad, size - pad * 2, faceH - pad * 2);
    }
    ctx.restore();

    // Borders + Interlocking Jigsaw Tab/Socket for Hero Puzzle Pieces!
    if (isAwakened) {
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1.6;
      this.roundRect(ctx, tx + pad, ty + pad, size - pad * 2, faceH - pad * 2, Math.max(3, rad - 2));
      ctx.stroke();
      ctx.strokeStyle = '#784b08';
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, tx, ty, size, faceH, rad);
      ctx.stroke();
    } else if (isShard) {
      ctx.save();
      ctx.strokeStyle = def.accentColor;
      ctx.lineWidth = 2.2;
      ctx.setLineDash([4, 2]);
      this.roundRect(ctx, tx + 1, ty + 1, size - 2, faceH - 2, rad);
      ctx.stroke();
      ctx.setLineDash([]);

      // Sculpted Jigsaw Tab (凸 on right edge of Piece 1/2, 凹/tab on left edge of Piece 2/2)
      const tabR = Math.max(4, size * 0.105);
      const midY = ty + faceH * 0.48;
      ctx.beginPath();
      if (def.category === 'shard1') {
        ctx.arc(tx + size - 2, midY, tabR, Math.PI * 0.5, Math.PI * 1.5);
        ctx.fillStyle = def.accentColor;
      } else {
        ctx.arc(tx + 2, midY, tabR, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.fillStyle = '#fde047';
      }
      ctx.fill();
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.restore();
    } else if (isItem) {
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 2;
      this.roundRect(ctx, tx + 0.5, ty + 0.5, size - 1, faceH - 1, rad);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#3d352e';
      ctx.lineWidth = 1.4;
      this.roundRect(ctx, tx, ty, size, faceH, rad);
      ctx.stroke();
    }

    // Top-Left Gongbi Pairing Crest Medallion (uses real crest sprite instead of Unicode font symbols!)
    if (def.heroKey) {
      const crestImg = Assets.get(`crest_${def.heroKey}`);
      const bR = Math.max(7, size * 0.17);
      const bx = tx + bR + 1.8;
      const by = ty + bR + 1.8;
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, bR, 0, Math.PI * 2);
      ctx.fillStyle = isAwakened ? '#7c2d12' : def.frameColor;
      ctx.fill();
      ctx.clip();
      if (crestImg) {
        ctx.drawImage(crestImg, bx - bR, by - bR, bR * 2, bR * 2);
      }
      ctx.restore();
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(bx, by, bR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Bottom Puzzle Badge on Shards: [1/2] or [2/2] (clear non-Hanzi indicator!)
    if (isShard) {
      const pw = Math.max(20, size * 0.48);
      const ph = Math.max(10, size * 0.22);
      const px = -pw * 0.5;
      const py = ty + faceH - ph - 1.5;
      ctx.save();
      ctx.fillStyle = 'rgba(24, 20, 18, 0.88)';
      this.roundRect(ctx, px, py, pw, ph, 4);
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.font = `800 ${Math.max(8, Math.round(ph * 0.78))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.category === 'shard1' ? '1/2' : '2/2', 0, py + ph * 0.52);
      ctx.restore();
    }

    // Awakened General: Live XP Progress Bar + Lv.X Badge + Equipped Weapon Badge!
    if (isAwakened) {
      // Bottom XP Progress Bar
      const barM = pad + 1;
      const barW = size - barM * 2;
      const barH = Math.max(3.2, size * 0.08);
      const barX = tx + barM;
      const barY = ty + faceH - barH - 2;
      const xpRatio =
        u.combatLevel >= MAX_HERO_COMBAT_LEVEL ? 1 : Math.min(1, u.xp / Math.max(1, u.maxXp));

      ctx.fillStyle = 'rgba(18, 15, 12, 0.82)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = u.combatLevel >= MAX_HERO_COMBAT_LEVEL ? '#f59e0b' : '#38bdf8';
      ctx.fillRect(barX, barY, barW * xpRatio, barH);

      // Bottom-Left Combat Level Pill (Lv.1 .. Lv.12)
      const lvText = `Lv.${u.combatLevel}`;
      const lvFont = Math.max(7.5, Math.round(size * 0.18));
      ctx.font = `900 ${lvFont}px sans-serif`;
      const lvw = ctx.measureText(lvText).width + 5;
      const lvh = lvFont + 3;
      const lvx = tx + 2;
      const lvy = barY - lvh - 1;
      ctx.fillStyle = 'rgba(24, 20, 18, 0.88)';
      this.roundRect(ctx, lvx, lvy, lvw, lvh, 3);
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lvText, lvx + lvw * 0.5, lvy + lvh * 0.54);

      // Bottom-Right Equipped Weapon Badge
      if (def.heroKey) {
        const eqWeapon = isPlayerSide
          ? SaveManager.get().equippedWeapons[def.heroKey]
          : null;
        if (eqWeapon) {
          const wSz = Math.max(12, size * 0.31);
          const wx = tx + size - wSz - 2;
          const wy = barY - wSz - 1;
          ctx.save();
          ctx.beginPath();
          ctx.arc(wx + wSz * 0.5, wy + wSz * 0.5, wSz * 0.52, 0, Math.PI * 2);
          ctx.fillStyle = '#291d16';
          ctx.fill();
          ctx.clip();
          const wImg = Assets.get(eqWeapon);
          if (wImg) {
            ctx.drawImage(wImg, wx, wy, wSz, wSz);
          }
          ctx.restore();
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(wx + wSz * 0.5, wy + wSz * 0.5, wSz * 0.52, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // 5-Color Rarity Tier Numeral (omitted on Shovel item tiles!)
    if (!isItem) {
      const tierColors = ['#1c1917', '#15803d', '#1d4ed8', '#7e22ce', '#c2410c'];
      const tierFont = Math.max(9, Math.round(size * 0.22));
      const numX = tx + size - Math.max(7, size * 0.16);
      const numY = ty + Math.max(8, size * 0.18);
      ctx.font = `900 ${tierFont}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = 'rgba(252, 249, 240, 0.95)';
      ctx.strokeText(`${u.tier}`, numX, numY);
      ctx.fillStyle = tierColors[Math.min(4, u.tier - 1)];
      ctx.fillText(`${u.tier}`, numX, numY);
    }

    ctx.restore();
  }

  /**
   * Renders a 2-Cell Awakened General (`2x1` Horizontal or `1x2` Vertical Imperial Jade-Gold Double Plaque)!
   * Strictly non-Hanzi on canvas: Gongbi Hero Portrait + Geometric Faction Crest + Equipped Weapon + Lv.X + 2x + Tier + XP Bar.
   */
  public drawDoubleWarTile(
    ctx: CanvasRenderingContext2D,
    u: TileUnit,
    x: number,
    y: number,
    w: number,
    h: number,
    cellSize: number,
    highlight: 'none' | 'merge' | 'awaken' | 'selected' | 'talisman',
    dimmed: boolean,
    isPlayerSide: boolean
  ): void {
    const def = UNITS[u.unitId];
    const isHoriz = w >= h;

    ctx.save();
    if (dimmed) ctx.globalAlpha = 0.52;

    let cx = x + w * 0.5;
    let cy = y + h * 0.5;
    let scale = 1;
    if (u.mergeAnimTimer > 0) {
      scale = 1 + Math.sin((u.mergeAnimTimer / 0.25) * Math.PI) * 0.12;
    } else if (u.levelUpAnimTimer > 0) {
      scale = 1 + Math.sin((u.levelUpAnimTimer / 0.85) * Math.PI) * 0.1;
    }
    if (u.recoilTimer > 0) {
      const kick = (u.recoilTimer / 0.14) * 3.5;
      cx += Math.cos(u.recoilAngle) * kick;
      cy += Math.sin(u.recoilAngle) * kick;
    }

    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    const tx = -w * 0.5;
    const ty = -h * 0.5;
    const rad = Math.max(6, cellSize * 0.14);
    const lip = Math.max(3.5, cellSize * 0.085);
    const faceH = h - lip;

    // Selection / Talisman / Frenzy / Level-Up Outer Glow
    if (highlight !== 'none' || u.frenzyTimer > 0 || u.levelUpAnimTimer > 0) {
      const pulse = 0.65 + 0.35 * Math.sin(this.animClock * 7.5);
      ctx.save();
      ctx.strokeStyle =
        highlight === 'awaken' || highlight === 'talisman' || u.levelUpAnimTimer > 0
          ? `rgba(250, 204, 21, ${pulse})`
          : highlight === 'merge'
            ? `rgba(52, 211, 153, ${pulse})`
            : u.frenzyTimer > 0
              ? 'rgba(192, 132, 252, 0.92)'
              : 'rgba(251, 191, 36, 0.95)';
      ctx.lineWidth = highlight === 'awaken' || highlight === 'talisman' ? 3.4 : 2.6;
      ctx.shadowColor = highlight === 'merge' ? '#34d399' : '#facc15';
      ctx.shadowBlur = 12;
      this.roundRect(ctx, tx - 2, ty - 2, w + 4, h + 4, rad + 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3D Carved Imperial Gold-Mahogany Lip
    ctx.fillStyle = '#6b3f06';
    this.roundRect(ctx, tx, ty + lip, w, faceH, rad);
    ctx.fill();

    // Imperial Gold-Leaf Face Gradient
    const g = ctx.createLinearGradient(tx, ty, tx + w, ty + faceH);
    g.addColorStop(0, '#fef3c7');
    g.addColorStop(0.45, '#f6d365');
    g.addColorStop(1, '#ca9a29');
    ctx.fillStyle = g;
    this.roundRect(ctx, tx, ty, w, faceH, rad);
    ctx.fill();

    const pad = Math.max(3, cellSize * 0.07);
    const xpBarH = Math.max(3.6, cellSize * 0.085);
    const innerW = w - pad * 2;
    const innerH = faceH - pad * 2 - xpBarH - 2;

    if (isHoriz) {
      // === 2x1 HORIZONTAL DOUBLE PLAQUE ===
      const portraitW = Math.min(innerH * 1.16, innerW * 0.54);
      const px0 = tx + pad;
      const py0 = ty + pad;

      // Left Half: Gongbi Hero Portrait
      ctx.save();
      this.roundRect(ctx, px0, py0, portraitW, innerH, Math.max(4, rad - 2));
      ctx.clip();
      const sprite = Assets.get(def.spriteKey);
      if (sprite) {
        ctx.drawImage(sprite, px0, py0, portraitW, innerH);
      }
      ctx.restore();
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1.6;
      this.roundRect(ctx, px0, py0, portraitW, innerH, Math.max(4, rad - 2));
      ctx.stroke();

      // Right Half: Cinnabar-Brocade Command Seal Panel (Crest + Weapon + Lv.X + Tier)
      const rx0 = px0 + portraitW + 3;
      const rw = Math.max(12, tx + w - pad - rx0);
      ctx.fillStyle = 'rgba(42, 24, 18, 0.86)';
      this.roundRect(ctx, rx0, py0, rw, innerH, Math.max(4, rad - 2));
      ctx.fill();
      ctx.strokeStyle = def.accentColor;
      ctx.lineWidth = 1.4;
      this.roundRect(ctx, rx0, py0, rw, innerH, Math.max(4, rad - 2));
      ctx.stroke();

      // Interlocking Golden Puzzle Seam between the two fused cells!
      const seamX = px0 + portraitW + 1.5;
      const seamMidY = py0 + innerH * 0.5;
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(seamX, seamMidY, Math.max(3.5, cellSize * 0.08), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Faction Crest Medallion OR Equipped Divine Weapon in Center of Right Panel
      const eqWeapon =
        def.heroKey && isPlayerSide ? SaveManager.get().equippedWeapons[def.heroKey] : null;
      const centerArtKey = eqWeapon || (def.heroKey ? `crest_${def.heroKey}` : '');
      const centerImg = centerArtKey ? Assets.get(centerArtKey) : null;
      const iconSz = Math.min(rw * 0.66, innerH * 0.62);
      const icX = rx0 + rw * 0.5;
      const icY = py0 + innerH * 0.44;
      if (centerImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(icX, icY, iconSz * 0.5, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(centerImg, icX - iconSz * 0.5, icY - iconSz * 0.5, iconSz, iconSz);
        ctx.restore();
        ctx.strokeStyle = eqWeapon ? '#fde047' : def.accentColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(icX, icY, iconSz * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Lv.X Combat Level Pill at bottom of Right Panel
      const lvText = `Lv.${u.combatLevel}`;
      const lvFont = Math.max(8, Math.round(cellSize * 0.19));
      ctx.font = `900 ${lvFont}px sans-serif`;
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(lvText, rx0 + rw * 0.5, py0 + innerH - 1.5);
    } else {
      // === 1x2 VERTICAL DOUBLE PLAQUE ===
      const px0 = tx + pad;
      const py0 = ty + pad;
      const portraitH = Math.min(innerW * 1.12, innerH * 0.56);

      // Top Half: Gongbi Hero Portrait
      ctx.save();
      this.roundRect(ctx, px0, py0, innerW, portraitH, Math.max(4, rad - 2));
      ctx.clip();
      const sprite = Assets.get(def.spriteKey);
      if (sprite) {
        ctx.drawImage(sprite, px0, py0, innerW, portraitH);
      }
      ctx.restore();
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1.6;
      this.roundRect(ctx, px0, py0, innerW, portraitH, Math.max(4, rad - 2));
      ctx.stroke();

      // Bottom Half: Cinnabar Command Seal Panel
      const by0 = py0 + portraitH + 3;
      const bh = Math.max(12, ty + faceH - xpBarH - pad - 2 - by0);
      ctx.fillStyle = 'rgba(42, 24, 18, 0.86)';
      this.roundRect(ctx, px0, by0, innerW, bh, Math.max(4, rad - 2));
      ctx.fill();
      ctx.strokeStyle = def.accentColor;
      ctx.lineWidth = 1.4;
      this.roundRect(ctx, px0, by0, innerW, bh, Math.max(4, rad - 2));
      ctx.stroke();

      // Interlocking Golden Puzzle Seam
      const seamY = py0 + portraitH + 1.5;
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(0, seamY, Math.max(3.5, cellSize * 0.08), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1;
      ctx.stroke();

      const eqWeapon =
        def.heroKey && isPlayerSide ? SaveManager.get().equippedWeapons[def.heroKey] : null;
      const centerArtKey = eqWeapon || (def.heroKey ? `crest_${def.heroKey}` : '');
      const centerImg = centerArtKey ? Assets.get(centerArtKey) : null;
      const iconSz = Math.min(innerW * 0.62, bh * 0.62);
      const icY = by0 + bh * 0.43;
      if (centerImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, icY, iconSz * 0.5, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(centerImg, -iconSz * 0.5, icY - iconSz * 0.5, iconSz, iconSz);
        ctx.restore();
        ctx.strokeStyle = eqWeapon ? '#fde047' : def.accentColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, icY, iconSz * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      const lvText = `Lv.${u.combatLevel}`;
      const lvFont = Math.max(8, Math.round(cellSize * 0.19));
      ctx.font = `900 ${lvFont}px sans-serif`;
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(lvText, 0, by0 + bh - 1.5);
    }

    // Outer Plaque Frame
    ctx.strokeStyle = '#784b08';
    ctx.lineWidth = 1.7;
    this.roundRect(ctx, tx, ty, w, faceH, rad);
    ctx.stroke();

    // Top-Left Gongbi Totem Crest Medallion
    if (def.heroKey) {
      const crestImg = Assets.get(`crest_${def.heroKey}`);
      const bR = Math.max(7, cellSize * 0.17);
      const bx = tx + bR + 2.2;
      const by = ty + bR + 2.2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, bR, 0, Math.PI * 2);
      ctx.fillStyle = '#7c2d12';
      ctx.fill();
      ctx.clip();
      if (crestImg) {
        ctx.drawImage(crestImg, bx - bR, by - bR, bR * 2, bR * 2);
      }
      ctx.restore();
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      ctx.arc(bx, by, bR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Full-Width Bottom XP Progress Bar
    const barX = tx + pad;
    const barY = ty + faceH - xpBarH - 2;
    const barW = w - pad * 2;
    const xpRatio =
      u.combatLevel >= MAX_HERO_COMBAT_LEVEL ? 1 : Math.min(1, u.xp / Math.max(1, u.maxXp));
    ctx.fillStyle = 'rgba(18, 15, 12, 0.85)';
    ctx.fillRect(barX, barY, barW, xpBarH);
    ctx.fillStyle = u.combatLevel >= MAX_HERO_COMBAT_LEVEL ? '#f59e0b' : '#38bdf8';
    ctx.fillRect(barX, barY, barW * xpRatio, xpBarH);

    // Top-Right Rarity Tier Numeral (1..5)
    const tierColors = ['#1c1917', '#15803d', '#1d4ed8', '#7e22ce', '#c2410c'];
    const tierFont = Math.max(10, Math.round(cellSize * 0.24));
    const numX = tx + w - Math.max(8, cellSize * 0.18);
    const numY = ty + Math.max(9, cellSize * 0.2);
    ctx.font = `900 ${tierFont}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = 'rgba(252, 249, 240, 0.96)';
    ctx.strokeText(`${u.tier}`, numX, numY);
    ctx.fillStyle = tierColors[Math.min(4, u.tier - 1)];
    ctx.fillText(`${u.tier}`, numX, numY);

    ctx.restore();
  }

  // ==================== 8. BENCH, ENEMIES, BOSSES, PROJECTILES & VFX ====================

  private drawCampBench(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    s: RunState,
    activeUnit: TileUnit | null,
    readyPuzzles: Set<HeroKey>,
    upgradeableHeroes: Set<HeroKey>
  ): void {
    const L = engine.layout;
    const bs = L.benchTileSize;

    const tentImg = Assets.get('icon_tent');
    const isDraggingTile = Boolean(engine.drag?.active && engine.drag.movedEnough);
    const overTent = isDraggingTile && engine.isDraggingOverTent();

    ctx.save();
    if (isDraggingTile && engine.drag) {
      const pulse = 0.65 + 0.35 * Math.sin(this.animClock * 8);
      ctx.fillStyle = overTent ? 'rgba(250, 204, 21, 0.28)' : 'rgba(251, 191, 36, 0.1)';
      this.roundRect(ctx, L.tentX - 3, L.tentY - 3, bs + 6, bs + 6, 8);
      ctx.fill();
      ctx.strokeStyle = overTent
        ? '#fde047'
        : `rgba(251, 191, 36, ${0.55 * pulse})`;
      ctx.lineWidth = overTent ? 2.6 : 1.6;
      ctx.setLineDash(overTent ? [] : [4, 3]);
      this.roundRect(ctx, L.tentX - 3, L.tentY - 3, bs + 6, bs + 6, 8);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (tentImg) {
      const lift = overTent ? -2.5 : 0;
      ctx.drawImage(tentImg, L.tentX - 2, L.tentY - 3 + lift, bs + 4, bs + 6);
    }
    if (isDraggingTile && engine.drag) {
      const refund = engine.getUnitRecycleBuns(engine.drag.unit);
      const pillW = Math.max(30, bs * 0.78);
      const pillH = 15;
      const px = L.tentX + (bs - pillW) * 0.5;
      const py = L.tentY + bs - pillH + 2;
      ctx.fillStyle = overTent ? '#991b1b' : 'rgba(24, 20, 17, 0.9)';
      this.roundRect(ctx, px, py, pillW, pillH, 7);
      ctx.fill();
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      const bunImg = Assets.get('icon_rice');
      if (bunImg) {
        ctx.drawImage(bunImg, px + 3, py + 1.5, 12, 12);
      }
      ctx.fillStyle = '#fde047';
      ctx.font = '800 10px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`+${refund}`, px + (bunImg ? 16 : 6), py + pillH * 0.52);
    }
    ctx.restore();

    for (let i = 0; i < 5; i++) {
      const sx = L.benchX + i * (bs + L.benchGap);
      const sy = L.benchY;

      ctx.save();
      ctx.fillStyle = '#c8c4b8';
      this.roundRect(ctx, sx, sy, bs, bs, 6);
      ctx.fill();
      ctx.strokeStyle = '#3b3731';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();

      const u = s.bench[i];
      if (!u) continue;
      if (
        engine.drag?.active &&
        engine.drag.movedEnough &&
        engine.drag.sourceType === 'bench' &&
        engine.drag.benchIdx === i
      ) {
        continue;
      }

      const def = UNITS[u.unitId];
      let highlight: 'none' | 'merge' | 'awaken' | 'selected' | 'talisman' = 'none';
      if (s.talismanMode && getUnitCircleRange(u).canAttack) {
        highlight = 'talisman';
      } else if (s.selectedSource?.type === 'bench' && s.selectedSource.benchIdx === i) {
        highlight = 'selected';
      } else if (activeUnit && activeUnit.uid !== u.uid) {
        const combo = checkTileCombine(activeUnit, u);
        if (combo) {
          if (combo.mode === 'upgrade_hero') {
            highlight = 'awaken';
          } else if (combo.mode === 'awaken') {
            highlight =
              def.heroKey && engine.findAwakenedHeroOnSide(s, 'player', def.heroKey)
                ? 'none'
                : 'awaken';
          } else {
            highlight = 'merge';
          }
        }
      } else if ((def.category === 'shard1' || def.category === 'shard2') && def.heroKey) {
        if (readyPuzzles.has(def.heroKey)) {
          highlight = 'awaken';
        } else if (upgradeableHeroes.has(def.heroKey)) {
          highlight = 'merge';
        }
      }

      this.drawWarTile(ctx, u, sx + 2, sy + 2, bs - 4, highlight, false, true);
    }
  }

  private drawCombineGuideLinks(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    s: RunState,
    activeUnit: TileUnit
  ): void {
    const L = engine.layout;
    const cs = L.cellSize;
    const bs = L.benchTileSize;

    let srcX = -1;
    let srcY = -1;
    if (engine.drag?.active && engine.drag.movedEnough) {
      srcX = engine.drag.screenX;
      srcY = engine.drag.screenY;
    } else if (s.selectedSource) {
      if (s.selectedSource.type === 'bench') {
        srcX = L.benchX + s.selectedSource.benchIdx * (bs + L.benchGap) + bs * 0.5;
        srcY = L.benchY + bs * 0.5;
      } else {
        const ctr = engine.getUnitBoardCenter(
          activeUnit,
          s.selectedSource.col,
          s.selectedSource.row
        );
        srcX = L.boardX + ctr.x * cs;
        srcY = L.boardY + ctr.y * cs;
      }
    }
    if (srcX < 0) return;

    const targets: { x: number; y: number; gold: boolean }[] = [];
    const seen = new Set<number>();

    const checkCand = (u: TileUnit | null, tx: number, ty: number) => {
      if (!u || u.uid === activeUnit.uid || seen.has(u.uid)) return;
      const combo = checkTileCombine(activeUnit, u);
      if (!combo) return;
      if (combo.mode === 'awaken') {
        const hk = UNITS[u.unitId].heroKey;
        if (hk && engine.findAwakenedHeroOnSide(s, 'player', hk)) return;
      }
      seen.add(u.uid);
      targets.push({
        x: tx,
        y: ty,
        gold: combo.mode === 'awaken' || combo.mode === 'upgrade_hero',
      });
    };

    for (let r = s.stage.dividerRow; r < s.stage.rows; r++) {
      for (let c = 0; c < s.stage.cols; c++) {
        const u = s.board[r][c];
        if (!u || !engine.isPrimaryBoardCell(u, c, r)) continue;
        const ctr = engine.getUnitBoardCenter(u, c, r);
        checkCand(u, L.boardX + ctr.x * cs, L.boardY + ctr.y * cs);
      }
    }

    for (let i = 0; i < 5; i++) {
      const u = s.bench[i];
      if (!u) continue;
      checkCand(u, L.benchX + i * (bs + L.benchGap) + bs * 0.5, L.benchY + bs * 0.5);
    }

    if (targets.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    for (const tgt of targets) {
      const dist = Math.hypot(tgt.x - srcX, tgt.y - srcY);
      if (dist < 14) continue;
      const midX = (srcX + tgt.x) * 0.5;
      const midY = (srcY + tgt.y) * 0.5 - Math.min(28, dist * 0.16);

      ctx.strokeStyle = tgt.gold
        ? 'rgba(250, 204, 21, 0.85)'
        : 'rgba(52, 211, 153, 0.8)';
      ctx.lineWidth = tgt.gold ? 2.4 : 2.0;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -this.animClock * 26;
      ctx.beginPath();
      ctx.moveTo(srcX, srcY);
      ctx.quadraticCurveTo(midX, midY, tgt.x, tgt.y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = tgt.gold ? '#fde047' : '#34d399';
      ctx.beginPath();
      ctx.arc(tgt.x, tgt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawEnemies(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    s: RunState
  ): void {
    const L = engine.layout;
    const cs = L.cellSize;
    const sorted = [...s.enemies].sort((a, b) => a.y - b.y);

    for (const e of sorted) {
      const px = L.boardX + e.x * cs;
      const py = L.boardY + e.y * cs;
      const scaleMult = e.isBoss ? 1.42 : e.isMiniBoss ? 1.24 : e.kind === 'shield' ? 1.02 : 0.92;
      const drawSz = cs * scaleMult;
      const bob = e.stunTimer > 0 ? 0 : Math.abs(Math.sin(this.animClock * 8 + e.id)) * 2.5;

      ctx.save();

      ctx.fillStyle = 'rgba(15, 14, 12, 0.34)';
      ctx.beginPath();
      ctx.ellipse(px, py + drawSz * 0.32, drawSz * 0.28, drawSz * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();

      if (e.isBoss || e.isMiniBoss) {
        const lubuDash = e.bossType === 'lubu' && e.bossSkillTimer < 1.35;
        const bossAura = Assets.get(
          e.regenTimer > 0
            ? 'vfx_heal_ring'
            : lubuDash || e.isBoss
              ? 'vfx_shockwave_crimson'
              : 'vfx_shockwave_gold'
        );
        if (bossAura) {
          ctx.save();
          ctx.translate(px, py + drawSz * 0.28);
          ctx.scale(1, 0.45);
          ctx.rotate(this.animClock * (lubuDash ? 3.2 : 1.4));
          ctx.globalAlpha = 0.85;
          const aSz = drawSz * 0.92;
          ctx.drawImage(bossAura, -aSz * 0.5, -aSz * 0.5, aSz, aSz);
          ctx.restore();
        }
      }

      const key = `enemy_${e.kind}`;
      const img = Assets.get(key);
      if (img) {
        ctx.drawImage(img, px - drawSz * 0.5, py - drawSz * 0.58 - bob, drawSz, drawSz);
        if (e.hitFlash > 0) {
          const fl = Assets.getFlash(key);
          if (fl) {
            ctx.globalAlpha = 0.68;
            ctx.drawImage(fl, px - drawSz * 0.5, py - drawSz * 0.58 - bob, drawSz, drawSz);
            ctx.globalAlpha = 1;
          }
        }
      }

      if (e.regenTimer > 0) {
        const healRing = Assets.get('vfx_heal_ring');
        if (healRing) {
          ctx.save();
          ctx.translate(px, py - drawSz * 0.14);
          ctx.rotate(-this.animClock * 1.8);
          const rSz = drawSz * 0.88;
          ctx.drawImage(healRing, -rSz * 0.5, -rSz * 0.5, rSz, rSz);
          ctx.restore();
        }
      }
      if (e.brittleTimer > 0) {
        const frzIcon = Assets.get('status_freeze');
        if (frzIcon) {
          const iSz = Math.max(12, cs * 0.34);
          ctx.drawImage(frzIcon, px - drawSz * 0.42 - iSz * 0.5, py - drawSz * 0.54 - iSz * 0.5, iSz, iSz);
        }
      }
      if (e.armorBrokenTimer > 0) {
        const brkIcon = Assets.get('status_armor_break');
        if (brkIcon) {
          const iSz = Math.max(12, cs * 0.34);
          ctx.drawImage(brkIcon, px + drawSz * 0.42 - iSz * 0.5, py - drawSz * 0.54 - iSz * 0.5, iSz, iSz);
        }
      }
      if (e.stunTimer > 0) {
        const stnIcon = Assets.get('status_stun');
        if (stnIcon) {
          const iSz = Math.max(14, cs * 0.42);
          ctx.save();
          ctx.translate(px, py - drawSz * 0.68);
          ctx.rotate(this.animClock * 4.5);
          ctx.drawImage(stnIcon, -iSz * 0.5, -iSz * 0.5, iSz, iSz);
          ctx.restore();
        }
      }

      const hpW = cs * (e.isBoss ? 1.1 : e.isMiniBoss ? 0.92 : 0.68);
      const hpH = e.isBoss ? 5.5 : 3.5;
      const hx = px - hpW * 0.5;
      const hy = py - drawSz * 0.56 - 5;
      ctx.fillStyle = 'rgba(18, 16, 14, 0.8)';
      ctx.fillRect(hx, hy, hpW, hpH);
      ctx.fillStyle = e.regenTimer > 0 ? '#22c55e' : e.side === 'ai' ? '#f59e0b' : '#ef4444';
      ctx.fillRect(hx, hy, hpW * Math.max(0, e.hp / e.maxHp), hpH);

      ctx.restore();
    }
  }

  private drawProjectiles(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    list: ProjectileEntity[]
  ): void {
    const L = engine.layout;
    const cs = L.cellSize;

    for (const p of list) {
      const px = L.boardX + p.x * cs;
      const py = L.boardY + p.y * cs;
      const ang = Math.atan2(p.vy, p.vx);

      ctx.save();
      ctx.translate(px, py);

      if (p.kind === 'mortar') {
        const totalD = Math.max(0.25, Math.hypot(p.tx - p.startX, p.ty - p.startY));
        const curD = Math.hypot(p.x - p.startX, p.y - p.startY);
        const prog = Math.min(1, curD / totalD);
        const arcLift = Math.sin(prog * Math.PI) * cs * 0.92;

        // Soft ground shadow under parabolic cannonball
        ctx.fillStyle = 'rgba(15, 14, 12, 0.28)';
        ctx.beginPath();
        ctx.ellipse(0, 0, cs * 0.16, cs * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        const shellImg = Assets.get('vfx_mortar_shell');
        if (shellImg) {
          ctx.translate(0, -arcLift);
          ctx.rotate(this.animClock * 7.5);
          const sz = cs * 0.72;
          ctx.drawImage(shellImg, -sz * 0.5, -sz * 0.5, sz, sz);
        }
      } else if (p.kind === 'boomerang_lance') {
        const sp = Assets.get('vfx_boomerang_lance');
        if (sp) {
          ctx.rotate(this.animClock * 16);
          const sz = cs * 0.98;
          ctx.drawImage(sp, -sz * 0.5, -sz * 0.5, sz, sz);
        }
      } else if (p.kind === 'lance') {
        const sp = Assets.get('vfx_spear_lance');
        if (sp) {
          ctx.rotate(ang);
          const w = cs * 0.98;
          const h = cs * 0.65;
          ctx.drawImage(sp, -w * 0.5, -h * 0.5, w, h);
        }
      } else if (p.kind === 'glaive') {
        const sp = Assets.get('vfx_glaive_wave');
        if (sp) {
          ctx.rotate(ang);
          const sz = cs * 1.32;
          ctx.drawImage(sp, -sz * 0.42, -sz * 0.5, sz, sz);
        }
      } else if (p.kind === 'sun_arrow') {
        const sp = Assets.get('vfx_sun_arrow');
        if (sp) {
          ctx.rotate(ang);
          const w = cs * 1.15;
          const h = cs * 0.76;
          ctx.drawImage(sp, -w * 0.52, -h * 0.5, w, h);
        }
      } else if (p.kind === 'fireball') {
        const sp = Assets.get('vfx_fireball');
        if (sp) {
          ctx.rotate(this.animClock * 9);
          const sz = cs * 0.78;
          ctx.drawImage(sp, -sz * 0.5, -sz * 0.5, sz, sz);
        }
      } else if (p.kind === 'lotus') {
        const sp = Assets.get('vfx_frost_lotus');
        if (sp) {
          ctx.rotate(this.animClock * 4.5);
          const sz = cs * 0.78;
          ctx.drawImage(sp, -sz * 0.5, -sz * 0.5, sz, sz);
        }
      } else if (p.kind === 'chakram') {
        const sp = Assets.get('vfx_chakram');
        if (sp) {
          ctx.rotate(this.animClock * 18);
          const sz = cs * 0.76;
          ctx.drawImage(sp, -sz * 0.5, -sz * 0.5, sz, sz);
        }
      } else if (p.kind === 'dragon') {
        const sp = Assets.get('vfx_dragon_wave');
        if (sp) {
          ctx.rotate(ang);
          const sz = cs * 1.05;
          ctx.drawImage(sp, -sz * 0.42, -sz * 0.5, sz, sz);
        }
      } else if (p.kind === 'phoenix') {
        const sp = Assets.get('vfx_phoenix_arrow');
        if (sp) {
          ctx.rotate(ang);
          const w = cs * 0.92;
          const h = cs * 0.78;
          ctx.drawImage(sp, -w * 0.5, -h * 0.5, w, h);
        }
      } else {
        // 'arrow'
        const sp = Assets.get('vfx_arrow');
        if (sp) {
          ctx.rotate(ang);
          const w = cs * 0.82;
          const h = cs * 0.58;
          ctx.drawImage(sp, -w * 0.5, -h * 0.5, w, h);
        }
      }
      ctx.restore();
    }
  }

  private drawEffects(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    effects: VisualEffect[]
  ): void {
    const L = engine.layout;
    const cs = L.cellSize;

    for (const fx of effects) {
      const tNorm = Math.min(1, fx.timer / fx.duration);
      const alpha = Math.max(0, 1 - Math.pow(tNorm, 1.35));
      const px = L.boardX + fx.x * cs;
      const py = L.boardY + fx.y * cs;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (fx.kind === 'chest_drop') {
        const ring = Assets.get('vfx_shockwave_gold');
        const chest = Assets.get('icon_chest');
        const sz = cs * 1.12;
        const lift = tNorm * cs * 0.78;
        if (ring) {
          const rSz = cs * (1.1 + tNorm * 0.75);
          ctx.drawImage(ring, px - rSz * 0.5, py - rSz * 0.5 - lift * 0.5, rSz, rSz);
        }
        if (chest) {
          ctx.drawImage(chest, px - sz * 0.5, py - sz * 0.5 - lift, sz, sz);
        }
      } else if (fx.kind === 'heavy_chop') {
        const sp = Assets.get('vfx_heavy_chop');
        if (sp) {
          ctx.translate(px, py);
          ctx.rotate(fx.angle || 0);
          const sz = fx.radius * cs * 2.15 * (0.72 + tNorm * 0.34);
          ctx.drawImage(sp, -sz * 0.5, -sz * 0.5, sz, sz);
        }
      } else if (fx.kind === 'lance_beam' && fx.endX !== undefined && fx.endY !== undefined) {
        const sp = Assets.get('vfx_lance_beam');
        if (sp) {
          const ex = L.boardX + fx.endX * cs;
          const ey = L.boardY + fx.endY * cs;
          const len = Math.max(8, Math.hypot(ex - px, ey - py));
          const ang = Math.atan2(ey - py, ex - px);
          const thickness = cs * (0.76 - tNorm * 0.22);
          ctx.translate(px, py);
          ctx.rotate(ang);
          ctx.drawImage(sp, 0, -thickness * 0.5, len, thickness);
        }
      } else if (
        fx.kind === 'slash' ||
        fx.kind === 'slash_cyan' ||
        fx.kind === 'slash_crimson' ||
        fx.kind === 'slash_jade'
      ) {
        const key =
          fx.kind === 'slash_crimson'
            ? 'vfx_slash_crimson'
            : fx.kind === 'slash_jade'
              ? 'vfx_glaive_wave'
              : 'vfx_slash_cyan';
        const sp = Assets.get(key);
        if (sp) {
          ctx.translate(px, py);
          ctx.rotate(fx.angle || 0);
          const sz = fx.radius * cs * 1.95 * (0.72 + tNorm * 0.34);
          ctx.drawImage(sp, -sz * 0.44, -sz * 0.5, sz, sz);
        }
      } else if (
        fx.kind === 'ring' ||
        fx.kind === 'shockwave_gold' ||
        fx.kind === 'shockwave_crimson' ||
        fx.kind === 'heal_ring' ||
        fx.kind === 'merge_burst'
      ) {
        const key =
          fx.kind === 'heal_ring'
            ? 'vfx_heal_ring'
            : fx.kind === 'shockwave_crimson' || fx.color === '#dc2626' || fx.color === '#e11d48'
              ? 'vfx_shockwave_crimson'
              : 'vfx_shockwave_gold';
        const sp = Assets.get(key);
        if (sp) {
          const sz = fx.radius * cs * 2.05 * (0.38 + tNorm * 0.66);
          ctx.translate(px, py);
          ctx.rotate(tNorm * 0.55);
          ctx.drawImage(sp, -sz * 0.5, -sz * 0.5, sz, sz);
        }
      } else if (fx.kind === 'awaken_pillar') {
        const pillar = Assets.get('vfx_awaken_pillar');
        const ring = Assets.get('vfx_shockwave_gold');
        const radPx = fx.radius * cs;
        if (ring) {
          const rSz = radPx * 1.95 * (0.4 + tNorm * 0.65);
          ctx.drawImage(ring, px - rSz * 0.5, py - rSz * 0.5, rSz, rSz);
        }
        if (pillar) {
          const pw = radPx * 1.7;
          const ph = cs * 2.85 * (0.65 + tNorm * 0.35);
          ctx.drawImage(pillar, px - pw * 0.5, py - ph * 0.84, pw, ph);
        }
      } else if (fx.kind === 'explosion') {
        const boom = Assets.get('vfx_explosion');
        const wave = Assets.get('vfx_shockwave_crimson');
        const r = fx.radius * cs;
        if (wave) {
          const wSz = r * 2.15 * (0.42 + tNorm * 0.68);
          ctx.save();
          ctx.globalAlpha = alpha * 0.72;
          ctx.drawImage(wave, px - wSz * 0.5, py - wSz * 0.5, wSz, wSz);
          ctx.restore();
        }
        if (boom) {
          const bSz = r * 2.25 * (0.48 + tNorm * 0.58);
          ctx.translate(px, py);
          ctx.rotate(tNorm * 0.35);
          ctx.drawImage(boom, -bSz * 0.5, -bSz * 0.5, bSz, bSz);
        }
      } else if (fx.kind === 'lightning' && fx.points && fx.points.length >= 2) {
        const bolt = Assets.get('vfx_lightning_arc');
        const spark = Assets.get('vfx_shockwave_gold');
        if (bolt) {
          for (let k = 0; k < fx.points.length - 1; k++) {
            const p0 = fx.points[k];
            const p1 = fx.points[k + 1];
            const x0 = L.boardX + p0.x * cs;
            const y0 = L.boardY + p0.y * cs;
            const x1 = L.boardX + p1.x * cs;
            const y1 = L.boardY + p1.y * cs;
            const segLen = Math.max(10, Math.hypot(x1 - x0, y1 - y0));
            const segAng = Math.atan2(y1 - y0, x1 - x0);
            const thick = cs * 0.72;
            ctx.save();
            ctx.translate(x0, y0);
            ctx.rotate(segAng);
            ctx.drawImage(bolt, 0, -thick * 0.5, segLen, thick);
            ctx.restore();
            if (spark) {
              const sSz = cs * 0.68;
              ctx.drawImage(spark, x1 - sSz * 0.5, y1 - sSz * 0.5, sSz, sSz);
            }
          }
        }
      } else if (fx.kind === 'dragon_ult') {
        const sweepX = L.boardX + L.boardW * tNorm;
        const drg = Assets.get('vfx_dragon_wave');
        const wave = Assets.get('vfx_shockwave_gold');
        if (wave) {
          const wSz = cs * 3.8;
          ctx.drawImage(wave, sweepX - wSz * 0.5, py - wSz * 0.5, wSz, wSz);
        }
        if (drg) {
          const dSz = cs * 3.4;
          ctx.drawImage(drg, sweepX - dSz * 0.5, py - dSz * 0.5, dSz, dSz);
        }
      }

      ctx.restore();
    }
  }

  private drawFloatingTexts(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    s: RunState
  ): void {
    const L = engine.layout;
    const cs = L.cellSize;

    ctx.save();
    ctx.textAlign = 'center';
    for (const ft of s.floatTexts) {
      const alpha = Math.max(0, 1 - ft.timer / ft.duration);
      const px = L.boardX + ft.x * cs;
      const py = L.boardY + ft.y * cs;
      ctx.globalAlpha = alpha;
      ctx.font = `800 ${Math.round(12 * ft.scale)}px Georgia, serif`;
      ctx.strokeStyle = 'rgba(20, 16, 14, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.strokeText(ft.text, px, py);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, px, py);
    }
    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const rr = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
}
