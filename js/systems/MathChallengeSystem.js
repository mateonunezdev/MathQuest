import { ChallengeBank } from '../levels/ChallengeBank.js';

export class MathChallengeSystem {
    constructor() {
        this.active = false;
        this.callback = null;
        this.challengeData = null;
        this.selectedAnswer = null;
        this.feedback = '';
        this.feedbackType = '';
        this.animTime = 0;
        this.resultTimer = 0;
        this.closeDelay = 0;
        this.closeTimer = null;
        this.particles = [];
        this.remainingSeconds = 0;
    }

    open(level, difficulty, challengeRef, callback, rules = {}) {
        this.challengeData = ChallengeBank.resolve(level, difficulty, challengeRef);
        if (!this.challengeData) {
            throw new Error(`No challenge for level=${level}, difficulty=${difficulty}, ref=${challengeRef}`);
        }
        this.callback = callback;
        this.active = true;
        this.selectedAnswer = null;
        this.feedback = '';
        this.feedbackType = '';
        this.animTime = 0;
        this.particles = [];
        this.remainingSeconds = rules.answerSeconds || 0;
        this.contextLabel = rules.contextLabel || 'SISTEMA DE ACCESO // PUERTA PRINCIPAL';
        this.successText = rules.successText || '✓ ACCESO CONCEDIDO';
        this.failureText = rules.failureText || '✗ ACCESO DENEGADO';

        // Spawn entrance particles
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: 480 + (Math.random() - 0.5) * 200,
                y: 270 + (Math.random() - 0.5) * 150,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100 - 50,
                life: 1.5,
                maxLife: 1.5,
                color: '#37c4ff',
                size: 2 + Math.random() * 4
            });
        }
    }

    update(dt) {
        this.animTime = Math.min(1, this.animTime + dt * 3);
        if (this.active && !this.selectedAnswer && this.remainingSeconds > 0) {
            this.remainingSeconds = Math.max(0, this.remainingSeconds - dt);
            if (this.remainingSeconds === 0) this.submitAnswer('TIME');
        }
        
        // Update particles
        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 30 * dt;
            p.life -= dt;
        });
        this.particles = this.particles.filter(p => p.life > 0);

        if (this.selectedAnswer) {
            this.resultTimer += dt;
        }

        const answerKey = window.game?.input?.getAnswerKey?.();
        if (answerKey) this.submitAnswer(answerKey);
    }

    submitAnswer(letter) {
        if (!this.active || this.selectedAnswer) return;

        this.selectedAnswer = letter;
        const correct = letter === this.challengeData.correct;
        this.resultTimer = 0;
        this.closeDelay = correct ? 1 : 0.8;

        if (correct) {
            this.feedback = this.successText;
            this.feedbackType = 'success';
            // Success particles - dorado/cian mix
            for (let i = 0; i < 40; i++) {
                this.particles.push({
                    x: 480 + (Math.random() - 0.5) * 300,
                    y: 270 + (Math.random() - 0.5) * 200,
                    vx: (Math.random() - 0.5) * 300,
                    vy: (Math.random() - 0.5) * 300 - 100,
                    life: 2,
                    maxLife: 2,
                    color: i % 2 === 0 ? '#ffd700' : '#50e3a0',
                    size: 3 + Math.random() * 5
                });
            }
        } else {
            this.feedback = letter === 'TIME' ? '✗ TIEMPO AGOTADO' : this.failureText;
            this.feedbackType = 'error';
            // Error particles - only red on selected, NO green on correct
            for (let i = 0; i < 20; i++) {
                this.particles.push({
                    x: 480 + (Math.random() - 0.5) * 200,
                    y: 270 + (Math.random() - 0.5) * 150,
                    vx: (Math.random() - 0.5) * 200,
                    vy: (Math.random() - 0.5) * 200 - 50,
                    life: 1.5,
                    maxLife: 1.5,
                    color: '#ff6b6b',
                    size: 3 + Math.random() * 4
                });
            }
        }

        this.closeTimer = setTimeout(() => {
            this.close(correct);
        }, this.closeDelay * 1000);
    }

    close(correct) {
        this.closeTimer = null;
        this.active = false;
        if (this.callback) this.callback(correct);
        this.callback = null;
    }

    reset() {
        if (this.closeTimer) clearTimeout(this.closeTimer);
        this.closeTimer = null;
        this.active = false;
        this.callback = null;
        this.challengeData = null;
        this.selectedAnswer = null;
        this.feedback = '';
        this.feedbackType = '';
        this.particles = [];
        this.remainingSeconds = 0;
    }

    render(ctx) {
        if (!this.active) return;

        const canvas = ctx.canvas;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const progress = this.animTime;

        ctx.save();

        // Subtle world-textured background
        ctx.fillStyle = 'rgba(5, 15, 30, 0.55)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Subtle scanlines
        ctx.strokeStyle = `rgba(55, 196, 255, 0.02)`;
        ctx.lineWidth = 1;
        for (let y = 0; y < 540; y += 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(960, y);
            ctx.stroke();
        }

        // Main holographic panel with diffraction grating effect
        const panelW = 700;
        const panelH = 420;
        const panelX = centerX - panelW / 2;
        const panelY = centerY - panelH / 2;

        // Holographic diffraction background - subtle color fringe
        for (let i = 0; i < 3; i++) {
            const offset = i * 2;
            const hue = i === 0 ? 195 : i === 1 ? 180 : 210;
            const grad = ctx.createLinearGradient(panelX - 50 + offset, panelY - 50, panelX + panelW + 50 - offset, panelY - 50);
            grad.addColorStop(0, `hsla(${hue}, 80%, 30%, 0.1)`);
            grad.addColorStop(1, `hsla(${hue}, 80%, 30%, 0)`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(panelX - 50 + offset, panelY - 50);
            ctx.lineTo(panelX + panelW + 50 - offset, panelY - 50);
            ctx.stroke();
        }

        // Panel glow - dorado core with cian edge (progress-faded, stronger)
        const glowGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 400);
        glowGrad.addColorStop(0, `rgba(255, 203, 106, ${0.15 * progress})`);
        glowGrad.addColorStop(0.5, `rgba(55, 196, 255, ${0.12 * progress})`);
        glowGrad.addColorStop(1, 'rgba(55, 196, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(panelX - 50, panelY - 50, panelW + 100, panelH + 100);

        // Panel background - navy tech base with subtle grid (progress-faded)
        const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
        panelGrad.addColorStop(0, `rgba(8, 18, 30, ${0.98 * progress})`);
        panelGrad.addColorStop(0.5, `rgba(6, 12, 22, ${0.95 * progress})`);
        panelGrad.addColorStop(1, `rgba(4, 8, 15, ${0.97 * progress})`);
        ctx.fillStyle = panelGrad;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 20);
        ctx.fill();

        // Subtle grid pattern on panel (holographic texture)
        ctx.strokeStyle = `rgba(55, 196, 255, ${0.04 * progress})`;
        ctx.lineWidth = 0.5;
        for (let i = 0; i < panelW; i += 40) {
            ctx.beginPath();
            ctx.moveTo(panelX + i, panelY);
            ctx.lineTo(panelX + i, panelY + panelH);
            ctx.stroke();
        }
        for (let i = 0; i < panelH; i += 40) {
            ctx.beginPath();
            ctx.moveTo(panelX, panelY + i);
            ctx.lineTo(panelX + panelW, panelY + i);
            ctx.stroke();
        }

        // Border - cian controlled with accent (progress-faded, stronger)
        ctx.strokeStyle = `rgba(55, 196, 255, ${0.4 * progress})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 20);
        ctx.stroke();

        // Double border for depth
        ctx.strokeStyle = `rgba(55, 196, 255, ${0.2 * progress})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(panelX + 3, panelY + 3, panelW - 6, panelH - 6, 17);
        ctx.stroke();

        const art = window.game?.artAssets;
        const plate = art?.get('ui', 'challenge');
        if (art?.image(plate)) {
            ctx.globalAlpha = progress;
            art.draw(ctx, plate, centerX, centerY);
            ctx.globalAlpha = 1;
        }

        // Entrance sparks belong behind the question and answer labels.
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life / p.maxLife * progress * 0.24;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.min(p.size, 3), 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Header
        const headerY = panelY + 80;
        ctx.fillStyle = `rgba(255, 203, 106, ${0.2 * progress})`;
        ctx.fillRect(panelX + 20, headerY - 10, panelW - 40, 2);

        // Title
        ctx.fillStyle = `rgba(55, 196, 255, ${progress})`;
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.contextLabel, centerX, headerY + 10);

        // Skill tag
        if (this.challengeData && !this.feedback) {
            ctx.fillStyle = `rgba(80, 227, 160, ${0.8 * progress})`;
            ctx.font = '11px "JetBrains Mono", monospace';
            ctx.fillText(`HABILIDAD: ${this.challengeData.skill}`, centerX, headerY + 30);
        }
        if (this.remainingSeconds > 0 && !this.selectedAnswer) {
            ctx.fillStyle = this.remainingSeconds < 6 ? '#ffb579' : '#d7e7ed';
            ctx.font = 'bold 14px "JetBrains Mono", monospace';
            ctx.fillText(`${Math.ceil(this.remainingSeconds)} s`, panelX + panelW - 50, headerY + 30);
        }

        // Question
        const questionY = centerY - 40;
        ctx.fillStyle = `rgba(255, 255, 255, ${progress})`;
        ctx.font = 'bold 36px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.challengeData?.question || '?', centerX, questionY);

        // Answer options
        const options = this.challengeData?.options || {};
        const optionKeys = ['A', 'B', 'C'];
        const optionYStart = centerY + 10;
        const optionSpacing = 56;

        optionKeys.forEach((key, i) => {
            const optionY = optionYStart + i * optionSpacing;
            const isSelected = this.selectedAnswer === key;
            const isCorrect = key === this.challengeData?.correct;
            const showResult = this.selectedAnswer !== null;
            const wasCorrect = this.selectedAnswer === this.challengeData?.correct;

            let bgColor, borderColor, textColor, glowColor;

            if (showResult) {
                if (wasCorrect) {
                    // Correct: reveal green on the correct/selected option, neutral on others
                    if (isCorrect) {
                        bgColor = `rgba(80, 227, 160, ${0.3 * progress})`;
                        borderColor = `rgba(80, 227, 160, ${0.8 * progress})`;
                        textColor = '#50e3a0';
                        glowColor = `rgba(80, 227, 160, ${0.4 * progress})`;
                    } else {
                        bgColor = `rgba(27, 27, 29, ${0.85 * progress})`;
                        borderColor = `rgba(194, 149, 84, ${0.4 * progress})`;
                        textColor = '#92a9c0';
                        glowColor = 'transparent';
                    }
                } else {
                    // Wrong: mark ONLY the selected option red, do NOT reveal the correct one
                    if (isSelected) {
                        bgColor = `rgba(255, 107, 107, ${0.3 * progress})`;
                        borderColor = `rgba(255, 107, 107, ${0.8 * progress})`;
                        textColor = '#ff6b6b';
                        glowColor = `rgba(255, 107, 107, ${0.4 * progress})`;
                    } else {
                        bgColor = `rgba(27, 27, 29, ${0.85 * progress})`;
                        borderColor = `rgba(194, 149, 84, ${0.4 * progress})`;
                        textColor = '#92a9c0';
                        glowColor = 'transparent';
                    }
                }
            } else {
                bgColor = `rgba(27, 27, 29, ${0.85 * progress})`;
                borderColor = `rgba(194, 149, 84, ${0.7 * progress})`;
                textColor = '#ffffff';
                glowColor = 'transparent';
            }

            // Option background with glow
            const optX = centerX - 200;
            const optW = 400;
            const optH = 48;

            // Glow
            if (glowColor !== 'transparent') {
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = 20;
            }

            ctx.fillStyle = bgColor;
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(optX, optionY - 24, optW, optH, 6);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Key label
            ctx.fillStyle = `rgba(232, 190, 116, ${0.95 * progress})`;
            ctx.font = 'bold 16px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${key}`, optX + 24, optionY);

            // Separator
            ctx.strokeStyle = `rgba(194, 149, 84, ${0.5 * progress})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(optX + 60, optionY - 20);
            ctx.lineTo(optX + 60, optionY + 20);
            ctx.stroke();

            // Answer text
            ctx.fillStyle = textColor;
            ctx.font = 'bold 22px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(options[key] || '', optX + 80, optionY);

            // Selection indicator
            if (isSelected && this.selectedAnswer) {
                ctx.fillStyle = isCorrect ? '#50e3a0' : '#ff6b6b';
                ctx.font = 'bold 20px "JetBrains Mono", monospace';
                ctx.textAlign = 'right';
                ctx.fillText(isCorrect ? '✓ ACCESO CONCEDIDO' : '✗ ACCESO DENEGADO', centerX + 180, optionY);
            }
        });

        // Feedback message
        if (this.feedback) {
            const fbY = centerY - 100;
            const fbColor = this.feedbackType === 'success' ? '#50e3a0' : '#ff6b6b';
            ctx.fillStyle = `rgba(${this.feedbackType === 'success' ? '80, 227, 160' : '255, 107, 107'}, ${progress})`;
            ctx.font = 'bold 18px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.feedback, centerX, fbY);

            // Progress bar for auto-close
            const barW = 300;
            const elapsed = this.selectedAnswer ? Math.min(1, this.resultTimer / this.closeDelay) : 0;
            ctx.fillStyle = `rgba(55, 196, 255, ${0.3 * progress})`;
            ctx.fillRect(centerX - barW/2, fbY + 25, barW, 4);
            ctx.fillStyle = `rgba(55, 196, 255, ${0.8 * progress})`;
            ctx.fillRect(centerX - barW/2, fbY + 25, barW * (1 - elapsed), 4);
        }

        ctx.restore();
    }
}
