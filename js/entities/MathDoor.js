import { Particle } from './Particle.js';

export const DoorState = {
    LOCKED: 'locked',
    UNLOCKING: 'unlocking',
    OPEN: 'open'
};

export class MathDoor {
    constructor(tileX, tileY, challengeId) {
        this.tileSize = 60;
        this.x = tileX * this.tileSize;
        this.y = tileY * this.tileSize;
        this.width = this.tileSize;
        this.height = this.tileSize * 2;
        this.challengeId = challengeId;
        
        // State machine
        this.state = DoorState.LOCKED;
        this.locked = true;
        
        this.openProgress = 0;
        this.openTarget = 0;
        this.glowIntensity = 0;
        this.glowTarget = 0;
        this.pulseTime = 0;
        this.particles = [];
        this.interactionHint = false;
        this.hintAlpha = 0;
        
        // Unlock sequence state
        this.unlockPhase = 0;
        this.unlockStage = 0; // 0=charge, 1=conduits, 2=seal, 3=panels, 4=release
        this.unlockFlash = 0;
        this.screenShakeRequested = false;
        this.conduitEnergy = 0;
        this.sealCharge = 0;
        this.panelSeparation = 0;
        
        // Conduit system (vertical energy lines on sides)
        this.conduits = this.generateConduits();
    }
    
    generateConduits() {
        const ts = this.tileSize;
        const h = this.height;
        const conduits = [];
        
        // Left and right conduits with segments
        [-1, 1].forEach(side => {
            const x = side === -1 ? 8 : ts - 8;
            const segments = [];
            const segCount = 8;
            for (let i = 0; i < segCount; i++) {
                const y = 12 + (h - 24) * i / (segCount - 1);
                segments.push({ x, y, charge: 0, active: false });
            }
            conduits.push({ side, segments, glow: 0 });
        });
        
        return conduits;
    }
    
    update(dt, player) {
        this.pulseTime += dt;
        
        const dist = Math.hypot(
            (player.x + player.width/2) - (this.x + this.width/2),
            (player.y + player.height/2) - (this.y + this.height/2)
        );
        const interactionRange = 100;
        
        this.interactionHint = dist < interactionRange && this.state === DoorState.LOCKED;
        this.hintAlpha += (this.interactionHint ? 1 : -1) * dt * 4;
        this.hintAlpha = Math.max(0, Math.min(1, this.hintAlpha));
        
        // State machine
        switch (this.state) {
            case DoorState.LOCKED:
                this.glowIntensity += (this.glowTarget - this.glowIntensity) * dt * 5;
                this.openProgress += (this.openTarget - this.openProgress) * dt * 3;
                // Subtle conduit pulse when player near
                if (dist < 150) {
                    this.conduits.forEach(c => {
                        c.glow += (0.3 - c.glow) * dt * 2;
                    });
                } else {
                    this.conduits.forEach(c => {
                        c.glow += (0 - c.glow) * dt * 1;
                    });
                }
                break;
                
            case DoorState.UNLOCKING:
                this.unlockPhase += dt * 1.2; // ~0.8s total
                this.unlockFlash = Math.max(0, this.unlockFlash - dt * 2);
                
                // Stage progression
                const prevStage = this.unlockStage;
                if (this.unlockPhase < 0.15) this.unlockStage = 0;      // Charge buildup
                else if (this.unlockPhase < 0.35) this.unlockStage = 1; // Conduits energize
                else if (this.unlockPhase < 0.55) this.unlockStage = 2; // Seal activates
                else if (this.unlockPhase < 0.75) this.unlockStage = 3; // Panels separate
                else this.unlockStage = 4;                              // Energy release
                
                if (this.unlockStage !== prevStage) {
                    this.onStageChange(this.unlockStage);
                }
                
                this.updateUnlockStage(dt);
                
                // Smooth door opening (panels separate)
                this.openProgress = Math.min(1, this.unlockPhase * 1.3);
                
                // Screen shake at start
                if (this.unlockPhase < 0.05 && !this.screenShakeRequested) {
                    this.screenShakeRequested = true;
                    if (window.game) {
                        window.game.requestScreenShake(0.5, 15);
                    }
                }
                
                // Secondary shake at seal activation
                if (this.unlockPhase >= 0.3 && this.unlockPhase < 0.35 && !this.sealShakeDone) {
                    this.sealShakeDone = true;
                    if (window.game) {
                        window.game.requestScreenShake(0.3, 8);
                    }
                }
                
                // Transition to OPEN
                if (this.unlockPhase >= 0.85) {
                    this.state = DoorState.OPEN;
                    this.locked = false;
                    this.openProgress = 1;
                    this.openTarget = 1;
                    this.glowTarget = 1;
                    this.conduitEnergy = 1;
                    this.sealCharge = 1;
                }
                break;
                
            case DoorState.OPEN:
                this.glowIntensity += (this.glowTarget - this.glowIntensity) * dt * 3;
                this.openProgress = 1;
                this.openTarget = 1;
                this.conduits.forEach(c => {
                    c.glow += (1 - c.glow) * dt * 2;
                    c.segments.forEach(s => s.charge = 1);
                });
                break;
        }
        
        this.glowIntensity += (this.glowTarget - this.glowIntensity) * dt * 5;
        this.openProgress += (this.openTarget - this.openProgress) * dt * 3;
        
        // Update conduits
        this.conduits.forEach(c => {
            c.segments.forEach(s => {
                s.charge += (c.glow - s.charge) * dt * 8;
            });
        });
        
        // Ambient particles when locked
        if (this.state === DoorState.LOCKED && this.glowIntensity > 0 && Math.random() < 0.03) {
            this.spawnAmbientParticle();
        }
        
        this.particles.forEach(p => p.update(dt));
        this.particles = this.particles.filter(p => !p.dead);
        
        // Interaction
        if (this.interactionHint && dist < 60 && this.state === DoorState.LOCKED) {
            if (window.game?.input?.wasPressed?.('ArrowUp') || window.game?.input?.wasPressed?.('w')) {
                window.game?.triggerChallenge?.(this.challengeId);
            }
        }
    }
    
