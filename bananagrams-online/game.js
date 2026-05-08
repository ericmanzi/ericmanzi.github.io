const { useState, useEffect, useRef } = React;

// ── Constants ────────────────────────────────────────────────────────────────

const GRID_SIZE = 25;
const DICTIONARY_URL = 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt';
const baseFont = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const PING_INTERVAL_MS = 8 * 60 * 1000;
const ONLINE_STORAGE_KEY = 'bananagrams_online_state';
const OPPONENT_REJOIN_TIMEOUT_MS = 2 * 60 * 1000;
const TWO_LETTER_TAUNTS = [
  "Wow, you really sat there for three minutes just to play a two-letter word.",
  "That's not a word, that's a cry for help.",
  "You know the tiles are free, right? You can use more than two letters.",
  "Really pushing the boundaries of human vocabulary there with those words.",
  "Two letters? At least commit to three. Have some self-respect.",
];

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

function isBoardConnected(grid) {
  const tiles = [];
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++)
      if (grid[r][c]) tiles.push([r, c]);
  if (tiles.length <= 1) return true;
  const visited = new Set();
  const queue = [tiles[0]];
  visited.add(`${tiles[0][0]}-${tiles[0][1]}`);
  while (queue.length > 0) {
    const [r, c] = queue.shift();
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r+dr, nc = c+dc, key = `${nr}-${nc}`;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && grid[nr][nc] && !visited.has(key)) {
        visited.add(key); queue.push([nr, nc]);
      }
    }
  }
  return visited.size === tiles.length;
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
  title:    { fontSize: '2.2rem', margin: '0 0 6px 0', color: '#5D4037', fontWeight: '800' },
  subtitle: { color: '#795548', fontSize: '1rem', margin: '0 0 28px 0', fontWeight: '600' },
  btn: (color, shadow) => ({
    background: color, border: 'none', borderRadius: '12px',
    padding: '14px 32px', fontSize: '1.1rem', color: 'white',
    cursor: 'pointer', fontFamily: baseFont, fontWeight: '700',
    boxShadow: `0 5px 0 ${shadow}`, touchAction: 'manipulation', transition: 'opacity 0.15s',
  }),
  input: {
    width: '100%', padding: '12px 16px', fontSize: '1.4rem', fontWeight: '700',
    borderRadius: '10px', border: '2px solid rgba(93,64,55,0.3)',
    background: 'rgba(255,255,255,0.6)', color: '#5D4037',
    textAlign: 'center', letterSpacing: '0.2em', textTransform: 'uppercase',
    fontFamily: baseFont, outline: 'none',
  },
  codeBox:  { background: 'rgba(255,255,255,0.5)', borderRadius: '12px', padding: '16px 24px', margin: '16px 0' },
  codeText: { fontSize: '2.5rem', fontWeight: '900', color: '#5D4037', letterSpacing: '0.3em' },
  infoRow:  {
    background: 'rgba(255,255,255,0.4)', borderRadius: '12px',
    padding: '14px 16px', marginTop: '16px',
    textAlign: 'left', color: '#5D4037', fontSize: '0.88rem', lineHeight: '1.75',
  },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
  },
  modalCard: {
    background: 'linear-gradient(145deg, #FFE135, #F4D03F)',
    borderRadius: '20px', padding: '28px 28px 24px',
    maxWidth: '360px', width: '100%', maxHeight: '85vh', overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)', textAlign: 'left',
  },
};

// ── HelpModal ─────────────────────────────────────────────────────────────────

function HelpModal({ onClose }) {
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modalCard, maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <h2 style={{ color:'#5D4037', fontWeight:'800', fontSize:'1.4rem', margin:0 }}>How to Play</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'1.4rem', cursor:'pointer', color:'#795548', padding:'0 4px' }}>✕</button>
        </div>
        <div style={{ color:'#5D4037', fontSize:'0.9rem', lineHeight:'1.8' }}>
          <strong style={{ fontSize:'1rem' }}>🎯 Goal</strong><br/>
          Be the first to empty your hand when the bunch runs out of tiles.<br/><br/>

          <strong style={{ fontSize:'1rem' }}>🖐 Placing Tiles</strong><br/>
          • <strong>Tap a tile</strong> in your hand to select it (glows green).<br/>
          • <strong>Tap an empty cell</strong> on the board to place it there.<br/>
          • <strong>Drag tiles</strong> directly onto board cells (desktop).<br/>
          • <strong>Tap the same tile again</strong> or press <strong>Escape</strong> to deselect.<br/>
          • <strong>Tap a board tile</strong> to pick it up and move it.<br/>
          • <strong>Tap the hand area</strong> while a board tile is selected to return it to your hand.<br/>
          • Use the <strong>↩ Withdraw</strong> button to return any selected tile to your hand.<br/><br/>

          <strong style={{ fontSize:'1rem' }}>📋 Rules</strong><br/>
          • All placed tiles must form <strong>one connected crossword</strong> — no isolated groups.<br/>
          • Every sequence of 2+ tiles must be a valid word (horizontal and vertical).<br/>
          • Single isolated tiles are not allowed at PEEL time.<br/>
          • Tiles turn <span style={{ color:'#2e7d32', fontWeight:'700' }}>green</span> when part of a valid word,{' '}
            <span style={{ color:'#c0392b', fontWeight:'700' }}>red</span> when invalid,{' '}
            <span style={{ color:'#d35400', fontWeight:'700' }}>orange</span> when disconnected.<br/><br/>

          <strong style={{ fontSize:'1rem' }}>🍌 PEEL</strong><br/>
          • Place all tiles on the board in valid, connected words, then press <strong>PEEL</strong>.<br/>
          • Both players draw 1 new tile from the bunch.<br/>
          • If the bunch has &lt; 2 tiles left and your board is valid, you win!<br/><br/>

          <strong style={{ fontSize:'1rem' }}>🔄 DUMP</strong><br/>
          • Select a tile from your hand, then press <strong>DUMP</strong>.<br/>
          • You return that tile and draw 3 new ones (bunch must have ≥ 3 tiles).<br/><br/>

          <strong style={{ fontSize:'1rem' }}>⌨️ Shortcuts</strong><br/>
          • <strong>Escape</strong> — deselect current tile.
        </div>
        <button onClick={onClose} style={{
          marginTop:'20px', width:'100%',
          background:'linear-gradient(145deg, #4CAF50, #45a049)',
          border:'none', borderRadius:'10px', padding:'12px',
          color:'white', fontFamily:baseFont, fontWeight:'700', fontSize:'1rem', cursor:'pointer',
        }}>Got it!</button>
      </div>
    </div>
  );
}

