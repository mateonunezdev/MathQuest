export class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.muted = false;
        this.masterVolume = 0.7;
        this.sounds = {};
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = this.masterVolume;
            
            // Generate all sounds programmatically
            this.generateSounds();
            this.initialized = true;
        } catch (e) {
            console.warn('Audio initialization failed:', e);
        }
    }

    generateSounds() {
        // UI Click - short high-pitched click
        this.sounds.uiClick = this.createTone(800, 0.05, 'sine', 0.3);
        
        // Incorrect answer - low descending tone
        this.sounds.incorrect = this.createToneSequence([
            { freq: 300, dur: 0.15, type: 'sawtooth', gain: 0.4 },
            { freq: 200, dur: 0.2, type: 'sawtooth', gain: 0.3 },
            { freq: 150, dur: 0.3, type: 'sawtooth', gain: 0.2 }
        ]);
        
        // Correct answer - ascending major chord
        this.sounds.correct = this.createToneSequence([
            { freq: 523.25, dur: 0.1, type: 'sine', gain: 0.3 },  // C5
            { freq: 659.25, dur: 0.1, type: 'sine', gain: 0.3 },  // E5
            { freq: 783.99, dur: 0.2, type: 'sine', gain: 0.4 },  // G5
            { freq: 1046.50, dur: 0.3, type: 'sine', gain: 0.3 }  // C6
        ], 0.05);
        
        // Door charge - rising pitch with modulation
        this.sounds.doorCharge = this.createToneSequence([
            { freq: 100, dur: 0.5, type: 'sine', gain: 0.2, freqEnd: 300 },
            { freq: 300, dur: 0.5, type: 'sine', gain: 0.3, freqEnd: 600 },
            { freq: 600, dur: 0.5, type: 'sine', gain: 0.3, freqEnd: 1000 }
        ], 0.1);
        
        // Door unlock - satisfying chord + sparkle
        this.sounds.doorUnlock = this.createToneSequence([
            { freq: 523.25, dur: 0.15, type: 'sine', gain: 0.4 },  // C5
            { freq: 659.25, dur: 0.15, type: 'sine', gain: 0.4 },  // E5
            { freq: 783.99, dur: 0.15, type: 'sine', gain: 0.5 },  // G5
            { freq: 1046.50, dur: 0.2, type: 'sine', gain: 0.4 },  // C6
            { freq: 1318.51, dur: 0.25, type: 'sine', gain: 0.3 }, // E6
            { freq: 1567.98, dur: 0.3, type: 'sine', gain: 0.2 }   // G6
        ], 0.03);
        
        // Core activation - deep resonant tone + harmonics
        this.sounds.coreActivate = this.createToneSequence([
            { freq: 65.41, dur: 0.5, type: 'sine', gain: 0.4 },   // C2
            { freq: 130.81, dur: 0.5, type: 'sine', gain: 0.3 },  // C3
            { freq: 261.63, dur: 0.5, type: 'sine', gain: 0.3 },  // C4
            { freq: 523.25, dur: 0.5, type: 'sine', gain: 0.2 },  // C5
            { freq: 1046.50, dur: 0.5, type: 'sine', gain: 0.2 }  // C6
        ], 0.1);
        
        // Victory - triumphant fanfare
        this.sounds.victory = this.createToneSequence([
            { freq: 523.25, dur: 0.1, type: 'triangle', gain: 0.4 },  // C5
            { freq: 659.25, dur: 0.1, type: 'triangle', gain: 0.4 },  // E5
            { freq: 783.99, dur: 0.1, type: 'triangle', gain: 0.4 },  // G5
            { freq: 1046.50, dur: 0.15, type: 'triangle', gain: 0.5 }, // C6
            { freq: 1318.51, dur: 0.15, type: 'triangle', gain: 0.4 }, // E6
            { freq: 1567.98, dur: 0.2, type: 'triangle', gain: 0.4 }, // G6
            { freq: 2093.00, dur: 0.5, type: 'triangle', gain: 0.5 }  // C7
        ], 0.05);
        
        // Door hit/blocked - dull thud
        this.sounds.doorHit = this.createTone(120, 0.15, 'sawtooth', 0.4);
        
        // Footstep - subtle
        this.sounds.footstep = this.createNoise(0.05, 0.15);
        
        // UI hover
        this.sounds.uiHover = this.createTone(1000, 0.03, 'sine', 0.15);
    }

    createTone(frequency, duration, type = 'sine', gain = 0.3, freqEnd = null) {
        return (ctx, time) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.type = type;
            osc.frequency.value = frequency;
            
            if (freqEnd !== null) {
                osc.frequency.setValueAtTime(frequency, time);
                osc.frequency.exponentialRampToValueAtTime(freqEnd, time + duration);
            }
            
            gainNode.gain.setValueAtTime(gain, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
            
            osc.connect(gainNode);
            gainNode.connect(this.masterGain || ctx.destination);
            
            osc.start(time);
            osc.stop(time + duration);
        };
    }

    createToneSequence(notes, gap = 0) {
        return (ctx, time) => {
            notes.forEach((note, i) => {
                const noteTime = time + i * (note.dur + gap);
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.type = note.type || 'sine';
                osc.frequency.value = note.freq;
                
                if (note.freqEnd !== undefined) {
                    osc.frequency.setValueAtTime(note.freq, noteTime);
                    osc.frequency.exponentialRampToValueAtTime(note.freqEnd, noteTime + note.dur);
                }
                
                gain.gain.setValueAtTime(note.gain || 0.3, noteTime);
                gain.gain.exponentialRampToValueAtTime(0.001, noteTime + note.dur);
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.start(noteTime);
                osc.stop(noteTime + note.dur);
            });
        };
    }

    createNoise(duration, gain = 0.3) {
        return (ctx, time) => {
            const bufferSize = Math.floor(ctx.sampleRate * duration);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            
            const gainNode = ctx.createGain();
            gainNode.gain.setValueAtTime(gain, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
            
            noise.connect(gainNode);
            gainNode.connect(this.masterGain || ctx.destination);
            
            noise.start(time);
            noise.stop(time + duration);
        };
    }

    play(soundName) {
        if (!this.initialized || this.muted) return;
        if (!this.audioContext) return;
        
        const sound = this.sounds[soundName];
        if (sound) {
            try {
                sound(this.audioContext, this.audioContext.currentTime);
            } catch (e) {
                console.warn(`Failed to play sound ${soundName}:`, e);
            }
        }
    }

    playFootstep() {
        // Play quieter, randomized footstep
        if (!this.initialized || this.muted) return;
        if (!this.audioContext) return;
        
        const ctx = this.audioContext;
        
        // Light footstep - very subtle
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 60 + Math.random() * 40;
        
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
    }

    setMuted(muted) {
        this.muted = muted;
        if (this.masterGain) {
            this.masterGain.gain.value = muted ? 0 : this.masterVolume;
        }
    }

    toggleMute() {
        this.setMuted(!this.muted);
        return this.muted;
    }

    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain && !this.muted) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }
}

export const audioSystem = new AudioSystem();