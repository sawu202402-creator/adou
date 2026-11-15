import { getLang, setLang } from '../i18n/locale';
import { PlatformSDK } from '../platform/PlatformSDK';
import { Lang, MetaUpgradeLevels, SaveData } from '../types';

const SAVE_KEY = 'czgame_dynasty_tile_guard_v1';

const DEFAULT_SAVE: SaveData = {
  commanderLevel: 1,
  commanderXp: 0,
  gold: 90,
  upgrades: {
    hearts: 0,
    granary: 0,
    might: 0,
    decree: 0,
    shovels: 0,
  },
  clearedStages: [],
  endlessBestWave: {},
  totalRuns: 0,
  freeHeroScrollUsed: false,
};

export interface UpgradeTrackSpec {
  key: keyof MetaUpgradeLevels;
  icon: string;
  maxLevel: number;
  baseCost: number;
  costStep: number;
}

export const UPGRADE_TRACKS: UpgradeTrackSpec[] = [
  { key: 'hearts', icon: '❤️', maxLevel: 8, baseCost: 100, costStep: 80 },
  { key: 'granary', icon: '🍙', maxLevel: 10, baseCost: 110, costStep: 85 },
  { key: 'might', icon: '⚔️', maxLevel: 10, baseCost: 120, costStep: 95 },
  { key: 'decree', icon: '👑', maxLevel: 8, baseCost: 135, costStep: 105 },
  { key: 'shovels', icon: '🪏', maxLevel: 6, baseCost: 140, costStep: 115 },
];

class SaveService {
  private data: SaveData = structuredClone(DEFAULT_SAVE);

  public load(): SaveData {
    const raw = PlatformSDK.getStorageItem(SAVE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<SaveData>;
        this.data = {
          ...structuredClone(DEFAULT_SAVE),
          ...parsed,
          upgrades: {
            ...DEFAULT_SAVE.upgrades,
            ...(parsed.upgrades || {}),
          },
          endlessBestWave: {
            ...(parsed.endlessBestWave || {}),
          },
        };
        if (this.data.lang === 'en' || this.data.lang === 'zh') {
          setLang(this.data.lang);
        } else {
          this.data.lang = getLang();
        }
      } catch {
        this.data = structuredClone(DEFAULT_SAVE);
      }
    } else {
      this.data.lang = getLang();
    }
    return this.data;
  }

  public get(): SaveData {
    return this.data;
  }

  public save(): void {
    PlatformSDK.setStorageItem(SAVE_KEY, JSON.stringify(this.data));
  }

  public toggleLang(): Lang {
    const next: Lang = getLang() === 'en' ? 'zh' : 'en';
    setLang(next);
    this.data.lang = next;
    this.save();
    return next;
  }

  public xpForNextLevel(level: number): number {
    return 110 + (level - 1) * 80;
  }

  public addRewards(goldEarned: number, xpEarned: number): { leveledUp: boolean; newLevel: number } {
    this.data.gold += Math.round(goldEarned);
    this.data.commanderXp += Math.round(xpEarned);

    let leveledUp = false;
    while (this.data.commanderXp >= this.xpForNextLevel(this.data.commanderLevel)) {
      this.data.commanderXp -= this.xpForNextLevel(this.data.commanderLevel);
      this.data.commanderLevel += 1;
      this.data.gold += 45;
      leveledUp = true;
    }
    this.save();
    return { leveledUp, newLevel: this.data.commanderLevel };
  }

  public getUpgradeCost(key: keyof MetaUpgradeLevels): number {
    const spec = UPGRADE_TRACKS.find((item) => item.key === key)!;
    return spec.baseCost + this.data.upgrades[key] * spec.costStep;
  }

  public buyUpgrade(key: keyof MetaUpgradeLevels): boolean {
    const spec = UPGRADE_TRACKS.find((item) => item.key === key)!;
    const lvl = this.data.upgrades[key];
    if (lvl >= spec.maxLevel) return false;
    const cost = this.getUpgradeCost(key);
    if (this.data.gold < cost) return false;
    this.data.gold -= cost;
    this.data.upgrades[key] = lvl + 1;
    this.save();
    return true;
  }

  public markStageCleared(stageId: string): void {
    if (!this.data.clearedStages.includes(stageId)) {
      this.data.clearedStages.push(stageId);
      this.save();
    }
  }

  public recordEndlessWave(stageId: string, wave: number): void {
    const prev = this.data.endlessBestWave[stageId] || 0;
    if (wave > prev) {
      this.data.endlessBestWave[stageId] = wave;
      this.save();
    }
  }

  public getEffectiveBonuses() {
    const u = this.data.upgrades;
    return {
      maxHearts: 10 + u.hearts * 2,
      barricadeHpMult: 1 + u.hearts * 0.14,
      startRations: 28 + u.granary * 10,
      passiveRationBonus: u.granary * 0.25,
      damageMult: 1 + u.might * 0.08 + (this.data.commanderLevel - 1) * 0.03,
      heroChanceBonus: u.decree * 0.035,
      startShovels: 1 + Math.floor((u.shovels + 1) / 2),
    };
  }
}

export const SaveManager = new SaveService();
