export class Renderer {
    constructor(ctx, camera) {
        this.ctx = ctx;
        this.camera = camera;
        this.tileSize = 60;
        this.time = 0;
        this.templeSurface = null;

        this.gradients = this.createGradients();
        this.patterns = this.createPatterns();
        this.initGradients();
    }

    createGradients() {
        const ctx = this.ctx;
        return {
            // Temple base: navy profundo / charcoal
            floorLight: '#0a1a28',
            floorDark: '#080c14',
            wallTop: '#0f1a27',
            wallSide: '#121820',
            // Tech accent: cian controlado (sparingly)
            energy: ctx.createRadialGradient(0, 0, 0, 0, 0, 30),
            glow: ctx.createRadialGradient(0, 0, 0, 0, 0, 40),
            // Reward: dorado / alerta: ámbar
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
        // Energy gradient for entities - tech cian accent
        g.energy.addColorStop(0, 'rgba(55, 196, 255, 0.9)');
        g.energy.addColorStop(0.5, 'rgba(55, 196, 255, 0.3)');
        g.energy.addColorStop(1, 'rgba(55, 196, 255, 0)');

        g.glow.addColorStop(0, 'rgba(55, 196, 255, 0.4)');
        g.glow.addColorStop(1, 'rgba(55, 196, 255, 0)');

        // Wall highlight gradient (top edge) - subtle dorado accent
        g.wallHighlight.addColorStop(0, 'rgba(255, 203, 106, 0.15)');
        g.wallHighlight.addColorStop(0.3, 'rgba(255, 203, 106, 0.05)');
        g.wallHighlight.addColorStop(1, 'rgba(255, 203, 106, 0)');

        // Wall shadow gradient (bottom edge)
        g.wallShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
        g.wallShadow.addColorStop(0.7, 'rgba(0, 0, 0, 0.2)');
        g.wallShadow.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

        // Floor glow for interactive elements - cian sutil
        g.floorGlow.addColorStop(0, 'rgba(55, 196, 255, 0.1)');
        g.floorGlow.addColorStop(1, 'rgba(55, 196, 255, 0)');
    }

    renderBackground(level) {
        this.time += 0.016;

        if (level.number === 1) {
            if (!this.templeSurface) this.templeSurface = this.createTempleSurface(level);
            this.ctx.drawImage(this.templeSurface, 0, 0);
            return;
        }

        const ctx = this.ctx;
        const width = level.width * this.tileSize;
        const height = level.height * this.tileSize;

        // Deep space base with subtle gradient for composition
        ctx.fillStyle = '#050e17';
        ctx.fillRect(0, 0, width, height);

        // Subtle vertical gradient to break flatness
        const vGrad = ctx.createLinearGradient(0, 0, 0, height);
        vGrad.addColorStop(0, 'rgba(5, 14, 23, 0.3)');
        vGrad.addColorStop(1, 'rgba(5, 14, 23, 0.1)');
        ctx.fillStyle = vGrad;
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

    createTempleSurface(level) {
        const canvas = document.createElement('canvas');
        canvas.width = level.width * this.tileSize;
        canvas.height = level.height * this.tileSize;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        const voidGradient = ctx.createLinearGradient(0, 0, 0, height);
        voidGradient.addColorStop(0, '#03070d');
        voidGradient.addColorStop(0.45, '#08131d');
        voidGradient.addColorStop(1, '#04090f');
        ctx.fillStyle = voidGradient;
        ctx.fillRect(0, 0, width, height);

        this.renderTempleFloor(ctx, level);
        this.renderTempleDistantArchitecture(ctx, width, height);
        this.renderTempleFloorSeal(ctx, 332, 284, 112);
        this.renderTempleWalls(ctx, level);
        this.renderTempleGateArchitecture(ctx);
        this.renderTempleGoalDais(ctx);
        this.renderTempleProps(ctx);

        const shade = ctx.createRadialGradient(width * 0.5, height * 0.5, 130, width * 0.5, height * 0.5, 590);
        shade.addColorStop(0, 'rgba(0,0,0,0)');
        shade.addColorStop(0.72, 'rgba(0,0,0,.08)');
        shade.addColorStop(1, 'rgba(0,0,0,.48)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, width, height);
        return canvas;
    }

    renderTempleFloor(ctx, level) {
        const ts = this.tileSize;
        const floorGradient = ctx.createLinearGradient(0, 60, 0, 540);
        floorGradient.addColorStop(0, '#142536');
        floorGradient.addColorStop(0.45, '#0d1b28');
        floorGradient.addColorStop(1, '#09131e');

        for (let y = 0; y < level.height; y++) {
            for (let x = 0; x < level.width; x++) {
                if (level.tilemap[y][x] !== 0) continue;
                const px = x * ts;
                const py = y * ts;
                const seed = (x * 37 + y * 61) % 17;
                ctx.fillStyle = floorGradient;
                ctx.fillRect(px, py, ts, ts);
                ctx.fillStyle = seed % 4 === 0 ? 'rgba(48,69,82,.12)' : 'rgba(0,0,0,.08)';
                ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);

                ctx.strokeStyle = 'rgba(114,153,169,.09)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                if ((x + y) % 2 === 0) {
                    ctx.moveTo(px + 7, py + 1);
                    ctx.lineTo(px + ts - 7, py + 1);
                    ctx.moveTo(px + 1, py + 7);
                    ctx.lineTo(px + 1, py + ts - 7);
                } else {
                    ctx.moveTo(px + 7, py + ts - 1);
                    ctx.lineTo(px + ts - 7, py + ts - 1);
                    ctx.moveTo(px + ts - 1, py + 7);
                    ctx.lineTo(px + ts - 1, py + ts - 7);
                }
                ctx.stroke();

                if (seed === 3 || seed === 11) {
                    ctx.strokeStyle = 'rgba(3,7,11,.45)';
                    ctx.beginPath();
                    ctx.moveTo(px + 12, py + 18);
                    ctx.lineTo(px + 25, py + 26);
                    ctx.lineTo(px + 20, py + 39);
                    ctx.lineTo(px + 34, py + 48);
                    ctx.stroke();
                    ctx.strokeStyle = 'rgba(126,160,173,.06)';
                    ctx.beginPath();
                    ctx.moveTo(px + 13, py + 17);
                    ctx.lineTo(px + 26, py + 25);
                    ctx.stroke();
                }
            }
        }
    }

    renderTempleDistantArchitecture(ctx, width) {
        ctx.save();
        ctx.globalAlpha = 0.34;
        const haze = ctx.createLinearGradient(0, 55, 0, 190);
        haze.addColorStop(0, 'rgba(25,66,83,.4)');
        haze.addColorStop(1, 'rgba(8,20,30,0)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, 50, width, 150);

        [105, 390, 830].forEach((cx, index) => {
            const radius = index === 1 ? 92 : 70;
            ctx.strokeStyle = 'rgba(93,148,162,.22)';
            ctx.lineWidth = 12;
            ctx.beginPath();
            ctx.arc(cx, 126, radius, Math.PI, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(219,179,92,.18)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cx, 126, radius - 9, Math.PI, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(4,10,16,.42)';
            ctx.fillRect(cx - radius - 8, 118, 18, 85);
            ctx.fillRect(cx + radius - 10, 118, 18, 85);
        });
        ctx.restore();
    }

    renderTempleFloorSeal(ctx, cx, cy, radius) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = 'rgba(58,157,187,.17)';
        ctx.lineWidth = 2;
        [radius, radius - 17, radius - 43].forEach((r, i) => {
            ctx.setLineDash(i === 1 ? [8, 8] : []);
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();
        });
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(218,177,88,.13)';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = -Math.PI / 2 + i * Math.PI / 3;
            const x = Math.cos(angle) * (radius - 27);
            const y = Math.sin(angle) * (radius - 27);
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.font = '700 21px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ['π', 'Σ', '√', '∞', 'Δ', '3:5'].forEach((symbol, i) => {
            const angle = -Math.PI / 2 + i * Math.PI / 3;
            ctx.fillStyle = i % 2 ? 'rgba(58,157,187,.22)' : 'rgba(218,177,88,.2)';
            ctx.fillText(symbol, Math.cos(angle) * (radius - 8), Math.sin(angle) * (radius - 8));
        });
        ctx.restore();
    }

