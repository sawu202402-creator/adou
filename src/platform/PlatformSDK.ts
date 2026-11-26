import { AdPlacement } from '../types';
import { SoundFX } from '../audio/SoundFX';
import { t } from '../i18n/locale';

interface CrazyGamesSettings {
  disableChat?: boolean;
  muteAudio?: boolean;
}

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: {
        init: () => Promise<void>;
        environment?: string;
        system?: {
          info?: {
            device?: {
              type?: 'desktop' | 'tablet' | 'mobile';
            };
          };
        };
        game?: {
          loadingStart?: () => void;
          loadingStop?: () => void;
          gameplayStart: () => void;
          gameplayStop: () => void;
          happytime: () => void;
          settings?: CrazyGamesSettings;
          addSettingsChangeListener?: (cb: (settings: CrazyGamesSettings) => void) => void;
          isInstantMultiplayer?: boolean;
          inviteParams?: Record<string, string | undefined>;
          getInviteParam?: (key: string) => string | undefined | null;
          inviteLink?: (params: Record<string, string>) => string;
          showInviteButton?: (params: Record<string, string>) => string;
          hideInviteButton?: () => void;
          updateRoom?: (params: {
            roomId: string;
            isJoinable?: boolean;
            inviteParams?: Record<string, string>;
          }) => void;
          leftRoom?: () => void;
          addJoinRoomListener?: (cb: (params: Record<string, string>) => void) => void;
        };
        ad?: {
          requestAd: (
            type: 'rewarded' | 'midgame',
            callbacks: {
              adStarted?: () => void;
              adFinished?: () => void;
              adError?: (err: unknown) => void;
            }
          ) => void;
        };
        data?: {
          getItem: (key: string) => string | null;
          setItem: (key: string, val: string) => void;
        };
      };
    };
    PokiSDK?: {
      shareableURL?: (params: Record<string, string>) => Promise<string>;
      getURLParam?: (key: string) => string | undefined;
    };
  }
}

class PlatformAdapter {
  private initialized = false;
  private isCrazyGames = false;
  private isGameplayActive = false;
  private pauseHook: ((paused: boolean) => void) | null = null;

  public async init(onPauseChange: (paused: boolean) => void): Promise<void> {
    this.pauseHook = onPauseChange;
    if (this.initialized) return;
    this.initialized = true;

    try {
      if (window.CrazyGames?.SDK) {
        await window.CrazyGames.SDK.init();
        const env = window.CrazyGames.SDK.environment;
        this.isCrazyGames = env === 'crazygames' || env === 'local';

        const initSettings = window.CrazyGames.SDK.game?.settings;
        if (initSettings && typeof initSettings.muteAudio === 'boolean') {
          SoundFX.setAdMuted(initSettings.muteAudio);
        }
        window.CrazyGames.SDK.game?.addSettingsChangeListener?.((newSettings) => {
          if (newSettings && typeof newSettings.muteAudio === 'boolean') {
            SoundFX.setAdMuted(newSettings.muteAudio);
          }
        });
      }
    } catch {
      this.isCrazyGames = false;
    }
  }

  public loadingStart(): void {
    try {
      window.CrazyGames?.SDK?.game?.loadingStart?.();
    } catch {
      // ignore
    }
  }

  public loadingStop(): void {
    try {
      window.CrazyGames?.SDK?.game?.loadingStop?.();
    } catch {
      // ignore
    }
  }

  public gameplayStart(): void {
    if (this.isGameplayActive) return;
    this.isGameplayActive = true;
    try {
      window.CrazyGames?.SDK?.game?.gameplayStart();
    } catch {
      // ignore
    }
  }

  public gameplayStop(): void {
    if (!this.isGameplayActive) return;
    this.isGameplayActive = false;
    try {
      window.CrazyGames?.SDK?.game?.gameplayStop();
    } catch {
      // ignore
    }
  }

  public happyTime(): void {
    try {
      window.CrazyGames?.SDK?.game?.happytime();
    } catch {
      // ignore
    }
  }

