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
        this.activationProgress = 0;
    }

    update(dt, player) {
        this.pulseTime += dt;
        this.rotation += dt * 0.3;
        this.floatOffset = Math.sin(this.pulseTime * 2) * 4;

        const dist = Math.hypot(
            (player.x + player.width/2) - (this.x + this.width/2),
            (player.y + player.height/2) - (this.y + this.height/2)
        );

        if (dist < 50 && !this.activated) {
            this.activated = true;
            window.game?.triggerVictory?.();
        }

        if (this.activated) {
            this.activationProgress = Math.min(1, this.activationProgress + dt * 0.5);
        }

        this.spawnAmbientParticles(dt);
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => !p.dead);
    }

    spawnAmbientParticles(dt) {
        if (Math.random() < dt * 2) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 20 + Math.random() * 20;
            this.particles.push(new GoalParticle(
                this.x + this.width/2 + Math.cos(angle) * radius,
                this.y + this.height/2 + Math.sin(angle) * radius + this.floatOffset,
                '#37c4ff'
            ));
        }
        if (this.activated && Math.random() < dt * 10) {
            this.particles.push(new GoalParticle(
                this.x + this.width/2 + (Math.random() - 0.5) * 40,
                this.y + this.height/2 + this.floatOffset + (Math.random() - 0.5) * 40,
                '#ffd700'
            ));
        }
    }

    render(renderer) {
        const ctx = renderer.ctx;

        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2 + this.floatOffset);

        this.renderBase(ctx);
        this.renderCore(ctx);
        this.renderRings(ctx);
        this.renderSymbol(ctx);
        this.particles.forEach(p => p.render(ctx));

        ctx.restore();
    }

    renderBase(ctx) {
        const pulse = Math.sin(this.pulseTime * 3) * 0.15 + 0.85;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(0, 15, 22 * pulse, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        const baseGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
        baseGrad.addColorStop(0, '#0d1f33');
        baseGrad.addColorStop(0.5, '#153045');
        baseGrad.addColorStop(1, '#0a1520');
        ctx.fillStyle = baseGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(55, 196, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = 0; i < 6; i++) {
            const angle = this.rotation + i * Math.PI / 3;
            const r = 18 * pulse;
            ctx.fillStyle = `rgba(55, 196, 255, ${0.3 + Math.sin(this.pulseTime * 4 + i) * 0.2})`;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderCore(ctx) {
        const pulse = Math.sin(this.pulseTime * 4) * 0.3 + 0.7;
        const coreSize = 14 * pulse * (this.activated ? 1.5 : 1);

        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
        coreGrad.addColorStop(0, this.activated ? '#ffffff' : '#41c8ff');
        coreGrad.addColorStop(0.5, this.activated ? '#ffd700' : '#37c4ff');
        coreGrad.addColorStop(1, this.activated ? '#ff8800' : '#1a4a7a');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = this.activated ? '#ffd700' : '#37c4ff';
        ctx.shadowBlur = 20 * pulse;
        ctx.fillStyle = this.activated ? 'rgba(255, 215, 0, 0.5)' : 'rgba(55, 196, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(0, 0, coreSize * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    renderRings(ctx) {
        for (let i = 0; i < 3; i++) {
            const ringPulse = Math.sin(this.pulseTime * 2 + i * 2) * 0.5 + 0.5;
            const radius = 30 + i * 12 + ringPulse * 8;
            const alpha = (0.3 - i * 0.08) * (this.activated ? 2 : 1);

            ctx.strokeStyle = this.activated
                ? `rgba(255, 215, 0, ${alpha})`
                : `rgba(55, 196, 255, ${alpha})`;
            ctx.lineWidth = this.activated ? 3 : 2;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = this.activated
                ? `rgba(255, 215, 0, ${alpha * 0.5})`
                : `rgba(55, 196, 255, ${alpha * 0.5})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([8, 8]);
            ctx.lineDashOffset = -this.pulseTime * 50;
            ctx.beginPath();
            ctx.arc(0, 0, radius + 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    renderSymbol(ctx) {
        const symbols = ['∑', '∫', 'π', 'φ', '∞', 'Δ'];
        const symbol = symbols[Math.floor(this.pulseTime / 2) % symbols.length];

        ctx.fillStyle = this.activated ? '#0a1520' : '#ffffff';
        ctx.font = `bold ${this.activated ? 28 : 22}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, 0, 1);

        if (this.activated) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText('NÚCLEO', 0, 22);
        }
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