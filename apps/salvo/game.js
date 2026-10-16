// Salvo rules: 10×10 waters, five ships, alternate shots. Plus a hunt/target AI admiral.

export const SIZE = 10;
export const ROWS = 'ABCDEFGHIJ';
export const FLEET = [
  { id: 'carrier', name: 'Carrier', len: 5 },
  { id: 'battleship', name: 'Battleship', len: 4 },
  { id: 'cruiser', name: 'Cruiser', len: 3 },
  { id: 'submarine', name: 'Submarine', len: 3 },
  { id: 'destroyer', name: 'Destroyer', len: 2 },
];

export const key = (r, c) => `${r},${c}`;
export const label = (r, c) => `${ROWS[r]}-${c + 1}`;

// Seeded random so a "new game" is varied but the demo can be repeatable.
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

export function placeFleet(random) {
  const taken = new Set();
  return FLEET.map(ship => {
    for (;;) {
      const vertical = random() < .5;
      const r = Math.floor(random() * (vertical ? SIZE - ship.len + 1 : SIZE));
      const c = Math.floor(random() * (vertical ? SIZE : SIZE - ship.len + 1));
      const cells = Array.from({ length: ship.len }, (_, i) => vertical ? [r + i, c] : [r, c + i]);
      if (cells.some(([y, x]) => taken.has(key(y, x)))) continue;
      cells.forEach(([y, x]) => taken.add(key(y, x)));
      return { ...ship, vertical, cells, hits: [] };
    }
  });
}

export const shipAt = (fleet, r, c) => fleet.find(s => s.cells.some(([y, x]) => y === r && x === c));
export const isSunk = ship => ship.hits.length === ship.len;
export const allSunk = fleet => fleet.every(isSunk);

// Fire at (r, c) on `side` (mutates it). Returns { result: 'miss' | 'hit' | 'sunk', ship }.
export function fire(side, r, c) {
  const k = key(r, c);
  if (side.shots[k]) return null;
  const ship = shipAt(side.fleet, r, c);
  if (!ship) { side.shots[k] = 'miss'; return { result: 'miss' }; }
  ship.hits.push(k);
  side.shots[k] = 'hit';
  return { result: isSunk(ship) ? 'sunk' : 'hit', ship };
}

// Hunt/target: sweep a checkerboard until a hit, then work outward along the line until it sinks.
export function aiPick(side, random) {
  const open = (r, c) => r >= 0 && c >= 0 && r < SIZE && c < SIZE && !side.shots[key(r, c)];
  const liveHits = Object.entries(side.shots)
    .filter(([k, v]) => v === 'hit' && !isSunk(shipAt(side.fleet, ...k.split(',').map(Number))))
    .map(([k]) => k.split(',').map(Number));
  if (liveHits.length) {
    if (liveHits.length > 1) {
      const sameRow = liveHits.every(([r]) => r === liveHits[0][0]);
      const sameCol = liveHits.every(([, c]) => c === liveHits[0][1]);
      if (sameRow || sameCol) {
        const sorted = [...liveHits].sort((a, b) => sameRow ? a[1] - b[1] : a[0] - b[0]);
        const [first, last] = [sorted[0], sorted.at(-1)];
        const ends = sameRow ? [[first[0], first[1] - 1], [last[0], last[1] + 1]] : [[first[0] - 1, first[1]], [last[0] + 1, last[1]]];
        const next = ends.filter(([r, c]) => open(r, c));
        if (next.length) return next[Math.floor(random() * next.length)];
      }
    }
    const around = liveHits.flatMap(([r, c]) => [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]).filter(([r, c]) => open(r, c));
    if (around.length) return around[Math.floor(random() * around.length)];
  }
  const cells = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (open(r, c) && (r + c) % 2 === 0) cells.push([r, c]);
  if (!cells.length) for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (open(r, c)) cells.push([r, c]);
  return cells[Math.floor(random() * cells.length)];
}

export function newSide(random) {
  return { fleet: placeFleet(random), shots: {} };
}