    renderTempleWalls(ctx, level) {
        const ts = this.tileSize;
        for (let y = 0; y < level.height; y++) {
            for (let x = 0; x < level.width; x++) {
                if (level.tilemap[y][x] !== 1) continue;
                const px = x * ts;
                const py = y * ts;
                const isolated = (
                    (x === 2 && y === 2) || (x === 4 && y === 2) || (x === 7 && y === 2) ||
                    (x === 4 && y === 5) || (x === 3 && y === 6) || (x === 7 && y === 6) || (x === 5 && y === 7)
                );
                if (isolated) this.renderTemplePillar(ctx, px, py, (x + y) % 3);
                else this.renderTempleWallCell(ctx, px, py, x, y, level);
            }
        }
    }

    renderTempleWallCell(ctx, px, py, x, y, level) {
        const ts = this.tileSize;
        const neighbors = {
            up: y > 0 && level.tilemap[y - 1][x] === 1,
            down: y < level.height - 1 && level.tilemap[y + 1][x] === 1,
            left: x > 0 && level.tilemap[y][x - 1] === 1,
            right: x < level.width - 1 && level.tilemap[y][x + 1] === 1
        };
        const face = ctx.createLinearGradient(px, py, px, py + ts);
        face.addColorStop(0, '#263c4a');
        face.addColorStop(0.18, '#1a2d3a');
        face.addColorStop(0.75, '#101e29');
        face.addColorStop(1, '#09121a');
        ctx.fillStyle = face;
        ctx.fillRect(px, py, ts, ts);
        ctx.strokeStyle = 'rgba(3,8,12,.65)';
        ctx.strokeRect(px + .5, py + .5, ts - 1, ts - 1);

        ctx.strokeStyle = 'rgba(120,158,169,.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + (y % 2 ? 9 : 28), py + 30);
        ctx.lineTo(px + ts, py + 30);
        ctx.stroke();

        if (!neighbors.down) {
            ctx.fillStyle = 'rgba(0,0,0,.48)';
            ctx.fillRect(px, py + 50, ts, 10);
            ctx.fillStyle = 'rgba(70,145,166,.12)';
            ctx.fillRect(px + 7, py + 48, ts - 14, 2);
        }
        if (!neighbors.up) {
            const cap = ctx.createLinearGradient(px, py, px, py + 12);
            cap.addColorStop(0, '#597181');
            cap.addColorStop(.18, '#263d4d');
            cap.addColorStop(1, '#142633');
            ctx.fillStyle = cap;
            ctx.beginPath();
            ctx.moveTo(px, py + 9);
            ctx.lineTo(px + 9, py);
            ctx.lineTo(px + ts - 9, py);
            ctx.lineTo(px + ts, py + 9);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(226,184,90,.3)';
            ctx.fillRect(px + 10, py + 2, ts - 20, 2);
        }
        if (!neighbors.left || !neighbors.right) {
            ctx.fillStyle = 'rgba(3,8,12,.3)';
            if (!neighbors.left) ctx.fillRect(px, py + 10, 7, 40);
            if (!neighbors.right) ctx.fillRect(px + ts - 7, py + 10, 7, 40);
        }
    }

