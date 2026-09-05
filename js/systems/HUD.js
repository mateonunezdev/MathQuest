export class HUD {
    constructor() {
        this.score = 0;
        this.lives = 3;
        this.maxLives = 3;
        this.level = 1;
        this.victoryCallback = null;
        this.victoryVisible = false;
        this.victoryAnim = 0;
        this.time = 0;
    }

    reset(score, lives, maxLives, level) {
        this.score = score;
        this.lives = lives;
        this.maxLives = maxLives;
        this.level = level;
        this.victoryVisible = false;
        this.victoryAnim = 0;
    }

    update(score, lives, maxLives) {
        this.score = score;
        this.lives = lives;
        this.maxLives = maxLives;
    }

    showVictory(score, lives, callback) {
        this.victoryVisible = true;
        this.victoryCallback = callback;
        this.victoryAnim = 0;
        this.finalScore = score;
        this.finalLives = lives;
    }

    render(ctx) {
        this.time += 0.016;

        if (this.victoryVisible) {
            this.renderVictoryScreen(ctx);
            return;
        }

        this.renderTopBar(ctx);
    }

    renderTopBar(ctx) {
        const canvas = ctx.canvas;
        const padding = 20;

        ctx.save();

        const barHeight = 70;
        const grad = ctx.createLinearGradient(0, 0, 0, barHeight);
        grad.addColorStop(0, 'rgba(7, 18, 28, 0.95)');
        grad.addColorStop(1, 'rgba(7, 18, 28, 0.7)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, barHeight);

        ctx.strokeStyle = 'rgba(55, 196, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, barHeight);
        ctx.lineTo(canvas.width, barHeight);
        ctx.stroke();

        this.renderLevelBadge(ctx, padding, 12);
        this.renderLives(ctx, canvas.width / 2, 18);
        this.renderScore(ctx, canvas.width - padding - 60, 18);
        this.renderMuteButton(ctx, canvas.width - padding, 18);

        ctx.restore();
    }

    renderMuteButton(ctx, rightX, y) {
        const isMuted = window.game?.audio?.muted || false;
        const centerX = rightX - 20;
        
        ctx.save();
        ctx.translate(centerX, y);
        
        // Button background
        ctx.fillStyle = 'rgba(10, 21, 35, 0.8)';
        ctx.strokeStyle = 'rgba(55, 196, 255, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Icon
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isMuted ? '🔇' : '🔊', 0, 2);
        
        ctx.restore();
        
        // Store rect for click detection
        this.muteButtonRect = {
            x: rightX - 42,
            y: y - 22,
            w: 44,
            h: 44
        };
    }

    checkMuteClick(x, y) {
        if (!this.muteButtonRect) return false;
        const rect = this.muteButtonRect;
        return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    }

    renderLevelBadge(ctx, x, y) {
        const pulse = Math.sin(this.time * 2) * 0.1 + 0.9;

        ctx.fillStyle = 'rgba(55, 196, 255, 0.15)';
        ctx.strokeStyle = `rgba(55, 196, 255, ${0.4 * pulse})`;
        ctx.lineWidth = 2;
        const badgeW = 110;
        ctx.beginPath();
        ctx.roundRect(x, y, badgeW, 40, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#37c4ff';
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('NIVEL', x + 12, y + 14);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px "JetBrains Mono", monospace';
        ctx.fillText(this.level.toString(), x + 12, y + 34);
    }

    renderLives(ctx, centerX, y) {
        const heartSize = 22;
        const spacing = 28;
        const startX = centerX - (this.maxLives * spacing) / 2;

        for (let i = 0; i < this.maxLives; i++) {
            const hx = startX + i * spacing;
            const alive = i < this.lives;
            const pulse = alive && i === this.lives - 1 ? Math.sin(this.time * 4) * 0.15 + 1 : 1;

            ctx.save();
            ctx.translate(hx, y);
            ctx.scale(pulse, pulse);

            this.renderHeart(ctx, alive);
            ctx.restore();
        }
    }

    renderHeart(ctx, alive) {
        if (alive) {
            const grad = ctx.createRadialGradient(-4, -4, 0, -4, -4, 14);
            grad.addColorStop(0, '#ff6b9d');
            grad.addColorStop(1, '#c0392b');
            ctx.fillStyle = grad;
            ctx.shadowColor = '#ff6b9d';
            ctx.shadowBlur = 8;
        } else {
            ctx.fillStyle = 'rgba(60, 30, 40, 0.6)';
            ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.moveTo(0, 6);
        ctx.bezierCurveTo(0, 0, -10, 0, -10, -6);
        ctx.bezierCurveTo(-10, -12, -4, -12, -4, -6);
        ctx.bezierCurveTo(-4, -12, 4, -12, 4, -6);
        ctx.bezierCurveTo(4, -12, 10, -12, 10, -6);
        ctx.bezierCurveTo(10, 0, 0, 0, 0, 6);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    renderScore(ctx, rightX, y) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('PUNTOS', rightX - 100, y);

        const scoreStr = this.score.toLocaleString();
        ctx.font = 'bold 22px "JetBrains Mono", monospace';
        ctx.fillStyle = '#37c4ff';
        ctx.fillText(scoreStr, rightX, y + 18);

        ctx.strokeStyle = 'rgba(55, 196, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rightX - 140, y + 32);
        ctx.lineTo(rightX, y + 32);
        ctx.stroke();
    }

    renderVictoryScreen(ctx) {
        const canvas = ctx.canvas;
        this.victoryAnim = Math.min(1, this.victoryAnim + 0.02);

        ctx.save();

        ctx.fillStyle = `rgba(7, 18, 28, ${0.9 * this.victoryAnim})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const progress = this.easeOutBack(this.victoryAnim);

        ctx.translate(centerX, centerY);
        ctx.scale(progress, progress);

        this.renderVictoryCore(ctx);
        this.renderVictoryText(ctx);
        this.renderVictoryStats(ctx);
        this.renderVictoryButton(ctx);

        ctx.restore();
    }

    renderVictoryCore(ctx) {
        const pulse = Math.sin(this.time * 4) * 0.2 + 1;

        for (let i = 3; i >= 0; i--) {
            const r = 60 + i * 20 + Math.sin(this.time * 2 + i) * 5;
            ctx.strokeStyle = `rgba(${i === 0 ? '255, 215, 0' : '55, 196, 255'}, ${0.3 - i * 0.05})`;
            ctx.lineWidth = i === 0 ? 3 : 1;
            ctx.setLineDash([15, 10]);
            ctx.lineDashOffset = -this.time * 30;
            ctx.beginPath();
            ctx.arc(0, -60, r, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.setLineDash([]);

        const coreGrad = ctx.createRadialGradient(0, -60, 0, 0, -60, 50);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.5, '#ffd700');
        coreGrad.addColorStop(1, '#ff8800');
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(0, -60, 40 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#0a1520';
        ctx.font = 'bold 32px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('∑', 0, -58);
    }

    renderVictoryText(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('NIVEL 1 COMPLETADO', 0, 30);

        ctx.fillStyle = '#37c4ff';
        ctx.font = '16px "JetBrains Mono", monospace';
        ctx.fillText('ESCAPE MATEMÁTICO', 0, 60);
    }

    renderVictoryStats(ctx) {
        const stats = [
            { label: 'PUNTUACIÓN', value: this.finalScore.toLocaleString(), color: '#37c4ff' },
            { label: 'VIDAS RESTANTES', value: '❤️'.repeat(this.finalLives) + '🖤'.repeat(3 - this.finalLives), color: '#ff6b9d' }
        ];

        stats.forEach((stat, i) => {
            const y = 100 + i * 50;

            ctx.fillStyle = 'rgba(55, 196, 255, 0.1)';
            ctx.strokeStyle = `rgba(55, 196, 255, ${0.3 * this.victoryAnim})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(-120, y - 20, 240, 40, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#92a9c0';
            ctx.font = '12px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(stat.label, 0, y - 8);

            ctx.fillStyle = stat.color;
            ctx.font = 'bold 20px "JetBrains Mono", monospace';
            ctx.fillText(stat.value, 0, y + 14);
        });
    }

renderVictoryButton(ctx) {
        // Contexto ya tiene translate/scale de renderVictoryScreen
        // Usar coordenadas LOCALES (relativas al origen traducido)
        ctx.fillStyle = 'rgba(55, 196, 255, 0.2)';
        ctx.strokeStyle = '#37c4ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-100, 20, 200, 45, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('JUGAR DE NUEVO', 0, 20 + 2);

        // victoriaButtonRect en COORDENADAS GLOBALES del canvas
        // El rectángulo está posicionado en local (-100, 20) después del translate/scale
        // Global: centerX + localX = canvasWidth/2 + localX
        //          centerY + localY = canvasHeight/2 + localY
        this.victoryButtonRect = {
            x: canvas.width / 2 - 100,
            y: canvas.height / 2 + 20,
            w: 200,
            h: 45
        };
    }

    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    checkVictoryClick(x, y) {
        if (!this.victoryVisible || !this.victoryButtonRect) return false;
        const rect = this.victoryButtonRect;
        return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    }
}