import assert from 'node:assert/strict';
import { AdventureModel } from '../js/levels/AdventureModel.js';

const still = { move: { x: 0, y: 0 } };
const step = (model, seconds, actions = still) => {
    for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) model.step(1 / 60, actions);
};
const stand = (model, x, y) => {
    model.player.x = x - model.player.width / 2;
    model.player.y = y - model.player.height / 2;
};

const world = new AdventureModel('aventurero');
assert.ok(world.rooms.length >= 8 && world.width > 6000,
    'Level 1 must require travel across distinct spaces');
assert.equal(world.phase, 'intro', 'a new expedition begins with the cinematic');
step(world, 7.5);
assert.equal(world.phase, 'playing', 'cinematic hands control to the player');

const puzzle = new AdventureModel('aventurero');
puzzle.skipIntro();
const puzzleRoom = puzzle.rooms.find(room => room.id === 'sequence');
stand(puzzle, puzzleRoom.x + puzzleRoom.width - 70, 280);
step(puzzle, 0.3, { move: { x: 1, y: 0 } });
assert.ok(puzzle.player.x < puzzleRoom.x + puzzleRoom.width,
    'unsolved sequence blocks passage to the hazard');
const wrongPlate = puzzle.puzzle.plates.find(plate => !plate.correct);
stand(puzzle, wrongPlate.x, wrongPlate.y);
step(puzzle, 0.04);
assert.equal(puzzle.progress.sequence, false, 'wrong floor plate does not solve the puzzle');
assert.equal(puzzle.lives, puzzle.maxLives, 'wrong floor plate causes no life loss');
step(puzzle, 1);
const correctPlate = puzzle.puzzle.plates.find(plate => plate.correct);
stand(puzzle, correctPlate.x, correctPlate.y);
step(puzzle, 0.04);
assert.equal(puzzle.progress.sequence, true, 'correct physical plate opens the route');
assert.ok(puzzle.energy > 0, 'environmental mathematics grants Math Energy');
assert.equal(puzzle.checkpoint.id, 'sequence', 'puzzle establishes a checkpoint');

const hazard = new AdventureModel('maestro');
hazard.skipIntro();
const pulse = hazard.rooms.find(room => room.id === 'pulse');
stand(hazard, pulse.x + 270, 280);
hazard.hazardClock = 0.75;
const beforeHit = hazard.lives;
step(hazard, 0.05);
assert.equal(hazard.lives, beforeHit - 1, 'active pulse causes one hit');
step(hazard, 0.2);
assert.equal(hazard.lives, beforeHit - 1, 'pulse cannot damage every frame');

const combat = new AdventureModel('aventurero');
combat.skipIntro();
const court = combat.rooms.find(room => room.id === 'sentinel');
stand(combat, court.x + 410, 280);
step(combat, 0.6);
assert.ok(['NOTICE', 'CHASE', 'WINDUP'].includes(combat.sentinel.state),
    'Sentinel engages instead of standing still');
combat.sentinel.x = combat.player.x + 60;
combat.sentinel.y = combat.player.y + 20;
combat.sentinel.state = 'WINDUP';
combat.sentinel.timer = 0.6;
step(combat, 0.05);
assert.equal(combat.lives, combat.maxLives, 'telegraph precedes enemy damage');

const duel = new AdventureModel('aventurero');
duel.skipIntro();
stand(duel, court.x + 500, 280);
duel.roomIndex = 4;
duel.sentinel.started = true;
duel.sentinel.state = 'CHASE';
duel.sentinel.x = duel.center().x + 80;
duel.sentinel.y = duel.center().y;
duel.player.facingX = 1;
duel.player.facingY = 0;
duel.step(1 / 60, { ...still, attack: true });
step(duel, 0.14);
assert.equal(duel.sentinel.health, 4, 'directional basic attack damages the Sentinel');
step(duel, 0.12);
assert.equal(duel.sentinel.health, 4, 'one strike cannot hit the same target twice');
duel.sentinel.health = 3;
duel.sentinel.state = 'CHASE';
duel.player.attackCooldown = 0;
duel.player.attackTimer = 0;
duel.step(1 / 60, { ...still, attack: true });
step(duel, 0.14);
assert.equal(duel.sentinel.health, 2, 'half-health shield follows real combat damage');
assert.equal(duel.sentinel.shield, true, 'mathematical shield interrupts basic-attack spam');
const node = { x: court.x + 255, y: 185 };
step(duel, 0.5);
stand(duel, node.x, node.y);
duel.step(1 / 60, still);
duel.step(1 / 60, { ...still, interact: true });
assert.equal(duel.challenge?.kind, 'sentinel', 'combat node creates a short challenge');
duel.step(1 / 60, { ...still, answer: 'A' });
assert.equal(duel.sentinel.shield, false, 'correct combat math breaks the shield');
assert.equal(duel.energy, 1, 'combat math grants Math Energy');

