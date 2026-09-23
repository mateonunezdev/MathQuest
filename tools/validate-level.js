#!/usr/bin/env node

const assert = require('assert/strict');

const EXPECTED_LEVELS = [
    'TEMPLO DE LOS NÚMEROS',
    'OBSERVATORIO DE LAS PROPORCIONES',
    'NÚCLEO DE LA LÓGICA'
];

function tileOf(position, tileSize) {
    return {
        x: Math.floor(position.x / tileSize),
        y: Math.floor(position.y / tileSize)
    };
}

function isWalkable(level, x, y, doorsBlock) {
    if (x < 0 || y < 0 || x >= level.width || y >= level.height) return false;
    if (level.tilemap[y][x] === 1) return false;
    if (!doorsBlock) return true;
    return !level.doors.some(door => (
        x === door.x && y >= door.y && y < door.y + (door.height || 2)
    ));
}

function canReachGoal(level, doorsBlock) {
    const start = tileOf(level.playerStart, level.tileSize);
    const goal = level.goal;
    const visited = new Set([`${start.x},${start.y}`]);
    const queue = [start];
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    while (queue.length > 0) {
        const current = queue.shift();
        if (current.x === goal.x && current.y === goal.y) return true;
        for (const [dx, dy] of directions) {
            const next = { x: current.x + dx, y: current.y + dy };
            const key = `${next.x},${next.y}`;
            if (!visited.has(key) && isWalkable(level, next.x, next.y, doorsBlock)) {
                visited.add(key);
                queue.push(next);
            }
        }
    }
    return false;
}

(async () => {
    const { LevelData } = await import('../js/levels/LevelData.js');
    const { ChallengeBank, DIFFICULTIES } = await import('../js/levels/ChallengeBank.js');

    const levels = LevelData.getAllLevels();
    const difficultyIds = Object.keys(DIFFICULTIES);

    assert.equal(levels.length, 3, 'campaign must expose exactly 3 levels');
    assert.deepEqual(levels.map(level => level.name), EXPECTED_LEVELS, 'campaign level names differ');
    assert.equal(new Set(levels.map(level => level.id)).size, 3, 'level ids must be unique');
    assert.equal(new Set(levels.map(level => JSON.stringify(level.tilemap))).size, 3, 'levels must use independent layouts');
    assert.deepEqual(difficultyIds, ['explorador', 'aventurero', 'maestro'], 'difficulty ids differ');

    for (const level of levels) {
        assert.ok(level.playerStart && level.goal, `level ${level.id} needs start and goal`);
        assert.ok(Array.isArray(level.doors) && level.doors.length > 0, `level ${level.id} needs doors`);
        assert.equal(level.tilemap.length, level.height, `level ${level.id} height mismatch`);
        assert.ok(level.tilemap.every(row => row.length === level.width), `level ${level.id} width mismatch`);
        assert.equal(canReachGoal(level, true), false, `level ${level.id} bypasses closed door`);
        assert.equal(canReachGoal(level, false), true, `level ${level.id} goal is blocked after opening`);

        for (const difficulty of difficultyIds) {
            for (const door of level.doors) {
                const challenge = ChallengeBank.resolve(level.number, difficulty, door.challengeRef);
                assert.ok(challenge, `missing challenge for level ${level.number}/${difficulty}/${door.challengeRef}`);
                assert.equal(challenge.level, level.number, `challenge ${challenge.id} level mismatch`);
                assert.equal(challenge.difficulty, difficulty, `challenge ${challenge.id} difficulty mismatch`);
                assert.ok(challenge.skill && challenge.question, `challenge ${challenge.id} lacks content`);
                assert.deepEqual(Object.keys(challenge.options), ['A', 'B', 'C'], `challenge ${challenge.id} needs A/B/C`);
                assert.ok(Object.hasOwn(challenge.options, challenge.correct), `challenge ${challenge.id} has invalid answer`);
            }
        }
    }

    const challenges = ChallengeBank.getAll();
    assert.equal(new Set(challenges.map(challenge => challenge.id)).size, challenges.length, 'challenge ids must be unique');
    console.log(`PASS: ${levels.length} independent levels validated`);
    console.log(`PASS: ${difficultyIds.length} difficulties validated`);
    console.log(`PASS: ${challenges.length} challenges validated across every level+difficulty`);
    console.log('PASS: closed doors block and open doors allow every goal');
})().catch(error => {
    console.error('FAIR EDITION VALIDATION FAILED:', error.message);
    process.exit(1);
});