    renderTemplePillar(ctx, px, py, variant) {
        const gradient = ctx.createLinearGradient(px, py, px, py + 60);
        gradient.addColorStop(0, '#4b6371');
        gradient.addColorStop(.16, '#203746');
        gradient.addColorStop(.75, '#12232f');
        gradient.addColorStop(1, '#09131b');
        ctx.fillStyle = 'rgba(0,0,0,.48)';
        ctx.fillRect(px + 5, py + 7, 54, 57);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(px + 5, py + 12);
        ctx.lineTo(px + 14, py + 3);
        ctx.lineTo(px + 46, py + 3);
        ctx.lineTo(px + 55, py + 12);
        ctx.lineTo(px + 50, py + 53);
        ctx.lineTo(px + 10, py + 53);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(223,181,89,.42)';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 10, py + 7, 40, 5);
        ctx.strokeStyle = 'rgba(69,179,207,.3)';
        ctx.beginPath();
        ctx.moveTo(px + 17, py + 45);
        ctx.lineTo(px + 30, py + 19);
        ctx.lineTo(px + 43, py + 45);
        ctx.stroke();
        ctx.fillStyle = 'rgba(181,216,220,.34)';
        ctx.font = '700 13px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(['π', 'Σ', '√'][variant], px + 30, py + 39);
    }

    renderTempleGateArchitecture(ctx) {
        const left = 641;
        const right = 739;
        const top = 157;
        ctx.save();
        ctx.fillStyle = '#0b1822';
        ctx.fillRect(left, top + 34, 15, 143);
        ctx.fillRect(right - 15, top + 34, 15, 143);
        const stone = ctx.createLinearGradient(0, top, 0, top + 180);
        stone.addColorStop(0, '#516b78');
        stone.addColorStop(.18, '#203846');
        stone.addColorStop(1, '#0b1822');
        ctx.strokeStyle = stone;
        ctx.lineWidth = 13;
        ctx.beginPath();
        ctx.moveTo(left + 8, top + 180);
        ctx.lineTo(left + 8, top + 48);
        ctx.quadraticCurveTo(690, top - 12, right - 8, top + 48);
        ctx.lineTo(right - 8, top + 180);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(225,183,89,.48)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(left + 19, top + 170);
        ctx.lineTo(left + 19, top + 52);
        ctx.quadraticCurveTo(690, top + 7, right - 19, top + 52);
        ctx.lineTo(right - 19, top + 170);
        ctx.stroke();
        ctx.fillStyle = 'rgba(83,190,215,.5)';
        [-1, 1].forEach(side => {
            ctx.fillRect(690 + side * 42 - 2, top + 68, 4, 72);
        });
        ctx.restore();
    }

