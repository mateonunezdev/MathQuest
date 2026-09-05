export class CollisionSystem {
    constructor() {
        this.tileSize = 60;
    }

    resolve(entity, level, door, dt) {
        const dx = entity.vx * dt;
        const dy = entity.vy * dt;

        const nextX = entity.x + dx;
        const nextY = entity.y + dy;

        const hitX = this.checkCollision(entity.x + dx, entity.y, entity.width, entity.height, level, door);
        const hitY = this.checkCollision(entity.x, entity.y + dy, entity.width, entity.height, level, door);
        const hitDoor = this.checkDoorCollision(entity.x + dx, entity.y + dy, entity.width, entity.height, door);

        const collisionInfo = {
            hitX,
            hitY,
            hitDoor,
            hitWall: hitX || hitY,
            hitAny: hitX || hitY || hitDoor
        };

        if (!hitX) entity.x = nextX;
        else entity.vx = 0;

        if (!hitY) entity.y = nextY;
        else entity.vy = 0;

        entity.x = Math.max(0, Math.min(entity.x, level.width * this.tileSize - entity.width));
        entity.y = Math.max(0, Math.min(entity.y, level.height * this.tileSize - entity.height));

        return collisionInfo;
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

        return false;
    }

    checkDoorCollision(x, y, width, height, door) {
        if (!door || !door.isBlocking()) return false;
        
        const doorLeft = door.x;
        const doorRight = door.x + door.width;
        const doorTop = door.y;
        const doorBottom = door.y + door.height;

        if (x < doorRight && x + width > doorLeft && y < doorBottom && y + height > doorTop) {
            return true;
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