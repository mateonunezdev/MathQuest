const TAU = Math.PI * 2;
const COLORS = {
    cyan: '#71dce8', gold: '#d9b472', pale: '#ecf6ef', danger: '#ed9a73'
};

const roomTint = {
    entrance: 'rgba(5,22,33,.16)', corridor: 'rgba(3,12,23,.32)',
    sequence: 'rgba(6,27,35,.19)', pulse: 'rgba(5,19,31,.29)',
    sentinel: 'rgba(25,17,24,.20)', artifact: 'rgba(4,32,38,.22)',
    gate: 'rgba(12,23,33,.21)', portal: 'rgba(3,28,43,.26)'
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class AdventureView {
    constructor(game, model) {
        this.game = game;
        this.model = model;
        this.camera = game.camera;
        this.camera.x = 0;
        this.camera.y = 0;
        this.shake = 0;
        this.shakePower = 0;
        this.notice = 0;
        this.noticeRoom = model.rooms[0];
        this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    }

    update(dt, events = []) {
        const model = this.model;
        const camera = this.camera;
        const center = model.center();
        let targetX;
        if (model.phase === 'intro') {
            const t = model.introTime;
            const shots = [
                { until: 1.55, x: model.portal.x - 480, drift: -38 },
                { until: 2.9, x: model.gate.x - 480, drift: 28 },
                { until: 4.3, x: model.artifact.x - 480, drift: -24 },
                { until: 5.5, x: model.room('sequence').x + 95, drift: 45 },
                { until: 7.2, x: 0, drift: 42 }
            ];
            const shot = shots.find(item => t < item.until) || shots.at(-1);
            const prior = shots[shots.indexOf(shot) - 1]?.until || 0;
            targetX = shot.x + (this.reducedMotion ? 0 : (t - prior) * shot.drift);
            camera.x = clamp(targetX, 0, model.width - 960);
        } else {
            const room = model.rooms[model.roomIndex];
            targetX = model.focus ? model.focus.x - 480 :
                center.x - 480 + model.player.vx * (this.reducedMotion ? 0 : 0.24);
            const roomMin = Math.max(0, room.x - 95);
            const roomMax = Math.min(model.width - 960, room.end - 865);
            if (!model.focus && roomMax >= roomMin) targetX = clamp(targetX, roomMin, roomMax);
            targetX = clamp(targetX, 0, model.width - 960);
            camera.x += (targetX - camera.x) * (1 - Math.exp(-dt * (model.focus ? 3.7 : 7.2)));
        }
        camera.y = 0;
        for (const event of events) {
            if (event.kind === 'roomEnter') {
                this.notice = 2.4;
                this.noticeRoom = model.room(event.room);
            }
            if (event.kind === 'dash' && !this.reducedMotion)
                this.shake = Math.max(this.shake, 0.075);
            if (!this.reducedMotion &&
                ['enemyHit', 'playerHurt', 'gateStart'].includes(event.kind)) {
                this.shake = event.kind === 'gateStart' ? 0.23 : 0.12;
                this.shakePower = event.kind === 'playerHurt' ? 4 : 3;
            }
        }
        this.notice = Math.max(0, this.notice - dt);
        this.shake = Math.max(0, this.shake - dt);
        camera.offsetX = this.shake ? (Math.random() - 0.5) * (this.shakePower || 2) : 0;
        camera.offsetY = this.shake ? (Math.random() - 0.5) * (this.shakePower || 2) : 0;
    }

    render(ctx) {
        const model = this.model;
        ctx.fillStyle = '#06111b';
        ctx.fillRect(0, 0, 960, 540);
        ctx.save();
        ctx.translate(-this.camera.x + (this.camera.offsetX || 0), this.camera.offsetY || 0);
        const visible = model.rooms.filter(room => room.end >= this.camera.x - 100 &&
            room.x <= this.camera.x + 1060);
        for (const room of visible) this.drawRoom(ctx, room);
        for (const room of visible) this.drawRoomActivity(ctx, room);
        this.drawActors(ctx);
        if (visible.some(room => room.id === 'gate')) this.drawGateFacade(ctx);
        for (const room of visible) this.drawForeground(ctx, room);
        ctx.restore();
        if (model.phase === 'intro') this.drawIntro(ctx);
        else {
            this.drawHud(ctx);
            this.drawPrompt(ctx);
            if (model.challenge) this.drawChallenge(ctx);
            if (model.phase === 'portal') this.drawPortalExit(ctx);
        }
    }

    drawRoom(ctx, room) {
        const art = this.game.artAssets;
        const background = art.pack.levels?.[1]?.background;
        const image = art.image(background);
        ctx.save();
        if (image) {
            const sourceX = room.id === 'corridor' ? 165 : 0;
            const sourceWidth = room.id === 'corridor' ? 630 : 960;
            ctx.drawImage(image, sourceX, 0, sourceWidth, 540,
                room.x, 0, room.width, 540);
        } else {
            ctx.fillStyle = '#17252d';
            ctx.fillRect(room.x, 0, room.width, 540);
        }
        ctx.fillStyle = roomTint[room.id];
        ctx.fillRect(room.x, 0, room.width, 540);
        const edge = ctx.createLinearGradient(room.x, 0, room.end, 0);
        edge.addColorStop(0, 'rgba(3,9,15,.45)');
        edge.addColorStop(0.13, 'rgba(3,9,15,0)');
        edge.addColorStop(0.87, 'rgba(3,9,15,0)');
        edge.addColorStop(1, 'rgba(3,9,15,.5)');
        ctx.fillStyle = edge;
        ctx.fillRect(room.x, 80, room.width, 460);
        ctx.restore();
    }

    drawRoomActivity(ctx, room) {
        const model = this.model;
        const time = model.clock;
        if (room.id === 'entrance') {
            this.drawRune(ctx, room.x + 430, 294, 112, time * 0.18, 0.22);
            this.drawPlaque(ctx, room.x + 338, 118, 'Σ · EL TEMPLO DESPIERTA');
        } else if (room.id === 'corridor') {
            this.drawCorridor(ctx, room);
        } else if (room.id === 'sequence') {
            this.drawSequence(ctx, room);
        } else if (room.id === 'pulse') {
            this.drawPulseHall(ctx, room);
        } else if (room.id === 'sentinel') {
            this.drawSentinelCourt(ctx, room);
        } else if (room.id === 'artifact') {
            this.drawArtifactSanctum(ctx, room);
        } else if (room.id === 'gate') {
            this.drawGate(ctx, room);
        } else if (room.id === 'portal') {
            this.drawPortal(ctx, room);
        }
        if (room.id !== 'portal' && room.id !== 'gate') {
            ctx.save();
            const active = room.id === 'sequence' && model.progress.sequence ||
                room.id === 'sentinel' && model.progress.sentinel;
            const alpha = active ? 0.4 : 0.16;
            ctx.strokeStyle = `rgba(104,224,232,${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(room.x + 45, 475);
            ctx.lineTo(room.end - 45, 475);
            ctx.stroke();
            ctx.restore();
        }
    }

    drawRune(ctx, x, y, radius, rotation, alpha = 0.35) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.strokeStyle = `rgba(114,225,231,${alpha})`;
        ctx.lineWidth = 2;
        for (const scale of [1, 0.69]) {
            ctx.beginPath();
            ctx.arc(0, 0, radius * scale, 0, TAU);
            ctx.stroke();
        }
        for (let index = 0; index < 8; index++) {
            const a = index * TAU / 8;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * radius * 0.8, Math.sin(a) * radius * 0.8);
            ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawPlaque(ctx, x, y, label) {
        if (x < this.camera.x + 95 || x > this.camera.x + 865) return;
        ctx.save();
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#dbc592';
        ctx.shadowColor = 'rgba(242,190,103,.45)';
        ctx.shadowBlur = 7;
        ctx.fillText(label, x, y);
        ctx.restore();
    }

    drawCorridor(ctx, room) {
        for (const [x, y] of [[room.x + 180, 164], [room.x + 445, 422]]) {
            ctx.save();
            ctx.fillStyle = 'rgba(2,8,14,.48)';
            ctx.beginPath(); ctx.ellipse(x, y + 26, 57, 17, 0, 0, TAU); ctx.fill();
            const image = this.game.artAssets.image(this.game.artAssets.get('encounter', 'shield'));
            if (image) ctx.drawImage(image, x - 30, y - 82, 60, 105);
            ctx.strokeStyle = 'rgba(218,176,103,.6)';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x, y - 28, 22, 0, TAU); ctx.stroke();
            ctx.restore();
        }
        this.drawRune(ctx, this.model.lore.x, this.model.lore.y, 35,
            this.model.clock * 0.1, this.model.progress.lore ? 0.08 : 0.4);
        this.drawPlaque(ctx, this.model.lore.x, this.model.lore.y - 58, 'Σ');
    }

    drawSequence(ctx, room) {
        const puzzle = this.model.puzzle;
        const solved = this.model.progress.sequence;
        this.drawRune(ctx, room.x + 390, 283, 165, this.model.clock * 0.12,
            solved ? 0.45 : 0.25);
        this.drawPlaque(ctx, room.x + 403, 135,
            `${puzzle.terms.join('  →  ')}  →  ?`);
        if (this.model.difficulty === 'explorador')
            this.drawPlaque(ctx, room.x + 405, 159, puzzle.hint);
        for (const plate of puzzle.plates) {
            const selected = solved && plate.correct;
            const pulse = this.model.puzzle.pulse > 0 &&
                this.model.puzzle.lastPlate === plate.id;
            ctx.save();
            ctx.fillStyle = selected ? 'rgba(45,167,183,.42)' :
                pulse ? 'rgba(232,124,79,.42)' : 'rgba(10,30,40,.68)';
            ctx.strokeStyle = selected ? COLORS.cyan : pulse ? COLORS.danger : '#b89b68';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.ellipse(plate.x, plate.y, 55, 37, 0, 0, TAU);
            ctx.fill(); ctx.stroke();
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(plate.x, plate.y, 43, 29, 0, 0, TAU); ctx.stroke();
            ctx.fillStyle = selected ? '#b9f4f1' : '#f1d9a0';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = 'bold 29px "JetBrains Mono", monospace';
            ctx.fillText(String(plate.value), plate.x, plate.y);
            ctx.restore();
        }
        ctx.save();
        ctx.strokeStyle = solved ? 'rgba(93,224,231,.75)' : 'rgba(136,182,187,.18)';
        ctx.lineWidth = solved ? 5 : 2;
        ctx.beginPath();
        ctx.moveTo(room.x + 818, 280);
        ctx.lineTo(room.end - 18, 280);
        ctx.stroke();
        ctx.restore();
    }

    drawPulseHall(ctx, room) {
        for (let index = 0; index < 3; index++) {
            const x = room.x + 270 + index * 245;
            const state = this.model.hazardState(index);
            const active = state === 'active';
            const warning = state === 'warning';
            ctx.save();
            ctx.fillStyle = 'rgba(4,12,22,.65)';
            for (const y of [118, 470]) {
                ctx.beginPath(); ctx.ellipse(x, y, 48, 20, 0, 0, TAU); ctx.fill();
                ctx.strokeStyle = '#b99966'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(x, y, 22, 0, TAU); ctx.stroke();
                ctx.fillStyle = active ? '#c6f8f6' : warning ? '#e8bc70' : '#447e86';
                ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill();
            }
            if (active || warning) {
                ctx.strokeStyle = active ? 'rgba(150,247,246,.92)' :
                    'rgba(228,184,109,.44)';
                ctx.lineWidth = active ? 26 : 9;
                ctx.shadowColor = active ? '#51d8e5' : '#dcaa62';
                ctx.shadowBlur = active ? 17 : 6;
                ctx.beginPath(); ctx.moveTo(x, 135); ctx.lineTo(x, 450); ctx.stroke();
                if (active) {
                    ctx.lineWidth = 5; ctx.strokeStyle = '#f2fbec';
                    ctx.beginPath(); ctx.moveTo(x, 135); ctx.lineTo(x, 450); ctx.stroke();
                }
            }
            ctx.restore();
        }
        this.drawPlaque(ctx, room.x + 520, 115, 'OBSERVA · ESQUIVA · ATRAVIESA');
    }

    drawSentinelCourt(ctx, room) {
        const enemy = this.model.sentinel;
        this.drawRune(ctx, room.x + 560, 294, 202, this.model.clock * -0.07, 0.31);
        this.drawPlaque(ctx, room.x + 530, 118, 'PATIO DEL CENTINELA');
        if (enemy.shield) {
            const x = room.x + 255, y = 185;
            this.drawRune(ctx, x, y, 47, this.model.clock * 1.5, 0.75);
            this.drawPlaque(ctx, x, y + 6, 'Σ');
        }
        if (enemy.state === 'WINDUP') {
            ctx.save();
            ctx.strokeStyle = `rgba(238,159,104,${0.52 + Math.sin(this.model.clock * 20) * 0.21})`;
            ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(enemy.x, enemy.y, 106, 0, TAU); ctx.stroke();
            ctx.restore();
        }
    }

    drawArtifactSanctum(ctx, room) {
        const model = this.model;
        this.drawRune(ctx, model.artifact.x, model.artifact.y + 55, 135,
            model.clock * 0.15, model.progress.artifact ? 0.6 : 0.4);
        const wallX = model.secret.x + 90;
        ctx.save();
        ctx.fillStyle = 'rgba(2,9,15,.54)';
        ctx.beginPath(); ctx.ellipse(wallX + 60, 456, 79, 17, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = model.progress.secret ? 'rgba(105,226,231,.65)' :
            'rgba(208,166,98,.36)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(wallX + 60, 452, 77, 14, 0, 0, TAU);
        ctx.stroke();
        const hiddenArt = this.game.artAssets.image(this.game.artAssets.get('door',
            model.progress.secret ? 'open' : 'locked'));
        if (hiddenArt) ctx.drawImage(hiddenArt, wallX - 4, 311, 127, 148);
        ctx.restore();
        if (!model.progress.secret) {
            ctx.save();
            ctx.strokeStyle = 'rgba(225,192,131,.72)';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(model.secret.x, model.secret.y, 42, 0, TAU); ctx.stroke();
            ctx.font = 'bold 25px "JetBrains Mono", monospace';
            ctx.textAlign = 'center'; ctx.fillStyle = '#ead2a0';
            ctx.fillText('√?', model.secret.x, model.secret.y + 8);
            ctx.restore();
        } else {
            this.drawRune(ctx, model.secret.x, model.secret.y, 58,
                model.clock * 0.3, 0.75);
        }
    }

    drawGate(ctx, room) {
        const model = this.model;
        const gate = model.gate;
        ctx.save();
        ctx.strokeStyle = gate.state === 'locked' ? 'rgba(178,144,82,.25)' :
            'rgba(100,228,234,.68)';
        ctx.lineWidth = gate.state === 'locked' ? 3 : 7;
        for (const offset of [-82, 0, 82]) {
            ctx.beginPath(); ctx.moveTo(room.x + 85, 280 + offset);
            ctx.lineTo(gate.x - 80, 280 + offset); ctx.stroke();
        }
        ctx.restore();
        this.drawRune(ctx, gate.x, gate.y, 88, model.clock * 0.25,
            gate.state === 'locked' ? 0.2 : 0.64);
        if (gate.state === 'unlocking') {
            ctx.save();
            ctx.strokeStyle = 'rgba(159,243,238,.82)';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(gate.x, gate.y - 6, 57,
                -Math.PI / 2, -Math.PI / 2 + TAU * (1 - gate.timer / 1.25));
            ctx.stroke(); ctx.restore();
        }
    }

    drawGateFacade(ctx) {
        const gate = this.model.gate;
        const key = gate.state === 'open' ? 'open' : 'locked';
        this.game.artAssets.draw(ctx, this.game.artAssets.get('door', key),
            gate.x, gate.y + 134, this.model.clock);
    }

    drawPortal(ctx, room) {
        const model = this.model;
        const open = model.gate.state === 'open';
        this.drawRune(ctx, model.portal.x, model.portal.y + 90, 166,
            model.clock * -0.2, open ? 0.48 : 0.15);
        const ground = ctx.createRadialGradient(model.portal.x, model.portal.y + 85, 8,
            model.portal.x, model.portal.y + 85, 164);
        ground.addColorStop(0, open ? 'rgba(108,227,231,.22)' : 'rgba(115,158,161,.07)');
        ground.addColorStop(1, 'rgba(108,227,231,0)');
        ctx.fillStyle = ground;
        ctx.fillRect(model.portal.x - 164, model.portal.y - 79, 328, 328);
        ctx.save();
        ctx.globalAlpha = open ? 1 : 0.42;
        this.game.artAssets.draw(ctx, this.game.artAssets.get('portal', 'base'),
            model.portal.x, model.portal.y + 101, model.clock);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = open ? 'rgba(130,236,240,.64)' : 'rgba(204,171,108,.28)';
        ctx.lineWidth = 2;
        for (let index = 0; index < 3; index++) {
            const radius = 38 + index * 17;
            ctx.beginPath();
            ctx.arc(model.portal.x, model.portal.y + 6, radius,
                model.clock * (index % 2 ? -0.5 : 0.6),
                model.clock * (index % 2 ? -0.5 : 0.6) + Math.PI * 1.1);
            ctx.stroke();
        }
        if (!open) {
            ctx.fillStyle = 'rgba(4,17,25,.47)';
            ctx.beginPath(); ctx.arc(model.portal.x, model.portal.y + 6, 32, 0, TAU); ctx.fill();
            ctx.fillStyle = '#c7a56e';
            ctx.font = 'bold 25px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Σ', model.portal.x, model.portal.y + 15);
        }
        ctx.restore();
        this.drawPlaque(ctx, model.portal.x, 125, 'EL CAMINO CONTINÚA');
    }

    drawActors(ctx) {
        const model = this.model;
        const player = model.player;
        const enemy = model.sentinel;
        const pieces = [{ foot: player.y + 60, kind: 'player' }];
        if (model.roomIndex >= 3 && model.roomIndex <= 5 && enemy.state !== 'DEFEATED')
            pieces.push({ foot: enemy.y + 46, kind: 'enemy' });
        if (model.roomIndex >= 4 && model.roomIndex <= 6 && !model.progress.artifact)
            pieces.push({ foot: model.artifact.y + 47, kind: 'artifact' });
        pieces.sort((a, b) => a.foot - b.foot);
        for (const piece of pieces) {
            if (piece.kind === 'player') {
                this.drawPlayerEffects(ctx);
                if (model.phase === 'intro') {
                    const arrival = clamp((model.introTime - 5.5) / 0.65, 0, 1);
                    ctx.save();
                    ctx.globalAlpha = arrival;
                    player.render(this.game.renderer);
                    ctx.restore();
                    if (model.introTime >= 5.5)
                        this.drawRune(ctx, player.x + 30, player.y + 47, 41,
                            model.clock * 1.5, (1 - arrival) * 0.45 + 0.08);
                } else player.render(this.game.renderer);
            } else if (piece.kind === 'enemy') {
                ctx.save();
                ctx.fillStyle = 'rgba(1,7,12,.6)';
                ctx.beginPath(); ctx.ellipse(enemy.x, enemy.y + 50, 42, 12, 0, 0, TAU); ctx.fill();
                this.game.artAssets.draw(ctx, this.game.artAssets.get('encounter', 'sentinel'),
                    enemy.x, enemy.y + 46, model.clock);
                if (enemy.shield) {
                    ctx.strokeStyle = 'rgba(105,220,234,.8)'; ctx.lineWidth = 4;
                    ctx.beginPath(); ctx.arc(enemy.x, enemy.y - 4, 55, 0, TAU); ctx.stroke();
                }
                ctx.restore();
            } else {
                const artifact = model.artifact;
                this.game.artAssets.draw(ctx, this.game.artAssets.get('encounter', 'shield'),
                    artifact.x, artifact.y + 48 - artifact.lift * 42, model.clock);
                ctx.save();
                ctx.fillStyle = '#b9f2e7';
                ctx.shadowColor = '#60dce6'; ctx.shadowBlur = 17;
                ctx.beginPath();
                ctx.arc(artifact.x, artifact.y - 22 - artifact.lift * 42,
                    10 + Math.sin(model.clock * 3) * 2, 0, TAU);
                ctx.fill(); ctx.restore();
            }
        }
    }

    drawPlayerEffects(ctx) {
        const model = this.model;
        const player = model.player;
        ctx.save();
        for (const trail of model.trail) {
            ctx.fillStyle = `rgba(105,223,234,${trail.life * 0.52})`;
            ctx.beginPath(); ctx.ellipse(trail.x, trail.y, 21, 9, 0, 0, TAU); ctx.fill();
        }
        if (model.shield) {
            ctx.strokeStyle = 'rgba(124,237,238,.82)';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(player.x + 30, player.y + 25,
                34, 58, 0, 0, TAU); ctx.stroke();
            this.drawPlaque(ctx, player.x + 30, player.y - 39, 'Σ');
        }
        if (player.attackTimer > 0) {
            const power = player.attackActive ? 1 : 0.5;
            const x = player.x + 30 + player.facingX * 55;
            const y = player.y + 25 + player.facingY * 44;
            ctx.strokeStyle = player.attackActive ? 'rgba(175,245,245,.94)' :
                'rgba(227,190,115,.52)';
            ctx.lineWidth = 3 + 7 * power;
            ctx.beginPath();
            ctx.arc(x, y, 22 + 16 * power, -0.72, Math.PI + 0.2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(101,222,234,.34)';
            ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
        }
        ctx.restore();
    }

    drawForeground(ctx, room) {
        const image = this.game.artAssets.image(this.game.artAssets.pack.levels?.[1]?.background);
        if (!image) return;
        ctx.save();
        ctx.globalAlpha = 0.86;
        ctx.drawImage(image, 0, 0, 62, 218, room.x, 0, 62, 218);
        ctx.drawImage(image, 898, 0, 62, 218, room.end - 62, 0, 62, 218);
        ctx.restore();
    }

    drawHud(ctx) {
        const model = this.model;
        ctx.save();
        const top = ctx.createLinearGradient(0, 0, 0, 69);
        top.addColorStop(0, 'rgba(5,16,24,.94)');
        top.addColorStop(1, 'rgba(5,16,24,.36)');
        ctx.fillStyle = top; ctx.fillRect(0, 0, 960, 70);
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.fillStyle = COLORS.gold;
        ctx.fillText('TEMPLO DE LOS NÚMEROS', 23, 26);
        ctx.fillStyle = '#d8e7e5';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillText(model.rooms[model.roomIndex].name, 23, 47);
        ctx.font = 'bold 17px sans-serif';
        ctx.fillStyle = '#f17b82';
        ctx.fillText('♥'.repeat(model.lives) + '♡'.repeat(model.maxLives - model.lives), 432, 28);
        ctx.fillStyle = COLORS.cyan;
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.fillText('ENERGÍA Σ', 587, 25);
        ctx.font = 'bold 21px sans-serif';
        ctx.fillText('●'.repeat(model.energy) + '○'.repeat(model.maxEnergy - model.energy), 588, 51);
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillStyle = '#e7d8b6';
        ctx.textAlign = 'right';
        ctx.fillText(`PUNTOS ${model.score}`, 937, 26);
        const dash = model.player.dashCooldown > 0 ?
            `K ${model.player.dashCooldown.toFixed(1)}s` : 'K DASH';
        const power = !model.progress.artifact ? 'L BLOQ.' : model.shield ? 'L ACTIVO' :
            model.powerCooldown > 0 ? `L ${model.powerCooldown.toFixed(1)}s` :
                model.energy ? 'L ESCUDO' : 'L SIN Σ';
        ctx.fillText(`J ATAQUE  ${dash}  ${power}`, 937, 48);
        ctx.restore();
    }

    drawPrompt(ctx) {
        const model = this.model;
        const text = model.message || model.prompt();
        if (!text) return;
        ctx.save();
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        const width = clamp(ctx.measureText(text).width + 45, 260, 820);
        ctx.fillStyle = 'rgba(5,17,26,.88)';
        ctx.strokeStyle = 'rgba(204,171,107,.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(480 - width / 2, 485, width, 37, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = model.message ? '#e9d4a3' : '#c4f5f2';
        ctx.fillText(text, 480, 509);
        ctx.restore();
        if (this.notice > 0 && this.noticeRoom) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, this.notice, 2.4 - this.notice);
            ctx.textAlign = 'center';
            ctx.font = 'bold 17px "JetBrains Mono", monospace';
            ctx.fillStyle = COLORS.gold;
            ctx.fillText(this.noticeRoom.name, 480, 94);
            ctx.restore();
        }
    }

    drawChallenge(ctx) {
        const challenge = this.model.challenge;
        ctx.save();
        ctx.fillStyle = 'rgba(4,17,27,.93)';
        ctx.strokeStyle = 'rgba(118,224,231,.88)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(182, 318, 596, 137, 13); ctx.fill(); ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillStyle = COLORS.gold;
        ctx.font = 'bold 19px "JetBrains Mono", monospace';
        ctx.fillText(challenge.question, 480, 352);
        ctx.fillStyle = '#e7f4f1';
        ctx.font = 'bold 17px "JetBrains Mono", monospace';
        for (const [index, answer] of Object.entries(challenge.options)) {
            const offset = ['A', 'B', 'C'].indexOf(index);
            ctx.fillText(`${index}  ${answer}`, 290 + offset * 190, 400);
        }
        ctx.fillStyle = '#90d8dd';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillText('BOTONES J / K / L   ·   A / B / C', 480, 432);
        ctx.restore();
    }

    drawIntro(ctx) {
        const t = this.model.introTime;
        const cuts = [0, 1.55, 2.9, 4.3, 5.5, 7.2];
        const nearCut = Math.min(...cuts.map(cut => Math.abs(t - cut)));
        const fade = nearCut < 0.18 ? 1 - nearCut / 0.18 : 0;
        ctx.fillStyle = `rgba(2,8,15,${Math.min(1, fade * 0.88)})`;
        ctx.fillRect(0, 0, 960, 540);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.shadowColor = '#4dcfdf'; ctx.shadowBlur = 12;
        ctx.fillStyle = '#e7d0a0';
        if (t < 2.9) {
            ctx.font = 'bold 16px "JetBrains Mono", monospace';
            ctx.fillText('MATHQUEST', 480, 145);
            ctx.font = 'bold 31px "JetBrains Mono", monospace';
            ctx.fillText('NIVEL 1 · TEMPLO DE LOS NÚMEROS', 480, 185);
        } else if (t >= 5.5) {
            ctx.font = 'bold 22px "JetBrains Mono", monospace';
            ctx.fillText('ERES EL EXPLORADOR MATEMÁTICO', 480, 143);
            ctx.fillStyle = '#b9f3f0';
            ctx.font = 'bold 17px "JetBrains Mono", monospace';
            ctx.fillText('ENCUENTRA EL ARTEFACTO · DESBLOQUEA EL TEMPLO', 480, 177);
        }
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(231,244,241,.8)';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.fillText('ENTER / ESPACIO · OMITIR', 480, 503);
        ctx.restore();
    }

    drawPortalExit(ctx) {
        const progress = this.model.portalTime / 1.3;
        ctx.save();
        ctx.fillStyle = `rgba(151,238,238,${progress * progress * 0.9})`;
        ctx.fillRect(0, 0, 960, 540);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f4f6e8';
        ctx.font = 'bold 27px "JetBrains Mono", monospace';
        ctx.fillText('TEMPLO DESBLOQUEADO', 480, 275);
        ctx.restore();
    }
}
