import assert from 'node:assert/strict';
import { Player } from '../js/entities/Player.js';

const input = (x = 0, y = 0) => ({ getMovementVector: () => ({ x, y }) });

const walker = new Player(120, 240);
walker.update(1 / 60, input(1, 1));
assert.ok(walker.vx > 0 && walker.vy > 0, 'diagonal movement starts immediately');
assert.ok(Math.hypot(walker.vx, walker.vy) <= walker.speed + 0.01,
    'diagonal input cannot exceed maximum speed');
const firstSpeed = Math.hypot(walker.vx, walker.vy);
walker.update(1 / 60, input(1, 1));
assert.ok(Math.hypot(walker.vx, walker.vy) > firstSpeed, 'movement accelerates');
walker.update(1 / 60, input());
assert.ok(Math.hypot(walker.vx, walker.vy) < walker.speed, 'release decelerates');

const dash = new Player(120, 240);
assert.equal(dash.startDash(1, 0), true, 'first dash starts');
assert.equal(dash.startDash(1, 0), false, 'dash cannot be spammed');
assert.ok(dash.invulnerable > 0, 'dash protects the player briefly');
dash.update(0.2, input());
assert.equal(dash.state, 'IDLE', 'dash ends deterministically');
assert.equal(dash.startDash(1, 0), false, 'cooldown outlasts active dash');
dash.update(0.9, input());
assert.equal(dash.startDash(1, 0), true, 'dash recharges');

const attacker = new Player(120, 240);
assert.equal(attacker.startAttack(), true, 'first strike starts');
assert.equal(attacker.startAttack(), false, 'attack cannot be spammed');
attacker.update(0.12, input());
assert.equal(attacker.attackActive, true, 'strike has an active contact window');
attacker.update(0.3, input());
assert.equal(attacker.attackActive, false, 'strike recovers');
assert.equal(attacker.startAttack(), false, 'attack cooldown outlasts recovery');
attacker.update(0.2, input());
assert.equal(attacker.startAttack(), true, 'attack recharges');

const hurt = new Player(120, 240);
assert.equal(hurt.receiveHit(1, 0), true, 'first unshielded hit lands');
assert.equal(hurt.receiveHit(1, 0), false, 'damage i-frames block repeated contact');
hurt.update(0.9, input());
assert.equal(hurt.receiveHit(1, 0), true, 'damage can land after i-frames');

console.log('PASS: movement, dash, attack, and damage state contracts');

globalThis.window = { addEventListener() {} };
const { InputSystem } = await import('../js/systems/InputSystem.js');
const controls = new InputSystem();
controls.onKeyDown({ key: 'a', repeat: false, preventDefault() {} });
assert.equal(controls.getMovementVector().x, -1, 'A remains WASD movement-left');
controls.onKeyDown({ key: 'j', repeat: false, preventDefault() {} });
assert.equal(controls.wasActionPressed('BUTTON_A'), true, 'J represents physical button A');
controls.setContext('CHALLENGE');
controls.onKeyDown({ key: 'j', repeat: false, preventDefault() {} });
assert.equal(controls.getAnswerKey(), 'A', 'J selects answer A during challenges');
controls.update();
controls.onKeyDown({ key: 'k', repeat: false, preventDefault() {} });
assert.equal(controls.wasActionPressed('BUTTON_B'), false, 'challenge input cannot leak into dash');
assert.equal(controls.getAnswerKey(), 'B', 'K selects answer B');
controls.update();
controls.onKeyDown({ key: 'l', repeat: false, preventDefault() {} });
assert.equal(controls.wasActionPressed('BUTTON_C'), false, 'challenge input cannot leak into power');
assert.equal(controls.getAnswerKey(), 'C', 'L selects answer C');
controls.onKeyUp({ key: 'l' });
controls.setContext('COMBAT');
controls.onKeyDown({ key: 'l', repeat: false, preventDefault() {} });
assert.equal(controls.wasActionPressed('BUTTON_C'), true, 'L represents physical button C in combat');
assert.equal(controls.getAnswerKey(), null, 'combat actions cannot leak into answers');
console.log('PASS: arcade action input and explicit context boundary');
