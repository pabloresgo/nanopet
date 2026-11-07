// Builds the cat or dog as an SVG string from named parts, so it can change with
// species, growth stage, mood and form. Pure string output: testable in Node.

const INK = '#4a3328';

const PALETTES = {
  cat: { body: '#f7b267', belly: '#fff1dc', accent: '#e38b3c', earInner: '#f9b8c6', nose: '#ec7a92' },
  dog: { body: '#d29a6a', belly: '#fbead4', accent: '#8d5b3c', earInner: '#8d5b3c', nose: '#3a2a24' },
  ghost: { body: '#dcd7d3', belly: '#efebe8', accent: '#c2bbb5', earInner: '#d2cbc5', nose: '#a39b95' },
};

// Babies have a big head on a small body; adults are taller with a longer tail.
const DIMS = {
  baby: { bodyRx: 32, bodyRy: 24, bodyCy: 162, headR: 40, headCy: 118, tail: 0.7 },
  child: { bodyRx: 39, bodyRy: 30, bodyCy: 156, headR: 40, headCy: 106, tail: 0.85 },
  adult: { bodyRx: 46, bodyRy: 35, bodyCy: 150, headR: 42, headCy: 94, tail: 1 },
};

export const MOODS = ['happy', 'content', 'sad', 'hungry', 'sick', 'sleepy', 'dirty', 'sleeping', 'dead'];

const CLOSED_EYES = new Set(['happy', 'sleepy', 'sleeping', 'dead', 'sick']);
const DROOPY = new Set(['sad', 'sick', 'hungry', 'dead', 'sleeping']);

const r = (n) => Math.round(n * 10) / 10;
const line = (width = 3.5) =>
  `fill="none" stroke="${INK}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`;

function openEye(x, y, size) {
  return (
    `<circle cx="${r(x)}" cy="${r(y)}" r="${size}" fill="${INK}"/>` +
    `<circle cx="${r(x + size * 0.35)}" cy="${r(y - size * 0.4)}" r="${r(size * 0.35)}" fill="#fff"/>`
  );
}

function eye(mood, x, y, side) {
  switch (mood) {
    case 'happy':
      return `<path d="M${x - 7} ${y + 3} Q${x} ${y - 7} ${x + 7} ${y + 3}" ${line()}/>`;
    case 'sleepy':
      return `<path d="M${x - 7} ${y - 1} L${x + 7} ${y - 1}" ${line()}/><path d="M${x - 5} ${y} Q${x} ${y + 4} ${x + 5} ${y}" ${line(2.5)}/>`;
    case 'sleeping':
      return `<path d="M${x - 7} ${y} Q${x} ${y + 6} ${x + 7} ${y}" ${line()}/>`;
    case 'sick':
      return `<path d="M${x - 7} ${y - 2} Q${x} ${y + 4} ${x + 7} ${y - 2}" ${line()}/>`;
    case 'dead':
      return `<path d="M${x - 6} ${y - 6} L${x + 6} ${y + 6} M${x + 6} ${y - 6} L${x - 6} ${y + 6}" ${line()}/>`;
    case 'sad': {
      const brow = side < 0 ? `M${x - 8} ${y - 9} L${x + 6} ${y - 14}` : `M${x - 6} ${y - 14} L${x + 8} ${y - 9}`;
      const tear = side > 0 ? `<path class="pet-tear" d="M${x + 4} ${y + 6} q-3 6 0 8 q3 -2 0 -8" fill="#7cc4f2"/>` : '';
      return openEye(x, y, 5) + `<path d="${brow}" ${line(3)}/>` + tear;
    }
    case 'hungry':
      return openEye(x, y, 7);
    default:
      return openEye(x, y, 6);
  }
}

function mouth(mood, x, y) {
  switch (mood) {
    case 'happy':
      return (
        `<path d="M${x - 10} ${y} Q${x} ${y + 14} ${x + 10} ${y} Z" fill="#8c3a3a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` +
        `<path d="M${x - 5} ${y + 6} Q${x} ${y + 11} ${x + 5} ${y + 6} Z" fill="#f48aa0"/>`
      );
    case 'sad':
      return `<path d="M${x - 8} ${y + 5} Q${x} ${y - 3} ${x + 8} ${y + 5}" ${line(3)}/>`;
    case 'hungry':
      return `<ellipse class="pet-mouth-open" cx="${x}" cy="${y + 4}" rx="6" ry="7" fill="#8c3a3a" stroke="${INK}" stroke-width="2"/>`;
    case 'sick':
      return `<path d="M${x - 9} ${y + 3} q3 -4 6 0 t6 0 t6 0" ${line(2.5)}/>`;
    case 'sleepy':
    case 'sleeping':
      return `<ellipse cx="${x}" cy="${y + 3}" rx="3.5" ry="3" fill="#8c3a3a"/>`;
    case 'dead':
      return `<path d="M${x - 7} ${y + 3} L${x + 7} ${y + 3}" ${line(3)}/>`;
    default:
      return `<path d="M${x - 8} ${y} Q${x - 4} ${y + 6} ${x} ${y} Q${x + 4} ${y + 6} ${x + 8} ${y}" ${line(3)}/>`;
  }
}