    renderTempleGoalDais(ctx) {
        ctx.save();
        ctx.translate(870, 450);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 78);
        glow.addColorStop(0, 'rgba(46,171,206,.12)');
        glow.addColorStop(1, 'rgba(46,171,206,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(-85, -85, 170, 170);
        ctx.strokeStyle = 'rgba(221,180,88,.24)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = Math.PI / 8 + i * Math.PI / 4;
            const x = Math.cos(a) * 52;
            const y = Math.sin(a) * 52;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    renderTempleProps(ctx) {
        const crystals = [[592, 137, .75], [775, 390, .6], [520, 454, .5]];
        crystals.forEach(([x, y, scale]) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            ctx.fillStyle = 'rgba(46,168,198,.22)';
            ctx.beginPath();
            ctx.moveTo(0, -18); ctx.lineTo(9, -3); ctx.lineTo(5, 12); ctx.lineTo(-7, 10); ctx.lineTo(-10, -4); ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(115,223,239,.56)';
            ctx.stroke();
            ctx.restore();
        });
        [[548, 84], [807, 144], [115, 431]].forEach(([x, y], i) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((i - 1) * .22);
            ctx.fillStyle = '#172832';
            ctx.fillRect(-14, -7, 28, 14);
            ctx.strokeStyle = 'rgba(180,148,79,.28)';
            ctx.strokeRect(-13.5, -6.5, 27, 13);
            ctx.restore();
        });
    }

    renderLevelGuidance(level, doorOpen) {
        if (level.number !== 1) return;
        const ctx = this.ctx;
        const pulse = .5 + Math.sin(this.time * 2.1) * .5;
        const pathA = [[92, 112], [332, 112], [332, 270], [690, 270]];
        const pathB = [[690, 270], [790, 270], [790, 450], [870, 450]];
        const drawPath = (points, active) => {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = active ? `rgba(64,210,239,${.28 + pulse * .1})` : 'rgba(42,113,135,.18)';
            ctx.lineWidth = active ? 5 : 3;
            ctx.shadowColor = active ? 'rgba(55,196,255,.55)' : 'transparent';
            ctx.shadowBlur = active ? 12 : 0;
            ctx.beginPath();
            points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
            ctx.stroke();
            ctx.strokeStyle = active ? 'rgba(190,246,255,.65)' : 'rgba(92,155,169,.17)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        };
        drawPath(pathA, true);
        drawPath(pathB, doorOpen);
    }

    renderForeground(level) {
        if (level.number !== 1) return;
        const ctx = this.ctx;
        ctx.save();
        const edge = ctx.createLinearGradient(0, 0, 38, 0);
        edge.addColorStop(0, 'rgba(0,0,0,.5)');
        edge.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = edge;
        ctx.fillRect(0, 65, 38, 420);
        ctx.translate(960, 0);
        ctx.scale(-1, 1);
        ctx.fillRect(0, 65, 38, 420);
        ctx.restore();
    }

    renderAtmosphere(level) {
        if (level.number !== 1) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const gateGlow = ctx.createRadialGradient(690, 260, 0, 690, 260, 125);
        gateGlow.addColorStop(0, 'rgba(37,153,188,.08)');
        gateGlow.addColorStop(1, 'rgba(37,153,188,0)');
        ctx.fillStyle = gateGlow;
        ctx.fillRect(550, 120, 280, 280);
        const goalGlow = ctx.createRadialGradient(870, 450, 0, 870, 450, 90);
        goalGlow.addColorStop(0, 'rgba(48,180,215,.11)');
        goalGlow.addColorStop(1, 'rgba(48,180,215,0)');
        ctx.fillStyle = goalGlow;
        ctx.fillRect(775, 355, 190, 185);

        for (let i = 0; i < 18; i++) {
            const x = (i * 157 + Math.sin(this.time * .35 + i) * 18) % 930 + 15;
            const y = (i * 83 - this.time * (3 + i % 4)) % 440 + 75;
            const alpha = .12 + (i % 4) * .035;
            ctx.fillStyle = i % 5 === 0 ? `rgba(226,184,90,${alpha})` : `rgba(73,196,221,${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, i % 3 === 0 ? 1.5 : 1, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
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
        if (level.number === 1) return;
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

        // Large-format tile variation - warm stone tone base, cian accent only on some tiles
        const baseTone = 0.008 + (seed % 3) * 0.002;
        const cyanAccent = (seed % 7 === 0) ? 0.03 : 0;
        ctx.fillStyle = `rgba(10, 20, 36, ${1 - baseTone - cyanAccent})`;
        ctx.fillRect(px, py, ts, ts);

        // Cian tech accent only on select tiles (sparse, not grid-like)
        if (cyanAccent > 0) {
            ctx.fillStyle = `rgba(55, 196, 255, ${cyanAccent})`;
            ctx.fillRect(px, py, ts, ts);
        }

        // Sub-panel seam only at large-tile boundaries - hides the 60px grid
        const isTileEdgeX = x % large === 0;
        const isTileEdgeY = y % large === 0;
        if (isTileEdgeX || isTileEdgeY) {
            ctx.strokeStyle = 'rgba(55, 196, 255, 0.015)';
            ctx.lineWidth = 0.3;
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

        // Occasional floor conduit detail - cian line on some large tiles only
        if ((lx * 13 + ly * 7) % 5 === 0) {
            ctx.strokeStyle = 'rgba(55, 196, 255, 0.03)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(px + 10, py + 20 + (ly % 3) * 10);
            ctx.lineTo(px + ts - 10, py + 20 + (ly % 3) * 10);
            ctx.stroke();
        }

        // Occasional inset floor panel (large, not per-tile spam) - dorado accent
        if ((lx * 17 + ly * 29) % 11 === 0) {
            ctx.strokeStyle = 'rgba(255, 203, 106, 0.04)';
            ctx.lineWidth = 0.8;
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

        // Base wall with pattern - charcoal stone
        ctx.fillStyle = this.patterns.wall;
        ctx.fillRect(px, py, ts, ts);

        // WALL TOP (2.5D visible top face) - strengthened depth cue
        // when wall has floor/void above it. Key depth cue.
        if (!neighbors.up) {
            const topH = 10;
            const topGrad = ctx.createLinearGradient(px, py, px, py + topH);
            topGrad.addColorStop(0, '#2a4466');
            topGrad.addColorStop(1, '#1a3044');
            ctx.fillStyle = topGrad;
            ctx.fillRect(px, py, ts, topH);

            // Top highlight edge line - dorado accent
            ctx.fillStyle = 'rgba(255, 203, 106, 0.12)';
            ctx.fillRect(px, py, ts, 1.5);

            // Wall top engraving line - cian sutil
            ctx.strokeStyle = 'rgba(55, 196, 255, 0.1)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(px + 6, py + topH * 0.5);
            ctx.lineTo(px + ts - 6, py + topH * 0.5);
            ctx.stroke();

            this.renderWallDetail(px, py, 'top');
        }

        // WALL FACE vertical gradient (height feel)
        const faceGrad = ctx.createLinearGradient(px, py, px, py + ts);
        faceGrad.addColorStop(0, 'rgba(255,255,255,0.02)');
        faceGrad.addColorStop(0.3, 'rgba(255,255,255,0)');
        faceGrad.addColorStop(1, 'rgba(0,0,0,0.1)');
        ctx.fillStyle = faceGrad;
        ctx.fillRect(px, py, ts, ts);

        // Bottom contact shadow (where wall meets floor) - stronger for grounded feel
        if (!neighbors.down) {
            const shadow = ctx.createLinearGradient(px, py + ts - 12, px, py + ts);
            shadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
            shadow.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
            shadow.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
            ctx.fillStyle = shadow;
            ctx.fillRect(px, py + ts - 12, ts, 12);
        }

        // Side faces (left/right edges exposed to floor) - column shading
        // Stronger for clear 2.5D column feel
        if (!neighbors.left) {
            const sideGrad = ctx.createLinearGradient(px, py, px + 10, py);
            sideGrad.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
            sideGrad.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
            ctx.fillStyle = sideGrad;
            ctx.fillRect(px, py, 10, ts);
        }
        if (!neighbors.right) {
            const sideGrad = ctx.createLinearGradient(px + ts - 10, py, px + ts, py);
            sideGrad.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
            sideGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
            ctx.fillStyle = sideGrad;
            ctx.fillRect(px + ts - 10, py, 10, ts);
        }

        // Wall corner highlights for depth - dorado accent
        if (!neighbors.up && !neighbors.left) {
            ctx.fillStyle = 'rgba(255, 203, 106, 0.18)';
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + 12, py);
            ctx.lineTo(px, py + 12);
            ctx.fill();
        }
        if (!neighbors.up && !neighbors.right) {
            ctx.fillStyle = 'rgba(255, 203, 106, 0.18)';
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
