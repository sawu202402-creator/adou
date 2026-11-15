import { AdPlacement } from '../types';
import { SoundFX } from '../audio/SoundFX';
import { t } from '../i18n/locale';

declare global {
  interface Window {
    CrazyGames?: {
      SDK?: {
        init: () => Promise<void>;
        environment?: string;
        game?: {
          gameplayStart: () => void;
          gameplayStop: () => void;
          happytime: () => void;
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
  }
}

class PlatformAdapter {
  private initialized = false;
  private isCrazyGames = false;
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
      }
    } catch {
      this.isCrazyGames = false;
    }
  }

  public gameplayStart(): void {
    try {
      window.CrazyGames?.SDK?.game?.gameplayStart();
    } catch {
      // ignore
    }
  }

  public gameplayStop(): void {
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

  /**
   * Pure Rewarded Video API (no forced splash or midgame interstitials).
   * Strictly pauses game loop and mutes WebAudio during playback per CrazyGames QA rules.
   */
  public showRewardedAd(placement: AdPlacement, rewardTitle: string): Promise<boolean> {
    this.gameplayStop();
    SoundFX.setAdMuted(true);
    this.pauseHook?.(true);

    const finish = (success: boolean) => {
      SoundFX.setAdMuted(false);
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
