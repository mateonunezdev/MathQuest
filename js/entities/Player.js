export class Player {
    constructor(x, y) {
        this.tileSize = 60;
        this.x = x;
        this.y = y;
        this.width = 36;
        this.height = 44;
        this.vx = 0;
        this.vy = 0;
        this.speed = 240;
        this.direction = 'down';
        this.walkCycle = 0;
        this.walkSpeed = 0;
        this.idleTime = 0;
        this.bobOffset = 0;
        this.invulnerable = 0;
        this.flashTime = 0;
    }

    update(dt, input) {
        const move = input.getMovementVector();
        const wasMoving = this.walkSpeed > 0.1;

        if (move.x !== 0 || move.y !== 0) {
            const len = Math.hypot(move.x, move.y);
            this.vx = (move.x / len) * this.speed;
            this.vy = (move.y / len) * this.speed;
            this.walkSpeed = Math.min(this.walkSpeed + dt * 10, 1);
            this.walkCycle += dt * 12 * this.walkSpeed;

            if (Math.abs(move.x) > Math.abs(move.y)) {
                this.direction = move.x > 0 ? 'right' : 'left';
            } else {
                this.direction = move.y > 0 ? 'down' : 'up';
            }
            this.idleTime = 0;
        } else {
            this.vx = 0;
            this.vy = 0;
            this.walkSpeed = Math.max(this.walkSpeed - dt * 8, 0);
            this.idleTime += dt;
            if (this.walkSpeed < 0.05) this.walkCycle = 0;
        }

        this.bobOffset = Math.sin(this.walkCycle) * 3 * this.walkSpeed;

        if (this.invulnerable > 0) {
            this.invulnerable -= dt;
            this.flashTime += dt * 20;
        }
    }

    render(renderer) {
        const ctx = renderer.ctx;
        const ts = this.tileSize;
        const px = this.x + ts/2;
        const py = this.y + ts/2 + this.bobOffset;

        if (this.invulnerable > 0 && Math.sin(this.flashTime) > 0) return;

        ctx.save();
        ctx.translate(px, py);

        this.renderShadow(ctx);
        this.renderBody(ctx);
        this.renderEyes(ctx);
        this.renderDirectionIndicator(ctx);

        ctx.restore();
    }

    renderShadow(ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 18, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    renderBody(ctx) {
        const walkBob = Math.sin(this.walkCycle * 2) * 2 * this.walkSpeed;
        const idleBob = Math.sin(this.idleTime * 2) * 1.5;

        const bodyY = walkBob + (this.walkSpeed < 0.1 ? idleBob : 0);

        ctx.fillStyle = '#1a3a5c';
        ctx.beginPath();
        ctx.ellipse(0, bodyY + 8, 18, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        const gradient = ctx.createLinearGradient(-18, bodyY - 12, 18, bodyY + 20);
        gradient.addColorStop(0, '#2a5a8a');
        gradient.addColorStop(0.5, '#3a7acc');
        gradient.addColorStop(1, '#1a4a7a');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(0, bodyY, 16, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(55, 196, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(-6, bodyY - 4, 5, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        this.renderLimbs(ctx, bodyY);
        this.renderCore(ctx, bodyY);
    }

    renderLimbs(ctx, bodyY) {
        const legPhase = this.walkCycle;
        const armPhase = this.walkCycle + Math.PI;

        const legOffsetL = Math.sin(legPhase) * 8 * this.walkSpeed;
        const legOffsetR = Math.sin(legPhase + Math.PI) * 8 * this.walkSpeed;
        const armOffsetL = Math.sin(armPhase) * 6 * this.walkSpeed;
        const armOffsetR = Math.sin(armPhase + Math.PI) * 6 * this.walkSpeed;

        ctx.strokeStyle = '#2a5a8a';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(-10, bodyY + 12);
        ctx.lineTo(-10 + legOffsetL * 0.5, bodyY + 24 + legOffsetL);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(10, bodyY + 12);
        ctx.lineTo(10 + legOffsetR * 0.5, bodyY + 24 + legOffsetR);
        ctx.stroke();

        ctx.strokeStyle = '#3a7acc';
        ctx.lineWidth = 5;

        ctx.beginPath();
        ctx.moveTo(-16, bodyY);
        ctx.lineTo(-20 + armOffsetL, bodyY + 8 + armOffsetL * 0.5);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(16, bodyY);
        ctx.lineTo(20 + armOffsetR, bodyY + 8 + armOffsetR * 0.5);
        ctx.stroke();
    }

    renderCore(ctx, bodyY) {
        const pulse = Math.sin(this.idleTime * 3) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(55, 196, 255, ${pulse * 0.6})`;
        ctx.beginPath();
        ctx.arc(0, bodyY - 2, 6 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('M', 0, bodyY - 1);
    }

    renderEyes(ctx) {
        const eyeY = -6 + (this.walkSpeed > 0.1 ? Math.sin(this.walkCycle * 2) * 1 : 0);
        const eyeOffset = this.direction === 'left' ? -3 : this.direction === 'right' ? 3 : 0;
        const eyeOffsetY = this.direction === 'up' ? -2 : this.direction === 'down' ? 2 : 0;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-7 + eyeOffset, eyeY + eyeOffsetY, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(7 + eyeOffset, eyeY + eyeOffsetY, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0a1f35';
        ctx.beginPath();
        ctx.arc(-7 + eyeOffset + (eyeOffset * 0.3), eyeY + eyeOffsetY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(7 + eyeOffset + (eyeOffset * 0.3), eyeY + eyeOffsetY, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(-7 + eyeOffset + 1.5, eyeY + eyeOffsetY - 1, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(7 + eyeOffset + 1.5, eyeY + eyeOffsetY - 1, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    renderDirectionIndicator(ctx) {
        if (this.walkSpeed < 0.1) return;

        const indicators = {
            up: { x: 0, y: -28, r: -Math.PI/2 },
            down: { x: 0, y: 32, r: Math.PI/2 },
            left: { x: -28, y: 0, r: Math.PI },
            right: { x: 28, y: 0, r: 0 }
        };
        const ind = indicators[this.direction];
        const pulse = Math.sin(this.time * 8) * 0.3 + 0.7;

        ctx.save();
        ctx.translate(ind.x, ind.y);
        ctx.rotate(ind.r);
        ctx.fillStyle = `rgba(55, 196, 255, ${pulse * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(0, -6 * pulse);
        ctx.lineTo(-5 * pulse, 4 * pulse);
        ctx.lineTo(5 * pulse, 4 * pulse);
        ctx.fill();
        ctx.restore();
    }
}