const gate = new AdventureModel('aventurero');
gate.skipIntro();
stand(gate, gate.gate.x - 45, gate.gate.y);
gate.step(1 / 60, { ...still, interact: true });
assert.equal(gate.gate.state, 'locked', 'gate requires real progression');
gate.progress.sequence = true;
gate.progress.sentinel = true;
gate.progress.artifact = true;
gate.step(1 / 60, { ...still, interact: true });
assert.equal(gate.gate.state, 'unlocking', 'all requirements activate the gate');
step(gate, 1.4);
assert.equal(gate.gate.state, 'open', 'gate completes its opening sequence');

const sealed = new AdventureModel('aventurero');
sealed.skipIntro();
stand(sealed, sealed.gate.x - 122, sealed.gate.y);
sealed.player.startDash(1, 0);
step(sealed, 0.2);
assert.ok(sealed.center().x <= sealed.gate.x - 65,
    'dash cannot tunnel into the closed Hero Gate artwork');

const secret = new AdventureModel('aventurero');
secret.skipIntro();
stand(secret, secret.secret.x, secret.secret.y);
secret.step(1 / 60, still);
secret.step(1 / 60, { ...still, interact: true });
assert.equal(secret.challenge?.kind, 'secret', 'engraving opens an optional in-world challenge');
secret.step(1 / 60, { ...still, answer: secret.challenge.correct });
assert.equal(secret.progress.secret, true, 'correct answer reveals optional reward');
assert.equal(secret.progress.sequence, false, 'secret is independent of the critical route');
const inscription = new AdventureModel('aventurero');
inscription.skipIntro();
stand(inscription, inscription.lore.x, inscription.lore.y);
inscription.roomIndex = 1;
inscription.step(1 / 60, { ...still, interact: true });
assert.equal(inscription.progress.lore, true, 'optional lore responds in interaction range');
assert.equal(inscription.player.state, 'INTERACT', 'interaction uses the explicit player state');
const hidden = new AdventureModel('aventurero');
hidden.skipIntro();
stand(hidden, hidden.secret.x + 55, 402);
hidden.step(1 / 60, still);
step(hidden, 0.3, { move: { x: 1, y: 0 } });
assert.ok(hidden.center().x < hidden.secret.x + 90,
    'hidden wall physically blocks the optional side passage');
hidden.progress.secret = true;
step(hidden, 0.3, { move: { x: 1, y: 0 } });
assert.ok(hidden.center().x > hidden.secret.x + 90,
    'solving the engraving opens a walkable side passage');

const power = new AdventureModel('aventurero');
power.skipIntro();
power.energy = 2;
power.step(1 / 60, { ...still, power: true });
assert.equal(power.shield, 0, 'power cannot activate before the artifact');
power.progress.artifact = true;
power.step(1 / 60, { ...still, power: true });
assert.equal(power.energy, 1, 'Escudo Σ consumes one Math Energy');
assert.equal(power.shield, 1, 'Escudo Σ becomes visible and armed');
power.hurt(1, 0);
assert.equal(power.shield, 0, 'Escudo Σ absorbs exactly one hit');
assert.equal(power.lives, power.maxLives, 'absorbed hit preserves health');
step(power, 0.4);
power.hurt(1, 0);
assert.equal(power.lives, power.maxLives - 1, 'subsequent unshielded hit causes damage');

const retry = new AdventureModel('explorador');
retry.skipIntro();
retry.progress.sequence = true;
retry.energy = 2;
retry.setCheckpoint('sequence', retry.rooms[2].x + 70, 280);
retry.player.x = retry.rooms[4].x + 100;
retry.lives = 1;
retry.hurt(1, 0);
assert.equal(retry.checkpoint.id, 'sequence', 'death retains the latest checkpoint');
assert.equal(retry.progress.sequence, true, 'checkpoint preserves solved rooms');
assert.equal(retry.energy, 2, 'checkpoint restores Math Energy');
assert.ok(retry.player.x < retry.rooms[3].x, 'death returns to the checkpoint area');
retry.progress.artifact = true;
retry.energy = 3;
retry.setCheckpoint('artifact', retry.artifact.x, retry.artifact.y);
retry.player.invulnerable = 0;
retry.lives = 1;
retry.hurt(1, 0);
assert.equal(retry.progress.artifact, true, 'artifact survives checkpoint recovery');
assert.equal(retry.energy, 3, 'artifact checkpoint preserves earned charge');

const ending = new AdventureModel('aventurero');
ending.skipIntro();
ending.gate.state = 'open';
stand(ending, ending.room('portal').x + 90, 280);
ending.roomIndex = 6;
ending.step(1 / 60, still);
assert.equal(ending.focus?.x, ending.portal.x,
    'first arrival frames the portal before restoring follow camera');
stand(ending, ending.portal.x - 48, ending.portal.y);
ending.step(1 / 60, still);
ending.step(1 / 60, { ...still, interact: true });
assert.equal(ending.phase, 'portal', 'portal starts an intentional entry sequence');
const beforePortalStep = Math.abs(ending.center().x - ending.portal.x);
step(ending, 0.5);
assert.ok(Math.abs(ending.center().x - ending.portal.x) < beforePortalStep,
    'Explorer physically steps into the portal during the exit animation');
step(ending, 1.5);
assert.equal(ending.phase, 'complete', 'portal sequence completes Level 1');

console.log('PASS: rooms, cinematic, puzzle, hazard, Sentinel, gate, secret, checkpoint and portal');
