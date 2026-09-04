export class Renderer {
    constructor(ctx, camera) {
        this.ctx = ctx;
        this.camera = camera;
        this.tileSize = 60;
        this.time = 0;

        this.gradients = this.createGradients();
        this.patterns = this.createPatterns();
    }

    createGradients() {
        const ctx = this.ctx;
        return {
            floorLight: '#0d1f30',
            floorDark: '#0c1d2e',
            wallTop: '#0d1f30',
            wallSide: '#102a3d',
            energy: ctx.createRadialGradient(0, 0, 0, 0, 0, 30),
            glow: ctx.createRadialGradient(0, 0, 0, 0, 0, 40)
        };
    }

    createPatterns() {
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 60;
        patternCanvas.height = 60;
        const pctx = patternCanvas.getContext('2d');

        pctx.fillStyle = '#0d1f33';
        pctx.fillRect(0, 0, 60, 60);
        pctx.strokeStyle = 'rgba(55, 196, 255, 0.03)';
        for (let i = 0; i < 60; i += 10) {
            pctx.beginPath();
            pctx.moveTo(i, 0); pctx.lineTo(i, 60);
            pctx.moveTo(0, i); pctx.lineTo(60, i);
            pctx.stroke();
        }
        const gridPattern = this.ctx.createPattern(patternCanvas, 'repeat');

        const circuitCanvas = document.createElement('canvas');
        circuitCanvas.width = 120;
        circuitCanvas.height = 120;
        const cctx = circuitCanvas.getContext('2d');
        cctx.strokeStyle = 'rgba(55, 196, 255, 0.05)';
        cctx.lineWidth = 1;
        for (let i = 0; i < 120; i += 30) {
            cctx.beginPath();
            cctx.moveTo(i, 0); cctx.lineTo(i, 120);
            cctx.moveTo(0, i); cctx.lineTo(120, i);
            cctx.stroke();
        }
        cctx.strokeStyle = 'rgba(55, 196, 255, 0.08)';
        cctx.beginPath();
        cctx.moveTo(60, 0); cctx.lineTo(60, 120);
        cctx.moveTo(0, 60); cctx.lineTo(120, 60);
        cctx.stroke();
        const circuitPattern = this.ctx.createPattern(circuitCanvas, 'repeat');

        return { grid: gridPattern, circuit: circuitPattern };
    }

    updateGradients() {
        const g = this.gradients;
        g.energy.addColorStop(0, 'rgba(55, 196, 255, 0.9)');
        g.energy.addColorStop(0.5, 'rgba(55, 196, 255, 0.3)');
        g.energy.addColorStop(1, 'rgba(55, 196, 255, 0)');

        g.glow.addColorStop(0, 'rgba(55, 196, 255, 0.4)');
        g.glow.addColorStop(1, 'rgba(55, 196, 255, 0)');
    }

    renderBackground(level) {
        this.time += 0.016;
        this.updateGradients();

        const ctx = this.ctx;
        const width = level.width * this.tileSize;
        const height = level.height * this.tileSize;

        ctx.fillStyle = '#07121c';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = this.patterns.circuit;
        ctx.fillRect(0, 0, width, height);

        const gradient = ctx.createRadialGradient(
            width * 0.3, height * 0.2, 0,
            width * 0.3, height * 0.2, Math.max(width, height) * 0.7
        );
        gradient.addColorStop(0, 'rgba(15, 40, 65, 0.4)');
        gradient.addColorStop(1, 'rgba(7, 18, 28, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        const gradient2 = ctx.createRadialGradient(
            width * 0.7, height * 0.8, 0,
            width * 0.7, height * 0.8, Math.max(width, height) * 0.6
        );
        gradient2.addColorStop(0, 'rgba(55, 196, 255, 0.03)');
        gradient2.addColorStop(1, 'rgba(55, 196, 255, 0)');
        ctx.fillStyle = gradient2;
        ctx.fillRect(0, 0, width, height);

        this.renderAmbientLines(width, height);
        this.renderMathSymbols(width, height);
    }

    renderAmbientLines(width, height) {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(55, 196, 255, 0.02)';
        ctx.lineWidth = 1;

        const offset = (this.time * 20) % 60;
        for (let x = -offset; x < width + 60; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = -offset; y < height + 60; y += 60) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }

    renderMathSymbols(width, height) {
        const ctx = this.ctx;
        const symbols = ['∑', '∫', '∂', '∞', 'π', 'φ', 'λ', 'Δ', '∇', '⊕'];
        ctx.font = '24px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(55, 196, 255, 0.02)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let i = 0; i < 15; i++) {
            const x = (i * 73 + this.time * 10) % (width + 100) - 50;
            const y = (i * 47 + 30) % (height + 100) - 50;
            const symbol = symbols[i % symbols.length];
            ctx.fillText(symbol, x, y);
        }
    }

    renderDecorations(decorations) {
        decorations.forEach(d => d.render(this.ctx, this.time));
    }

    renderTilemap(level) {
        const ctx = this.ctx;
        const ts = this.tileSize;

        for (let y = 0; y < level.height; y++) {
            for (let x = 0; x < level.width; x++) {
                const tile = level.tilemap[y][x];
                const px = x * ts;
                const py = y * ts;

                if (tile === 1) this.renderWall(px, py, x, y, level);
                else this.renderFloor(px, py, x, y);
            }
        }
    }

    renderFloor(px, py, x, y) {
        const ctx = this.ctx;
        const ts = this.tileSize;

        const isLight = (x + y) % 2 === 0;
        ctx.fillStyle = isLight ? this.gradients.floorLight : this.gradients.floorDark;
        ctx.fillRect(px, py, ts, ts);

        ctx.strokeStyle = 'rgba(55, 196, 255, 0.015)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);

        if ((x + y * 17) % 37 === 0) {
            ctx.fillStyle = 'rgba(55, 196, 255, 0.03)';
            ctx.beginPath();
            ctx.arc(px + ts/2, py + ts/2, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderWall(px, py, x, y, level) {
        const ctx = this.ctx;
        const ts = this.tileSize;

        const neighbors = {
            up: y > 0 && level.tilemap[y-1][x] === 1,
            down: y < level.height-1 && level.tilemap[y+1][x] === 1,
            left: x > 0 && level.tilemap[y][x-1] === 1,
            right: x < level.width-1 && level.tilemap[y][x+1] === 1
        };

        ctx.fillStyle = this.gradients.wallTop;
        ctx.fillRect(px, py, ts, ts);

        if (!neighbors.up) {
            ctx.fillStyle = this.gradients.wallSide;
            ctx.fillRect(px, py, ts, 12);
            this.renderWallDetail(px, py, 'top');
        }
        if (!neighbors.down) {
            ctx.fillStyle = '#0a1520';
            ctx.fillRect(px, py + ts - 4, ts, 4);
        }
        if (!neighbors.left) {
            ctx.fillStyle = this.gradients.wallSide;
            ctx.fillRect(px, py, 8, ts);
        }
        if (!neighbors.right) {
            ctx.fillStyle = '#0a1520';
            ctx.fillRect(px + ts - 8, py, 8, ts);
        }

        this.renderWallLights(px, py, x, y, neighbors);
    }

    renderWallDetail(px, py, side) {
        const ctx = this.ctx;
        const ts = this.tileSize;
        ctx.strokeStyle = 'rgba(55, 196, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 10, py + 8);
        ctx.lineTo(px + ts - 10, py + 8);
        ctx.stroke();
    }

    renderWallLights(px, py, x, y, neighbors) {
        const ctx = this.ctx;
        const ts = this.tileSize;
        const seed = (x * 1234 + y * 5678) % 100;

        if (seed < 3 && !neighbors.up) {
            const pulse = Math.sin(this.time * 3 + seed) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(55, 196, 255, ${0.3 + pulse * 0.4})`;
            ctx.beginPath();
            ctx.arc(px + ts/2, py + 6, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderEntity(entity) {
        if (entity.render) entity.render(this);
    }
}