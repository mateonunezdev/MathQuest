const portalArtwork = new Image();
portalArtwork.src = new URL('../../assets/fair/portal/world-gateway.svg', import.meta.url).href;

export class Goal {
    constructor(tileX, tileY) {
        this.tileSize = 60;
        this.x = tileX * this.tileSize;
        this.y = tileY * this.tileSize;
        this.width = this.tileSize;
        this.height = this.tileSize;
        this.pulseTime = 0;
        this.rotation = 0;
        this.floatOffset = 0;
        this.particles = [];
        this.activated = false;
        this.locked = false;
        this.activationProgress = 0;
        this.approachGlow = 0;
        this.activationFlash = 0;
    }

    update(dt, player, canActivate = true) {
        this.locked = !canActivate && !this.activated;
        this.pulseTime += dt;
        this.rotation += dt * 0.3;
        this.floatOffset = Math.sin(this.pulseTime * 2) * 4;

        const dist = Math.hypot(
            (player.x + player.width/2) - (this.x + this.width/2),
            (player.y + player.height/2) - (this.y + this.height/2)
        );

        // Reactive approach - core glows stronger as player nears (before activation)
        const proximity = 1 - Math.max(0, Math.min(1, (dist - 30) / 180));
        this.approachGlow += ((proximity * proximity) - this.approachGlow) * dt * 4;

        if (canActivate && dist < 55 && !this.activated) {
            this.activated = true;
            this.activationFlash = 1;
            window.game?.triggerVictory?.();
        }

        if (this.activated) {
            this.activationProgress = Math.min(1, this.activationProgress + dt * 0.6);
            this.activationFlash = Math.max(0, this.activationFlash - dt * 2.5);
        }

        this.spawnAmbientParticles(dt);
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => !p.dead);
    }

    spawnAmbientParticles(dt) {
        const rate = this.approachGlow * 6;
        if (Math.random() < dt * (2 + rate)) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 20 + Math.random() * 20;
            this.particles.push(new GoalParticle(
                this.x + this.width/2 + Math.cos(angle) * radius,
                this.y + this.height/2 + Math.sin(angle) * radius + this.floatOffset,
                '#37c4ff'
            ));
        }
        if (this.activated && Math.random() < dt * 12) {
            this.particles.push(new GoalParticle(
                this.x + this.width/2 + (Math.random() - 0.5) * 40,
                this.y + this.height/2 + this.floatOffset + (Math.random() - 0.5) * 40,
                '#ffd700'
            ));
        }
    }

    render(renderer) {
        const ctx = renderer.ctx;
        const visualOffsetY = this.y < 100 ? 125 : 0;

        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2 + visualOffsetY);

        ctx.fillStyle = 'rgba(1, 7, 12, .62)';
        ctx.beginPath();
        ctx.ellipse(0, this.height / 2 - 3, 75, 17, 0, 0, Math.PI * 2);
        ctx.fill();

        // Localized glow that reacts to proximity / activation
        const glowBase = this.activated ? 1 : this.approachGlow;
        const glowAlpha = 0.15 + glowBase * 0.35 + this.activationFlash * 0.4;
        const glowGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 95);
        glowGrad.addColorStop(0, `rgba(${this.activated ? '255, 215, 0' : '55, 196, 255'}, ${glowAlpha})`);
        glowGrad.addColorStop(1, 'rgba(55, 196, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(-95, -95, 190, 190);

        // Holographic ring overlay when activated - enhanced goal signposting
        if (this.activated) {
            const holograd = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
            holograd.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
            holograd.addColorStop(0.5, 'rgba(55, 196, 255, 0.08)');
            holograd.addColorStop(1, 'rgba(55, 196, 255, 0)');
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.strokeStyle = holograd;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const r = 12 + i * 7 + Math.sin(this.pulseTime * 3 + i) * 2;
                ctx.arc(0, 0, r, 0, Math.PI * 2);
            }
            ctx.stroke();
            ctx.restore();
        }

        const art = renderer.artAssets;
        const base = art?.draw(ctx, art.get('portal', 'base'), 0, this.height / 2, this.pulseTime);
        if (base) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            const energy = 0.13 + Math.sin(this.pulseTime * 3.4) * 0.035 + this.approachGlow * 0.13;
            const coreLight = ctx.createRadialGradient(0, -27, 3, 0, -27, 39);
            coreLight.addColorStop(0, `rgba(196,244,255,${energy + 0.1})`);
            coreLight.addColorStop(0.48, `rgba(62,202,237,${energy})`);
            coreLight.addColorStop(1, 'rgba(62,202,237,0)');
            ctx.fillStyle = coreLight;
            ctx.fillRect(-43, -70, 86, 86);
            ctx.strokeStyle = `rgba(138,232,248,${this.locked ? 0.23 : 0.42})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 2; i++) {
                const angle = this.pulseTime * (i ? -0.65 : 0.8) + i * Math.PI;
                ctx.beginPath();
                ctx.arc(0, -27, 25 + i * 9, angle, angle + Math.PI * 0.8);
                ctx.stroke();
            }
            ctx.fillStyle = `rgba(96,220,242,${0.12 + Math.sin(this.pulseTime * 3) * 0.04})`;
            ctx.beginPath();
            ctx.ellipse(0, this.height / 2 - 3, 53, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        if (!base) {
            const hasArtwork = portalArtwork.complete && portalArtwork.naturalWidth > 0;
            if (hasArtwork) ctx.drawImage(portalArtwork, -95, -112, 190, 200);
            else {
                this.renderPortalArchitecture(ctx);
                this.renderBase(ctx);
            }
        }
        const core = art?.draw(ctx, art.get('portal', 'core'), 0, 0, this.pulseTime);
        if (!core && !base) {
            ctx.save();
            ctx.scale(1.16, 1.25);
            this.renderCore(ctx);
            this.renderSymbol(ctx);
            ctx.restore();
            this.renderRings(ctx);
            this.renderOrbitGlyphs(ctx);
        }
        art?.draw(ctx, art.get('portal', 'foreground'), 0, this.height / 2, this.pulseTime);
        art?.draw(ctx, art.get('portal', 'fx'), 0, 0, this.pulseTime);
        ctx.save();
        ctx.translate(-this.x - this.width / 2, -this.y - this.height / 2 - visualOffsetY);
        this.particles.forEach(p => p.render(ctx));
        ctx.restore();

        if (this.locked) {
            ctx.shadowColor = '#090c10';
            ctx.shadowBlur = 5;
            ctx.fillStyle = '#e7bb7d';
            ctx.font = 'bold 11px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('SELLADO', 0, -87);
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    renderPortalArchitecture(ctx) {
        const glow = this.activated ? 1 : this.approachGlow;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,.5)';
        ctx.beginPath();
        ctx.ellipse(0, 24, 43, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        const stone = ctx.createLinearGradient(-36, -36, 38, 38);
        stone.addColorStop(0, '#6e8588');
        stone.addColorStop(.35, '#304b59');
        stone.addColorStop(1, '#0b1b27');
        ctx.fillStyle = stone;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = Math.PI / 8 + i * Math.PI / 4;
            const px = Math.cos(angle) * 41;
            const py = Math.sin(angle) * 41;
            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#c6a466';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = '#071824';
        ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(96,221,238,${.4 + glow * .35})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 33, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 8; i++) {
            const angle = Math.PI / 8 + i * Math.PI / 4;
            ctx.fillStyle = i % 2 ? '#bb9961' : '#79d8e7';
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * 38, Math.sin(angle) * 38, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    renderOrbitGlyphs(ctx) {
        ctx.save();
        ctx.rotate(this.rotation * (this.activated ? 2 : 1));
        const glyphs = ['π', 'Σ', '√', '∞'];
        ctx.font = 'bold 12px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.activated ? '#f5d68d' : '#a5e7ee';
        for (let i = 0; i < 4; i++) {
            const angle = i * Math.PI / 2 - Math.PI / 2;
            ctx.fillText(glyphs[i], Math.cos(angle) * 50, Math.sin(angle) * 50);
        }
        ctx.restore();
    }

    renderBase(ctx) {
        const pulse = Math.sin(this.pulseTime * 3) * 0.15 + 0.85;
        const approach = this.activated ? 1 : this.approachGlow;

        // Contact shadow on floor
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 16, 24 * pulse, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pedestal base ring
        const baseRing = 28 + approach * 4;
        ctx.fillStyle = '#0a1828';
        ctx.beginPath();
        ctx.arc(0, 2, baseRing, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(55, 196, 255, ${0.35 + approach * 0.3})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner pedestal tier
        ctx.fillStyle = '#0d1f33';
        ctx.beginPath();
        ctx.arc(0, 0, baseRing * 0.82, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(55, 196, 255, ${0.25 + approach * 0.3})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Pedestal energy nodes (brighter near player)
        for (let i = 0; i < 6; i++) {
            const angle = this.rotation + i * Math.PI / 3;
            const r = (baseRing - 8) * pulse;
            const nodeBright = 0.3 + approach * 0.5 + Math.sin(this.pulseTime * 4 + i) * 0.2;
            ctx.fillStyle = `rgba(${this.activated ? '255, 215, 0' : '55, 196, 255'}, ${nodeBright})`;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderCore(ctx) {
        const pulse = 0.9 + Math.sin(this.pulseTime * 3) * 0.1;
        const coreSize = (this.activated ? 23 : 19) * pulse;
        ctx.save();
        ctx.shadowColor = this.activated ? '#f0be66' : '#51d3ea';
        ctx.shadowBlur = 17 + this.approachGlow * 9;
        const coreGrad = ctx.createRadialGradient(-4, -6, 1, 0, 0, coreSize);
        coreGrad.addColorStop(0, '#f2fdff');
        coreGrad.addColorStop(.3, this.activated ? '#ffe9ae' : '#a0f5ff');
        coreGrad.addColorStop(.72, this.activated ? '#b87c2b' : '#2686a9');
        coreGrad.addColorStop(1, '#082838');
        ctx.fillStyle = coreGrad;
        ctx.beginPath(); ctx.arc(0, 0, coreSize, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    renderRings(ctx) {
        for (let i = 0; i < 3; i++) {
            const ringPulse = Math.sin(this.pulseTime * 2 + i * 2) * 0.5 + 0.5;
            const radius = 29 + i * 10 + ringPulse * 4;
            const alpha = (0.36 - i * 0.08) * (this.activated ? 1.6 : 1);

            ctx.strokeStyle = this.activated
                ? `rgba(255, 215, 0, ${alpha})`
                : `rgba(55, 196, 255, ${alpha})`;
            ctx.lineWidth = this.activated ? 3 : 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, radius, radius * 1.18, 0,
                this.rotation + i * 1.4, this.rotation + i * 1.4 + Math.PI * 1.5);
            ctx.stroke();

            ctx.strokeStyle = this.activated
                ? `rgba(255, 215, 0, ${alpha * 0.5})`
                : `rgba(55, 196, 255, ${alpha * 0.5})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([8, 8]);
            ctx.lineDashOffset = -this.pulseTime * 50;
            ctx.beginPath();
            ctx.ellipse(0, 0, radius + 4, (radius + 4) * 1.18, 0,
                -this.rotation + i, -this.rotation + i + Math.PI);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    renderSymbol(ctx) {
        ctx.fillStyle = '#082838';
        ctx.font = 'bold 23px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('∞', 0, 1);
    }
}

class GoalParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 30;
        this.vy = -Math.random() * 40 - 20;
        this.life = 1.5;
        this.maxLife = 1.5;
        this.color = color;
        this.size = 2 + Math.random() * 3;
        this.dead = false;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 30 * dt;
        this.life -= dt;
        if (this.life <= 0) this.dead = true;
    }

    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
