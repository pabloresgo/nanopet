import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME, createGame, stepGame, isCaught, pointsFor } from '../js/minigame.js';

test('the game ends after its duration', () => {
  const game = stepGame(createGame(), GAME.duration + 100, undefined, () => 0.5);
  assert.equal(game.over, true);
  assert.equal(game.timeLeft, 0);
});

test('treats spawn and fall', () => {
  const game = stepGame(createGame(), 1000, undefined, () => 0.5);
  assert.ok(game.items.length > 0);
  assert.ok(game.items.every((item) => item.y > -20));
});

test('the catcher moves toward the target but not past the edges', () => {
  const game = stepGame(createGame(), 2000, -500, () => 0.99);
  assert.equal(game.catcherX, GAME.catcherWidth / 2);
});

test('catching scores points; golden treats are worth more', () => {
  assert.equal(isCaught({ x: 100, y: GAME.catcherY }, 100), true);
  assert.equal(isCaught({ x: 300, y: GAME.catcherY }, 100), false);
  assert.equal(pointsFor({ kind: 'golden' }), 3);
  assert.equal(pointsFor({ kind: 'treat' }), 1);
});

test('standing under falling treats catches them', () => {
  // rng 0.5 always spawns at the centre, which is where the catcher starts.
  const game = stepGame(createGame(), 6000, GAME.width / 2, () => 0.5);
  assert.ok(game.score > 0);
});
