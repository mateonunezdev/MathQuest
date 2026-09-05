import { Particle } from './Particle.js';

export class MathDoor {
    constructor(tileX, tileY, challengeId) {
        this.tileSize = 60;
        this.x = tileX * this.tileSize;
        this.y = tileY * this.tileSize;
        this.width = this.tileSize;
        this.height = this.tileSize * 1.5;
        this.challengeId = challengeId;
        this.locked = true;
        this.openProgress = 0;
        this.openTarget = 0;
        this.glowIntensity = 0;
        this.glowTarget = 0;
        this.pulseTime = 0;
        this.particles = [];
        this.interactionHint = false;
        this.hintAlpha = 0;
    }

    update(dt, player) {
        this.pulseTime += dt;

        const dist = Math.hypot(
            (player.x + player.width/2) - (this.x + this.width/2),
            (player.y + player.height/2) - (this.y + this.height/2)
        );
        const interactionRange = 100;

        this.interactionHint = dist < interactionRange && this.locked;
        this.hintAlpha += (this.interactionHint ? 1 : -1) * dt * 4;
        this.hintAlpha = Math.max(0, Math.min(1, this.hintAlpha));

        this.glowIntensity += (this.glowTarget - this.glowIntensity) * dt * 5;
        this.openProgress += (this.openTarget - this.openProgress) * dt * 3;

        if (this.locked && this.glowIntensity > 0) {
            this.spawnAmbientParticle();
        }

        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => !p.dead);

