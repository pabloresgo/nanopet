// Entry point: chooses a pet, runs the game clock, and handles button presses.
import { createPet, advance, feed, play, clean, medicine } from './pet.js';
import { loadPet, savePet, clearPet, isValidState } from './storage.js';
import { render, showChooser, showGame } from './ui.js';

// One game minute = one real minute. Lower this while testing.
const MS_PER_GAME_MINUTE = 60_000;
const CLOCK_INTERVAL_MS = 1_000;

const ACTIONS = { feed, play, clean, medicine };

let state = null;

function persistAndRender() {
  savePet(state);
  render(state);
}

function refresh() {
  if (!state) return;
  const next = advance(state, Date.now(), MS_PER_GAME_MINUTE);
  if (next !== state) {
    state = next;
    persistAndRender();
  }
}

function startNewPet(species) {
  state = createPet(species, Date.now());
  showGame();
  persistAndRender();
}

function performAction(name) {
  if (!state) return;
  state = advance(state, Date.now(), MS_PER_GAME_MINUTE);
  state = ACTIONS[name](state);
  persistAndRender();
}

function startOver() {
  clearPet();
  state = null;
  showChooser();
}

function init() {
  document.querySelectorAll('[data-species]').forEach((button) => {
    button.addEventListener('click', () => startNewPet(button.dataset.species));
  });
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => performAction(button.dataset.action));
  });
  document.querySelector('#reset').addEventListener('click', startOver);

  const saved = loadPet();
  if (saved && isValidState(saved)) {
    state = advance(saved, Date.now(), MS_PER_GAME_MINUTE);
    showGame();
    persistAndRender();
  } else {
    showChooser();
  }

  setInterval(refresh, CLOCK_INTERVAL_MS);
}

init();