// ── MenuModal ─────────────────────────────────────────────────────────────────

function MenuModal({ roomCode, onHowToPlay, onQuit, onPause, onClose }) {
  const [view, setView] = useState('main');
  const [copied, setCopied] = useState(false);

  const copyRoom = () => {
    navigator.clipboard?.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const MenuBtn = ({ label, color, shadow, onClick: cb }) => (
    <button onClick={cb} style={{
      width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
      background: color, boxShadow: `0 4px 0 ${shadow}`,
      color: 'white', fontFamily: baseFont, fontWeight: '700', fontSize: '1.05rem',
      cursor: 'pointer', touchAction: 'manipulation', textAlign: 'left',
    }}>{label}</button>
  );

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modalCard} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          {view === 'room'
            ? <button onClick={() => setView('main')} style={{ background:'none', border:'none', color:'#795548', cursor:'pointer', fontSize:'0.9rem', fontFamily:baseFont, fontWeight:'600' }}>← Back</button>
            : <div />
          }
          <h2 style={{ color:'#5D4037', fontWeight:'800', fontSize:'1.3rem', margin:0 }}>
            {view === 'main' ? '☰ Menu' : '🔑 Room'}
          </h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:'1.3rem', cursor:'pointer', color:'#795548', padding:'0 4px' }}>✕</button>
        </div>

        {view === 'main' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            <MenuBtn label="📖 How to Play" color="linear-gradient(145deg, #4a90d9, #2471a3)" shadow="#1a5276" onClick={() => { onClose(); onHowToPlay(); }} />
            <MenuBtn label="🔑 Room" color="linear-gradient(145deg, #7b68ee, #6a58d4)" shadow="#4a3aaa" onClick={() => setView('room')} />
            <MenuBtn label="⏸ Pause (rejoin later)" color="linear-gradient(145deg, #e67e22, #d35400)" shadow="#a04000" onClick={onPause} />
            <MenuBtn label="🚪 Quit Game" color="linear-gradient(145deg, #e74c3c, #c0392b)" shadow="#922b21" onClick={onQuit} />
          </div>
        )}

        {view === 'room' && (
          <div style={{ textAlign:'center' }}>
            <p style={{ color:'#795548', fontSize:'0.9rem', marginBottom:'12px', fontWeight:'600' }}>
              Share this code with your opponent:
            </p>
            <div style={{ ...S.codeBox, marginBottom:'16px', display:'flex', alignItems:'center', justifyContent:'center', gap:'12px' }}>
              <span style={S.codeText}>{roomCode}</span>
              <button onClick={copyRoom} style={{
                background: copied ? 'linear-gradient(145deg, #4CAF50, #45a049)' : 'linear-gradient(145deg, #666, #555)',
                border:'none', borderRadius:'8px', padding:'8px 12px',
                color:'white', cursor:'pointer', fontFamily:baseFont, fontWeight:'700', fontSize:'0.85rem',
                boxShadow: copied ? '0 3px 0 #2E7D32' : '0 3px 0 #444',
              }}>{copied ? '✓ Copied!' : '📋 Copy'}</button>
            </div>
            <p style={{ color:'#a0856e', fontSize:'0.8rem' }}>Both players use the same room code to rejoin.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pip ───────────────────────────────────────────────────────────────────────

function Pip({ label, value, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
      <span style={{ background:color, borderRadius:'4px', padding:'2px 7px', fontSize:'0.82rem', fontWeight:'700', color:'white' }}>{value}</span>
      <span style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.72rem' }}>{label}</span>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────

function OnlineBananagrams() {
  const [screen, setScreen]           = useState('menu');
  const [joinInput, setJoinInput]     = useState('');
  const [roomCode, setRoomCode]       = useState('');
  const [connError, setConnError]     = useState('');
  const [errorAllowRetry, setErrorAllowRetry] = useState(false);

  // game state
  const [role, setRole]               = useState(null);
  const [hand, setHand]               = useState([]);
  const [grid, setGrid]               = useState(createEmptyGrid);
  const [selected, setSelected]       = useState(null);
  const [bunchSize, setBunchSize]     = useState(0);
  const [opponent, setOpponent]       = useState({ handSize: 21, wordCount: 0 });
  const [message, setMessage]         = useState('');
  const [timer, setTimer]             = useState(0);
  const [gameResult, setGameResult]   = useState(null);
  const [dictionary, setDictionary]   = useState(null);
  const [dictLoading, setDictLoading] = useState(true);
  const [copied, setCopied]           = useState(false);
  const [savedOnline, setSavedOnline] = useState(null);
  const [showHelp, setShowHelp]       = useState(false);
  const [showMenu, setShowMenu]       = useState(false);
  const [opponentDisconnectedAt, setOpponentDisconnectedAt] = useState(null);
  const [oppTimeoutElapsed, setOppTimeoutElapsed]           = useState(false);
  const [dragOverCell, setDragOverCell] = useState(null); // { row, col }

  // refs
  const wsRef            = useRef(null);
  const timerRef         = useRef(null);
  const pingRef          = useRef(null);
  const msgTimerRef      = useRef(null);
  const roleRef          = useRef(null);
  const roomRef          = useRef('');
  const handRef          = useRef([]);
  const gridRef          = useRef(createEmptyGrid());
  const bunchSizeRef     = useRef(0);
  const screenRef        = useRef('menu');
  const prevPeelWordsRef = useRef(new Set());
  const pendingTauntRef  = useRef(null);
  const dragDataRef      = useRef(null);   // { tile, source: { type, pos } }
  const gridContainerRef = useRef(null);

  useEffect(() => { roleRef.current     = role;      }, [role]);
  useEffect(() => { roomRef.current     = roomCode;  }, [roomCode]);
  useEffect(() => { handRef.current     = hand;      }, [hand]);
  useEffect(() => { gridRef.current     = grid;      }, [grid]);
  useEffect(() => { screenRef.current   = screen;    }, [screen]);
  useEffect(() => { bunchSizeRef.current = bunchSize; }, [bunchSize]);

  // load dictionary — exclude single-letter entries
  useEffect(() => {
    fetch(DICTIONARY_URL)
      .then(r => r.text())
      .then(text => {
        setDictionary(new Set(
          text.split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length >= 2)
        ));
        setDictLoading(false);
      })
      .catch(() => setDictLoading(false));
  }, []);

  useEffect(() => {
    if (screen === 'menu') {
      const saved = loadOnlineState();
      setSavedOnline(saved?.roomCode ? saved : null);
    }
  }, [screen]);

  useEffect(() => {
    if (screen === 'playing' && roomCode && role)
      saveOnlineState({ roomCode, role, hand, grid, timer });
  }, [hand, grid, screen, roomCode, role, timer]);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(pingRef.current);
    clearTimeout(msgTimerRef.current);
    wsRef.current?.close();
  }, []);

  // Escape key deselects
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') { setSelected(null); setShowHelp(false); setShowMenu(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Opponent disconnect timeout
  useEffect(() => {
    if (!opponentDisconnectedAt) { setOppTimeoutElapsed(false); return; }
    const remaining = OPPONENT_REJOIN_TIMEOUT_MS - (Date.now() - opponentDisconnectedAt);
    if (remaining <= 0) { setOppTimeoutElapsed(true); return; }
    const id = setTimeout(() => setOppTimeoutElapsed(true), remaining);
    return () => clearTimeout(id);
  }, [opponentDisconnectedAt]);

  // Status updates to opponent every 3 s — includes bunchSize for sync
  useEffect(() => {
    if (screen !== 'playing') return;
    const id = setInterval(() => {
      wsSend({
        action: 'status', roomCode: roomRef.current, role: roleRef.current,
        handSize: handRef.current.length,
        wordCount: getWordsOnGrid(gridRef.current).length,
        bunchSize: bunchSizeRef.current,
      });
    }, 3000);
    return () => clearInterval(id);
  }, [screen]);

  // Auto-center grid when playing screen appears
  useEffect(() => {
    if (screen !== 'playing') return;
    const id = setTimeout(() => {
      const el = gridContainerRef.current;
      if (el) {
        el.scrollTop  = (el.scrollHeight - el.clientHeight) / 2;
        el.scrollLeft = (el.scrollWidth  - el.clientWidth)  / 2;
      }
    }, 60);
    return () => clearTimeout(id);
  }, [screen]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const showMsg = (msg, duration = 3000) => {
    clearTimeout(msgTimerRef.current);
    setMessage(msg);
    if (msg && duration > 0) msgTimerRef.current = setTimeout(() => setMessage(''), duration);
  };

  const wsSend = data => {
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

  const onMessage = event => {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }

    switch (data.type) {
      case 'ROOM_CREATED':
        setRoomCode(data.roomCode);
        roomRef.current = data.roomCode;
        setScreen('waiting');
        break;

      case 'GAME_START': {
        setRole(data.role); roleRef.current = data.role;
        setHand(data.hand); handRef.current = data.hand;
        const emptyGrid = createEmptyGrid();
        setGrid(emptyGrid); gridRef.current = emptyGrid;
        setSelected(null);
        setGameResult(null);
        setOpponent({ handSize: 21, wordCount: 0 });
        setMessage('');
        setBunchSize(data.bunchSize); bunchSizeRef.current = data.bunchSize;
        setOpponentDisconnectedAt(null); setOppTimeoutElapsed(false);
        prevPeelWordsRef.current = new Set();
        pendingTauntRef.current  = null;
        setScreen('playing');
        startTimer();
        startPing();
        break;
      }

      case 'PEEL_RESULT': {
        setHand(prev => [...prev, data.tile]);
        setBunchSize(data.bunchSize); bunchSizeRef.current = data.bunchSize;
        const byMe = data.initiator === roleRef.current;
        if (byMe && pendingTauntRef.current) {
          showMsg(pendingTauntRef.current, 6000);
          pendingTauntRef.current = null;
        } else {
          showMsg(byMe
            ? `🍌 PEEL! Drew: ${data.tile.letter}  (${data.bunchSize} left)`
            : `🍌 Opponent peeled! You drew: ${data.tile.letter}`);
        }
        break;
      }

      case 'DUMP_RESULT':
        // Atomically swap: remove the dumped tile and add the 3 new ones in one update
        setHand(prev => [...prev.filter(t => t.id !== data.removedTileId), ...data.tiles]);
        setBunchSize(data.bunchSize); bunchSizeRef.current = data.bunchSize;
        showMsg(`Dumped ${data.removedLetter}, drew 3 new tiles`);
        break;

      case 'DUMP_ERROR':
        showMsg(data.reason);
        break;

      case 'OPPONENT_STATUS':
        setOpponent({ handSize: data.handSize, wordCount: data.wordCount });
        // Sync bunch size — both players should see the same value
        if (typeof data.bunchSize === 'number') {
          setBunchSize(data.bunchSize); bunchSizeRef.current = data.bunchSize;
        }
        break;

      case 'GAME_OVER':
        clearInterval(timerRef.current);
        clearInterval(pingRef.current);
        setGameResult({ winner: data.winner === roleRef.current ? 'me' : 'them' });
        setScreen('won');
        break;

      case 'OPPONENT_DISCONNECTED':
        setOpponentDisconnectedAt(Date.now());
        setOppTimeoutElapsed(false);
        setMessage('');
        break;

      case 'OPPONENT_RECONNECTED':
        setOpponentDisconnectedAt(null); setOppTimeoutElapsed(false);
        showMsg('✅ Opponent reconnected! Game resumes.', 3000);
        break;

      case 'REJOIN_OK': {
        setRole(data.role); roleRef.current = data.role;
        setBunchSize(data.bunchSize); bunchSizeRef.current = data.bunchSize;
        if (data.roomCode) { setRoomCode(data.roomCode); roomRef.current = data.roomCode; }
        const savedState  = loadOnlineState();
        const restoredGrid = savedState?.grid || createEmptyGrid();
        setGrid(restoredGrid); gridRef.current = restoredGrid;
        const gridTileIds  = new Set(restoredGrid.flat().filter(Boolean).map(t => t.id));
        const restoredHand = (data.hand || []).filter(t => !gridTileIds.has(t.id));
        setHand(restoredHand); handRef.current = restoredHand;
        setSelected(null); setGameResult(null);
        setOpponent({ handSize: 0, wordCount: 0 });
        setMessage('');
        setOpponentDisconnectedAt(null); setOppTimeoutElapsed(false);
        prevPeelWordsRef.current = new Set();
        pendingTauntRef.current  = null;
        setScreen('playing');
        clearInterval(timerRef.current);
        const restoredTimer = savedState?.timer || 0;
        setTimer(restoredTimer);
        timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
        startPing();
        break;
      }

      case 'ERROR':
        setConnError(data.message || 'An error occurred.');
        setErrorAllowRetry(!!loadOnlineState());
        setScreen('error');
        break;

      default: break;
    }
  };

  // ── WebSocket setup ────────────────────────────────────────────────────────

  const openWS = onOpen => {
    wsRef.current?.close();
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen    = onOpen;
    ws.onmessage = onMessage;
    ws.onerror   = () => {
      setErrorAllowRetry(false);
      setConnError('Could not reach the game server. Check your connection and try again.');
      setScreen('error');
    };
    ws.onclose = () => {
      clearInterval(pingRef.current);
      const s = screenRef.current;
      if (s === 'playing' || s === 'waiting') setScreen('menu');
      else if (s === 'connecting') {
        setErrorAllowRetry(false);
        setConnError('Connection closed before the game could start. Try again.');
        setScreen('error');
      }
    };
  };

  const createRoom = () => { setScreen('connecting'); openWS(() => wsSend({ action: 'createRoom' })); };

  const joinRoom = () => {
    const code = joinInput.trim().toUpperCase();
    if (!code) return;
    setRoomCode(code); roomRef.current = code;
    setScreen('connecting');
    openWS(() => wsSend({ action: 'joinRoom', roomCode: code }));
  };

  const resetToMenu = (keepSavedState = false) => {
    clearInterval(timerRef.current);
    clearInterval(pingRef.current);
    if (!keepSavedState) clearOnlineState();
    wsRef.current?.close(); wsRef.current = null;
    setScreen('menu'); setJoinInput(''); setRoomCode(''); setConnError('');
    setGameResult(null); setHand([]); setGrid(createEmptyGrid());
    setSelected(null); setMessage(''); setTimer(0);
    setOpponentDisconnectedAt(null); setOppTimeoutElapsed(false);
    setErrorAllowRetry(false); setShowMenu(false); setShowHelp(false);
  };

  const rejoinSavedGame = () => {
    const saved = loadOnlineState();
    if (!saved) return;
    const { roomCode: rc, role: r } = saved;
    setRoomCode(rc); roomRef.current = rc;
    setScreen('connecting');
    openWS(() => wsSend({ action: 'rejoinRoom', roomCode: rc, role: r }));
    setTimeout(() => {
      if (screenRef.current !== 'connecting') return;
      wsRef.current?.close();
      setErrorAllowRetry(true);
      setConnError('No response from server — session may have expired.');
      setScreen('error');
    }, 8000);
  };

  // ── Game actions ───────────────────────────────────────────────────────────

  const handlePeel = () => {
    if (hand.length > 0) { showMsg('Place all your tiles before peeling!'); return; }
    const tileCount = grid.flat().filter(Boolean).length;
    if (tileCount === 0) { showMsg('Place some tiles on the board first!'); return; }
    if (!isBoardConnected(grid)) {
      showMsg('All tiles must form one connected crossword — no isolated groups!');
      return;
    }
    // Every tile must be in at least one word of length ≥ 2
    const allWords   = getWordsOnGrid(grid);
    const coveredCells = new Set();
    for (const { word, row, col, direction } of allWords) {
      for (let i = 0; i < word.length; i++)
        coveredCells.add(direction === 'h' ? `${row}-${col+i}` : `${row+i}-${col}`);
    }
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++)
        if (grid[r][c] && !coveredCells.has(`${r}-${c}`)) {
          showMsg('Every tile must be part of a word — no lone isolated tiles!');
          return;
        }
    if (dictionary && allWords.some(w => !dictionary.has(w.word))) {
      showMsg('Fix invalid words before peeling!');
      return;
    }
    const twoLetterNow = new Set(allWords.filter(w => w.word.length === 2).map(w => w.word));
    if ([...twoLetterNow].some(w => !prevPeelWordsRef.current.has(w)))
      pendingTauntRef.current = TWO_LETTER_TAUNTS[Math.floor(Math.random() * TWO_LETTER_TAUNTS.length)];
    prevPeelWordsRef.current = twoLetterNow;
    wsSend({ action: 'peel', roomCode: roomRef.current, role: roleRef.current });
  };

  const handleDump = () => {
    if (hand.length === 0) { showMsg('No tiles in hand to dump!'); return; }
    if (bunchSize < 3)     { showMsg(`Not enough tiles in the bunch to dump (need ≥ 3, have ${bunchSize})!`); return; }
    if (!selected || selected.source.type !== 'hand') {
      showMsg('Select a tile from your hand first, then press DUMP!');
      return;
    }
    const tile = selected.tile;
    setSelected(null);
    // Do NOT optimistically update hand — wait for DUMP_RESULT to atomically swap
    // the dumped tile for 3 new ones in a single state update.
    wsSend({ action: 'dump', roomCode: roomRef.current, role: roleRef.current, tile });
  };

  const handleWithdraw = () => {
    if (!selected) { showMsg('Select a tile to withdraw.'); return; }
    if (selected.source.type === 'grid') {
      const newGrid = grid.map(r => [...r]);
      newGrid[selected.source.pos.row][selected.source.pos.col] = null;
      setGrid(newGrid);
      setHand(prev => [...prev, selected.tile]);
    }
    setSelected(null);
  };

  const handleTileSelect = (tile, sourceType, sourcePos = null) => {
    setSelected(prev =>
      prev?.tile?.id === tile.id ? null : { tile, source: { type: sourceType, pos: sourcePos } }
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
    if (selected.source.type === 'hand') setHand(prev => prev.filter(t => t.id !== selected.tile.id));
    else newGrid[selected.source.pos.row][selected.source.pos.col] = null;
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

  // Tapping a hand tile while a board tile is selected returns the board tile to hand first.
  const handleHandTileTap = (e, tile) => {
    e.stopPropagation();
    if (selected?.source?.type === 'grid') {
      const newGrid = grid.map(r => [...r]);
      newGrid[selected.source.pos.row][selected.source.pos.col] = null;
      setGrid(newGrid);
      setHand(prev => [...prev, selected.tile]);
      setSelected({ tile, source: { type: 'hand', pos: null } });
    } else {
      handleTileSelect(tile, 'hand');
    }
  };

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

  const handleDragStart = (e, tile, sourceType, sourcePos = null) => {
    dragDataRef.current = { tile, source: { type: sourceType, pos: sourcePos } };
    e.dataTransfer.effectAllowed = 'move';
    // Use a transparent 1×1 image so the default ghost doesn't show ugly outlines
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragEnd = () => {
    dragDataRef.current = null;
    setDragOverCell(null);
  };

  const handleCellDragOver = (e, row, col) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCell({ row, col });
  };

  const handleCellDrop = (e, row, col) => {
    e.preventDefault();
    setDragOverCell(null);
    const drag = dragDataRef.current;
    if (!drag) return;
    if (grid[row][col]) return; // occupied — silent reject
    const newGrid = grid.map(r => [...r]);
    newGrid[row][col] = drag.tile;
    if (drag.source.type === 'hand') setHand(prev => prev.filter(t => t.id !== drag.tile.id));
    else newGrid[drag.source.pos.row][drag.source.pos.col] = null;
    setGrid(newGrid);
    setSelected(null);
    dragDataRef.current = null;
  };

  const handleHandAreaDragOver = e => {
    if (dragDataRef.current?.source?.type === 'grid') {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleHandAreaDrop = e => {
    e.preventDefault();
    const drag = dragDataRef.current;
    if (!drag || drag.source.type !== 'grid') return;
    const newGrid = grid.map(r => [...r]);
    newGrid[drag.source.pos.row][drag.source.pos.col] = null;
    setGrid(newGrid);
    setHand(prev => [...prev, drag.tile]);
    setSelected(null);
    dragDataRef.current = null;
  };

  // ── Screens ────────────────────────────────────────────────────────────────

  if (screen === 'menu') {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <h1 style={S.title}>🍌 BANANAGRAMS</h1>
          <p style={S.subtitle}>Online Multiplayer</p>
          <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'24px' }}>
            {savedOnline && (
              <button onClick={rejoinSavedGame} style={S.btn('linear-gradient(145deg, #e67e22, #d35400)', '#a04000')}>
                ↩ Rejoin {savedOnline.roomCode}
              </button>
            )}
            <button onClick={createRoom} style={S.btn('linear-gradient(145deg, #4CAF50, #45a049)', '#2E7D32')}>
              Create Room
            </button>
            <div style={{ display:'flex', gap:'8px' }}>
              <input style={{ ...S.input, flex:1 }} placeholder="ROOM CODE"
                value={joinInput} maxLength={6}
                onChange={e => setJoinInput(e.target.value.toUpperCase().slice(0,6))}
                onKeyDown={e => e.key === 'Enter' && joinRoom()} />
              <button onClick={joinRoom} disabled={joinInput.trim().length < 4}
                style={{ ...S.btn('linear-gradient(145deg, #4a90d9, #2471a3)', '#1a5276'), opacity: joinInput.trim().length < 4 ? 0.5 : 1 }}>
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
          <div style={{ marginTop:'16px', display:'flex', gap:'12px', justifyContent:'center' }}>
            <a href="../bananagrams/index.html" style={{ color:'#795548', fontSize:'0.85rem' }}>Single Player →</a>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'connecting') {
    return (
      <div style={S.page}>
        <div style={{ ...S.card, padding:'48px' }}>
          <div style={{ fontSize:'3rem', marginBottom:'16px' }}>🍌</div>
          <p style={{ color:'#5D4037', fontWeight:'700', fontSize:'1.1rem' }}>Connecting…</p>
        </div>
      </div>
    );
  }

  if (screen === 'waiting') {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <h1 style={S.title}>🍌 Room Ready</h1>
          <p style={{ color:'#795548', fontWeight:'600', marginBottom:'8px' }}>Share this code with your opponent:</p>
          <div style={S.codeBox}><div style={S.codeText}>{roomCode}</div></div>
          <button onClick={() => { navigator.clipboard?.writeText(roomCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
            style={{ ...S.btn('linear-gradient(145deg, #666, #555)', '#444'), marginBottom:'20px', fontSize:'0.95rem', padding:'10px 24px' }}>
            {copied ? '✓ Copied!' : 'Copy Code'}
          </button>
          <p style={{ color:'#795548', fontSize:'0.95rem', fontWeight:'500' }}>⏳ Waiting for Player 2 to join…</p>
          <button onClick={() => resetToMenu(false)} style={{ marginTop:'20px', background:'none', border:'none', color:'#a0856e', cursor:'pointer', fontSize:'0.85rem', fontFamily:baseFont }}>Cancel</button>
        </div>
      </div>
    );
  }

  if (screen === 'error') {
    return (
      <div style={S.page}>
        <div style={{ ...S.card, padding:'40px' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'12px' }}>⚠️</div>
          <h2 style={{ color:'#5D4037', marginBottom:'12px', fontWeight:'800' }}>Connection Error</h2>
          <p style={{ color:'#795548', marginBottom:'24px', fontSize:'0.95rem' }}>{connError}</p>
          {errorAllowRetry ? (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <button onClick={rejoinSavedGame} style={S.btn('linear-gradient(145deg, #e67e22, #d35400)', '#a04000')}>Try Rejoining Again</button>
              <button onClick={() => resetToMenu(false)} style={{ ...S.btn('linear-gradient(145deg, #4CAF50, #45a049)', '#2E7D32'), fontSize:'0.9rem', padding:'10px 24px' }}>Back to Menu</button>
              <button onClick={() => resetToMenu(true)} style={{ background:'none', border:'none', color:'#a0856e', cursor:'pointer', fontSize:'0.8rem', fontFamily:baseFont }}>Start Fresh (clear saved game)</button>
            </div>
          ) : (
            <button onClick={() => resetToMenu(false)} style={S.btn('linear-gradient(145deg, #4CAF50, #45a049)', '#2E7D32')}>Back to Menu</button>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'won') {
    const iWon = gameResult?.winner === 'me';
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={{ fontSize:'3.5rem', marginBottom:'12px' }}>{iWon ? '🎉🍌🏆' : '🍌😔'}</div>
          <h1 style={{ ...S.title, fontSize:'2.5rem' }}>{iWon ? 'BANANAS!' : 'So close!'}</h1>
          <p style={{ fontSize:'1.2rem', color:'#795548', margin:'8px 0', fontWeight:'700' }}>{iWon ? 'You won!' : 'Opponent wins this time.'}</p>
          <p style={{ fontSize:'1.5rem', color:'#5D4037', fontWeight:'bold', margin:'8px 0 24px' }}>{formatTime(timer)}</p>
          <button onClick={() => resetToMenu(false)} style={S.btn('linear-gradient(145deg, #4CAF50, #45a049)', '#2E7D32')}>Play Again</button>
        </div>
      </div>
    );
  }

  // ── Playing screen ─────────────────────────────────────────────────────────

  // Compute cell states (only when hand is empty — no red flash while placing)
  const gridWords       = getWordsOnGrid(grid);
  const validWordCells  = new Set();
  const invalidWordCells = new Set();
  const disconnectedCells = new Set();

  if (hand.length === 0) {
    // Valid / invalid word highlighting
    if (dictionary) {
      for (const { word, row, col, direction } of gridWords) {
        const cells = [];
        for (let i = 0; i < word.length; i++)
          cells.push(direction === 'h' ? `${row}-${col+i}` : `${row+i}-${col}`);
        if (dictionary.has(word)) cells.forEach(k => validWordCells.add(k));
        else cells.forEach(k => invalidWordCells.add(k));
      }
      // A cell in an invalid word overrides valid
      for (const k of invalidWordCells) validWordCells.delete(k);
    }
    // Lone tiles (in no word of length ≥ 2) are also invalid
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++) {
        const k = `${r}-${c}`;
        if (grid[r][c] && !validWordCells.has(k) && !invalidWordCells.has(k))
          invalidWordCells.add(k);
      }
    // Disconnected cluster highlighting
    if (!isBoardConnected(grid)) {
      const allTiles = [];
      for (let r = 0; r < GRID_SIZE; r++)
        for (let c = 0; c < GRID_SIZE; c++)
          if (grid[r][c]) allTiles.push([r, c]);
      const remaining = new Set(allTiles.map(([r,c]) => `${r}-${c}`));
      let largest = null;
      while (remaining.size > 0) {
        const [startKey] = remaining;
        const [sr, sc] = startKey.split('-').map(Number);
        const cluster  = new Set([startKey]);
        remaining.delete(startKey);
        const q = [[sr, sc]];
        while (q.length > 0) {
          const [r, c] = q.shift();
          for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            const nk = `${r+dr}-${c+dc}`;
            if (remaining.has(nk)) { remaining.delete(nk); cluster.add(nk); q.push([r+dr, c+dc]); }
          }
        }
        if (!largest || cluster.size > largest.size) largest = cluster;
      }
      for (let r = 0; r < GRID_SIZE; r++)
        for (let c = 0; c < GRID_SIZE; c++)
          if (grid[r][c] && largest && !largest.has(`${r}-${c}`)) disconnectedCells.add(`${r}-${c}`);
    }
  }

  const hasInvalidWords = invalidWordCells.size > 0;
  const hasDisconnected = disconnectedCells.size > 0;
  const boardHasTiles   = grid.flat().some(Boolean);
  const canPeel = hand.length === 0 && !hasInvalidWords && !hasDisconnected && boardHasTiles;

  const myLabel  = role === 'host' ? 'P1 (you)' : 'P2 (you)';
  const oppLabel = role === 'host' ? 'P2' : 'P1';

  let peelBg, peelShadow;
  if (canPeel)                           { peelBg = 'linear-gradient(145deg, #4CAF50, #45a049)'; peelShadow = '#2E7D32'; }
  else if (hasInvalidWords||hasDisconnected) { peelBg = 'linear-gradient(145deg, #e74c3c, #c0392b)'; peelShadow = '#922b21'; }
  else                                   { peelBg = 'linear-gradient(145deg, #555, #444)';         peelShadow = '#333'; }

  const hdrBtn = (bg, shadow) => ({
    border:'none', borderRadius:'8px', padding:'6px 13px',
    fontSize:'0.82rem', color:'white', cursor:'pointer', fontFamily:baseFont, fontWeight:'700',
    background:bg, boxShadow:`0 3px 0 ${shadow}`, touchAction:'manipulation',
  });

  return (
    <div style={{
      height: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      fontFamily: baseFont,
      display: 'flex', flexDirection: 'column',
      gap: '6px', padding: '8px', overflow: 'hidden',
    }}>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showMenu && (
        <MenuModal
          roomCode={roomCode}
          onHowToPlay={() => { setShowMenu(false); setShowHelp(true); }}
          onQuit={() => { setShowMenu(false); resetToMenu(false); }}
          onPause={() => { setShowMenu(false); resetToMenu(true); }}
          onClose={() => setShowMenu(false)}
        />
      )}

      {/* Opponent disconnected overlay */}
      {opponentDisconnectedAt && (
        <div style={{ position:'fixed', inset:0, zIndex:150, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div style={{ background:'linear-gradient(145deg, #FFE135, #F4D03F)', borderRadius:'20px', padding:'32px 28px', maxWidth:'340px', width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'12px' }}>⏳</div>
            <h3 style={{ color:'#5D4037', fontWeight:'800', marginBottom:'10px', fontSize:'1.2rem' }}>Opponent Disconnected</h3>
            <p style={{ color:'#795548', fontSize:'0.9rem', marginBottom:'20px' }}>
              {oppTimeoutElapsed ? "They've been gone a while. You can wait or quit to the menu." : 'Game paused. Waiting for them to rejoin…'}
            </p>
            <button onClick={() => resetToMenu(true)} style={S.btn('linear-gradient(145deg, #e74c3c, #c0392b)', '#922b21')}>Quit to Menu</button>
          </div>
        </div>
      )}

      {/* ── Header: PEEL · DUMP · Withdraw · Menu ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:'6px',
        background:'rgba(255,255,255,0.08)', borderRadius:'10px',
        padding:'7px 12px', flexShrink:0,
      }}>
        <button onClick={handlePeel} style={{ ...hdrBtn(peelBg, peelShadow) }}>🍌 PEEL</button>
        <button onClick={handleDump} style={{ ...hdrBtn('linear-gradient(145deg, #e67e22, #d35400)', '#a04000') }}>🔄 DUMP</button>
        <button
          onClick={handleWithdraw}
          title="Return selected tile to hand"
          style={{ ...hdrBtn(
            selected?.source?.type === 'grid'
              ? 'linear-gradient(145deg, #4CAF50, #45a049)'
              : 'linear-gradient(145deg, #555, #444)',
            selected?.source?.type === 'grid' ? '#2E7D32' : '#333'
          ) }}
        >↩ Withdraw</button>
        <div style={{ marginLeft:'auto' }}>
          <button onClick={() => setShowMenu(true)} style={{ ...hdrBtn('linear-gradient(145deg, #7b68ee, #6a58d4)', '#4a3aaa') }}>☰ Menu</button>
        </div>
      </div>

      {/* Toast message */}
      {message && (
        <div style={{
          position:'fixed', top:'8px', left:'8px', right:'8px', zIndex:100,
          background:'linear-gradient(145deg, #FFE135, #F4D03F)',
          padding:'8px 14px', borderRadius:'10px',
          textAlign:'center', color:'#5D4037', fontWeight:'600', fontSize:'0.9rem',
          pointerEvents:'none',
        }}>{message}</div>
      )}

      {/* ── Grid ── */}
      <div
        ref={gridContainerRef}
        style={{
          flex:1, background:'rgba(255,255,255,0.04)', borderRadius:'12px',
          padding:'7px', overflow:'auto', minHeight:0,
        }}
      >
        <div style={{
          display:'grid', gridTemplateColumns:`repeat(${GRID_SIZE}, 34px)`,
          gap:'2px', background:'#2c3e50', padding:'6px', borderRadius:'8px', width:'fit-content',
        }}>
          {grid.map((row, rowIdx) =>
            row.map((cell, colIdx) => {
              const key        = `${rowIdx}-${colIdx}`;
              const isCellSel  = selected?.source?.type === 'grid' && selected.source.pos.row === rowIdx && selected.source.pos.col === colIdx;
              const isDropTarget = dragOverCell?.row === rowIdx && dragOverCell?.col === colIdx && !cell;
              const isDisconn  = cell && disconnectedCells.has(key);
              const isInvalid  = cell && !isDisconn && invalidWordCells.has(key);
              const isValid    = cell && !isDisconn && !isInvalid && validWordCells.has(key);

              let bg, color, shadow;
              if (isCellSel)     { bg = 'linear-gradient(145deg, #4CAF50, #45a049)'; color='white'; shadow='0 2px 0 #2E7D32'; }
              else if (isDisconn){ bg = 'linear-gradient(145deg, #e67e22, #d35400)'; color='white'; shadow='0 2px 0 #a04000'; }
              else if (isInvalid){ bg = 'linear-gradient(145deg, #e74c3c, #c0392b)'; color='white'; shadow='0 2px 0 #922b21'; }
              else if (isValid)  { bg = 'linear-gradient(145deg, #66bb6a, #43a047)'; color='white'; shadow='0 2px 0 #2E7D32'; }
              else if (cell)     { bg = 'linear-gradient(145deg, #FFE135, #F4D03F)'; color='#5D4037'; shadow='0 2px 0 #D4AC0D'; }
              else if (isDropTarget) { bg = 'rgba(76,175,80,0.4)'; color='transparent'; shadow='none'; }
              else               { bg = selected?.tile ? 'rgba(76,175,80,0.12)' : 'rgba(255,255,255,0.05)'; color='transparent'; shadow='none'; }

              return (
                <div
                  key={key}
                  onClick={() => handleGridCellTap(rowIdx, colIdx)}
                  onDragOver={e => handleCellDragOver(e, rowIdx, colIdx)}
                  onDragLeave={() => setDragOverCell(null)}
                  onDrop={e => handleCellDrop(e, rowIdx, colIdx)}
                  draggable={!!cell}
                  onDragStart={cell ? e => handleDragStart(e, cell, 'grid', { row: rowIdx, col: colIdx }) : undefined}
                  onDragEnd={handleDragEnd}
                  style={{
                    width:'34px', height:'34px', borderRadius:'4px',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor: cell ? 'grab' : 'pointer',
                    touchAction:'manipulation', userSelect:'none', WebkitUserSelect:'none',
                    background:bg, color, boxShadow:shadow,
                    fontSize:'1rem', fontWeight:'700',
                    transition: 'background 0.1s',
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
        onClick={handleHandAreaTap}
        onDragOver={handleHandAreaDragOver}
        onDrop={handleHandAreaDrop}
        style={{
          background: selected?.source?.type === 'grid' ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.07)',
          borderRadius:'10px', padding:'8px', flexShrink:0,
          border: selected?.source?.type === 'grid' ? '2px dashed rgba(76,175,80,0.5)' : '2px solid transparent',
        }}
      >
        <div style={{ color:'rgba(255,255,255,0.35)', marginBottom:'5px', fontSize:'0.68rem', fontWeight:'500', textTransform:'uppercase', letterSpacing:'0.5px', display:'flex', gap:'8px' }}>
          <span>Your Hand ({hand.length})</span>
          {selected?.source?.type === 'grid' && (
            <span style={{ color:'rgba(76,175,80,0.8)', fontStyle:'italic' }}>← tap or drag here to return tile</span>
          )}
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
          {hand.map(tile => {
            const sel = selected?.tile?.id === tile.id && selected?.source?.type === 'hand';
            return (
              <div
                key={tile.id}
                onClick={e => handleHandTileTap(e, tile)}
                draggable
                onDragStart={e => handleDragStart(e, tile, 'hand')}
                onDragEnd={handleDragEnd}
                style={{
                  width:'40px', height:'40px', borderRadius:'8px',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'1.2rem', fontWeight:'700', cursor:'grab',
                  userSelect:'none', WebkitUserSelect:'none', touchAction:'manipulation',
                  background: sel ? 'linear-gradient(145deg, #4CAF50, #45a049)' : 'linear-gradient(145deg, #FFE135, #F4D03F)',
                  color: sel ? 'white' : '#5D4037',
                  boxShadow: sel ? '0 2px 0 #2E7D32, inset 0 1px 0 rgba(255,255,255,0.4)' : '0 2px 0 #D4AC0D, inset 0 1px 0 rgba(255,255,255,0.4)',
                  transition:'all 0.12s ease',
                }}
              >
                {tile.letter}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer: Opp stats · Your hand count ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:'8px',
        background:'linear-gradient(145deg, #FFE135, #F4D03F)',
        borderRadius:'12px', padding:'9px 14px', flexShrink:0, flexWrap:'wrap',
      }}>
        <span style={{ color:'rgba(93,64,55,0.6)', fontSize:'0.7rem', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px' }}>{oppLabel}</span>
        <span style={{ background:'#e67e22', borderRadius:'5px', padding:'2px 8px', color:'white', fontWeight:'700', fontSize:'0.82rem' }}>{opponent.handSize} hand</span>
        <span style={{ background:'#4a90d9', borderRadius:'5px', padding:'2px 8px', color:'white', fontWeight:'700', fontSize:'0.82rem' }}>{bunchSize} bunch</span>
        <div style={{ width:'1px', height:'18px', background:'rgba(93,64,55,0.25)', margin:'0 4px' }} />
        <span style={{ color:'rgba(93,64,55,0.6)', fontSize:'0.7rem', fontWeight:'600', textTransform:'uppercase', letterSpacing:'0.5px' }}>{myLabel}</span>
        <span style={{ background:'rgba(93,64,55,0.2)', borderRadius:'5px', padding:'2px 8px', color:'#5D4037', fontWeight:'700', fontSize:'0.82rem' }}>{hand.length} hand</span>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<OnlineBananagrams />);
