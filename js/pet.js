// Pure game logic for the nanopet. No DOM access, so it can be tested in Node.
// Every stat runs from 0 (bad) to 100 (good).

export const SPECIES = ['cat', 'dog'];
export const STAGES = ['baby', 'child', 'adult'];
export const STATS = ['fullness', 'happiness', 'energy', 'hygiene', 'health'];

export const CONFIG = {
  maxStat: 100,
  // Change per game minute.
  awake: { fullness: -0.5, happiness: -0.3, energy: -0.35, hygiene: -0.2 },
  asleep: { fullness: -0.2, happiness: -0.05, energy: 1.2, hygiene: -0.1 },
  asleepLightsOnEnergy: 0.5,
  poopChancePerMinute: 0.02,
  poopHygieneCost: 15,
  maxPoop: 4,
  sickChancePerMinute: 0.02,
  sickHygieneThreshold: 30,
  sickFullnessThreshold: 10,
  health: { sickLoss: 0.5, starvingLoss: 0.5, dirtyLoss: 0.2, dirtyThreshold: 20, recovery: 0.2 },
  stageAges: { child: 60, adult: 240 }, // in game minutes
  careThreshold: 120,
  startingCoins: 10,
  maxNameLength: 16,
  maxCatchUpMinutes: 7 * 24 * 60,
  playEnergyCost: 10,
  minPlayEnergy: 15,
  miniGameEnergyCost: 15,
  minMiniGameEnergy: 20,
};

export const FOODS = {
  meal: { label: 'Meal', icon: '🍖', cost: 0, fullness: 30, happiness: 2, weight: 0.2 },
  snack: { label: 'Snack', icon: '🍪', cost: 3, fullness: 12, happiness: 12, weight: 1 },
  treat: { label: 'Treat', icon: '🍰', cost: 6, fullness: 6, happiness: 25, weight: 1.5 },
};

const DEFAULT_NAMES = { cat: 'Mochi', dog: 'Biscuit' };

const clamp = (value) => Math.min(CONFIG.maxStat, Math.max(0, value));
const round1 = (value) => Math.round(value * 10) / 10;

export function stageFor(age) {
  if (age >= CONFIG.stageAges.adult) return 'adult';
  if (age >= CONFIG.stageAges.child) return 'child';
  return 'baby';
}

export function cleanName(name, species) {
  const trimmed = String(name ?? '').trim().slice(0, CONFIG.maxNameLength);
  return trimmed || DEFAULT_NAMES[species];
}

export function createPet(species, name, now = Date.now()) {
  if (!SPECIES.includes(species)) {
    throw new Error(`Unknown species: ${species}`);
  }
  return {
    version: 2,
    species,
    name: cleanName(name, species),
    age: 0,
    stage: 'baby',
    fullness: 80,
    happiness: 80,
    energy: 100,
    hygiene: 100,
    health: 100,
    poop: 0,
    sick: false,
    asleep: false,
    lightsOff: false,
    weight: 5,
    coins: CONFIG.startingCoins,
    care: 0,
    alive: true,
    lastUpdated: now,
  };
}

// Advances the pet by one game minute. `rng` returns a number in [0, 1).
export function tickOne(state, rng = Math.random) {
  const n = { ...state };
  n.age += 1;
  n.stage = stageFor(n.age);

  const rates = n.asleep ? CONFIG.asleep : CONFIG.awake;
  n.fullness = clamp(n.fullness + rates.fullness);
  n.happiness = clamp(n.happiness + rates.happiness);
  n.hygiene = clamp(n.hygiene + rates.hygiene);
  const energyRate = n.asleep && !n.lightsOff ? CONFIG.asleepLightsOnEnergy : rates.energy;
  n.energy = clamp(n.energy + energyRate);

  if (!n.asleep && n.poop < CONFIG.maxPoop && rng() < CONFIG.poopChancePerMinute) {
    n.poop += 1;
    n.hygiene = clamp(n.hygiene - CONFIG.poopHygieneCost);
  }

  const unhealthy =
    n.hygiene < CONFIG.sickHygieneThreshold || n.fullness < CONFIG.sickFullnessThreshold;
  if (!n.sick && unhealthy && rng() < CONFIG.sickChancePerMinute) {
    n.sick = true;
  }

  const h = CONFIG.health;
  let healthChange = 0;
  if (n.sick) healthChange -= h.sickLoss;
  if (n.fullness <= 0) healthChange -= h.starvingLoss;
  if (n.hygiene < h.dirtyThreshold) healthChange -= h.dirtyLoss;
  if (healthChange === 0) healthChange = h.recovery;
  n.health = clamp(n.health + healthChange);

  // Sleep cycle: an exhausted pet falls asleep; a rested one wakes up.
  if (!n.asleep && n.energy <= 0) {
    n.asleep = true;
  } else if (n.asleep && n.energy >= CONFIG.maxStat) {
    n.asleep = false;
    n.lightsOff = false;
  }

  if (!n.sick && STATS.every((key) => n[key] >= 50)) {
    n.care += 1;
  }

  if (n.health <= 0) {
    n.alive = false;
  }
  return n;
}

