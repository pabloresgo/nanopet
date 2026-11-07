// "Catch the treats" mini-game. The game rules are pure functions (testable in Node);
// runMiniGame() draws them on a canvas and handles input in the browser.

export const GAME = {
  width: 320,
  height: 420,
  duration: 20_000,
  spawnEvery: 650,
  catcherWidth: 64,
  catcherY: 372,
  catcherSpeed: 0.6, // px per ms
  goldenChance: 0.12,
  maxStep: 50, // ms; larger frames are split so treats can't skip past the catcher
};

const clampNum = (v, min, max) => Math.min(max, Math.max(min, v));

export function createGame() {
  return {
    timeLeft: GAME.duration,
    score: 0,
    caught: 0,
    catcherX: GAME.width / 2,
    items: [],
    spawnIn: 300,
    nextId: 1,
    over: false,
  };
}

export function isCaught(item, catcherX) {
  return (
    item.y >= GAME.catcherY - 14 &&
    item.y <= GAME.catcherY + 14 &&
    Math.abs(item.x - catcherX) <= GAME.catcherWidth / 2 + 8
  );
}

export function pointsFor(item) {
  return item.kind === 'golden' ? 3 : 1;
}

function stepOnce(game, dt, targetX, rng) {
  const g = { ...game, items: game.items.map((item) => ({ ...item })) };
  if (typeof targetX === 'number') {
    const half = GAME.catcherWidth / 2;
    const diff = clampNum(targetX, half, GAME.width - half) - g.catcherX;
    const maxMove = GAME.catcherSpeed * dt;
    g.catcherX += clampNum(diff, -maxMove, maxMove);
  }

  g.spawnIn -= dt;
  while (g.spawnIn <= 0) {
    g.items.push({
      id: g.nextId,
      x: 20 + rng() * (GAME.width - 40),
      y: -20,
      speed: 0.12 + rng() * 0.1,
      kind: rng() < GAME.goldenChance ? 'golden' : 'treat',
    });
    g.nextId += 1;
    g.spawnIn += GAME.spawnEvery;
  }

  const kept = [];
  for (const item of g.items) {
    item.y += item.speed * dt;
    if (isCaught(item, g.catcherX)) {
      g.score += pointsFor(item);
      g.caught += 1;
    } else if (item.y < GAME.height + 20) {
      kept.push(item);
    }
  }
  g.items = kept;

  g.timeLeft = Math.max(0, g.timeLeft - dt);
  if (g.timeLeft === 0) g.over = true;
  return g;
}

// Advances the game by `dt` milliseconds, moving the catcher toward `targetX`.
export function stepGame(game, dt, targetX, rng = Math.random) {
  let g = game;
  let remaining = Math.max(0, dt);
  while (remaining > 0 && !g.over) {
    const slice = Math.min(GAME.maxStep, remaining);
    g = stepOnce(g, slice, targetX, rng);
    remaining -= slice;
  }
  return g;
}

// ---- Browser runner ----

export function runMiniGame(canvas, { species, onTick, onEnd }) {
  const ctx = canvas.getContext('2d');
  const ratio = globalThis.devicePixelRatio || 1;
  canvas.width = GAME.width * ratio;
  canvas.height = GAME.height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const treatIcon = species === 'cat' ? '🐟' : '🦴';
  const catcherIcon = species === 'cat' ? '🐱' : '🐶';
  let game = createGame();
  let targetX = game.catcherX;
  let last = null;
  let frame = 0;
  let stopped = false;

  const toGameX = (clientX) => {
    const rect = canvas.getBoundingClientRect();
    return ((clientX - rect.left) / rect.width) * GAME.width;
  };
  const onPointer = (event) => {
    targetX = toGameX(event.clientX);
  };
  const onKey = (event) => {
    if (event.key === 'ArrowLeft') targetX = Math.max(0, game.catcherX - 60);
    if (event.key === 'ArrowRight') targetX = Math.min(GAME.width, game.catcherX + 60);
  };
  canvas.addEventListener('pointermove', onPointer);
  canvas.addEventListener('pointerdown', onPointer);
  window.addEventListener('keydown', onKey);

  function draw() {
    const sky = ctx.createLinearGradient(0, 0, 0, GAME.height);
    sky.addColorStop(0, '#bfe6ff');
    sky.addColorStop(1, '#fff3e0');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, GAME.width, GAME.height);
    ctx.fillStyle = '#a8d98a';
    ctx.fillRect(0, GAME.height - 30, GAME.width, 30);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '26px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    for (const item of game.items) {
      ctx.fillText(item.kind === 'golden' ? '⭐' : treatIcon, item.x, item.y);
    }

    // Catcher: a bowl with the pet's face above it.
    ctx.fillStyle = '#ff8a65';
    ctx.beginPath();
    ctx.ellipse(game.catcherX, GAME.catcherY + 10, GAME.catcherWidth / 2, 12, 0, 0, Math.PI);
    ctx.fill();
    ctx.font = '34px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.fillText(catcherIcon, game.catcherX, GAME.catcherY - 10);
  }

  function finish() {
    if (stopped) return;
    stop();
    onEnd?.(game.score);
  }

  function loop(time) {
    if (stopped) return;
    const dt = last === null ? 0 : time - last;
    last = time;
    game = stepGame(game, dt, targetX);
    draw();
    onTick?.(game);
    if (game.over) {
      finish();
      return;
    }
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    stopped = true;
    cancelAnimationFrame(frame);
    canvas.removeEventListener('pointermove', onPointer);
    canvas.removeEventListener('pointerdown', onPointer);
    window.removeEventListener('keydown', onKey);
  }

  frame = requestAnimationFrame(loop);
  // `quit` ends early and still pays out what was caught so far.
  return { quit: finish, cancel: stop };
}
