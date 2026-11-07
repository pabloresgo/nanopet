// "Fetch" mini-game. A power needle swings across a meter; tap to throw when it's in
// the green zone. The pet runs out, catches the ball and brings it back.
// The rules are pure functions (testable in Node); runFetch() draws them on a canvas.
import { petSVG } from './pet-art.js';

export const FETCH = {
  width: 320,
  height: 420,
  throws: 5,
  target: 0.75, // centre of the green zone on the power meter (0..1)
  perfectRange: 0.07,
  goodRange: 0.18,
  baseSpeed: 1 / 700, // needle sweeps per ms
  speedUpPerThrow: 0.15,
  flightMs: 1100,
  returnMs: 900,
  maxStep: 50,
};

const POINTS = { perfect: 3, good: 2, weak: 1 };
export const LABELS = { perfect: 'Perfect!', good: 'Good', weak: 'Weak' };

export function scoreFor(power) {
  const off = Math.abs(power - FETCH.target);
  if (off <= FETCH.perfectRange) return 'perfect';
  if (off <= FETCH.goodRange) return 'good';
  return 'weak';
}

// Triangle wave: 0 → 1 → 0 → ...
const sweep = (t) => {
  const x = t % 2;
  return x <= 1 ? x : 2 - x;
};

export function createFetch() {
  return {
    throwIndex: 0,
    phase: 'aim', // aim → flight → return → aim … → done
    needleTime: 0,
    needle: 0,
    phaseTime: 0,
    distance: 0,
    points: 0,
    streak: 0,
    last: null,
    over: false,
  };
}

export function needleSpeed(throwIndex) {
  return FETCH.baseSpeed * (1 + FETCH.speedUpPerThrow * throwIndex);
}

export function throwBall(game) {
  if (game.phase !== 'aim' || game.over) return game;
  const rating = scoreFor(game.needle);
  const bonus = rating === 'perfect' && game.streak > 0 ? 1 : 0;
  const points = POINTS[rating] + bonus;
  return {
    ...game,
    phase: 'flight',
    phaseTime: 0,
    distance: 0.3 + game.needle * 0.65,
    points: game.points + points,
    streak: rating === 'perfect' ? game.streak + 1 : 0,
    last: { rating, points, bonus },
  };
}

function stepOnce(game, dt) {
  const g = { ...game };
  if (g.phase === 'aim') {
    g.needleTime += dt;
    g.needle = sweep(g.needleTime * needleSpeed(g.throwIndex));
  } else if (g.phase === 'flight') {
    g.phaseTime += dt;
    if (g.phaseTime >= FETCH.flightMs) {
      g.phase = 'return';
      g.phaseTime = 0;
    }
  } else if (g.phase === 'return') {
    g.phaseTime += dt;
    if (g.phaseTime >= FETCH.returnMs) {
      g.throwIndex += 1;
      g.phaseTime = 0;
      if (g.throwIndex >= FETCH.throws) {
        g.phase = 'done';
        g.over = true;
      } else {
        g.phase = 'aim';
        g.needleTime = 0;
        g.needle = 0;
      }
    }
  }
  return g;
}

export function stepFetch(game, dt) {
  let g = game;
  let remaining = Math.max(0, dt);
  while (remaining > 0 && !g.over) {
    const slice = Math.min(FETCH.maxStep, remaining);
    g = stepOnce(g, slice);
    remaining -= slice;
  }
  return g;
}

// ---- Browser runner ----

const GROUND = 360;
const HOME_X = 60;
const landingX = (distance) => HOME_X + 30 + distance * (FETCH.width - HOME_X - 60);
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Where the pet and ball are, given the game state.
export function positions(game) {
  const land = landingX(game.distance);
  if (game.phase === 'flight') {
    const t = Math.min(1, game.phaseTime / FETCH.flightMs);
    const ballX = HOME_X + (land - HOME_X) * t;
    const ballY = GROUND - 60 - Math.sin(Math.PI * t) * (90 + game.distance * 110) + t * 40;
    const petX = HOME_X + (land - HOME_X) * ease(Math.min(1, t * 1.1));
    return { petX, ballX, ballY, carrying: false, facing: 1 };
  }
  if (game.phase === 'return') {
    const t = Math.min(1, game.phaseTime / FETCH.returnMs);
    const petX = land + (HOME_X - land) * ease(t);
    return { petX, ballX: petX + 4, ballY: GROUND - 34, carrying: true, facing: -1 };
  }
  return { petX: HOME_X, ballX: HOME_X + 30, ballY: GROUND - 70, carrying: false, facing: 1 };
}

