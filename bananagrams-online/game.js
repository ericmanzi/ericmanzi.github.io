const { useState, useEffect, useRef } = React;

// ── Constants ────────────────────────────────────────────────────────────────

const GRID_SIZE = 25;
const DICTIONARY_URL = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';
const baseFont = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const PING_INTERVAL_MS = 8 * 60 * 1000; // 8 min — keeps API GW connection alive
const ONLINE_STORAGE_KEY = 'bananagrams_online_state';

function saveOnlineState(state) {
  try { localStorage.setItem(ONLINE_STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}
function loadOnlineState() {
  try { const s = localStorage.getItem(ONLINE_STORAGE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
function clearOnlineState() {
  try { localStorage.removeItem(ONLINE_STORAGE_KEY); } catch (e) {}
}

// ── Utilities ────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createEmptyGrid() {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
}

function formatTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function getWordsOnGrid(grid) {
  const words = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    let word = '', startCol = -1;
    for (let col = 0; col <= GRID_SIZE; col++) {
      const cell = col < GRID_SIZE ? grid[row][col] : null;
      if (cell) { if (!word) startCol = col; word += cell.letter; }
      else { if (word.length >= 2) words.push({ word, row, col: startCol, direction: 'h' }); word = ''; }
    }
  }
  for (let col = 0; col < GRID_SIZE; col++) {
    let word = '', startRow = -1;
    for (let row = 0; row <= GRID_SIZE; row++) {
      const cell = row < GRID_SIZE ? grid[row][col] : null;
      if (cell) { if (!word) startRow = row; word += cell.letter; }
      else { if (word.length >= 2) words.push({ word, row: startRow, col, direction: 'v' }); word = ''; }
    }
  }
  return words;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    fontFamily: baseFont, padding: '20px',
  },
  card: {
    background: 'linear-gradient(145deg, #FFE135, #F4D03F)',
    borderRadius: '24px', padding: '36px 44px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
    textAlign: 'center', maxWidth: '420px', width: '100%',
  },
  title: { fontSize: '2.2rem', margin: '0 0 6px 0', color: '#5D4037', fontWeight: '800' },
  subtitle: { color: '#795548', fontSize: '1rem', margin: '0 0 28px 0', fontWeight: '600' },
  btn: (color, shadow) => ({
    background: color, border: 'none', borderRadius: '12px',
    padding: '14px 32px', fontSize: '1.1rem', color: 'white',
    cursor: 'pointer', fontFamily: baseFont, fontWeight: '700',
    boxShadow: `0 5px 0 ${shadow}`, touchAction: 'manipulation',
    transition: 'opacity 0.15s',
  }),
  input: {
    width: '100%', padding: '12px 16px', fontSize: '1.4rem', fontWeight: '700',
    borderRadius: '10px', border: '2px solid rgba(93,64,55,0.3)',
    background: 'rgba(255,255,255,0.6)', color: '#5D4037',
    textAlign: 'center', letterSpacing: '0.2em', textTransform: 'uppercase',
    fontFamily: baseFont, outline: 'none',
  },
  codeBox: {
    background: 'rgba(255,255,255,0.5)', borderRadius: '12px',
    padding: '16px 24px', margin: '16px 0',
  },
  codeText: { fontSize: '2.5rem', fontWeight: '900', color: '#5D4037', letterSpacing: '0.3em' },
  infoRow: {
    background: 'rgba(255,255,255,0.4)', borderRadius: '12px',
    padding: '14px 16px', marginTop: '16px',
    textAlign: 'left', color: '#5D4037', fontSize: '0.88rem', lineHeight: '1.75',
  },
};

// ── OpponentBar ──────────────────────────────────────────────────────────────

function OpponentBar({ handSize, wordCount, bunchSize }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)', borderRadius: '10px',
      padding: '8px 14px', display: 'flex', alignItems: 'center',
      gap: '10px', flexShrink: 0,
    }}>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Opponent
      </span>
      <Pip label="hand" value={handSize} color="#e67e22" />
      <Pip label="words" value={wordCount} color="#2ecc71" />
      <div style={{ marginLeft: 'auto' }}>
        <Pip label="bunch" value={bunchSize} color="#4a90d9" />
      </div>
    </div>
  );
}

