export class MathChallengeSystem {
    constructor() {
        this.active = false;
        this.callback = null;
        this.challengeData = null;
        this.selectedAnswer = null;
        this.feedback = '';
        this.feedbackType = '';
        this.animTime = 0;
        this.particles = [];

        this.challenges = {
            'door1': {
                question: '7 × (3 + 2) = ?',
                options: { A: '28', B: '35', C: '42' },
                correct: 'B',
                skill: 'Orden de operaciones'
            }
        };
    }

    open(challengeId, callback) {
        this.challengeData = this.challenges[challengeId];
        this.callback = callback;
        this.active = true;
        this.selectedAnswer = null;
        this.feedback = '';
        this.feedbackType = '';
        this.animTime = 0;
        this.particles = [];

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
        
        // Update particles
        this.particles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 30 * dt;
            p.life -= dt;
        });
        this.particles = this.particles.filter(p => p.life > 0);

        const answerKey = window.game?.input?.getAnswerKey?.();
        if (answerKey) this.submitAnswer(answerKey);
    }

    submitAnswer(letter) {
        if (!this.active || this.selectedAnswer) return;

        this.selectedAnswer = letter;
        const correct = letter === this.challengeData.correct;

        if (correct) {
            this.feedback = '✓ CORRECTO - ACCESO CONCEDIDO';
            this.feedbackType = 'success';
            // Success particles
            for (let i = 0; i < 40; i++) {
                this.particles.push({
                    x: 480 + (Math.random() - 0.5) * 300,
                    y: 270 + (Math.random() - 0.5) * 200,
                    vx: (Math.random() - 0.5) * 300,
                    vy: (Math.random() - 0.5) * 300 - 100,
                    life: 2,
                    maxLife: 2,
                    color: Math.random() < 0.5 ? '#50e3a0' : '#ffd700',
                    size: 3 + Math.random() * 5
                });
            }
        } else {
            this.feedback = '✗ ACCESO DENEGADO';
            this.feedbackType = 'error';
            // Error particles
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

        setTimeout(() => {
            this.close(correct);
        }, correct ? 1000 : 800);
    }

    close(correct) {
        this.active = false;
        if (this.callback) this.callback(correct);
        this.callback = null;
    }

    render(ctx) {
        if (!this.active) return;

        const canvas = ctx.canvas;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const progress = this.animTime;

        ctx.save();

        // Background overlay with scanlines
        ctx.fillStyle = `rgba(5, 15, 30, ${0.92 * progress})`;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Scanlines
        ctx.strokeStyle = `rgba(55, 196, 255, ${0.03 * progress})`;
        ctx.lineWidth = 1;
        for (let y = 0; y < 540; y += 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(960, y);
            ctx.stroke();
        }

        // Main holographic panel
        const panelW = 700;
        const panelH = 420;
        const panelX = centerX - panelW / 2;
        const panelY = centerY - panelH / 2;

        // Panel glow
        const glowGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 400);
        glowGrad.addColorStop(0, `rgba(55, 196, 255, ${0.15 * progress})`);
        glowGrad.addColorStop(1, 'rgba(55, 196, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(panelX - 50, panelY - 50, panelW + 100, panelH + 100);

        // Panel background
        const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
        panelGrad.addColorStop(0, `rgba(8, 20, 40, ${0.95 * progress})`);
        panelGrad.addColorStop(0.5, `rgba(6, 15, 35, ${0.9 * progress})`);
        panelGrad.addColorStop(1, `rgba(4, 10, 25, ${0.95 * progress})`);
        ctx.fillStyle = panelGrad;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 20);
        ctx.fill();

        // Border
        ctx.strokeStyle = `rgba(55, 196, 255, ${0.5 * progress})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 20);
        ctx.stroke();

        // Inner border glow
        ctx.strokeStyle = `rgba(55, 196, 255, ${0.2 * progress})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(panelX + 3, panelY + 3, panelW - 6, panelH - 6, 17);
        ctx.stroke();

        // Header
        const headerY = panelY + 40;
        ctx.fillStyle = `rgba(55, 196, 255, ${0.2 * progress})`;
        ctx.fillRect(panelX + 20, headerY - 10, panelW - 40, 2);

        // Title
        ctx.fillStyle = `rgba(55, 196, 255, ${progress})`;
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SISTEMA DE ACCESO // PUERTA PRINCIPAL', centerX, headerY + 10);

        // Skill tag
        if (this.challengeData) {
            ctx.fillStyle = `rgba(80, 227, 160, ${0.8 * progress})`;
            ctx.font = '11px "JetBrains Mono", monospace';
            ctx.fillText(`HABILIDAD: ${this.challengeData.skill}`, centerX, headerY + 30);
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
        const optionYStart = centerY + 30;
        const optionSpacing = 70;

        optionKeys.forEach((key, i) => {
            const optionY = optionYStart + i * optionSpacing;
            const isSelected = this.selectedAnswer === key;
            const isCorrect = key === this.challengeData?.correct;
            const showResult = this.selectedAnswer !== null;

            let bgColor, borderColor, textColor, glowColor;

            if (showResult) {
                if (isCorrect) {
                    bgColor = `rgba(80, 227, 160, ${0.3 * progress})`;
                    borderColor = `rgba(80, 227, 160, ${0.8 * progress})`;
                    textColor = '#50e3a0';
                    glowColor = `rgba(80, 227, 160, ${0.4 * progress})`;
                } else if (isSelected) {
                    bgColor = `rgba(255, 107, 107, ${0.3 * progress})`;
                    borderColor = `rgba(255, 107, 107, ${0.8 * progress})`;
                    textColor = '#ff6b6b';
                    glowColor = `rgba(255, 107, 107, ${0.4 * progress})`;
                } else {
                    bgColor = `rgba(20, 30, 50, ${0.5 * progress})`;
                    borderColor = `rgba(55, 196, 255, ${0.3 * progress})`;
                    textColor = '#92a9c0';
                    glowColor = 'transparent';
                }
            } else {
                bgColor = `rgba(20, 30, 50, ${0.5 * progress})`;
                borderColor = `rgba(55, 196, 255, ${0.4 * progress})`;
                textColor = '#ffffff';
                glowColor = 'transparent';
            }

            // Option background with glow
            const optX = centerX - 200;
            const optW = 400;
            const optH = 56;

            // Glow
            if (glowColor !== 'transparent') {
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = 20;
            }

            ctx.fillStyle = bgColor;
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(optX, optionY - 28, optW, optH, 12);
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Key label
            ctx.fillStyle = `rgba(55, 196, 255, ${0.8 * progress})`;
            ctx.font = 'bold 16px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${key}`, optX + 24, optionY);

            // Separator
            ctx.strokeStyle = `rgba(55, 196, 255, ${0.3 * progress})`;
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
            const fbY = centerY + 180;
            const fbColor = this.feedbackType === 'success' ? '#50e3a0' : '#ff6b6b';
            ctx.fillStyle = `rgba(${this.feedbackType === 'success' ? '80, 227, 160' : '255, 107, 107'}, ${progress})`;
            ctx.font = 'bold 18px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.feedback, centerX, fbY);

            // Progress bar for auto-close
            const barW = 300;
            const elapsed = this.selectedAnswer ? Math.min(1, (Date.now() - this.animTime * 1000) / 800) : 0;
            ctx.fillStyle = `rgba(55, 196, 255, ${0.3 * progress})`;
            ctx.fillRect(centerX - barW/2, fbY + 25, barW, 4);
            ctx.fillStyle = `rgba(55, 196, 255, ${0.8 * progress})`;
            ctx.fillRect(centerX - barW/2, fbY + 25, barW * (1 - elapsed), 4);
        }

        // Particles
        this.particles.forEach(p => {
            const pProgress = p.life / p.maxLife;
            ctx.globalAlpha = pProgress * progress;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Keyboard hint
        ctx.fillStyle = `rgba(146, 169, 192, ${0.6 * progress})`;
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Pulsa A, B o C para responder  •  ↑/W para interactuar', centerX, centerY + 230);

        ctx.restore();
    }
}

(End of file - total 353 lines)