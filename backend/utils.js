/**
 * Shared game utilities used by the Lambda handler and unit tests.
 */

const LETTER_DISTRIBUTION = {
  A: 13, B: 3, C: 3, D: 6, E: 18, F: 3, G: 4, H: 3, I: 12, J: 2, K: 2, L: 5,
  M: 3, N: 8, O: 11, P: 3, Q: 2, R: 9, S: 6, T: 9, U: 6, V: 3, W: 3, X: 2, Y: 3, Z: 2,
};

const TOTAL_TILES = Object.values(LETTER_DISTRIBUTION).reduce((a, b) => a + b, 0); // 144
const STARTING_TILES = 21;
const NUM_PLAYERS = 2;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/1/0 to avoid confusion

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createTileBag() {
  const tiles = [];
  let id = 0;
  for (const [letter, count] of Object.entries(LETTER_DISTRIBUTION)) {
    for (let i = 0; i < count; i++) tiles.push({ id: id++, letter });
  }
  return shuffle(tiles);
}

function generateRoomCode() {
  return Array.from(
    { length: 6 },
    () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)],
  ).join('');
}

module.exports = {
  LETTER_DISTRIBUTION,
  TOTAL_TILES,
  STARTING_TILES,
  NUM_PLAYERS,
  ROOM_CODE_CHARS,
  shuffle,
  createTileBag,
  generateRoomCode,
};