  public isChatDisabled(): boolean {
    try {
      return Boolean(window.CrazyGames?.SDK?.game?.settings?.disableChat);
    } catch {
      return false;
    }
  }

  public async buildInviteLink(roomCode: string): Promise<string> {
    try {
      if (window.PokiSDK?.shareableURL) {
        const pokiLink = await window.PokiSDK.shareableURL({ room: roomCode });
        if (pokiLink) return pokiLink;
      }
    } catch {
      // fallback below
    }

    try {
      if (this.isCrazyGames && window.CrazyGames?.SDK?.game?.inviteLink) {
        const cgLink = window.CrazyGames.SDK.game.inviteLink({ roomId: roomCode });
        if (cgLink) return cgLink;
      }
    } catch {
      // fallback below
    }

    const url = new URL(window.location.href);
    url.searchParams.set('room', roomCode);
    return url.toString();
  }

  public showInviteButton(roomCode: string, isJoinable = true): void {
    try {
      if (!this.isCrazyGames) return;
      if (window.CrazyGames?.SDK?.game?.updateRoom) {
        window.CrazyGames.SDK.game.updateRoom({
          roomId: roomCode,
          isJoinable,
          inviteParams: { roomId: roomCode },
        });
      } else if (isJoinable && window.CrazyGames?.SDK?.game?.showInviteButton) {
        window.CrazyGames.SDK.game.showInviteButton({ roomId: roomCode });
      }
    } catch {
      // ignore
    }
  }

  public hideInviteButton(keepRoomCode?: string): void {
    try {
      if (!this.isCrazyGames) return;
      if (keepRoomCode && window.CrazyGames?.SDK?.game?.updateRoom) {
        window.CrazyGames.SDK.game.updateRoom({
          roomId: keepRoomCode,
          isJoinable: false,
          inviteParams: { roomId: keepRoomCode },
        });
      } else {
        window.CrazyGames?.SDK?.game?.hideInviteButton?.();
        window.CrazyGames?.SDK?.game?.leftRoom?.();
      }
    } catch {
      // ignore
    }
  }

  public registerJoinRoomListener(onJoinRoom: (roomCode: string) => void): void {
    try {
      window.CrazyGames?.SDK?.game?.addJoinRoomListener?.((params) => {
        const code = params?.roomId || params?.room;
        if (code && code.trim().length >= 4) {
          onJoinRoom(code.trim().toUpperCase());
        }
      });
    } catch {
      // ignore
    }
  }

  public isInstantMultiplayerRequested(): boolean {
    try {
      return Boolean(window.CrazyGames?.SDK?.game?.isInstantMultiplayer);
    } catch {
      return false;
    }
  }

