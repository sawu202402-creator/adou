import { SoundFX } from '../audio/SoundFX';
import { STAGES } from '../data/stages';
import { HERO_KEYS, MAX_HERO_COMBAT_LEVEL, TROOP_KEYS, UNITS } from '../data/units';
import { SKILL_SPECS, WEAPON_IDS, WEAPON_SPECS } from '../data/weaponsAndSkills';
import { GameEngine } from '../game/GameEngine';
import { getLang, getUnitDisplayText, t } from '../i18n/locale';
import { SaveManager } from '../meta/SaveManager';
import { DuelManager } from '../net/DuelManager';
import { DuelEmoteKey, DuelLobbyState } from '../net/DuelProtocol';
import { PlatformSDK } from '../platform/PlatformSDK';
import {
  GameMode,
  HeroKey,
  PvPRaidKind,
  RunSummary,
  SkillId,
  StageDef,
  TroopKey,
  WeaponId,
} from '../types';

export class UIManager {
  private hudRoot: HTMLElement | null = null;
  private modalRoot: HTMLElement;
  private hubTab: 'stages' | 'duel' | 'armory' | 'skills' | 'codex' = 'stages';
  private selectedMode: GameMode = 'standard';
  private duelStageId = 'hulao';
  private duelMode: GameMode = 'standard';
  private pvpDrawerOpen = false;
  private copyToastTimer = 0;
  private copyToastTarget: 'code' | 'link' | null = null;
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

  public isInHub(): boolean {
    return this.engine.state === null;
  }

  public refreshDuelHubIfVisible(): void {
    if (this.engine.state === null && this.hubTab === 'duel') {
      // Preserve room-code input text if user is typing!
      const activeInput = document.activeElement as HTMLInputElement | null;
      if (activeInput && (activeInput.id === 'duel-code-input' || activeInput.id === 'duel-callsign-input')) {
        return;
      }
      this.showHomeHub();
    }
  }

  public openDuelLobbyTab(): void {
    this.hubTab = 'duel';
    this.showHomeHub();
  }

  public joinDuelRoomFromInvite(roomCode: string): void {
    if (this.engine.state) {
      PlatformSDK.gameplayStop();
      this.engine.state = null;
      this.hudRoot?.remove();
      this.hudRoot = null;
    }
    this.hubTab = 'duel';
    DuelManager.joinRoom(roomCode);
    this.showHomeHub();
  }

