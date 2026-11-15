export type SpriteKey =
  | 'unit_blade'
  | 'unit_archer'
  | 'unit_lancer'
  | 'unit_mortar'
  | 'unit_frostbow'
  | 'hero_zhaoyun'
  | 'hero_guanyu'
  | 'hero_zhangfei'
  | 'hero_zhenji'
  | 'hero_zhuge'
  | 'hero_shangxiang'
  | 'vip_lord'
  | 'icon_rice'
  | 'icon_tent'
  | 'icon_shovel'
  | 'icon_farm'
  | 'icon_decree'
  | 'icon_fortify'
  | 'icon_ult'
  | 'enemy_grunt'
  | 'enemy_wolf'
  | 'enemy_shield'
  | 'enemy_shaman'
  | 'enemy_ram'
  | 'enemy_lubu';

const SPRITE_PATHS: Record<SpriteKey, string> = {
  unit_blade: './assets/unit_blade.svg',
  unit_archer: './assets/unit_archer.svg',
  unit_lancer: './assets/unit_lancer.svg',
  unit_mortar: './assets/unit_mortar.svg',
  unit_frostbow: './assets/unit_frostbow.svg',
  hero_zhaoyun: './assets/hero_zhaoyun.svg',
  hero_guanyu: './assets/hero_guanyu.svg',
  hero_zhangfei: './assets/hero_zhangfei.svg',
  hero_zhenji: './assets/hero_zhenji.svg',
  hero_zhuge: './assets/hero_zhuge.svg',
  hero_shangxiang: './assets/hero_shangxiang.svg',
  vip_lord: './assets/vip_lord.svg',
  icon_rice: './assets/icon_rice.svg',
  icon_tent: './assets/icon_tent.svg',
  icon_shovel: './assets/icon_shovel.svg',
  icon_farm: './assets/icon_farm.svg',
  icon_decree: './assets/icon_decree.svg',
  icon_fortify: './assets/icon_fortify.svg',
  icon_ult: './assets/icon_ult.svg',
  enemy_grunt: './assets/enemy_grunt.svg',
  enemy_wolf: './assets/enemy_wolf.svg',
  enemy_shield: './assets/enemy_shield.svg',
  enemy_shaman: './assets/enemy_shaman.svg',
  enemy_ram: './assets/enemy_ram.svg',
  enemy_lubu: './assets/enemy_lubu.svg',
};

const RASTER_SIZE = 192;

class AssetRegistry {
  private bitmaps = new Map<SpriteKey, HTMLCanvasElement>();
  private flashes = new Map<SpriteKey, HTMLCanvasElement>();

  public async preloadAll(): Promise<void> {
    const keys = Object.keys(SPRITE_PATHS) as SpriteKey[];
    await Promise.all(
      keys.map(async (key) => {
        const img = await this.loadImg(SPRITE_PATHS[key]);
        if (img) {
          const raster = this.rasterize(img, RASTER_SIZE);
          this.bitmaps.set(key, raster);
          if (key.startsWith('enemy_')) {
            this.flashes.set(key, this.makeSilhouette(raster, '#ffffff'));
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

  private rasterize(img: HTMLImageElement, size: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0, size, size);
    return c;
  }

  private makeSilhouette(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
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

  public get(key: string): HTMLCanvasElement | undefined {
    return this.bitmaps.get(key as SpriteKey);
  }

  public getFlash(key: string): HTMLCanvasElement | undefined {
    return this.flashes.get(key as SpriteKey);
  }
}

export const Assets = new AssetRegistry();
