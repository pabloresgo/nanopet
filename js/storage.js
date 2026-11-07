// Saves the pet in localStorage. Every access is wrapped in try/catch, because storage
// can be blocked (private mode, disabled site data). The game still works without it.
import { SPECIES } from './pet.js';

export const STORAGE_KEY = 'nanopet.save.v1';

export function isValidState(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    SPECIES.includes(value.species) &&
    ['age', 'hunger', 'happiness', 'poop', 'neglect', 'care', 'lastUpdated'].every((key) =>
      Number.isFinite(value[key]),
    ) &&
    ['baby', 'child', 'adult'].includes(value.stage) &&
    typeof value.sick === 'boolean' &&
    typeof value.alive === 'boolean'
  );
}

export function loadPet(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function savePet(state, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: the pet simply won't persist.
  }
}

export function clearPet(storage = globalThis.localStorage) {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
