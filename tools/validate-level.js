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
    assert.deepEqual(levels.map(level => level.powerUp?.type), ['shield', 'pulse', 'heal'],
        'campaign should teach and vary math power-ups');
    assert.ok(levels[1].sentinel, 'level 2 needs a math-combat encounter');
    assert.ok(levels[2].boss, 'level 3 needs a boss encounter');
    assert.ok(levels[0].playerStart.y >= 120, 'level 1 player must begin below the HUD');
    assert.ok(levels[2].boss.y - 170 >= 110, 'boss telegraph must clear the HUD');
    assert.ok(levels[2].goal.x * 60 + 30 >= 85 && levels[2].goal.y * 60 + 30 >= 115 &&
        levels[2].goal.y * 60 + 30 <= 450, 'final portal must fit visibly inside the playfield');

    const { EncounterSystem } = await import('../js/systems/EncounterSystem.js');
    const encounter = new EncounterSystem();
    encounter.load(levels[0]);
    const shieldAction = encounter.actionNear({ x: levels[0].powerUp.x - 18, y: levels[0].powerUp.y - 20, width: 36, height: 44 });
    assert.equal(shieldAction?.kind, 'powerup', 'nearby station should offer a math challenge');
    encounter.resolve(shieldAction, true);
    assert.equal(encounter.shield, 1, 'correct station answer should grant shield');
    assert.equal(encounter.absorbHit(), true, 'shield should absorb one hit');
    assert.equal(encounter.absorbHit(), false, 'shield should be consumed');
    encounter.load(levels[1]);
    assert.equal(encounter.canActivateGoal(), false, 'live sentinel should hold level 2 goal');
    const sentinelAction = encounter.actionNear({ x: levels[1].sentinel.x - 18, y: levels[1].sentinel.y - 20, width: 36, height: 44 });
    assert.equal(sentinelAction?.kind, 'attack', 'sentinel should offer a math attack');
    assert.equal(encounter.resolve(sentinelAction, false).damage, 1, 'wrong attack should have a small penalty');
    assert.equal(encounter.canActivateGoal(), false, 'wrong answer cannot defeat sentinel');
    encounter.resolve(sentinelAction, true);
    assert.equal(encounter.canActivateGoal(), true, 'correct math attack should clear the goal');
    const pulseAction = encounter.actionNear({ x: levels[1].powerUp.x - 18, y: levels[1].powerUp.y - 20, width: 36, height: 44 });
    encounter.resolve(pulseAction, true);
    encounter.load(levels[2]);
    assert.equal(encounter.canActivateGoal(), false, 'boss should hold the final goal');
    const playerAtBoss = { x: levels[2].boss.x - 18, y: levels[2].boss.y - 20, width: 36, height: 44 };
    const firstSeal = encounter.actionNear(playerAtBoss);
    assert.equal(firstSeal?.ref, 'boss-1', 'first boss phase should request its own challenge');
    assert.equal(encounter.resolve(firstSeal, false).damage, 1, 'wrong boss answer should cost one hit');
    assert.equal(encounter.boss.health, 3, 'wrong answer must not damage boss');
    encounter.resolve(firstSeal, true);
    assert.equal(encounter.boss.phase, 2, 'correct answer should enter phase two');
    assert.equal(encounter.boss.slow > 0, true, 'earned pulse should slow boss after a correct hit');
    encounter.resolve(firstSeal, true);
    assert.equal(encounter.boss.health, 2, 'stale phase answer must not hit twice');
    const secondSeal = encounter.actionNear(playerAtBoss);
    encounter.resolve(secondSeal, true);
    assert.equal(encounter.boss.phase, 3, 'boss should enter phase three');
    const thirdSeal = encounter.actionNear(playerAtBoss);
    encounter.resolve(thirdSeal, true);
    assert.equal(encounter.boss.health, 0, 'three correct boss answers should defeat it');
    assert.equal(encounter.canActivateGoal(), true, 'final goal should open after boss defeat');
    encounter.load(levels[2]);
    encounter.update(4.6, playerAtBoss, 4.5, true);
    assert.equal(encounter.boss.state, 'telegraph', 'boss attack must telegraph before landing');
    assert.equal(encounter.update(1.5, playerAtBoss, 4.5, true).hit, true,
        'standing in the announced attack should cause one hit');
    global.window = { game: { input: { getAnswerKey: () => null } } };
    global.Image = class { set src(value) {} };
    const { Goal } = await import('../js/entities/Goal.js');
    const gatedGoal = new Goal(1, 1);
    const playerAtGoal = { x: gatedGoal.x, y: gatedGoal.y, width: 36, height: 44 };
    gatedGoal.update(0.016, playerAtGoal, false);
    assert.equal(gatedGoal.activated, false, 'goal must not activate while encounter blocks it');
    assert.equal(gatedGoal.locked, true, 'blocked goal should expose a sealed state for rendering');
    assert.equal(DIFFICULTIES.explorador.startingLives, 4, 'explorador should have extra error tolerance');
    assert.equal(DIFFICULTIES.aventurero.startingLives, 3, 'aventurero should have standard lives');
    assert.equal(DIFFICULTIES.maestro.startingLives, 3, 'maestro should remain winnable');
    assert.deepEqual(difficultyIds.map(id => DIFFICULTIES[id].doorScore), [100, 125, 150],
        'risk and reward should scale with difficulty');
    assert.deepEqual(difficultyIds.map(id => DIFFICULTIES[id].answerSeconds), [0, 24, 16],
        'answer pressure should scale without timing out explorador');
    assert.ok(DIFFICULTIES.maestro.bossInterval < DIFFICULTIES.aventurero.bossInterval &&
        DIFFICULTIES.aventurero.bossInterval < DIFFICULTIES.explorador.bossInterval,
        'boss tempo should scale with difficulty');

    const { MathChallengeSystem } = await import('../js/systems/MathChallengeSystem.js');
    const timedChallenge = new MathChallengeSystem();
    timedChallenge.open(1, 'aventurero', 'main', () => {}, { answerSeconds: 1 });
    timedChallenge.update(1.1);
    assert.equal(timedChallenge.selectedAnswer, 'TIME', 'expired challenge should count as a wrong answer');
    timedChallenge.reset();
    timedChallenge.open(1, 'aventurero', 'main', () => {}, {});
    timedChallenge.submitAnswer(ChallengeBank.resolve(1, 'aventurero', 'main').correct);
    timedChallenge.update(0.5);
    assert.ok(timedChallenge.resultTimer / timedChallenge.closeDelay > 0.45,
        'feedback progress should advance in seconds, not milliseconds');
    timedChallenge.reset();

    for (const level of levels) {
        assert.ok(level.playerStart && level.goal, `level ${level.id} needs start and goal`);
        assert.ok(Array.isArray(level.doors) && level.doors.length > 0, `level ${level.id} needs doors`);
        assert.equal(level.tilemap.length, level.height, `level ${level.id} height mismatch`);
        assert.ok(level.tilemap.every(row => row.length === level.width), `level ${level.id} width mismatch`);
        assert.equal(canReachGoal(level, true), false, `level ${level.id} bypasses closed door`);
        assert.equal(canReachGoal(level, false), true, `level ${level.id} goal is blocked after opening`);

        for (const difficulty of difficultyIds) {
            const encounterRefs = level.number === 1 ? ['shield'] :
                level.number === 2 ? ['pulse', 'attack'] : ['heal', 'boss-1', 'boss-2', 'boss-3'];
            for (const ref of encounterRefs) {
                const encounterChallenge = ChallengeBank.resolve(level.number, difficulty, ref);
                assert.ok(encounterChallenge, `missing ${ref} challenge for ${level.number}/${difficulty}`);
                assert.deepEqual(Object.keys(encounterChallenge.options), ['A', 'B', 'C']);
                assert.ok(Object.hasOwn(encounterChallenge.options, encounterChallenge.correct));
            }
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
    for (const difficulty of difficultyIds) {
        const mainAnswers = levels.map(level => ChallengeBank.resolve(level.number, difficulty, 'main').correct);
        assert.ok(new Set(mainAnswers).size > 1, `${difficulty} must not teach a fixed answer position`);
    }
    assert.equal(new Set(challenges.map(challenge => challenge.id)).size, challenges.length, 'challenge ids must be unique');
    console.log(`PASS: ${levels.length} independent levels validated`);
    console.log(`PASS: ${difficultyIds.length} difficulties validated`);
    console.log(`PASS: ${challenges.length} challenges validated across every level+difficulty`);
    console.log('PASS: closed doors block and open doors allow every goal');
})().catch(error => {
    console.error('FAIR EDITION VALIDATION FAILED:', error.message);
    process.exit(1);
});