    onStageChange(stage) {
        if (stage === 0) {
            // Charge buildup - start sound handled by game
        } else if (stage === 1) {
            // Conduits energize - spawn conduit particles
            this.spawnConduitParticles(20);
        } else if (stage === 2) {
            // Seal activates - spawn seal particles
            this.spawnSealParticles(30);
            if (window.game) {
                window.game.requestScreenShake(0.3, 8);
            }
        } else if (stage === 3) {
            // Panels separate - mechanical particles
            this.spawnMechanicalParticles(15);
        } else if (stage === 4) {
            // Energy release - big burst
            this.spawnReleaseParticles(60);
            this.spawnGoldenParticles(40);
        }
    }
    
    updateUnlockStage(dt) {
        switch (this.unlockStage) {
            case 0: // Charge buildup
                this.conduitEnergy = Math.min(1, this.unlockPhase / 0.15);
                this.sealCharge = 0;
                this.panelSeparation = 0;
                break;
            case 1: // Conduits energize
                this.conduitEnergy = 1;
                this.sealCharge = Math.min(1, (this.unlockPhase - 0.15) / 0.2);
                this.panelSeparation = 0;
                // Animate conduit segments lighting up
                this.conduits.forEach((c, ci) => {
                    c.segments.forEach((s, si) => {
                        const delay = (ci * 0.05 + si * 0.02);
                        const prog = Math.max(0, Math.min(1, (this.unlockPhase - 0.15 - delay) / 0.15));
                        s.charge = prog;
                    });
                });
                break;
            case 2: // Seal activates
                this.sealCharge = Math.min(1, (this.unlockPhase - 0.35) / 0.2);
                this.panelSeparation = Math.min(1, (this.unlockPhase - 0.35) / 0.2) * 0.3;
                break;
            case 3: // Panels separate
                this.sealCharge = 1;
                this.panelSeparation = Math.min(1, (this.unlockPhase - 0.55) / 0.2);
                break;
            case 4: // Energy release
                this.panelSeparation = 1;
                this.conduitEnergy = 1;
                this.sealCharge = 1;
                break;
        }
    }
    
    unlock() {
        if (this.state !== DoorState.LOCKED) return;
        
        this.state = DoorState.UNLOCKING;
        this.unlockPhase = 0;
        this.unlockStage = 0;
        this.unlockFlash = 1;
        this.glowTarget = 1;
        this.openTarget = 1;
        this.screenShakeRequested = false;
        this.sealShakeDone = false;
        this.conduitEnergy = 0;
        this.sealCharge = 0;
        this.panelSeparation = 0;
        this.conduits.forEach(c => {
            c.glow = 0;
            c.segments.forEach(s => { s.charge = 0; s.active = false; });
        });
    }
    
    isBlocking() {
        return this.state !== DoorState.OPEN;
    }
    
    // Particle spawners
    spawnConduitParticles(count) {
        for (let i = 0; i < count; i++) {
            const side = Math.random() < 0.5 ? -1 : 1;
            const x = this.x + this.width/2 + side * (this.width/2 - 10);
            const y = this.y + 20 + Math.random() * (this.height - 40);
            this.particles.push(new Particle(
                x, y,
                side * (50 + Math.random() * 80),
                (Math.random() - 0.5) * 40,
                Math.random() < 0.5 ? '#37c4ff' : '#50e3a0',
                0.8 + Math.random() * 0.5
            ));
        }
    }
    
