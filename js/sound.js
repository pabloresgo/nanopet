// Short sound effects generated with the Web Audio API, so no audio files are needed.
const MUTE_KEY = 'nanopet.muted';

// Each sound is a list of [frequency in Hz, duration in seconds].
const SOUNDS = {
  click: [[660, 0.04]],
  eat: [[440, 0.08], [520, 0.08], [440, 0.08], [520, 0.1]],
  play: [[523, 0.08], [659, 0.08], [784, 0.12]],
  clean: [[880, 0.05], [988, 0.05], [1047, 0.05], [1175, 0.08]],
  medicine: [[392, 0.1], [523, 0.16]],
  sleep: [[392, 0.15], [330, 0.25]],
  wake: [[330, 0.1], [392, 0.1], [523, 0.14]],
  coin: [[988, 0.06], [1319, 0.14]],
  levelup: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25]],
  nope: [[220, 0.12], [196, 0.16]],
  sad: [[392, 0.25], [349, 0.25], [294, 0.45]],
};

let ctx = null;
let muted = readMuted();

function readMuted() {
  try {
    return globalThis.localStorage?.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function context() {
  if (ctx) return ctx;
  const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    ctx = new AudioCtx();
  } catch {
    ctx = null;
  }
  return ctx;
}

export const sound = {
  play(name) {
    const notes = SOUNDS[name];
    if (muted || !notes) return;
    const audio = context();
    if (!audio) return;
    if (audio.state === 'suspended') audio.resume();
    let t = audio.currentTime;
    for (const [freq, duration] of notes) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + duration + 0.02);
      t += duration;
    }
  },
  isMuted() {
    return muted;
  },
  setMuted(value) {
    muted = Boolean(value);
    try {
      globalThis.localStorage?.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // Preference just won't be remembered.
    }
  },
};
