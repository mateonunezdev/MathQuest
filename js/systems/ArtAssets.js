const ART_ROOT = new URL('../../assets/fair/', import.meta.url);
const LOCAL_IMAGE = /^(?:common|player|level[123]|fx)\/[a-zA-Z0-9/_-]+\.(?:png|webp|svg)$/i;

export const ART_LAYERS = [
    'farBackground', 'background', 'ground', 'architectureBack',
    'gameplayEntities', 'architectureFront', 'foreground', 'lightingOverlay', 'fx'
];

// art-pack.json lists only installed files. An empty pack intentionally uses the V2 fallback.
export class ArtAssets {
    constructor() {
        this.pack = { levels: {}, player: {}, door: {}, portal: {}, encounter: {}, boss: {}, ui: {} };
        this.images = new Map();
        this.ready = false;
    }

    async preload() {
        try {
            const response = await fetch(new URL('../../assets/fair/art-pack.json', import.meta.url));
            if (!response.ok) throw new Error(`art pack: ${response.status}`);
            const pack = await response.json();
            if (pack && typeof pack === 'object') this.pack = pack;
            const descriptors = [];
            const collect = value => {
                if (!value || typeof value !== 'object') return;
                if (typeof value.src === 'string') descriptors.push(value);
                else Object.values(value).forEach(collect);
            };
            collect(this.pack);
            await Promise.all(descriptors.map(asset => this.load(asset.src)));
            await this.cacheLoadedImages();
        } catch (error) {
            console.warn('Professional art unavailable; using development fallback.', error);
        } finally {
            this.ready = true;
        }
    }

    load(src) {
        if (!LOCAL_IMAGE.test(src) || src.includes('..')) return Promise.resolve(null);
        if (this.images.has(src)) return this.images.get(src);
        const promise = new Promise(resolve => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => resolve(null);
            image.src = new URL(src, ART_ROOT).href;
        });
        this.images.set(src, promise);
        return promise;
    }

    image(asset) {
        if (!asset?.src) return null;
        const image = this.loadedImages?.get(asset.src);
        return image?.naturalWidth ? image : null;
    }

    async cacheLoadedImages() {
        this.loadedImages = new Map();
        await Promise.all([...this.images].map(async ([src, promise]) => {
            this.loadedImages.set(src, await promise);
        }));
    }

    get(group, key) {
        return this.pack[group]?.[key] || null;
    }

    hasLevelArt(level) {
        const background = this.pack.levels?.[level.number]?.background;
        return (Array.isArray(background) ? background : [background]).some(item => this.image(item));
    }

    draw(ctx, asset, x, y, time = 0) {
        const image = this.image(asset);
        if (!image) return false;
        const frames = Math.max(1, Math.floor(asset.frames || 1));
        const frameWidth = image.naturalWidth / frames;
        const width = asset.width || frameWidth;
        const height = asset.height || image.naturalHeight;
        const frame = frames > 1 ? Math.floor(time * (asset.fps || 8)) % frames : 0;
        const anchor = asset.anchor || 'center';
        const anchorX = anchor === 'top-left' ? 0 : width / 2;
        const anchorY = anchor === 'bottom-center' ? height : anchor === 'top-left' ? 0 : height / 2;
        const drawX = x - anchorX + (asset.offsetX || 0);
        const drawY = y - anchorY + (asset.offsetY || 0);
        ctx.save();
        if (asset.flipX) {
            ctx.translate(drawX + width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(image, frame * frameWidth, 0, frameWidth, image.naturalHeight,
                0, drawY, width, height);
        } else {
            ctx.drawImage(image, frame * frameWidth, 0, frameWidth, image.naturalHeight,
                drawX, drawY, width, height);
        }
        ctx.restore();
        return true;
    }

    drawLayer(ctx, level, name, camera, time = 0) {
        if (!ART_LAYERS.includes(name) || name === 'gameplayEntities') return;
        const entries = this.pack.levels?.[level.number]?.[name];
        for (const asset of Array.isArray(entries) ? entries : entries ? [entries] : []) {
            const parallax = Math.max(0, Math.min(0.2, asset.parallax || 0));
            this.draw(ctx, asset, (asset.x || 0) + camera.x * parallax,
                (asset.y || 0) + camera.y * parallax, time);
        }
    }
}
