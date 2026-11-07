import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidState, loadPet, savePet, STORAGE_KEY } from '../js/storage.js';
import { CONFIG } from '../js/pet.js';
import { createPet } from '../js/pet.js';

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    data,
  };
}

test('a freshly created pet is a valid save', () => {
  assert.equal(isValidState(createPet('dog', 'Rex', 0)), true);
});

test('saves with missing or wrong fields are rejected', () => {
  const { energy, ...partial } = createPet('cat', 'Tom', 0);
  assert.equal(isValidState(partial), false);
  assert.equal(isValidState({ ...createPet('cat', 'Tom', 0), coins: 'x' }), false);
  assert.equal(isValidState({ ...createPet('cat', 'Tom', 0), version: 1 }), false);
  assert.equal(isValidState(null), false);
});

test('save and load round-trip, and old v1 saves are dropped', () => {
  const storage = memoryStorage({ 'nanopet.save.v1': '{"species":"cat"}' });
  const pet = createPet('cat', 'Tom', 0);
  savePet(pet, storage);
  assert.deepEqual(loadPet(storage), pet);
  assert.ok(!('nanopet.save.v1' in storage.data));
});

test('corrupt saves load as null', () => {
  assert.equal(loadPet(memoryStorage({ [STORAGE_KEY]: '{oops' })), null);
});

test('saves made before free meals existed are upgraded, not dropped', () => {
  const { freeMeals, mealRefillIn, ...older } = createPet('dog', 'Rex', 0);
  const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(older) });
  const loaded = loadPet(storage);
  assert.equal(loaded.name, 'Rex');
  assert.equal(loaded.freeMeals, CONFIG.freeMeals.max);
});
