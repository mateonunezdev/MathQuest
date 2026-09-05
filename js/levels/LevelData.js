export class LevelData {
    static getLevel(levelNum) {
        if (levelNum === 1) return this.level1();
        return this.level1();
    }

    static level1() {
        const width = 16;
        const height = 9;
        const tileSize = 60;

        // Layout: ZONA IZQUIERDA → corredor → [PUERTA ÚNICA] → corredor → ZONA DERECHA → GOAL
        // Mientras puerta CERRADA: start → goal = IMPOSIBLE
        // Mientras puerta ABIERTA: start → goal = POSIBLE
        
        const tilemap = [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,0,0,0,0,1,1,1,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ];

        return {
            width,
            height,
            tileSize,
            tilemap,
            playerStart: { x: 1 * tileSize + 12, y: 1 * tileSize + 8 },
            door: { x: 11, y: 4, challengeId: 'door1' },
            goal: { x: 14, y: 7 },
            decorations: this.generateDecorations({ width, height, tilemap })
        };
    }

    static generateDecorations(level) {
        const decorations = [];
        const ts = level.tileSize;

        for (let y = 0; y < level.height; y++) {
            for (let x = 0; x < level.width; x++) {
                if (level.tilemap[y][x] === 0) {
                    const seed = (x * 1234 + y * 5678) % 100;

                    if (seed < 8) {
                        decorations.push(new FloorDecoration(x * ts, y * ts, ts, seed));
                    } else if (seed < 12) {
                        decorations.push(new CircuitDecoration(x * ts, y * ts, ts, seed));
                    } else if (seed < 14) {
                        decorations.push(new MathSymbolDecoration(x * ts, y * ts, ts, seed));
                    }
                } else if (level.tilemap[y][x] === 1) {
                    const seed = (x * 1234 + y * 5678) % 100;
                    if (seed < 5) {
                        decorations.push(new WallDecoration(x * ts, y * ts, ts, seed));
                    }
                }
            }
        }

        return decorations;
    }
}