  public hasPendingInviteUrl(): boolean {
    try {
      const pokiRoom = window.PokiSDK?.getURLParam?.('room');
      if (pokiRoom && pokiRoom.trim().length >= 4) return true;
    } catch {
      // ignore
    }
    try {
      const cgInvite =
        window.CrazyGames?.SDK?.game?.inviteParams?.roomId ||
        window.CrazyGames?.SDK?.game?.inviteParams?.room ||
        window.CrazyGames?.SDK?.game?.getInviteParam?.('roomId');
      if (cgInvite && cgInvite.trim().length >= 4) return true;
    } catch {
      // ignore
    }
    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('room') || url.searchParams.get('roomId');
      return Boolean(code && code.trim().length >= 4);
    } catch {
      return false;
    }
  }

  public consumeInviteRoomCode(): string | null {
    try {
      const pokiRoom = window.PokiSDK?.getURLParam?.('room');
      if (pokiRoom && pokiRoom.trim().length >= 4) {
        return pokiRoom.trim().toUpperCase();
      }
    } catch {
      // ignore
    }

    try {
      const initInvite =
        window.CrazyGames?.SDK?.game?.inviteParams?.roomId ||
        window.CrazyGames?.SDK?.game?.inviteParams?.room ||
        window.CrazyGames?.SDK?.game?.getInviteParam?.('roomId');
      if (initInvite && initInvite.trim().length >= 4) {
        return initInvite.trim().toUpperCase();
      }
    } catch {
      // ignore
    }

    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('room') || url.searchParams.get('roomId');
      if (code && code.trim().length >= 4) {
        url.searchParams.delete('room');
        url.searchParams.delete('roomId');
        window.history.replaceState({}, '', url.toString());
        return code.trim().toUpperCase();
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Pure Rewarded Video API (no forced splash or midgame interstitials).
   * Strictly pauses game loop and mutes WebAudio during playback per CrazyGames QA rules.
   */
  public showRewardedAd(placement: AdPlacement, rewardTitle: string): Promise<boolean> {
    this.gameplayStop();
    SoundFX.setAdMuted(true);
    this.pauseHook?.(true);

    const finish = (success: boolean) => {
      const platformMuted = Boolean(window.CrazyGames?.SDK?.game?.settings?.muteAudio);
      SoundFX.setAdMuted(platformMuted);
      this.pauseHook?.(false);
      if (success) {
        SoundFX.fanfare();
      }
      return success;
    };

    if (this.isCrazyGames && window.CrazyGames?.SDK?.ad) {
      return new Promise<boolean>((resolve) => {
        window.CrazyGames!.SDK!.ad!.requestAd('rewarded', {
          adStarted: () => {
            SoundFX.setAdMuted(true);
          },
          adFinished: () => {
            resolve(finish(true));
          },
          adError: () => {
            if (window.CrazyGames?.SDK?.environment === 'local') {
              this.runMockAdModal(placement, rewardTitle).then((ok) => resolve(finish(ok)));
            } else {
              resolve(finish(false));
            }
          },
        });
      });
    }

    return this.runMockAdModal(placement, rewardTitle).then((ok) => finish(ok));
  }

  private runMockAdModal(placement: AdPlacement, rewardTitle: string): Promise<boolean> {
    const dict = t();
    return new Promise<boolean>((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'mock-ad-overlay';
      overlay.innerHTML = `
        <div class="mock-ad-card">
          <div class="mock-ad-badge">${dict.mockAdBadge(placement)}</div>
          <h3>${dict.mockAdCalling}</h3>
          <p class="mock-ad-reward">${dict.mockAdReward(rewardTitle)}</p>
          <div class="mock-ad-bar-wrap">
            <div class="mock-ad-bar-fill" id="mock-ad-bar"></div>
          </div>
          <p class="mock-ad-sub" id="mock-ad-timer">${dict.mockAdTimer('1.8')}</p>
          <div class="mock-ad-actions">
            <button class="btn-ink btn-gray" id="mock-ad-cancel">${dict.mockAdCancel}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const bar = overlay.querySelector('#mock-ad-bar') as HTMLElement;
      const timerText = overlay.querySelector('#mock-ad-timer') as HTMLElement;
      const cancelBtn = overlay.querySelector('#mock-ad-cancel') as HTMLButtonElement;

      const totalMs = 1800;
      const start = performance.now();
      let cancelled = false;

      const cleanup = () => overlay.remove();

      cancelBtn.onclick = () => {
        cancelled = true;
        cleanup();
        resolve(false);
      };

      const tick = (now: number) => {
        if (cancelled) return;
        const elapsed = now - start;
        const pct = Math.min(1, elapsed / totalMs);
        bar.style.width = `${pct * 100}%`;
        const remain = Math.max(0, (totalMs - elapsed) / 1000).toFixed(1);
        timerText.textContent = dict.mockAdTimer(remain);
        if (pct >= 1) {
          cleanup();
          resolve(true);
        } else {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    });
  }

  public getStorageItem(key: string): string | null {
    try {
      if (window.CrazyGames?.SDK?.data) {
        const val = window.CrazyGames.SDK.data.getItem(key);
        if (val !== null && val !== undefined) return val;
      }
    } catch {
      // fallback
    }
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  public setStorageItem(key: string, value: string): void {
    try {
      window.CrazyGames?.SDK?.data?.setItem(key, value);
    } catch {
      // ignore
    }
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  }
}

export const PlatformSDK = new PlatformAdapter();
