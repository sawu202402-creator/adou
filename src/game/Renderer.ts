import { checkTileCombine, getTierRangeBonus, UNITS } from '../data/units';
import { t } from '../i18n/locale';
import { CellType, DuelLane, TileUnit } from '../types';
import { Assets } from './AssetLoader';
import {
  EnemyEntity,
  GameEngine,
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

    ctx.save();

    // Screen shake on Ultimate / Boss breach / Awakening
    if (s.screenShake > 0) {
      const mag = s.screenShake * 7;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    // 1. Qinglu Shanshui & Xuan-paper atmospheric background
    this.drawBackdrop(ctx, s, viewW, viewH);

    // 2. 8x10 Fortress Duel Board
    this.drawBoardFrameAndCells(ctx, engine, s);

    // 3. Entry chevron markers & VIP Royal Heirs + Heart clusters
    this.drawLaneSpawnArrow(ctx, engine, s.stage.aiLane, '#b91c1c');
    this.drawLaneSpawnArrow(ctx, engine, s.stage.playerLane, '#b91c1c');
    this.drawVipHeirAndHearts(ctx, engine, s, 'ai');
    this.drawVipHeirAndHearts(ctx, engine, s, 'player');

    // 4. Spike Barricades
    this.drawBarricade(ctx, engine, s.aiBarricade);
    this.drawBarricade(ctx, engine, s.playerBarricade);

    // 5. Deployed Board War-Tiles (AI Top Half + Player Bottom Half)
    const activeUnit = this.getActiveHeldUnit(engine, s);
    for (let r = 0; r < s.stage.rows; r++) {
      for (let c = 0; c < s.stage.cols; c++) {
        const u = s.board[r][c];
        if (!u) continue;
        if (
          engine.drag?.active &&
          engine.drag.movedEnough &&
          engine.drag.sourceType === 'board' &&
          engine.drag.col === c &&
          engine.drag.row === r
        ) {
          continue;
        }

        const x = L.boardX + c * L.cellSize;
        const y = L.boardY + r * L.cellSize;
        const isPlayerSide = r >= s.stage.dividerRow;

        let highlight: 'none' | 'merge' | 'awaken' | 'selected' = 'none';
        if (
          s.selectedSource?.type === 'board' &&
          s.selectedSource.col === c &&
          s.selectedSource.row === r
        ) {
          highlight = 'selected';
        } else if (isPlayerSide && activeUnit && activeUnit.uid !== u.uid) {
          const combo = checkTileCombine(activeUnit, u);
          if (combo) highlight = combo.mode;
        }

        this.drawWarTile(ctx, u, x + 2, y + 2, L.cellSize - 4, highlight, !isPlayerSide && s.aiCollapsed);
      }
    }

    // Dim AI top half slightly if AI Rival has already collapsed in Endless mode
    if (s.aiCollapsed) {
      ctx.fillStyle = 'rgba(20, 18, 16, 0.42)';
      ctx.fillRect(L.boardX, L.boardY, L.boardW, s.stage.dividerRow * L.cellSize);
    }

    // 6. Central Great Wall Crenellated Divider between AI (rows 0..4) & Player (rows 5..9)
    this.drawGreatWallDivider(ctx, engine, s);

    // 7. Attack Range Preview Circle when dragging/selecting
    this.drawActiveRangePreview(ctx, engine, s);

    // 8. Enemies
    this.drawEnemies(ctx, engine, s);

    // 9. Projectiles & Ink/Dragon VFX + Floating Damage Numbers
    this.drawProjectiles(ctx, engine, s.projectiles);
    this.drawEffects(ctx, engine, s.effects);
    this.drawFloatingTexts(ctx, engine, s);

    // 10. Player War-Camp Tent & 5-Slot Bench Row
    this.drawCampBench(ctx, engine, s, activeUnit);

    // 11. Floating Dragged Tile under cursor/finger
    if (engine.drag && engine.drag.active && engine.drag.movedEnough) {
      const sz = L.cellSize * 1.06;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.48)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;
      this.drawWarTile(
        ctx,
        engine.drag.unit,
        engine.drag.screenX - sz * 0.5,
        engine.drag.screenY - sz * 0.55,
        sz,
        'selected',
        false
      );
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

    // Distant ink-wash mountain silhouettes & watchtower at top
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

    // Subtle ink grass tufts near top & bottom borders
    ctx.strokeStyle = 'rgba(38, 44, 38, 0.25)';
    ctx.lineWidth = 1.4;
    const step = Math.max(28, Math.floor(viewW / 16));
    for (let x = 14; x < viewW; x += step) {
      const sway = Math.sin(this.animClock * 1.4 + x * 0.05) * 2;
      ctx.beginPath();
      ctx.moveTo(x, 60);
      ctx.quadraticCurveTo(x - 3 + sway, 51, x - 5 + sway, 47);
      ctx.moveTo(x + 4, 61);
      ctx.quadraticCurveTo(x + 6 + sway, 52, x + 8 + sway, 48);
      ctx.stroke();
    }
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

    // Heavy Rosewood & Iron Outer Frame
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
        this.drawSingleCell(ctx, cell, x, y, cs, c, r, isPlayerHalf, s.shovelMode);
      }
    }
  }

  private drawSingleCell(
    ctx: CanvasRenderingContext2D,
    cell: CellType,
    x: number,
    y: number,
    cs: number,
    col: number,
    row: number,
    isPlayerHalf: boolean,
    shovelMode: boolean
  ): void {
    if (cell === 'wall') {
      // Weathered dark bluestone rampart block
      ctx.fillStyle = (col + row) % 2 === 0 ? '#5c6159' : '#535850';
      ctx.fillRect(x, y, cs, cs);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x + 1, y + 1, cs - 2, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(x + 1, y + cs - 4, cs - 2, 3);
      ctx.strokeStyle = '#2b2d29';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
      return;
    }

    if (cell === 'path' || cell === 'vip') {
      // Pale limestone flagstone road
      ctx.fillStyle = (col + row) % 2 === 0 ? '#ccc9be' : '#c3c0b4';
      ctx.fillRect(x, y, cs, cs);
      ctx.strokeStyle = 'rgba(65, 62, 55, 0.28)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
      return;
    }

    if (cell === 'locked') {
      // Deep slate-basalt locked slot (excavatable with Golden Shovel!)
      ctx.fillStyle = (col + row) % 2 === 0 ? '#6e726b' : '#666a63';
      ctx.fillRect(x, y, cs, cs);
      ctx.strokeStyle = '#3b3e39';
      ctx.lineWidth = 1.25;
      ctx.strokeRect(x + 1, y + 1, cs - 2, cs - 2);

      // Subtle inner stone bevel
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.strokeRect(x + 4, y + 4, cs - 8, cs - 8);

      // Highlight player's locked cells when Shovel Mode is toggled!
      if (shovelMode && isPlayerHalf) {
        const pulse = 0.55 + 0.4 * Math.sin(this.animClock * 6.5);
        ctx.save();
        ctx.strokeStyle = `rgba(250, 204, 21, ${pulse})`;
        ctx.lineWidth = 2.4;
        ctx.strokeRect(x + 2.5, y + 2.5, cs - 5, cs - 5);
        const shImg = Assets.get('icon_shovel');
        if (shImg) {
          ctx.globalAlpha = 0.72;
          ctx.drawImage(shImg, x + cs * 0.24, y + cs * 0.24, cs * 0.52, cs * 0.52);
        }
        ctx.restore();
      }
      return;
    }

    if (cell === 'deploy') {
      // Mutton-Fat White Jade Pedestal (羊脂白玉阵位)
      const jGrad = ctx.createLinearGradient(x, y, x, y + cs);
      jGrad.addColorStop(0, '#fbf8ef');
      jGrad.addColorStop(1, '#ebe3d1');
      ctx.fillStyle = jGrad;
      ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);

      ctx.strokeStyle = '#b7ab93';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x + 1.5, y + 1.5, cs - 3, cs - 3);

      // Subtle classical jade fretwork corner ticks
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

  // ==================== 3. ENTRY ARROWS, VIP HEIR & GREAT WALL DIVIDER ====================

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

    // Royal silk mat glow
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

    // Draw miniature Crimson Heart Grid on the adjacent wall cell (just like reference image!)
    // For AI (vip at row 4, col 0), heart cluster sits at top of VIP or row 3/4 border
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
    // Rosewood spiked gate planks (referencing the iconic wooden spike barricade)
    const pad = cs * 0.08;
    ctx.fillStyle = '#9c5a49';
    this.roundRect(ctx, x + pad, y + pad, cs - pad * 2, cs - pad * 2, 4);
    ctx.fill();
    ctx.strokeStyle = '#3b1d16';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Vertical plank seam + rivets
    ctx.beginPath();
    ctx.moveTo(x + cs * 0.5, y + pad);
    ctx.lineTo(x + cs * 0.5, y + cs - pad);
    ctx.stroke();

    // Ivory/Iron spikes along outer edge
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

    // Durability bar if damaged
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
    // Stone parapet band
    ctx.fillStyle = '#363833';
    ctx.fillRect(L.boardX - 2, y - 4, L.boardW + 4, 8);

    // Crenellated battlements (城垛齿纹)
    ctx.fillStyle = '#4e524b';
    ctx.strokeStyle = '#1f211e';
    ctx.lineWidth = 1;
    const merlonW = Math.max(10, Math.floor(L.cellSize * 0.34));
    for (let mx = L.boardX + 4; mx < L.boardX + L.boardW - merlonW; mx += merlonW * 1.7) {
      ctx.fillRect(mx, y - 4, merlonW, 8);
      ctx.strokeRect(mx, y - 4, merlonW, 8);
    }

    // Subtle Rival & Player badges on the parapet edges
    const dict = t();
    ctx.font = '700 10px "STKaiti", "KaiTi", "Noto Serif SC", Georgia, serif';
    ctx.textBaseline = 'middle';

    // Left badge: Rival AI status
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

    // Right badge: Player status
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

  // ==================== 5. JADE & XUAN-PAPER MAHJONG WAR-TILES ====================

  public drawWarTile(
    ctx: CanvasRenderingContext2D,
    u: TileUnit,
    x: number,
    y: number,
    size: number,
    highlight: 'none' | 'merge' | 'awaken' | 'selected',
    dimmed: boolean
  ): void {
    const def = UNITS[u.unitId];
    const isAwakened = def.category === 'awakened';
    const isPart = def.category === 'soul' || def.category === 'weapon';

    ctx.save();
    if (dimmed) ctx.globalAlpha = 0.52;

    // Pop-in / attack recoil transform
    let cx = x + size * 0.5;
    let cy = y + size * 0.5;
    let scale = 1;
    if (u.mergeAnimTimer > 0) {
      scale = 1 + Math.sin((u.mergeAnimTimer / 0.25) * Math.PI) * 0.16;
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

    // Interactive Merge / 2-Tile Awakening Halo
    if (highlight !== 'none') {
      const pulse = 0.65 + 0.35 * Math.sin(this.animClock * 7.5);
      ctx.save();
      ctx.strokeStyle =
        highlight === 'awaken'
          ? `rgba(250, 204, 21, ${pulse})`
          : highlight === 'merge'
            ? `rgba(52, 211, 153, ${pulse})`
            : 'rgba(251, 191, 36, 0.95)';
      ctx.lineWidth = highlight === 'awaken' ? 3.2 : 2.4;
      ctx.shadowColor = highlight === 'awaken' ? '#facc15' : '#34d399';
      ctx.shadowBlur = highlight === 'awaken' ? 14 : 8;
      this.roundRect(ctx, tx - 2, ty - 2, size + 4, size + 4, rad + 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3D Carved Mahjong Block Base Lip
    ctx.fillStyle = isAwakened ? '#784b08' : isPart ? def.frameColor : '#b5aa94';
    this.roundRect(ctx, tx, ty + lip, size, size - lip, rad);
    ctx.fill();

    // Upper Tile Face
    const faceH = size - lip;
    if (isAwakened) {
      const g = ctx.createLinearGradient(tx, ty, tx + size, ty + faceH);
      g.addColorStop(0, '#fef3c7');
      g.addColorStop(0.5, '#f5d061');
      g.addColorStop(1, '#d4af37');
      ctx.fillStyle = g;
    } else {
      const g = ctx.createLinearGradient(tx, ty, tx, ty + faceH);
      g.addColorStop(0, '#fcf9f0');
      g.addColorStop(1, '#ede5d2');
      ctx.fillStyle = g;
    }
    this.roundRect(ctx, tx, ty, size, faceH, rad);
    ctx.fill();

    // Clipped Inner Gongbi Artwork Painting
    const pad = isAwakened ? Math.max(3, size * 0.075) : Math.max(2.5, size * 0.06);
    ctx.save();
    this.roundRect(ctx, tx + pad, ty + pad, size - pad * 2, faceH - pad * 2, Math.max(3, rad - 2));
    ctx.clip();

    const sprite = Assets.get(def.spriteKey);
    if (sprite) {
      ctx.drawImage(sprite, tx + pad, ty + pad, size - pad * 2, faceH - pad * 2);
    }
    ctx.restore();

    // Category-Specific Inner & Outer Borders
    if (isAwakened) {
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1.6;
      this.roundRect(ctx, tx + pad, ty + pad, size - pad * 2, faceH - pad * 2, Math.max(3, rad - 2));
      ctx.stroke();

      ctx.strokeStyle = '#784b08';
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, tx, ty, size, faceH, rad);
      ctx.stroke();
    } else if (isPart) {
      // Color-coded Silk Frame linking [General Soul] <-> [Divine Weapon]
      ctx.strokeStyle = def.accentColor;
      ctx.lineWidth = 2.2;
      this.roundRect(ctx, tx + 1, ty + 1, size - 2, faceH - 2, rad);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#3d352e';
      ctx.lineWidth = 1.4;
      this.roundRect(ctx, tx, ty, size, faceH, rad);
      ctx.stroke();
    }

    // Top-Left Non-Hanzi Pairing Crest Badge for Souls, Weapons & Awakened Generals
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

    // Bottom-Center Split-Jade Tally Indicator (◐ on Soul + ◑ on Weapon = ● Awakened!)
    if (isPart) {
      const tallyR = Math.max(4.5, size * 0.105);
      const jx = 0;
      const jy = ty + faceH - tallyR - 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(jx, jy, tallyR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(28, 25, 23, 0.78)';
      ctx.fill();

      // Lit half of the jade seal (Left half for Soul, Right half for Weapon!)
      ctx.beginPath();
      if (def.category === 'soul') {
        ctx.arc(jx, jy, tallyR - 1, Math.PI * 0.5, Math.PI * 1.5);
      } else {
        ctx.arc(jx, jy, tallyR - 1, -Math.PI * 0.5, Math.PI * 0.5);
      }
      ctx.closePath();
      ctx.fillStyle = '#fde047';
      ctx.fill();

      ctx.strokeStyle = def.accentColor;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(jx, jy, tallyR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Awakened Hero Skill Pips at bottom of tile
    if (isAwakened && def.skillEveryN) {
      const n = def.skillEveryN;
      const cur = u.attackCount % n;
      const pipW = Math.min(8, (size - 14) / n - 2);
      const totalW = n * pipW + (n - 1) * 2;
      let px = -totalW * 0.5;
      const py = ty + faceH - 5.5;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i < cur ? '#fde047' : 'rgba(28,25,23,0.55)';
        ctx.fillRect(px, py, pipW, 3);
        px += pipW + 2;
      }
    }

    // Top-Right Universal Arabic Tier Numeral (1..4)
    const tierFont = Math.max(9, Math.round(size * 0.22));
    const numX = tx + size - Math.max(7, size * 0.16);
    const numY = ty + Math.max(8, size * 0.18);
    ctx.font = `900 ${tierFont}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = 'rgba(252, 249, 240, 0.92)';
    ctx.strokeText(`${u.tier}`, numX, numY);
    ctx.fillStyle = u.tier >= 3 ? '#b91c1c' : '#1c1917';
    ctx.fillText(`${u.tier}`, numX, numY);

    ctx.restore();
  }

  // ==================== 7. RANGE PREVIEW & CAMP BENCH ====================

  private drawActiveRangePreview(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    s: RunState
  ): void {
    const L = engine.layout;
    const cs = L.cellSize;

    let gx = -1;
    let gy = -1;
    let unit: TileUnit | null = null;

    if (engine.drag?.active && engine.drag.movedEnough) {
      const col = Math.floor((engine.drag.screenX - L.boardX) / cs);
      const row = Math.floor((engine.drag.screenY - L.boardY) / cs);
      if (col >= 0 && col < s.stage.cols && row >= s.stage.dividerRow && row < s.stage.rows) {
        gx = L.boardX + (col + 0.5) * cs;
        gy = L.boardY + (row + 0.5) * cs;
        unit = engine.drag.unit;
      }
    } else if (s.selectedSource?.type === 'board') {
      gx = L.boardX + (s.selectedSource.col + 0.5) * cs;
      gy = L.boardY + (s.selectedSource.row + 0.5) * cs;
      unit = s.board[s.selectedSource.row][s.selectedSource.col];
    }

    if (!unit || gx < 0) return;

    const def = UNITS[unit.unitId];
    const rPx = (def.rangeCells + getTierRangeBonus(unit.tier)) * cs;

    ctx.save();
    ctx.beginPath();
    ctx.arc(gx, gy, rPx, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(212, 175, 55, 0.1)';
    ctx.fill();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }

  private drawCampBench(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    s: RunState,
    activeUnit: TileUnit | null
  ): void {
    const L = engine.layout;
    const bs = L.benchTileSize;

    // War-Camp Tent Emblem on the left (Zero Hanzi!)
    const tentImg = Assets.get('icon_tent');
    if (tentImg) {
      ctx.drawImage(tentImg, L.tentX - 2, L.tentY - 3, bs + 4, bs + 6);
    }

    // 5 Carved Stone/Jade Bench Slots
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

      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      this.roundRect(ctx, sx + 3, sy + 3, bs - 6, bs - 6, 4);
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

      let highlight: 'none' | 'merge' | 'awaken' | 'selected' = 'none';
      if (s.selectedSource?.type === 'bench' && s.selectedSource.benchIdx === i) {
        highlight = 'selected';
      } else if (activeUnit && activeUnit.uid !== u.uid) {
        const combo = checkTileCombine(activeUnit, u);
        if (combo) highlight = combo.mode;
      }

      this.drawWarTile(ctx, u, sx + 2, sy + 2, bs - 4, highlight, false);
    }
  }

  // ==================== 8. ENEMIES, PROJECTILES & GUOFENG VFX ====================

  private drawEnemies(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    s: RunState
  ): void {
    const L = engine.layout;
    const cs = L.cellSize;

    // Sort by Y so depth overlaps cleanly
    const sorted = [...s.enemies].sort((a, b) => a.y - b.y);

    for (const e of sorted) {
      const px = L.boardX + e.x * cs;
      const py = L.boardY + e.y * cs;
      const scaleMult = e.isBoss ? 1.38 : e.isMiniBoss ? 1.18 : e.kind === 'shield' ? 1.02 : 0.92;
      const drawSz = cs * scaleMult;
      const bob = e.stunTimer > 0 ? 0 : Math.abs(Math.sin(this.animClock * 8 + e.id)) * 2.5;

      ctx.save();

      // Ground ink shadow
      ctx.fillStyle = 'rgba(15, 14, 12, 0.34)';
      ctx.beginPath();
      ctx.ellipse(px, py + drawSz * 0.32, drawSz * 0.28, drawSz * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Boss / Mini-boss crimson-gold aura ring
      if (e.isBoss || e.isMiniBoss) {
        ctx.strokeStyle = e.isBoss ? 'rgba(220, 38, 38, 0.7)' : 'rgba(217, 119, 6, 0.6)';
        ctx.lineWidth = 2;
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

      // Status overlays (Frost / Stun)
      if (e.slowTimer > 0) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(px, py - drawSz * 0.1, drawSz * 0.32, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (e.stunTimer > 0) {
        ctx.fillStyle = '#facc15';
        ctx.font = '700 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✦', px, py - drawSz * 0.58);
      }

      // Crisp Enemy HP Bar
      const hpW = cs * (e.isBoss ? 1.05 : 0.68);
      const hpH = e.isBoss ? 5 : 3.5;
      const hx = px - hpW * 0.5;
      const hy = py - drawSz * 0.56 - 5;
      ctx.fillStyle = 'rgba(18, 16, 14, 0.78)';
      ctx.fillRect(hx, hy, hpW, hpH);
      ctx.fillStyle = e.side === 'ai' ? '#f59e0b' : '#ef4444';
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
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(0, 0, cs * 0.13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(-2, -2, cs * 0.06, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'dragon' || p.kind === 'glaive') {
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

      if (fx.kind === 'slash') {
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
        // Golden Hero Synthesis Pillar of Light!
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
        ctx.fillRect(L.boardX, L.dividerY, L.boardW, L.boardH - sStageHalfH(engine));
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
