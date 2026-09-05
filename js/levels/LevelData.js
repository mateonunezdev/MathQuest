export class LevelData {
    static getLevel(levelNum) {
        if (levelNum === 1) return this.level1();
        return this.level1();
    }

    static level1() {
        const width = 16;
        const height = 9;
        const tileSize = 60;

        // Layout: ZONA IZQUIERDA → corredor → [PUERTA ÚNICA] → corredor → ZONA DERECHA → GOAL
        // Mientras puerta CERRADA: start → goal = IMPOSIBLE
        // Mientras puerta ABIERTA: start → goal = POSIBLE
        //
        // Leyenda: 1 = muro, 0 = suelo
        
        const tilemap = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,0,0,0,0,1,1,1,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];

        return {
            width,
            height,
            tileSize,
            tilemap,
            playerStart: { x: 1 * tileSize + 12, y: 1 * tileSize + 8 },
            door: { x: 11, y: 4, challengeId: 'door1' },
            goal: { x: 14, y: 7 },
            decorations: this.generateDecorations({ width, height, tilemap })
        };
    }

    static generateDecorations(level) {
        const decorations = [];
        const ts = level.tileSize;

        for (let y = 0; y < level.height; y++) {
            for (let x = 0; x < level.width; x++) {
                if (level.tilemap[y][x] === 0) {
                    const seed = (x * 1234 + y * 5678) % 100;

                    if (seed < 8) {
                        decorations.push(new FloorDecoration(x * ts, y * ts, ts, seed));
                    } else if (seed < 12) {
                        decorations.push(new CircuitDecoration(x * ts, y * ts, ts, seed));
                    } else if (seed < 14) {
                        decorations.push(new MathSymbolDecoration(x * ts, y * ts, ts, seed));
                    }
                } else if (level.tilemap[y][x] === 1) {
                    const seed = (x * 1234 + y * 5678) % 100;
                    if (seed < 5) {
                        decorations.push(new WallDecoration(x * ts, y * ts, ts, seed));
                    }
                }
            }
        }

        return decorations;
    }
}

export class FloorDecoration {
    constructor(x, y, tileSize, seed) {
        this.x = x;
        this.y = y;
        this.tileSize = tileSize;
        this.seed = seed;
        this.type = seed % 4;
        this.offsetX = (seed * 7) % 10 - 5;
        this.offsetY = (seed * 11) % 10 - 5;
        this.rotation = (seed * 13) % 4 * Math.PI / 2;
        this.alpha = 0.05 + (seed % 5) * 0.02;
        this.pulseSpeed = 0.5 + (seed % 3) * 0.3;
        this.pulsePhase = seed * 0.5;
    }

    render(ctx, time) {
        ctx.save();
        ctx.translate(this.x + this.tileSize/2 + this.offsetX, this.y + this.tileSize/2 + this.offsetY);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha + Math.sin(time * this.pulseSpeed + this.pulsePhase) * 0.02;

        ctx.fillStyle = '#37c4ff';
        ctx.strokeStyle = '#37c4ff';
        ctx.lineWidth = 1;

        switch (this.type) {
            case 0:
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = i * Math.PI / 3;
                    ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
                }
                ctx.closePath();
                ctx.stroke();
                break;
            case 1:
                ctx.beginPath();
                ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
                ctx.moveTo(0, -6); ctx.lineTo(0, 6);
                ctx.stroke();
                break;
            case 2:
                ctx.beginPath();
                ctx.arc(0, 0, 5, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 3:
                ctx.fillRect(-4, -4, 8, 8);
                break;
        }
        ctx.restore();
    }
}

export class CircuitDecoration {
    constructor(x, y, tileSize, seed) {
        this.x = x;
        this.y = y;
        this.tileSize = tileSize;
        this.seed = seed;
        this.path = this.generatePath(seed);
        this.flowPhase = 0;
    }

