// Pixel-art sprites drawn as text grids. Each row is mirrored to make a symmetric 12-pixel-wide sprite.
// Legend: '#' outline, 'o' body (species color), 'e' eye, 'n' nose, '.' transparent.

const SPRITE_HALVES = {
  cat: {
    baby: ['......', '..#...', '.#o#..', '#ooo##', '#eooo#', '#oooo#', '.####.', '......', '......'],
    adult: ['..#...', '.#o#..', '#ooo##', '#eoooo', '#ooooo', '#oooo#', '.#oo#.', '.#..#.', '##..##'],
  },
  dog: {
    baby: ['......', '.####.', '#oooo#', '#oeooo', '#oooo#', '.#oo#.', '......', '......', '......'],
    adult: ['.####.', '#oooo#', '#oeooo', '#nooo#', '#ooooo', '#oooo#', '.#oo#.', '.#..#.', '##..##'],
  },
};

const PALETTE = {
  cat: { o: '#f4a259' },
  dog: { o: '#b5835a' },
  shared: { '#': '#2b2b2b', e: '#111111', n: '#e0708a' },
};

const mirror = (row) => row + row.split('').reverse().join('');

function buildGrid(halves) {
  return halves.map(mirror);
}

// Returns the full sprite grid (array of 12-character strings) for a species and growth stage.
export function getSprite(species, stage) {
  const key = stage === 'adult' ? 'adult' : 'baby';
  return buildGrid(SPRITE_HALVES[species][key]);
}

// Returns the colour for each sprite code, adjusted for sickness or death.
export function colorsFor(species, { sick = false, alive = true } = {}) {
  let body = PALETTE[species].o;
  if (sick) body = '#9fd3a0';
  if (!alive) body = '#9a9a9a';
  return { ...PALETTE.shared, o: body };
}