function Pip({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ background: color, borderRadius: '4px', padding: '2px 7px', fontSize: '0.82rem', fontWeight: '700', color: 'white' }}>{value}</span>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>{label}</span>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────

function OnlineBananagrams() {
  // ── screen: 'menu' | 'connecting' | 'waiting' | 'joining' | 'playing' | 'won' | 'error'
  const [screen, setScreen] = useState('menu');
  const [joinInput, setJoinInput] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [connError, setConnError] = useState('');

  // game state
  const [role, setRole] = useState(null);           // 'host' | 'guest'
  const [hand, setHand] = useState([]);
  const [grid, setGrid] = useState(createEmptyGrid);
  const [selected, setSelected] = useState(null);   // { tile, source: { type, pos } }
  const [bunchSize, setBunchSize] = useState(0);
  const [opponent, setOpponent] = useState({ handSize: 21, wordCount: 0 });
  const [message, setMessage] = useState('');
  const [timer, setTimer] = useState(0);
  const [gameResult, setGameResult] = useState(null); // { winner: 'me'|'them' }
  const [dictionary, setDictionary] = useState(null);
  const [dictLoading, setDictLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [savedOnline, setSavedOnline] = useState(null);

  // refs for use inside WS callbacks (avoid stale closures)
  const wsRef       = useRef(null);
  const timerRef    = useRef(null);
  const pingRef     = useRef(null);
  const msgTimerRef = useRef(null);
  const roleRef     = useRef(null);
  const roomRef     = useRef('');
  const handRef     = useRef([]);
  const gridRef     = useRef(createEmptyGrid());
  const screenRef   = useRef('menu');

  // keep refs in sync
  useEffect(() => { roleRef.current   = role;     }, [role]);
  useEffect(() => { roomRef.current   = roomCode; }, [roomCode]);
  useEffect(() => { handRef.current   = hand;     }, [hand]);
  useEffect(() => { gridRef.current   = grid;     }, [grid]);
  useEffect(() => { screenRef.current = screen;   }, [screen]);

  // load dictionary
  useEffect(() => {
    fetch(DICTIONARY_URL)
      .then(r => r.text())
      .then(text => {
        setDictionary(new Set(text.split('\n').map(w => w.trim().toUpperCase()).filter(Boolean)));
        setDictLoading(false);
      })
      .catch(() => setDictLoading(false));
  }, []);

  // Refresh savedOnline from localStorage whenever we arrive at the menu screen
  useEffect(() => {
    if (screen === 'menu') {
      const saved = loadOnlineState();
      setSavedOnline(saved?.roomCode ? saved : null);
    }
  }, [screen]);

  // Persist hand + grid + timer to localStorage while playing so rejoin can restore them
  useEffect(() => {
    if (screen === 'playing' && roomCode && role) {
      saveOnlineState({ roomCode, role, hand, grid, timer });
    }
  }, [hand, grid, screen, roomCode, role, timer]);

  // cleanup on unmount
  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(pingRef.current);
    clearTimeout(msgTimerRef.current);
    wsRef.current?.close();
  }, []);

  // send status updates to opponent every 3 s while playing
  useEffect(() => {
    if (screen !== 'playing') return;
    const id = setInterval(() => {
      wsSend({ action: 'status', roomCode: roomRef.current, role: roleRef.current,
               handSize: handRef.current.length,
               wordCount: getWordsOnGrid(gridRef.current).length });
    }, 3000);
    return () => clearInterval(id);
  }, [screen]);

  // ── helpers ────────────────────────────────────────────────────────────────

  const showMsg = (msg, duration = 3000) => {
    clearTimeout(msgTimerRef.current);
    setMessage(msg);
    if (msg && duration > 0) msgTimerRef.current = setTimeout(() => setMessage(''), duration);
  };

  const wsSend = (data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify(data));
  };

  const startTimer = () => {
    clearInterval(timerRef.current);
    setTimer(0);
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
  };

  const startPing = () => {
    clearInterval(pingRef.current);
    pingRef.current = setInterval(() => wsSend({ action: 'ping' }), PING_INTERVAL_MS);
  };

  // ── WebSocket message handler ──────────────────────────────────────────────

  const onMessage = (event) => {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }

    switch (data.type) {
      case 'ROOM_CREATED':
        setRoomCode(data.roomCode);
        roomRef.current = data.roomCode;
        setScreen('waiting');
        break;

      case 'GAME_START': {
        setRole(data.role);
        roleRef.current = data.role;
        setHand(data.hand);
        handRef.current = data.hand;
        const emptyGrid = createEmptyGrid();
        setGrid(emptyGrid);
        gridRef.current = emptyGrid;
        setSelected(null);
        setGameResult(null);
        setOpponent({ handSize: 21, wordCount: 0 });
        setMessage('');
        setBunchSize(data.bunchSize);
        setScreen('playing');
        startTimer();
        startPing();
        break;
      }

      case 'PEEL_RESULT': {
        setHand(prev => [...prev, data.tile]);
        setBunchSize(data.bunchSize);
        const byMe = data.initiator === roleRef.current;
        showMsg(byMe
          ? `🍌 PEEL! Drew: ${data.tile.letter}  (${data.bunchSize} left)`
          : `🍌 Opponent peeled! You drew: ${data.tile.letter}`);
        break;
      }

      case 'DUMP_RESULT':
        setHand(prev => [...prev.filter(t => t.id !== data.removedTileId), ...data.tiles]);
        setBunchSize(data.bunchSize);
        showMsg(`Dumped ${data.removedLetter}, drew 3 tiles`);
        break;

      case 'DUMP_ERROR':
        showMsg(data.reason);
        break;

      case 'OPPONENT_STATUS':
        setOpponent({ handSize: data.handSize, wordCount: data.wordCount });
        break;

      case 'GAME_OVER':
        clearInterval(timerRef.current);
        clearInterval(pingRef.current);
        setGameResult({ winner: data.winner === roleRef.current ? 'me' : 'them' });
        setScreen('won');
        break;

      case 'OPPONENT_DISCONNECTED':
        showMsg('⏳ Opponent disconnected — game paused. Waiting for them to rejoin…', 0);
        break;

      case 'OPPONENT_RECONNECTED':
        showMsg('✅ Opponent reconnected! Game resumes.', 3000);
        break;

      case 'REJOIN_OK': {
        setRole(data.role);
        roleRef.current = data.role;
        // Use hand from server (authoritative); fall back to locally-saved hand
        const restoredHand = data.hand?.length > 0 ? data.hand : (loadOnlineState()?.hand || []);
        setHand(restoredHand);
        handRef.current = restoredHand;
        setBunchSize(data.bunchSize);
        if (data.roomCode) { setRoomCode(data.roomCode); roomRef.current = data.roomCode; }
        // Restore grid from localStorage (only the client knows where tiles were placed)
        const savedForGrid = loadOnlineState();
        const restoredGrid = savedForGrid?.grid || createEmptyGrid();
        setGrid(restoredGrid);
        gridRef.current = restoredGrid;
        setSelected(null);
        setGameResult(null);
        setOpponent({ handSize: 0, wordCount: 0 });
        setMessage('');
        setScreen('playing');
        clearInterval(timerRef.current);
        const restoredTimer = savedForGrid?.timer || 0;
        setTimer(restoredTimer);
        timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
        startPing();
        break;
      }

      case 'ERROR':
        setConnError(data.message || 'An error occurred.');
        setScreen('error');
        break;

      default:
        break;
    }
  };

  // ── WebSocket setup ────────────────────────────────────────────────────────

  const openWS = (onOpen) => {
    wsRef.current?.close();
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen    = onOpen;
    ws.onmessage = onMessage;
    ws.onerror   = () => { setConnError('Could not reach the game server. Check your connection and try again.'); setScreen('error'); };
    ws.onclose   = () => {
      clearInterval(pingRef.current);
      const s = screenRef.current;
      if (s === 'playing' || s === 'waiting') {
        setScreen('menu');
      } else if (s === 'connecting') {
        // WS closed before we got a response — surface an error rather than hanging
        setConnError('Connection closed before the game could start. Check your connection and try again.');
        setScreen('error');
      }
    };
  };

  const createRoom = () => {
    setScreen('connecting');
    openWS(() => wsSend({ action: 'createRoom' }));
  };

  const joinRoom = () => {
    const code = joinInput.trim().toUpperCase();
    if (!code) return;
    setRoomCode(code);
    roomRef.current = code;
    setScreen('connecting');
    openWS(() => wsSend({ action: 'joinRoom', roomCode: code }));
  };

  const resetToMenu = () => {
    clearInterval(timerRef.current);
    clearInterval(pingRef.current);
    clearOnlineState();
    wsRef.current?.close();
    wsRef.current = null;
    setScreen('menu');
    setJoinInput('');
    setRoomCode('');
    setConnError('');
    setGameResult(null);
    setHand([]);
    setGrid(createEmptyGrid());
    setSelected(null);
    setMessage('');
    setTimer(0);
  };

  const rejoinSavedGame = () => {
    const saved = loadOnlineState();
    if (!saved) return;
    const { roomCode: rc, role: r } = saved;
    setRoomCode(rc);
    roomRef.current = rc;
    setScreen('connecting');
    openWS(() => wsSend({ action: 'rejoinRoom', roomCode: rc, role: r }));
    // If the server doesn't reply within 8 s (e.g. backend not yet redeployed),
    // stop waiting and show a clear error instead of hanging on 'connecting'.
    setTimeout(() => {
      if (screenRef.current !== 'connecting') return;
      wsRef.current?.close();
      clearOnlineState();
      setConnError('No response from the server — the session may have expired. Start a new game.');
      setScreen('error');
    }, 8000);
  };

  // ── Game actions ───────────────────────────────────────────────────────────

  const handlePeel = () => {
    if (hand.length > 0) { showMsg('Place all your tiles before peeling!'); return; }
    wsSend({ action: 'peel', roomCode: roomRef.current, role: roleRef.current });
  };

  const handleDump = () => {
    if (hand.length === 0) { showMsg('No tiles in hand to dump!'); return; }
    if (bunchSize < 3)     { showMsg('Not enough tiles in the bunch!'); return; }
    // Prefer the selected hand tile; fall back to the last tile in hand
    const tile = selected?.source?.type === 'hand' ? selected.tile : hand[hand.length - 1];
    setSelected(null);
    setHand(prev => prev.filter(t => t.id !== tile.id));
    wsSend({ action: 'dump', roomCode: roomRef.current, role: roleRef.current, tile });
  };

  const handleTileSelect = (tile, sourceType, sourcePos = null) => {
    setSelected(prev =>
      prev?.tile?.id === tile.id
        ? null
        : { tile, source: { type: sourceType, pos: sourcePos } }
    );
  };

  const handleGridCellTap = (row, col) => {
    if (!selected) {
      if (grid[row][col]) handleTileSelect(grid[row][col], 'grid', { row, col });
      return;
    }
    if (grid[row][col]) { showMsg('That cell is occupied — tap an empty cell.'); return; }

    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = selected.tile;
    if (selected.source.type === 'hand') {
      setHand(prev => prev.filter(t => t.id !== selected.tile.id));
    } else {
      newGrid[selected.source.pos.row][selected.source.pos.col] = null;
    }
    setGrid(newGrid);
    setSelected(null);
  };

  const handleHandAreaTap = () => {
    if (!selected || selected.source.type !== 'grid') return;
    const newGrid = grid.map(r => [...r]);
    newGrid[selected.source.pos.row][selected.source.pos.col] = null;
    setGrid(newGrid);
    setHand(prev => [...prev, selected.tile]);
    setSelected(null);
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Screens ────────────────────────────────────────────────────────────────

  if (screen === 'menu') {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <h1 style={S.title}>🍌 BANANAGRAMS</h1>
          <p style={S.subtitle}>Online Multiplayer</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {savedOnline && (
              <button onClick={rejoinSavedGame} style={S.btn('linear-gradient(145deg, #e67e22, #d35400)', '#a04000')}>
                ↩ Rejoin {savedOnline.roomCode}
              </button>
            )}
            <button onClick={createRoom} style={S.btn('linear-gradient(145deg, #4CAF50, #45a049)', '#2E7D32')}>
              Create Room
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                style={{ ...S.input, flex: 1 }}
                placeholder="ROOM CODE"
                value={joinInput}
                onChange={e => setJoinInput(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && joinRoom()}
                maxLength={6}
              />
              <button
                onClick={joinRoom}
                disabled={joinInput.trim().length < 4}
                style={{ ...S.btn('linear-gradient(145deg, #4a90d9, #2471a3)', '#1a5276'), opacity: joinInput.trim().length < 4 ? 0.5 : 1 }}
              >
                Join
              </button>
            </div>
          </div>

          <div style={S.infoRow}>
            <strong>How to play:</strong><br/>
            • Share the 6-letter room code with a friend<br/>
            • Each player starts with 21 tiles<br/>
            • <strong>PEEL</strong> when hand is empty — both draw 1 tile<br/>
            • <strong>DUMP</strong> to swap 1 tile for 3 new ones<br/>
            • First to empty hand when bunch &lt; 2 tiles wins <strong>BANANAS!</strong>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <a href="../bananagrams/index.html" style={{ color: '#795548', fontSize: '0.85rem' }}>Single Player →</a>
            <a href="../bananagrams-multiplayer/index.html" style={{ color: '#795548', fontSize: '0.85rem' }}>Pass &amp; Play →</a>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'connecting') {
    return (
      <div style={S.page}>
        <div style={{ ...S.card, padding: '48px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🍌</div>
          <p style={{ color: '#5D4037', fontWeight: '700', fontSize: '1.1rem' }}>Connecting…</p>
        </div>
      </div>
    );
  }

  if (screen === 'waiting') {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <h1 style={S.title}>🍌 Room Ready</h1>
          <p style={{ color: '#795548', fontWeight: '600', marginBottom: '8px' }}>
            Share this code with your opponent:
          </p>
          <div style={S.codeBox}>
            <div style={S.codeText}>{roomCode}</div>
          </div>
          <button
            onClick={copyCode}
            style={{ ...S.btn('linear-gradient(145deg, #666, #555)', '#444'), marginBottom: '20px', fontSize: '0.95rem', padding: '10px 24px' }}
          >
            {copied ? '✓ Copied!' : 'Copy Code'}
          </button>
          <p style={{ color: '#795548', fontSize: '0.95rem', fontWeight: '500' }}>
            ⏳ Waiting for Player 2 to join…
          </p>
          <button onClick={resetToMenu} style={{ marginTop: '20px', background: 'none', border: 'none', color: '#a0856e', cursor: 'pointer', fontSize: '0.85rem', fontFamily: baseFont }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'error') {
    return (
      <div style={S.page}>
        <div style={{ ...S.card, padding: '40px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ color: '#5D4037', marginBottom: '12px', fontWeight: '800' }}>Connection Error</h2>
          <p style={{ color: '#795548', marginBottom: '24px', fontSize: '0.95rem' }}>{connError}</p>
          <button onClick={resetToMenu} style={S.btn('linear-gradient(145deg, #4CAF50, #45a049)', '#2E7D32')}>
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'won') {
    const iWon = gameResult?.winner === 'me';
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>{iWon ? '🎉🍌🏆' : '🍌😔'}</div>
          <h1 style={{ ...S.title, fontSize: '2.5rem' }}>{iWon ? 'BANANAS!' : 'So close!'}</h1>
          <p style={{ fontSize: '1.2rem', color: '#795548', margin: '8px 0', fontWeight: '700' }}>
            {iWon ? 'You won!' : 'Opponent wins this time.'}
          </p>
          <p style={{ fontSize: '1.5rem', color: '#5D4037', fontWeight: 'bold', margin: '8px 0 24px' }}>
            {formatTime(timer)}
          </p>
          <button onClick={resetToMenu} style={S.btn('linear-gradient(145deg, #4CAF50, #45a049)', '#2E7D32')}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // ── Playing screen ─────────────────────────────────────────────────────────

  const gridWords = getWordsOnGrid(grid);

  return (
    <div style={{
      height: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      fontFamily: baseFont,
      display: 'flex', flexDirection: 'column',
      gap: '6px', padding: '8px',
      overflow: 'hidden',
    }}>

      {/* Top bar: opponent stats + PEEL + DUMP merged into one row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'rgba(255,255,255,0.08)', borderRadius: '10px',
        padding: '7px 12px', flexShrink: 0,
      }}>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Opp</span>
        <Pip label="hand"  value={opponent.handSize}  color="#e67e22" />
        <Pip label="words" value={opponent.wordCount}  color="#2ecc71" />
        <Pip label="bunch" value={bunchSize}           color="#4a90d9" />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <button onClick={handlePeel} style={{
            border: 'none', borderRadius: '8px', padding: '6px 14px',
            fontSize: '0.82rem', color: 'white', cursor: 'pointer', fontFamily: baseFont, fontWeight: '700',
            background: hand.length === 0 ? 'linear-gradient(145deg, #4CAF50, #45a049)' : 'linear-gradient(145deg, #555, #444)',
            boxShadow: hand.length === 0 ? '0 3px 0 #2E7D32' : '0 3px 0 #333',
            touchAction: 'manipulation',
          }}>🍌 PEEL</button>
          <button onClick={handleDump} style={{
            border: 'none', borderRadius: '8px', padding: '6px 14px',
            fontSize: '0.82rem', color: 'white', cursor: 'pointer', fontFamily: baseFont, fontWeight: '700',
            background: 'linear-gradient(145deg, #e67e22, #d35400)',
            boxShadow: '0 3px 0 #a04000', touchAction: 'manipulation',
          }}>🔄 DUMP</button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          background: 'linear-gradient(145deg, #FFE135, #F4D03F)',
          padding: '8px 14px', borderRadius: '10px',
          textAlign: 'center', color: '#5D4037', fontWeight: '600', fontSize: '0.9rem', flexShrink: 0,
        }}>
          {message}
        </div>
      )}

      {/* Grid */}
      <div style={{
        flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: '12px',
        padding: '7px', overflow: 'auto', minHeight: 0,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: `repeat(${GRID_SIZE}, 34px)`,
          gap: '2px', background: '#2c3e50', padding: '6px', borderRadius: '8px', width: 'fit-content',
        }}>
          {grid.map((row, rowIdx) =>
            row.map((cell, colIdx) => {
              const isCellSel = selected?.source?.type === 'grid' &&
                selected.source.pos.row === rowIdx && selected.source.pos.col === colIdx;
              return (
                <div key={`${rowIdx}-${colIdx}`} onClick={() => handleGridCellTap(rowIdx, colIdx)} style={{
                  width: '34px', height: '34px', borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', touchAction: 'manipulation',
                  userSelect: 'none', WebkitUserSelect: 'none',
                  ...(cell ? {
                    background: isCellSel ? 'linear-gradient(145deg, #4CAF50, #45a049)' : 'linear-gradient(145deg, #FFE135, #F4D03F)',
                    fontSize: '1rem', fontWeight: '700',
                    color: isCellSel ? 'white' : '#5D4037',
                    boxShadow: isCellSel ? '0 2px 0 #2E7D32' : '0 2px 0 #D4AC0D',
                  } : {
                    background: selected?.tile ? 'rgba(76,175,80,0.18)' : 'rgba(255,255,255,0.05)',
                  }),
                }}>
                  {cell?.letter}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Hand — moved below the grid */}
      <div
        onClick={handleHandAreaTap}
        style={{
          background: selected?.source?.type === 'grid' ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.07)',
          borderRadius: '10px', padding: '8px', flexShrink: 0,
          border: selected?.source?.type === 'grid' ? '2px dashed rgba(76,175,80,0.5)' : '2px solid transparent',
        }}
      >
        <div style={{ color: 'rgba(255,255,255,0.35)', marginBottom: '5px', fontSize: '0.68rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Your Hand ({hand.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {hand.map(tile => {
            const sel = selected?.tile?.id === tile.id && selected?.source?.type === 'hand';
            return (
              <div key={tile.id} onClick={(e) => { e.stopPropagation(); handleTileSelect(tile, 'hand'); }} style={{
                width: '40px', height: '40px', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', fontWeight: '700', cursor: 'pointer',
                userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'manipulation',
                background: sel ? 'linear-gradient(145deg, #4CAF50, #45a049)' : 'linear-gradient(145deg, #FFE135, #F4D03F)',
                color: sel ? 'white' : '#5D4037',
                boxShadow: sel ? '0 2px 0 #2E7D32, inset 0 1px 0 rgba(255,255,255,0.4)' : '0 2px 0 #D4AC0D, inset 0 1px 0 rgba(255,255,255,0.4)',
                transition: 'all 0.12s ease',
              }}>
                {tile.letter}
              </div>
            );
          })}
        </div>
      </div>

      {/* Words panel — always visible at the bottom when words exist */}
      {gridWords.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '7px',
          display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '56px', overflow: 'auto', flexShrink: 0,
        }}>
          {gridWords.map((w, i) => {
            const valid = dictionary ? dictionary.has(w.word) : false;
            return (
              <span key={i} style={{
                padding: '2px 7px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600',
                background: valid ? 'rgba(46,204,113,0.25)' : 'rgba(231,76,60,0.25)',
                color: valid ? '#2ecc71' : '#e74c3c',
              }}>
                {w.word} {valid ? '✓' : '?'}
              </span>
            );
          })}
        </div>
      )}

      {/* Bottom bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'linear-gradient(145deg, #FFE135, #F4D03F)',
        borderRadius: '12px', padding: '9px 14px', flexShrink: 0, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#5D4037' }}>
          🍌 {formatTime(timer)}
        </span>
        <span style={{ background: 'rgba(93,64,55,0.15)', padding: '4px 10px', borderRadius: '6px', color: '#5D4037', fontWeight: '600', fontSize: '0.8rem' }}>
          Hand: {hand.length}
        </span>
        <span style={{ background: 'rgba(93,64,55,0.15)', padding: '4px 10px', borderRadius: '6px', color: '#5D4037', fontWeight: '600', fontSize: '0.8rem' }}>
          Room: {roomCode}
        </span>
        <button onClick={resetToMenu} style={{
          marginLeft: 'auto', background: '#e74c3c', border: 'none',
          borderRadius: '6px', padding: '5px 12px', color: 'white',
          cursor: 'pointer', fontFamily: baseFont, fontWeight: '600', fontSize: '0.8rem', touchAction: 'manipulation',
        }}>
          Quit
        </button>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<OnlineBananagrams />);
