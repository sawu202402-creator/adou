import {
  checkTileCombine,
  getUnitCircleRange,
  MAX_HERO_COMBAT_LEVEL,
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

    // 10. Floating Dragged Tile (1x1 or 2-Cell Double Plaque!)
    if (engine.drag && engine.drag.active && engine.drag.movedEnough) {
      const du = engine.drag.unit;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.48)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;
      if (du.cellSpan === 2) {
        const hoverCol = Math.floor((engine.drag.screenX - L.boardX) / L.cellSize);
        const hoverRow = Math.floor((engine.drag.screenY - L.boardY) / L.cellSize);
        const defaultHoriz = du.anchorRow === du.secRow;
        const preview = engine.previewTwoCellPlacement(hoverCol, hoverRow, defaultHoriz, du.uid);
        const isHoriz = preview ? preview.r1 === preview.r2 : defaultHoriz;
        const w = (isHoriz ? 2 : 1) * L.cellSize * 1.02 - 4;
        const h = (isHoriz ? 1 : 2) * L.cellSize * 1.02 - 4;
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

    ctx.save();
    ctx.fillStyle = 'rgba(42, 48, 44, 0.16)';
    ctx.beginPath();
    ctx.moveTo(0, 68);
    ctx.quadraticCurveTo(viewW * 0.2, 22, viewW * 0.42, 52);
    ctx.quadraticCurveTo(viewW * 0.68, 14, viewW, 56);
    ctx.lineTo(viewW, 85);
    ctx.lineTo(0, 85);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
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
      const fade = Math.min(1, z.timer / 0.45);

      ctx.save();
      ctx.globalAlpha = 0.85 * fade;

      if (z.kind === 'thunder_sigil') {
        const g = ctx.createRadialGradient(px, py, 2, px, py, radPx);
        g.addColorStop(0, 'rgba(250, 204, 21, 0.28)');
        g.addColorStop(0.65, 'rgba(99, 102, 241, 0.2)');
        g.addColorStop(1, 'rgba(99, 102, 241, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, radPx, 0, Math.PI * 2);
        ctx.fill();

        // Rotating Eight-Trigrams Octagon
        ctx.translate(px, py);
        ctx.rotate(this.animClock * 1.3);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          const ox = Math.cos(a) * radPx * 0.78;
          const oy = Math.sin(a) * radPx * 0.78;
          if (i === 0) ctx.moveTo(ox, oy);
          else ctx.lineTo(ox, oy);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(165, 180, 252, 0.75)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, radPx * 0.44, 0, Math.PI * 2);
        ctx.stroke();
      } else if (z.kind === 'frost_zone') {
        const g = ctx.createRadialGradient(px, py, 2, px, py, radPx);
        g.addColorStop(0, 'rgba(186, 230, 253, 0.36)');
        g.addColorStop(0.68, 'rgba(56, 189, 248, 0.22)');
        g.addColorStop(1, 'rgba(14, 165, 233, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, radPx, 0, Math.PI * 2);
        ctx.fill();

        ctx.translate(px, py);
        ctx.rotate(-this.animClock * 1.1);
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.82)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * radPx * 0.72, Math.sin(a) * radPx * 0.72);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, radPx * 0.82, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // 'fire_patch'
        const pulse = 0.88 + 0.12 * Math.sin(this.animClock * 10);
        const g = ctx.createRadialGradient(px, py, 2, px, py, radPx * pulse);
        g.addColorStop(0, 'rgba(254, 240, 138, 0.38)');
        g.addColorStop(0.55, 'rgba(249, 115, 22, 0.28)');
        g.addColorStop(1, 'rgba(220, 38, 38, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, radPx * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(251, 146, 60, 0.72)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(px, py, radPx * 0.78, 0, Math.PI * 2);
        ctx.stroke();
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
          const preferHoriz = dragUnit.anchorRow === dragUnit.secRow;
          twoCellFootprint = engine.previewTwoCellPlacement(col, row, preferHoriz, dragUnit.uid);
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
          // Previewing 1/2 + 2/2 fusion into a unique 2-Cell Awakened General right on the board!
          twoCellFootprint = engine.previewTwoCellPlacement(col, row, true, dragUnit.uid);
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

    // Check if circle reaches at least one road cell on this side
    let hitsRoad = !blockedTwoCell;
    if (hitsRoad) {
      hitsRoad = false;
      for (let r = rStart; r < rEnd && !hitsRoad; r++) {
        for (let c = 0; c < s.stage.cols; c++) {
          if (s.cells[r][c] !== 'path') continue;
          const d = Math.hypot(c + 0.5 - centerGridX, r + 0.5 - centerGridY);
          if (d + 0.35 >= rangeInfo.minR && d - 0.35 <= rangeInfo.maxR) {
            hitsRoad = true;
            break;
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
    color: string
  ): void {
    if (lane.waypoints.length < 2) return;
    const L = engine.layout;
    const cs = L.cellSize;
    const w0 = lane.waypoints[0];
    const w1 = lane.waypoints[1];
    const cx = L.boardX + (w0.col + 0.5) * cs;
    const cy = L.boardY + (w0.row + 0.5) * cs;
    const ang = Math.atan2(w1.row - w0.row, w1.col - w0.col);

    const pulse = 0.45 + 0.25 * Math.sin(this.animClock * 4.2);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2.5, cs * 0.08);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const r = cs * 0.22;
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r);
    ctx.lineTo(r * 0.5, 0);
    ctx.lineTo(-r * 0.7, r);
    ctx.stroke();
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
    const glow = ctx.createRadialGradient(
      vx + cs * 0.5,
      vy + cs * 0.5,
      2,
      vx + cs * 0.5,
      vy + cs * 0.5,
      cs * 0.48
    );
    glow.addColorStop(0, 'rgba(212, 175, 55, 0.35)');
    glow.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(vx, vy, cs, cs);

    const vipImg = Assets.get('vip_lord');
    if (vipImg) {
      const bob = Math.sin(this.animClock * 2.6 + (side === 'ai' ? 1.5 : 0)) * 1.5;
      ctx.drawImage(vipImg, vx + cs * 0.06, vy + cs * 0.06 + bob, cs * 0.88, cs * 0.88);
    }

    const heartAnchorY = side === 'ai' ? vy - cs * 0.32 : vy - cs * 0.28;
    const colsPerRow = 4;
    const hSize = Math.max(6, cs * 0.16);
    const startX = vx + (cs - colsPerRow * (hSize + 2)) * 0.5;
    const shownHearts = Math.min(12, hearts);

    for (let i = 0; i < shownHearts; i++) {
      const hc = i % colsPerRow;
      const hr = Math.floor(i / colsPerRow);
      const hx = startX + hc * (hSize + 2) + hSize * 0.5;
      const hy = heartAnchorY - hr * (hSize + 1.5);
      this.drawTinyHeart(ctx, hx, hy, hSize * 0.52);
    }
    ctx.restore();
  }

  private drawTinyHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, r * 0.85);
    ctx.bezierCurveTo(-r * 1.3, r * 0.1, -r * 1.2, -r * 0.95, 0, -r * 0.35);
    ctx.bezierCurveTo(r * 1.2, -r * 0.95, r * 1.3, r * 0.1, 0, r * 0.85);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#450a0a';
    ctx.lineWidth = 1;
    ctx.stroke();
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
    const shake = bar.shakeTimer > 0 ? (Math.random() - 0.5) * 4 : 0;
    const x = L.boardX + bar.col * cs + shake;
    const y = L.boardY + bar.row * cs;

    ctx.save();
    const pad = cs * 0.08;
    ctx.fillStyle = '#9c5a49';
    this.roundRect(ctx, x + pad, y + pad, cs - pad * 2, cs - pad * 2, 4);
    ctx.fill();
    ctx.strokeStyle = '#3b1d16';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + cs * 0.5, y + pad);
    ctx.lineTo(x + cs * 0.5, y + cs - pad);
    ctx.stroke();

    ctx.fillStyle = '#f5efe0';
    ctx.strokeStyle = '#3b1d16';
    ctx.lineWidth = 1.1;
    for (let i = 0; i < 3; i++) {
      const sy = y + cs * (0.24 + i * 0.26);
      const dir = bar.side === 'ai' ? 1 : -1;
      const baseX = bar.side === 'ai' ? x + cs * 0.54 : x + cs * 0.46;
      ctx.beginPath();
      ctx.moveTo(baseX, sy - cs * 0.09);
      ctx.lineTo(baseX + dir * cs * 0.24, sy);
      ctx.lineTo(baseX, sy + cs * 0.09);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    if (bar.hp < bar.maxHp) {
      const bw = cs * 0.78;
      const bx = x + (cs - bw) * 0.5;
      const by = y + cs - 7;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
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

    // Top-Left Non-Hanzi Pairing Crest
    if (def.crestSymbol) {
      const bR = Math.max(6.5, size * 0.16);
      const bx = tx + bR + 2;
      const by = ty + bR + 2;
      ctx.fillStyle = isAwakened ? '#7c2d12' : def.frameColor;
      ctx.beginPath();
      ctx.arc(bx, by, bR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#fef3c7';
      ctx.font = `700 ${Math.round(bR * 1.25)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.crestSymbol, bx, by + 0.5);
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

    // Top-Left Non-Hanzi Totem Crest Badge
    if (def.crestSymbol) {
      const bR = Math.max(6.5, cellSize * 0.16);
      const bx = tx + bR + 2.5;
      const by = ty + bR + 2.5;
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.arc(bx, by, bR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      ctx.fillStyle = '#fef3c7';
      ctx.font = `700 ${Math.round(bR * 1.25)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.crestSymbol, bx, by + 0.5);
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
    if (tentImg) {
      ctx.drawImage(tentImg, L.tentX - 2, L.tentY - 3, bs + 4, bs + 6);
    }

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
        ctx.strokeStyle = e.regenTimer > 0 ? '#22c55e' : lubuDash ? '#f97316' : e.isBoss ? '#dc2626' : '#eab308';
        ctx.lineWidth = lubuDash ? 3 : 2.2;
        ctx.beginPath();
        ctx.ellipse(px, py + drawSz * 0.3, drawSz * 0.36, drawSz * 0.15, 0, 0, Math.PI * 2);
        ctx.stroke();
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
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py - drawSz * 0.15, drawSz * 0.38, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (e.brittleTimer > 0) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(px, py - drawSz * 0.15, drawSz * 0.34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#bae6fd';
        ctx.font = '700 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('❖', px - drawSz * 0.3, py - drawSz * 0.45);
      }
      if (e.armorBrokenTimer > 0) {
        ctx.fillStyle = '#4ade80';
        ctx.font = '700 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▾', px + drawSz * 0.3, py - drawSz * 0.45);
      }
      if (e.stunTimer > 0) {
        ctx.fillStyle = '#facc15';
        ctx.font = '700 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✦', px, py - drawSz * 0.58);
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
        const arcLift = Math.sin(prog * Math.PI) * cs * 0.88;

        // Ground shadow
        ctx.fillStyle = 'rgba(15, 14, 12, 0.32)';
        ctx.beginPath();
        ctx.ellipse(0, 0, cs * 0.13, cs * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();

        // Parabolic iron cannonball + fuse spark
        ctx.translate(0, -arcLift);
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(0, 0, cs * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(-2.5, -2.5, cs * 0.07, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'boomerang_lance') {
        // Zhao Yun's Spinning Silver Dragon Boomerang Spear!
        ctx.rotate(this.animClock * 18);
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = Math.max(2.5, cs * 0.08);
        ctx.beginPath();
        ctx.moveTo(-cs * 0.38, 0);
        ctx.lineTo(cs * 0.38, 0);
        ctx.stroke();

        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(2, cs * 0.06);
        ctx.beginPath();
        ctx.arc(0, 0, cs * 0.32, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'lance') {
        // Spear Piercing Lance: long crimson-gold shaft + silver tip
        ctx.rotate(ang);
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = Math.max(2.4, cs * 0.075);
        ctx.beginPath();
        ctx.moveTo(-cs * 0.36, 0);
        ctx.lineTo(cs * 0.22, 0);
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(cs * 0.38, 0);
        ctx.lineTo(cs * 0.14, -cs * 0.09);
        ctx.lineTo(cs * 0.14, cs * 0.09);
        ctx.closePath();
        ctx.fill();
      } else if (p.kind === 'glaive') {
        // Guan Yu Wide Emerald Crescent Wave
        ctx.rotate(ang);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = cs * 0.17;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, cs * 0.48, -0.95, 0.95);
        ctx.stroke();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = cs * 0.06;
        ctx.beginPath();
        ctx.arc(0, 0, cs * 0.5, -0.8, 0.8);
        ctx.stroke();
      } else if (p.kind === 'dragon') {
        ctx.rotate(ang);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = cs * 0.14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, cs * 0.36, -0.85, 0.85);
        ctx.stroke();
      } else {
        ctx.rotate(ang);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(cs * 0.22, 0);
        ctx.lineTo(-cs * 0.16, -cs * 0.06);
        ctx.lineTo(-cs * 0.16, cs * 0.06);
        ctx.closePath();
        ctx.fill();
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
      const alpha = 1 - tNorm;
      const px = L.boardX + fx.x * cs;
      const py = L.boardY + fx.y * cs;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (fx.kind === 'chest_drop') {
        const chest = Assets.get('icon_chest');
        const sz = cs * 1.15;
        const lift = tNorm * cs * 0.8;
        if (chest) {
          ctx.drawImage(chest, px - sz * 0.5, py - sz * 0.5 - lift, sz, sz);
        }
      } else if (fx.kind === 'heavy_chop') {
        // Single-Target Heavy Blade Guillotine Strike!
        ctx.translate(px, py);
        ctx.rotate(fx.angle || 0);
        const r = fx.radius * cs * (0.65 + tNorm * 0.35);
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = Math.max(3.5, cs * 0.13 * (1 - tNorm * 0.4));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-r, -r * 0.65);
        ctx.lineTo(r, r * 0.65);
        ctx.stroke();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = Math.max(2, cs * 0.06 * (1 - tNorm * 0.4));
        ctx.beginPath();
        ctx.moveTo(-r * 0.7, r * 0.55);
        ctx.lineTo(r * 0.7, -r * 0.55);
        ctx.stroke();
      } else if (fx.kind === 'lance_beam' && fx.endX !== undefined && fx.endY !== undefined) {
        // Straight Piercing Spear Beam Trail
        const ex = L.boardX + fx.endX * cs;
        const ey = L.boardY + fx.endY * cs;
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = Math.max(2.6, cs * 0.09 * (1 - tNorm * 0.5));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      } else if (fx.kind === 'slash') {
        ctx.translate(px, py);
        ctx.rotate(fx.angle || 0);
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = Math.max(3, cs * 0.11 * (1 - tNorm * 0.5));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, fx.radius * cs * (0.65 + tNorm * 0.35), -0.95, 0.95);
        ctx.stroke();
      } else if (fx.kind === 'ring' || fx.kind === 'heal_ring' || fx.kind === 'merge_burst') {
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = fx.kind === 'merge_burst' ? 3.5 : 2.4;
        ctx.beginPath();
        ctx.arc(px, py, fx.radius * cs * (0.25 + tNorm * 0.75), 0, Math.PI * 2);
        ctx.stroke();
      } else if (fx.kind === 'awaken_pillar') {
        const radPx = fx.radius * cs * (0.3 + tNorm * 0.7);
        const pGrad = ctx.createLinearGradient(px, py - cs * 2.2, px, py + cs * 0.4);
        pGrad.addColorStop(0, 'rgba(250, 204, 21, 0)');
        pGrad.addColorStop(0.5, 'rgba(250, 204, 21, 0.65)');
        pGrad.addColorStop(1, fx.color);
        ctx.fillStyle = pGrad;
        ctx.fillRect(px - cs * 0.38, py - cs * 2.2, cs * 0.76, cs * 2.5);

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, py, radPx, 0, Math.PI * 2);
        ctx.stroke();
      } else if (fx.kind === 'explosion') {
        const r = fx.radius * cs * (0.3 + tNorm * 0.7);
        const g = ctx.createRadialGradient(px, py, 2, px, py, r);
        g.addColorStop(0, '#fef08a');
        g.addColorStop(0.5, fx.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (fx.kind === 'lightning' && fx.points && fx.points.length >= 2) {
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        fx.points.forEach((pt, idx) => {
          const lx = L.boardX + pt.x * cs;
          const ly = L.boardY + pt.y * cs;
          if (idx === 0) ctx.moveTo(lx, ly);
          else ctx.lineTo(lx, ly);
        });
        ctx.stroke();
      } else if (fx.kind === 'dragon_ult') {
        const sweepX = L.boardX + L.boardW * tNorm;
        const g = ctx.createRadialGradient(sweepX, py, 8, sweepX, py, cs * 2.8);
        g.addColorStop(0, '#e0f2fe');
        g.addColorStop(0.45, fx.color);
        g.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = g;
        const halfH = sStageHalfH(engine);
        ctx.fillRect(L.boardX, L.dividerY, L.boardW, L.boardH - halfH);
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

function sStageHalfH(engine: GameEngine): number {
  const s = engine.state;
  if (!s) return 0;
  return s.stage.dividerRow * engine.layout.cellSize;
}
