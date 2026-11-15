export type SpriteKey =
  | 'unit_blade'
  | 'unit_spear'
  | 'unit_lancer'
  | 'unit_archer'
  | 'unit_mortar'
  | 'soul_zhaoyun'
  | 'crest_zhaoyun'
  | 'weap_zhaoyun'
  | 'hero_zhaoyun'
  | 'soul_guanyu'
  | 'crest_guanyu'
  | 'weap_guanyu'
  | 'hero_guanyu'
  | 'soul_zhangfei'
  | 'crest_zhangfei'
  | 'weap_zhangfei'
  | 'hero_zhangfei'
  | 'soul_zhuge'
  | 'crest_zhuge'
  | 'weap_zhuge'
  | 'hero_zhuge'
  | 'soul_zhenji'
  | 'crest_zhenji'
  | 'weap_zhenji'
  | 'hero_zhenji'
  | 'soul_shangxiang'
  | 'crest_shangxiang'
  | 'weap_shangxiang'
  | 'hero_shangxiang'
  | 'vip_lord'
  | 'icon_rice'
  | 'icon_tent'
  | 'icon_shovel'
  | 'icon_chest'
  | 'enemy_grunt'
  | 'enemy_wolf'
  | 'enemy_shield'
  | 'enemy_zhangjiao'
  | 'enemy_lubu';

const SPRITE_PATHS: Record<SpriteKey, string> = {
  unit_blade: './assets/unit_blade.png',
  unit_spear: './assets/unit_spear.png',
  unit_lancer: './assets/unit_lancer.png',
  unit_archer: './assets/unit_archer.png',
  unit_mortar: './assets/unit_mortar.png',

  soul_zhaoyun: './assets/soul_zhaoyun.png',
  crest_zhaoyun: './assets/crest_zhaoyun.png',
  weap_zhaoyun: './assets/weap_zhaoyun.png',
  hero_zhaoyun: './assets/hero_zhaoyun.png',

  soul_guanyu: './assets/soul_guanyu.png',
  crest_guanyu: './assets/crest_guanyu.png',
  weap_guanyu: './assets/weap_guanyu.png',
  hero_guanyu: './assets/hero_guanyu.png',

  soul_zhangfei: './assets/soul_zhangfei.png',
  crest_zhangfei: './assets/crest_zhangfei.png',
  weap_zhangfei: './assets/weap_zhangfei.png',
  hero_zhangfei: './assets/hero_zhangfei.png',

  soul_zhuge: './assets/soul_zhuge.png',
  crest_zhuge: './assets/crest_zhuge.png',
  weap_zhuge: './assets/weap_zhuge.png',
  hero_zhuge: './assets/hero_zhuge.png',

  soul_zhenji: './assets/soul_zhenji.png',
  crest_zhenji: './assets/crest_zhenji.png',
  weap_zhenji: './assets/weap_zhenji.png',
  hero_zhenji: './assets/hero_zhenji.png',

  soul_shangxiang: './assets/soul_shangxiang.png',
  crest_shangxiang: './assets/crest_shangxiang.png',
  weap_shangxiang: './assets/weap_shangxiang.png',
  hero_shangxiang: './assets/hero_shangxiang.png',

  vip_lord: './assets/vip_lord.png',
  icon_rice: './assets/icon_rice.png',
  icon_tent: './assets/icon_tent.png',
  icon_shovel: './assets/icon_shovel.png',
  icon_chest: './assets/icon_chest.png',

  enemy_grunt: './assets/enemy_grunt.png',
  enemy_wolf: './assets/enemy_wolf.png',
  enemy_shield: './assets/enemy_shield.png',
  enemy_zhangjiao: './assets/enemy_zhangjiao.png',
  enemy_lubu: './assets/enemy_lubu.png',
};

class AssetRegistry {
  private images = new Map<SpriteKey, HTMLImageElement>();
  private flashes = new Map<SpriteKey, HTMLCanvasElement>();

  public async preloadAll(): Promise<void> {
    const keys = Object.keys(SPRITE_PATHS) as SpriteKey[];
    await Promise.all(
      keys.map(async (key) => {
        const img = await this.loadImg(SPRITE_PATHS[key]);
        if (img) {
          this.images.set(key, img);
          if (key.startsWith('enemy_')) {
            this.flashes.set(key, this.makeSilhouette(img, '#fff7ed'));
          }
        }
      })
    );
  }

  private loadImg(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  private makeSilhouette(src: HTMLImageElement, color: string): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, c.width, c.height);
    return c;
  }

  public get(key: string): HTMLImageElement | undefined {
    return this.images.get(key as SpriteKey);
  }

  public getFlash(key: string): HTMLCanvasElement | undefined {
    return this.flashes.get(key as SpriteKey);
  }
}

export const Assets = new AssetRegistry();
