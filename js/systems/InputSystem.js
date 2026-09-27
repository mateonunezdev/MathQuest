export class InputSystem {
    constructor() {
        this.keys = new Set();
        this.keysPressed = new Set();
        this.keysReleased = new Set();
        this.onMenuInput = null;
        this.context = 'EXPLORATION';

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        window.addEventListener('blur', () => this.clear());
    }

    onKeyDown(e) {
        const key = e.key.toLowerCase();
        const isFirstPress = !this.keys.has(key);
        if (!this.keys.has(key)) {
            this.keysPressed.add(key);
        }
        this.keys.add(key);

        if (isFirstPress && !e.repeat && this.onMenuInput) {
            this.onMenuInput(key);
        }

        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'e', 'j', 'k', 'l'].includes(key)) {
            e.preventDefault();
        }
    }

    onKeyUp(e) {
        const key = e.key.toLowerCase();
        this.keys.delete(key);
        this.keysReleased.add(key);
    }

    update() {
        this.keysPressed.clear();
        this.keysReleased.clear();
    }

    clear() {
        this.keys.clear();
        this.keysPressed.clear();
        this.keysReleased.clear();
    }

    isDown(key) {
        return this.keys.has(key.toLowerCase());
    }

    wasPressed(key) {
        return this.keysPressed.has(key.toLowerCase());
    }

    wasReleased(key) {
        return this.keysReleased.has(key.toLowerCase());
    }

    wasActionPressed(action) {
        if (this.context === 'CHALLENGE' && action !== 'START') return false;
        if (this.context === 'CINEMATIC' && action !== 'START') return false;
        if (this.context === 'MENU' && action !== 'START') return false;
        const bindings = {
            BUTTON_A: ['j'],
            BUTTON_B: ['k'],
            BUTTON_C: ['l'],
            INTERACT: ['e', ' '],
            START: ['enter']
        };
        return (bindings[action] || []).some(key => this.wasPressed(key));
    }

    getMovementVector() {
        let x = 0, y = 0;
        if (this.isDown('arrowup') || this.isDown('w')) y = -1;
        if (this.isDown('arrowdown') || this.isDown('s')) y = 1;
        if (this.isDown('arrowleft') || this.isDown('a')) x = -1;
        if (this.isDown('arrowright') || this.isDown('d')) x = 1;
        return { x, y };
    }

    getAnswerKey() {
        if (this.context !== 'CHALLENGE') return null;
        if (this.wasPressed('a') || this.wasPressed('j')) return 'A';
        if (this.wasPressed('b') || this.wasPressed('k')) return 'B';
        if (this.wasPressed('c') || this.wasPressed('l')) return 'C';
        return null;
    }

    setContext(context) {
        const allowed = ['MENU', 'EXPLORATION', 'ESCAPE', 'COMBAT', 'CHALLENGE', 'CINEMATIC'];
        if (!allowed.includes(context) || context === this.context) return;
        this.context = context;
        if (['MENU', 'CHALLENGE', 'CINEMATIC'].includes(context)) this.clear();
        else {
            this.keysPressed.clear();
            this.keysReleased.clear();
        }
    }
}