    generatePath(seed) {
        const path = [];
        const cx = this.tileSize / 2;
        const cy = this.tileSize / 2;
        let x = cx + (seed % 3 - 1) * 15;
        let y = cy + (Math.floor(seed / 3) % 3 - 1) * 15;

        path.push({ x, y });
        const steps = 3 + seed % 3;
        for (let i = 0; i < steps; i++) {
            const dir = seed % 4;
            if (dir === 0) x += 15;
            else if (dir === 1) x -= 15;
            else if (dir === 2) y += 15;
            else y -= 15;
            x = Math.max(10, Math.min(this.tileSize - 10, x));
            y = Math.max(10, Math.min(this.tileSize - 10, y));
            path.push({ x, y });
            seed = (seed * 7 + 13) % 100;
        }
        return path;
    }

    render(ctx, time) {
        this.flowPhase = (this.flowPhase + time * 0.5) % 1;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = 0.15;

        ctx.strokeStyle = '#37c4ff';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(this.path[0].x, this.path[0].y);
        for (let i = 1; i < this.path.length; i++) {
            ctx.lineTo(this.path[i].x, this.path[i].y);
        }
        ctx.stroke();

        const totalLen = this.getPathLength();
        const flowPos = (this.flowPhase * totalLen) % totalLen;
        this.renderFlow(ctx, flowPos, totalLen);

        ctx.restore();
    }

    getPathLength() {
        let len = 0;
        for (let i = 1; i < this.path.length; i++) {
            len += Math.hypot(this.path[i].x - this.path[i-1].x, this.path[i].y - this.path[i-1].y);
        }
        return len;
    }

    renderFlow(ctx, pos, totalLen) {
        let accumulated = 0;
        for (let i = 1; i < this.path.length; i++) {
            const segLen = Math.hypot(this.path[i].x - this.path[i-1].x, this.path[i].y - this.path[i-1].y);
            if (accumulated + segLen >= pos) {
                const t = (pos - accumulated) / segLen;
                const x = this.path[i-1].x + (this.path[i].x - this.path[i-1].x) * t;
                const y = this.path[i-1].y + (this.path[i].y - this.path[i-1].y) * t;
                ctx.fillStyle = '#37c4ff';
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            accumulated += segLen;
        }
    }
}

export class MathSymbolDecoration {
    constructor(x, y, tileSize, seed) {
        this.x = x;
        this.y = y;
        this.tileSize = tileSize;
        this.seed = seed;
        this.symbols = ['∑', '∫', '∂', '∞', 'π', 'φ', 'λ', 'Δ', '∇', '⊕', '√', '≈', '≠', '≤', '≥'];
        this.symbol = this.symbols[seed % this.symbols.length];
        this.offsetX = (seed * 17) % 20 - 10;
        this.offsetY = (seed * 19) % 20 - 10;
        this.alpha = 0.03 + (seed % 4) * 0.01;
        this.scale = 0.8 + (seed % 3) * 0.1;
        this.driftPhase = seed * 0.7;
    }

    render(ctx, time) {
        ctx.save();
        ctx.translate(this.x + this.tileSize/2 + this.offsetX + Math.sin(time + this.driftPhase) * 2,
                      this.y + this.tileSize/2 + this.offsetY + Math.cos(time * 0.7 + this.driftPhase) * 2);
        ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = '#37c4ff';
        ctx.font = '20px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, 0, 0);
        ctx.restore();
    }
}

export class WallDecoration {
    constructor(x, y, tileSize, seed) {
        this.x = x;
        this.y = y;
        this.tileSize = tileSize;
        this.seed = seed;
        this.type = seed % 3;
        this.glowPhase = seed * 0.3;
    }

    render(ctx, time) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const pulse = Math.sin(time * 2 + this.glowPhase) * 0.5 + 0.5;

        switch (this.type) {
            case 0:
                ctx.fillStyle = `rgba(55, 196, 255, ${0.1 + pulse * 0.15})`;
                ctx.beginPath();
                ctx.arc(this.tileSize/2, 6, 4, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 1:
                ctx.strokeStyle = `rgba(55, 196, 255, ${0.1 + pulse * 0.2})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(10, 10); ctx.lineTo(this.tileSize - 10, 10);
                ctx.stroke();
                break;
            case 2:
                ctx.fillStyle = `rgba(55, 196, 255, ${0.05 + pulse * 0.1})`;
                ctx.font = '14px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('◇', this.tileSize/2, 18);
                break;
        }
        ctx.restore();
    }
}
