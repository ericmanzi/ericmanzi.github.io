'use strict';

const {
  LETTER_DISTRIBUTION,
  TOTAL_TILES,
  STARTING_TILES,
  NUM_PLAYERS,
  ROOM_CODE_CHARS,
  shuffle,
  createTileBag,
  generateRoomCode,
} = require('../utils');

// ── LETTER_DISTRIBUTION ────────────────────────────────────────────────────────

describe('LETTER_DISTRIBUTION', () => {
  test('sums to 144 tiles', () => {
    const total = Object.values(LETTER_DISTRIBUTION).reduce((a, b) => a + b, 0);
    expect(total).toBe(144);
  });

  test('TOTAL_TILES constant matches the sum', () => {
    expect(TOTAL_TILES).toBe(144);
  });

  test('contains all 26 letters', () => {
    const letters = Object.keys(LETTER_DISTRIBUTION);
    expect(letters).toHaveLength(26);
    for (let c = 65; c <= 90; c++) {
      expect(letters).toContain(String.fromCharCode(c));
    }
  });

  test('E is the most common letter (18)', () => {
    expect(LETTER_DISTRIBUTION.E).toBe(18);
  });
});

// ── shuffle ────────────────────────────────────────────────────────────────────

describe('shuffle', () => {
  test('returns an array of the same length', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr)).toHaveLength(arr.length);
  });

  test('contains the same elements as the input', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(shuffle(arr).sort()).toEqual([...arr].sort());
  });

  test('does not mutate the original array', () => {
    const arr = [1, 2, 3];
    const copy = [...arr];
    shuffle(arr);
    expect(arr).toEqual(copy);
  });

  test('produces a different order at least some of the time (probabilistic)', () => {
    // Run 20 shuffles; the probability that all 20 preserve [1,2,3,4,5]
    // exactly is (1/5!)^20 ≈ 10^-28 — effectively impossible.
    const arr = [1, 2, 3, 4, 5];
    const allSame = Array.from({ length: 20 }, () => shuffle(arr))
      .every(r => r.join() === arr.join());
    expect(allSame).toBe(false);
  });

  test('handles an empty array', () => {
    expect(shuffle([])).toEqual([]);
  });

  test('handles a single-element array', () => {
    expect(shuffle([42])).toEqual([42]);
  });
});

// ── createTileBag ──────────────────────────────────────────────────────────────

describe('createTileBag', () => {
  let bag;
  beforeEach(() => { bag = createTileBag(); });

  test('returns exactly 144 tiles', () => {
    expect(bag).toHaveLength(TOTAL_TILES);
  });

  test('every tile has a numeric id and a single uppercase letter', () => {
    for (const tile of bag) {
      expect(typeof tile.id).toBe('number');
      expect(tile.letter).toMatch(/^[A-Z]$/);
    }
  });

  test('tile ids are unique and sequential (0–143)', () => {
    const ids = bag.map(t => t.id).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: 144 }, (_, i) => i));
  });

  test('letter counts match LETTER_DISTRIBUTION', () => {
    const counts = {};
    for (const tile of bag) counts[tile.letter] = (counts[tile.letter] || 0) + 1;
    expect(counts).toEqual(LETTER_DISTRIBUTION);
  });

  test('two bags are not identical (shuffled)', () => {
    const bag2 = createTileBag();
    // Probability of two 144-tile shuffles being identical is astronomically small
    const same = bag.every((t, i) => t.id === bag2[i].id);
    expect(same).toBe(false);
  });
});

// ── generateRoomCode ───────────────────────────────────────────────────────────

describe('generateRoomCode', () => {
  test('returns a string of exactly 6 characters', () => {
    expect(generateRoomCode()).toHaveLength(6);
  });

  test('only uses characters from ROOM_CODE_CHARS', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      for (const ch of code) {
        expect(ROOM_CODE_CHARS).toContain(ch);
      }
    }
  });

  test('never contains easily-confused characters (I, O, 0, 1)', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).not.toMatch(/[IO01]/);
    }
  });

  test('generates different codes across calls (probabilistic)', () => {
    const codes = new Set(Array.from({ length: 20 }, generateRoomCode));
    expect(codes.size).toBeGreaterThan(1);
  });
});

// ── constants ─────────────────────────────────────────────────────────────────

describe('game constants', () => {
  test('STARTING_TILES is 21', () => expect(STARTING_TILES).toBe(21));
  test('NUM_PLAYERS is 2', () => expect(NUM_PLAYERS).toBe(2));
  test('two players fit in the bag with tiles left over', () => {
    expect(TOTAL_TILES).toBeGreaterThan(STARTING_TILES * NUM_PLAYERS);
  });
});