const mirrorX = (points, hx) => points.map(([x, y]) => [2 * hx - x, y]);
const polygon = (points) => `M${points.map(([x, y]) => `${r(x)} ${r(y)}`).join(' L')} Z`;

function catEars(hx, hy, pal, droopy) {
  const outer = [[hx - 38, hy - 12], [hx - 30, hy - 58], [hx - 6, hy - 38]];
  const inner = [[hx - 31, hy - 19], [hx - 28, hy - 48], [hx - 13, hy - 36]];
  const tilt = droopy ? 22 : 0;
  const ear = (o, i, angle, px) =>
    `<g transform="rotate(${angle} ${r(px)} ${r(hy - 30)})">` +
    `<path d="${polygon(o)}" fill="${pal.body}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="${polygon(i)}" fill="${pal.earInner}"/></g>`;
  return (
    `<g class="pet-ears">` +
    ear(outer, inner, -tilt, hx - 22) +
    ear(mirrorX(outer, hx), mirrorX(inner, hx), tilt, hx + 22) +
    `</g>`
  );
}

function dogEars(hx, hy, pal, mood) {
  const angle = mood === 'happy' ? 30 : DROOPY.has(mood) ? 6 : 16;
  const ear = (cx, a) =>
    `<ellipse cx="${cx}" cy="${hy + 4}" rx="13" ry="27" transform="rotate(${a} ${cx} ${hy - 18})" fill="${pal.accent}" stroke="${INK}" stroke-width="3"/>`;
  return `<g class="pet-ears">${ear(hx - 37, angle)}${ear(hx + 37, -angle)}</g>`;
}

function tail(species, d, pal, droopy) {
  const sx = r(100 + d.bodyRx * 0.8);
  const sy = d.bodyCy + 4;
  const t = d.tail;
  let path;
  if (species === 'cat') {
    path = droopy
      ? `M${sx} ${sy} C${sx + 30} ${sy + 6} ${sx + 44} ${sy + 20} ${sx + 52} ${sy + 14}`
      : `M${sx} ${sy} C${sx + 38} ${sy - 4} ${r(sx + 34)} ${r(sy - 52 * t)} ${r(sx + 16)} ${r(sy - 62 * t)}`;
  } else {
    path = droopy
      ? `M${sx} ${sy} Q${sx + 24} ${sy + 6} ${sx + 30} ${sy + 22}`
      : `M${sx} ${sy - 4} Q${sx + 28} ${sy - 18} ${r(sx + 24)} ${r(sy - 44 * t)}`;
  }
  return (
    `<g class="pet-tail">` +
    `<path d="${path}" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round"/>` +
    `<path d="${path}" fill="none" stroke="${pal.body}" stroke-width="7.5" stroke-linecap="round"/>` +
    `</g>`
  );
}

