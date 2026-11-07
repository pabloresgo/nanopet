import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidState } from '../js/storage.js';
import { createPet } from '../js/pet.js';

test('a freshly created pet is a valid save', () => {
  assert.equal(isValidState(createPet('dog', 0)), true);
});

test('saves missing fields are rejected', () => {
  const { neglect, ...partial } = createPet('cat', 0);
  assert.equal(isValidState(partial), false);
  assert.equal(isValidState({ ...createPet('cat', 0), poop: 'x' }), false);
  assert.equal(isValidState(null), false);
});
