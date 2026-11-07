// Saves the pet in localStorage. Every access is wrapped in try/catch, because storage
// can be blocked (private mode, disabled site data). The game still works without it.
import { SPECIES, STAGES } from './pet.js';

export const STORAGE_KEY = 'nanopet.save.v2';
const OLD_KEYS = ['nanopet.save.v1'];

const NUMBER_FIELDS = [
  'age', 'fullness', 'happiness', 'energy', 'hygiene', 'health',
  'poop', 'weight', 'coins', 'care', 'lastUpdated',
];
const BOOLEAN_FIELDS = ['sick', 'asleep', 'lightsOff', 'alive'];

export function isValidState(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    value.version === 2 &&
    SPECIES.includes(value.species) &&
    STAGES.includes(value.stage) &&
    typeof value.name === 'string' &&
    NUMBER_FIELDS.every((key) => Number.isFinite(value[key])) &&
    BOOLEAN_FIELDS.every((key) => typeof value[key] === 'boolean')
  );
}

export function loadPet(storage = globalThis.localStorage) {
  try {
    OLD_KEYS.forEach((key) => storage.removeItem(key));
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