        if (this.interactionHint && dist < 60 && this.locked) {
            if (window.game?.input?.wasPressed?.('ArrowUp') || window.game?.input?.wasPressed?.('w')) {
                window.game?.triggerChallenge?.(this.challengeId);
            }
        }
    }

    unlock() {
        this.locked = false;
        this.glowTarget = 1;
        this.openTarget = 1;
        this.spawnUnlockParticles(30);
    }

    spawnAmbientParticle() {
        if (Math.random() < 0.05) {
            this.particles.push(new DoorParticle(
                this.x + Math.random() * this.width,
                this.y + Math.random() * this.height,
                '#37c4ff'
            ));
        }
    }

    spawnUnlockParticles(count) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 100 + Math.random() * 100;
            this.particles.push(new Particle(
                this.x + this.width/2,
                this.y + this.height/2,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '#37c4ff',
                1 + Math.random() * 0.5
            ));
        }
    }

    render(renderer) {
        const ctx = renderer.ctx;
        const ts = this.tileSize;

        ctx.save();
        ctx.translate(this.x, this.y);

        this.renderDoorFrame(ctx);
        this.renderDoorPanels(ctx);
        this.renderLock(ctx);
        this.renderEnergyField(ctx);
        this.particles.forEach(p => p.render(ctx));

        if (this.hintAlpha > 0) {
            this.renderInteractionHint(ctx);
        }

        ctx.restore();
    }

    renderDoorFrame(ctx) {
        const ts = this.tileSize;
        const h = this.height;

        ctx.fillStyle = '#0a1520';
        ctx.fillRect(-4, 0, ts + 8, h);

        const frameGrad = ctx.createLinearGradient(0, 0, ts, 0);
        frameGrad.addColorStop(0, '#1a3d55');
        frameGrad.addColorStop(0.5, '#2a5a8a');
        frameGrad.addColorStop(1, '#1a3d55');
        ctx.fillStyle = frameGrad;
        ctx.fillRect(0, 0, ts, 6);
        ctx.fillRect(0, h - 6, ts, 6);
        ctx.fillRect(0, 0, 6, h);
        ctx.fillRect(ts - 6, 0, 6, h);

        ctx.strokeStyle = 'rgba(55, 196, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(3, 3, ts - 6, h - 6);
    }

    renderDoorPanels(ctx) {
        const ts = this.tileSize;
        const h = this.height;
        const panelH = (h - 20) / 2;

        const openOffset = this.openProgress * panelH * 0.8;

        [0, 1].forEach((side, i) => {
            const y = 10 + i * (panelH + 10);
            const currentH = panelH - (i === 0 ? openOffset : -openOffset);

            const panelGrad = ctx.createLinearGradient(0, y, ts, y + currentH);
            panelGrad.addColorStop(0, this.locked ? '#0d1f33' : '#0a2a1a');
            panelGrad.addColorStop(0.5, this.locked ? '#153045' : '#1a3a2a');
            panelGrad.addColorStop(1, this.locked ? '#0d1f33' : '#0a2a1a');
            ctx.fillStyle = panelGrad;
            ctx.fillRect(8, y + (i === 0 ? openOffset : -openOffset), ts - 16, currentH);

            ctx.strokeStyle = this.locked ? 'rgba(55, 196, 255, 0.2)' : 'rgba(80, 255, 120, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(8.5, y + 0.5 + (i === 0 ? openOffset : -openOffset), ts - 17, currentH - 1);

            this.renderPanelDetails(ctx, 8, y + (i === 0 ? openOffset : -openOffset), ts - 16, currentH, i);
        });
    }

    renderPanelDetails(ctx, x, y, w, h, panelIndex) {
        const ts = this.tileSize;

        ctx.strokeStyle = this.locked ? 'rgba(55, 196, 255, 0.1)' : 'rgba(80, 255, 120, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 3; i++) {
            const ly = y + h * i / 3;
            ctx.beginPath();
            ctx.moveTo(x, ly);
            ctx.lineTo(x + w, ly);
            ctx.stroke();
        }
        for (let i = 1; i < 4; i++) {
            const lx = x + w * i / 4;
            ctx.beginPath();
            ctx.moveTo(lx, y);
            ctx.lineTo(lx, y + h);
            ctx.stroke();
        }

        const centerX = x + w / 2;
        const centerY = y + h / 2;
        const pulse = Math.sin(this.pulseTime * 2 + panelIndex) * 0.3 + 0.7;

        if (this.locked) {
            ctx.fillStyle = `rgba(55, 196, 255, ${pulse * 0.15})`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 20 * pulse, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = `rgba(80, 255, 120, ${pulse * 0.2})`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 25 * pulse, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderLock(ctx) {
        if (!this.locked) return;

        const ts = this.tileSize;
        const cx = ts / 2;
        const cy = this.height / 2 - 10;
        const pulse = Math.sin(this.pulseTime * 3) * 0.4 + 0.6;

        ctx.fillStyle = `rgba(173, 107, 49, ${pulse})`;
        ctx.beginPath();
        ctx.roundRect(cx - 12, cy - 8, 24, 16, 4);
        ctx.fill();

        ctx.strokeStyle = '#8b5a2b';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 200, 100, ${pulse})`;
        ctx.beginPath();
        ctx.arc(cx, cy + 2, 6, 0, Math.PI);
        ctx.fill();

        ctx.fillStyle = '#5a3515';
        ctx.beginPath();
        ctx.arc(cx, cy + 2, 3, 0, Math.PI * 2);
        ctx.fill();

        const shackleY = cy - 8 + Math.sin(this.pulseTime * 4) * 2;
        ctx.strokeStyle = `rgba(173, 107, 49, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 8, shackleY);
        ctx.lineTo(cx - 8, cy - 4);
        ctx.arc(cx, cy - 4, 8, Math.PI, 0);
        ctx.lineTo(cx + 8, shackleY);
        ctx.stroke();
    }

    renderEnergyField(ctx) {
        if (this.glowIntensity < 0.01) return;

        const ts = this.tileSize;
        const h = this.height;
        const cx = ts / 2;
        const cy = h / 2;

        ctx.save();
        ctx.globalAlpha = this.glowIntensity * 0.3;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts);
        grad.addColorStop(0, 'rgba(55, 196, 255, 0.4)');
        grad.addColorStop(1, 'rgba(55, 196, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, ts, h);

        ctx.strokeStyle = 'rgba(55, 196, 255, 0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const r = (this.pulseTime * 50 + i * 30) % (ts * 0.8);
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    renderInteractionHint(ctx) {
        const ts = this.tileSize;
        const cx = ts / 2;
        const cy = -30 + Math.sin(this.pulseTime * 3) * 4;

        ctx.save();
        ctx.globalAlpha = this.hintAlpha;
        ctx.translate(cx, cy);

        ctx.fillStyle = 'rgba(10, 21, 35, 0.95)';
        ctx.strokeStyle = '#37c4ff';
        ctx.lineWidth = 2;
        const w = 160;
        ctx.beginPath();
        ctx.roundRect(-w/2, -18, w, 36, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#37c4ff';
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↑  INTERACTUAR', 0, 0);

        ctx.fillStyle = 'rgba(55, 196, 255, 0.5)';
        ctx.font = '10px sans-serif';
        ctx.fillText('WASD / Flechas para mover', 0, 20);

        ctx.restore();
    }
}

class DoorParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 20;
        this.vy = -Math.random() * 30 - 10;
        this.life = 1;
        this.maxLife = 1;
        this.color = color;
        this.size = 2 + Math.random() * 3;
        this.dead = false;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 50 * dt;
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