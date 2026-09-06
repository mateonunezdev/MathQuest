export class Renderer {
    constructor(ctx, camera) {
        this.ctx = ctx;
        this.camera = camera;
        this.tileSize = 60;
        this.time = 0;

        this.gradients = this.createGradients();
        this.patterns = this.createPatterns();
        this.initGradients();
    }

    createGradients() {
        const ctx = this.ctx;
        return {
            floorLight: '#0d1f30',
            floorDark: '#0c1d2e',
            wallTop: '#0d1f30',
            wallSide: '#102a3d',
            energy: ctx.createRadialGradient(0, 0, 0, 0, 0, 30),
            glow: ctx.createRadialGradient(0, 0, 0, 0, 0, 40),
            wallHighlight: ctx.createLinearGradient(0, 0, 0, 60),
            wallShadow: ctx.createLinearGradient(0, 0, 0, 60),
            floorGlow: ctx.createRadialGradient(0, 0, 0, 0, 0, 30)
        };
    }

    createPatterns() {
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 60;
        patternCanvas.height = 60;
        const pctx = patternCanvas.getContext('2d');

        // Base floor pattern with subtle texture
        const floorGradient = pctx.createLinearGradient(0, 0, 60, 60);
        floorGradient.addColorStop(0, '#0e2235');
        floorGradient.addColorStop(1, '#0c1d2e');
        pctx.fillStyle = floorGradient;
        pctx.fillRect(0, 0, 60, 60);
        
        // Subtle grid lines
        pctx.strokeStyle = 'rgba(55, 196, 255, 0.025)';
        pctx.lineWidth = 0.5;
        for (let i = 0; i < 60; i += 15) {
            pctx.beginPath();
            pctx.moveTo(i, 0); pctx.lineTo(i, 60);
            pctx.moveTo(0, i); pctx.lineTo(60, i);
            pctx.stroke();
        }
        
        // Subtle noise texture
        pctx.fillStyle = 'rgba(255, 255, 255, 0.005)';
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * 60;
            const y = Math.random() * 60;
            pctx.fillRect(x, y, 1, 1);
        }
        
        const floorPattern = this.ctx.createPattern(patternCanvas, 'repeat');

        // Wall pattern with panel lines
        const wallCanvas = document.createElement('canvas');
        wallCanvas.width = 60;
        wallCanvas.height = 60;
        const wctx = wallCanvas.getContext('2d');
        
        const wallGradient = wctx.createLinearGradient(0, 0, 0, 60);
        wallGradient.addColorStop(0, '#153550');
        wallGradient.addColorStop(0.5, '#102a3d');
        wallGradient.addColorStop(1, '#0a1a2a');
        wctx.fillStyle = wallGradient;
        wctx.fillRect(0, 0, 60, 60);
        
        // Panel lines on walls
        wctx.strokeStyle = 'rgba(55, 196, 255, 0.06)';
        wctx.lineWidth = 1;
        for (let i = 0; i < 60; i += 15) {
            wctx.beginPath();
            wctx.moveTo(i, 0); wctx.lineTo(i, 60);
            wctx.moveTo(0, i); wctx.lineTo(60, i);
            wctx.stroke();
        }
        
        // Rivets/bolts on wall intersections
        wctx.fillStyle = 'rgba(55, 196, 255, 0.15)';
        for (let x = 7.5; x < 60; x += 15) {
            for (let y = 7.5; y < 60; y += 15) {
                wctx.beginPath();
                wctx.arc(x, y, 1.5, 0, Math.PI * 2);
                wctx.fill();
            }
        }
        
        const wallPattern = this.ctx.createPattern(wallCanvas, 'repeat');

        // Circuit pattern for background
        const circuitCanvas = document.createElement('canvas');
        circuitCanvas.width = 120;
        circuitCanvas.height = 120;
        const cctx = circuitCanvas.getContext('2d');
        cctx.strokeStyle = 'rgba(55, 196, 255, 0.04)';
        cctx.lineWidth = 1;
        for (let i = 0; i < 120; i += 30) {
            cctx.beginPath();
            cctx.moveTo(i, 0); cctx.lineTo(i, 120);
            cctx.moveTo(0, i); cctx.lineTo(120, i);
            cctx.stroke();
        }
        cctx.strokeStyle = 'rgba(55, 196, 255, 0.06)';
        cctx.beginPath();
        cctx.moveTo(60, 0); cctx.lineTo(60, 120);
        cctx.moveTo(0, 60); cctx.lineTo(120, 60);
        cctx.stroke();
        const circuitPattern = this.ctx.createPattern(circuitCanvas, 'repeat');

        return { floor: floorPattern, wall: wallPattern, circuit: circuitPattern };
    }

    initGradients() {
        const g = this.gradients;
        // Energy gradient for entities
        g.energy.addColorStop(0, 'rgba(55, 196, 255, 0.9)');
        g.energy.addColorStop(0.5, 'rgba(55, 196, 255, 0.3)');
        g.energy.addColorStop(1, 'rgba(55, 196, 255, 0)');

        g.glow.addColorStop(0, 'rgba(55, 196, 255, 0.4)');
        g.glow.addColorStop(1, 'rgba(55, 196, 255, 0)');

        // Wall highlight gradient (top edge)
        g.wallHighlight.addColorStop(0, 'rgba(55, 196, 255, 0.25)');
        g.wallHighlight.addColorStop(0.3, 'rgba(55, 196, 255, 0.1)');
        g.wallHighlight.addColorStop(1, 'rgba(55, 196, 255, 0)');

        // Wall shadow gradient (bottom edge)
        g.wallShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
        g.wallShadow.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
        g.wallShadow.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

        // Floor glow for interactive elements
        g.floorGlow.addColorStop(0, 'rgba(55, 196, 255, 0.2)');
        g.floorGlow.addColorStop(1, 'rgba(55, 196, 255, 0)');
    }

    renderBackground(level) {
        this.time += 0.016;

        const ctx = this.ctx;
        const width = level.width * this.tileSize;
        const height = level.height * this.tileSize;

        // Deep space base
        ctx.fillStyle = '#050e17';
        ctx.fillRect(0, 0, width, height);

        // Circuit pattern base
        ctx.fillStyle = this.patterns.circuit;
        ctx.fillRect(0, 0, width, height);

        // Atmospheric glows - multiple layers for depth
        const glow1 = ctx.createRadialGradient(
            width * 0.2, height * 0.15, 0,
            width * 0.2, height * 0.15, Math.max(width, height) * 0.8
        );
        glow1.addColorStop(0, 'rgba(10, 35, 60, 0.35)');
        glow1.addColorStop(0.5, 'rgba(8, 25, 45, 0.15)');
        glow1.addColorStop(1, 'rgba(5, 15, 30, 0)');
        ctx.fillStyle = glow1;
        ctx.fillRect(0, 0, width, height);

        const glow2 = ctx.createRadialGradient(
            width * 0.8, height * 0.85, 0,
            width * 0.8, height * 0.85, Math.max(width, height) * 0.7
        );
        glow2.addColorStop(0, 'rgba(55, 196, 255, 0.05)');
        glow2.addColorStop(0.5, 'rgba(55, 196, 255, 0.015)');
        glow2.addColorStop(1, 'rgba(55, 196, 255, 0)');
        ctx.fillStyle = glow2;
        ctx.fillRect(0, 0, width, height);

        // Subtle vignette
        const vignette = ctx.createRadialGradient(
            width * 0.5, height * 0.5, 0,
            width * 0.5, height * 0.5, Math.max(width, height) * 0.75
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.1)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);

        this.renderAmbientLines(width, height);
        this.renderMathSymbols(width, height);
        
        // Parallax background elements - floating geometric shapes
        this.renderParallaxElements(width, height);
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

    renderParallaxElements(width, height) {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = 0.15;
        
        // Floating geometric shapes in background
        const shapes = [
            { x: width * 0.15, y: height * 0.2, size: 80, type: 'hexagon', speed: 0.02 },
            { x: width * 0.85, y: height * 0.3, size: 60, type: 'triangle', speed: 0.03 },
            { x: width * 0.5, y: height * 0.8, size: 100, type: 'circle', speed: 0.015 },
            { x: width * 0.25, y: height * 0.7, size: 50, type: 'square', speed: 0.025 },
        ];
        
        shapes.forEach(shape => {
            const offsetX = Math.sin(this.time * shape.speed) * 20;
            const offsetY = Math.cos(this.time * shape.speed * 1.3) * 15;
            const rotation = this.time * shape.speed * 0.5;
            
            ctx.save();
            ctx.translate(shape.x + offsetX, shape.y + offsetY);
            ctx.rotate(rotation);
            
            ctx.strokeStyle = 'rgba(55, 196, 255, 0.08)';
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            switch (shape.type) {
                case 'hexagon':
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const angle = (i / 6) * Math.PI * 2;
                        const x = Math.cos(angle) * shape.size;
                        const y = Math.sin(angle) * shape.size;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.stroke();
                    break;
                case 'triangle':
                    ctx.beginPath();
                    for (let i = 0; i < 3; i++) {
                        const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
                        const x = Math.cos(angle) * shape.size;
                        const y = Math.sin(angle) * shape.size;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.stroke();
                    break;
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(0, 0, shape.size, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                case 'square':
                    ctx.beginPath();
                    ctx.rect(-shape.size, -shape.size, shape.size * 2, shape.size * 2);
                    ctx.stroke();
                    break;
            }
            ctx.restore();
        });
        
        ctx.restore();
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

        // Large floor tiles instead of fine grid - break the 60px grid repetition
        const large = 3;
        const lx = Math.floor(x / large);
        const ly = Math.floor(y / large);
        const seed = (lx * 131 + ly * 997) % 100;

        // Base floor pattern
        ctx.fillStyle = this.patterns.floor;
        ctx.fillRect(px, py, ts, ts);

        // Very subtle large-format tile variation (not per-cell grid)
        const tone = 0.006 + (seed % 5) * 0.003;
        ctx.fillStyle = `rgba(55, 196, 255, ${tone})`;
        ctx.fillRect(px, py, ts, ts);

        // Sub-panel seam only at large-tile boundaries - hides the 60px grid
        const isTileEdgeX = x % large === 0;
        const isTileEdgeY = y % large === 0;
        if (isTileEdgeX || isTileEdgeY) {
            ctx.strokeStyle = 'rgba(55, 196, 255, 0.02)';
            ctx.lineWidth = 0.5;
            if (isTileEdgeY) {
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px + ts, py);
                ctx.stroke();
            }
            if (isTileEdgeX) {
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px, py + ts);
                ctx.stroke();
            }
        }

        // Occasional floor conduit detail (runs horizontally on some tiles)
        if ((lx * 13 + ly * 7) % 5 === 0) {
            ctx.strokeStyle = 'rgba(55, 196, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px + 10, py + 20 + (ly % 3) * 10);
            ctx.lineTo(px + ts - 10, py + 20 + (ly % 3) * 10);
            ctx.stroke();
        }

        // Occasional inset floor panel (large, not per-tile spam)
        if ((lx * 17 + ly * 29) % 11 === 0) {
            ctx.strokeStyle = 'rgba(55, 196, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(px + 14, py + 14, ts - 28, ts - 28, 4);
            ctx.stroke();
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

        // Base wall with pattern
        ctx.fillStyle = this.patterns.wall;
        ctx.fillRect(px, py, ts, ts);

        // WALL TOP (2.5D visible top face) - lighter stone surface when wall
        // has floor/void above it. This is the key depth cue.
        if (!neighbors.up) {
            const topH = 10;
            const topGrad = ctx.createLinearGradient(px, py, px, py + topH);
            topGrad.addColorStop(0, '#3a5a78');
            topGrad.addColorStop(1, '#1a3a55');
            ctx.fillStyle = topGrad;
            ctx.fillRect(px, py, ts, topH);

            // Top highlight edge line
            ctx.fillStyle = 'rgba(200, 230, 255, 0.18)';
            ctx.fillRect(px, py, ts, 1.5);

            // Wall top engraving line
            ctx.strokeStyle = 'rgba(55, 196, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px + 6, py + topH * 0.5);
            ctx.lineTo(px + ts - 6, py + topH * 0.5);
            ctx.stroke();

            this.renderWallDetail(px, py, 'top');
        }

        // WALL FACE vertical gradient (shadowing toward base for height feel)
        const faceGrad = ctx.createLinearGradient(px, py, px, py + ts);
        faceGrad.addColorStop(0, 'rgba(255,255,255,0.04)');
        faceGrad.addColorStop(0.3, 'rgba(255,255,255,0)');
        faceGrad.addColorStop(1, 'rgba(0,0,0,0.12)');
        ctx.fillStyle = faceGrad;
        ctx.fillRect(px, py, ts, ts);

        // Bottom contact shadow (where wall meets floor) - stronger for grounded feel
        if (!neighbors.down) {
            const shadow = ctx.createLinearGradient(px, py + ts - 12, px, py + ts);
            shadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
            shadow.addColorStop(0.5, 'rgba(0, 0, 0, 0.35)');
            shadow.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
            ctx.fillStyle = shadow;
            ctx.fillRect(px, py + ts - 12, ts, 12);
        }

        // Side faces (left/right edges exposed to floor) - column shading
        if (!neighbors.left) {
            const sideGrad = ctx.createLinearGradient(px, py, px + 10, py);
            sideGrad.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
            sideGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = sideGrad;
            ctx.fillRect(px, py, 10, ts);
        }
        if (!neighbors.right) {
            const sideGrad = ctx.createLinearGradient(px + ts - 10, py, px + ts, py);
            sideGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            sideGrad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
            ctx.fillStyle = sideGrad;
            ctx.fillRect(px + ts - 10, py, 10, ts);
        }

        // Wall corner highlights for depth
        if (!neighbors.up && !neighbors.left) {
            ctx.fillStyle = 'rgba(55, 196, 255, 0.28)';
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + 12, py);
            ctx.lineTo(px, py + 12);
            ctx.fill();
        }
        if (!neighbors.up && !neighbors.right) {
            ctx.fillStyle = 'rgba(55, 196, 255, 0.28)';
            ctx.beginPath();
            ctx.moveTo(px + ts, py);
            ctx.lineTo(px + ts - 12, py);
            ctx.lineTo(px + ts, py + 12);
            ctx.fill();
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