import * as THREE from 'three';

const LABELS = ['A', 'B', 'C'];

function fitFont(context, text, maximumWidth, startingSize, family) {
    let size = startingSize;
    do {
        context.font = `800 ${size}px ${family}`;
        if (context.measureText(text).width <= maximumWidth) return size;
        size -= 4;
    } while (size >= 54);
    return size;
}

export class MathLabelRenderer {
    constructor() {
        this.cache = new Map();
        this.created = 0;
        this.fractionLabels = 0;
        this.minimumGlyphHeight = Infinity;
    }

    texture(value, optionIndex) {
        const normalized = String(value).trim();
        const badge = LABELS[optionIndex] || '';
        const key = `${badge}:${normalized}`;
        if (this.cache.has(key)) return this.cache.get(key);

        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 512;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, 512, 512);

        const background = context.createRadialGradient(256, 228, 40, 256, 256, 232);
        background.addColorStop(0, 'rgba(17,52,61,.98)');
        background.addColorStop(.72, 'rgba(5,24,32,.99)');
        background.addColorStop(1, 'rgba(2,10,16,1)');
        context.fillStyle = background;
        context.beginPath(); context.arc(256, 256, 224, 0, Math.PI * 2); context.fill();
        context.strokeStyle = '#c89b4c'; context.lineWidth = 18;
        context.beginPath(); context.arc(256, 256, 214, 0, Math.PI * 2); context.stroke();
        context.strokeStyle = 'rgba(92,255,239,.88)'; context.lineWidth = 7;
        context.beginPath(); context.arc(256, 256, 191, 0, Math.PI * 2); context.stroke();

        context.shadowColor = 'rgba(72,255,239,.72)';
        context.shadowBlur = 18;
        context.fillStyle = '#fff8dc';
        context.strokeStyle = '#061c25';
        context.lineWidth = 13;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        const fraction = normalized.match(/^(-?\d+)\/(\d+)$/);
        let glyphHeight;
        if (fraction) {
            const fontSize = 170;
            context.font = `800 ${fontSize}px "Trebuchet MS", Arial, sans-serif`;
            context.strokeText(fraction[1], 270, 168); context.fillText(fraction[1], 270, 168);
            context.strokeText(fraction[2], 270, 350); context.fillText(fraction[2], 270, 350);
            context.shadowBlur = 8;
            context.strokeStyle = '#061c25'; context.lineWidth = 18;
            context.beginPath(); context.moveTo(168, 263); context.lineTo(372, 263); context.stroke();
            context.strokeStyle = '#fff8dc'; context.lineWidth = 8;
            context.beginPath(); context.moveTo(174, 263); context.lineTo(366, 263); context.stroke();
            glyphHeight = 370;
            this.fractionLabels++;
        } else {
            const fontSize = fitFont(context, normalized, 350, 330, '"Trebuchet MS", Arial, sans-serif');
            context.strokeText(normalized, 270, 270); context.fillText(normalized, 270, 270);
            glyphHeight = fontSize;
        }

        context.shadowBlur = 10;
        context.fillStyle = '#d4a652';
        context.beginPath(); context.arc(98, 100, 55, 0, Math.PI * 2); context.fill();
        context.strokeStyle = '#fff0bd'; context.lineWidth = 6; context.stroke();
        context.shadowBlur = 0;
        context.fillStyle = '#071a24';
        context.font = '900 68px "Trebuchet MS", Arial, sans-serif';
        context.fillText(badge, 98, 104);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.userData.mathLabel = { value: normalized, badge, fraction: Boolean(fraction), glyphHeight, resolution: 512 };
        this.cache.set(key, texture);
        this.created++;
        this.minimumGlyphHeight = Math.min(this.minimumGlyphHeight, glyphHeight);
        return texture;
    }

    snapshot() {
        return {
            renderer: 'math-medallion-v1',
            resolution: 512,
            cachedTextures: this.cache.size,
            createdTextures: this.created,
            fractionLabels: this.fractionLabels,
            minimumGlyphHeight: Number.isFinite(this.minimumGlyphHeight) ? this.minimumGlyphHeight : 0,
            optionBadges: [...LABELS]
        };
    }

    dispose() {
        this.cache.forEach(texture => texture.dispose());
        this.cache.clear();
    }
}
