import { SoundFX } from '../audio/SoundFX';
import { STAGES } from '../data/stages';
import { HERO_IDS, TROOP_IDS, UNITS } from '../data/units';
import { GameEngine } from '../game/GameEngine';
import { getLang, t } from '../i18n/locale';
import { SaveManager, UPGRADE_TRACKS } from '../meta/SaveManager';
import { PlatformSDK } from '../platform/PlatformSDK';
import { GameMode, MetaUpgradeLevels, RunSummary, StageDef } from '../types';

export class UIManager {
  private hudRoot: HTMLElement | null = null;
  private modalRoot: HTMLElement;
  private hubTab: 'stages' | 'codex' | 'upgrades' = 'stages';
  private selectedMode: GameMode = 'standard';
  private pauseOpen = false;
  private needleAnimId = 0;
  private hudCache: Record<string, string> = {};

  constructor(
    private uiLayer: HTMLElement,
    private engine: GameEngine
  ) {
    this.modalRoot = document.createElement('div');
    this.modalRoot.className = 'modal-host';
    this.uiLayer.appendChild(this.modalRoot);
  }

  // ==================== HOME HUB ====================

  public showHomeHub(): void {
    cancelAnimationFrame(this.needleAnimId);
    this.pauseOpen = false;
    this.engine.paused = false;
    this.engine.modalPaused = false;
    this.engine.state = null;
    this.hudRoot?.remove();
    this.hudRoot = null;

    const dict = t();
    const save = SaveManager.get();
    const langLabel = getLang() === 'en' ? '🌐 EN / 中文' : '🌐 中文 / EN';

    const tabContent =
      this.hubTab === 'stages'
        ? this.renderStagesTab()
        : this.hubTab === 'codex'
          ? this.renderCodexTab()
          : this.renderUpgradesTab();

    this.modalRoot.innerHTML = `
      <div class="hub-screen">
        <header class="hub-header">
          <div class="brand-block">
            <img src="./assets/vip_lord.svg" alt="" class="brand-logo" />
            <div>
              <h1>${dict.gameTitle}</h1>
              <p class="brand-sub">${dict.gameSubtitle}</p>
            </div>
          </div>

          <div class="hub-nav-tabs">
            <button class="seg-btn ${this.hubTab === 'stages' ? 'active' : ''}" data-hub-tab="stages">${dict.tabStages}</button>
            <button class="seg-btn ${this.hubTab === 'codex' ? 'active' : ''}" data-hub-tab="codex">${dict.tabCodex}</button>
            <button class="seg-btn ${this.hubTab === 'upgrades' ? 'active' : ''}" data-hub-tab="upgrades">${dict.tabUpgrades}</button>
          </div>

          <div class="commander-bar">
            <span class="rank-pill">🎖️ Lv.${save.commanderLevel}</span>
            <span class="gold-pill">🪙 ${save.gold}</span>
            <button class="btn-ink btn-mini btn-beige" id="btn-hub-lang">${langLabel}</button>
          </div>
        </header>

        <main class="hub-main">
          ${tabContent}
        </main>

        <footer class="hub-footer-tip">${dict.hubFooterTip}</footer>
      </div>
    `;

    this.modalRoot.querySelectorAll<HTMLButtonElement>('[data-hub-tab]').forEach((btn) => {
      btn.onclick = () => {
        SoundFX.tileClack(true);
        this.hubTab = btn.dataset.hubTab as 'stages' | 'codex' | 'upgrades';
        this.showHomeHub();
      };
    });

    const langBtn = this.modalRoot.querySelector('#btn-hub-lang') as HTMLButtonElement | null;
    if (langBtn) {
      langBtn.onclick = () => {
        SaveManager.toggleLang();
        SoundFX.tileClack(true);
        this.showHomeHub();
      };
    }

    this.modalRoot.querySelectorAll<HTMLButtonElement>('[data-mode-pick]').forEach((btn) => {
      btn.onclick = () => {
        SoundFX.tileClack(false);
        this.selectedMode = btn.dataset.modePick as GameMode;
        this.showHomeHub();
      };
    });

    this.modalRoot.querySelectorAll<HTMLButtonElement>('[data-stage-go]').forEach((btn) => {
      btn.onclick = () => {
        const st = STAGES.find((s) => s.id === btn.dataset.stageGo)!;
        SoundFX.recruit();
        this.startStageRun(st, this.selectedMode);
      };
    });

    this.modalRoot.querySelectorAll<HTMLButtonElement>('[data-upg]').forEach((btn) => {
      btn.onclick = () => {
        const key = btn.dataset.upg as keyof MetaUpgradeLevels;
        if (SaveManager.buyUpgrade(key)) {
          SoundFX.fanfare();
          this.showHomeHub();
        }
      };
    });
  }

