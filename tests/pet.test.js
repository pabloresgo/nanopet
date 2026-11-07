import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG, FOODS, createPet, tick, tickOne, advance, feed, play, clean, medicine,
  toggleLights, canPlayMiniGame, rewardMiniGame, moodFor, appearance, cleanName,
} from '../js/pet.js';
import { petSVG, MOODS } from '../js/pet-art.js';

const never = () => 1; // rng that never triggers random events
const always = () => 0; // rng that always triggers them
const pet = (overrides = {}) => ({ ...createPet('cat', 'Tom', 0), ...overrides });

test('createPet keeps species and name, with defaults', () => {
  assert.equal(pet().species, 'cat');
  assert.equal(pet().name, 'Tom');
  assert.equal(createPet('dog', '   ', 0).name, 'Biscuit');
  assert.throws(() => createPet('fish', 'x', 0));
});

test('names are trimmed and limited in length', () => {
  assert.equal(cleanName('  Luna  ', 'cat'), 'Luna');
  assert.equal(cleanName('x'.repeat(40), 'cat').length, CONFIG.maxNameLength);
});

test('stats decay while awake', () => {
  const next = tickOne(pet(), never);
  assert.equal(next.fullness, 80 + CONFIG.awake.fullness);
  assert.equal(next.energy, 100 + CONFIG.awake.energy);
});

test('sleeping with lights off restores energy faster than with lights on', () => {
  const dark = tickOne(pet({ asleep: true, lightsOff: true, energy: 50 }), never);
  const lit = tickOne(pet({ asleep: true, lightsOff: false, energy: 50 }), never);
  assert.ok(dark.energy > lit.energy);
  assert.ok(lit.energy > 50);
});

test('an exhausted pet falls asleep and wakes when rested', () => {
  assert.equal(tickOne(pet({ energy: 0.2 }), never).asleep, true);
  const rested = tickOne(pet({ asleep: true, lightsOff: true, energy: 99.5 }), never);
  assert.equal(rested.asleep, false);
  assert.equal(rested.lightsOff, false);
});

test('feeding a meal is free; snacks cost coins', () => {
  const hungry = pet({ fullness: 20, coins: 4 });
  const meal = feed(hungry, 'meal');
  assert.ok(meal.ok);
  assert.equal(meal.state.fullness, 20 + FOODS.meal.fullness);
  assert.equal(meal.state.coins, 4);
  assert.equal(meal.effect, 'eat');
  assert.equal(feed(hungry, 'snack').state.coins, 1);
  assert.equal(feed(hungry, 'treat').ok, false);
});

test('a full pet refuses food', () => {
  assert.equal(feed(pet({ fullness: 98 })).ok, false);
});

test('a sleeping pet refuses actions except lights', () => {
  const sleeping = pet({ asleep: true, lightsOff: true, fullness: 20, poop: 2 });
  assert.equal(feed(sleeping).ok, false);
  assert.equal(play(sleeping).ok, false);
  assert.equal(clean(sleeping).ok, false);
  const woken = toggleLights(sleeping);
  assert.ok(woken.ok);
  assert.equal(woken.state.asleep, false);
  assert.equal(woken.effect, 'wake');
});

test('lights off puts the pet to sleep', () => {
  const result = toggleLights(pet());
  assert.equal(result.state.asleep, true);
  assert.equal(result.state.lightsOff, true);
});

test('play raises happiness and uses energy; too tired refuses', () => {
  const result = play(pet({ happiness: 50 }));
  assert.equal(result.state.happiness, 65);
  assert.equal(result.state.energy, 100 - CONFIG.playEnergyCost);
  assert.equal(play(pet({ energy: 5 })).ok, false);
});

test('mini-game needs energy and pays coins for score', () => {
  assert.equal(canPlayMiniGame(pet({ energy: 5 })).ok, false);
  const reward = rewardMiniGame(pet({ coins: 2 }), 7);
  assert.equal(reward.state.coins, 9);
  assert.equal(reward.detail.coins, 7);
});

