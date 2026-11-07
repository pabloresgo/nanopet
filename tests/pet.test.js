import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG,
  createPet,
  tick,
  tickOne,
  advance,
  feed,
  play,
  clean,
  medicine,
  appearance,
} from '../js/pet.js';
import { getSprite } from '../js/sprites.js';

const never = () => 1; // rng that never triggers random events
const always = () => 0; // rng that always triggers them

test('createPet rejects unknown species', () => {
  assert.throws(() => createPet('fish', 0));
});

test('createPet keeps the chosen species', () => {
  assert.equal(createPet('cat', 0).species, 'cat');
  assert.equal(createPet('dog', 0).species, 'dog');
});

test('hunger rises and happiness falls each minute', () => {
  const start = createPet('cat', 0);
  const next = tickOne(start, never);
  assert.equal(next.hunger, start.hunger + CONFIG.hungerPerMinute);
  assert.equal(next.happiness, start.happiness - CONFIG.happinessDecayPerMinute);
});

test('feed reduces hunger and never goes below zero', () => {
  const hungry = { ...createPet('dog', 0), hunger: 40 };
  assert.equal(feed(hungry).hunger, 15);
  assert.equal(feed({ ...hungry, hunger: 5 }).hunger, 0);
});

test('play raises happiness and never exceeds the maximum', () => {
  const sad = { ...createPet('dog', 0), happiness: 50 };
  assert.equal(play(sad).happiness, 70);
  assert.equal(play({ ...sad, happiness: 95 }).happiness, CONFIG.maxStat);
});

test('clean removes poop', () => {
  assert.equal(clean({ ...createPet('cat', 0), poop: 3 }).poop, 0);
});

test('medicine cures sickness', () => {
  const sick = { ...createPet('cat', 0), sick: true };
  assert.equal(medicine(sick).sick, false);
});

test('actions do nothing once the pet has died', () => {
  const dead = { ...createPet('cat', 0), alive: false, hunger: 50 };
  assert.deepEqual(feed(dead), dead);
  assert.deepEqual(play(dead), dead);
});

test('poop and sickness can appear when the rng always triggers them', () => {
  let state = { ...createPet('cat', 0), hunger: 95 };
  state = tick(state, 10, always);
  assert.ok(state.poop > 0);
  assert.equal(state.sick, true);
});

test('a pet left starving dies after the neglect limit', () => {
  const starving = { ...createPet('dog', 0), hunger: CONFIG.maxStat };
  assert.equal(tick(starving, CONFIG.neglectLimitMinutes - 1, never).alive, true);
  assert.equal(tick(starving, CONFIG.neglectLimitMinutes, never).alive, false);
});

test('stages advance with age', () => {
  const pet = createPet('cat', 0);
  assert.equal(tick(pet, CONFIG.stageAges.child, never).stage, 'child');
  assert.equal(tick(pet, CONFIG.stageAges.adult, never).stage, 'adult');
});

test('offline catch-up matches minute-by-minute ticking', () => {
  const start = createPet('cat', 0);
  const msPerMinute = 60_000;
  const later = advance(start, 10 * msPerMinute, msPerMinute, never);
  const stepped = tick(start, 10, never);
  assert.equal(later.age, stepped.age);
  assert.equal(later.hunger, stepped.hunger);
  assert.equal(later.happiness, stepped.happiness);
  assert.equal(later.lastUpdated, 10 * msPerMinute);
});

test('advance does nothing when less than a full minute has passed', () => {
  const start = createPet('cat', 0);
  assert.equal(advance(start, 30_000, 60_000, never), start);
});

test('well-cared-for adults get the happy form', () => {
  const adult = { ...createPet('cat', 0), stage: 'adult', care: CONFIG.happyFormCareThreshold };
  assert.equal(appearance(adult).form, 'happy');
  assert.equal(appearance({ ...adult, care: 0 }).form, 'plain');
});

test('every sprite is a rectangular grid of the same size', () => {
  for (const species of ['cat', 'dog']) {
    for (const stage of ['baby', 'child', 'adult']) {
      const grid = getSprite(species, stage);
      const width = grid[0].length;
      assert.ok(grid.length > 0);
      grid.forEach((row) => assert.equal(row.length, width));
    }
  }
});

test('advance leaves a dead pet unchanged', () => {
  const dead = { ...createPet('cat', 0), alive: false };
  assert.equal(advance(dead, 10 * 60_000, 60_000, never), dead);
});
