export class InputSystem {
    constructor() {
        this.keys = new Set();
        this.keysPressed = new Set();
        this.keysReleased = new Set();
        this.onStartPressed = null;

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    onKeyDown(e) {
        const key = e.key.toLowerCase();
        if (!this.keys.has(key)) {
            this.keysPressed.add(key);
        }
        this.keys.add(key);

        if (key === 'enter' || key === ' ') {
            if (this.onStartPressed) this.onStartPressed();
        }

        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
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

    isDown(key) {
        return this.keys.has(key.toLowerCase());
    }

    wasPressed(key) {
        return this.keysPressed.has(key.toLowerCase());
    }

    wasReleased(key) {
        return this.keysReleased.has(key.toLowerCase());
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
        if (this.wasPressed('a')) return 'A';
        if (this.wasPressed('b')) return 'B';
        if (this.wasPressed('c')) return 'C';
        return null;
    }
}