  private renderStagesTab(): string {
    const dict = t();
    const save = SaveManager.get();
    const stageBadges = ['🏯', '🌉', '⛵'];

    const cards = STAGES.map((st, idx) => {
      const info = dict.stages[st.id];
      const cleared = save.clearedStages.includes(st.id);
      const best = save.endlessBestWave[st.id] || 0;
      const badge =
        this.selectedMode === 'standard'
          ? cleared
            ? dict.stageCleared
            : dict.stageDifficulty(idx + 1)
          : best > 0
            ? dict.endlessBest(best)
            : dict.endlessReady;

      return `
        <div class="stage-card">
          <div class="stage-card-top">
            <span class="stage-icon">${stageBadges[idx] || '🏯'}</span>
            <span class="stage-tag">${badge}</span>
          </div>
          <h3>${info.name}</h3>
          <p>${info.subtitle}</p>
          <button class="btn-ink ${this.selectedMode === 'standard' ? 'btn-amber' : 'btn-violet'} stage-go-btn" data-stage-go="${st.id}">
            ${this.selectedMode === 'standard' ? dict.btnPlayStandard : dict.btnPlayEndless}
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="mode-switch-row">
        <div class="seg-group">
          <button class="seg-btn ${this.selectedMode === 'standard' ? 'active' : ''}" data-mode-pick="standard">${dict.modeStandard}</button>
          <button class="seg-btn ${this.selectedMode === 'endless' ? 'active' : ''}" data-mode-pick="endless">${dict.modeEndless}</button>
        </div>
      </div>
      <div class="stage-grid">${cards}</div>
    `;
  }

  private renderCodexTab(): string {
    const dict = t();

    const troopCards = TROOP_IDS.map((id) => {
      const def = UNITS[id];
      const txt = dict.units[id];
      return `
        <div class="codex-card">
          <div class="codex-tile troop-tile">
            <img src="./assets/${def.spriteKey}.svg" alt="" />
            <span class="codex-tier">1</span>
          </div>
          <div class="codex-info">
            <div class="codex-name">${txt.name}</div>
            <div class="codex-role">${txt.role}</div>
            <div class="codex-desc">${txt.desc}</div>
          </div>
        </div>
      `;
    }).join('');

    const heroCards = HERO_IDS.map((id) => {
      const def = UNITS[id];
      const txt = dict.units[id];
      return `
        <div class="codex-card hero-card">
          <div class="codex-tile hero-tile">
            <img src="./assets/${def.spriteKey}.svg" alt="" />
            <span class="codex-tier hero">2</span>
          </div>
          <div class="codex-info">
            <div class="codex-name">${txt.name}</div>
            <div class="codex-role">${txt.role}</div>
            <div class="codex-desc">${txt.desc}</div>
          </div>
        </div>
      `;
    }).join('');

    const synKeys: ('vanguard' | 'marksman' | 'mystic' | 'dragon_guard')[] = [
      'vanguard',
      'marksman',
      'mystic',
      'dragon_guard',
    ];
    const synIcons = { vanguard: '⚔️', marksman: '🏹', mystic: '☯️', dragon_guard: '🐉' };
    const synHtml = synKeys
      .map(
        (k) => `
        <div class="syn-card">
          <strong>${synIcons[k]} ${dict.synergyNames[k]}</strong>
          <span>${dict.synergyDescs[k]}</span>
        </div>
      `
      )
      .join('');

    return `
      <div class="codex-wrap">
        <div class="codex-tip-box">${dict.codexRuleTip}</div>
        <h3 class="codex-sec-title">${dict.codexHeroesTitle}</h3>
        <div class="codex-grid">${heroCards}</div>
        <h3 class="codex-sec-title">${dict.codexTroopsTitle}</h3>
        <div class="codex-grid">${troopCards}</div>
        <h3 class="codex-sec-title">${dict.codexSynergyTitle}</h3>
        <div class="syn-grid">${synHtml}</div>
      </div>
    `;
  }

  private renderUpgradesTab(): string {
    const dict = t();
    const save = SaveManager.get();
    const nextXp = SaveManager.xpForNextLevel(save.commanderLevel);
    const bonusPct = (save.commanderLevel - 1) * 3 + save.upgrades.might * 8;

    const list = UPGRADE_TRACKS.map((spec) => {
      const lvl = save.upgrades[spec.key];
      const isMax = lvl >= spec.maxLevel;
      const cost = SaveManager.getUpgradeCost(spec.key);
      const canBuy = !isMax && save.gold >= cost;
      const metaTxt = dict.upgrades[spec.key];

      return `
        <div class="upgrade-card">
          <div class="upg-left">
            <span class="upg-icon">${spec.icon}</span>
            <div>
              <div class="upg-title">${metaTxt.name} <small>Lv.${lvl}/${spec.maxLevel}</small></div>
              <div class="upg-desc">${metaTxt.desc}</div>
              <div class="upg-val">${metaTxt.val(lvl)}</div>
            </div>
          </div>
          <button class="btn-ink btn-mini ${isMax ? 'btn-gray' : canBuy ? 'btn-amber' : 'btn-disabled'}"
            data-upg="${spec.key}" ${!canBuy ? 'disabled' : ''}>
            ${isMax ? dict.maxLevel : dict.upgradeBtn(cost)}
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="upg-summary">${dict.commanderRank(save.commanderLevel, bonusPct, save.commanderXp, nextXp)}</div>
      <div class="upgrade-list">${list}</div>
    `;
  }

  // ==================== IN-RUN BATTLE HUD ====================

  public startStageRun(stage: StageDef, mode: GameMode): void {
    this.pauseOpen = false;
    this.modalRoot.innerHTML = '';
    this.engine.startRun(stage, mode);
    this.mountHUD();
    this.syncHUD();
  }

  public mountHUD(): void {
    this.hudRoot?.remove();
    this.hudCache = {};
    const dict = t();

    const hud = document.createElement('div');
    hud.className = 'hud-overlay';
    hud.innerHTML = `
      <div class="hud-top">
        <div class="hud-left">
          <button class="hud-pause-btn" id="btn-pause" title="Pause (Esc)">⏸</button>
          <div class="rice-pill">
            <img src="./assets/icon_rice.svg" alt="" class="rice-icon" />
            <span id="hud-rations">28</span>
          </div>
          <div class="heart-pill">
            <span>❤️</span>
            <span id="hud-hearts">10</span>
          </div>
        </div>

        <div class="hud-center">
          <div class="stage-title-txt" id="hud-stage-title"></div>
          <div class="wave-txt" id="hud-wave"></div>
          <div class="boss-bar-wrap" id="hud-boss-wrap" style="display:none">
            <div class="boss-bar-fill" id="hud-boss-fill"></div>
            <span id="hud-boss-label"></span>
          </div>
        </div>

        <div class="hud-right">
          <div class="synergy-strip" id="hud-synergies"></div>
        </div>
      </div>

      <div class="unit-inspect-pill" id="hud-unit-info"></div>
      <div class="hud-banner" id="hud-banner"></div>

      <div class="hud-bottom-dock">
        <div class="recruit-row">
          <button class="ult-orb-btn" id="btn-ult" title="Dragon Crescent Ultimate">
            <img src="./assets/icon_ult.svg" alt="" />
            <span class="ult-pct" id="hud-ult-pct">35%</span>
          </button>

          <button class="recruit-main-btn" id="btn-recruit">
            <span class="rec-title" id="hud-rec-label">${dict.btnRecruit}</span>
            <span class="rec-cost">
              <img src="./assets/icon_rice.svg" alt="" />
              <strong id="hud-rec-cost">12</strong>
            </span>
          </button>

          <button class="boost-side-btn" id="btn-side-boost"></button>
        </div>

        <div class="tactical-row">
          <button class="tac-btn" id="btn-tac-farm">
            <img src="./assets/icon_farm.svg" alt="" />
            <div class="tac-meta">
              <span class="tac-name">${dict.actFarm} <em id="hud-farm-lv">Lv.1</em></span>
              <span class="tac-sub" id="hud-farm-cost">🍙18</span>
            </div>
          </button>

          <button class="tac-btn" id="btn-tac-decree">
            <img src="./assets/icon_decree.svg" alt="" />
            <div class="tac-meta">
              <span class="tac-name">${dict.actDecree} <em id="hud-decree-lv">Lv.1</em></span>
              <span class="tac-sub" id="hud-decree-cost">🍙24</span>
            </div>
          </button>

          <button class="tac-btn" id="btn-tac-shovel">
            <img src="./assets/icon_shovel.svg" alt="" />
            <div class="tac-meta">
              <span class="tac-name">${dict.actShovel}</span>
              <span class="tac-sub" id="hud-shovel-cnt">x1</span>
            </div>
          </button>

          <button class="tac-btn" id="btn-tac-fortify">
            <img src="./assets/icon_fortify.svg" alt="" />
            <div class="tac-meta">
              <span class="tac-name">${dict.actFortify}</span>
              <span class="tac-sub" id="hud-fortify-cost">🍙26</span>
            </div>
          </button>
        </div>
      </div>
    `;

    this.uiLayer.appendChild(hud);
    this.hudRoot = hud;

    (hud.querySelector('#btn-pause') as HTMLButtonElement).onclick = () => this.togglePauseModal();
    (hud.querySelector('#btn-ult') as HTMLButtonElement).onclick = () => {
      this.engine.castDragonUlt();
      this.syncHUD();
    };
    (hud.querySelector('#btn-recruit') as HTMLButtonElement).onclick = () => {
      this.engine.recruitBench();
      this.syncHUD();
    };
    (hud.querySelector('#btn-tac-farm') as HTMLButtonElement).onclick = () => {
      this.engine.upgradeFarm();
      this.syncHUD();
    };
    (hud.querySelector('#btn-tac-decree') as HTMLButtonElement).onclick = () => {
      this.engine.upgradeDecree();
      this.syncHUD();
    };
    (hud.querySelector('#btn-tac-shovel') as HTMLButtonElement).onclick = () => {
      this.engine.toggleShovelMode();
      this.syncHUD();
    };
    (hud.querySelector('#btn-tac-fortify') as HTMLButtonElement).onclick = () => {
      this.engine.fortifyLord();
      this.syncHUD();
    };
    (hud.querySelector('#btn-side-boost') as HTMLButtonElement).onclick = () => {
      this.handleSideBoostClick();
    };
  }

  private async handleSideBoostClick(): Promise<void> {
    const s = this.engine.state;
    if (!s) return;
    const dict = t();
    const save = SaveManager.get();

    // 1st career Hero Scroll is completely FREE!
    if (!save.freeHeroScrollUsed) {
      save.freeHeroScrollUsed = true;
      SaveManager.save();
      this.engine.grantGuaranteedHero();
      this.syncHUD();
      return;
    }

    // 1x per run Guaranteed Hero Summon via Rewarded Ad
    if (!s.heroScrollAdUsed) {
      const ok = await PlatformSDK.showRewardedAd('hero_scroll_summon', dict.adRewardHero);
      if (ok && this.engine.state) {
        this.engine.state.heroScrollAdUsed = true;
        this.engine.grantGuaranteedHero();
        this.syncHUD();
      }
      return;
    }

    // Otherwise Ration + Shovel Supply Drop
    if (s.supplyAdCooldown <= 0) {
      const ok = await PlatformSDK.showRewardedAd('free_rations_supply', dict.adRewardSupply);
      if (ok && this.engine.state) {
        this.engine.state.rations += 65;
        this.engine.state.shovels += 1;
        this.engine.state.supplyAdCooldown = 35;
        this.syncHUD();
      }
    }
  }

  public syncHUD(): void {
    const s = this.engine.state;
    if (!s || !this.hudRoot) return;
    const dict = t();

    const setIf = (key: string, val: string, apply: () => void) => {
      if (this.hudCache[key] !== val) {
        this.hudCache[key] = val;
        apply();
      }
    };

    const stName = dict.stages[s.stage.id]?.name || s.stage.id;
    setIf('stName', stName, () => {
      (this.hudRoot!.querySelector('#hud-stage-title') as HTMLElement).textContent = stName;
    });

    const waveStr = dict.waveLabel(s.wave, s.maxWaves);
    setIf('wave', waveStr, () => {
      (this.hudRoot!.querySelector('#hud-wave') as HTMLElement).textContent = waveStr;
    });

    setIf('rations', `${s.rations}`, () => {
      (this.hudRoot!.querySelector('#hud-rations') as HTMLElement).textContent = `${s.rations}`;
    });

    setIf('hearts', `${s.hearts}`, () => {
      (this.hudRoot!.querySelector('#hud-hearts') as HTMLElement).textContent = `${s.hearts}`;
    });

    // Boss HP Bar
    const boss =
      s.enemies.find((e) => e.kind === 'lubu') || s.enemies.find((e) => e.kind === 'ram');
    const bossSig = boss ? `${boss.id}:${Math.ceil(boss.hp)}` : 'none';
    setIf('boss', bossSig, () => {
      const wrap = this.hudRoot!.querySelector('#hud-boss-wrap') as HTMLElement;
      if (!boss) {
        wrap.style.display = 'none';
      } else {
        wrap.style.display = 'block';
        const pct = Math.max(0, (boss.hp / boss.maxHp) * 100);
        (this.hudRoot!.querySelector('#hud-boss-fill') as HTMLElement).style.width = `${pct}%`;
        const title = boss.kind === 'lubu' ? dict.bossName : dict.miniBossName;
        (this.hudRoot!.querySelector('#hud-boss-label') as HTMLElement).textContent =
          `${title} ${Math.ceil(boss.hp)}`;
      }
    });

    // Synergy Chips
    const synSig = s.synergies.map((item) => `${item.id}:${item.tier}:${item.count}`).join('|');
    setIf('syn', synSig, () => {
      const icons = { vanguard: '⚔️', marksman: '🏹', mystic: '☯️', dragon_guard: '🐉' };
      const html = s.synergies
        .filter((x) => x.tier > 0)
        .map(
          (x) =>
            `<span class="syn-chip tier-${x.tier}" title="${dict.synergyNames[x.id]}: ${dict.synergyDescs[x.id]}">${icons[x.id]}${x.count}</span>`
        )
        .join('');
      (this.hudRoot!.querySelector('#hud-synergies') as HTMLElement).innerHTML = html;
    });

    // Banner & Selected Unit Info Toast
    const bannerStr = s.bannerTimer > 0 ? s.bannerText : '';
    setIf('banner', bannerStr, () => {
      const el = this.hudRoot!.querySelector('#hud-banner') as HTMLElement;
      el.textContent = bannerStr;
      el.classList.toggle('visible', Boolean(bannerStr));
    });

    const infoKey = s.selectedUnitInfo
      ? `${s.selectedUnitInfo.unitId}:${s.selectedUnitInfo.tier}`
      : '';
    setIf('uinfo', infoKey, () => {
      const el = this.hudRoot!.querySelector('#hud-unit-info') as HTMLElement;
      if (!s.selectedUnitInfo) {
        el.classList.remove('visible');
      } else {
        const uTxt = dict.units[s.selectedUnitInfo.unitId];
        el.textContent = `${uTxt.name} [T${s.selectedUnitInfo.tier}] · ${uTxt.role}`;
        el.classList.add('visible');
      }
    });

    // Ultimate Orb
    const ultPct = Math.floor(s.ultCharge);
    setIf('ult', `${ultPct}`, () => {
      const btn = this.hudRoot!.querySelector('#btn-ult') as HTMLButtonElement;
      const lbl = this.hudRoot!.querySelector('#hud-ult-pct') as HTMLElement;
      btn.classList.toggle('ready', ultPct >= 100);
      lbl.textContent = ultPct >= 100 ? dict.ultReady : `${ultPct}%`;
    });

    // Recruit Button
    const benchHasEmpty = s.bench.some((b) => b === null);
    const recKey = `${s.recruitCost}:${benchHasEmpty ? 1 : 0}:${s.rations >= s.recruitCost ? 1 : 0}`;
    setIf('rec', recKey, () => {
      const btn = this.hudRoot!.querySelector('#btn-recruit') as HTMLButtonElement;
      (this.hudRoot!.querySelector('#hud-rec-label') as HTMLElement).textContent = benchHasEmpty
        ? dict.btnRecruit
        : dict.btnReroll;
      (this.hudRoot!.querySelector('#hud-rec-cost') as HTMLElement).textContent = `${s.recruitCost}`;
      btn.classList.toggle('affordable', s.rations >= s.recruitCost);
    });

    // Side Boost Button
    const save = SaveManager.get();
    const boostMode = !save.freeHeroScrollUsed
      ? 'free_hero'
      : !s.heroScrollAdUsed
        ? 'ad_hero'
        : s.supplyAdCooldown <= 0
          ? 'ad_supply'
          : `cd:${Math.ceil(s.supplyAdCooldown)}`;
    setIf('boost', boostMode, () => {
      const btn = this.hudRoot!.querySelector('#btn-side-boost') as HTMLButtonElement;
      if (boostMode === 'free_hero') {
        btn.disabled = false;
        btn.textContent = dict.btnHeroScrollFree;
        btn.className = 'boost-side-btn free-glow';
      } else if (boostMode === 'ad_hero') {
        btn.disabled = false;
        btn.textContent = dict.btnHeroScrollAd;
        btn.className = 'boost-side-btn';
      } else if (boostMode === 'ad_supply') {
        btn.disabled = false;
        btn.textContent = dict.btnSupplyAd;
        btn.className = 'boost-side-btn';
      } else {
        btn.disabled = true;
        btn.textContent = `⏳ ${Math.ceil(s.supplyAdCooldown)}s`;
        btn.className = 'boost-side-btn disabled';
      }
    });

    // 4 Tactical Buttons
    const farmCost = this.engine.getFarmCost();
    setIf('farm', `${s.farmLevel}:${s.rations >= farmCost ? 1 : 0}`, () => {
      (this.hudRoot!.querySelector('#hud-farm-lv') as HTMLElement).textContent =
        s.farmLevel >= 6 ? 'MAX' : `Lv.${s.farmLevel}`;
      (this.hudRoot!.querySelector('#hud-farm-cost') as HTMLElement).textContent =
        s.farmLevel >= 6 ? dict.maxLevel : `🍙${farmCost}`;
    });

    const decCost = this.engine.getDecreeCost();
    const heroRatePct = Math.round(this.engine.getHeroDraftChance() * 100);
    setIf('dec', `${s.decreeLevel}:${heroRatePct}:${s.rations >= decCost ? 1 : 0}`, () => {
      (this.hudRoot!.querySelector('#hud-decree-lv') as HTMLElement).textContent = `${heroRatePct}%👑`;
      (this.hudRoot!.querySelector('#hud-decree-cost') as HTMLElement).textContent =
        s.decreeLevel >= 5 ? dict.maxLevel : `🍙${decCost}`;
    });

    const hasLocked = s.cells.some((r) => r.some((c) => c === 'locked'));
    setIf('shovel', `${s.shovels}:${s.shovelMode ? 1 : 0}:${hasLocked ? 1 : 0}`, () => {
      const btn = this.hudRoot!.querySelector('#btn-tac-shovel') as HTMLButtonElement;
      const sub = this.hudRoot!.querySelector('#hud-shovel-cnt') as HTMLElement;
      btn.classList.toggle('active-mode', s.shovelMode);
      sub.textContent = !hasLocked ? 'MAX' : s.shovels > 0 ? `x${s.shovels}` : '🍙35 / 🎬';
    });

    const fortCost = this.engine.getFortifyCost();
    setIf('fort', `${s.hearts}:${s.rations >= fortCost ? 1 : 0}`, () => {
      (this.hudRoot!.querySelector('#hud-fortify-cost') as HTMLElement).textContent = `🍙${fortCost}`;
    });
  }

  // ==================== PAUSE, SHOVEL AD, REVIVE & SETTLEMENT MODALS ====================

  public togglePauseModal(): void {
    if (!this.engine.state || this.engine.state.wavePhase === 'ended') return;
    if (this.pauseOpen) {
      this.pauseOpen = false;
      this.engine.modalPaused = false;
      this.modalRoot.innerHTML = '';
      PlatformSDK.gameplayStart();
      return;
    }

    this.pauseOpen = true;
    this.engine.modalPaused = true;
    PlatformSDK.gameplayStop();
    this.renderPauseBox();
  }

  private renderPauseBox(): void {
    const dict = t();
    const muted = SoundFX.isUserMuted();
    this.modalRoot.innerHTML = `
      <div class="popup-backdrop">
        <div class="popup-box">
          <h2>${dict.pauseTitle}</h2>
          <div class="pause-actions">
            <button class="btn-ink btn-amber" id="btn-p-resume">${dict.btnResume}</button>
            <button class="btn-ink btn-beige" id="btn-p-mute">${muted ? dict.btnMuteOn : dict.btnMuteOff}</button>
            <button class="btn-ink btn-beige" id="btn-p-lang">${dict.btnLangSwitch}</button>
            <button class="btn-ink btn-gray" id="btn-p-quit">${dict.btnRetreat}</button>
          </div>
        </div>
      </div>
    `;

    (this.modalRoot.querySelector('#btn-p-resume') as HTMLButtonElement).onclick = () =>
      this.togglePauseModal();

    (this.modalRoot.querySelector('#btn-p-mute') as HTMLButtonElement).onclick = () => {
      SoundFX.toggleUserMute();
      this.renderPauseBox();
    };

    (this.modalRoot.querySelector('#btn-p-lang') as HTMLButtonElement).onclick = () => {
      SaveManager.toggleLang();
      this.mountHUD();
      this.syncHUD();
      this.renderPauseBox();
    };

    (this.modalRoot.querySelector('#btn-p-quit') as HTMLButtonElement).onclick = () => {
      this.showHomeHub();
    };
  }

  public async promptShovelAd(): Promise<void> {
    const s = this.engine.state;
    if (!s) return;
    const dict = t();
    const ok = await PlatformSDK.showRewardedAd('bonus_shovels', dict.adRewardShovels);
    if (ok && this.engine.state) {
      this.engine.state.shovels += 2;
      this.engine.state.shovelMode = true;
      this.engine.showBanner(dict.bannerShovelPick, 2.2);
      this.syncHUD();
    }
  }

  public showReviveModal(canRevive: boolean): void {
    const s = this.engine.state;
    if (!s) return;
    if (!canRevive) {
      s.wavePhase = 'ended';
      this.showSettlementModal(false, {
        stageId: s.stage.id,
        mode: s.mode,
        wave: s.wave,
        kills: s.kills,
        merges: s.merges,
        victory: false,
      });
      return;
    }

    const dict = t();
    this.modalRoot.innerHTML = `
      <div class="popup-backdrop">
        <div class="popup-box">
          <h2>${dict.reviveTitle}</h2>
          <p class="popup-sub">${dict.reviveSub(s.wave, s.kills)}</p>
          <div class="revive-chips">
            <span>${dict.revivePerk1}</span>
            <span>${dict.revivePerk2}</span>
            <span>${dict.revivePerk3}</span>
          </div>
          <div class="popup-footer">
            <button class="btn-ink btn-green" id="btn-do-revive">${dict.btnReviveAd}</button>
            <button class="btn-ink btn-gray" id="btn-skip-revive">${dict.btnSkipRevive}</button>
          </div>
        </div>
      </div>
    `;

    const revBtn = this.modalRoot.querySelector('#btn-do-revive') as HTMLButtonElement;
    revBtn.onclick = async () => {
      revBtn.disabled = true;
      const ok = await PlatformSDK.showRewardedAd('revive_guardian', dict.adRewardRevive);
      if (ok && this.engine.state) {
        this.modalRoot.innerHTML = '';
        this.engine.modalPaused = false;
        this.engine.applyDragonRevive();
        this.syncHUD();
      } else {
        revBtn.disabled = false;
      }
    };

    (this.modalRoot.querySelector('#btn-skip-revive') as HTMLButtonElement).onclick = () => {
      s.wavePhase = 'ended';
      this.showSettlementModal(false, {
        stageId: s.stage.id,
        mode: s.mode,
        wave: s.wave,
        kills: s.kills,
        merges: s.merges,
        victory: false,
      });
    };
  }

  public showSettlementModal(victory: boolean, sum: RunSummary): void {
    this.pauseOpen = false;
    this.engine.modalPaused = true;
    const dict = t();

    const baseGold = Math.round(
      28 + sum.wave * 15 + Math.min(200, sum.kills * 0.5) + sum.merges * 2 + (victory ? 120 : 0)
    );
    const baseXp = Math.round(
      32 + sum.wave * 16 + Math.min(240, sum.kills * 0.65) + (victory ? 110 : 0)
    );
    const zones = [2, 3, 5, 3, 2];

    this.modalRoot.innerHTML = `
      <div class="popup-backdrop">
        <div class="popup-box">
          <h2>${victory ? dict.victoryTitle : dict.defeatTitle}</h2>
          <p class="popup-sub">${dict.settleSub(sum.wave, sum.kills, sum.merges)}</p>

          <div class="reward-preview">
            <span>🪙 <strong id="rew-gold">+${baseGold}</strong></span>
            <span>🎖️ <strong id="rew-xp">+${baseXp} XP</strong></span>
          </div>

          <div class="meter-wrap">
            <div class="meter-bar">
              <span class="m-z z2">x2</span>
              <span class="m-z z3">x3</span>
              <span class="m-z z5">x5</span>
              <span class="m-z z3">x3</span>
              <span class="m-z z2">x2</span>
              <div class="meter-needle" id="settle-needle"></div>
            </div>
          </div>

          <div class="popup-footer">
            <button class="btn-ink btn-amber" id="btn-mult-claim">
              ${dict.btnMultClaim} (<span id="mult-live">x5</span>)
            </button>
            <button class="btn-ink btn-gray" id="btn-normal-claim">${dict.btnNormalClaim}</button>
          </div>
        </div>
      </div>
    `;

    const needle = this.modalRoot.querySelector('#settle-needle') as HTMLElement;
    const multLive = this.modalRoot.querySelector('#mult-live') as HTMLElement;
    const goldEl = this.modalRoot.querySelector('#rew-gold') as HTMLElement;
    const xpEl = this.modalRoot.querySelector('#rew-xp') as HTMLElement;

    let currentMult = 5;
    let stopped = false;

    const tickNeedle = (now: number) => {
      if (stopped) return;
      const pos = (Math.sin(now * 0.0042) + 1) / 2;
      needle.style.left = `${pos * 100}%`;
      const idx = Math.min(4, Math.floor(pos * 5));
      currentMult = zones[idx];
      multLive.textContent = `x${currentMult}`;
      this.needleAnimId = requestAnimationFrame(tickNeedle);
    };
    this.needleAnimId = requestAnimationFrame(tickNeedle);

    (this.modalRoot.querySelector('#btn-mult-claim') as HTMLButtonElement).onclick = async () => {
      stopped = true;
      cancelAnimationFrame(this.needleAnimId);
      const locked = currentMult;
      const ok = await PlatformSDK.showRewardedAd(
        'settlement_multiplier',
        dict.adRewardSettle(locked)
      );
      if (ok) {
        goldEl.textContent = `+${baseGold * locked}`;
        xpEl.textContent = `+${baseXp * locked} XP`;
        SaveManager.addRewards(baseGold * locked, baseXp * locked);
        this.showHomeHub();
      } else {
        stopped = false;
        this.needleAnimId = requestAnimationFrame(tickNeedle);
      }
    };

    (this.modalRoot.querySelector('#btn-normal-claim') as HTMLButtonElement).onclick = () => {
      stopped = true;
      cancelAnimationFrame(this.needleAnimId);
      SaveManager.addRewards(baseGold, baseXp);
      this.showHomeHub();
    };
  }
}