export function runFetch(canvas, { state, onTick, onEnd }) {
  const ctx = canvas.getContext('2d');
  const ratio = globalThis.devicePixelRatio || 1;
  canvas.width = FETCH.width * ratio;
  canvas.height = FETCH.height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const petImage = new Image();
  petImage.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    petSVG({ species: state.species, stage: state.stage, mood: 'happy' }),
  )}`;

  let game = createFetch();
  let last = null;
  let frame = 0;
  let stopped = false;

  const onThrow = () => {
    game = throwBall(game);
  };
  const onKey = (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onThrow();
    }
  };
  canvas.addEventListener('pointerdown', onThrow);
  window.addEventListener('keydown', onKey);

  function drawMeter() {
    const x = 30;
    const y = 36;
    const w = FETCH.width - 60;
    const h = 22;
    ctx.fillStyle = '#f3d9d0';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 11);
    else ctx.rect(x, y, w, h);
    ctx.fill();
    const zone = (centre, range, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(x + (centre - range) * w, y, range * 2 * w, h);
    };
    zone(FETCH.target, FETCH.goodRange, '#f6cf63');
    zone(FETCH.target, FETCH.perfectRange, '#6cc985');
    const nx = x + game.needle * w;
    ctx.fillStyle = '#3d2b23';
    ctx.fillRect(nx - 2, y - 6, 4, h + 12);
    ctx.font = '700 13px Nunito, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.phase === 'aim' ? 'Tap to throw when the needle is in the green!' : '', FETCH.width / 2, y + h + 22);
  }

  function draw() {
    const sky = ctx.createLinearGradient(0, 0, 0, FETCH.height);
    sky.addColorStop(0, '#bfe6ff');
    sky.addColorStop(1, '#fff3e0');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FETCH.width, FETCH.height);
    ctx.fillStyle = '#a8d98a';
    ctx.fillRect(0, GROUND, FETCH.width, FETCH.height - GROUND);

    // Distance markers.
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 1; i <= 4; i += 1) {
      ctx.fillRect(landingX(i / 4) - 1, GROUND + 4, 2, 10);
    }

    drawMeter();

    const pos = positions(game);
    const size = 78;
    const hop = game.phase === 'aim' ? 0 : -Math.abs(Math.sin(game.phaseTime / 70)) * 6;
    ctx.save();
    ctx.translate(pos.petX, GROUND - size + 8 + hop);
    ctx.scale(pos.facing, 1);
    if (petImage.complete) ctx.drawImage(petImage, -size / 2, 0, size, size);
    ctx.restore();

    // Tennis ball drawn directly, since the emoji looks like a racket on some phones.
    ctx.fillStyle = '#d4e84a';
    ctx.strokeStyle = '#7a8a1e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.ballX, pos.ballY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pos.ballX - 9, pos.ballY, 7, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pos.ballX + 9, pos.ballY, 7, (2 * Math.PI) / 3, (4 * Math.PI) / 3);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (game.last && game.phase !== 'aim') {
      const { rating, points, bonus } = game.last;
      ctx.font = '800 26px Nunito, system-ui, sans-serif';
      ctx.fillStyle = rating === 'perfect' ? '#2f9e57' : rating === 'good' ? '#c98a00' : '#8a7366';
      ctx.fillText(`${LABELS[rating]} +${points}${bonus ? ' 🔥' : ''}`, FETCH.width / 2, 130);
    }

    // Throws left.
    for (let i = 0; i < FETCH.throws; i += 1) {
      ctx.fillStyle = i < game.throwIndex ? '#d8c6bb' : '#ff8a65';
      ctx.beginPath();
      ctx.arc(FETCH.width / 2 - 40 + i * 20, FETCH.height - 24, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function finish() {
    if (stopped) return;
    stop();
    onEnd?.(game.points);
  }

  function loop(time) {
    if (stopped) return;
    const dt = last === null ? 0 : time - last;
    last = time;
    game = stepFetch(game, dt);
    draw();
    onTick?.(game);
    if (game.over) {
      // Keep the final frame on screen briefly before paying out.
      setTimeout(finish, 600);
      return;
    }
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    stopped = true;
    cancelAnimationFrame(frame);
    canvas.removeEventListener('pointerdown', onThrow);
    window.removeEventListener('keydown', onKey);
  }

  frame = requestAnimationFrame(loop);
  return { quit: finish, cancel: stop };
}
