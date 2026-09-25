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
            this.bobOffset = Math.sin(this.walkCycle * 2) * 2.4 * this.walkSpeed;
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
        if (this.invulnerable > 0 && Math.sin(this.flashTime) > 0) return;

        const motion = this.walkSpeed > 0.1 ? 'walk' : 'idle';
        const sprite = renderer.artAssets?.get('player', `${motion}-${this.direction}`);
        if (renderer.artAssets?.image(sprite)) {
            const feetX = this.x + this.tileSize / 2;
            const feetY = this.y + this.tileSize;
            ctx.save();
            ctx.translate(this.x + this.tileSize / 2, this.y + this.tileSize / 2);
            this.renderShadow(ctx);
            ctx.restore();
            ctx.save();
            ctx.translate(feetX, feetY + this.bobOffset);
            ctx.rotate(Math.sin(this.walkCycle) * this.walkSpeed * 0.035);
            if (this.direction === 'left' || this.direction === 'right') {
                ctx.transform(0.96, 0, this.direction === 'left' ? -0.055 : 0.055, 1, 0, 0);
            }
            ctx.shadowColor = renderer.levelNumber === 2 ? 'rgba(255, 216, 144, .35)' : 'rgba(88, 216, 234, .34)';
            ctx.shadowBlur = 7 + this.walkSpeed * 3;
            renderer.artAssets.draw(ctx, sprite, 0, 0, this.time);
            ctx.restore();
            return;
        }

        ctx.save();
        ctx.translate(this.x + this.tileSize / 2, this.y + this.tileSize / 2);
        ctx.translate(0, 6);
        ctx.scale(1.34, 1.34);
        this.renderShadow(ctx);
        ctx.translate(0, this.bobOffset);
        this.renderCharacter(ctx);
        ctx.restore();
    }

    renderShadow(ctx) {
        ctx.fillStyle = `rgba(0,0,0,${0.55 - this.walkSpeed * 0.09})`;
        ctx.beginPath();
        ctx.ellipse(0, 23, 19 + this.walkSpeed * 2, 6 - this.walkSpeed,
            0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(64, 206, 230, 0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 23, 21, 7, 0, 0, Math.PI * 2);
        ctx.stroke();
    }

    renderCharacter(ctx) {
        const stride = Math.sin(this.walkCycle) * this.walkSpeed;
        const pulse = 0.8 + Math.sin(this.time * 3.5) * 0.2;
        const facing = this.direction === 'left' ? -1 : this.direction === 'right' ? 1 : 0;
        const facingUp = this.direction === 'up';

        // A split travel cloak trails behind the steps without affecting the hitbox.
        const sway = Math.sin(this.walkCycle) * this.walkSpeed * 3;
        ctx.fillStyle = '#183746';
        ctx.strokeStyle = '#be965a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-12, -12);
        ctx.lineTo(10, -11);
        ctx.lineTo(18 - sway, 22);
        ctx.lineTo(3, 17);
        ctx.lineTo(-11 - sway, 26);
        ctx.lineTo(-18, 12);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Ancient field device and warm brass shoulder pins sit behind the cloak.
        ctx.fillStyle = '#112a35';
        ctx.strokeStyle = '#c49c60';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(facing < 0 ? 9 : -19, -14, 10, 29, 4);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#78d5df';
        ctx.fillRect(facing < 0 ? 12 : -16, -9, 4, 12);

        // Boots and shoulder guards give the explorer a readable silhouette.
        ctx.fillStyle = '#09141e';
        ctx.strokeStyle = '#537484';
        ctx.lineWidth = 1.5;
        for (const side of [-1, 1]) {
            const step = side * stride * 3;
            ctx.beginPath();
            ctx.roundRect(side * 8 - 5 + step, 11, 10, 14, 3);
            ctx.fill(); ctx.stroke();
        }

        const cloak = ctx.createLinearGradient(-15, -14, 16, 20);
        cloak.addColorStop(0, '#527280');
        cloak.addColorStop(0.3, '#284353');
        cloak.addColorStop(1, '#0a1a27');
        ctx.fillStyle = cloak;
        ctx.strokeStyle = '#82acb2';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-13, -12);
        ctx.lineTo(13, -12);
        ctx.lineTo(16, 17);
        ctx.lineTo(4, 20);
        ctx.lineTo(-15, 17);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        for (const side of [-1, 1]) {
            ctx.fillStyle = '#728d91';
            ctx.beginPath();
            ctx.moveTo(side * 10, -12);
            ctx.lineTo(side * 18, -7);
            ctx.lineTo(side * 16, 2 + side * stride * 3);
            ctx.lineTo(side * 11, 4);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#d2a85c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(side * 13, -7);
            ctx.lineTo(side * 17, -5);
            ctx.stroke();
            ctx.fillStyle = '#b79c6b';
            ctx.beginPath();
            ctx.roundRect(side * 17 - 3, 2 + side * stride * 3, 6, 8, 2);
            ctx.fill();
        }

        // Helmet is a single strong shape; the visor moves with facing.
        const helmet = ctx.createLinearGradient(-13, -32, 12, -13);
        helmet.addColorStop(0, '#7897a0');
        helmet.addColorStop(0.42, '#365665');
        helmet.addColorStop(1, '#142a39');
        ctx.fillStyle = helmet;
        ctx.strokeStyle = '#a7c7c7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-12, -18);
        ctx.lineTo(-11, -27);
        ctx.quadraticCurveTo(0, -36, 11, -27);
        ctx.lineTo(12, -18);
        ctx.quadraticCurveTo(0, -11, -12, -18);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#b28c4d';
        ctx.fillRect(-3, -32, 6, 3);

        if (!facingUp) {
            ctx.fillStyle = '#071c2a';
            ctx.beginPath();
            ctx.roundRect(-9 + facing * 2, -24, 18, 9, 4);
            ctx.fill();
            ctx.fillStyle = `rgba(115,235,250,${pulse})`;
            ctx.shadowColor = '#42c9e7';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.roundRect(-7 + facing * 2, -22, 14, 5, 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        } else {
            ctx.strokeStyle = '#4bb9cf';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-6, -20); ctx.lineTo(6, -20); ctx.stroke();
        }

        ctx.strokeStyle = '#d0aa64';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 8); ctx.lineTo(10, 8);
        ctx.stroke();
        ctx.fillStyle = '#0a2633';
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#d6b676';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = `rgba(252,217,150,${pulse})`;
        ctx.shadowColor = '#efb963';
        ctx.shadowBlur = 11;
        ctx.beginPath();
        ctx.moveTo(0, -5); ctx.lineTo(5, 0); ctx.lineTo(0, 5); ctx.lineTo(-5, 0); ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}