export function petSVG({ species, stage = 'baby', mood = 'content', form = 'plain', dirty = false }) {
  const pal = mood === 'dead' ? PALETTES.ghost : PALETTES[species];
  const d = DIMS[stage] ?? DIMS.baby;
  const hx = 100;
  const hy = d.headCy;
  const droopy = DROOPY.has(mood);
  const isCat = species === 'cat';
  const outline = `stroke="${INK}" stroke-width="3"`;

  const pawX = r(d.bodyRx * 0.45);
  const body =
    `<ellipse cx="100" cy="${d.bodyCy}" rx="${d.bodyRx}" ry="${d.bodyRy}" fill="${pal.body}" ${outline}/>` +
    `<ellipse cx="100" cy="${d.bodyCy + 6}" rx="${r(d.bodyRx * 0.6)}" ry="${r(d.bodyRy * 0.62)}" fill="${pal.belly}"/>` +
    (dirty
      ? `<g class="pet-dirt" fill="#8d6e52" opacity=".55">` +
        `<circle cx="${r(100 - d.bodyRx * 0.45)}" cy="${d.bodyCy - 6}" r="5"/>` +
        `<circle cx="${r(100 + d.bodyRx * 0.35)}" cy="${d.bodyCy + 9}" r="4"/>` +
        `<circle cx="${hx - 20}" cy="${hy - 20}" r="4"/></g>`
      : '') +
    `<ellipse cx="${r(100 - pawX)}" cy="184" rx="12" ry="7" fill="${pal.body}" ${outline}/>` +
    `<ellipse cx="${r(100 + pawX)}" cy="184" rx="12" ry="7" fill="${pal.body}" ${outline}/>`;

  const stripes = isCat
    ? `<path d="M${hx - 10} ${hy - d.headR + 4} L${hx - 6} ${hy - d.headR + 14} M${hx} ${hy - d.headR + 2} L${hx} ${hy - d.headR + 13} M${hx + 10} ${hy - d.headR + 4} L${hx + 6} ${hy - d.headR + 14}" stroke="${pal.accent}" stroke-width="4" stroke-linecap="round"/>`
    : `<ellipse cx="${hx + 15}" cy="${hy - 3}" rx="12" ry="11" fill="${pal.accent}" opacity=".55"/>`;

  const muzzle = isCat
    ? `<path d="M${hx - 5} ${hy + 10} L${hx + 5} ${hy + 10} L${hx} ${hy + 16} Z" fill="${pal.nose}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>` +
      `<path d="M${hx - 14} ${hy + 14} L${hx - 36} ${hy + 10} M${hx - 14} ${hy + 18} L${hx - 36} ${hy + 21} M${hx + 14} ${hy + 14} L${hx + 36} ${hy + 10} M${hx + 14} ${hy + 18} L${hx + 36} ${hy + 21}" stroke="${INK}" stroke-width="1.5" opacity=".55" stroke-linecap="round"/>`
    : `<ellipse cx="${hx}" cy="${hy + 18}" rx="22" ry="15" fill="${pal.belly}"/>` +
      `<ellipse cx="${hx}" cy="${hy + 10}" rx="8" ry="6" fill="${pal.nose}"/>`;

  let cheeks = '';
  if (['happy', 'content', 'hungry'].includes(mood)) {
    cheeks = `<g fill="#ff9fb0" opacity=".55"><circle cx="${hx - 26}" cy="${hy + 12}" r="6"/><circle cx="${hx + 26}" cy="${hy + 12}" r="6"/></g>`;
  } else if (mood === 'sick') {
    cheeks =
      `<circle cx="${hx}" cy="${hy}" r="${d.headR}" fill="#9ad46b" opacity=".22"/>` +
      `<g fill="#9ad46b" opacity=".75"><circle cx="${hx - 26}" cy="${hy + 12}" r="6"/><circle cx="${hx + 26}" cy="${hy + 12}" r="6"/></g>`;
  }

  const blink = CLOSED_EYES.has(mood) ? '' : ' blink';
  const eyes = `<g class="pet-eyes${blink}">${eye(mood, hx - 15, hy - 2, -1)}${eye(mood, hx + 15, hy - 2, 1)}</g>`;
  const mouthSvg = `<g class="pet-mouth">${mouth(mood, hx, isCat ? hy + 20 : hy + 25)}</g>`;

  let accessory = '';
  if (form === 'happy' && mood !== 'dead') {
    if (isCat) {
      const bx = hx + 24;
      const by = hy - 40;
      accessory =
        `<g class="pet-bow"><path d="M${bx} ${by} l-14 -9 v18 z M${bx} ${by} l14 -9 v18 z" fill="#e2556f" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` +
        `<circle cx="${bx}" cy="${by}" r="4" fill="#c43d58"/></g>`;
    } else {
      const ny = hy + d.headR - 6;
      accessory = `<path class="pet-bandana" d="M${hx - 26} ${ny} L${hx + 26} ${ny} L${hx} ${ny + 20} Z" fill="#e2556f" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
    }
  }

  const head =
    (isCat ? catEars(hx, hy, pal, droopy) : '') +
    `<circle cx="${hx}" cy="${hy}" r="${d.headR}" fill="${pal.body}" ${outline}/>` +
    stripes +
    muzzle +
    cheeks +
    eyes +
    mouthSvg +
    (isCat ? '' : dogEars(hx, hy, pal, mood)) +
    accessory;

  return (
    `<svg class="pet-svg pet-${species} stage-${stage} mood-${mood}" viewBox="0 0 200 200" role="img" aria-label="${species} looking ${mood}" xmlns="http://www.w3.org/2000/svg">` +
    `<ellipse class="pet-shadow" cx="100" cy="189" rx="${d.bodyRx + 8}" ry="6" fill="rgba(0,0,0,.14)"/>` +
    `<g class="pet-figure">` +
    tail(species, d, pal, droopy) +
    `<g class="pet-body">${body}</g>` +
    `<g class="pet-head">${head}</g>` +
    `</g></svg>`
  );
}
