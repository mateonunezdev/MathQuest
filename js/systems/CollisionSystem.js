export class CollisionSystem {
    constructor() {
        this.tileSize = 60;
    }

    resolve(entity, level, door) {
        const nextX = entity.x + entity.vx;
        const nextY = entity.y + entity.vy;

        const hitX = this.checkCollision(nextX, entity.y, entity.width, entity.height, level, door);
        const hitY = this.checkCollision(entity.x, nextY, entity.width, entity.height, level, door);

        if (!hitX) entity.x = nextX;
        else entity.vx = 0;

        if (!hitY) entity.y = nextY;
        else entity.vy = 0;

        entity.x = Math.max(0, Math.min(entity.x, level.width * this.tileSize - entity.width));
        entity.y = Math.max(0, Math.min(entity.y, level.height * this.tileSize - entity.height));
    }

    checkCollision(x, y, width, height, level, door) {
        const tileSize = this.tileSize;
        const left = Math.floor(x / tileSize);
        const right = Math.floor((x + width - 1) / tileSize);
        const top = Math.floor(y / tileSize);
        const bottom = Math.floor((y + height - 1) / tileSize);

        for (let ty = top; ty <= bottom; ty++) {
            for (let tx = left; tx <= right; tx++) {
                if (tx < 0 || ty < 0 || tx >= level.width || ty >= level.height) return true;
                const tile = level.tilemap[ty]?.[tx];
                if (tile === 1) return true;
            }
        }

        // Check door: if door exists and is locked, block passage
        if (door && door.locked) {
            const doorLeft = door.x;
            const doorRight = door.x + door.width;
            const doorTop = door.y;
            const doorBottom = door.y + door.height;

            if (x < doorRight && x + width > doorLeft && y < doorBottom && y + height > doorTop) {
                return true;
            }
        }

        return false;
    }

    checkTile(x, y, level) {
        const tx = Math.floor(x / this.tileSize);
        const ty = Math.floor(y / this.tileSize);
        if (tx < 0 || ty < 0 || tx >= level.width || ty >= level.height) return 1;
        return level.tilemap[ty]?.[tx] ?? 1;
    }
}