// DOM wiring: draws the pet and updates the stat bars and status text.
import { getSprite, colorsFor } from './sprites.js';
import { appearance } from './pet.js';

const $ = (selector) => document.querySelector(selector);

const canvas = $('#pet-canvas');
const ctx = canvas.getContext('2d');

export function showChooser() {
  $('#chooser').hidden = false;
  $('#game').hidden = true;
}

export function showGame() {
  $('#chooser').hidden = true;
  $('#game').hidden = false;
}

function drawSprite(grid, colors) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  grid.forEach((row, y) => {
    [...row].forEach((code, x) => {
      if (code === '.') return;
      ctx.fillStyle = colors[code];
      ctx.fillRect(x, y, 1, 1);
    });
  });
}

function statusText(state) {
  if (!state.alive) return 'Your nanopet has died. Press "Start over" to try again.';
  const notes = [];
  if (state.sick) notes.push('Sick! Give medicine.');
  if (state.poop > 0) notes.push(`Poop x${state.poop}, clean up.`);
  if (state.hunger >= 70) notes.push('Hungry.');
  if (state.happiness <= 30) notes.push('Bored.');
  return notes.length ? notes.join(' ') : 'All good.';
}

export function render(state) {
  const { stage, form } = appearance(state);
  const name = state.species.charAt(0).toUpperCase() + state.species.slice(1);
  $('#title').textContent = `${name} (${stage}${form === 'happy' ? ', happy' : ''})`;

  drawSprite(getSprite(state.species, stage), colorsFor(state.species, state));

  $('#fullness-bar').style.width = `${100 - state.hunger}%`;
  $('#happiness-bar').style.width = `${state.happiness}%`;
  $('#status').textContent = statusText(state);
}
