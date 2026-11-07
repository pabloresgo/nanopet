// Pure game logic for the nanopet. No DOM access, so it can be tested in Node.

export const SPECIES = ['cat', 'dog'];

export const CONFIG = {
  maxStat: 100,
  hungerPerMinute: 0.5,
  happinessDecayPerMinute: 0.3,
  poopChancePerMinute: 0.03,
  maxPoop: 4,
  sickChancePerMinute: 0.02,
  sickHungerThreshold: 90,
  sickPoopThreshold: 3,
  neglectLimitMinutes: 120,
  stageAges: { child: 60, adult: 240 }, // in game minutes
  wellCareGainPerMinute: 1,
  happyFormCareThreshold: 120,
  maxCatchUpMinutes: 7 * 24 * 60,
};

const clamp = (value) => Math.min(CONFIG.maxStat, Math.max(0, value));

export function stageFor(age) {
  if (age >= CONFIG.stageAges.adult) return 'adult';
  if (age >= CONFIG.stageAges.child) return 'child';
  return 'baby';
}

export function createPet(species, now = Date.now()) {
  if (!SPECIES.includes(species)) {
    throw new Error(`Unknown species: ${species}`);
  }
  return {
    species,
    age: 0,
    stage: 'baby',
    hunger: 0,
    happiness: CONFIG.maxStat,
    poop: 0,
    sick: false,
    neglect: 0,
    care: 0,
    alive: true,
    lastUpdated: now,
  };
}

// Advances the pet by one game minute. `rng` returns a number in [0, 1).
export function tickOne(state, rng = Math.random) {
  const next = { ...state };
  next.age += 1;
  next.stage = stageFor(next.age);
  next.hunger = clamp(next.hunger + CONFIG.hungerPerMinute);
  next.happiness = clamp(next.happiness - CONFIG.happinessDecayPerMinute);

  if (rng() < CONFIG.poopChancePerMinute && next.poop < CONFIG.maxPoop) {
    next.poop += 1;
  }

  const unhealthy =
    next.poop >= CONFIG.sickPoopThreshold || next.hunger >= CONFIG.sickHungerThreshold;
  if (!next.sick && unhealthy && rng() < CONFIG.sickChancePerMinute) {
    next.sick = true;
  }

  const starving = next.hunger >= CONFIG.maxStat;
  if (starving || next.sick) {
    next.neglect += 1;
  } else {
    next.neglect = Math.max(0, next.neglect - 1);
  }

  const wellCared =
    next.hunger < 50 && next.happiness > 50 && next.poop < CONFIG.sickPoopThreshold && !next.sick;
  if (wellCared) {
    next.care += CONFIG.wellCareGainPerMinute;
  }

  if (next.neglect >= CONFIG.neglectLimitMinutes) {
    next.alive = false;
  }
  return next;
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

// Brings the pet up to date with the wall clock. `msPerMinute` converts real time to game time.
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

function act(state, change) {
  if (!state.alive) {
    return state;
  }
  return change({ ...state });
}

export function feed(state) {
  return act(state, (s) => {
    s.hunger = clamp(s.hunger - 25);
    return s;
  });
}

export function play(state) {
  return act(state, (s) => {
    s.happiness = clamp(s.happiness + 20);
    s.hunger = clamp(s.hunger + 3);
    return s;
  });
}

export function clean(state) {
  return act(state, (s) => {
    s.poop = 0;
    return s;
  });
}

export function medicine(state) {
  return act(state, (s) => {
    if (s.sick) {
      s.sick = false;
      s.happiness = clamp(s.happiness - 5);
    }
    return s;
  });
}

// The final form depends on how well the pet was cared for while growing up.
export function appearance(state) {
  const form =
    state.stage === 'adult' && state.care >= CONFIG.happyFormCareThreshold ? 'happy' : 'plain';
  return { stage: state.stage, form };
}
