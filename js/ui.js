// DOM rendering: screens, the room scene, meters, menus, effects and toasts.
import { petSVG } from './pet-art.js';
import { appearance, FOODS, STATS } from './pet.js';

const $ = (selector, root = document) => root.querySelector(selector);
const SCREENS = ['adopt', 'home', 'farewell'];
const ANIMS = ['anim-eat', 'anim-play', 'anim-clean', 'anim-medicine', 'anim-celebrate', 'anim-wake'];

const MOOD_LINES = {
  happy: 'is feeling great!',
  content: 'is doing fine.',
  sad: 'feels lonely. Play together?',
  hungry: 'is hungry!',
  sick: "isn't feeling well…",
  sleepy: 'is getting sleepy.',
  dirty: 'needs a bath.',
  sleeping: 'is fast asleep.',
  dead: 'has passed away.',
};

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export function formatAge(minutes) {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${mins} min`;
  return `${mins} min`;
}

export function showScreen(name) {
  for (const screen of SCREENS) {
    $(`#screen-${screen}`).hidden = screen !== name;
  }
  window.scrollTo(0, 0);
}

export function renderAdoptPreviews() {
  document.querySelectorAll('.preview').forEach((el) => {
    el.innerHTML = petSVG({ species: el.dataset.species, stage: 'baby', mood: 'happy' });
  });
}

function meterLevel(value) {
  if (value < 25) return 'bad';
  if (value < 50) return 'warn';
  return 'good';
}

let lastPetKey = '';

export function renderHome(state) {
  const look = appearance(state);

  $('#pet-name').textContent = state.name;
  $('#pet-meta').textContent = `${capitalize(look.stage)} ${state.species} · ${formatAge(state.age)} old`;
  $('#coins').textContent = state.coins;

  const key = [state.species, look.stage, look.mood, look.form, look.dirty].join('|');
  const pet = $('#pet');
  if (key !== lastPetKey) {
    pet.innerHTML = petSVG({ species: state.species, ...look });
    lastPetKey = key;
  }

  $('#scene').classList.toggle('night', state.lightsOff);
  $('#poops').innerHTML = '<span class="poop">💩</span>'.repeat(state.poop);
  $('#sick-badge').hidden = !state.sick || state.asleep;
  $('#zzz').hidden = !state.asleep;
  $('#mood-line').textContent = `${state.name} ${MOOD_LINES[look.mood]}`;

  for (const stat of STATS) {
    const meter = $(`.meter[data-stat="${stat}"]`);
    const value = Math.round(state[stat]);
    $('.fill', meter).style.width = `${value}%`;
    $('.track', meter).setAttribute('aria-valuenow', String(value));
    meter.dataset.level = meterLevel(value);
  }

  $('#lights-icon').textContent = state.lightsOff ? '☀️' : '🌙';
  $('#lights-label').textContent = state.lightsOff ? 'Wake' : 'Sleep';
}

// ---- Effects ----

let animTimer = 0;

function spawn(text, className, style = {}) {
  const el = document.createElement('span');
  el.className = `fx-item ${className}`;
  el.textContent = text;
  Object.assign(el.style, style);
  $('#fx').append(el);
  const remove = () => el.remove();
  el.addEventListener('animationend', remove, { once: true });
  setTimeout(remove, 3000);
}

function animatePet(className) {
  const pet = $('#pet');
  pet.classList.remove(...ANIMS);
  void pet.offsetWidth; // restart the animation if it's the same one
  pet.classList.add(className);
  clearTimeout(animTimer);
  animTimer = setTimeout(() => pet.classList.remove(className), 1800);
}

export function playEffect(effect, detail = {}) {
  switch (effect) {
    case 'eat':
      animatePet('anim-eat');
      spawn(FOODS[detail.food]?.icon ?? '🍖', 'fx-food');
      break;
    case 'play':
      animatePet('anim-play');
      spawn('🎾', 'fx-ball');
      if (detail.coins) spawn(`+${detail.coins} 🪙`, 'fx-coin');
      break;
    case 'clean':
      animatePet('anim-clean');
      for (let i = 0; i < 7; i += 1) {
        spawn('', 'fx-bubble', { left: `${25 + Math.random() * 50}%`, animationDelay: `${i * 0.12}s` });
      }
      break;
    case 'medicine':
      animatePet('anim-medicine');
      spawn('💊', 'fx-pill');
      spawn('✨', 'fx-sparkle');
      break;
    case 'wake':
      animatePet('anim-wake');
      spawn('☀️', 'fx-sparkle');
      break;
    case 'celebrate':
      animatePet('anim-celebrate');
      ['🎉', '⭐', '🎊', '✨', '⭐'].forEach((icon, i) =>
        spawn(icon, 'fx-confetti', { left: `${10 + i * 19}%`, animationDelay: `${i * 0.1}s` }),
      );
      break;
    default:
      break;
  }
}

// ---- Toast ----

let toastTimer = 0;
export function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ---- Dialogs ----

export function openDialog(id) {
  const dialog = $(`#${id}`);
  if (typeof dialog.showModal === 'function') {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}

export function closeDialog(id) {
  const dialog = $(`#${id}`);
  if (typeof dialog.close === 'function' && dialog.open) dialog.close();
  else dialog.removeAttribute('open');
}

export function renderFoodMenu(state) {
  const container = $('#food-options');
  container.innerHTML = '';
  for (const [key, food] of Object.entries(FOODS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option';
    button.dataset.food = key;
    button.disabled = state.coins < food.cost;
    button.innerHTML =
      `<span class="option-icon" aria-hidden="true">${food.icon}</span>` +
      `<span class="option-text"><strong>${food.label}</strong><small>+${food.fullness} hunger, +${food.happiness} happy</small></span>` +
      `<span class="option-cost">${food.cost ? `🪙 ${food.cost}` : 'Free'}</span>`;
    container.append(button);
  }
}

export function updateGameHud(game) {
  $('#game-score').textContent = game.score;
  $('#game-time').textContent = Math.ceil(game.timeLeft / 1000);
}

// ---- Farewell ----

export function showFarewell(state) {
  $('#farewell-pet').innerHTML = petSVG({ species: state.species, stage: state.stage, mood: 'dead' });
  $('#farewell-title').textContent = `Goodbye, ${state.name}`;
  $('#farewell-text').textContent =
    `${state.name} lived for ${formatAge(state.age)} and reached the ${state.stage} stage. ` +
    'Pets need food, cleaning and medicine when sick.';
  showScreen('farewell');
}

export function setMuteButton(muted) {
  const button = $('#mute-button');
  button.textContent = muted ? '🔇' : '🔊';
  button.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
}