// Advances the pet by a number of whole game minutes. Stops early if the pet dies.
export function tick(state, minutes, rng = Math.random) {
  let next = { ...state };
  const count = Math.min(Math.floor(minutes), CONFIG.maxCatchUpMinutes);
  for (let i = 0; i < count && next.alive; i += 1) {
    next = tickOne(next, rng);
  }
  return next;
}

// Brings the pet up to date with the wall clock. Returns the same object if nothing changed.
export function advance(state, now, msPerMinute, rng = Math.random) {
  if (!state.alive) {
    return state;
  }
  const minutes = Math.floor((now - state.lastUpdated) / msPerMinute);
  if (minutes <= 0) {
    return state;
  }
  const next = tick(state, minutes, rng);
  return { ...next, lastUpdated: state.lastUpdated + minutes * msPerMinute };
}

// ---- Actions ----
// Each action returns { ok, state, effect?, detail?, reason? }.
// `effect` names the animation and sound the UI should play.

const fail = (state, reason) => ({ ok: false, state, reason });
const done = (state, effect, detail) => ({ ok: true, state, effect, detail });

function blocked(state, { mustBeAwake = true } = {}) {
  if (!state.alive) return `${state.name} is no longer with us.`;
  if (mustBeAwake && state.asleep) return `Shh… ${state.name} is sleeping. Turn the lights on first.`;
  return null;
}

export function feed(state, foodKey = 'meal') {
  const food = FOODS[foodKey];
  if (!food) return fail(state, 'Unknown food.');
  const reason = blocked(state);
  if (reason) return fail(state, reason);
  if (state.fullness >= 95) return fail(state, `${state.name} is full!`);
  if (state.coins < food.cost) {
    return fail(state, `Not enough coins for a ${food.label.toLowerCase()}. Play the mini-game to earn more.`);
  }
  return done(
    {
      ...state,
      coins: state.coins - food.cost,
      fullness: clamp(state.fullness + food.fullness),
      happiness: clamp(state.happiness + food.happiness),
      weight: round1(state.weight + food.weight),
    },
    'eat',
    { food: foodKey },
  );
}

export function play(state) {
  const reason = blocked(state);
  if (reason) return fail(state, reason);
  if (state.energy < CONFIG.minPlayEnergy) return fail(state, `${state.name} is too tired to play.`);
  return done(
    {
      ...state,
      happiness: clamp(state.happiness + 15),
      energy: clamp(state.energy - CONFIG.playEnergyCost),
      fullness: clamp(state.fullness - 5),
      weight: round1(Math.max(1, state.weight - 0.3)),
    },
    'play',
  );
}

export function canPlayMiniGame(state) {
  const reason = blocked(state);
  if (reason) return fail(state, reason);
  if (state.energy < CONFIG.minMiniGameEnergy) {
    return fail(state, `${state.name} is too tired for a game.`);
  }
  return { ok: true, state };
}

export function rewardMiniGame(state, score) {
  const reason = blocked(state);
  if (reason) return fail(state, reason);
  const coins = Math.max(0, Math.floor(score));
  return done(
    {
      ...state,
      coins: state.coins + coins,
      happiness: clamp(state.happiness + Math.min(30, coins * 2)),
      energy: clamp(state.energy - CONFIG.miniGameEnergyCost),
      fullness: clamp(state.fullness - 5),
    },
    'play',
    { coins },
  );
}

export function clean(state) {
  const reason = blocked(state);
  if (reason) return fail(state, reason);
  if (state.poop === 0 && state.hygiene >= 95) {
    return fail(state, `${state.name} is already squeaky clean.`);
  }
  return done({ ...state, poop: 0, hygiene: CONFIG.maxStat }, 'clean');
}

export function medicine(state) {
  const reason = blocked(state);
  if (reason) return fail(state, reason);
  if (!state.sick && state.health >= 90) return fail(state, `${state.name} doesn't need medicine.`);
  return done(
    {
      ...state,
      sick: false,
      health: clamp(state.health + 30),
      happiness: clamp(state.happiness - 5),
    },
    'medicine',
  );
}

export function toggleLights(state) {
  const reason = blocked(state, { mustBeAwake: false });
  if (reason) return fail(state, reason);
  if (state.lightsOff) {
    const grumpy = state.energy < 30;
    return done(
      {
        ...state,
        lightsOff: false,
        asleep: false,
        happiness: clamp(state.happiness - (grumpy ? 10 : 0)),
      },
      'wake',
      { grumpy },
    );
  }
  return done({ ...state, lightsOff: true, asleep: true }, 'sleep');
}

// ---- Appearance ----

export function moodFor(state) {
  if (!state.alive) return 'dead';
  if (state.asleep) return 'sleeping';
  if (state.sick) return 'sick';
  if (state.fullness < 25) return 'hungry';
  if (state.energy < 20) return 'sleepy';
  if (state.hygiene < 30) return 'dirty';
  if (state.happiness < 30) return 'sad';
  if (state.happiness >= 70 && state.fullness >= 50) return 'happy';
  return 'content';
}

// The adult's look reflects how well the pet was cared for while growing up.
export function appearance(state) {
  const form = state.stage === 'adult' && state.care >= CONFIG.careThreshold ? 'happy' : 'plain';
  return { stage: state.stage, form, mood: moodFor(state), dirty: state.hygiene < 30 };
}
