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
        this.time = 0;
    }

    update(dt, input) {
        this.time += dt;
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
            this.bobOffset = Math.sin(this.walkCycle * 2) * 1.5 * this.walkSpeed;
        } else {
            this.vx = 0;
            this.vy = 0;
            this.walkSpeed = Math.max(this.walkSpeed - dt * 8, 0);
            this.idleTime += dt;
            this.bobOffset = Math.sin(this.idleTime * 2) * 1.5;
            if (this.walkSpeed < 0.05) this.walkCycle = 0;
        }

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

        // Shadow beneath player (subtle ellipse)
        this.renderShadow(ctx);

        // Character body with directional features
        this.renderCharacter(ctx);

        // Direction indicator (arrow/chevron forward)
        this.renderDirectionIndicator(ctx);

        ctx.restore();
    }

    renderShadow(ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 20, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    renderCharacter(ctx) {
        const walkBob = Math.sin(this.walkCycle * 2) * 1.5 * this.walkSpeed;
        const idleBob = Math.sin(this.idleTime * 2.5) * 1.2;
        const bodyY = walkBob + (this.walkSpeed < 0.1 ? idleBob : 0);

        // Torso - rounded rectangle with gradient
        const torsoGrad = ctx.createLinearGradient(-12, -12 + walkBob, 12, 16 + bodyY);
        torsoGrad.addColorStop(0, '#4a6a8e');
        torsoGrad.addColorStop(0.5, '#3a5a7e');
        torsoGrad.addColorStop(1, '#2a4a6e');
        ctx.fillStyle = torsoGrad;
        ctx.beginPath();
        ctx.roundRect(-10, -12 + walkBob, 20, 26, 5);
        ctx.fill();

        // Belt/straps detail
        ctx.strokeStyle = 'rgba(200, 220, 240, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, -4 + walkBob);
        ctx.lineTo(8, -4 + walkBob);
        ctx.stroke();

        // Head/Helmet - dome above torso
        const headBaseY = -14 + walkBob;
        ctx.fillStyle = '#2a4a6e';
        ctx.beginPath();
        ctx.ellipse(0, headBaseY, 11, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Helmet visor (glowing area for face)
        const visorGrad = ctx.createRadialGradient(0, headBaseY - 1, 0, 0, headBaseY - 1, 10);
        visorGrad.addColorStop(0, 'rgba(80, 220, 255, 0.4)');
        visorGrad.addColorStop(0.5, 'rgba(80, 220, 255, 0.15)');
        visorGrad.addColorStop(1, 'rgba(80, 220, 255, 0)');
        ctx.fillStyle = visorGrad;
        ctx.beginPath();
        ctx.ellipse(0, headBaseY - 2, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Helmet rim
        ctx.strokeStyle = 'rgba(80, 180, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, headBaseY - 2, 10, 0, Math.PI * 2);
        ctx.stroke();

        // Eye dots that follow direction
        const eyeY = headBaseY - 3;
        const eyeOffset = this.direction === 'left' ? -3 : this.direction === 'right' ? 3 : 0;
        const eyeOffsetY = this.direction === 'up' ? -2 : 0;
        
        ctx.fillStyle = this.direction === 'down' ? 'rgba(55, 196, 255, 0.9)' : '#8aacc8';
        const eyeSize = this.direction === 'down' ? 2 : this.direction === 'left' || this.direction === 'right' ? 3 : 2;
        
        ctx.beginPath();
        ctx.arc(-5 + eyeOffset, eyeY + eyeOffsetY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5 + eyeOffset, eyeY + eyeOffsetY, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        // Eye shine (small white highlight)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(-5 + eyeOffset, eyeY + eyeOffsetY - 1, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5 + eyeOffset, eyeY + eyeOffsetY - 1, 1, 0, Math.PI * 2);
        ctx.fill();

        // Energy core in center of body
        const coreY = -2 + bodyY;
        const corePulse = Math.sin(this.time * 4) * 0.3 + 0.7;
        const coreSize = 5 * corePulse;
        
        ctx.fillStyle = `rgba(80, 220, 255, ${corePulse * 0.6})`;
        ctx.beginPath();
        ctx.arc(0, coreY, coreSize, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `rgba(80, 220, 255, ${corePulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, coreY, coreSize * 2, 0, Math.PI * 2);
        ctx.fill();

        // Arms - animated based on walk cycle
        this.renderArms(ctx, walkBob);

        // Legs - animated walking
        this.renderLegs(ctx, walkBob);
    }

    renderArms(ctx, bodyY) {
        const armSpacing = 14;
        const armPhase = this.walkCycle + Math.PI;
        const armOffsetL = Math.sin(armPhase) * 4 * this.walkSpeed;
        const armOffsetR = Math.sin(armPhase + Math.PI) * 4 * this.walkSpeed;
        const armYOffset = -4 + bodyY;

        // Left arm
        ctx.strokeStyle = '#3a5a7e';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-armSpacing, armYOffset);
        ctx.lineTo(-armSpacing + armOffsetL * 0.8, armYOffset + 9);
        ctx.stroke();

        // Right arm
        ctx.beginPath();
        ctx.moveTo(armSpacing, armYOffset);
        ctx.lineTo(armSpacing + armOffsetR * 0.8, armYOffset + 9);
        ctx.stroke();
    }

    renderLegs(ctx, bodyY) {
        const legSpacing = 8;
        const legYOffset = 24 + bodyY;
        const legPhase = this.walkCycle;
        const legOffsetL = Math.sin(legPhase) * 4 * this.walkSpeed;
        const legOffsetR = Math.sin(legPhase + Math.PI) * 4 * this.walkSpeed;

        // Left leg
        ctx.strokeStyle = '#2a4a6e';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-legSpacing, legYOffset);
        ctx.lineTo(-legSpacing + legOffsetL * 0.6, legYOffset - 11);
        ctx.stroke();

        // Right leg
        ctx.beginPath();
        ctx.moveTo(legSpacing, legYOffset);
        ctx.lineTo(legSpacing + legOffsetR * 0.6, legYOffset - 11);
        ctx.stroke();
    }

    renderDirectionIndicator(ctx) {
        if (this.walkSpeed < 0.1) return;

        const indicators = {
            up: { x: 0, y: -38, r: -Math.PI/2 },
            down: { x: 0, y: 42, r: Math.PI/2 },
            left: { x: -38, y: 0, r: Math.PI },
            right: { x: 38, y: 0, r: 0 }
        };
        const ind = indicators[this.direction];
        const pulse = Math.sin(this.time * 8) * 0.3 + 0.7;

        ctx.save();
        ctx.translate(ind.x, ind.y);
        ctx.rotate(ind.r);
        ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.beginPath();
        ctx.moveTo(0, -4 * pulse);
        ctx.lineTo(-4 * pulse, 3 * pulse);
        ctx.lineTo(4 * pulse, 3 * pulse);
        ctx.fill();
        ctx.restore();
    }
}