    spawnSealParticles(count) {
        const cx = this.x + this.width/2;
        const cy = this.y + this.height/2;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 60 + Math.random() * 100;
            this.particles.push(new Particle(
                cx, cy,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                Math.random() < 0.3 ? '#ffd700' : '#37c4ff',
                1 + Math.random() * 0.8
            ));
        }
    }
    
    spawnMechanicalParticles(count) {
        for (let i = 0; i < count; i++) {
            const x = this.x + 10 + Math.random() * (this.width - 20);
            const y = this.y + 10 + Math.random() * (this.height - 20);
            this.particles.push(new Particle(
                x, y,
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 100 - 50,
                '#8a9ab0',
                0.6 + Math.random() * 0.4
            ));
        }
    }
    
    spawnReleaseParticles(count) {
        const cx = this.x + this.width/2;
        const cy = this.y + this.height/2;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const speed = 150 + Math.random() * 200;
            this.particles.push(new Particle(
                cx, cy,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                Math.random() < 0.4 ? '#ffd700' : (Math.random() < 0.7 ? '#37c4ff' : '#50e3a0'),
                1.2 + Math.random() * 1
            ));
        }
    }
    
    spawnGoldenParticles(count) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = 100 + Math.random() * 150;
            this.particles.push(new Particle(
                this.x + this.width/2,
                this.y + this.height/2,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                '#ffd700',
                1.5 + Math.random() * 1
            ));
        }
    }
    
    spawnAmbientParticle() {
        this.particles.push(new DoorParticle(
            this.x + Math.random() * this.width,
            this.y + Math.random() * this.height,
            '#37c4ff'
        ));
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
        
        // Render order: background -> frame -> conduits -> panels -> seal -> energy -> particles -> hint
        this.renderArchitecturalFrame(ctx);
        this.renderConduits(ctx);
        this.renderDoorPanels(ctx);
        this.renderMathSeal(ctx);
        this.renderEnergyField(ctx);
        this.particles.forEach(p => p.render(ctx));
        
        if (this.hintAlpha > 0) {
            this.renderInteractionHint(ctx);
        }
        
        ctx.restore();
    }
    
    renderArchitecturalFrame(ctx) {
        const ts = this.tileSize;
        const h = this.height;
        const cx = ts / 2;
        
        // Deep shadow behind frame (grounded feel)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(-8, h - 4, ts + 16, 8);
        
        // Base platform (stone/metal threshold) - stronger mass
        const baseGrad = ctx.createLinearGradient(0, h - 12, 0, h);
        baseGrad.addColorStop(0, '#1a2a3a');
        baseGrad.addColorStop(1, '#0d1520');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(-14, h - 14, ts + 28, 14);
        ctx.strokeStyle = 'rgba(55, 196, 255, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-13.5, h - 13.5, ts + 25, 13);
        
        // Side columns (architectural pillars) - with broader base
        this.renderColumn(ctx, -12, 0, h, -1); // Left column
        this.renderColumn(ctx, ts, 0, h, 1);   // Right column
        
        // Architrave (top beam) - heavier presence
        const archGrad = ctx.createLinearGradient(0, 0, 0, 16);
        archGrad.addColorStop(0, '#2a4a6a');
        archGrad.addColorStop(0.5, '#1a3a5a');
        archGrad.addColorStop(1, '#0d2035');
        ctx.fillStyle = archGrad;
        ctx.fillRect(-18, 0, ts + 36, 16);
        
        // Architrave details - engraved lines
        ctx.strokeStyle = 'rgba(55, 196, 255, 0.12)';
        ctx.lineWidth = 1.2;
        for (let i = 1; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(-8, i * 3.2);
            ctx.lineTo(ts + 8, i * 3.2);
            ctx.stroke();
        }
        
        // Central keystone on architrave - prominent
        ctx.fillStyle = '#1a3a5a';
        ctx.beginPath();
        ctx.roundRect(cx - 24, 0, 48, 16, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(55, 196, 255, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Keystone symbol - larger
        ctx.fillStyle = 'rgba(55, 196, 255, 0.5)';
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('∑', cx, 8);
        
        // Door frame proper (inner) - deeper recess
        const frameGrad = ctx.createLinearGradient(0, 0, ts, 0);
        frameGrad.addColorStop(0, '#0f2030');
        frameGrad.addColorStop(0.5, '#1a3a5a');
        frameGrad.addColorStop(1, '#0f2030');
        ctx.fillStyle = frameGrad;
        ctx.fillRect(-3, 16, ts + 6, h - 34);
        
        // Frame inner edge highlight - cian accent
        ctx.strokeStyle = 'rgba(55, 196, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-2, 16.5, ts + 5, h - 35);
    }
    
    renderColumn(ctx, x, y, h, side) {
        const ts = this.tileSize;
        const colW = 10;
        const colX = x + (side === -1 ? 0 : 0);
        
        // Column base
        const baseGrad = ctx.createLinearGradient(0, y, colW, y);
        baseGrad.addColorStop(0, '#1a2a3a');
        baseGrad.addColorStop(0.5, '#2a4a6a');
        baseGrad.addColorStop(1, '#1a2a3a');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(colX + (side === -1 ? -colW : 0), y, colW, h);
        
        // Column fluting (vertical grooves)
        ctx.strokeStyle = 'rgba(55, 196, 255, 0.08)';
        ctx.lineWidth = 0.8;
        const flutes = 3;
        for (let i = 0; i < flutes; i++) {
            const fx = colX + (side === -1 ? 1.5 : 1.5) + (colW - 3) * i / (flutes - 1);
            ctx.beginPath();
            ctx.moveTo(fx, y + 10);
            ctx.lineTo(fx, y + h - 10);
            ctx.stroke();
        }
        
        // Column capital (top ornament)
        const capY = y + 14;
        ctx.fillStyle = '#1a3a5a';
        ctx.fillRect(colX - 3 + (side === -1 ? -colW : 0), capY, colW + 6, 6);
        ctx.strokeStyle = 'rgba(55, 196, 255, 0.2)';
        ctx.strokeRect(colX - 2.5 + (side === -1 ? -colW : 0), capY, colW + 5, 5);
        
        // Column base ornament
        const baseOrnY = y + h - 12;
        ctx.fillStyle = '#1a3a5a';
        ctx.fillRect(colX - 3 + (side === -1 ? -colW : 0), baseOrnY, colW + 6, 6);
        ctx.strokeStyle = 'rgba(55, 196, 255, 0.2)';
        ctx.strokeRect(colX - 2.5 + (side === -1 ? -colW : 0), baseOrnY, colW + 5, 5);
    }
    
    renderConduits(ctx) {
        const ts = this.tileSize;
        const h = this.height;
        
        this.conduits.forEach((conduit, ci) => {
            const x = conduit.side === -1 ? 6 : ts - 6;
            const conduitGlow = conduit.glow;
            
            // Conduit housing (recessed channel) - deeper channel
            const housingGrad = ctx.createLinearGradient(x - 6, 0, x + 6, 0);
            housingGrad.addColorStop(0, '#050f18');
            housingGrad.addColorStop(0.5, '#071520');
            housingGrad.addColorStop(1, '#050f18');
            ctx.fillStyle = housingGrad;
            ctx.fillRect(x - 6, 16, 12, h - 32);
            
            // Housing edges - cian accent line
            ctx.strokeStyle = 'rgba(55, 196, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - 6, 16);
            ctx.lineTo(x - 6, h - 16);
            ctx.moveTo(x + 6, 16);
            ctx.lineTo(x + 6, h - 16);
            ctx.stroke();
            
            // Conduit segments with dynamic charge
            conduit.segments.forEach((seg, si) => {
                const charge = seg.charge;
                const glow = conduit.glow;
                const intensity = Math.max(charge, glow * 0.5);
                
                if (intensity < 0.02) return;
                
                // Segment background alcove
                ctx.fillStyle = `rgba(5, 15, 30, ${0.6 + intensity * 0.3})`;
                ctx.fillRect(x - 5, seg.y - 1, 10, 2);
                
                // Energy core - pulsating with stronger color
                const coreIntensity = 0.8 + intensity * 0.4;
                const coreColor = this.state === DoorState.UNLOCKING && this.unlockStage >= 2 ? 
                    'rgba(255, 215, 0, ' : 'rgba(55, 196, 255, ';
                const coreGrad = ctx.createRadialGradient(x, seg.y, 0, x, seg.y, 6 * coreIntensity);
                coreGrad.addColorStop(0, coreColor + `${0.7 * coreIntensity})`);
                coreGrad.addColorStop(0.5, coreColor + `${0.3 * coreIntensity})`);
                coreGrad.addColorStop(1, coreColor + `0)`);
                ctx.fillStyle = coreGrad;
                ctx.beginPath();
                ctx.arc(x, seg.y, 4 + intensity * 3, 0, Math.PI * 2);
                ctx.fill();
                
                // Flow indicator when active - cian trail
                if (charge > 0.5) {
                    const flowY = seg.y + Math.sin(this.pulseTime * 6 + si) * 2;
                    ctx.fillStyle = `rgba(55, 196, 255, ${0.4 * charge})`;
                    ctx.beginPath();
                    ctx.arc(x, flowY, 2, 0, Math.PI * 2);
                    ctx.fill();
                    // Flow connector line
                    ctx.beginPath();
                    ctx.moveTo(x, seg.y);
                    ctx.lineTo(x, flowY);
                    ctx.strokeStyle = `rgba(55, 196, 255, ${0.3 * charge})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            });
            
            // Conduit glow aura - layered, two auras
            if (conduitGlow > 0.1) {
                ctx.save();
                ctx.globalAlpha = conduitGlow * 0.4;
                // Outer aura - larger, softer
                const auraGrad = ctx.createRadialGradient(x, h/2, 0, x, h/2, 35);
                auraGrad.addColorStop(0, 'rgba(55, 196, 255, 0.3)');
                auraGrad.addColorStop(1, 'rgba(55, 196, 255, 0)');
                ctx.fillStyle = auraGrad;
                ctx.fillRect(x - 25, 16, 50, h - 32);
                
                // Inner aura - smaller, brighter
                ctx.globalAlpha = conduitGlow * 0.2;
                const innerGrad = ctx.createRadialGradient(x, h/2, 0, x, h/2, 15);
                innerGrad.addColorStop(0, 'rgba(55, 196, 255, 0.5)');
                innerGrad.addColorStop(1, 'rgba(55, 196, 255, 0)');
                ctx.fillStyle = innerGrad;
                ctx.fillRect(x - 12, 16, 24, h - 32);
                ctx.restore();
            }
            
            // Conduit cap at top - subtle accent
            ctx.fillStyle = 'rgba(55, 196, 255, 0.08)';
            ctx.beginPath();
            if (conduit.side === -1) {
                ctx.arc(x - 6, 12, 3, 0, Math.PI * 2);
            } else {
                ctx.arc(x + 6, 12, 3, 0, Math.PI * 2);
            }
            ctx.fill();
        });
    }
    
    renderDoorPanels(ctx) {
        const ts = this.tileSize;
        const h = this.height;
        const panelH = (h - 20) / 2;
        const cx = ts / 2;
        
        // Panel separation from unlock
        const separation = this.panelSeparation * (panelH * 0.9);
        
        [0, 1].forEach((side, i) => {
            const isTop = i === 0;
            const y = 10 + i * (panelH + 10);
            const currentH = panelH;
            const offset = isTop ? -separation : separation;
            
            // Panel depth shadow (behind panel)
            if (separation > 0.1) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(8, y + offset + (isTop ? currentH : 0), ts - 16, 4);
            }
            
            // Panel background with stronger state differentiation
            const panelGrad = ctx.createLinearGradient(0, y + offset, ts, y + offset + currentH);
            if (this.state === DoorState.LOCKED) {
                // LOCKED: dark sealed appearance - deep charcoal with cyan accent strip
                panelGrad.addColorStop(0, '#0a1525');
                panelGrad.addColorStop(0.3, '#152a40');
                panelGrad.addColorStop(0.7, '#1a3a50');
                panelGrad.addColorStop(1, '#0d1f38');
                // Sealed accent stripe - horizontal band indicating closed state
                ctx.fillStyle = 'rgba(55, 196, 255, 0.08)';
                ctx.fillRect(8, y + currentH/2 - 1 + offset, ts - 16, 2);
            } else if (this.state === DoorState.UNLOCKING) {
                // UNLOCKING: transitioning from dark to activated - pulging bands
                panelGrad.addColorStop(0, '#1a2a45');
                panelGrad.addColorStop(0.5, '#2a4060');
                panelGrad.addColorStop(1, '#153050');
                // Unlocking accent pulse
                const pulse = Math.sin(this.pulseTime * 6) * 0.3 + 0.7;
                ctx.fillStyle = `rgba(55, 196, 255, ${0.2 * pulse})`;
                ctx.fillRect(8, y + offset, ts - 16, currentH);
            } else {
                // OPEN: bright activated state - lighter with green-cyan accents
                panelGrad.addColorStop(0, '#0a251a');
                panelGrad.addColorStop(0.5, '#1a3a2f');
                panelGrad.addColorStop(1, '#0d3025');
                // Open accent stripe - green indicating operable state
                ctx.fillStyle = 'rgba(80, 255, 120, 0.2)';
                ctx.fillRect(8, y + currentH/2 - 1 + offset, ts - 16, 2);
            }
            ctx.fillStyle = panelGrad;
            ctx.fillRect(8, y + offset, ts - 16, currentH);
            
            // Panel frame/border - stronger differentiation by state
            if (this.state === DoorState.LOCKED) {
                ctx.strokeStyle = 'rgba(55, 196, 255, 0.2)';
            } else if (this.state === DoorState.UNLOCKING) {
                ctx.strokeStyle = `rgba(55, 196, 255, ${0.5 + Math.sin(this.pulseTime * 4) * 0.3})`;
            } else {
                ctx.strokeStyle = 'rgba(80, 255, 120, 0.8)';
            }
            ctx.lineWidth = 2;
            ctx.strokeRect(8.5, y + 0.5 + offset, ts - 17, currentH - 1);
            
            // Inner panel detail frame
            if (this.state === DoorState.LOCKED) {
                ctx.strokeStyle = 'rgba(55, 196, 255, 0.15)';
            } else if (this.state === DoorState.UNLOCKING) {
                ctx.strokeStyle = `rgba(55, 196, 255, ${0.4 + Math.sin(this.pulseTime * 3) * 0.3})`;
            } else {
                ctx.strokeStyle = 'rgba(80, 255, 120, 0.4)';
            }
            ctx.lineWidth = 1;
            ctx.strokeRect(12, y + 4 + offset, ts - 24, currentH - 8);
            
            // Mechanical details (horizontal ribs)
            if (this.state === DoorState.LOCKED) {
                ctx.strokeStyle = 'rgba(55, 196, 255, 0.08)';
            } else if (this.state === DoorState.UNLOCKING) {
                ctx.strokeStyle = `rgba(55, 196, 255, ${0.2 + Math.sin(this.pulseTime * 3) * 0.3})`;
            } else {
                ctx.strokeStyle = 'rgba(80, 255, 120, 0.2)';
            }
            ctx.lineWidth = 1;
            for (let r = 1; r < 4; r++) {
                const ry = y + offset + currentH * r / 4;
                ctx.beginPath();
                ctx.moveTo(14, ry);
                ctx.lineTo(ts - 14, ry);
                ctx.stroke();
            }
            
            // Vertical reinforcement ribs
            if (this.state === DoorState.LOCKED) {
                ctx.strokeStyle = 'rgba(55, 196, 255, 0.1)';
            } else if (this.state === DoorState.UNLOCKING) {
                ctx.strokeStyle = `rgba(55, 196, 255, ${0.3 + Math.sin(this.pulseTime * 2) * 0.3})`;
            } else {
                ctx.strokeStyle = 'rgba(80, 255, 120, 0.25)';
            }
            ctx.lineWidth = 1;
            for (let r = 1; r < 3; r++) {
                const rx = 8 + (ts - 16) * r / 3;
                ctx.beginPath();
                ctx.moveTo(rx, y + 6 + offset);
                ctx.lineTo(rx, y + currentH - 6 + offset);
                ctx.stroke();
            }
            
            // Panel bolts/rivets at corners
            const boltPositions = [
                { x: 12, y: y + 6 + offset },
                { x: ts - 12, y: y + 6 + offset },
                { x: 12, y: y + currentH - 6 + offset },
                { x: ts - 12, y: y + currentH - 6 + offset }
            ];
            const boltColor = this.state === DoorState.LOCKED ? 'rgba(55, 196, 255, 0.2)' : 'rgba(80, 255, 120, 0.3)';
            const boltActiveColor = this.state === DoorState.UNLOCKING ? 'rgba(55, 196, 255, 0.5)' : 'rgba(80, 255, 120, 0.5)';
            boltPositions.forEach(b => {
                ctx.fillStyle = this.state === DoorState.LOCKED ? boltColor : boltActiveColor;
                ctx.beginPath();
                ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = this.state === DoorState.LOCKED ? 'rgba(55, 196, 255, 0.3)' : 'rgba(80, 255, 120, 0.5)';
                ctx.lineWidth = 1;
                ctx.stroke();
            });
            
            // Piston/actuator indicators (when unlocking)
            if (this.state === DoorState.UNLOCKING && this.unlockStage >= 3) {
                const pistonX = cx;
                const pistonY = y + offset + (isTop ? currentH : 0);
                ctx.fillStyle = `rgba(55, 196, 255, ${0.5 + Math.sin(this.pulseTime * 10) * 0.3})`;
                ctx.beginPath();
                ctx.roundRect(pistonX - 6, pistonY - 3, 12, 6, 2);
                ctx.fill();
            }
        });
    }
    
    renderMathSeal(ctx) {
        if (this.state === DoorState.OPEN) return;
        
        const ts = this.tileSize;
        const h = this.height;
        const cx = ts / 2;
        const cy = h / 2;
        
        // Seal charge pulse
        const pulse = Math.sin(this.pulseTime * 3) * 0.3 + 0.7;
        const chargePulse = this.sealCharge > 0 ? 
            Math.sin(this.pulseTime * 8) * 0.4 + 0.6 : 0;
        const unlockPulse = this.state === DoorState.UNLOCKING ? 
            Math.sin(this.pulseTime * 15) * this.sealCharge * 0.5 + this.sealCharge * 0.5 : 0;
        
        // Seal background ring (always visible when locked/unlocking) - refined
        const ringAlpha = this.state === DoorState.LOCKED ? 0.2 : (0.2 + this.sealCharge * 0.5);
        ctx.strokeStyle = `rgba(55, 196, 255, ${ringAlpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 30, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner ring
        ctx.strokeStyle = `rgba(55, 196, 255, ${ringAlpha * 0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.stroke();
        
        // Seal charge glow - expanded area
        if (this.sealCharge > 0 || this.unlockFlash > 0) {
            const intensity = Math.max(this.sealCharge, this.unlockFlash);
            const sealGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 45);
            sealGrad.addColorStop(0, `rgba(255, 215, 0, ${0.2 * intensity})`);
            sealGrad.addColorStop(0.5, `rgba(55, 196, 255, ${0.25 * intensity})`);
            sealGrad.addColorStop(1, 'rgba(55, 196, 255, 0)');
            ctx.fillStyle = sealGrad;
            ctx.fillRect(cx - 45, cy - 45, 90, 90);
        }
        
        // Lock symbol (when locked) OR charging seal (when unlocking)
        if (this.state === DoorState.LOCKED && this.sealCharge < 0.5) {
            // Traditional lock - larger, more prominent
            const lockPulse = Math.sin(this.pulseTime * 2) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(173, 107, 49, ${lockPulse})`;
            ctx.beginPath();
            ctx.roundRect(cx - 18, cy - 14, 36, 28, 6);
            ctx.fill();
            
            ctx.strokeStyle = '#8b5a2b';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Keyhole - larger
            ctx.fillStyle = `rgba(255, 200, 100, ${lockPulse})`;
            ctx.beginPath();
            ctx.arc(cx, cy + 4, 9, 0, Math.PI);
            ctx.fill();
            
            ctx.fillStyle = '#5a3515';
            ctx.beginPath();
            ctx.arc(cx, cy + 4, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Shackle - more dramatic
            const shackleY = cy - 14 + Math.sin(this.pulseTime * 3) * 2;
            ctx.strokeStyle = `rgba(173, 107, 49, ${lockPulse})`;
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - 14, shackleY);
            ctx.lineTo(cx - 10, cy - 8);
            ctx.arc(cx, cy - 8, 12, Math.PI, 0);
            ctx.lineTo(cx + 14, shackleY);
            ctx.stroke();
            
        } else {
            // Mathematical seal - enhanced readable symbols
            const symbols = ['∑', '∫', '∂', '∞', 'π', 'φ', 'λ', 'Δ', '∇', '⊕'];
            const symbolCount = 8;
            const baseRadius = 22 + this.sealCharge * 10;
            
            for (let i = 0; i < symbolCount; i++) {
                const angle = (i / symbolCount) * Math.PI * 2 - Math.PI / 2;
                const radius = baseRadius + Math.sin(this.pulseTime * 2 + i) * 4;
                const symbol = symbols[(i + Math.floor(this.pulseTime / 1.5)) % symbols.length];
                const symbolAlpha = (0.5 + this.sealCharge * 0.5) * (0.8 + chargePulse * 0.3);
                const symbolScale = 1.2 + chargePulse * 0.4;
                
                ctx.save();
                ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
                ctx.rotate(angle + Math.PI / 2);
                ctx.scale(symbolScale, symbolScale);
                ctx.globalAlpha = symbolAlpha;
                
                // Symbol glow - gold when charged, cian when building
                ctx.fillStyle = this.sealCharge > 0.5 ? 
                    `rgba(255, 215, 0, ${0.6 * symbolAlpha})` : 
                    `rgba(55, 196, 255, ${0.8 * symbolAlpha})`;
                ctx.font = 'bold 22px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(symbol, 0, 0);
                
                ctx.restore();
            }
            
            // Central core when charging - prominent golden core
            if (this.sealCharge > 0.3) {
                const coreSize = 14 + this.sealCharge * 20 + unlockPulse * 8;
                const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize);
                coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.8 * this.sealCharge})`);
                coreGrad.addColorStop(0.3, `rgba(255, 215, 0, ${0.6 * this.sealCharge})`);
                coreGrad.addColorStop(0.7, `rgba(55, 196, 255, ${0.4 * this.sealCharge})`);
                coreGrad.addColorStop(1, 'rgba(55, 196, 255, 0)');
                ctx.fillStyle = coreGrad;
                ctx.beginPath();
                ctx.arc(cx, cy, coreSize, 0, Math.PI * 2);
                ctx.fill();
                
                // Core pulse rings - when sufficiently charged
                if (this.sealCharge > 0.5) {
                    for (let r = 0; r < 4; r++) {
                        const ringR = coreSize + 8 + r * 6 + Math.sin(this.pulseTime * 4 + r * 2) * 4;
                        ctx.strokeStyle = `rgba(255, 215, 0, ${0.2 * this.sealCharge * (1 - r * 0.15)})`;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            }
        }
    }
    
    renderEnergyField(ctx) {
        if (this.glowIntensity < 0.01 && this.conduitEnergy < 0.01) return;
        
        const ts = this.tileSize;
        const h = this.height;
        const cx = ts / 2;
        const cy = h / 2;
        
        ctx.save();
        
        // Conduit energy field (vertical)
        if (this.conduitEnergy > 0.01) {
            ctx.globalAlpha = this.conduitEnergy * 0.25;
            const conduitGrad = ctx.createLinearGradient(cx - ts/2, 0, cx + ts/2, 0);
            conduitGrad.addColorStop(0, 'rgba(55, 196, 255, 0)');
            conduitGrad.addColorStop(0.3, 'rgba(55, 196, 255, 0.3)');
            conduitGrad.addColorStop(0.7, 'rgba(55, 196, 255, 0.3)');
            conduitGrad.addColorStop(1, 'rgba(55, 196, 255, 0)');
            ctx.fillStyle = conduitGrad;
            ctx.fillRect(0, 0, ts, h);
        }
        
        // Seal energy field (radial)
        if (this.sealCharge > 0.01 || this.glowIntensity > 0.01) {
            const intensity = Math.max(this.sealCharge, this.glowIntensity);
            ctx.globalAlpha = intensity * 0.3;
            
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts * 0.9);
            if (this.sealCharge > 0.5) {
                grad.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
                grad.addColorStop(0.4, 'rgba(55, 196, 255, 0.2)');
                grad.addColorStop(1, 'rgba(55, 196, 255, 0)');
            } else {
                grad.addColorStop(0, 'rgba(55, 196, 255, 0.4)');
                grad.addColorStop(1, 'rgba(55, 196, 255, 0)');
            }
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, ts, h);
            
            // Expanding rings
            if (this.sealCharge > 0.3) {
                ctx.strokeStyle = this.sealCharge > 0.5 ? 
                    'rgba(255, 215, 0, 0.4)' : 'rgba(55, 196, 255, 0.4)';
                ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    const r = (this.pulseTime * 60 + i * 40) % (ts * 0.7);
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }
        
        // Unlock flash
        if (this.unlockFlash > 0) {
            ctx.globalAlpha = this.unlockFlash * 0.6;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, ts, h);
        }
        
        ctx.restore();
    }
    
    renderInteractionHint(ctx) {
        const ts = this.tileSize;
        const cx = ts / 2;
        const cy = -38 + Math.sin(this.pulseTime * 3) * 4;
        
        ctx.save();
        ctx.globalAlpha = this.hintAlpha;
        ctx.translate(cx, cy);
        
        // Hint background with depth
        ctx.fillStyle = 'rgba(5, 15, 30, 0.98)';
        ctx.strokeStyle = '#37c4ff';
        ctx.lineWidth = 2;
        const w = 180;
        ctx.beginPath();
        ctx.roundRect(-w/2, -20, w, 40, 10);
        ctx.fill();
        ctx.stroke();
        
        // Inner glow
        ctx.strokeStyle = 'rgba(55, 196, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(-w/2 + 2, -18, w - 4, 36, 8);
        ctx.stroke();
        
        // Icon + text
        ctx.fillStyle = '#37c4ff';
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↑  INTERACTUAR', 0, -2);
        
        ctx.fillStyle = 'rgba(55, 196, 255, 0.6)';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillText('WASD / Flechas · A/B/C para responder', 0, 18);
        
        ctx.restore();
    }
}

class DoorParticle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 20;
        this.vy = -Math.random() * 40 - 10;
        this.life = 1.5;
        this.maxLife = 1.5;
        this.color = color;
        this.size = 2 + Math.random() * 4;
        this.dead = false;
        this.shape = Math.random() < 0.3 ? 'triangle' : 'circle';
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 8;
    }
    
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += 60 * dt;
        this.vx *= 0.98;
        this.rotation += this.rotationSpeed * dt;
        this.life -= dt;
        if (this.life <= 0) this.dead = true;
    }
    
    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        
        if (this.shape === 'triangle') {
            const s = this.size;
            ctx.beginPath();
            ctx.moveTo(0, -s);
            ctx.lineTo(s * 0.866, s * 0.5);
            ctx.lineTo(-s * 0.866, s * 0.5);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}