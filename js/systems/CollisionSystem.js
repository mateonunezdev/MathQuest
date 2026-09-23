export class CollisionSystem {
    constructor() {
        this.tileSize = 60;
    }

    resolve(entity, level, doors, dt) {
        const dx = entity.vx * dt;
        const dy = entity.vy * dt;

        const nextX = entity.x + dx;
        const nextY = entity.y + dy;

        const hitX = this.checkCollision(entity.x + dx, entity.y, entity.width, entity.height, level);
        const hitY = this.checkCollision(entity.x, entity.y + dy, entity.width, entity.height, level);
        const blockingDoor = this.findDoorCollision(entity.x + dx, entity.y + dy, entity.width, entity.height, doors);
        const hitDoor = Boolean(blockingDoor);

        const collisionInfo = {
            hitX,
            hitY,
            hitDoor,
            hitWall: hitX || hitY,
            hitAny: hitX || hitY || hitDoor,
            door: blockingDoor
        };

        if (!hitX && !hitDoor) entity.x = nextX;
        else entity.vx = 0;

        if (!hitY && !hitDoor) entity.y = nextY;
        else entity.vy = 0;

        entity.x = Math.max(0, Math.min(entity.x, level.width * this.tileSize - entity.width));
        entity.y = Math.max(0, Math.min(entity.y, level.height * this.tileSize - entity.height));

        return collisionInfo;
    }

    checkCollision(x, y, width, height, level) {
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

    findDoorCollision(x, y, width, height, doors) {
        const doorList = Array.isArray(doors) ? doors : (doors ? [doors] : []);
        return doorList.find(door => (
            door.isBlocking() &&
            x < door.x + door.width &&
            x + width > door.x &&
            y < door.y + door.height &&
            y + height > door.y
        )) || null;
    }

    checkTile(x, y, level) {
        const tx = Math.floor(x / this.tileSize);
        const ty = Math.floor(y / this.tileSize);
        if (tx < 0 || ty < 0 || tx >= level.width || ty >= level.height) return 1;
        return level.tilemap[ty]?.[tx] ?? 1;
    }
}
