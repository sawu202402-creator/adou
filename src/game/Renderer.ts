import { getTierRangeBonus, MAX_TILE_TIER, UNITS } from '../data/units';
import { Assets } from './AssetLoader';
import {
  BattleState,
  EnemyEntity,
  GameEngine,
  ProjectileEntity,
  VisualEffect,
} from './GameEngine';
import { TileUnit } from '../types';

const ENEMY_SPRITES: Record<string, string> = {
  grunt: 'enemy_grunt',
  wolf: 'enemy_wolf',
  shield: 'enemy_shield',
  shaman: 'enemy_shaman',
  ram: 'enemy_ram',
  lubu: 'enemy_lubu',
};

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export class BoardRenderer {
  private animClock = 0;

  public render(ctx: CanvasRenderingContext2D, engine: GameEngine, viewW: number, viewH: number, dt: number): void {
    this.animClock += dt;
    const s = engine.state;

    // 1) Atmospheric ink-watercolor background
    this.drawBackdrop(ctx, s?.stage.theme ?? 'pass', viewW, viewH);

    if (!s) return;

    const L = engine.layout;
    ctx.save();

    if (s.screenShake > 0) {
      const mag = s.screenShake * 8;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    // 2) Outer fortress frame around the 8x9 grid
    ctx.fillStyle = '#262925';
    roundRectPath(ctx, L.boardX - 5, L.boardY - 5, L.boardW + 10, L.boardH + 10, 8);
    ctx.fill();

    // 3) Draw 8x9 Grid Cells
    this.drawGridCells(ctx, engine, s);

    // 4) Draw Lane Direction Chevrons on Path
    this.drawPathChevrons(ctx, engine, s);

    // 5) Draw Active Range Preview if dragging or selecting a unit
    this.drawRangePreview(ctx, engine, s);

    // 6) Draw Spike Barricades & Protected Young Lord Cradles + Heart Clusters
    this.drawBarricadesAndVips(ctx, engine, s);

    // 7) Draw Deployed Mahjong War-Tiles on Board
    for (let r = 0; r < s.stage.rows; r++) {
      for (let c = 0; c < s.stage.cols; c++) {
        const tile = s.board[r][c];
        if (!tile) continue;
        // Skip original slot if actively dragging it
        if (
          engine.drag?.moved &&
          engine.drag.sourceType === 'board' &&
          engine.drag.col === c &&
          engine.drag.row === r
        ) {
          continue;
        }
        const x = L.boardX + c * L.cellSize;
        const y = L.boardY + r * L.cellSize;
        const isMergeCandidate = this.canMergeWithActive(engine, tile);
        const isSelected =
          engine.selected?.sourceType === 'board' &&
          engine.selected.col === c &&
          engine.selected.row === r;

        this.drawWarTile(
          ctx,
          tile,
          x + 2,
          y + 2,
          L.cellSize - 4,
          isMergeCandidate,
          isSelected,
          s.synergyBonuses.heroSkillFaster
        );
      }
    }

    // 8) Draw Marching Enemies
    this.drawEnemies(ctx, engine, s);

    // 9) Draw Projectiles & Combat VFX
    this.drawProjectiles(ctx, engine, s);
    this.drawEffects(ctx, engine, s);
    this.drawFloatingTexts(ctx, engine, s);

    // 10) Draw Bottom War Tent + 5-Slot Barracks Bench
    this.drawBenchRow(ctx, engine, s);

    // 11) Draw Dragged Floating War-Tile on top of everything
    if (engine.drag && engine.drag.moved) {
      const sz = Math.round(L.cellSize * 1.06);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.42)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 8;
      this.drawWarTile(
        ctx,
        engine.drag.unit,
        engine.drag.screenX - sz / 2,
        engine.drag.screenY - sz / 2 - 12,
        sz,
        false,
        true,
        s.synergyBonuses.heroSkillFaster
      );
      ctx.restore();
    }

    // 12) Red hurt vignette if Young Lord took damage
    if (s.hurtFlash > 0) {
      ctx.fillStyle = `rgba(220, 38, 38, ${s.hurtFlash * 0.28})`;
      ctx.fillRect(0, 0, viewW, viewH);
    }

    ctx.restore();
  }

  private drawBackdrop(
    ctx: CanvasRenderingContext2D,
    theme: 'pass' | 'river' | 'fleet',
    w: number,
    h: number
  ): void {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (theme === 'river') {
      grad.addColorStop(0, '#7ba39b');
      grad.addColorStop(0.5, '#648f88');
      grad.addColorStop(1, '#798c73');
    } else if (theme === 'fleet') {
      grad.addColorStop(0, '#57677a');
      grad.addColorStop(0.5, '#475569');
      grad.addColorStop(1, '#5c645d');
    } else {
      // Classic Hulao Pass sage-meadow & ink stone palette matching reference
      grad.addColorStop(0, '#9aa892');
      grad.addColorStop(0.5, '#8a9982');
      grad.addColorStop(1, '#96a48e');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle hand-drawn ink grass tufts at top & bottom margins
    ctx.strokeStyle = 'rgba(30, 41, 28, 0.25)';
    ctx.lineWidth = 2;
    const step = 46;
    for (let x = 18; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 54);
      ctx.lineTo(x - 4, 45);
      ctx.moveTo(x + 6, 55);
      ctx.lineTo(x + 9, 46);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + 12, h - 118);
      ctx.lineTo(x + 8, h - 127);
      ctx.stroke();
    }
  }

  private canMergeWithActive(engine: GameEngine, target: TileUnit): boolean {
    const activeTile = engine.drag
      ? engine.drag.unit
      : engine.selected
        ? engine.selected.sourceType === 'bench'
          ? engine.state?.bench[engine.selected.benchIdx]
          : engine.state?.board[engine.selected.row]?.[engine.selected.col]
        : null;

    if (!activeTile || activeTile.uid === target.uid) return false;
    return (
      activeTile.unitId === target.unitId &&
      activeTile.tier === target.tier &&
      target.tier < MAX_TILE_TIER
    );
  }

  private drawGridCells(ctx: CanvasRenderingContext2D, engine: GameEngine, s: BattleState): void {
    const { boardX, boardY, cellSize } = engine.layout;
    const activeHolding = Boolean(engine.drag || engine.selected);
    const pulse = (Math.sin(this.animClock * 6.5) + 1) * 0.5;

    for (let r = 0; r < s.stage.rows; r++) {
      for (let c = 0; c < s.stage.cols; c++) {
        const ct = s.cells[r][c];
        const x = boardX + c * cellSize;
        const y = boardY + r * cellSize;

        if (ct === 'wall') {
          ctx.fillStyle = '#575c55';
          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.fillStyle = '#686e66';
          ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 6);
          ctx.strokeStyle = '#292d28';
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
        } else if (ct === 'path' || ct === 'vip') {
          ctx.fillStyle = '#c8d1c5';
          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.strokeStyle = 'rgba(60, 68, 58, 0.35)';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
        } else if (ct === 'locked') {
          ctx.fillStyle = '#666b64';
          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.fillStyle = '#747a72';
          roundRectPath(ctx, x + 3, y + 3, cellSize - 6, cellSize - 7, 4);
          ctx.fill();
          ctx.strokeStyle = '#333832';
          ctx.lineWidth = 1.8;
          ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

          // Subtle stone crack detail
          ctx.strokeStyle = 'rgba(30,35,30,0.38)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(x + cellSize * 0.3, y + cellSize * 0.35);
          ctx.lineTo(x + cellSize * 0.5, y + cellSize * 0.52);
          ctx.lineTo(x + cellSize * 0.68, y + cellSize * 0.44);
          ctx.stroke();

          if (s.shovelMode) {
            ctx.strokeStyle = `rgba(250, 204, 21, ${0.55 + pulse * 0.45})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 2.5, y + 2.5, cellSize - 5, cellSize - 5);
            const shv = Assets.get('icon_shovel');
            if (shv) {
              const isz = cellSize * 0.52;
              ctx.globalAlpha = 0.72 + pulse * 0.28;
              ctx.drawImage(shv, x + (cellSize - isz) / 2, y + (cellSize - isz) / 2, isz, isz);
              ctx.globalAlpha = 1;
            }
          }
        } else if (ct === 'deploy') {
          // Crisp White Jade Deploy Square matching the screenshot's white central tiles!
          ctx.fillStyle = '#d6d1c4';
          ctx.fillRect(x, y, cellSize, cellSize);
          ctx.fillStyle = '#fbfaf5';
          roundRectPath(ctx, x + 2, y + 2, cellSize - 4, cellSize - 6, 4);
          ctx.fill();
          ctx.strokeStyle = '#9ca398';
          ctx.lineWidth = 1.4;
          ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

          if (activeHolding && !s.board[r][c]) {
            ctx.strokeStyle = `rgba(34, 197, 94, ${0.45 + pulse * 0.4})`;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x + 3, y + 3, cellSize - 6, cellSize - 6);
          }
        }
      }
    }
  }

  private drawPathChevrons(ctx: CanvasRenderingContext2D, engine: GameEngine, s: BattleState): void {
    const { boardX, boardY, cellSize } = engine.layout;
    ctx.save();
    ctx.strokeStyle = 'rgba(185, 80, 68, 0.52)';
    ctx.lineWidth = Math.max(2.2, cellSize * 0.065);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const lane of s.stage.lanes) {
      const indices = [1, Math.floor(lane.waypoints.length / 2)];
      for (const idx of indices) {
        if (idx + 1 >= lane.waypoints.length) continue;
        const a = lane.waypoints[idx];
        const b = lane.waypoints[idx + 1];
        const cx = boardX + (a.col + 0.5) * cellSize;
        const cy = boardY + (a.row + 0.5) * cellSize;
        const ang = Math.atan2(b.row - a.row, b.col - a.col);
        const sz = cellSize * 0.2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(-sz * 0.6, -sz);
        ctx.lineTo(sz * 0.6, 0);
        ctx.lineTo(-sz * 0.6, sz);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  private drawRangePreview(ctx: CanvasRenderingContext2D, engine: GameEngine, s: BattleState): void {
    const { boardX, boardY, cellSize } = engine.layout;
    let previewUnit: TileUnit | null = null;
    let gx = -1;
    let gy = -1;

    if (engine.drag && engine.drag.moved) {
      previewUnit = engine.drag.unit;
      const hover = engine.hitTestBoard(engine.drag.screenX, engine.drag.screenY);
      if (hover && s.cells[hover.row][hover.col] === 'deploy') {
        gx = hover.col + 0.5;
        gy = hover.row + 0.5;
      }
    } else if (engine.selected && engine.selected.sourceType === 'board') {
      previewUnit = s.board[engine.selected.row][engine.selected.col];
      gx = engine.selected.col + 0.5;
      gy = engine.selected.row + 0.5;
    }

    if (!previewUnit || gx < 0) return;

    const def = UNITS[previewUnit.unitId];
    const rangePx = (def.rangeCells + getTierRangeBonus(previewUnit.tier)) * cellSize;
    const cx = boardX + gx * cellSize;
    const cy = boardY + gy * cellSize;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rangePx, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.11)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.stroke();
    ctx.restore();
  }

  private drawBarricadesAndVips(ctx: CanvasRenderingContext2D, engine: GameEngine, s: BattleState): void {
    const { boardX, boardY, cellSize } = engine.layout;

    // 1) Wooden & Iron Spike Barricades (matching reference screenshot!)
    for (const bar of s.barricades) {
      if (bar.hp <= 0) continue;
      const shake = bar.shakeTimer > 0 ? (Math.random() - 0.5) * 5 : 0;
      const x = boardX + bar.col * cellSize + shake;
      const y = boardY + bar.row * cellSize;
      const pad = Math.round(cellSize * 0.08);

      ctx.fillStyle = '#9a5b48';
      roundRectPath(ctx, x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2, 5);
      ctx.fill();
      ctx.strokeStyle = '#291d18';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // White iron spikes along center
      ctx.fillStyle = '#f8fafc';
      for (let i = 0; i < 3; i++) {
        const sy = y + pad + 4 + i * ((cellSize - pad * 2 - 8) / 2.6);
        ctx.beginPath();
        ctx.moveTo(x + cellSize * 0.45, sy);
        ctx.lineTo(x + cellSize * 0.76, sy + 5);
        ctx.lineTo(x + cellSize * 0.45, sy + 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      if (bar.hp < bar.maxHp) {
        const pct = Math.max(0, bar.hp / bar.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x + 4, y + cellSize - 7, cellSize - 8, 4);
        ctx.fillStyle = pct > 0.4 ? '#facc15' : '#ef4444';
        ctx.fillRect(x + 4, y + cellSize - 7, (cellSize - 8) * pct, 4);
      }
    }

    // 2) Protected Young Lord Cradles (replaces '斗' with unmistakable Crowned Baby Cradle + Hearts!)
    const drawnVips = new Set<string>();
    const vipImg = Assets.get('vip_lord');

    for (const lane of s.stage.lanes) {
      const key = `${lane.vipCell.col},${lane.vipCell.row}`;
      if (drawnVips.has(key)) continue;
      drawnVips.add(key);

      const x = boardX + lane.vipCell.col * cellSize;
      const y = boardY + lane.vipCell.row * cellSize;

      // Soft golden protective aura
      ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
      ctx.beginPath();
      ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.46, 0, Math.PI * 2);
      ctx.fill();

      if (vipImg) {
        const bob = Math.sin(this.animClock * 3.2) * 1.6;
        ctx.drawImage(vipImg, x + 2, y + 2 + bob, cellSize - 4, cellSize - 4);
      }

      // Draw crisp mini Heart cluster badge right above/on top of cradle
      const heartStr = `♥${s.hearts}`;
      ctx.font = `900 ${Math.max(10, Math.round(cellSize * 0.25))}px system-ui, sans-serif`;
      const tw = ctx.measureText(heartStr).width + 8;
      const bx = x + (cellSize - tw) / 2;
      const by = y - Math.round(cellSize * 0.14);
      ctx.fillStyle = '#dc2626';
      roundRectPath(ctx, bx, by, tw, Math.max(14, Math.round(cellSize * 0.3)), 7);
      ctx.fill();
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(heartStr, x + cellSize / 2, by + Math.max(7, Math.round(cellSize * 0.15)));
    }
  }

  private drawWarTile(
    ctx: CanvasRenderingContext2D,
    tile: TileUnit,
    x: number,
    y: number,
    size: number,
    highlightMerge: boolean,
    isSelected: boolean,
    heroSkillFaster = false
  ): void {
    const def = UNITS[tile.unitId];
    ctx.save();

    // Recoil lunge offset & merge pop scale
    let ox = 0;
    let oy = 0;
    if (tile.recoilTimer > 0) {
      const push = Math.sin(tile.recoilTimer * Math.PI) * (size * 0.11);
      ox = Math.cos(tile.recoilAngle) * push;
      oy = Math.sin(tile.recoilAngle) * push;
    }

    let scale = 1;
    if (tile.mergeAnimTimer > 0) {
      scale = 1 + Math.sin((tile.mergeAnimTimer / 0.4) * Math.PI) * 0.18;
    }

    const cx = x + size / 2 + ox;
    const cy = y + size / 2 + oy;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    const hw = size / 2;
    const r = Math.max(5, size * 0.13);

    // 3D Mahjong Stone / Gilded Base Lip
    ctx.fillStyle = def.isHero ? '#b45309' : '#a8a29e';
    roundRectPath(ctx, -hw, -hw + 3, size, size - 2, r);
    ctx.fill();

    // Top Carved Tile Face
    const faceGrad = ctx.createLinearGradient(0, -hw, 0, hw);
    faceGrad.addColorStop(0, def.tileBgTop);
    faceGrad.addColorStop(1, def.tileBgBottom);
    ctx.fillStyle = faceGrad;
    roundRectPath(ctx, -hw, -hw, size, size - 4, r);
    ctx.fill();

    // Ink Outline (Gold-trimmed double border for Legendary Heroes!)
    ctx.strokeStyle = highlightMerge
      ? '#22c55e'
      : isSelected
        ? '#38bdf8'
        : def.isHero
          ? '#92400e'
          : '#292524';
    ctx.lineWidth = highlightMerge || isSelected ? 3.2 : def.isHero ? 2.4 : 2.0;
    ctx.stroke();

    if (def.isHero) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
      ctx.lineWidth = 1.3;
      roundRectPath(ctx, -hw + 3, -hw + 3, size - 6, size - 10, Math.max(3, r - 2));
      ctx.stroke();
    }

    // Crisp Weapon Crest or Dynasty Hero Portrait (ZERO TEXT!)
    const img = Assets.get(def.spriteKey);
    if (img) {
      const iconSize = size * (def.isHero ? 0.82 : 0.76);
      ctx.drawImage(img, -iconSize / 2, -iconSize / 2 - 1, iconSize, iconSize);
    }

    // Universal Arabic Tier Pill Badge at Top-Right (1, 2, 3, 4★)
    const tierColors = ['#334155', '#16a34a', '#7e22ce', '#ea580c'];
    const badgeColor = tierColors[Math.min(3, tile.tier - 1)];
    const tierLabel = tile.tier >= 4 ? '4★' : `${tile.tier}`;
    const bFont = Math.max(9, Math.round(size * 0.24));
    ctx.font = `900 ${bFont}px system-ui, sans-serif`;
    const bw = Math.max(bFont + 5, ctx.measureText(tierLabel).width + 6);
    const bh = bFont + 3;
    const bx = hw - bw - 2;
    const by = -hw + 2;

    ctx.fillStyle = badgeColor;
    roundRectPath(ctx, bx, by, bw, bh, 5);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tierLabel, bx + bw / 2, by + bh / 2 + 0.5);

    // Hero signature skill charge indicator bar at bottom of tile
    if (def.isHero && def.skillEveryN) {
      const everyN = Math.max(2, def.skillEveryN - (heroSkillFaster ? 1 : 0));
      const step = tile.attackCount % everyN;
      const pct = step / everyN;
      const barW = size * 0.64;
      const barY = hw - 8;
      ctx.fillStyle = 'rgba(28,25,23,0.35)';
      ctx.fillRect(-barW / 2, barY, barW, 3);
      ctx.fillStyle = step === everyN - 1 ? '#ef4444' : def.accentColor;
      ctx.fillRect(-barW / 2, barY, barW * Math.max(0.2, pct), 3);
    }

    // Golden pulsing merge halo!
    if (highlightMerge) {
      const p = (Math.sin(this.animClock * 9) + 1) * 0.5;
      ctx.strokeStyle = `rgba(250, 204, 21, ${0.65 + p * 0.35})`;
      ctx.lineWidth = 3.5;
      roundRectPath(ctx, -hw - 2, -hw - 2, size + 4, size + 2, r + 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawBenchRow(ctx: CanvasRenderingContext2D, engine: GameEngine, s: BattleState): void {
    const { tentRect, benchSlots } = engine.layout;
    const isDragging = Boolean(engine.drag && engine.drag.moved);

    // 1) Left War Tent (or Recycle +🍙 Zone while dragging!)
    ctx.save();
    ctx.fillStyle = isDragging ? 'rgba(251, 191, 36, 0.32)' : 'rgba(28, 25, 23, 0.22)';
    roundRectPath(ctx, tentRect.x, tentRect.y, tentRect.w, tentRect.h, 8);
    ctx.fill();
    if (isDragging) {
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    const tentIcon = Assets.get(isDragging ? 'icon_rice' : 'icon_tent');
    if (tentIcon) {
      const pad = 3;
      ctx.drawImage(
        tentIcon,
        tentRect.x + pad,
        tentRect.y + pad,
        tentRect.w - pad * 2,
        tentRect.h - pad * 2
      );
    }
    if (isDragging && engine.drag) {
      const refund = 5 * Math.pow(2, engine.drag.unit.tier - 1);
      ctx.font = `900 ${Math.max(10, Math.round(tentRect.h * 0.26))}px system-ui, sans-serif`;
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.strokeText(`+${refund}`, tentRect.x + tentRect.w / 2, tentRect.y + tentRect.h - 6);
      ctx.fillText(`+${refund}`, tentRect.x + tentRect.w / 2, tentRect.y + tentRect.h - 6);
    }
    ctx.restore();

    // 2) 5 Stone-Parchment Barracks Slots
    for (let i = 0; i < benchSlots.length; i++) {
      const sl = benchSlots[i];
      ctx.fillStyle = '#cbd2c6';
      roundRectPath(ctx, sl.x, sl.y, sl.size, sl.size, 6);
      ctx.fill();
      ctx.strokeStyle = '#475045';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      const unit = s.bench[i];
      if (!unit) continue;
      if (engine.drag?.moved && engine.drag.sourceType === 'bench' && engine.drag.benchIdx === i) {
        continue;
      }

      const canMerge = this.canMergeWithActive(engine, unit);
      const isSelected =
        engine.selected?.sourceType === 'bench' && engine.selected.benchIdx === i;

      this.drawWarTile(
        ctx,
        unit,
        sl.x + 2,
        sl.y + 2,
        sl.size - 4,
        canMerge,
        isSelected,
        s.synergyBonuses.heroSkillFaster
      );
    }
  }

  private drawEnemies(ctx: CanvasRenderingContext2D, engine: GameEngine, s: BattleState): void {
    const { boardX, boardY, cellSize } = engine.layout;

    // Sort by Y for clean overlap depth
    const sorted = [...s.enemies].sort((a, b) => a.y - b.y);

    for (const e of sorted) {
      const cx = boardX + e.x * cellSize;
      const cy = boardY + e.y * cellSize;
      const sz =
        cellSize *
        (e.kind === 'lubu' ? 1.12 : e.kind === 'ram' ? 0.98 : e.kind === 'shield' ? 0.84 : 0.76);
      const bob = e.stunTimer > 0 ? 0 : Math.abs(Math.sin(this.animClock * 8 + e.id)) * 2.5;

      // Ground shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + sz * 0.34, sz * 0.32, sz * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();

      const key = ENEMY_SPRITES[e.kind] || 'enemy_grunt';
      const sprite = e.hitFlash > 0 ? Assets.getFlash(key) || Assets.get(key) : Assets.get(key);
      if (sprite) {
        ctx.drawImage(sprite, cx - sz / 2, cy - sz / 2 - bob, sz, sz);
      }

      // Status overlays: Chill / Stun / Burn
      if (e.slowTimer > 0) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy - bob, sz * 0.4, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (e.stunTimer > 0) {
        ctx.fillStyle = '#facc15';
        ctx.font = `900 ${Math.max(10, Math.round(cellSize * 0.24))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('⚡', cx, cy - sz * 0.52);
      } else if (e.burnTimer > 0) {
        ctx.font = `${Math.max(9, Math.round(cellSize * 0.22))}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🔥', cx + sz * 0.28, cy - sz * 0.35);
      }

      // Compact HP Bar
      if (e.hp < e.maxHp || e.kind === 'lubu' || e.kind === 'ram') {
        const bw = sz * 0.78;
        const bh = e.kind === 'lubu' ? 5.5 : 4;
        const bx = cx - bw / 2;
        const by = cy - sz * 0.52 - bh;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
        ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        const pct = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = e.kind === 'lubu' ? '#ef4444' : pct > 0.45 ? '#4ade80' : '#f97316';
        ctx.fillRect(bx, by, bw * pct, bh);
      }
    }
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D, engine: GameEngine, s: BattleState): void {
    const { boardX, boardY, cellSize } = engine.layout;

    for (const p of s.projectiles) {
      const px = boardX + p.x * cellSize;
      const py = boardY + p.y * cellSize;
      const ang = Math.atan2(p.vy, p.vx);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);

      if (p.kind === 'dragon' || p.kind === 'glaive') {
        const r = cellSize * 0.46;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, r, -Math.PI * 0.42, Math.PI * 0.42);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (p.kind === 'mortar') {
        const arcLift = Math.sin((p.life / p.maxLife) * Math.PI) * (cellSize * 0.55);
        ctx.rotate(-ang);
        ctx.fillStyle = '#581c87';
        ctx.beginPath();
        ctx.arc(0, -arcLift, cellSize * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (p.kind === 'lance') {
        ctx.strokeStyle = '#eff6ff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-cellSize * 0.28, 0);
        ctx.lineTo(cellSize * 0.28, 0);
        ctx.stroke();
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.moveTo(cellSize * 0.36, 0);
        ctx.lineTo(cellSize * 0.1, -5);
        ctx.lineTo(cellSize * 0.1, 5);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(-cellSize * 0.18, 0);
        ctx.lineTo(cellSize * 0.18, 0);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cellSize * 0.18, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawEffects(ctx: CanvasRenderingContext2D, engine: GameEngine, s: BattleState): void {
    const { boardX, boardY, boardW, boardH, cellSize } = engine.layout;

    for (const fx of s.effects) {
      const t = Math.min(1, fx.timer / fx.duration);
      const alpha = 1 - t;
      const cx = boardX + fx.x * cellSize;
      const cy = boardY + fx.y * cellSize;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (fx.kind === 'slash') {
        ctx.translate(cx, cy);
        ctx.rotate(fx.angle || 0);
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = Math.max(4, cellSize * 0.14 * (1 - t * 0.5));
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, fx.radius * cellSize * (0.65 + t * 0.35), -0.95, 0.95);
        ctx.stroke();
      } else if (fx.kind === 'ring' || fx.kind === 'heal_ring' || fx.kind === 'merge_burst') {
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = fx.kind === 'merge_burst' ? 5 : 3.5;
        ctx.beginPath();
        ctx.arc(cx, cy, fx.radius * cellSize * (0.25 + t * 0.75), 0, Math.PI * 2);
        ctx.stroke();
      } else if (fx.kind === 'explosion') {
        const rad = fx.radius * cellSize * (0.35 + t * 0.65);
        ctx.fillStyle = fx.color;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(cx, cy, rad * 0.55, 0, Math.PI * 2);
        ctx.fill();
      } else if (fx.kind === 'lightning' && fx.points && fx.points.length >= 2) {
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        fx.points.forEach((pt, idx) => {
          const lx = boardX + pt.x * cellSize;
          const ly = boardY + pt.y * cellSize;
          if (idx === 0) ctx.moveTo(lx, ly);
          else {
            const prev = fx.points![idx - 1];
            const mx = boardX + ((prev.x + pt.x) / 2) * cellSize + (Math.random() - 0.5) * 10;
            const my = boardY + ((prev.y + pt.y) / 2) * cellSize + (Math.random() - 0.5) * 10;
            ctx.lineTo(mx, my);
            ctx.lineTo(lx, ly);
          }
        });
        ctx.stroke();
      } else if (fx.kind === 'dragon_ult') {
        const sweepX = boardX + boardW * t;
        const grad = ctx.createLinearGradient(sweepX - 120, 0, sweepX + 40, 0);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0)');
        grad.addColorStop(0.7, 'rgba(56, 189, 248, 0.55)');
        grad.addColorStop(1, 'rgba(250, 204, 21, 0.85)');
        ctx.fillStyle = grad;
        ctx.fillRect(boardX, boardY, boardW, boardH);
      }

      ctx.restore();
    }
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D, engine: GameEngine, s: BattleState): void {
    const { boardX, boardY, cellSize } = engine.layout;

    ctx.save();
    ctx.textAlign = 'center';
    for (const fl of s.floats) {
      const alpha = Math.max(0, 1 - fl.timer / fl.duration);
      ctx.globalAlpha = alpha;
      const fx = boardX + fl.x * cellSize;
      const fy = boardY + fl.y * cellSize;
      const fSize = Math.round(Math.max(11, cellSize * 0.27) * fl.scale);
      ctx.font = `900 ${fSize}px system-ui, sans-serif`;
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 3;
      ctx.strokeText(fl.text, fx, fy);
      ctx.fillStyle = fl.color;
      ctx.fillText(fl.text, fx, fy);
    }
    ctx.restore();
  }
}
