import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIG, FOODS, createPet, tick, tickOne, advance, feed, clean, medicine,
  toggleLights, canPlay, rewardFetch, rewardMiniGame, moodFor, appearance, cleanName, foodCost,
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

test('a full pet refuses food', () => {
  assert.equal(feed(pet({ fullness: 98 })).ok, false);
});

test('lights off puts the pet to sleep', () => {
  const result = toggleLights(pet());
  assert.equal(result.state.asleep, true);
  assert.equal(result.state.lightsOff, true);
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

test('sleeping with lights off refills energy in under 20 minutes', () => {
  const tired = pet({ energy: 0, asleep: true, lightsOff: true });
  const later = tick(tired, 17, never);
  assert.equal(later.energy, 100);
  assert.equal(later.asleep, false, 'wakes up on its own when rested');
});

test('hygiene and health drop noticeably when the pet is neglected', () => {
  const later = tick(pet(), 60, never);
  assert.ok(later.hygiene <= 100 - 60 * 0.6 + 0.001, `hygiene ${later.hygiene}`);
  const neglected = pet({ fullness: 5, hygiene: 10, happiness: 10 });
  assert.ok(tick(neglected, 10, never).health <= 100 - 10 * 3 * CONFIG.health.lossPerProblem + 0.001);
});

test('health only recovers when every stat is fine', () => {
  assert.ok(tickOne(pet({ health: 50 }), never).health > 50);
  assert.ok(tickOne(pet({ health: 50, happiness: 40 }), never).health === 50);
});

test('a sick, starving pet dies', () => {
  const doomed = pet({ fullness: 0, sick: true, health: 3 });
  assert.equal(tick(doomed, 10, never).alive, false);
});

test('free meals run out, then meals cost coins', () => {
  let state = pet({ fullness: 0, coins: 5 });
  for (let i = 0; i < CONFIG.freeMeals.max; i += 1) {
    const result = feed({ ...state, fullness: 0 }, 'meal');
    assert.ok(result.ok);
    assert.equal(result.detail.free, true);
    state = result.state;
  }
  assert.equal(state.freeMeals, 0);
  assert.equal(state.coins, 5);
  assert.equal(foodCost(state, 'meal'), CONFIG.freeMeals.mealCostWhenOut);
  const paid = feed({ ...state, fullness: 0 }, 'meal');
  assert.equal(paid.state.coins, 5 - CONFIG.freeMeals.mealCostWhenOut);
  assert.equal(feed({ ...state, fullness: 0, coins: 0 }, 'meal').ok, false);
});

test('free meals refill over time, up to the maximum', () => {
  const empty = pet({ freeMeals: 0, mealRefillIn: CONFIG.freeMeals.refillMinutes });
  assert.equal(tick(empty, CONFIG.freeMeals.refillMinutes, never).freeMeals, 1);
  const full = tick(empty, CONFIG.freeMeals.refillMinutes * 10, never);
  assert.equal(full.freeMeals, CONFIG.freeMeals.max);
});

test('snacks cost coins and treats cost a little health', () => {
  const hungry = pet({ fullness: 20, coins: 4 });
  assert.equal(feed(hungry, 'snack').state.coins, 1);
  assert.equal(feed(hungry, 'treat').ok, false);
  const rich = pet({ fullness: 20, coins: 10 });
  assert.equal(feed(rich, 'treat').state.health, 100 + FOODS.treat.health);
  assert.ok(feed(rich, 'meal').state.hygiene < 100, 'eating makes a little mess');
});

test('a sleeping pet refuses actions except lights', () => {
  const sleeping = pet({ asleep: true, lightsOff: true, fullness: 20, poop: 2 });
  assert.equal(feed(sleeping).ok, false);
  assert.equal(canPlay(sleeping).ok, false);
  assert.equal(clean(sleeping).ok, false);
  const woken = toggleLights(sleeping);
  assert.ok(woken.ok);
  assert.equal(woken.state.asleep, false);
});

test('games need energy and pay coins, costing energy and hygiene', () => {
  assert.equal(canPlay(pet({ energy: 5 }), 'fetch').ok, false);
  assert.equal(canPlay(pet({ energy: 18 }), 'miniGame').ok, false);
  const fetch = rewardFetch(pet({ coins: 2, happiness: 50 }), 9);
  assert.equal(fetch.state.coins, 11);
  assert.equal(fetch.state.happiness, 50 + CONFIG.fetch.maxHappiness); // capped
  assert.equal(fetch.state.hygiene, 100 - CONFIG.fetch.hygieneCost);
  assert.equal(fetch.detail.coins, 9);
  assert.equal(rewardMiniGame(pet({ coins: 0 }), 5).state.coins, 5);
});

test('actions do nothing once the pet has died', () => {
  const dead = pet({ alive: false });
  for (const action of [feed, clean, medicine, toggleLights, canPlay]) {
    assert.equal(action(dead).ok, false);
  }
  assert.equal(rewardFetch(dead, 5).ok, false);
});
