import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FETCH, createFetch, stepFetch, throwBall, scoreFor, positions } from '../js/fetch.js';

// Moves the needle to an exact power value.
const aimAt = (game, power) => ({ ...game, needle: power });

test('needle position decides the rating', () => {
  assert.equal(scoreFor(FETCH.target), 'perfect');
  assert.equal(scoreFor(FETCH.target + FETCH.perfectRange + 0.05), 'good');
  assert.equal(scoreFor(0.05), 'weak');
});

test('the needle sweeps while aiming', () => {
  const game = stepFetch(createFetch(), 300);
  assert.ok(game.needle > 0 && game.needle <= 1);
});

test('perfect throws in a row earn a streak bonus', () => {
  let game = throwBall(aimAt(createFetch(), FETCH.target));
  assert.equal(game.points, 3);
  game = stepFetch(game, FETCH.flightMs + FETCH.returnMs);
  assert.equal(game.phase, 'aim');
  game = throwBall(aimAt(game, FETCH.target));
  assert.equal(game.points, 3 + 4);
  assert.equal(game.last.bonus, 1);
});

test('a weak throw resets the streak', () => {
  let game = throwBall(aimAt(createFetch(), FETCH.target));
  game = stepFetch(game, FETCH.flightMs + FETCH.returnMs);
  game = throwBall(aimAt(game, 0));
  assert.equal(game.streak, 0);
  assert.equal(game.points, 3 + 1);
});

test('throwing is ignored while the ball is in the air', () => {
  const game = throwBall(aimAt(createFetch(), FETCH.target));
  assert.equal(throwBall(game), game);
});

test('a round ends after all throws', () => {
  let game = createFetch();
  for (let i = 0; i < FETCH.throws; i += 1) {
    game = throwBall(aimAt(game, FETCH.target));
    game = stepFetch(game, FETCH.flightMs + FETCH.returnMs);
  }
  assert.equal(game.over, true);
  assert.equal(game.points, 3 + 4 * 4);
});

test('the pet runs out to the ball and brings it back', () => {
  let game = throwBall(aimAt(createFetch(), 1));
  const start = positions(game).petX;
  game = stepFetch(game, FETCH.flightMs - 10);
  const far = positions(game).petX;
  game = stepFetch(game, 10 + FETCH.returnMs - 10);
  assert.ok(far > start + 100);
  assert.ok(positions(game).carrying);
  assert.ok(positions(game).petX < far);
});
