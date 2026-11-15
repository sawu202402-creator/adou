import { SKILL_SPECS, WEAPON_IDS, WEAPON_SPECS } from '../data/weaponsAndSkills';
import { getLang, setLang } from '../i18n/locale';
import { PlatformSDK } from '../platform/PlatformSDK';
import { HeroKey, Lang, SaveData, SkillId, WeaponId } from '../types';

const SAVE_KEY = 'czgame_dynasty_tile_guard_v3';

const DEFAULT_SAVE: SaveData = {
  commanderLevel: 1,
  commanderXp: 0,
  gold: 110,
  skills: {
    rank_up: 1,
    haste_scroll: 0,
    meteor_art: 0,
    tomb_raider: 0,
    exorcist_seal: 0,
    hero_decree: 0,
    granary_art: 0,
    frost_inkstone: 0,
  },
  weaponShards: {
    weap_zhaoyun: 2,
    weap_guanyu: 1,
    weap_zhangfei: 0,
    weap_zhuge: 0,
    weap_zhenji: 0,
    weap_shangxiang: 0,
  },
  weapons: {
    weap_zhaoyun: 0,
    weap_guanyu: 0,
    weap_zhangfei: 0,
    weap_zhuge: 0,
    weap_zhenji: 0,
    weap_shangxiang: 0,
  },
  equippedWeapons: {},
  clearedStages: [],
  endlessBestWave: {},
  totalRuns: 0,
  freeHeroScrollUsed: false,
};

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
          skills: {
            ...DEFAULT_SAVE.skills,
            ...(parsed.skills || {}),
          },
          weaponShards: {
            ...DEFAULT_SAVE.weaponShards,
            ...(parsed.weaponShards || {}),
          },
          weapons: {
            ...DEFAULT_SAVE.weapons,
            ...(parsed.weapons || {}),
          },
          equippedWeapons: {
            ...(parsed.equippedWeapons || {}),
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
      this.data.gold += 50;
      leveledUp = true;
    }
    this.save();
    return { leveledUp, newLevel: this.data.commanderLevel };
  }

  // ==================== SKILL SHOP ====================

  public getSkillCost(id: SkillId): number {
    const spec = SKILL_SPECS.find((item) => item.id === id)!;
    return spec.baseCost + this.data.skills[id] * spec.costStep;
  }

  public buySkill(id: SkillId): boolean {
    const spec = SKILL_SPECS.find((item) => item.id === id)!;
    const lvl = this.data.skills[id];
    if (lvl >= spec.maxLevel) return false;
    const cost = this.getSkillCost(id);
    if (this.data.gold < cost) return false;
    this.data.gold -= cost;
    this.data.skills[id] = lvl + 1;
    this.save();
    return true;
  }

  // ==================== WEAPON SHARDS & HERO EQUIPMENT ====================

  public grantRandomWeaponShard(preferred?: WeaponId): WeaponId {
    const chosen =
      preferred && Math.random() < 0.45
        ? preferred
        : WEAPON_IDS[Math.floor(Math.random() * WEAPON_IDS.length)];
    this.data.weaponShards[chosen] = (this.data.weaponShards[chosen] || 0) + 1;
    this.save();
    return chosen;
  }

  public getShardsNeededForNextStar(id: WeaponId): number | null {
    const spec = WEAPON_SPECS[id];
    const star = this.data.weapons[id] || 0;
    if (star === 0) return spec.unlockShards;
    if (star >= 5) return null;
    return spec.starUpShards[star - 1] ?? 5;
  }

  public forgeOrUpgradeWeapon(id: WeaponId): boolean {
    const needed = this.getShardsNeededForNextStar(id);
    if (needed === null) return false;
    const have = this.data.weaponShards[id] || 0;
    if (have < needed) return false;

    this.data.weaponShards[id] = have - needed;
    const prevStar = this.data.weapons[id] || 0;
    this.data.weapons[id] = prevStar + 1;

    // Auto-equip onto its signature Hero if that Hero has nothing equipped yet!
    const sigHero = WEAPON_SPECS[id].signatureHero;
    if (prevStar === 0 && !this.data.equippedWeapons[sigHero]) {
      this.equipWeapon(sigHero, id);
    }

    this.save();
    return true;
  }

  public equipWeapon(hero: HeroKey, weaponId: WeaponId | null): void {
    if (weaponId === null) {
      delete this.data.equippedWeapons[hero];
      this.save();
      return;
    }
    if ((this.data.weapons[weaponId] || 0) <= 0) return;

    // Detach from any other hero currently holding this weapon
    (Object.keys(this.data.equippedWeapons) as HeroKey[]).forEach((h) => {
      if (this.data.equippedWeapons[h] === weaponId) {
        delete this.data.equippedWeapons[h];
      }
    });
    this.data.equippedWeapons[hero] = weaponId;
    this.save();
  }

  public getHeroWeaponBonus(hero: HeroKey): {
    weaponId: WeaponId | null;
    star: number;
    isSignature: boolean;
    dmgMult: number;
    aspdMult: number;
  } {
    const wId = this.data.equippedWeapons[hero] || null;
    if (!wId || (this.data.weapons[wId] || 0) <= 0) {
      return { weaponId: null, star: 0, isSignature: false, dmgMult: 1, aspdMult: 1 };
    }
    const star = this.data.weapons[wId];
    const spec = WEAPON_SPECS[wId];
    const isSig = spec.signatureHero === hero;
    const dmgBonus = spec.baseDmgBonus + (star - 1) * 0.16 + (isSig ? 0.18 : 0);
    const aspdBonus = spec.aspdBonus + (star - 1) * 0.04 + (isSig ? 0.08 : 0);
    return {
      weaponId: wId,
      star,
      isSignature: isSig,
      dmgMult: 1 + dmgBonus,
      aspdMult: 1 + aspdBonus,
    };
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
    const sk = this.data.skills;
    return {
      maxHearts: 9 + Math.floor(sk.rank_up / 2),
      barricadeHpMult: 1 + sk.rank_up * 0.1,
      startRations: 28 + sk.rank_up * 4 + sk.granary_art * 8,
      passiveRationBonus: sk.granary_art * 0.45,
      damageMult: 1 + (sk.rank_up - 1) * 0.1 + (this.data.commanderLevel - 1) * 0.03,
      aspdMult: 1 + sk.haste_scroll * 0.12,
      meteorLevel: sk.meteor_art,
      tombRaiderLevel: sk.tomb_raider,
      bossDmgMult: 1 + sk.exorcist_seal * 0.25,
      heroChanceBonus: sk.hero_decree * 0.045,
      roadSlowRatio: sk.frost_inkstone > 0 ? Math.min(0.36, 0.1 + sk.frost_inkstone * 0.045) : 0,
      startShovels: 1 + (sk.tomb_raider >= 2 ? 1 : 0) + (sk.tomb_raider >= 4 ? 1 : 0),
    };
  }
}

export const SaveManager = new SaveService();
