import assert from 'node:assert/strict';
import { EscapeMode } from '../js/levels/EscapeMode.js';
import { AdventureModel } from '../js/levels/AdventureModel.js';

const still = { move: { x: 0, y: 0 } };
const stand = (model, x, y) => {
    model.player.x = x - model.player.width / 2;
    model.player.y = y - model.player.height / 2;
};

const escape = new EscapeMode('maestro', 100, 1100);
escape.start(150);
escape.update(1, 300);
assert.equal(escape.active, true, 'escape activates explicitly');
assert.equal(escape.progress, 0.2, 'distance maps to deterministic progress');
assert.ok(escape.pressureX > -210, 'difficulty pressure advances with delta time');
escape.update(1, escape.pressureX);
assert.ok(escape.catchCooldown > 0, 'pressure catch is rate limited');

const route = new AdventureModel('aventurero');
route.skipIntro();
stand(route, route.room('corridor').x + 140, 280);
route.step(1 / 60, still);
assert.equal(route.escape.active, true, 'crossing the awakening anchor starts Escape Mode');
const wrong = route.puzzle.plates.find(plate => !plate.correct);
stand(route, wrong.x, wrong.y);
route.roomIndex = 2;
route.step(1 / 60, still);
assert.equal(route.combo, 1, 'wrong route resets combo');
assert.equal(route.mathAttempts, 1, 'wrong route counts an attempt');
route.puzzle.cooldown = 0;
route.puzzle.lastPlate = null;
const correct = route.puzzle.plates.find(plate => plate.correct);
stand(route, correct.x, correct.y);
route.step(1 / 60, still);
assert.equal(route.progress.sequence, true, 'correct physical route opens the course');
assert.equal(route.combo, 2, 'correct route raises combo');
assert.equal(route.energy, 2, 'correct route grants Math Energy');

const hazard = new AdventureModel('aventurero');
hazard.skipIntro();
const column = hazard.fallingColumns[0];
stand(hazard, column.x, column.y);
hazard.roomIndex = 1;
hazard.hazardClock = 1.18 - column.offset;
const lives = hazard.lives;
hazard.step(1 / 60, still);
assert.equal(hazard.lives, lives - 1, 'falling column uses telegraph-to-impact damage');
hazard.step(1 / 60, still);
assert.equal(hazard.lives, lives - 1, 'damage i-frames prevent repeat-frame damage');

const combat = new AdventureModel('aventurero');
combat.skipIntro();
combat.combo = 3;
combat.maxCombo = 3;
combat.sentinel.health = 1;
combat.sentinel.started = true;
combat.sentinel.state = 'CHASE';
combat.roomIndex = 4;
stand(combat, combat.sentinel.x - 80, combat.sentinel.y);
combat.player.facingX = 1;
combat.player.facingY = 0;
combat.step(1 / 60, { ...still, attack: true });
for (let i = 0; i < 12; i++) combat.step(1 / 60, still);
assert.equal(combat.progress.sentinel, true, 'Sentinel defeat resumes the route');
assert.equal(combat.combo, 4, 'clean enemy defeat maintains combo');

route.escape.update(1, route.escape.finishX);
assert.equal(route.escape.finished, true, 'finish trigger closes Escape Mode');
const results = route.results();
assert.deepEqual({ attempts: results.attempts, correct: results.correct, accuracy: results.accuracy,
    maxCombo: results.maxCombo }, { attempts: 2, correct: 1, accuracy: 50, maxCombo: 2 },
'result calculations preserve separate fair-play statistics');

console.log('PASS: Escape Mode pressure, route math, combo, energy, hazards, i-frames, Sentinel and results');
