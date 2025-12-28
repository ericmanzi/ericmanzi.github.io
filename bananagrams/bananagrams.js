const { useState, useEffect, useRef, useCallback } = React;

// Letter distribution based on real Bananagrams
const LETTER_DISTRIBUTION = {
  A: 13, B: 3, C: 3, D: 6, E: 18, F: 3, G: 4, H: 3, I: 12, J: 2, K: 2, L: 5,
  M: 3, N: 8, O: 11, P: 3, Q: 2, R: 9, S: 6, T: 9, U: 6, V: 3, W: 3, X: 2, Y: 3, Z: 2
};

const GRID_SIZE = 25;
const STARTING_TILES = 21;
const DICTIONARY_URL = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';
const STORAGE_KEY = 'bananagrams_game_state';
const TRIGGER_WORDS = ['EL', 'EM', 'EN', 'EX', 'RE', 'MI', 'FA', 'LA', 'TI'];
const PASTEBIN_API_KEY = 'RPhCpcJRds2FA9J43iMJfOC-FiOSWys-';

function saveGameState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
}

function loadGameState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load game state:', error);
    return null;
  }
}

function clearGameState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear game state:', error);
  }
}

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

function Bananagrams() {
  const [bunch, setBunch] = useState([]);
  const [hand, setHand] = useState([]);
  const [grid, setGrid] = useState(() =>
    Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null))
  );
  const [gameState, setGameState] = useState('menu');
  const [timer, setTimer] = useState(0);
  const [message, setMessage] = useState('');
  const [showWords, setShowWords] = useState(false);
  const [selectedTile, setSelectedTile] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);
  const [dictionary, setDictionary] = useState(null);
  const [dictionaryLoading, setDictionaryLoading] = useState(true);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [easterEggResponse, setEasterEggResponse] = useState(null);
  const timerRef = useRef(null);
  const gridRef = useRef(null);

  const startGame = () => {
    // Clear any saved game state when starting fresh
    clearGameState();

    const newBag = createTileBag();
    const startingHand = newBag.slice(0, STARTING_TILES);
    const remainingBunch = newBag.slice(STARTING_TILES);

    setHand(startingHand);
    setBunch(remainingBunch);
    setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
    setGameState('playing');
    setTimer(0);
    setMessage('');
    setSelectedTile(null);
    setSelectedSource(null);

    timerRef.current = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
  };

  const resetGame = () => {
    // Clear saved game state when quitting
    clearGameState();

    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('menu');
    setTimer(0);
    setSelectedTile(null);
    setSelectedSource(null);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Restore saved game state on mount
  useEffect(() => {
    const saved = loadGameState();
    if (saved && saved.gameState === 'playing') {
      setBunch(saved.bunch || []);
      setHand(saved.hand || []);
      setGrid(saved.grid || Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
      setGameState(saved.gameState);
      setTimer(saved.timer || 0);

      // Restart timer if game was in progress
      timerRef.current = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
  }, []);

  // Load dictionary on mount
  useEffect(() => {
    fetch(DICTIONARY_URL)
      .then(response => response.text())
      .then(text => {
        const words = text.split('\n').map(word => word.trim().toUpperCase()).filter(word => word.length > 0);
        setDictionary(new Set(words));
        setDictionaryLoading(false);
      })
      .catch(error => {
        console.error('Failed to load dictionary:', error);
        setDictionaryLoading(false);
      });
  }, []);

  // Save game state whenever it changes
  useEffect(() => {
    if (gameState === 'playing') {
      saveGameState({
        bunch,
        hand,
        grid,
        gameState,
        timer
      });
    }
  }, [bunch, hand, grid, gameState, timer]);

  // Tap to select, tap to place
  const handleTileSelect = (tile, source, sourcePos = null) => {
    if (selectedTile && selectedTile.id === tile.id) {
      // Deselect if tapping same tile
      setSelectedTile(null);
      setSelectedSource(null);
    } else {
      setSelectedTile(tile);
      setSelectedSource({ type: source, pos: sourcePos });
    }
  };

  const handleGridCellTap = (row, col) => {
    if (!selectedTile) {
      // If tapping a cell with a tile, select it
      if (grid[row][col]) {
        handleTileSelect(grid[row][col], 'grid', { row, col });
      }
      return;
    }

    // If cell is occupied, swap or ignore
    if (grid[row][col]) {
      // Could implement swap here, for now just ignore
      return;
    }

    // Place the selected tile
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = selectedTile;

    if (selectedSource.type === 'hand') {
      setHand(hand.filter(t => t.id !== selectedTile.id));
    } else if (selectedSource.type === 'grid') {
      newGrid[selectedSource.pos.row][selectedSource.pos.col] = null;
    }

    setGrid(newGrid);
    setSelectedTile(null);
    setSelectedSource(null);
  };

  const handleHandAreaTap = () => {
    if (!selectedTile || selectedSource.type !== 'grid') return;

    // Move tile from grid back to hand
    const newGrid = grid.map(r => [...r]);
    newGrid[selectedSource.pos.row][selectedSource.pos.col] = null;
    setGrid(newGrid);
    setHand([...hand, selectedTile]);
    setSelectedTile(null);
    setSelectedSource(null);
  };

  const handlePeel = () => {
    if (hand.length > 0) {
      setMessage('Use all your tiles before peeling!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    if (bunch.length === 0) {
      // Clear saved game state when winning
      clearGameState();
      if (timerRef.current) clearInterval(timerRef.current);
      setGameState('won');
      return;
    }

    const newTile = bunch[0];
    setHand([...hand, newTile]);
    setBunch(bunch.slice(1));
    setMessage('🍌 PEEL! Drew: ' + newTile.letter);
    setTimeout(() => setMessage(''), 1500);
  };

  const handleDump = () => {
    if (hand.length === 0) {
      setMessage('No tiles in hand to dump!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    if (bunch.length < 3) {
      setMessage('Not enough tiles in bunch to dump!');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    const tileToReturn = hand[hand.length - 1];
    const newTiles = bunch.slice(0, 3);
    const newBunch = shuffle([...bunch.slice(3), tileToReturn]);

    setHand([...hand.slice(0, -1), ...newTiles]);
    setBunch(newBunch);
    setMessage('Dumped ' + tileToReturn.letter + ', drew 3 tiles');
    setTimeout(() => setMessage(''), 2000);
  };

  const tips = () => {
    setMessage('Two-letter words: Qi, ax, za, ew, pa, pi, re, se, ti, ta, sh, jo, za, gi, ma/pa, el,em/en/ex, xi/xu, ka/ki and what I call the Hs: ah/eh/uh/oh/ha/he/hi/hm/ho. More common words: ab, am, an, as, at, ax, aw, by, do, go, if, in, is, me, my, no, of, on, or, ow, pi, sh, to, up, us, we, yo');
    setTimeout(() => setMessage(''), 30000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getWordsOnGrid = () => {
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
          if (word.length >= 2) {
            words.push({ word, row, col: startCol, direction: 'h' });
          }
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
          if (word.length >= 2) {
            words.push({ word, row: startRow, col, direction: 'v' });
          }
          word = '';
        }
      }
    }

    return words;
  };

  const gridWords = getWordsOnGrid();
  const validWords = dictionary ? gridWords.filter(w => dictionary.has(w.word)) : [];

  // Check for Easter egg trigger words
  useEffect(() => {
    if (gameState === 'playing' && !showEasterEgg && easterEggResponse === null) {
      const hasTriggerWord = gridWords.some(w => TRIGGER_WORDS.includes(w.word));
      if (hasTriggerWord) {
        setShowEasterEgg(true);
      }
    }
  }, [gridWords, gameState, showEasterEgg, easterEggResponse]);

  const baseFont = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const tileStyle = (isSelected) => ({
    width: '44px',
    height: '44px',
    background: isSelected
      ? 'linear-gradient(145deg, #4CAF50, #45a049)'
      : 'linear-gradient(145deg, #FFE135, #F4D03F)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.4rem',
    fontWeight: '700',
    color: isSelected ? 'white' : '#5D4037',
    cursor: 'pointer',
    boxShadow: isSelected
      ? '0 3px 0 #2E7D32, inset 0 1px 0 rgba(255,255,255,0.4)'
      : '0 3px 0 #D4AC0D, inset 0 1px 0 rgba(255,255,255,0.4)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'manipulation',
    transition: 'all 0.15s ease'
  });

  const gridTileStyle = (isSelected) => ({
    width: '36px',
    height: '36px',
    background: isSelected
      ? 'linear-gradient(145deg, #4CAF50, #45a049)'
      : 'linear-gradient(145deg, #FFE135, #F4D03F)',
    borderRadius: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    fontWeight: '700',
    color: isSelected ? 'white' : '#5D4037',
    cursor: 'pointer',
    boxShadow: isSelected
      ? '0 2px 0 #2E7D32, inset 0 1px 0 rgba(255,255,255,0.4)'
      : '0 2px 0 #D4AC0D, inset 0 1px 0 rgba(255,255,255,0.4)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'manipulation'
  });

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
        padding: '20px'
      }}>
        <div style={{
          background: 'linear-gradient(145deg, #FFE135, #F4D03F)',
          borderRadius: '24px',
          padding: '40px 50px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <h1 style={{
            fontSize: '2.2rem',
            margin: '0 0 8px 0',
            color: '#5D4037',
            fontWeight: '800'
          }}>
            🍌 BANANAGRAMS
          </h1>
          <p style={{
            color: '#795548',
            fontSize: '1rem',
            margin: '0 0 30px 0',
            fontWeight: '500'
          }}>
            Single Player
          </p>

          <button onClick={startGame} disabled={dictionaryLoading} style={{
            background: dictionaryLoading
              ? 'linear-gradient(145deg, #999, #888)'
              : 'linear-gradient(145deg, #4CAF50, #45a049)',
            border: 'none',
            borderRadius: '12px',
            padding: '16px 50px',
            fontSize: '1.25rem',
            color: 'white',
            cursor: dictionaryLoading ? 'not-allowed' : 'pointer',
            fontFamily: baseFont,
            fontWeight: '700',
            boxShadow: dictionaryLoading ? '0 6px 0 #666' : '0 6px 0 #2E7D32',
            touchAction: 'manipulation',
            opacity: dictionaryLoading ? 0.7 : 1
          }}>
            {dictionaryLoading ? 'Loading Dictionary...' : 'PLAY'}
          </button>

          <div style={{
            marginTop: '30px',
            padding: '16px',
            background: 'rgba(255,255,255,0.4)',
            borderRadius: '12px',
            textAlign: 'left',
            color: '#5D4037',
            fontSize: '0.9rem',
            lineHeight: '1.7'
          }}>
            <strong>How to Play:</strong><br/>
            • Tap a tile to select it, tap grid to place<br/>
            • Build interconnected words<br/>
            • <strong>PEEL</strong> when all tiles placed<br/>
            • <strong>DUMP</strong> to swap 1 tile for 3 new<br/>
            • Win when bunch is empty!
          </div>
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
        padding: '20px'
      }}>
        <div style={{
          background: 'linear-gradient(145deg, #FFE135, #F4D03F)',
          borderRadius: '24px',
          padding: '40px 50px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉🍌🏆</div>
          <h1 style={{
            fontSize: '2.5rem',
            color: '#5D4037',
            margin: '0 0 16px 0',
            fontWeight: '800'
          }}>
            BANANAS!
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#795548', margin: '0 0 8px 0' }}>
            You completed the game!
          </p>
          <p style={{ fontSize: '1.75rem', color: '#5D4037', fontWeight: 'bold' }}>
            Time: {formatTime(timer)}
          </p>
          <p style={{ fontSize: '1rem', color: '#795548', margin: '8px 0 24px 0' }}>
            Words formed: {validWords.length}
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
            touchAction: 'manipulation'
          }}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      fontFamily: baseFont,
      padding: '10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      position: 'relative'
    }}>
      {/* Easter Egg Overlay */}
      {showEasterEgg && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.5s ease'
        }}>
          <style>
            {`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-20px); }
              }
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
              }
              .flower {
                position: absolute;
                font-size: 3rem;
                animation: float 3s ease-in-out infinite;
                opacity: 0.8;
              }
            `}
          </style>

          {/* Floating flowers */}
          <div className="flower" style={{ top: '10%', left: '10%', animationDelay: '0s' }}>🌸</div>
          <div className="flower" style={{ top: '15%', right: '15%', animationDelay: '0.5s' }}>🌺</div>
          <div className="flower" style={{ bottom: '20%', left: '8%', animationDelay: '1s' }}>🌼</div>
          <div className="flower" style={{ bottom: '15%', right: '10%', animationDelay: '1.5s' }}>🌷</div>
          <div className="flower" style={{ top: '40%', left: '5%', animationDelay: '2s' }}>🌹</div>
          <div className="flower" style={{ top: '35%', right: '8%', animationDelay: '2.5s' }}>💐</div>
          <div className="flower" style={{ bottom: '40%', left: '12%', animationDelay: '0.8s' }}>🏵️</div>
          <div className="flower" style={{ bottom: '45%', right: '15%', animationDelay: '1.8s' }}>🌻</div>

          <div style={{
            background: 'linear-gradient(145deg, #FFE5E5, #FFD5D5)',
            borderRadius: '30px',
            padding: '50px 60px',
            boxShadow: '0 30px 80px rgba(255, 105, 180, 0.5)',
            textAlign: 'center',
            maxWidth: '500px',
            border: '3px solid rgba(255, 182, 193, 0.8)',
            animation: 'pulse 2s ease-in-out infinite',
            position: 'relative',
            zIndex: 10000
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>💖</div>
            <h1 style={{
              fontSize: '2rem',
              color: '#C41E3A',
              margin: '0 0 30px 0',
              fontWeight: '800',
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
            }}>
              Hi Rebekah!
            </h1>
            <p style={{
              fontSize: '1.5rem',
              color: '#D63384',
              margin: '0 0 40px 0',
              fontWeight: '600'
            }}>
              Will you go on a <a href='https://icecastles.com/new-hampshire/'>weekend getaway</a> with me?
            </p>

            {easterEggResponse === null ? (
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                <button onClick={() => setEasterEggResponse('yes')} style={{
                  background: 'linear-gradient(145deg, #FF69B4, #FF1493)',
                  border: 'none',
                  borderRadius: '15px',
                  padding: '18px 50px',
                  fontSize: '1.4rem',
                  color: 'white',
                  cursor: 'pointer',
                  fontFamily: baseFont,
                  fontWeight: '700',
                  boxShadow: '0 6px 0 #C71585',
                  touchAction: 'manipulation',
                  transition: 'transform 0.1s'
                }}>
                  Yes! 💕
                </button>
                <button onClick={() => setEasterEggResponse('no')} style={{
                  background: 'linear-gradient(145deg, #999, #777)',
                  border: 'none',
                  borderRadius: '15px',
                  padding: '18px 50px',
                  fontSize: '1.4rem',
                  color: 'white',
                  cursor: 'pointer',
                  fontFamily: baseFont,
                  fontWeight: '700',
                  boxShadow: '0 6px 0 #555',
                  touchAction: 'manipulation',
                  transition: 'transform 0.1s'
                }}>
                  No
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '3rem', margin: '20px 0' }}>
                  {easterEggResponse === 'yes' ? '🎉💖✨' : '💔'}
                </div>
                <p style={{
                  fontSize: '1.2rem',
                  color: '#D63384',
                  margin: '20px 0',
                  fontWeight: '600'
                }}>
                  {easterEggResponse === 'yes'
                    ? 'Yay! You made my day! 💕'
                    : 'Oh... okay 😢'}
                </p>
                <button onClick={() => setShowEasterEgg(false)} style={{
                  background: 'linear-gradient(145deg, #4CAF50, #45a049)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px 40px',
                  fontSize: '1.1rem',
                  color: 'white',
                  cursor: 'pointer',
                  fontFamily: baseFont,
                  fontWeight: '700',
                  boxShadow: '0 5px 0 #2E7D32',
                  touchAction: 'manipulation'
                }}>
                  Continue Playing
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={handlePeel} style={{
          flex: 1,
          background: hand.length === 0
            ? 'linear-gradient(145deg, #4CAF50, #45a049)'
            : 'linear-gradient(145deg, #666, #555)',
          border: 'none',
          borderRadius: '10px',
          padding: '12px',
          fontSize: '0.95rem',
          color: 'white',
          cursor: 'pointer',
          fontFamily: baseFont,
          fontWeight: '700',
          boxShadow: hand.length === 0 ? '0 4px 0 #2E7D32' : '0 4px 0 #444',
          touchAction: 'manipulation'
        }}>
          🍌 PEEL
        </button>

        <button onClick={handleDump} style={{
          flex: 1,
          background: 'linear-gradient(145deg, #e67e22, #d35400)',
          border: 'none',
          borderRadius: '10px',
          padding: '12px',
          fontSize: '0.95rem',
          color: 'white',
          cursor: 'pointer',
          fontFamily: baseFont,
          fontWeight: '700',
          boxShadow: '0 4px 0 #a04000',
          touchAction: 'manipulation'
        }}>
          🔄 DUMP
        </button>

        <button onClick={() => setShowWords(!showWords)} style={{
          background: showWords ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
          border: '2px solid rgba(255,255,255,0.2)',
          borderRadius: '10px',
          padding: '12px 14px',
          fontSize: '0.85rem',
          color: 'white',
          cursor: 'pointer',
          fontFamily: baseFont,
          fontWeight: '600',
          touchAction: 'manipulation'
        }}>
          {gridWords.length}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          background: 'linear-gradient(145deg, #FFE135, #F4D03F)',
          padding: '10px 16px',
          borderRadius: '10px',
          textAlign: 'center',
          color: '#5D4037',
          fontWeight: '600',
          fontSize: '0.95rem'
        }}>
          {message}
        </div>
      )}

      {/* Words panel */}
      {showWords && gridWords.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '10px',
          padding: '8px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '5px',
          maxHeight: '70px',
          overflow: 'auto'
        }}>
          {gridWords.map((w, i) => {
            const isValid = dictionary ? dictionary.has(w.word) : false;
            return (
              <div key={i} style={{
                padding: '3px 8px',
                borderRadius: '5px',
                fontSize: '0.8rem',
                fontWeight: '600',
                background: isValid
                  ? 'rgba(46, 204, 113, 0.3)'
                  : 'rgba(231, 76, 60, 0.3)',
                color: isValid ? '#2ecc71' : '#e74c3c'
              }}>
                {w.word} {isValid ? '✓' : '?'}
              </div>
            );
          })}
        </div>
      )}

      {/* Hand */}
      <div
        onClick={handleHandAreaTap}
        style={{
          background: selectedTile && selectedSource?.type === 'grid'
            ? 'rgba(76, 175, 80, 0.15)'
            : 'rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '12px',
          minHeight: '80px',
          border: selectedTile && selectedSource?.type === 'grid'
            ? '2px dashed rgba(76, 175, 80, 0.5)'
            : '2px solid transparent'
        }}
      >
        <div style={{
          color: 'rgba(255,255,255,0.4)',
          marginBottom: '8px',
          fontSize: '0.75rem',
          fontWeight: '500',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Your Hand — Tap to select
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px'
        }}
        onClick={(e) => e.stopPropagation()}
        >
          {hand.map((tile) => {
            const isSelected = selectedTile?.id === tile.id && selectedSource?.type === 'hand';
            return (
              <div
                key={tile.id}
                onClick={() => handleTileSelect(tile, 'hand')}
                style={tileStyle(isSelected)}
              >
                {tile.letter}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        style={{
          flex: 1,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '8px',
          overflow: 'auto',
          minHeight: 0,
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, 36px)`,
          gap: '2px',
          background: '#2c3e50',
          padding: '6px',
          borderRadius: '8px',
          alignContent: 'start'
        }}>
          {grid.map((row, rowIdx) =>
            row.map((cell, colIdx) => {
              const isSelected = selectedTile && selectedSource?.type === 'grid' &&
                selectedSource?.pos?.row === rowIdx && selectedSource?.pos?.col === colIdx;

              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  onClick={() => handleGridCellTap(rowIdx, colIdx)}
                  style={{
                    width: '36px',
                    height: '36px',
                    background: cell
                      ? undefined
                      : selectedTile ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255,255,255,0.06)',
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    touchAction: 'manipulation',
                    ...(cell ? gridTileStyle(isSelected) : {})
                  }}
                >
                  {cell?.letter}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Selected tile indicator */}
      {selectedTile && (
        <div style={{
          background: 'rgba(76, 175, 80, 0.3)',
          padding: '8px 16px',
          borderRadius: '10px',
          textAlign: 'center',
          color: '#4CAF50',
          fontWeight: '600',
          fontSize: '0.9rem'
        }}>
          Selected: {selectedTile.letter} — Tap grid to place or tap hand area to return
        </div>
      )}

      {/* Timer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        background: 'linear-gradient(145deg, #FFE135, #F4D03F)',
        borderRadius: '12px',
        flexWrap: 'wrap'
      }}>
        <button onClick={tips} style={{
          cursor: 'pointer',
          fontSize: '1.3rem',
          border: 'none',
          touchAction: 'manipulation',
          background: 'rgba(255, 225, 53, 0.15)'
        }}>🍌</button>

        <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#5D4037' }}>
          {formatTime(timer)}
        </span>

        <div style={{ display: 'flex', gap: '6px', flex: 1, justifyContent: 'center' }}>
          <div style={{
            background: 'rgba(93, 64, 55, 0.15)',
            padding: '5px 10px',
            borderRadius: '6px',
            color: '#5D4037',
            fontWeight: '600',
            fontSize: '0.8rem'
          }}>
            Bunch: {bunch.length}
          </div>
          <div style={{
            background: 'rgba(93, 64, 55, 0.15)',
            padding: '5px 10px',
            borderRadius: '6px',
            color: '#5D4037',
            fontWeight: '600',
            fontSize: '0.8rem'
          }}>
            Hand: {hand.length}
          </div>
        </div>

        <button onClick={resetGame} style={{
          background: '#e74c3c',
          border: 'none',
          borderRadius: '6px',
          padding: '6px 12px',
          color: 'white',
          cursor: 'pointer',
          fontFamily: baseFont,
          fontWeight: '600',
          fontSize: '0.8rem',
          touchAction: 'manipulation'
        }}>
          Quit
        </button>
      </div>
    </div>
  );
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Bananagrams />);
