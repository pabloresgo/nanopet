// Entry point: adoption, the game clock, actions, menus and the mini-game.
import * as Pet from './pet.js';
import { loadPet, savePet, clearPet } from './storage.js';
import * as UI from './ui.js';
import { sound } from './sound.js';
import { runMiniGame } from './minigame.js';
import { runFetch, FETCH } from './fetch.js';

// One game minute = one real minute. Add ?fast to the URL for one game minute per second.
const FAST = new URLSearchParams(location.search).has('fast');
const MS_PER_GAME_MINUTE = FAST ? 1_000 : 60_000;
const CLOCK_INTERVAL_MS = 1_000;

let state = null;
let miniGame = null;

const $ = (selector) => document.querySelector(selector);

// Saves and redraws, and reacts to growth and death.
function commit(next, effect, detail) {
  const prev = state;
  state = next;
  savePet(state);
  UI.renderHome(state);
  if (effect) UI.playEffect(effect, detail);

  if (prev && prev.asleep && !state.asleep && state.alive && !effect) {
    UI.playEffect('wake');
    sound.play('wake');
    UI.toast(`${state.name} woke up refreshed! ☀️`);
  }

  if (prev && prev.alive && state.alive && prev.stage !== state.stage) {
    setTimeout(() => {
      UI.playEffect('celebrate');
      sound.play('levelup');
      UI.toast(`${state.name} grew into a ${state.stage}! 🎉`);
    }, effect ? 1200 : 0);
  }
  if (prev && prev.alive && !state.alive) {
    sound.play('sad');
    closeAllDialogs();
    setTimeout(() => UI.showFarewell(state), 1500);
  }
}

function catchUp() {
  if (!state) return;
  const next = Pet.advance(state, Date.now(), MS_PER_GAME_MINUTE);
  if (next !== state) commit(next);
}

function perform(action, ...args) {
  if (!state) return false;
  catchUp();
  const result = action(state, ...args);
  if (!result.ok) {
    sound.play('nope');
    UI.toast(result.reason);
    return false;
  }
  sound.play(result.effect);
  if (result.detail?.coins) setTimeout(() => sound.play('coin'), 400);
  if (result.detail?.grumpy) UI.toast(`${result.state.name} is grumpy. Let them rest longer next time.`);
  commit(result.state, result.effect, result.detail);
  return true;
}

function closeAllDialogs() {
  ['food-dialog', 'play-dialog', 'game-dialog'].forEach(UI.closeDialog);
  miniGame?.cancel();
  miniGame = null;
}

// ---- Adopt ----

function setupAdopt() {
  const form = $('#adopt-form');
  const adoptButton = $('#adopt-button');
  form.addEventListener('change', () => {
    adoptButton.disabled = !form.elements.species.value;
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const species = form.elements.species.value;
    if (!species) return;
    sound.play('levelup');
    state = Pet.createPet(species, form.elements.name.value, Date.now());
    savePet(state);
    UI.showScreen('home');
    UI.renderHome(state);
    UI.playEffect('celebrate');
    UI.toast(`Welcome home, ${state.name}!`);
    form.reset();
    adoptButton.disabled = true;
  });
}

function startOver() {
  closeAllDialogs();
  clearPet();
  state = null;
  UI.showScreen('adopt');
}

// ---- Actions ----

function setupActions() {
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!state) return;
      catchUp();
      switch (button.dataset.action) {
        case 'feed':
          if (state.asleep || !state.alive) {
            perform(Pet.feed, 'meal'); // shows the reason
          } else {
            UI.renderFoodMenu(state);
            UI.openDialog('food-dialog');
          }
          break;
        case 'play':
          if (state.asleep || !state.alive) perform(Pet.canPlay);
          else UI.openDialog('play-dialog');
          break;
        case 'clean':
          perform(Pet.clean);
          break;
        case 'medicine':
          perform(Pet.medicine);
          break;
        case 'lights':
          perform(Pet.toggleLights);
          break;
        default:
          break;
      }
    });
  });

  $('#food-options').addEventListener('click', (event) => {
    const option = event.target.closest('[data-food]');
    if (!option || option.disabled) return;
    UI.closeDialog('food-dialog');
    perform(Pet.feed, option.dataset.food);
  });

  document.querySelectorAll('[data-play]').forEach((button) => {
    button.addEventListener('click', () => {
      UI.closeDialog('play-dialog');
      startGame(button.dataset.play === 'fetch' ? 'fetch' : 'treats');
    });
  });

  document.querySelectorAll('[data-close]').forEach((button) => {
    button.addEventListener('click', () => UI.closeDialog(button.closest('dialog').id));
  });

  $('#mute-button').addEventListener('click', () => {
    sound.setMuted(!sound.isMuted());
    UI.setMuteButton(sound.isMuted());
    sound.play('click');
  });

  $('#restart-button').addEventListener('click', () => {
    if (window.confirm(`Start over? ${state ? state.name : 'Your pet'} will be gone for good.`)) startOver();
  });

  $('#adopt-again').addEventListener('click', startOver);
}

// ---- Mini-games ----

const GAMES = {
  fetch: {
    title: 'Fetch',
    help: 'Tap or press Space when the needle is in the green. Perfect throws in a row earn a 🔥 bonus.',
    rules: 'fetch',
    run: runFetch,
    reward: Pet.rewardFetch,
    hud: (game) => [game.points, `🎾 ${FETCH.throws - game.throwIndex} left`],
    start: [0, `🎾 ${FETCH.throws} left`],
  },
  treats: {
    title: 'Catch the treats',
    help: 'Drag, tap or use ← → to move. ⭐ is worth 3.',
    rules: 'miniGame',
    run: (canvas, options) => runMiniGame(canvas, { species: options.state.species, ...options }),
    reward: Pet.rewardMiniGame,
    hud: (game) => [game.score, `⏱ ${Math.ceil(game.timeLeft / 1000)} s`],
    start: [0, '⏱ 20 s'],
  },
};

function startGame(name) {
  catchUp();
  const game = GAMES[name];
  const check = Pet.canPlay(state, game.rules);
  if (!check.ok) {
    sound.play('nope');
    UI.toast(check.reason);
    return;
  }
  UI.setGameDialog(game);
  UI.updateGameHud(...game.start);
  UI.openDialog('game-dialog');
  miniGame = game.run($('#game-canvas'), {
    state,
    onTick: (g) => UI.updateGameHud(...game.hud(g)),
    onEnd: (points) => {
      miniGame = null;
      UI.closeDialog('game-dialog');
      if (perform(game.reward, points)) {
        UI.toast(points > 0 ? `${state.name} had fun! +${points} coins 🪙` : 'No points this time. Try again!');
      }
    },
  });
}

function setupMiniGame() {
  $('#game-quit').addEventListener('click', () => miniGame?.quit());
  // Esc closes the dialog: still pay out what was caught.
  $('#game-dialog').addEventListener('cancel', (event) => {
    event.preventDefault();
    miniGame?.quit();
  });
}

// ---- Start ----

function init() {
  UI.renderAdoptPreviews();
  UI.setMuteButton(sound.isMuted());
  setupAdopt();
  setupActions();
  setupMiniGame();

  const saved = loadPet();
  if (saved) {
    state = Pet.advance(saved, Date.now(), MS_PER_GAME_MINUTE);
    savePet(state);
    if (state.alive) {
      UI.showScreen('home');
      UI.renderHome(state);
    } else {
      UI.showFarewell(state);
    }
  } else {
    UI.showScreen('adopt');
  }

  setInterval(catchUp, CLOCK_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) catchUp();
  });
}

init();
