const { useState, useEffect, useRef } = React;

// Letter distribution based on real Bananagrams
const LETTER_DISTRIBUTION = {
  A: 13, B: 3, C: 3, D: 6, E: 18, F: 3, G: 4, H: 3, I: 12, J: 2, K: 2, L: 5,
  M: 3, N: 8, O: 11, P: 3, Q: 2, R: 9, S: 6, T: 9, U: 6, V: 3, W: 3, X: 2, Y: 3, Z: 2
};

const GRID_SIZE = 20;
const STARTING_TILES = 21;
const NUM_PLAYERS = 2;
const DICTIONARY_URL = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';

const baseFont = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function createTileBag() {
  const tiles = [];
  let id = 0;
  for (const [letter, count] of Object.entries(LETTER_DISTRIBUTION)) {
    for (let i = 0; i < count; i++) {
      tiles.push({ id: id++, letter });
    }
  }
  return shuffle(tiles);
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createEmptyGrid() {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
}

function getWordsOnGrid(grid) {
  const words = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    let word = '';
    let startCol = -1;
    for (let col = 0; col <= GRID_SIZE; col++) {
      const cell = col < GRID_SIZE ? grid[row][col] : null;
      if (cell) {
        if (word === '') startCol = col;
        word += cell.letter;
      } else {
        if (word.length >= 2) words.push({ word, row, col: startCol, direction: 'h' });
        word = '';
      }
    }
  }
  for (let col = 0; col < GRID_SIZE; col++) {
    let word = '';
    let startRow = -1;
    for (let row = 0; row <= GRID_SIZE; row++) {
      const cell = row < GRID_SIZE ? grid[row][col] : null;
      if (cell) {
        if (word === '') startRow = row;
        word += cell.letter;
      } else {
        if (word.length >= 2) words.push({ word, row: startRow, col, direction: 'v' });
        word = '';
      }
    }
  }
  return words;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ─── PlayerSection ─────────────────────────────────────────────────────────────
// Renders one player's game area. When `flipped` is true the entire section is
// rotated 180° so Player 1 (sitting at the top of a flat-lying device) sees
// their controls right-side-up, close to them at the middle divider.
//
// DOM render order (same for both players):
//   Grid → Hand → Status bar → Controls
// After rotation for P1 the visual order becomes:
//   Controls (nearest P1) → Status bar → Hand → Grid (farthest)
// P2 (no rotation) sees them as-is:
//   Grid (nearest middle divider) → Hand → Status bar → Controls (nearest P2)
function PlayerSection({
  playerNum,
  hand,
  grid,
  selected,
  message,
  showWords,
  dictionary,
  onTileSelect,
  onGridCellTap,
  onHandAreaTap,
  onPeel,
  onDump,
  onToggleWords,
  flipped,
}) {
  const gridWords = getWordsOnGrid(grid);
  const isP1 = playerNum === 1;
  const accentColor = isP1 ? '#4a90d9' : '#e74c3c';
  const accentBg = isP1 ? 'rgba(74,144,217,0.25)' : 'rgba(231,76,60,0.25)';
  const accentBorder = isP1 ? 'rgba(74,144,217,0.4)' : 'rgba(231,76,60,0.4)';

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
      padding: '6px',
      overflow: 'hidden',
      minHeight: 0,
      transform: flipped ? 'rotate(180deg)' : 'none',
    }}>

      {/* ── Grid ── */}
      <div style={{
        flex: 1,
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '10px',
        padding: '6px',
        overflow: 'auto',
        minHeight: 0,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, 27px)`,
          gap: '2px',
          background: '#2c3e50',
          padding: '5px',
          borderRadius: '6px',
          width: 'fit-content',
        }}>
          {grid.map((row, rowIdx) =>
            row.map((cell, colIdx) => {
              const isCellSelected =
                selected?.source?.type === 'grid' &&
                selected.source.pos.row === rowIdx &&
                selected.source.pos.col === colIdx;
              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  onClick={() => onGridCellTap(rowIdx, colIdx)}
                  style={{
                    width: '27px',
                    height: '27px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    touchAction: 'manipulation',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    ...(cell ? {
                      background: isCellSelected
                        ? 'linear-gradient(145deg, #4CAF50, #45a049)'
                        : 'linear-gradient(145deg, #FFE135, #F4D03F)',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      color: isCellSelected ? 'white' : '#5D4037',
                      boxShadow: isCellSelected ? '0 1px 0 #2E7D32' : '0 1px 0 #D4AC0D',
                    } : {
                      background: selected?.tile
                        ? 'rgba(76,175,80,0.18)'
                        : 'rgba(255,255,255,0.06)',
                    }),
                  }}
                >
                  {cell?.letter}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Hand ── */}
      <div
        onClick={onHandAreaTap}
        style={{
          background: selected?.source?.type === 'grid'
            ? 'rgba(76,175,80,0.15)'
            : 'rgba(255,255,255,0.08)',
          borderRadius: '10px',
          padding: '8px',
          flexShrink: 0,
          border: selected?.source?.type === 'grid'
            ? '2px dashed rgba(76,175,80,0.5)'
            : '2px solid transparent',
        }}
      >
        <div style={{
          color: 'rgba(255,255,255,0.4)',
          marginBottom: '5px',
          fontSize: '0.68rem',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Hand ({hand.length}) — tap to select
        </div>
        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}
          onClick={e => e.stopPropagation()}
        >
          {hand.map(tile => {
            const isTileSelected =
              selected?.tile?.id === tile.id && selected?.source?.type === 'hand';
            return (
              <div
                key={tile.id}
                onClick={() => onTileSelect(tile, 'hand')}
                style={{
                  width: '36px',
                  height: '36px',
                  background: isTileSelected
                    ? 'linear-gradient(145deg, #4CAF50, #45a049)'
                    : 'linear-gradient(145deg, #FFE135, #F4D03F)',
                  borderRadius: '7px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  color: isTileSelected ? 'white' : '#5D4037',
                  cursor: 'pointer',
                  boxShadow: isTileSelected
                    ? '0 2px 0 #2E7D32, inset 0 1px 0 rgba(255,255,255,0.4)'
                    : '0 2px 0 #D4AC0D, inset 0 1px 0 rgba(255,255,255,0.4)',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'manipulation',
                  transition: 'all 0.12s ease',
                }}
              >
                {tile.letter}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Status bar (selected tile / message) ── */}
      {(selected || message) && (
        <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
          {selected && (
            <div style={{
              flex: 1,
              background: 'rgba(76,175,80,0.25)',
              padding: '5px 8px',
              borderRadius: '7px',
              textAlign: 'center',
              color: '#4CAF50',
              fontWeight: '600',
              fontSize: '0.75rem',
            }}>
              "{selected.tile.letter}" — tap grid to place, or tap hand to return
            </div>
          )}
          {message && (
            <div style={{
              flex: 1,
              background: 'linear-gradient(145deg, #FFE135, #F4D03F)',
              padding: '5px 8px',
              borderRadius: '7px',
              textAlign: 'center',
              color: '#5D4037',
              fontWeight: '600',
              fontSize: '0.75rem',
            }}>
              {message}
            </div>
          )}
        </div>
      )}

      {/* ── Words panel (toggleable) ── */}
      {showWords && gridWords.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          borderRadius: '8px',
          padding: '6px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          maxHeight: '54px',
          overflow: 'auto',
          flexShrink: 0,
        }}>
          {gridWords.map((w, i) => {
            const isValid = dictionary ? dictionary.has(w.word) : false;
            return (
              <div key={i} style={{
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: '600',
                background: isValid ? 'rgba(46,204,113,0.25)' : 'rgba(231,76,60,0.25)',
                color: isValid ? '#2ecc71' : '#e74c3c',
              }}>
                {w.word} {isValid ? '✓' : '?'}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
        {/* Player label */}
        <div style={{
          background: accentBg,
          borderRadius: '8px',
          padding: '8px 10px',
          color: accentColor,
          fontWeight: '800',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          border: `1px solid ${accentBorder}`,
        }}>
          P{playerNum}
        </div>

        <button onClick={onPeel} style={{
          flex: 1,
          background: hand.length === 0
            ? 'linear-gradient(145deg, #4CAF50, #45a049)'
            : 'linear-gradient(145deg, #666, #555)',
          border: 'none',
          borderRadius: '8px',
          padding: '8px',
          fontSize: '0.85rem',
          color: 'white',
          cursor: 'pointer',
          fontFamily: baseFont,
          fontWeight: '700',
          boxShadow: hand.length === 0 ? '0 3px 0 #2E7D32' : '0 3px 0 #444',
          touchAction: 'manipulation',
        }}>
          🍌 PEEL
        </button>

        <button onClick={onDump} style={{
          flex: 1,
          background: 'linear-gradient(145deg, #e67e22, #d35400)',
          border: 'none',
          borderRadius: '8px',
          padding: '8px',
          fontSize: '0.85rem',
          color: 'white',
          cursor: 'pointer',
          fontFamily: baseFont,
          fontWeight: '700',
          boxShadow: '0 3px 0 #a04000',
          touchAction: 'manipulation',
        }}>
          🔄 DUMP
        </button>

        <button onClick={onToggleWords} style={{
          background: showWords ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '8px 10px',
          fontSize: '0.8rem',
          color: 'white',
          cursor: 'pointer',
          fontFamily: baseFont,
          fontWeight: '600',
          touchAction: 'manipulation',
        }}>
          {gridWords.length}
        </button>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
function BananagramsMultiplayer() {
  const [bunch, setBunch] = useState([]);
  // Each player: { hand, grid, selected, message, showWords }
  const [players, setPlayers] = useState({
    1: { hand: [], grid: createEmptyGrid(), selected: null, message: '', showWords: false },
    2: { hand: [], grid: createEmptyGrid(), selected: null, message: '', showWords: false },
  });
  const [gameState, setGameState] = useState('menu'); // 'menu' | 'playing' | 'won'
  const [winner, setWinner] = useState(null);
  const [timer, setTimer] = useState(0);
  const [dictionary, setDictionary] = useState(null);
  const [dictionaryLoading, setDictionaryLoading] = useState(true);

  const timerRef = useRef(null);
  const msgTimers = useRef({ 1: null, 2: null });

  // Load dictionary
  useEffect(() => {
    fetch(DICTIONARY_URL)
      .then(r => r.text())
      .then(text => {
        const words = text.split('\n')
          .map(w => w.trim().toUpperCase())
          .filter(w => w.length > 0);
        setDictionary(new Set(words));
        setDictionaryLoading(false);
      })
      .catch(() => setDictionaryLoading(false));
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const showMsg = (playerNum, msg, duration = 2500) => {
    if (msgTimers.current[playerNum]) clearTimeout(msgTimers.current[playerNum]);
    setPlayers(prev => ({
      ...prev,
      [playerNum]: { ...prev[playerNum], message: msg },
    }));
    if (msg) {
      msgTimers.current[playerNum] = setTimeout(() => {
        setPlayers(prev => ({
          ...prev,
          [playerNum]: { ...prev[playerNum], message: '' },
        }));
      }, duration);
    }
  };

  // ── Game lifecycle ────────────────────────────────────────────────────────────

  const startGame = () => {
    const bag = createTileBag();
    const p1Hand = bag.slice(0, STARTING_TILES);
    const p2Hand = bag.slice(STARTING_TILES, STARTING_TILES * 2);
    const remaining = bag.slice(STARTING_TILES * 2);

    setPlayers({
      1: { hand: p1Hand, grid: createEmptyGrid(), selected: null, message: '', showWords: false },
      2: { hand: p2Hand, grid: createEmptyGrid(), selected: null, message: '', showWords: false },
    });
    setBunch(remaining);
    setGameState('playing');
    setWinner(null);
    setTimer(0);

    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
  };

  const resetGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('menu');
    setTimer(0);
    setWinner(null);
  };

  // ── Tile interactions ────────────────────────────────────────────────────────

  const handleTileSelect = (playerNum, tile, sourceType, sourcePos = null) => {
    setPlayers(prev => {
      const p = prev[playerNum];
      // Deselect if tapping the already-selected tile
      if (p.selected?.tile?.id === tile.id) {
        return { ...prev, [playerNum]: { ...p, selected: null } };
      }
      return {
        ...prev,
        [playerNum]: {
          ...p,
          selected: { tile, source: { type: sourceType, pos: sourcePos } },
        },
      };
    });
  };

  const handleGridCellTap = (playerNum, row, col) => {
    setPlayers(prev => {
      const p = prev[playerNum];

      if (!p.selected) {
        // No tile selected — try to select the tile in this cell
        if (!p.grid[row][col]) return prev;
        return {
          ...prev,
          [playerNum]: {
            ...p,
            selected: {
              tile: p.grid[row][col],
              source: { type: 'grid', pos: { row, col } },
            },
          },
        };
      }

      // A tile is selected — try to place it
      if (p.grid[row][col]) return prev; // cell occupied, ignore

      const newGrid = p.grid.map(r => [...r]);
      newGrid[row][col] = p.selected.tile;

      let newHand = p.hand;
      if (p.selected.source.type === 'hand') {
        newHand = p.hand.filter(t => t.id !== p.selected.tile.id);
      } else if (p.selected.source.type === 'grid') {
        const { row: sr, col: sc } = p.selected.source.pos;
        newGrid[sr][sc] = null;
      }

      return {
        ...prev,
        [playerNum]: { ...p, grid: newGrid, hand: newHand, selected: null },
      };
    });
  };

  const handleHandAreaTap = (playerNum) => {
    setPlayers(prev => {
      const p = prev[playerNum];
      if (!p.selected || p.selected.source.type !== 'grid') return prev;

      const { row, col } = p.selected.source.pos;
      const newGrid = p.grid.map(r => [...r]);
      newGrid[row][col] = null;

      return {
        ...prev,
        [playerNum]: {
          ...p,
          grid: newGrid,
          hand: [...p.hand, p.selected.tile],
          selected: null,
        },
      };
    });
  };

  // ── PEEL ─────────────────────────────────────────────────────────────────────
  // When a player calls PEEL with an empty hand:
  //   • If bunch has < NUM_PLAYERS tiles → they win (BANANAS!)
  //   • Otherwise → both players each draw one tile from the bunch
  const handlePeel = (playerNum) => {
    const p = players[playerNum];
    if (p.hand.length > 0) {
      showMsg(playerNum, 'Place all tiles before peeling!');
      return;
    }

    if (bunch.length < NUM_PLAYERS) {
      if (timerRef.current) clearInterval(timerRef.current);
      setWinner(playerNum);
      setGameState('won');
      return;
    }

    const otherNum = playerNum === 1 ? 2 : 1;
    const callerTile = bunch[0];
    const otherTile = bunch[1];

    setBunch(prev => prev.slice(2));

    // Clear any existing message timers
    [playerNum, otherNum].forEach(n => {
      if (msgTimers.current[n]) clearTimeout(msgTimers.current[n]);
    });

    setPlayers(prev => ({
      ...prev,
      [playerNum]: {
        ...prev[playerNum],
        hand: [...prev[playerNum].hand, callerTile],
        message: `🍌 PEEL! Drew: ${callerTile.letter}`,
      },
      [otherNum]: {
        ...prev[otherNum],
        hand: [...prev[otherNum].hand, otherTile],
        message: `🍌 P${playerNum} peeled! Drew: ${otherTile.letter}`,
      },
    }));

    msgTimers.current[playerNum] = setTimeout(() => {
      setPlayers(prev => ({ ...prev, [playerNum]: { ...prev[playerNum], message: '' } }));
    }, 2500);
    msgTimers.current[otherNum] = setTimeout(() => {
      setPlayers(prev => ({ ...prev, [otherNum]: { ...prev[otherNum], message: '' } }));
    }, 2500);
  };

  // ── DUMP ─────────────────────────────────────────────────────────────────────
  // Player returns their last hand tile to the bunch and draws 3 new ones.
  const handleDump = (playerNum) => {
    const p = players[playerNum];
    if (p.hand.length === 0) {
      showMsg(playerNum, 'No tiles in hand to dump!');
      return;
    }
    if (bunch.length < 3) {
      showMsg(playerNum, 'Not enough tiles in bunch!');
      return;
    }

    const tileToReturn = p.hand[p.hand.length - 1];
    const newTiles = bunch.slice(0, 3);
    const newBunch = shuffle([...bunch.slice(3), tileToReturn]);

    setBunch(newBunch);
    setPlayers(prev => ({
      ...prev,
      [playerNum]: {
        ...prev[playerNum],
        hand: [...prev[playerNum].hand.slice(0, -1), ...newTiles],
      },
    }));
    showMsg(playerNum, `Dumped ${tileToReturn.letter}, drew 3 tiles`);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  if (gameState === 'menu') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: baseFont,
        padding: '20px',
      }}>
        <div style={{
          background: 'linear-gradient(145deg, #FFE135, #F4D03F)',
          borderRadius: '24px',
          padding: '36px 44px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          textAlign: 'center',
          maxWidth: '420px',
          width: '100%',
        }}>
          <h1 style={{ fontSize: '2.2rem', margin: '0 0 6px 0', color: '#5D4037', fontWeight: '800' }}>
            🍌 BANANAGRAMS
          </h1>
          <p style={{ color: '#795548', fontSize: '1rem', margin: '0 0 28px 0', fontWeight: '600' }}>
            2 Player — Pass & Play
          </p>

          <button
            onClick={startGame}
            disabled={dictionaryLoading}
            style={{
              background: dictionaryLoading
                ? 'linear-gradient(145deg, #999, #888)'
                : 'linear-gradient(145deg, #4CAF50, #45a049)',
              border: 'none',
              borderRadius: '12px',
              padding: '15px 50px',
              fontSize: '1.2rem',
              color: 'white',
              cursor: dictionaryLoading ? 'not-allowed' : 'pointer',
              fontFamily: baseFont,
              fontWeight: '700',
              boxShadow: dictionaryLoading ? '0 6px 0 #666' : '0 6px 0 #2E7D32',
              touchAction: 'manipulation',
              opacity: dictionaryLoading ? 0.7 : 1,
            }}
          >
            {dictionaryLoading ? 'Loading Dictionary…' : 'PLAY'}
          </button>

          <div style={{
            marginTop: '28px',
            padding: '16px',
            background: 'rgba(255,255,255,0.4)',
            borderRadius: '12px',
            textAlign: 'left',
            color: '#5D4037',
            fontSize: '0.88rem',
            lineHeight: '1.75',
          }}>
            <strong>How to Play (2 Players):</strong><br/>
            • Each player starts with 21 tiles<br/>
            • Tap a tile to select, tap grid to place<br/>
            • Build connected, valid words<br/>
            • <strong>PEEL</strong> when your hand is empty — both players draw 1 tile<br/>
            • <strong>DUMP</strong> to swap 1 of your tiles for 3 new ones<br/>
            • First to empty hand when bunch has &lt;2 tiles wins <strong>BANANAS!</strong><br/>
            <br/>
            <em>Tip: lay the device flat — Player 1 plays from the top half.</em>
          </div>

          <a href="../bananagrams/index.html" style={{
            display: 'block',
            marginTop: '16px',
            color: '#795548',
            fontSize: '0.85rem',
            textDecoration: 'underline',
          }}>
            Single Player mode →
          </a>
          <a href="../bananagrams-online/index.html" style={{
            display: 'block',
            marginTop: '8px',
            color: '#795548',
            fontSize: '0.85rem',
            textDecoration: 'underline',
          }}>
            Online Multiplayer →
          </a>
        </div>
      </div>
    );
  }

  if (gameState === 'won') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: baseFont,
        padding: '20px',
      }}>
        <div style={{
          background: 'linear-gradient(145deg, #FFE135, #F4D03F)',
          borderRadius: '24px',
          padding: '40px 50px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          textAlign: 'center',
          maxWidth: '400px',
          width: '100%',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉🍌🏆</div>
          <h1 style={{ fontSize: '2.5rem', color: '#5D4037', margin: '0 0 12px 0', fontWeight: '800' }}>
            BANANAS!
          </h1>
          <p style={{ fontSize: '1.4rem', color: '#795548', margin: '0 0 8px 0', fontWeight: '700' }}>
            Player {winner} wins!
          </p>
          <p style={{ fontSize: '1.6rem', color: '#5D4037', fontWeight: 'bold', margin: '0 0 24px 0' }}>
            Time: {formatTime(timer)}
          </p>
          <button onClick={resetGame} style={{
            background: 'linear-gradient(145deg, #4CAF50, #45a049)',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 36px',
            fontSize: '1.1rem',
            color: 'white',
            cursor: 'pointer',
            fontFamily: baseFont,
            fontWeight: '700',
            boxShadow: '0 5px 0 #2E7D32',
            touchAction: 'manipulation',
          }}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // ── Playing ───────────────────────────────────────────────────────────────────
  return (
    <div style={{
      height: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      fontFamily: baseFont,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Player 1 — top half, rotated so they face the middle divider */}
      <PlayerSection
        playerNum={1}
        hand={players[1].hand}
        grid={players[1].grid}
        selected={players[1].selected}
        message={players[1].message}
        showWords={players[1].showWords}
        dictionary={dictionary}
        onTileSelect={(tile, src, pos) => handleTileSelect(1, tile, src, pos)}
        onGridCellTap={(r, c) => handleGridCellTap(1, r, c)}
        onHandAreaTap={() => handleHandAreaTap(1)}
        onPeel={() => handlePeel(1)}
        onDump={() => handleDump(1)}
        onToggleWords={() =>
          setPlayers(prev => ({
            ...prev,
            1: { ...prev[1], showWords: !prev[1].showWords },
          }))
        }
        flipped={true}
      />

      {/* ── Shared status bar (middle divider) ── */}
      <div style={{
        background: 'linear-gradient(145deg, #FFE135, #F4D03F)',
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
        zIndex: 10,
      }}>
        <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#5D4037' }}>
          🍌 {formatTime(timer)}
        </span>
        <span style={{
          background: 'rgba(93,64,55,0.2)',
          padding: '4px 12px',
          borderRadius: '8px',
          color: '#5D4037',
          fontWeight: '700',
          fontSize: '0.88rem',
        }}>
          Bunch: {bunch.length}
        </span>
        <button onClick={resetGame} style={{
          background: '#e74c3c',
          border: 'none',
          borderRadius: '7px',
          padding: '5px 12px',
          color: 'white',
          cursor: 'pointer',
          fontFamily: baseFont,
          fontWeight: '600',
          fontSize: '0.8rem',
          touchAction: 'manipulation',
        }}>
          Quit
        </button>
      </div>

      {/* Player 2 — bottom half, normal orientation */}
      <PlayerSection
        playerNum={2}
        hand={players[2].hand}
        grid={players[2].grid}
        selected={players[2].selected}
        message={players[2].message}
        showWords={players[2].showWords}
        dictionary={dictionary}
        onTileSelect={(tile, src, pos) => handleTileSelect(2, tile, src, pos)}
        onGridCellTap={(r, c) => handleGridCellTap(2, r, c)}
        onHandAreaTap={() => handleHandAreaTap(2)}
        onPeel={() => handlePeel(2)}
        onDump={() => handleDump(2)}
        onToggleWords={() =>
          setPlayers(prev => ({
            ...prev,
            2: { ...prev[2], showWords: !prev[2].showWords },
          }))
        }
        flipped={false}
      />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<BananagramsMultiplayer />);