test('clean removes poop and restores hygiene', () => {
  const result = clean(pet({ poop: 3, hygiene: 40 }));
  assert.equal(result.state.poop, 0);
  assert.equal(result.state.hygiene, 100);
  assert.equal(clean(pet()).ok, false);
});

test('medicine cures sickness and restores health', () => {
  const result = medicine(pet({ sick: true, health: 40 }));
  assert.equal(result.state.sick, false);
  assert.equal(result.state.health, 70);
  assert.equal(medicine(pet()).ok, false);
});

test('poop and sickness can appear', () => {
  const next = tick(pet({ hygiene: 25 }), 5, always);
  assert.ok(next.poop > 0);
  assert.equal(next.sick, true);
});

test('a starving, sick pet loses health and dies', () => {
  const doomed = pet({ fullness: 0, sick: true, health: 5 });
  const next = tick(doomed, 10, never);
  assert.equal(next.alive, false);
});

test('actions do nothing once the pet has died', () => {
  const dead = pet({ alive: false });
  for (const action of [feed, play, clean, medicine, toggleLights]) {
    assert.equal(action(dead).ok, false);
  }
});

test('stages advance with age', () => {
  assert.equal(tick(pet(), CONFIG.stageAges.child, never).stage, 'child');
  assert.equal(tick(pet({ age: CONFIG.stageAges.adult - 1 }), 1, never).stage, 'adult');
});

test('offline catch-up matches minute-by-minute ticking', () => {
  const start = pet();
  const later = advance(start, 10 * 60_000, 60_000, never);
  const stepped = tick(start, 10, never);
  assert.equal(later.age, stepped.age);
  assert.equal(later.fullness, stepped.fullness);
  assert.equal(later.lastUpdated, 10 * 60_000);
});

test('advance leaves the state alone when nothing changed', () => {
  const dead = pet({ alive: false });
  assert.equal(advance(dead, 10 * 60_000, 60_000, never), dead);
  const fresh = pet();
  assert.equal(advance(fresh, 30_000, 60_000, never), fresh);
});

test('mood follows the most urgent need', () => {
  assert.equal(moodFor(pet({ alive: false })), 'dead');
  assert.equal(moodFor(pet({ asleep: true })), 'sleeping');
  assert.equal(moodFor(pet({ sick: true })), 'sick');
  assert.equal(moodFor(pet({ fullness: 10 })), 'hungry');
  assert.equal(moodFor(pet({ energy: 10 })), 'sleepy');
  assert.equal(moodFor(pet({ hygiene: 10 })), 'dirty');
  assert.equal(moodFor(pet({ happiness: 10 })), 'sad');
  assert.equal(moodFor(pet()), 'happy');
});

test('well-cared-for adults get the happy form', () => {
  assert.equal(appearance(pet({ stage: 'adult', care: CONFIG.careThreshold })).form, 'happy');
  assert.equal(appearance(pet({ stage: 'adult', care: 0 })).form, 'plain');
});

test('pet art renders every species, stage and mood', () => {
  for (const species of ['cat', 'dog']) {
    for (const stage of ['baby', 'child', 'adult']) {
      for (const mood of MOODS) {
        const svg = petSVG({ species, stage, mood, form: 'happy', dirty: true });
        assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
        assert.ok(svg.includes(`mood-${mood}`));
        assert.ok(!svg.includes('NaN') && !svg.includes('undefined'), `${species}/${stage}/${mood}`);
      }
    }
  }
});

test('cat and dog art differ, and adults are taller than babies', () => {
  assert.notEqual(petSVG({ species: 'cat' }), petSVG({ species: 'dog' }));
  const headY = (svg) => Number(svg.match(/<circle cx="100" cy="([\d.]+)" r="4[02]"/)[1]);
  assert.ok(headY(petSVG({ species: 'cat', stage: 'adult' })) < headY(petSVG({ species: 'cat', stage: 'baby' })));
});