  public startPvpDuelRun(
    stageId: string,
    mode: GameMode,
    matchSeed: number,
    matchSeq: number,
    lobby: DuelLobbyState
  ): void {
    cancelAnimationFrame(this.needleAnimId);
    this.pauseOpen = false;
    this.pvpDrawerOpen = false;
    this.modalRoot.innerHTML = '';
    const st = STAGES.find((item) => item.id === stageId) || STAGES[0];
    const opp = lobby.members.find((m) => m.peerId !== DuelManager.myPeerId);
    this.engine.startRun(st, mode, {
      matchSeed,
      matchSeq,
      rivalCallsign: opp?.callsign || t().rivalTag,
    });
    this.mountHUD();
    this.syncHUD();
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
    const langLabel = getLang() === 'en' ? 'EN / 中文' : '中文 / EN';
    const rankIdx = Math.min(dict.rankTitles.length - 1, Math.max(0, save.skills.rank_up - 1));
    const rankTitle = dict.rankTitles[rankIdx];

    const readyWeaponCount = WEAPON_IDS.filter((wId) => {
      const need = SaveManager.getShardsNeededForNextStar(wId);
      return need !== null && (save.weaponShards[wId] || 0) >= need;
    }).length;

    const readySkillCount = SKILL_SPECS.filter((sp) => {
      const lvl = save.skills[sp.id];
      return lvl < sp.maxLevel && save.gold >= SaveManager.getSkillCost(sp.id);
    }).length;

    DuelManager.ensurePublicDirectoryActive();
    const openPublicRooms = DuelManager.getPublicRooms().length;

    const tabContent =
      this.hubTab === 'stages'
        ? this.renderStagesTab()
        : this.hubTab === 'duel'
          ? this.renderDuelTab()
          : this.hubTab === 'armory'
            ? this.renderArmoryTab()
            : this.hubTab === 'skills'
              ? this.renderSkillsTab()
              : this.renderCodexTab();

    this.modalRoot.innerHTML = `
      <div class="hub-screen" style="background-image: url('./assets/hub_scroll_bg.jpg')">
        <div class="hub-bg-veil"></div>
        <header class="hub-header">
          <div class="brand-block">
            <div class="brand-seal">
              <img src="./assets/vip_lord.png" alt="" class="brand-logo" />
            </div>
            <div>
              <h1>${dict.gameTitle}</h1>
              <p class="brand-sub">${dict.gameSubtitle}</p>
            </div>
          </div>

          <div class="hub-nav-tabs">
            <button class="seg-btn ${this.hubTab === 'stages' ? 'active' : ''}" data-hub-tab="stages">${dict.tabStages}</button>
            <button class="seg-btn duel-tab-btn ${this.hubTab === 'duel' ? 'active' : ''}" data-hub-tab="duel">
              ${dict.tabDuel}${openPublicRooms > 0 ? `<span class="nav-dot emerald">${openPublicRooms}</span>` : ''}
            </button>
            <button class="seg-btn ${this.hubTab === 'armory' ? 'active' : ''}" data-hub-tab="armory">
              ${dict.tabArmory}${readyWeaponCount > 0 ? `<span class="nav-dot">${readyWeaponCount}</span>` : ''}
            </button>
            <button class="seg-btn ${this.hubTab === 'skills' ? 'active' : ''}" data-hub-tab="skills">
              ${dict.tabSkills}${readySkillCount > 0 ? `<span class="nav-dot">${readySkillCount}</span>` : ''}
            </button>
            <button class="seg-btn ${this.hubTab === 'codex' ? 'active' : ''}" data-hub-tab="codex">${dict.tabCodex}</button>
          </div>

          <div class="commander-bar">
            <span class="rank-pill">${rankTitle} · Lv.${save.commanderLevel}</span>
            <span class="gold-pill">◈ ${save.gold}</span>
            <button class="btn-guofeng btn-mini btn-jade" id="btn-hub-lang">${langLabel}</button>
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
        this.hubTab = btn.dataset.hubTab as 'stages' | 'duel' | 'armory' | 'skills' | 'codex';
        if (this.hubTab === 'duel') {
          DuelManager.requestDirectoryRefresh();
        }
        this.showHomeHub();
      };
    });

    const quickOpenDuelBtn = this.modalRoot.querySelector('#btn-open-duel-hub') as HTMLButtonElement | null;
    if (quickOpenDuelBtn) {
      quickOpenDuelBtn.onclick = () => {
        SoundFX.recruit();
        this.hubTab = 'duel';
        DuelManager.requestDirectoryRefresh();
        this.showHomeHub();
      };
    }

    this.bindDuelTabEvents();

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

    this.modalRoot.querySelectorAll<HTMLButtonElement>('[data-buy-skill]').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.buySkill as SkillId;
        if (SaveManager.buySkill(id)) {
          SoundFX.fanfare();
          this.showHomeHub();
        }
      };
    });

    this.modalRoot.querySelectorAll<HTMLButtonElement>('[data-forge-weapon]').forEach((btn) => {
      btn.onclick = () => {
        const wId = btn.dataset.forgeWeapon as WeaponId;
        if (SaveManager.forgeOrUpgradeWeapon(wId)) {
          SoundFX.dragonUlt();
          this.showHomeHub();
        }
      };
    });

    this.modalRoot.querySelectorAll<HTMLSelectElement>('[data-equip-select]').forEach((sel) => {
      sel.onchange = () => {
        const wId = sel.dataset.equipSelect as WeaponId;
        const val = sel.value;
        // Detach weapon if user picked 'none'
        const saveNow = SaveManager.get();
        (Object.keys(saveNow.equippedWeapons) as HeroKey[]).forEach((h) => {
          if (saveNow.equippedWeapons[h] === wId) {
            SaveManager.equipWeapon(h, null);
          }
        });
        if (val !== 'none') {
          SaveManager.equipWeapon(val as HeroKey, wId);
        }
        SoundFX.tileClack(true);
        this.showHomeHub();
      };
    });
  }

  private renderStagesTab(): string {
    const dict = t();
    const save = SaveManager.get();
    const stagePreviewSprites = ['hero_zhaoyun', 'hero_guanyu', 'hero_zhuge'];
    const bossSprites: Record<string, string> = {
      lubu: 'enemy_lubu',
      zhangjiao: 'enemy_zhangjiao',
    };

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
            <div class="stage-emblem-group">
              <div class="stage-emblem-frame">
                <img src="./assets/${stagePreviewSprites[idx] || 'hero_zhaoyun'}.png" alt="" />
              </div>
              <div class="stage-boss-avatar" title="Stage Boss">
                <img src="./assets/${bossSprites[st.finalBoss]}.png" alt="" />
              </div>
            </div>
            <span class="stage-tag ${cleared ? 'cleared' : ''}">${badge}</span>
          </div>
          <h3>${info.name}</h3>
          <div class="stage-boss-pill">☠ ${info.bossHint}</div>
          <p>${info.subtitle}</p>
          <button class="btn-guofeng ${this.selectedMode === 'standard' ? 'btn-cinnabar' : 'btn-gilt'} stage-go-btn" data-stage-go="${st.id}">
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
        <button class="btn-guofeng btn-cinnabar duel-cta-banner-btn" id="btn-open-duel-hub">
          ${dict.tabDuel} · ${dict.duelQuickMatch}
        </button>
      </div>
      <div class="stage-grid">${cards}</div>
    `;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private renderDuelTab(): string {
    const dict = t();
    const chatDisabled = PlatformSDK.isChatDisabled();

    // Active Room Lobby View
    if (DuelManager.status === 'ready' && DuelManager.lobby) {
      const lob = DuelManager.lobby;
      const isHost = DuelManager.role === 'host';
      const hostM = lob.members.find((m) => m.slot === 1) || lob.members[0];
      const guestM = lob.members.find((m) => m.slot === 2);
      const p2p = DuelManager.hasDirectP2P();
      const netBadge = guestM
        ? DuelManager.rttMs > 0
          ? `${p2p ? '⚡ WebRTC P2P' : '☁ WSS'} · ${DuelManager.rttMs}ms`
          : p2p
            ? '⚡ WebRTC P2P'
            : '☁ WSS Connected'
        : '☁ Multi-Broker WSS Ready';

      const stageButtons = STAGES.map((st) => {
        const sName = dict.stages[st.id]?.name || st.id;
        return `<button class="seg-btn ${lob.stageId === st.id ? 'active' : ''}" data-duel-room-stage="${st.id}" ${!isHost ? 'disabled' : ''}>${sName}</button>`;
      }).join('');

      const canStart = isHost && Boolean(guestM);
      const myClientReady = guestM?.ready ?? true;

      return `
        <div class="duel-wrap">
          <div class="duel-room-card">
            <div class="duel-room-top">
              <div class="duel-code-block">
                <span class="duel-code-lbl">${dict.duelRoomCodeLabel}</span>
                <strong class="duel-code-big">${lob.roomCode}</strong>
                <span class="duel-vis-badge ${lob.isPublic ? 'pub' : 'priv'}">
                  ${lob.isPublic ? dict.duelPublicBadge : dict.duelPrivateBadge}
                </span>
                <span class="duel-net-pill ${p2p ? 'p2p' : ''}">${netBadge}</span>
              </div>

              <div class="duel-invite-btns">
                <button class="btn-guofeng btn-mini btn-jade" id="btn-copy-room-code">
                  ${this.copyToastTarget === 'code' ? dict.duelCopiedToast : dict.duelBtnCopyCode}
                </button>
                <button class="btn-guofeng btn-mini btn-gilt" id="btn-copy-invite-link">
                  ${this.copyToastTarget === 'link' ? dict.duelCopiedToast : dict.duelBtnCopyLink}
                </button>
              </div>
            </div>

            <div class="duel-config-strip">
              <div class="seg-group">${stageButtons}</div>
              <div class="seg-group">
                <button class="seg-btn ${lob.mode === 'standard' ? 'active' : ''}" data-duel-room-mode="standard" ${!isHost ? 'disabled' : ''}>${dict.modeStandard}</button>
                <button class="seg-btn ${lob.mode === 'endless' ? 'active' : ''}" data-duel-room-mode="endless" ${!isHost ? 'disabled' : ''}>${dict.modeEndless}</button>
              </div>
            </div>

            <div class="duel-vs-arena">
              <div class="duel-slot-card filled">
                <div class="duel-slot-role">${dict.duelSlotHost}</div>
                <img class="duel-slot-avatar" src="./assets/hero_zhaoyun.png" alt="" />
                <div class="duel-slot-name">${this.escapeHtml(hostM?.callsign || 'Host')}</div>
                <div class="duel-slot-meta">Lv.${hostM?.rankLvl || 1} · <span class="rdy-ok">${dict.duelReadyTag}</span></div>
              </div>

              <div class="duel-vs-seal">VS</div>

              ${
                guestM
                  ? `
                    <div class="duel-slot-card filled challenger">
                      <div class="duel-slot-role">${dict.duelSlotGuest}</div>
                      <img class="duel-slot-avatar" src="./assets/hero_lubu.png" alt="" />
                      <div class="duel-slot-name">${this.escapeHtml(guestM.callsign)}</div>
                      <div class="duel-slot-meta">
                        Lv.${guestM.rankLvl} ·
                        <span class="${guestM.ready ? 'rdy-ok' : 'rdy-wait'}">
                          ${guestM.ready ? dict.duelReadyTag : dict.duelNotReadyTag}
                        </span>
                      </div>
                    </div>
                  `
                  : `
                    <div class="duel-slot-card empty">
                      <div class="duel-slot-role">${dict.duelSlotGuest}</div>
                      <div class="duel-wait-pulse">⚔</div>
                      <div class="duel-wait-txt">${dict.duelWaitingChallenger}</div>
                    </div>
                  `
              }
            </div>

            <div class="duel-room-actions">
              ${
                isHost
                  ? `
                    <button class="btn-guofeng ${canStart ? 'btn-cinnabar' : 'btn-disabled'} duel-main-go"
                      id="btn-duel-launch" ${!canStart ? 'disabled' : ''}>
                      ${canStart ? dict.duelBtnStartMatch : dict.duelBtnWaitOpponent}
                    </button>
                  `
                  : `
                    <button class="btn-guofeng ${myClientReady ? 'btn-gilt' : 'btn-cinnabar'} duel-main-go"
                      id="btn-duel-ready-toggle">
                      ${dict.duelBtnToggleReady(myClientReady)}
                    </button>
                  `
              }
              <button class="btn-guofeng btn-stone" id="btn-duel-leave">${dict.duelBtnLeaveRoom}</button>
            </div>
          </div>

          <div class="codex-tip-box duel-tip-box">${dict.duelRulesTip}</div>
        </div>
      `;
    }

    // Connecting View
    if (DuelManager.status === 'connecting') {
      return `
        <div class="duel-wrap">
          <div class="duel-room-card connecting-box">
            <div class="duel-wait-pulse">☯</div>
            <h3>${dict.duelConnecting}</h3>
            <button class="btn-guofeng btn-stone" id="btn-duel-leave">${dict.duelBtnLeaveRoom}</button>
          </div>
        </div>
      `;
    }

    // Hall / Matchmaking Entry View
    const publicRooms = DuelManager.getPublicRooms();
    const stagePills = STAGES.map((st) => {
      const sName = dict.stages[st.id]?.name || st.id;
      return `<button class="seg-btn ${this.duelStageId === st.id ? 'active' : ''}" data-duel-pick-stage="${st.id}">${sName}</button>`;
    }).join('');

    const hallRows =
      publicRooms.length > 0
        ? publicRooms
            .map((rm) => {
              const sName = dict.stages[rm.stageId]?.name || rm.stageId;
              const mName = rm.mode === 'standard' ? dict.modeStandard : dict.modeEndless;
              return `
                <div class="duel-hall-item">
                  <div class="dh-left">
                    <span class="dh-code">${rm.roomCode}</span>
                    <div>
                      <strong>${this.escapeHtml(rm.hostCallsign)}</strong>
                      <div class="dh-sub">${sName} · ${mName} · (${rm.memberCount}/2)</div>
                    </div>
                  </div>
                  <button class="btn-guofeng btn-mini btn-cinnabar" data-join-hall-code="${rm.roomCode}">
                    ${dict.duelHallJoinBtn}
                  </button>
                </div>
              `;
            })
            .join('')
        : `<div class="duel-hall-empty">${dict.duelHallEmpty}</div>`;

    return `
      <div class="duel-wrap">
        <div class="duel-hero-banner">
          <div>
            <h2>${dict.duelTitle}</h2>
            <p>${dict.duelSubtitle}</p>
          </div>
          ${
            !chatDisabled
              ? `
                <label class="duel-name-box">
                  <span>${dict.duelCallsignLabel}</span>
                  <input type="text" id="duel-callsign-input" maxlength="12" value="${this.escapeHtml(DuelManager.getEffectiveCallsign())}" />
                </label>
              `
              : ''
          }
        </div>

        ${
          DuelManager.status === 'error' && DuelManager.errorMsg
            ? `<div class="duel-err-bar">⚠ ${this.escapeHtml(DuelManager.errorMsg)}</div>`
            : ''
        }

        <div class="duel-setup-panel">
          <div class="duel-config-strip">
            <div class="seg-group">${stagePills}</div>
            <div class="seg-group">
              <button class="seg-btn ${this.duelMode === 'standard' ? 'active' : ''}" data-duel-pick-mode="standard">${dict.modeStandard}</button>
              <button class="seg-btn ${this.duelMode === 'endless' ? 'active' : ''}" data-duel-pick-mode="endless">${dict.modeEndless}</button>
            </div>
          </div>

          <div class="duel-action-grid">
            <button class="btn-guofeng btn-cinnabar duel-big-btn" id="btn-duel-quick">
              ${dict.duelQuickMatch}
            </button>
            <button class="btn-guofeng btn-gilt duel-big-btn" id="btn-duel-create-pub">
              ${dict.duelCreatePublic}
            </button>
            <button class="btn-guofeng btn-jade duel-big-btn" id="btn-duel-create-priv">
              ${dict.duelCreatePrivate}
            </button>
          </div>

          <div class="duel-join-code-row">
            <input type="text" id="duel-code-input" class="duel-code-input" maxlength="6" placeholder="${dict.duelJoinPlaceholder}" />
            <button class="btn-guofeng btn-gilt" id="btn-duel-join-code">${dict.duelBtnJoinCode}</button>
          </div>
        </div>

        <div class="duel-hall-panel">
          <div class="duel-hall-head">
            <strong>${dict.duelPublicHallTitle}</strong>
            <button class="btn-guofeng btn-mini btn-stone" id="btn-duel-refresh-hall">${dict.duelBtnRefreshHall}</button>
          </div>
          <div class="duel-hall-list">${hallRows}</div>
        </div>

        <div class="codex-tip-box duel-tip-box">${dict.duelRulesTip}</div>
      </div>
    `;
  }

  private bindDuelTabEvents(): void {
    const callsignInput = this.modalRoot.querySelector('#duel-callsign-input') as HTMLInputElement | null;
    if (callsignInput) {
      callsignInput.onchange = () => {
        DuelManager.setCallsign(callsignInput.value);
      };
      callsignInput.onblur = () => {
        DuelManager.setCallsign(callsignInput.value);
      };
    }

    this.modalRoot.querySelectorAll<HTMLButtonElement>('[data-duel-pick-stage]').forEach((btn) => {
      btn.onclick = () => {
        SoundFX.tileClack(false);
        this.duelStageId = btn.dataset.duelPickStage!;
        this.showHomeHub();
      };
    });

    this.modalRoot.querySelectorAll<HTMLButtonElement>('[data-duel-pick-mode]').forEach((btn) => {
      btn.onclick = () => {
        SoundFX.tileClack(false);
        this.duelMode = btn.dataset.duelPickMode as GameMode;
        this.showHomeHub();
      };
    });

    const quickBtn = this.modalRoot.querySelector('#btn-duel-quick') as HTMLButtonElement | null;
    if (quickBtn) {
      quickBtn.onclick = () => {
        if (callsignInput) DuelManager.setCallsign(callsignInput.value);
        SoundFX.recruit();
        DuelManager.quickMatchOrCreate(this.duelStageId, this.duelMode);
      };
    }

    const createPubBtn = this.modalRoot.querySelector('#btn-duel-create-pub') as HTMLButtonElement | null;
    if (createPubBtn) {
      createPubBtn.onclick = () => {
        if (callsignInput) DuelManager.setCallsign(callsignInput.value);
        SoundFX.recruit();
        DuelManager.createRoom(this.duelStageId, this.duelMode, true);
      };
    }

    const createPrivBtn = this.modalRoot.querySelector('#btn-duel-create-priv') as HTMLButtonElement | null;
    if (createPrivBtn) {
      createPrivBtn.onclick = () => {
        if (callsignInput) DuelManager.setCallsign(callsignInput.value);
        SoundFX.recruit();
        DuelManager.createRoom(this.duelStageId, this.duelMode, false);
      };
    }

    const codeInput = this.modalRoot.querySelector('#duel-code-input') as HTMLInputElement | null;
    const joinCodeBtn = this.modalRoot.querySelector('#btn-duel-join-code') as HTMLButtonElement | null;
    if (codeInput && joinCodeBtn) {
      const doJoin = () => {
        if (callsignInput) DuelManager.setCallsign(callsignInput.value);
        SoundFX.recruit();
        DuelManager.joinRoom(codeInput.value);
      };
      joinCodeBtn.onclick = doJoin;
      codeInput.onkeydown = (ev) => {
        if (ev.key === 'Enter') doJoin();
      };
    }

    const refreshHallBtn = this.modalRoot.querySelector('#btn-duel-refresh-hall') as HTMLButtonElement | null;
    if (refreshHallBtn) {
      refreshHallBtn.onclick = () => {
        SoundFX.tileClack(true);
        DuelManager.requestDirectoryRefresh();
        this.showHomeHub();
      };
    }

    this.modalRoot.querySelectorAll<HTMLButtonElement>('[data-join-hall-code]').forEach((btn) => {
      btn.onclick = () => {
        if (callsignInput) DuelManager.setCallsign(callsignInput.value);
        SoundFX.recruit();
        DuelManager.joinRoom(btn.dataset.joinHallCode!);
      };
    });

    const leaveBtn = this.modalRoot.querySelector('#btn-duel-leave') as HTMLButtonElement | null;
    if (leaveBtn) {
      leaveBtn.onclick = () => {
        SoundFX.tileClack(false);
        DuelManager.leaveRoom();
      };
    }

    this.modalRoot.querySelectorAll<HTMLButtonElement>('[data-duel-room-stage]').forEach((btn) => {
      btn.onclick = () => {
        if (!DuelManager.lobby) return;
        SoundFX.tileClack(false);
        DuelManager.updateHostConfig(btn.dataset.duelRoomStage!, DuelManager.lobby.mode);
      };
    });

    this.modalRoot.querySelectorAll<HTMLButtonElement>('[data-duel-room-mode]').forEach((btn) => {
      btn.onclick = () => {
        if (!DuelManager.lobby) return;
        SoundFX.tileClack(false);
        DuelManager.updateHostConfig(
          DuelManager.lobby.stageId,
          btn.dataset.duelRoomMode as GameMode
        );
      };
    });

    const copyCodeBtn = this.modalRoot.querySelector('#btn-copy-room-code') as HTMLButtonElement | null;
    if (copyCodeBtn && DuelManager.lobby) {
      copyCodeBtn.onclick = async () => {
        const code = DuelManager.lobby?.roomCode || '';
        await this.copyTextSafe(code);
        this.triggerCopyFeedback('code');
      };
    }

    const copyLinkBtn = this.modalRoot.querySelector('#btn-copy-invite-link') as HTMLButtonElement | null;
    if (copyLinkBtn && DuelManager.lobby) {
      copyLinkBtn.onclick = async () => {
        const code = DuelManager.lobby?.roomCode || '';
        const link = await PlatformSDK.buildInviteLink(code);
        await this.copyTextSafe(link);
        this.triggerCopyFeedback('link');
      };
    }

    const launchBtn = this.modalRoot.querySelector('#btn-duel-launch') as HTMLButtonElement | null;
    if (launchBtn) {
      launchBtn.onclick = () => {
        SoundFX.dragonUlt();
        DuelManager.launchHostDuel();
      };
    }

    const readyToggleBtn = this.modalRoot.querySelector('#btn-duel-ready-toggle') as HTMLButtonElement | null;
    if (readyToggleBtn) {
      readyToggleBtn.onclick = () => {
        SoundFX.tileClack(true);
        DuelManager.toggleClientReady();
      };
    }
  }

  private async copyTextSafe(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        // ignore
      }
      ta.remove();
    }
  }

  private triggerCopyFeedback(which: 'code' | 'link'): void {
    SoundFX.tileClack(true);
    this.copyToastTarget = which;
    window.clearTimeout(this.copyToastTimer);
    this.showHomeHub();
    this.copyToastTimer = window.setTimeout(() => {
      this.copyToastTarget = null;
      this.refreshDuelHubIfVisible();
    }, 1600);
  }

  private renderArmoryTab(): string {
    const dict = t();
    const save = SaveManager.get();

    const cards = WEAPON_IDS.map((wId) => {
      const spec = WEAPON_SPECS[wId];
      const wTxt = dict.weapons[wId];
      const star = save.weapons[wId] || 0;
      const have = save.weaponShards[wId] || 0;
      const need = SaveManager.getShardsNeededForNextStar(wId);
      const canForge = need !== null && have >= need;
      const sigHeroName = dict.heroes[spec.signatureHero].heroName;

      // Find which hero currently holds this weapon
      const holder: HeroKey | null =
        HERO_KEYS.find((h) => save.equippedWeapons[h] === wId) ?? null;

      const pct = need === null ? 100 : Math.min(100, Math.round((have / need) * 100));
      const starStr = star > 0 ? '★'.repeat(star) + '☆'.repeat(5 - star) : '☆☆☆☆☆';

      const heroOptions = HERO_KEYS.map((h) => {
        const hName = dict.heroes[h].heroName;
        const isSig = h === spec.signatureHero;
        return `<option value="${h}" ${holder === h ? 'selected' : ''}>${hName}${isSig ? ' ★' : ''}</option>`;
      }).join('');

      return `
        <div class="weapon-card ${star > 0 ? 'unlocked' : ''}">
          <div class="weap-top">
            <div class="mini-war-tile weap-icon-tile" style="border-color:${spec.accentColor}">
              <img src="./assets/${spec.spriteKey}.png" alt="" />
              ${star > 0 ? `<span class="weap-star-pill">${star}★</span>` : ''}
            </div>
            <div class="weap-meta">
              <div class="weap-title-row">
                <strong>${wTxt.name}</strong>
                <span class="weap-stars">${starStr}</span>
              </div>
              <div class="weap-desc">${wTxt.desc}</div>
              <div class="weap-sig">${wTxt.sigBonus}</div>
            </div>
          </div>

          <div class="shard-progress-row">
            <div class="shard-bar-track">
              <div class="shard-bar-fill" style="width:${pct}%"></div>
              <span class="shard-bar-txt">
                <img src="./assets/icon_chest.png" alt="" />
                ${dict.shardCount(have, need)}
              </span>
            </div>
            <button class="btn-guofeng btn-mini ${need === null ? 'btn-stone' : canForge ? 'btn-cinnabar' : 'btn-disabled'}"
              data-forge-weapon="${wId}" ${!canForge ? 'disabled' : ''}>
              ${need === null ? dict.maxLevel : star === 0 ? dict.btnForgeWeapon(need) : dict.btnStarUpWeapon(need)}
            </button>
          </div>

          <div class="equip-bar">
            ${
              star > 0
                ? `
                  <span class="equip-label">${holder ? dict.equippedOn(dict.heroes[holder].heroName) : dict.btnEquipTo(sigHeroName)}</span>
                  <select class="equip-select" data-equip-select="${wId}">
                    <option value="none" ${holder === null ? 'selected' : ''}>— ${dict.unequippedLabel} —</option>
                    ${heroOptions}
                  </select>
                `
                : `<span class="equip-locked-hint">✦ ${dict.btnForgeWeapon(spec.unlockShards)} -> ${sigHeroName}</span>`
            }
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="codex-wrap">
        <div class="codex-tip-box">
          <strong>${dict.armoryTitle}</strong><br/>
          ${dict.armoryTip}
        </div>
        <div class="armory-grid">${cards}</div>
      </div>
    `;
  }

  private renderSkillsTab(): string {
    const dict = t();
    const save = SaveManager.get();
    const rankIdx = Math.min(dict.rankTitles.length - 1, Math.max(0, save.skills.rank_up - 1));
    const rankTitle = dict.rankTitles[rankIdx];
    const bonusPct = Math.round(((SaveManager.getEffectiveBonuses().damageMult - 1) * 100));

    const cards = SKILL_SPECS.map((spec) => {
      const lvl = save.skills[spec.id];
      const isMax = lvl >= spec.maxLevel;
      const cost = SaveManager.getSkillCost(spec.id);
      const canBuy = !isMax && save.gold >= cost;
      const skTxt = dict.skills[spec.id];

      return `
        <div class="upgrade-card skill-shop-card">
          <div class="upg-left">
            <div class="upg-icon-box" style="border-color:${spec.badgeColor}">
              <img src="./assets/${spec.spriteKey}.png" alt="" />
              <span class="skill-corner-seal" style="background:${spec.badgeColor}">${skTxt.shortTag}</span>
            </div>
            <div>
              <div class="upg-title">${skTxt.name} <small>Lv.${lvl}/${spec.maxLevel}</small></div>
              <div class="upg-desc">${skTxt.desc}</div>
              <div class="upg-val">${skTxt.val(lvl)}</div>
            </div>
          </div>
          <button class="btn-guofeng btn-mini ${isMax ? 'btn-stone' : canBuy ? 'btn-gilt' : 'btn-disabled'}"
            data-buy-skill="${spec.id}" ${!canBuy ? 'disabled' : ''}>
            ${isMax ? dict.maxLevel : dict.upgradeBtn(cost)}
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="upg-summary">${dict.commanderRank(save.commanderLevel, rankTitle, bonusPct)}</div>
      <div class="skill-shop-grid">${cards}</div>
    `;
  }

  private renderMiniRangeDiagram(unitId: TroopKey): string {
    // Circular range ring gauge (scaled against max 4.4R)
    const def = UNITS[unitId];
    const maxScale = 4.4;
    const outerPct = Math.min(96, Math.round((def.rangeCells / maxScale) * 94));
    const innerPct =
      def.minRangeCells > 0 ? Math.round((def.minRangeCells / maxScale) * 94) : 0;
    return `
      <div class="mini-circle-gauge" title="${def.rangeCells.toFixed(1)}R">
        <span class="mc-ring" style="width:${outerPct}%;height:${outerPct}%"></span>
        ${innerPct > 0 ? `<span class="mc-blind" style="width:${innerPct}%;height:${innerPct}%"></span>` : ''}
        <span class="mc-dot"></span>
      </div>
    `;
  }

  private renderCodexTab(): string {
    const dict = t();
    const save = SaveManager.get();

    // 6 Two-Piece Hero Puzzle Equations: [Puzzle 1/2] + [Puzzle 2/2] -> [Awakened General]
    const fusionCards = HERO_KEYS.map((hKey) => {
      const s1Def = UNITS[`shard1_${hKey}`];
      const s2Def = UNITS[`shard2_${hKey}`];
      const heroDef = UNITS[`hero_${hKey}`];
      const hTxt = dict.heroes[hKey];
      const eqWeap = save.equippedWeapons[hKey];

      return `
        <div class="codex-card fusion-card">
          <div class="fusion-equation">
            <div class="mini-war-tile part-tile" style="border-color:${s1Def.accentColor}">
              <img src="./assets/${s1Def.spriteKey}.png" alt="" />
              <span class="mini-crest" style="background:${s1Def.frameColor}"><img src="./assets/crest_${hKey}.png" alt="" /></span>
              <span class="mini-half">1/2</span>
            </div>
            <span class="eq-op">+</span>
            <div class="mini-war-tile part-tile" style="border-color:${s2Def.accentColor}">
              <img src="./assets/${s2Def.spriteKey}.png" alt="" />
              <span class="mini-crest" style="background:${s2Def.frameColor}"><img src="./assets/crest_${hKey}.png" alt="" /></span>
              <span class="mini-half">2/2</span>
            </div>
            <span class="eq-arrow">➔</span>
            <div class="mini-war-tile awakened-tile">
              <img src="./assets/${heroDef.spriteKey}.png" alt="" />
              <span class="mini-crest gold"><img src="./assets/crest_${hKey}.png" alt="" /></span>
              <span class="mini-half">2×1</span>
              ${eqWeap ? `<img class="mini-eq-weap" src="./assets/${eqWeap}.png" alt="" />` : ''}
            </div>
          </div>
          <div class="codex-info">
            <div class="codex-name">${hTxt.heroName}</div>
            <div class="codex-role">${hTxt.role}</div>
            <div class="codex-desc">${hTxt.desc}</div>
          </div>
        </div>
      `;
    }).join('');

    const troopCards = TROOP_KEYS.map((id) => {
      const def = UNITS[id];
      const txt = dict.troops[id];
      return `
        <div class="codex-card troop-range-card">
          <div class="mini-war-tile troop-tile">
            <img src="./assets/${def.spriteKey}.png" alt="" />
            <span class="mini-tier">1</span>
          </div>
          <div class="codex-info">
            <div class="codex-name">${txt.name}</div>
            <div class="codex-role">${txt.role}</div>
            <div class="codex-desc">${txt.desc}</div>
          </div>
          ${this.renderMiniRangeDiagram(id)}
        </div>
      `;
    }).join('');

    const synKeys: ('vanguard' | 'marksman' | 'mystic' | 'dragon_guard')[] = [
      'vanguard',
      'marksman',
      'mystic',
      'dragon_guard',
    ];
    const synIcons = {
      vanguard: 'syn_vanguard',
      marksman: 'syn_marksman',
      mystic: 'syn_mystic',
      dragon_guard: 'crest_zhaoyun',
    };
    const synHtml = synKeys
      .map(
        (k) => `
        <div class="syn-card">
          <strong><img class="syn-icon-mini" src="./assets/${synIcons[k]}.png" alt="" /> ${dict.synergyNames[k]}</strong>
          <span>${dict.synergyDescs[k]}</span>
        </div>
      `
      )
      .join('');

    return `
      <div class="codex-wrap">
        <div class="codex-tip-box">${dict.codexRuleTip}</div>
        <h3 class="codex-sec-title">${dict.codexTroopsTitle}</h3>
        <div class="codex-grid">${troopCards}</div>
        <h3 class="codex-sec-title">${dict.codexFusionTitle}</h3>
        <div class="codex-grid fusion-grid">${fusionCards}</div>
        <h3 class="codex-sec-title">${dict.codexSynergyTitle}</h3>
        <div class="syn-grid">${synHtml}</div>
      </div>
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
          <button class="hud-pause-btn" id="btn-pause" title="Pause (Esc)">❚❚</button>
          <button class="hud-speed-btn ${this.engine.gameSpeed === 2 ? 'fast' : ''}" id="btn-speed" title="1x / 2x Speed (F)">${this.engine.gameSpeed}x</button>
          <div class="ink-brush-pill">
            <img src="./assets/icon_rice.png" alt="" class="rice-icon" />
            <span id="hud-rations">28</span>
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

      <div class="pvp-raid-drawer" id="pvp-raid-drawer" style="display:none">
        <div class="pvp-raid-row">
          <button class="pvp-raid-btn" data-pvp-raid="wolf_pack">
            <img src="./assets/enemy_wolf.png" alt="" />
            <div>
              <strong>${dict.duelRaidWolf}</strong>
              <span>18 · +0.10/s</span>
            </div>
          </button>
          <button class="pvp-raid-btn" data-pvp-raid="iron_shield">
            <img src="./assets/enemy_shield.png" alt="" />
            <div>
              <strong>${dict.duelRaidShield}</strong>
              <span>34 · +0.18/s</span>
            </div>
          </button>
          <button class="pvp-raid-btn boss" data-pvp-raid="sorcerer_raid">
            <img src="./assets/enemy_zhangjiao.png" alt="" />
            <div>
              <strong>${dict.duelRaidSorcerer}</strong>
              <span>56 · +0.30/s</span>
            </div>
          </button>
          <button class="pvp-drawer-close" id="btn-close-pvp-drawer">✕</button>
        </div>
        <div class="pvp-emote-row">
          <button class="pvp-emote-chip" data-pvp-emote="salute">${dict.duelEmotes.salute}</button>
          <button class="pvp-emote-chip" data-pvp-emote="praise">${dict.duelEmotes.praise}</button>
          <button class="pvp-emote-chip" data-pvp-emote="charge">${dict.duelEmotes.charge}</button>
          <button class="pvp-emote-chip" data-pvp-emote="hold">${dict.duelEmotes.hold}</button>
        </div>
      </div>

      <div class="hud-bottom-dock">
        <div class="recruit-row">
          <button class="ult-orb-btn" id="btn-ult" title="${dict.talismanLabel} (Q)">
            <img src="./assets/weap_zhaoyun.png" alt="" />
            <span class="ult-pct" id="hud-ult-pct">45%</span>
          </button>

          <button class="recruit-main-btn" id="btn-recruit">
            <span class="rec-title" id="hud-rec-label">${dict.btnRecruit}</span>
            <span class="rec-cost">
              <img src="./assets/icon_rice.png" alt="" />
              <strong id="hud-rec-cost">12</strong>
            </span>
          </button>

          <button class="boost-side-btn" id="btn-side-boost"></button>
        </div>

        <div class="tactical-row">
          <button class="tac-btn" id="btn-tac-farm">
            <img src="./assets/icon_rice.png" alt="" />
            <div class="tac-meta">
              <span class="tac-name">${dict.actFarm} <em id="hud-farm-lv">Lv.1</em></span>
              <span class="tac-sub" id="hud-farm-cost">18</span>
            </div>
          </button>

          <button class="tac-btn talisman-green" id="btn-tac-exorcise" title="Exorcism (E)">
            <img src="./assets/crest_zhuge.png" alt="" />
            <div class="tac-meta">
              <span class="tac-name">${dict.actExorcise}</span>
              <span class="tac-sub" id="hud-exorcise-sub">20</span>
            </div>
          </button>

          <button class="tac-btn" id="btn-tac-shovel">
            <img src="./assets/icon_shovel.png" alt="" />
            <div class="tac-meta">
              <span class="tac-name">${dict.actShovel}</span>
              <span class="tac-sub" id="hud-shovel-cnt">x1</span>
            </div>
          </button>

          <button class="tac-btn" id="btn-tac-fortify">
            <img src="./assets/vip_lord.png" alt="" />
            <div class="tac-meta">
              <span class="tac-name">${dict.actFortify}</span>
              <span class="tac-sub" id="hud-fortify-cost">26</span>
            </div>
          </button>
        </div>
      </div>
    `;

    this.uiLayer.appendChild(hud);
    this.hudRoot = hud;

    (hud.querySelector('#btn-pause') as HTMLButtonElement).onclick = () => this.togglePauseModal();
    (hud.querySelector('#btn-speed') as HTMLButtonElement).onclick = () => {
      this.engine.toggleGameSpeed();
      this.syncHUD();
    };
    (hud.querySelector('#btn-ult') as HTMLButtonElement).onclick = () => {
      this.engine.activateDivineTalisman();
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
    (hud.querySelector('#btn-tac-exorcise') as HTMLButtonElement).onclick = () => {
      this.engine.castExorcism();
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
    const closeDrawerBtn = hud.querySelector('#btn-close-pvp-drawer') as HTMLButtonElement | null;
    if (closeDrawerBtn) {
      closeDrawerBtn.onclick = () => {
        this.pvpDrawerOpen = false;
        this.syncHUD();
      };
    }
    hud.querySelectorAll<HTMLButtonElement>('[data-pvp-raid]').forEach((btn) => {
      btn.onclick = () => {
        const raid = btn.dataset.pvpRaid as PvPRaidKind;
        if (this.engine.sendPvpRaid(raid)) {
          this.pvpDrawerOpen = false;
        }
        this.syncHUD();
      };
    });
    hud.querySelectorAll<HTMLButtonElement>('[data-pvp-emote]').forEach((btn) => {
      btn.onclick = () => {
        const emote = btn.dataset.pvpEmote as DuelEmoteKey;
        this.engine.sendPvpEmote(emote);
        this.pvpDrawerOpen = false;
        this.syncHUD();
      };
    });
  }

  private async handleSideBoostClick(): Promise<void> {
    const s = this.engine.state;
    if (!s) return;
    if (s.isPvp) {
      SoundFX.tileClack(true);
      this.pvpDrawerOpen = !this.pvpDrawerOpen;
      this.syncHUD();
      return;
    }
    const dict = t();
    const save = SaveManager.get();

    // 1st career Hero Shard is completely FREE!
    if (!save.freeHeroScrollUsed) {
      save.freeHeroScrollUsed = true;
      SaveManager.save();
      this.engine.grantGuaranteedHero();
      this.syncHUD();
      return;
    }

    // 1x per run Matching Hero Partner Shard via Rewarded Ad
    if (!s.heroScrollAdUsed) {
      const ok = await PlatformSDK.showRewardedAd('hero_scroll_summon', dict.adRewardHero);
      if (ok && this.engine.state) {
        this.engine.state.heroScrollAdUsed = true;
        this.engine.grantGuaranteedHero();
        this.syncHUD();
      }
      return;
    }

    // Otherwise Steamed Buns Supply Drop (Extra shovels strictly require Shovel Ad or random 5-slot drops)
    if (s.supplyAdCooldown <= 0) {
      const ok = await PlatformSDK.showRewardedAd('free_rations_supply', dict.adRewardSupply);
      if (ok && this.engine.state) {
        this.engine.state.rations += 65;
        this.engine.state.supplyAdCooldown = 35;
        this.syncHUD();
      }
    }
  }

  public syncHUD(): void {
    const s = this.engine.state;
    if (!s || !this.hudRoot) return;
    const dict = t();
    const save = SaveManager.get();

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

    const waveStr = dict.waveLabel(Math.max(1, s.wave), s.maxWaves);
    setIf('wave', waveStr, () => {
      (this.hudRoot!.querySelector('#hud-wave') as HTMLElement).textContent = waveStr;
    });

    setIf('rations', `${s.rations}`, () => {
      (this.hudRoot!.querySelector('#hud-rations') as HTMLElement).textContent = `${s.rations}`;
    });

    // Boss & Elite Boss HP Bar (Zhang Bao W5, Zhang Jiao / Lu Bu W10)
    const boss = s.enemies.find(
      (e) => e.side === 'player' && (e.isBoss || e.isMiniBoss) && e.bossType !== 'none'
    );
    const bossSig = boss ? `${boss.id}:${Math.ceil(boss.hp)}:${boss.regenTimer > 0 ? 1 : 0}` : 'none';
    setIf('boss', bossSig, () => {
      const wrap = this.hudRoot!.querySelector('#hud-boss-wrap') as HTMLElement;
      if (!boss || boss.bossType === 'none') {
        wrap.style.display = 'none';
      } else {
        wrap.style.display = 'block';
        const pct = Math.max(0, (boss.hp / boss.maxHp) * 100);
        const fill = this.hudRoot!.querySelector('#hud-boss-fill') as HTMLElement;
        fill.style.width = `${pct}%`;
        fill.classList.toggle('healing', boss.regenTimer > 0);
        const bInfo = dict.bossNames[boss.bossType];
        (this.hudRoot!.querySelector('#hud-boss-label') as HTMLElement).textContent =
          `${bInfo.name} · ${Math.ceil(boss.hp)}`;
      }
    });

    // Auto-close PvP raid popover if player starts dragging a bench/board tile
    if (this.pvpDrawerOpen && this.engine.drag?.active) {
      this.pvpDrawerOpen = false;
    }

    // Top-Right Skill Seals + Formation Synergies (in fair 2P PvP, only live board synergies apply!)
    const skillSig = s.isPvp ? 'pvp_fair' : SKILL_SPECS.map((sp) => `${sp.id}:${save.skills[sp.id]}`).join(',');
    const synSig = s.synergies.map((item) => `${item.id}:${item.tier}:${item.count}`).join('|');
    setIf('syn', `${skillSig}#${synSig}`, () => {
      const skillBadges = s.isPvp
        ? ''
        : SKILL_SPECS.filter((sp) => save.skills[sp.id] > 0)
            .slice(0, 5)
            .map((sp) => {
              const skTxt = dict.skills[sp.id];
              return `<span class="skill-seal-chip" style="background:${sp.badgeColor}" title="${skTxt.name}: ${skTxt.val(save.skills[sp.id])}">${skTxt.shortTag}<em>Lv.${save.skills[sp.id]}</em></span>`;
            })
            .join('');

      const synIcons = {
        vanguard: 'syn_vanguard',
        marksman: 'syn_marksman',
        mystic: 'syn_mystic',
        dragon_guard: 'crest_zhaoyun',
      };
      const synBadges = s.synergies
        .filter((x) => x.tier > 0)
        .map(
          (x) =>
            `<span class="syn-chip tier-${x.tier}" title="${dict.synergyNames[x.id]}: ${dict.synergyDescs[x.id]}"><img class="syn-icon-hud" src="./assets/${synIcons[x.id]}.png" alt="" />${x.count}</span>`
        )
        .join('');

      (this.hudRoot!.querySelector('#hud-synergies') as HTMLElement).innerHTML =
        skillBadges + synBadges;
    });

    // Banner & Selected Unit Info Toast
    const bannerStr = s.bannerTimer > 0 ? s.bannerText : '';
    setIf('banner', bannerStr, () => {
      const el = this.hudRoot!.querySelector('#hud-banner') as HTMLElement;
      el.textContent = bannerStr;
      el.classList.toggle('visible', Boolean(bannerStr));
    });

    const info = s.selectedUnitInfo;
    const infoKey = info
      ? `${info.unitId}:${info.tier}:${info.combatLevel}:${info.xp}:${info.maxXp}`
      : '';
    setIf('uinfo', infoKey, () => {
      const el = this.hudRoot!.querySelector('#hud-unit-info') as HTMLElement;
      if (!info) {
        el.classList.remove('visible');
      } else {
        const uTxt = getUnitDisplayText(info.unitId);
        const def = UNITS[info.unitId];
        if (def.category === 'awakened') {
          const xpTag =
            info.combatLevel >= MAX_HERO_COMBAT_LEVEL
              ? `Lv.${info.combatLevel} MAX`
              : `Lv.${info.combatLevel} (${info.xp}/${info.maxXp} XP)`;
          el.textContent = `${uTxt.name} [${xpTag} · ★${info.tier}] · ${uTxt.role}`;
        } else if (def.category === 'item') {
          el.textContent = `${uTxt.name} · ${uTxt.role}`;
        } else if (def.category === 'shard1' || def.category === 'shard2') {
          const halfTag = def.category === 'shard1' ? '1/2' : '2/2';
          el.textContent = `${uTxt.name} [${halfTag}] · ${uTxt.role}`;
        } else {
          el.textContent = `${uTxt.name} [Lv.${info.tier}] · ${uTxt.role}`;
        }
        el.classList.add('visible');
      }
    });

    // Divine Talisman Orb (神兵符)
    const ultPct = Math.floor(s.ultCharge);
    setIf('ult', `${ultPct}:${s.talismanMode ? 1 : 0}`, () => {
      const btn = this.hudRoot!.querySelector('#btn-ult') as HTMLButtonElement;
      const lbl = this.hudRoot!.querySelector('#hud-ult-pct') as HTMLElement;
      btn.classList.toggle('ready', ultPct >= 100);
      btn.classList.toggle('active-pick', s.talismanMode);
      lbl.textContent = s.talismanMode
        ? dict.talismanReady
        : ultPct >= 100
          ? dict.talismanLabel
          : `${ultPct}%`;
    });

    // Battle Speed Toggle (1x / 2x — locked to 1x in Online 2P PvP)
    setIf('spd', `${this.engine.gameSpeed}:${s.isPvp ? 1 : 0}`, () => {
      const spdBtn = this.hudRoot!.querySelector('#btn-speed') as HTMLButtonElement;
      spdBtn.textContent = s.isPvp ? '1x🔒' : `${this.engine.gameSpeed}x`;
      spdBtn.classList.toggle('fast', !s.isPvp && this.engine.gameSpeed === 2);
    });

    // Conscript Button (always replaces all 5 bench slots with a fresh batch of 5!)
    const confirmActive = s.confirmOverwriteTimer > 0;
    const recKey = `${s.recruitCost}:${s.rations >= s.recruitCost ? 1 : 0}:${confirmActive ? 1 : 0}`;
    setIf('rec', recKey, () => {
      const btn = this.hudRoot!.querySelector('#btn-recruit') as HTMLButtonElement;
      (this.hudRoot!.querySelector('#hud-rec-label') as HTMLElement).textContent = confirmActive
        ? dict.btnConfirmOverwrite
        : dict.btnRecruit;
      (this.hudRoot!.querySelector('#hud-rec-cost') as HTMLElement).textContent = `${s.recruitCost}`;
      btn.classList.toggle('affordable', s.rations >= s.recruitCost);
      btn.classList.toggle('confirm-warn', confirmActive);
    });

    // Partner Shard / Supply Boost Button (or PvP Mercenary Raid Toggle!)
    const raidCd = Math.ceil(s.pvpRaidCooldown);
    const boostMode = s.isPvp
      ? `pvp_raid:${this.pvpDrawerOpen ? 1 : 0}:${raidCd}:${s.rations}`
      : !save.freeHeroScrollUsed
        ? 'free_hero'
        : !s.heroScrollAdUsed
          ? 'ad_hero'
          : s.supplyAdCooldown <= 0
            ? 'ad_supply'
            : `cd:${Math.ceil(s.supplyAdCooldown)}`;
    setIf('boost', boostMode, () => {
      const btn = this.hudRoot!.querySelector('#btn-side-boost') as HTMLButtonElement;
      const drawer = this.hudRoot!.querySelector('#pvp-raid-drawer') as HTMLElement | null;
      if (s.isPvp) {
        btn.disabled = false;
        btn.textContent = raidCd > 0 ? `⚔ ${raidCd}s` : dict.duelBtnRaidPanel;
        btn.className = `boost-side-btn pvp-raid-trigger ${this.pvpDrawerOpen ? 'open' : ''}`;
        if (drawer) {
          drawer.style.display = this.pvpDrawerOpen ? 'flex' : 'none';
          drawer.querySelectorAll<HTMLButtonElement>('[data-pvp-raid]').forEach((rb) => {
            const rk = rb.dataset.pvpRaid as PvPRaidKind;
            const cost = this.engine.getPvpRaidSpec(rk).cost;
            rb.disabled = raidCd > 0 || s.rations < cost;
          });
        }
      } else {
        if (drawer) drawer.style.display = 'none';
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
          btn.textContent = `${Math.ceil(s.supplyAdCooldown)}s`;
          btn.className = 'boost-side-btn disabled';
        }
      }
    });

    // 4 Tactical Buttons: Farm, Exorcise (绿符降妖), Shovel, Fortify
    const farmCost = this.engine.getFarmCost();
    setIf('farm', `${s.farmLevel}:${s.rations >= farmCost ? 1 : 0}`, () => {
      (this.hudRoot!.querySelector('#hud-farm-lv') as HTMLElement).textContent =
        s.farmLevel >= 6 ? 'MAX' : `Lv.${s.farmLevel}`;
      (this.hudRoot!.querySelector('#hud-farm-cost') as HTMLElement).textContent =
        s.farmLevel >= 6 ? dict.maxLevel : `${farmCost}`;
    });

    const exCost = this.engine.getExorciseCost();
    const exCd = Math.ceil(s.exorciseCooldown);
    setIf('exorcise', `${exCd}:${s.rations >= exCost ? 1 : 0}`, () => {
      const btn = this.hudRoot!.querySelector('#btn-tac-exorcise') as HTMLButtonElement;
      const sub = this.hudRoot!.querySelector('#hud-exorcise-sub') as HTMLElement;
      btn.classList.toggle('on-cd', exCd > 0);
      sub.textContent = exCd > 0 ? `${exCd}s` : `${exCost}`;
    });

    const hasPlayerLocked = s.cells
      .slice(s.stage.dividerRow)
      .some((r) => r.some((c) => c === 'locked'));
    const benchShovelIdx = this.engine.getBenchShovelIndex();
    const shovelActive = s.shovelMode || this.engine.isBenchShovelSelected();
    setIf(
      'shovel',
      `${s.shovels}:${shovelActive ? 1 : 0}:${benchShovelIdx}:${hasPlayerLocked ? 1 : 0}:${s.isPvp ? 1 : 0}`,
      () => {
        const btn = this.hudRoot!.querySelector('#btn-tac-shovel') as HTMLButtonElement;
        const sub = this.hudRoot!.querySelector('#hud-shovel-cnt') as HTMLElement;
        btn.classList.toggle('active-mode', shovelActive);
        if (!hasPlayerLocked) {
          sub.textContent = dict.maxLevel;
        } else if (benchShovelIdx >= 0) {
          sub.textContent = getLang() === 'zh' ? '备战x1' : 'Bench';
        } else if (s.shovels > 0) {
          sub.textContent = `x${s.shovels}`;
        } else if (s.isPvp) {
          sub.textContent = dict.duelBuyShovelTag(this.engine.getPvpShovelBuyCost());
        } else {
          sub.textContent = dict.shovelAdTag;
        }
      }
    );

    const fortCost = this.engine.getFortifyCost();
    setIf('fort', `${s.hearts}:${s.rations >= fortCost ? 1 : 0}`, () => {
      (this.hudRoot!.querySelector('#hud-fortify-cost') as HTMLElement).textContent = `${fortCost}`;
    });
  }

  // ==================== PAUSE, SHOVEL AD, REVIVE & POST-VICTORY SETTLEMENT ====================

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
            <button class="btn-guofeng btn-cinnabar" id="btn-p-resume">${dict.btnResume}</button>
            <button class="btn-guofeng btn-jade" id="btn-p-mute">${muted ? dict.btnMuteOn : dict.btnMuteOff}</button>
            <button class="btn-guofeng btn-jade" id="btn-p-lang">${dict.btnLangSwitch}</button>
            <button class="btn-guofeng btn-stone" id="btn-p-quit">${dict.btnRetreat}</button>
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
      if (this.engine.state?.isPvp) {
        DuelManager.leaveRoom();
      }
      this.showHomeHub();
    };
  }

  public promptShovelAd(): void {
    const s = this.engine.state;
    if (!s || s.wavePhase === 'ended') return;
    const dict = t();

    this.engine.modalPaused = true;
    PlatformSDK.gameplayStop();

    this.modalRoot.innerHTML = `
      <div class="popup-backdrop">
        <div class="popup-box">
          <h2>${dict.shovelModalTitle}</h2>
          <p class="popup-sub">${dict.shovelModalSub}</p>
          <div class="popup-footer">
            <button class="btn-guofeng btn-cinnabar" id="btn-confirm-shovel-ad">${dict.btnWatchShovelAd}</button>
            <button class="btn-guofeng btn-stone" id="btn-cancel-shovel-ad">${dict.btnCancelShovelAd}</button>
          </div>
        </div>
      </div>
    `;

    const closePopup = () => {
      this.modalRoot.innerHTML = '';
      if (this.engine.state && this.engine.state.wavePhase !== 'ended') {
        this.engine.modalPaused = false;
        PlatformSDK.gameplayStart();
      }
    };

    const watchBtn = this.modalRoot.querySelector('#btn-confirm-shovel-ad') as HTMLButtonElement;
    watchBtn.onclick = async () => {
      watchBtn.disabled = true;
      const ok = await PlatformSDK.showRewardedAd('bonus_shovels', dict.adRewardShovels);
      closePopup();
      if (ok && this.engine.state) {
        this.engine.state.shovels += 2;
        this.engine.state.shovelMode = true;
        this.engine.showBanner(dict.bannerShovelPick, 2.2);
        this.syncHUD();
      }
    };

    (this.modalRoot.querySelector('#btn-cancel-shovel-ad') as HTMLButtonElement).onclick = () => {
      closePopup();
    };
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
        aiDefeated: false,
        droppedShards: [...s.droppedShards],
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
            <button class="btn-guofeng btn-cinnabar" id="btn-do-revive">${dict.btnReviveAd}</button>
            <button class="btn-guofeng btn-stone" id="btn-skip-revive">${dict.btnSkipRevive}</button>
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
        aiDefeated: false,
        droppedShards: [...s.droppedShards],
      });
    };
  }

  public showSettlementModal(victory: boolean, sum: RunSummary): void {
    cancelAnimationFrame(this.needleAnimId);
    this.pauseOpen = false;
    this.engine.modalPaused = true;
    const dict = t();

    const baseGold = Math.round(
      40 + sum.wave * 17 + Math.min(230, sum.kills * 0.55) + sum.merges * 3 + (victory ? 140 : 0)
    );
    const baseXp = Math.round(
      35 + sum.wave * 17 + Math.min(240, sum.kills * 0.65) + (victory ? 115 : 0)
    );

    // Credit base Gold & XP immediately so the player can shop for Skills right here!
    SaveManager.addRewards(baseGold, baseXp);
    let bonusAdClaimed = false;

    const zones = [2, 3, 5, 3, 2];
    const heading = sum.isPvp
      ? sum.pvpEndReason === 'rival_ko'
        ? dict.pvpVictoryKoTitle
        : sum.pvpEndReason === 'race_win'
          ? dict.pvpVictoryRaceTitle
          : sum.pvpEndReason === 'rival_left'
            ? dict.pvpVictoryForfeitTitle
            : sum.pvpEndReason === 'race_loss'
              ? dict.pvpDefeatRaceTitle
              : dict.pvpDefeatKoTitle
      : victory
        ? sum.aiDefeated
          ? dict.victoryRivalKoTitle
          : dict.victoryTitle
        : dict.defeatTitle;

    // Count dropped shards by weaponId
    const dropCounts: Partial<Record<WeaponId, number>> = {};
    for (const wId of sum.droppedShards) {
      dropCounts[wId] = (dropCounts[wId] || 0) + 1;
    }

    let curMult = 3;

    const renderSettleInner = () => {
      const save = SaveManager.get();

      const dropChipsHtml =
        sum.droppedShards.length > 0
          ? (Object.keys(dropCounts) as WeaponId[])
              .map((wId) => {
                const cnt = dropCounts[wId]!;
                const wTxt = dict.weapons[wId];
                const have = save.weaponShards[wId] || 0;
                const need = SaveManager.getShardsNeededForNextStar(wId);
                const canForge = need !== null && have >= need;
                return `
                  <div class="drop-shard-pill">
                    <img src="./assets/${wId}.png" alt="" />
                    <div class="drop-shard-txt">
                      <strong>${wTxt.name} +${cnt}</strong>
                      <span>${dict.shardCount(have, need)}</span>
                    </div>
                    ${
                      canForge
                        ? `<button class="btn-guofeng btn-mini btn-cinnabar" data-settle-forge="${wId}">
                            ${(save.weapons[wId] || 0) === 0 ? dict.btnForgeWeapon(need!) : dict.btnStarUpWeapon(need!)}
                          </button>`
                        : ''
                    }
                  </div>
                `;
              })
              .join('')
          : `<div class="no-drops-note"><img src="./assets/icon_chest.png" alt=""/> ${dict.armoryTip}</div>`;

      const inlineSkillsHtml = SKILL_SPECS.map((sp) => {
        const lvl = save.skills[sp.id];
        const isMax = lvl >= sp.maxLevel;
        const cost = SaveManager.getSkillCost(sp.id);
        const canBuy = !isMax && save.gold >= cost;
        const skTxt = dict.skills[sp.id];
        return `
          <div class="settle-skill-item">
            <div class="ss-left">
              <img class="ss-badge-img" src="./assets/${sp.spriteKey}.png" alt="" style="border-color:${sp.badgeColor}" />
              <div>
                <div class="ss-name">${skTxt.name} <small>Lv.${lvl}/${sp.maxLevel}</small></div>
                <div class="ss-val">${skTxt.val(lvl)}</div>
              </div>
            </div>
            <button class="btn-guofeng btn-mini ${isMax ? 'btn-stone' : canBuy ? 'btn-gilt' : 'btn-disabled'}"
              data-settle-skill="${sp.id}" ${!canBuy ? 'disabled' : ''}>
              ${isMax ? dict.maxLevel : dict.upgradeBtn(cost)}
            </button>
          </div>
        `;
      }).join('');

      const shownGold = bonusAdClaimed ? baseGold * curMult : baseGold;
      const isPvpRoomAlive = Boolean(
        sum.isPvp && DuelManager.isOnline() && DuelManager.lobby && DuelManager.lobby.members.length >= 2
      );
      const isPvpHost = sum.isPvp && DuelManager.role === 'host';

      this.modalRoot.innerHTML = `
        <div class="popup-backdrop">
          <div class="popup-box settle-wide">
            <h2>${heading}</h2>
            <p class="popup-sub">${dict.settleSub(sum.wave, sum.kills, sum.merges)}</p>
            ${
              sum.isPvp
                ? `<div class="pvp-vs-summary-pill">${dict.pvpSettleVsLine(
                    this.escapeHtml(sum.rivalCallsign || dict.rivalTag),
                    sum.rivalWave || 1,
                    sum.rivalKills || 0
                  )}</div>`
                : ''
            }

            <div class="reward-preview">
              <span>◈ <strong id="rew-gold">+${shownGold}</strong></span>
              <span>✦ <strong id="rew-xp">+${baseXp} XP</strong></span>
              <span class="wallet-tag">◈ ${save.gold}G</span>
            </div>

            ${
              !bonusAdClaimed && !isPvpRoomAlive
                ? `
                  <div class="meter-wrap">
                    <div class="meter-bar">
                      <div class="m-z z2">x2</div>
                      <div class="m-z z3">x3</div>
                      <div class="m-z z5">x5</div>
                      <div class="m-z z3">x3</div>
                      <div class="m-z z2">x2</div>
                      <div class="meter-needle" id="settle-needle" style="left:50%"></div>
                    </div>
                  </div>
                `
                : ''
            }

            <div class="settle-section">
              <div class="settle-sec-head">${dict.settleDropsTitle}</div>
              <div class="settle-drops-list">${dropChipsHtml}</div>
            </div>

            <div class="settle-section">
              <div class="settle-sec-head">${dict.settleSkillShopTitle}</div>
              <div class="settle-skill-list">${inlineSkillsHtml}</div>
            </div>

            <div class="popup-footer">
              ${
                !bonusAdClaimed && !isPvpRoomAlive
                  ? `<button class="btn-guofeng btn-cinnabar" id="btn-mult-claim">🎬 x3 (+${baseGold * 2}G) · ${dict.btnMultClaim}</button>`
                  : ''
              }
              ${
                sum.isPvp
                  ? `
                    ${
                      isPvpRoomAlive && isPvpHost
                        ? `<button class="btn-guofeng btn-cinnabar" id="btn-pvp-rematch">${dict.btnPvpRematch}</button>`
                        : ''
                    }
                    <div class="settle-dual-btns">
                      ${
                        DuelManager.isOnline()
                          ? `<button class="btn-guofeng btn-gilt" id="btn-pvp-back-room">${dict.btnPvpBackRoom}</button>`
                          : `<button class="btn-guofeng btn-gilt" id="btn-pvp-quick-again">${dict.duelQuickMatch}</button>`
                      }
                      <button class="btn-guofeng btn-stone" id="btn-normal-claim">${dict.btnPvpLeaveHub}</button>
                    </div>
                  `
                  : `
                    <div class="settle-dual-btns">
                      <button class="btn-guofeng btn-jade" id="btn-retry-stage">↻ ${dict.btnRetryStage}</button>
                      <button class="btn-guofeng btn-gilt" id="btn-normal-claim">${dict.btnNormalClaim}</button>
                    </div>
                  `
              }
            </div>
          </div>
        </div>
      `;

      // Bind Forge Weapon inside settlement
      this.modalRoot.querySelectorAll<HTMLButtonElement>('[data-settle-forge]').forEach((btn) => {
        btn.onclick = () => {
          const wId = btn.dataset.settleForge as WeaponId;
          if (SaveManager.forgeOrUpgradeWeapon(wId)) {
            SoundFX.dragonUlt();
            renderSettleInner();
            startNeedleLoop();
          }
        };
      });

      // Bind Skill Purchase inside settlement
      this.modalRoot.querySelectorAll<HTMLButtonElement>('[data-settle-skill]').forEach((btn) => {
        btn.onclick = () => {
          const id = btn.dataset.settleSkill as SkillId;
          if (SaveManager.buySkill(id)) {
            SoundFX.fanfare();
            renderSettleInner();
            startNeedleLoop();
          }
        };
      });

      const multBtn = this.modalRoot.querySelector('#btn-mult-claim') as HTMLButtonElement | null;
      if (multBtn) {
        multBtn.onclick = async () => {
          cancelAnimationFrame(this.needleAnimId);
          const locked = curMult;
          multBtn.disabled = true;
          const ok = await PlatformSDK.showRewardedAd(
            'settlement_multiplier',
            dict.adRewardSettle(locked)
          );
          if (ok) {
            bonusAdClaimed = true;
            curMult = locked;
            SaveManager.addRewards(baseGold * (locked - 1), baseXp * (locked - 1));
            SoundFX.fanfare();
            renderSettleInner();
          } else {
            multBtn.disabled = false;
            startNeedleLoop();
          }
        };
      }

      const pvpRematchBtn = this.modalRoot.querySelector('#btn-pvp-rematch') as HTMLButtonElement | null;
      if (pvpRematchBtn) {
        pvpRematchBtn.onclick = () => {
          cancelAnimationFrame(this.needleAnimId);
          SoundFX.dragonUlt();
          DuelManager.launchHostDuel();
        };
      }

      const pvpBackRoomBtn = this.modalRoot.querySelector('#btn-pvp-back-room') as HTMLButtonElement | null;
      if (pvpBackRoomBtn) {
        pvpBackRoomBtn.onclick = () => {
          cancelAnimationFrame(this.needleAnimId);
          SoundFX.tileClack(true);
          DuelManager.returnDuelToLobby();
          this.openDuelLobbyTab();
        };
      }

      const pvpQuickAgainBtn = this.modalRoot.querySelector('#btn-pvp-quick-again') as HTMLButtonElement | null;
      if (pvpQuickAgainBtn) {
        pvpQuickAgainBtn.onclick = () => {
          cancelAnimationFrame(this.needleAnimId);
          SoundFX.recruit();
          this.openDuelLobbyTab();
          DuelManager.quickMatchOrCreate(sum.stageId, sum.mode);
        };
      }

      const retryBtn = this.modalRoot.querySelector('#btn-retry-stage') as HTMLButtonElement | null;
      if (retryBtn) {
        retryBtn.onclick = () => {
          cancelAnimationFrame(this.needleAnimId);
          const st = STAGES.find((item) => item.id === sum.stageId) || STAGES[0];
          SoundFX.recruit();
          this.startStageRun(st, sum.mode);
        };
      }

      const normalBtn = this.modalRoot.querySelector('#btn-normal-claim') as HTMLButtonElement;
      normalBtn.onclick = () => {
        cancelAnimationFrame(this.needleAnimId);
        if (sum.isPvp) {
          DuelManager.leaveRoom();
          this.hubTab = 'duel';
        }
        this.showHomeHub();
      };
    };

    const startNeedleLoop = () => {
      cancelAnimationFrame(this.needleAnimId);
      if (bonusAdClaimed) return;
      const needle = this.modalRoot.querySelector('#settle-needle') as HTMLElement | null;
      const multBtn = this.modalRoot.querySelector('#btn-mult-claim') as HTMLButtonElement | null;
      if (!needle || !multBtn) return;

      const t0 = performance.now();
      const tick = (now: number) => {
        const elapsed = (now - t0) / 1000;
        const pos = (Math.sin(elapsed * 3.4) + 1) * 0.5;
        needle.style.left = `${(pos * 100).toFixed(1)}%`;
        const idx = Math.min(4, Math.floor(pos * 5));
        const m = zones[idx];
        if (m !== curMult) {
          curMult = m;
          multBtn.textContent = `🎬 x${curMult} (+${baseGold * (curMult - 1)}G) · ${dict.btnMultClaim}`;
        }
        this.needleAnimId = requestAnimationFrame(tick);
      };
      this.needleAnimId = requestAnimationFrame(tick);
    };

    renderSettleInner();
    startNeedleLoop();
  }
}
