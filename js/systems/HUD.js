export class HUD {
    constructor() {
        this.score = 0;
        this.lives = 3;
        this.maxLives = 3;
        this.level = 1;
        this.victoryCallback = null;
        this.victoryVisible = false;
        this.gameOverVisible = false;
        this.victoryAnim = 0;
        this.time = 0;
        this.difficultyLabel = '';
        this.encounters = null;
        this.doorOpen = false;
    }

    reset(score, lives, maxLives, level) {
        this.score = score;
        this.lives = lives;
        this.maxLives = maxLives;
        this.level = level;
        this.victoryVisible = false;
        this.gameOverVisible = false;
        this.victoryAnim = 0;
        this.victoryButtonRect = null;
        this.gameOverButtonRect = null;
        this.finalStats = null;
    }

    update(score, lives, maxLives) {
        this.score = score;
        this.lives = lives;
        this.maxLives = maxLives;
    }

    setCampaignStatus(difficultyLabel, encounters, doorOpen, attackFx = null, bossDefeatFx = null) {
        this.difficultyLabel = difficultyLabel;
        this.encounters = encounters;
        this.doorOpen = doorOpen;
        this.attackFx = attackFx;
        this.bossDefeatFx = bossDefeatFx;
    }

    showVictory(score, lives, callback, stats = {}) {
        this.victoryVisible = true;
        this.gameOverVisible = false;
        this.victoryCallback = callback;
        this.victoryAnim = 0;
        this.finalScore = score;
        this.finalLives = lives;
        this.finalStats = stats;
        this.resultSelection = 0;
    }

    showGameOver(score) {
        this.gameOverVisible = true;
        this.victoryVisible = false;
        this.finalScore = score;
        this.gameOverButtonRect = null;
    }

    render(ctx) {
        this.time += 0.016;

        if (this.victoryVisible) {
            this.renderVictoryScreen(ctx);
            return;
        }

        if (this.gameOverVisible) {
            this.renderGameOverScreen(ctx);
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
        grad.addColorStop(0, 'rgba(29, 31, 31, 0.96)');
        grad.addColorStop(0.42, 'rgba(19, 28, 31, 0.93)');
        grad.addColorStop(1, 'rgba(9, 24, 32, 0.78)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, barHeight);

        ctx.strokeStyle = 'rgba(221, 176, 99, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, barHeight);
        ctx.lineTo(canvas.width, barHeight);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(76, 211, 229, 0.2)';
        ctx.beginPath();
        ctx.moveTo(0, barHeight - 2);
        ctx.lineTo(canvas.width, barHeight - 2);
        ctx.stroke();

        this.renderLevelBadge(ctx, padding, 12);
        this.renderLives(ctx, canvas.width / 2, 18);
        this.renderScore(ctx, canvas.width - padding - 60, 18);
        this.renderMuteButton(ctx, canvas.width - padding, 18);
        this.renderCampaignStatus(ctx);

        ctx.restore();
    }

    renderCampaignStatus(ctx) {
        const encounter = this.encounters;
        ctx.save();
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#d8b977';
        ctx.fillText(this.difficultyLabel, 150, 28);

        const abilities = [encounter?.shield ? 'ESCUDO ACTIVO' : null,
            encounter?.pulse ? 'PULSO LISTO' : null].filter(Boolean);
        const boss = this.doorOpen ? encounter?.boss : null;
        const visibleBossHealth = this.attackFx?.kind === 'boss' && this.attackFx.life > 0.3 ?
            this.attackFx.previousHealth : boss?.health;
        const visibleBossPhase = this.attackFx?.kind === 'boss' && this.attackFx.life > 0.3 ?
            this.attackFx.previousPhase : boss?.phase;
        let message = abilities.join('  •  ');
        if (visibleBossHealth > 0 || this.bossDefeatFx) {
            this.renderBossStatus(ctx, visibleBossHealth || 0, visibleBossPhase || 3, boss);
            ctx.restore();
            return;
        }
        else if (encounter?.sentinel?.alive && this.doorOpen) message = 'META SELLADA  •  DERROTA AL CENTINELA';
        else if (!message && encounter?.station && !encounter.station.used) message = 'BUSCA EL ARTEFACTO  •  ESPACIO / E';
        if (message) {
            ctx.fillStyle = 'rgba(5, 16, 26, .88)';
            ctx.fillRect(20, 500, 510, 28);
            ctx.strokeStyle = boss?.state === 'telegraph' ? '#ff9b65' : '#6a8490';
            ctx.strokeRect(20, 500, 510, 28);
            ctx.fillStyle = boss?.state === 'telegraph' ? '#ffb188' : '#d9e9ed';
            ctx.fillText(message, 33, 519);
        }
        ctx.restore();
    }

    renderBossStatus(ctx, health, phase, boss) {
        const x = 20, y = 480, w = 418, h = 50;
        ctx.fillStyle = 'rgba(7, 17, 25, .92)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = boss?.state === 'telegraph' ? '#efac77' : '#ba9560';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        ctx.fillStyle = '#e9c890';
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.fillText('GUARDIÁN DEL NÚCLEO', x + 12, y + 19);
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillStyle = this.bossDefeatFx ? '#91e5ef' : '#a9c9ce';
        ctx.fillText(this.bossDefeatFx ? 'NÚCLEO DESACTIVÁNDOSE' : `FASE ${phase} / 3`, x + 12, y + 38);
        for (let i = 0; i < 3; i++) {
            const sx = x + 245 + i * 53;
            ctx.fillStyle = i < health ? '#7cdae8' : '#273940';
            ctx.strokeStyle = i < health ? '#e5bd7d' : '#617078';
            ctx.beginPath();
            ctx.roundRect(sx, y + 18, 43, 15, 3);
            ctx.fill();
            ctx.stroke();
        }
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
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const w = canvas.width;
        const h = canvas.height;

        ctx.save();
        ctx.fillStyle = 'rgba(5, 15, 30, 0.9)';
        ctx.fillRect(0, 0, w, h);

        // Victory backdrop - soft gradient
        const backdropGrad = ctx.createRadialGradient(centerX, centerY * 0.3, 0, centerX, centerY * 0.3, Math.max(w, h));
        backdropGrad.addColorStop(0, 'rgba(10, 25, 50, 0.8)');
        backdropGrad.addColorStop(0.5, 'rgba(5, 15, 30, 0.9)');
        backdropGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        ctx.fillStyle = backdropGrad;
        ctx.fillRect(0, 0, w, h);

        // Victory glow - dorado core with cian aura
        const glowGrad = ctx.createRadialGradient(centerX, centerY * 0.5, 0, centerX, centerY * 0.5, Math.min(w, h) * 0.6);
        glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
        glowGrad.addColorStop(0.3, 'rgba(55, 196, 255, 0.15)');
        glowGrad.addColorStop(0.6, 'rgba(55, 196, 255, 0.05)');
        glowGrad.addColorStop(1, 'rgba(55, 196, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, w, h);

        // Celebratory particles - few golden cian mix
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + this.victoryAnim * 2;
            const distance = 80 + Math.sin(this.victoryAnim * 3 + i) * 20;
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = i % 2 === 0 ? '#ffd700' : '#50e3a0';
            ctx.beginPath();
            ctx.arc(centerX + Math.cos(angle) * distance, centerY * 0.5 + Math.sin(angle) * distance, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Title composition - dorado with cian accent
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 42px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#37c4ff';
        ctx.shadowBlur = 10;
        ctx.fillText('MATHQUEST', centerX, 92);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#e9f3f2';
        ctx.font = 'bold 22px "JetBrains Mono", monospace';
        ctx.fillText('ESCAPE COMPLETADO', centerX, 132);

        // Cian accent line under title
        ctx.strokeStyle = 'rgba(55, 196, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centerX - 180, 153);
        ctx.lineTo(centerX + 180, 153);
        ctx.stroke();

        const resultPanel = ctx.createLinearGradient(0, 165, 0, 370);
        resultPanel.addColorStop(0, 'rgba(30, 42, 43, .92)');
        resultPanel.addColorStop(1, 'rgba(9, 23, 31, .9)');
        ctx.fillStyle = resultPanel;
        ctx.strokeStyle = 'rgba(223, 178, 108, .72)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(centerX - 260, 166, 520, 202, 10);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(94, 210, 231, .38)';
        ctx.beginPath();
        ctx.moveTo(centerX - 230, 277);
        ctx.lineTo(centerX + 230, 277);
        ctx.stroke();

        const stats = this.finalStats || {};
        const rank = stats.accuracy >= 90 ? 'GUARDIÁN DE LA LÓGICA' :
            stats.accuracy >= 70 ? 'MAESTRO DEL TEMPLO' : 'EXPLORADOR MATEMÁTICO';
        ctx.fillStyle = '#e5bb7b';
        ctx.font = 'bold 15px "JetBrains Mono", monospace';
        ctx.fillText(rank, centerX, 183);
        ctx.fillStyle = '#f3f0e7';
        ctx.font = 'bold 34px "JetBrains Mono", monospace';
        ctx.fillText(this.finalScore.toLocaleString(), centerX, 238);
        ctx.fillStyle = '#9ec6ce';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText('PUNTOS', centerX, 262);
        ctx.fillStyle = '#e9f3f2';
        ctx.font = 'bold 15px "JetBrains Mono", monospace';
        ctx.fillText(`${stats.difficulty || 'AVENTURERO'}   •   PRECISIÓN ${stats.accuracy ?? 0}%`, centerX, 307);
        const minutes = Math.floor((stats.seconds || 0) / 60);
        const seconds = String((stats.seconds || 0) % 60).padStart(2, '0');
        ctx.fillText(`TIEMPO ${minutes}:${seconds}   •   COMBO MÁX. x${stats.maxCombo || 1}   •   VIDAS ${this.finalLives}`, centerX, 336);

        // JUGAR DE NUEVO button with stronger design
        const buttonY = 397;
        const buttonW = 250;
        const buttonH = 50;
        const buttonX = centerX - buttonW - 12;
        const borderAlpha = 0.5 + Math.sin(this.victoryAnim * 3) * 0.3;

        // Button background with dorado gradient
        const buttonGrad = ctx.createLinearGradient(buttonX, 0, buttonX + buttonW, 0);
        buttonGrad.addColorStop(0, 'rgba(255, 203, 106, 0.2)');
        buttonGrad.addColorStop(0.5, 'rgba(255, 203, 106, 0.1)');
        buttonGrad.addColorStop(1, 'rgba(255, 203, 106, 0.2)');

        ctx.fillStyle = buttonGrad;
        ctx.strokeStyle = `rgba(255, 203, 106, ${borderAlpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(buttonX, buttonY, buttonW, buttonH, 12);
        ctx.fill();
        ctx.stroke();

        // Button inner glow
        ctx.fillStyle = `rgba(255, 203, 106, ${borderAlpha * 0.4})`;
        ctx.beginPath();
        ctx.roundRect(buttonX + 4, buttonY + 4, buttonW - 8, buttonH - 8, 8);
        ctx.fill();

        // Button text - cian
        ctx.fillStyle = '#37c4ff';
        ctx.font = 'bold 20px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('REINTENTAR', buttonX + buttonW / 2, buttonY + buttonH/2 + 4);
        const homeX = centerX + 12;
        ctx.fillStyle = 'rgba(55,196,255,.12)';
        ctx.strokeStyle = this.resultSelection === 1 ? '#37c4ff' : 'rgba(55,196,255,.45)';
        ctx.beginPath(); ctx.roundRect(homeX, buttonY, buttonW, buttonH, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e5bb7b';
        ctx.fillText('VOLVER AL INICIO', homeX + buttonW / 2, buttonY + buttonH/2 + 4);
        if (this.resultSelection === 0) {
            ctx.strokeStyle = '#ffd070'; ctx.lineWidth = 3;
            ctx.strokeRect(buttonX - 3, buttonY - 3, buttonW + 6, buttonH + 6);
        }
        this.victoryButtonRect = { x: buttonX, y: buttonY, w: buttonW * 2 + 24, h: buttonH };

        ctx.restore();
    }

    renderGameOverScreen(ctx) {
        const { width, height } = ctx.canvas;
        const centerX = width / 2;
        const centerY = height / 2;
        const buttonW = 280;
        const buttonH = 50;
        const buttonX = centerX - buttonW / 2;
        const buttonY = centerY + 90;

        ctx.save();
        ctx.fillStyle = 'rgba(5, 10, 18, 0.94)';
        ctx.fillRect(0, 0, width, height);

        const glow = ctx.createRadialGradient(centerX, centerY - 50, 0, centerX, centerY - 50, 260);
        glow.addColorStop(0, 'rgba(255, 107, 107, 0.18)');
        glow.addColorStop(1, 'rgba(255, 107, 107, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ff6b6b';
        ctx.font = 'bold 52px "JetBrains Mono", monospace';
        ctx.fillText('GAME OVER', centerX, centerY - 70);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 38px "JetBrains Mono", monospace';
        ctx.fillText(this.finalScore.toLocaleString(), centerX, centerY + 5);
        ctx.fillStyle = '#92a9c0';
        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.fillText('PUNTOS', centerX, centerY + 38);

        ctx.fillStyle = 'rgba(255, 107, 107, 0.12)';
        ctx.strokeStyle = 'rgba(255, 107, 107, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(buttonX, buttonY, buttonW, buttonH, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px "JetBrains Mono", monospace';
        ctx.fillText('JUGAR DE NUEVO', centerX, buttonY + buttonH / 2 + 2);
        ctx.restore();

        this.gameOverButtonRect = { x: buttonX, y: buttonY, w: buttonW, h: buttonH };
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

    checkGameOverClick(x, y) {
        if (!this.gameOverVisible || !this.gameOverButtonRect) return false;
        const rect = this.gameOverButtonRect;
        return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    }
}
