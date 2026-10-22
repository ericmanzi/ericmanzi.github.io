/* Word Solitaire — game engine and UI.
   No backend: the board lives in memory, coins and level progress in
   localStorage. Depends on CATEGORIES and LEVELS from levels.js.

   The board has four zones. The stock deals face-up cards, one per tap and
   as many as you like, onto the unplaced pile beside it; only the card on
   top of that pile is in play, and when the stock runs dry the pile can be
   turned back into it. Four foundation slots each hold one category, opened
   by that category's card and filled with its words. The four tableau
   columns are working space: words of one category stack on each other
   there and travel as a group. */

(function () {
    'use strict';

    var LIMITS = { hint: 3, undo: 5, wild: 1 };   // per level, refilled on a new deal
    var WASTE_PEEK = 3;         // how many of the unplaced pile stay in view
    var SLOTS = 4;              // foundation slots
    var COLUMNS = 4;            // tableau columns
    // The level list was rebuilt from scratch, so progress and saved boards
    // from the old one mean nothing here: they live under new keys, and the
    // old ones are cleared away below.
    var KEY_PROGRESS = 'wordSolitaire.progress.v2';
    var KEY_GAME = 'wordSolitaire.game.v2';
    var OLD_KEYS = ['wordSolitaire.progress', 'wordSolitaire.game'];

    /* ---------------------------------------------------------------- store */

    function readNumber(key, fallback) {
        try {
            var value = parseInt(window.localStorage.getItem(key), 10);
            return isFinite(value) ? value : fallback;
        } catch (err) {
            return fallback;
        }
    }

    function writeNumber(key, value) {
        try { window.localStorage.setItem(key, String(value)); } catch (err) { /* private mode */ }
    }

    var progress = readNumber(KEY_PROGRESS, 0);
    var state = null;
    try {
        OLD_KEYS.forEach(function (key) { window.localStorage.removeItem(key); });
    } catch (err) { /* private mode */ }

    /* A phone reloads a page for all sorts of reasons — a pull on the scroll,
       a tab coming back from the background. The board is written down after
       every change so none of that costs a game. */
    function saveGame() {
        if (!state) return;
        try {
            if (state.over) {
                window.localStorage.removeItem(KEY_GAME);
                return;
            }
            window.localStorage.setItem(KEY_GAME, JSON.stringify({
                version: 1,
                levelIndex: state.levelIndex,
                stock: state.stock,
                waste: state.waste,
                foundations: state.foundations,
                tableau: state.tableau,
                completed: state.completed,
                moves: state.moves,
                moveLimit: state.moveLimit,
                solution: state.solution,
                tools: state.tools,
                // only what the player can still undo is worth keeping
                history: state.history.slice(-Math.max(0, state.tools.undo))
            }));
        } catch (err) { /* private mode, or no room */ }
    }

    function clearSave() {
        try { window.localStorage.removeItem(KEY_GAME); } catch (err) { /* nothing to do */ }
    }

    function resumeGame() {
        var saved;
        try { saved = JSON.parse(window.localStorage.getItem(KEY_GAME)); } catch (err) { return false; }
        if (!saved || saved.version !== 1) return false;
        var level = LEVELS[saved.levelIndex];
        if (!level || !saved.tableau || saved.tableau.length !== COLUMNS) return false;
        if (!saved.foundations || saved.foundations.length !== SLOTS) return false;
        // every card must belong to this level, or the save is from other data
        var cards = [].concat(saved.stock || [], saved.waste || []);
        saved.tableau.forEach(function (column) { cards = cards.concat(column); });
        saved.foundations.forEach(function (pile) { if (pile) cards.push(pile); });
        var foreign = cards.some(function (card) {
            return card && card.kind !== 'joker' && level.cats.indexOf(card.cat) < 0;
        });
        if (foreign) return false;
        state = {
            levelIndex: saved.levelIndex,
            level: level,
            stock: saved.stock || [],
            waste: saved.waste || [],
            foundations: saved.foundations,
            tableau: saved.tableau,
            completed: saved.completed || [],
            moves: saved.moves,
            moveLimit: saved.moveLimit,
            solution: saved.solution,
            history: saved.history || [],
            tools: saved.tools || { hint: LIMITS.hint, undo: LIMITS.undo, wild: LIMITS.wild },
            over: null
        };
        render();
        return true;
    }

    /* ----------------------------------------------------------- card rules */

    function catSize(catId) { return CATEGORIES[catId].words.length; }

    /* What dragging a column picks up. A crowned card capping its own words
       lifts the whole stack with it; a joker travels alone; otherwise it is the
       face-up run of same-category words on top. */
    function topRun(column) {
        if (!column.length) return [];
        var last = column[column.length - 1];
        if (!last.faceUp) return [];
        if (last.kind === 'joker') return [last];
        var run = [last];
        for (var i = column.length - 2; i >= 0; i--) {
            var card = column[i];
            if (!card.faceUp || card.kind !== 'word' || card.cat !== last.cat) break;
            run.unshift(card);
        }
        return run;
    }

    /* The crowned card of a capped stack, which always rides on top. */
    function crownOf(cards) {
        var last = cards[cards.length - 1];
        return last && last.kind === 'cat' ? last : null;
    }

    function slotOf(catId) {
        for (var i = 0; i < state.foundations.length; i++) {
            if (state.foundations[i] && state.foundations[i].cat === catId) return i;
        }
        return -1;
    }

    function canPlaceOnFoundation(cards, index) {
        var pile = state.foundations[index];
        var crown = crownOf(cards);
        if (cards[0].kind === 'joker') return false;   // jokers never go home
        if (crown) {
            if (pile || slotOf(crown.cat) >= 0) return false;
            if (state.completed.indexOf(crown.cat) >= 0) return false;
            return cards.every(function (card) { return card.cat === crown.cat; });
        }
        return !!pile && pile.cat === cards[0].cat &&
            pile.cards.length + cards.length <= catSize(pile.cat);
    }

    /* A column takes a card of the same category, and a crowned card may cap a
       stack of its own words. Once it does, the stack is closed: a crowned card
       is a lid, and only a joker sits on a lid. A capped stack travels whole,
       to an empty slot, an empty column or a joker — never onto a word. */
    function canPlaceOnColumn(cards, index) {
        var column = state.tableau[index];
        var capped = crownOf(cards) && cards.length > 1;
        if (!column.length) return true;               // an empty column takes anything
        var top = column[column.length - 1];
        if (!top.faceUp) return false;
        if (top.kind === 'joker') return true;         // a joker takes anything
        if (cards[0].kind === 'joker') return true;    // and lands anywhere, a lid included
        if (top.kind === 'cat') return false;          // a crowned card is a lid
        if (capped) return false;                      // a capped stack never sits on a word
        return top.kind === 'word' && top.cat === cards[0].cat;
    }

    function flipTop(column) {
        if (column.length) column[column.length - 1].faceUp = true;
    }

    function isJoker(card) { return card.kind === 'joker'; }

    function cardsLeft() {
        var total = 0;
        function count(list) {
            list.forEach(function (card) { if (!isJoker(card)) total++; });
        }
        count(state.stock);
        count(state.waste);
        state.tableau.forEach(count);
        return total;
    }

    /* ---------------------------------------------------------------- dealer */

    function mulberry32(seed) {
        return function () {
            seed |= 0;
            seed = seed + 0x6D2B79F5 | 0;
            var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    function shuffle(list, random) {
        for (var i = list.length - 1; i > 0; i--) {
            var j = Math.floor(random() * (i + 1));
            var swap = list[i];
            list[i] = list[j];
            list[j] = swap;
        }
        return list;
    }

    function buildCards(level) {
        var cards = [];
        level.cats.forEach(function (catId) {
            cards.push({ id: catId + '-card', kind: 'cat', cat: catId, word: CATEGORIES[catId].name });
            CATEGORIES[catId].words.forEach(function (word, n) {
                cards.push({ id: catId + '-' + n, kind: 'word', cat: catId, word: word });
            });
        });
        return cards;
    }

    /* The dealer shuffles fairly and then proves the shuffle can be won by
       playing it. It used to build the deck the other way round, handing over
       only a card the player could use at that moment, and that showed: the
       deck came in waves of whichever four categories were open, ending in
       two of them taking turns. A fair shuffle has no such tell, so now the
       deck is shuffled, its neighbours broken up, and then played through by
       a player who sees only what you see. A shuffle that player cannot win
       is thrown away; the budget comes from the best line it found. */

    function cloneCard(card) {
        return { id: card.id, kind: card.kind, cat: card.cat, word: card.word, faceUp: !!card.faceUp };
    }

    // topRun without the module-level state, for the dealer's own board.
    function topRunOf(column) {
        if (!column.length) return [];
        var last = column[column.length - 1];
        if (!last.faceUp) return [];
        if (last.kind === 'joker') return [last];
        var run = [last];
        for (var i = column.length - 2; i >= 0; i--) {
            var card = column[i];
            if (!card.faceUp || card.kind !== 'word' || card.cat !== last.cat) break;
            run.unshift(card);
        }
        return run;
    }

    function crownIn(run) {
        var last = run[run.length - 1];
        return last && last.kind === 'cat' ? last : null;
    }

    /* Columns and stock as stretches of the shuffled deck, in the order they
       are read: four staircase columns, then the stock. */
    function deckSegments(level, total) {
        var bounds = [];
        var start = 0;
        for (var c = 0; c < COLUMNS; c++) {
            bounds.push([start, start + level.rows + c]);
            start += level.rows + c;
        }
        bounds.push([start, total]);
        return bounds;
    }

    /* Break up the patterns a fair shuffle throws up and the eye reads as an
       unshuffled deck. Within each column and within the stock, no card sits
       next to one of its own category (a fair shuffle does that about one
       pair in nine), and no two categories take turns four cards running
       (c d c d). A card that breaks either rule swaps with a random card
       elsewhere that breaks nothing in either spot. */
    function spreadDeck(cards, bounds, random) {
        var seg = [];
        bounds.forEach(function (range, s) {
            for (var i = range[0]; i < range[1]; i++) seg[i] = s;
        });
        function same(a, b) {
            return a >= 0 && b < cards.length && seg[a] === seg[b] && cards[a].cat === cards[b].cat;
        }
        // whether any pair or ping-pong touches position i
        function badAt(i) {
            if (same(i - 1, i) || same(i, i + 1)) return true;
            for (var w = i - 3; w <= i; w++) {
                if (w < 0 || w + 3 >= cards.length || seg[w] !== seg[w + 3]) continue;
                if (same(w, w + 2) && same(w + 1, w + 3)) return true;
            }
            return false;
        }
        for (var pass = 0; pass < 8; pass++) {
            var clean = true;
            for (var i = 0; i < cards.length; i++) {
                if (!badAt(i)) continue;
                clean = false;
                for (var tries = 0; tries < 40; tries++) {
                    var j = Math.floor(random() * cards.length);
                    if (j === i || cards[j].cat === cards[i].cat) continue;
                    var a = cards[i];
                    cards[i] = cards[j];
                    cards[j] = a;
                    if (!badAt(i) && !badAt(j)) break;
                    cards[j] = cards[i];        // that made a new pattern: put it back
                    cards[i] = a;
                }
            }
            if (clean) break;
        }
        return cards;
    }

    /* A player who sees what you see — the column tops, the pile (all of it,
       having dealt it), the slots and how many cards the deck holds — and
       plays a plain greedy game: bank what can be banked, open the category
       with most in reach, keep the pile shallow, dig to turn cards over, and
       only then deal. Played plainly it is deterministic, so the same board
       always gets the same line; `explore` adds a little randomness so
       repeated playouts try different lines. Returns the length of the line and its steps, in
       the same terms as the board's own moves, or null if it wedges. It can
       start from any board, so `firstOnly` asks for just the move it would
       make next. Jokers are the player's, not the dealer's: it ignores them. */
    function playThrough(board, random, explore, firstOnly) {
        var tableau = board.tableau.map(function (column) { return column.map(cloneCard); });
        var stock = board.stock.map(cloneCard);
        var waste = board.waste.map(cloneCard);
        var piles = board.foundations.map(function (pile) {
            return pile ? { cat: pile.cat, count: pile.cards.length } : null;
        });
        var finished = {};
        var line = [];
        var progress = 0;
        var progressAtRecycle = -1;
        var t;

        board.completed.forEach(function (cat) { finished[cat] = true; });
        if ([tableau, [stock], [waste]].some(function (lists) {
            return lists.some(function (list) { return list.some(isJoker); });
        })) return null;

        function slotOf(cat) {
            for (var s = 0; s < SLOTS; s++) if (piles[s] && piles[s].cat === cat) return s;
            return -1;
        }
        function freeSlot() { return piles.indexOf(null); }
        function flip(column) {
            if (column.length && !column[column.length - 1].faceUp) {
                column[column.length - 1].faceUp = true;
                progress++;
            }
        }
        function bank(cat, n) {
            var s = slotOf(cat);
            piles[s].count += n;
            progress += n;
            if (piles[s].count === catSize(cat)) {
                piles[s] = null;
                finished[cat] = true;
            }
        }
        function step(fromZone, fromIndex, toZone, toIndex) {
            line.push({ from: { zone: fromZone, index: fromIndex }, to: { zone: toZone, index: toIndex } });
        }
        function cleared() {
            return !stock.length && !waste.length && tableau.every(function (column) { return !column.length; });
        }
        // How much of a category is in reach: words on column tops count
        // double, any face-up word and anything in the pile once.
        function pressure(cat) {
            var n = 0;
            tableau.forEach(function (column) {
                topRunOf(column).forEach(function (card) { if (card.cat === cat && card.kind === 'word') n += 2; });
                column.forEach(function (card) { if (card.faceUp && card.cat === cat && card.kind === 'word') n++; });
            });
            waste.forEach(function (card) { if (card.cat === cat && card.kind === 'word') n++; });
            return n + (explore ? random() * 3 : 0);
        }

        for (var guard = 0; guard < 4000; guard++) {
            if (firstOnly && line.length) return { moves: 1, line: line };
            if (cleared()) return { moves: line.length, line: line };
            var acted = false;
            var lid = waste.length ? waste[waste.length - 1] : null;

            // 1. A column's run onto its open slot: it uncovers a card.
            var runs = [];
            for (t = 0; t < COLUMNS; t++) {
                var run = topRunOf(tableau[t]);
                if (run.length && !crownIn(run) && run[0].kind === 'word' && slotOf(run[0].cat) >= 0) runs.push(t);
            }
            if (runs.length) {
                t = explore ? runs[Math.floor(random() * runs.length)] : runs[0];
                var going = topRunOf(tableau[t]);
                var into = slotOf(going[0].cat);
                tableau[t].splice(tableau[t].length - going.length, going.length);
                flip(tableau[t]);
                step('tableau', t, 'foundation', into);
                bank(going[0].cat, going.length);
                continue;
            }

            // 2. The pile's top onto its open slot.
            if (lid && lid.kind === 'word' && slotOf(lid.cat) >= 0) {
                step('waste', 0, 'foundation', slotOf(lid.cat));
                waste.pop();
                bank(lid.cat, 1);
                continue;
            }

            // 3. Open a category: a capped stack, a crowned card on a column, or
            //    one on top of the pile — whichever has the most in reach.
            if (freeSlot() >= 0) {
                var best = null;
                var bestScore = -1;
                for (t = 0; t < COLUMNS; t++) {
                    var capped = topRunOf(tableau[t]);
                    var crown = crownIn(capped);
                    if (!crown || finished[crown.cat] || slotOf(crown.cat) >= 0) continue;
                    var score = pressure(crown.cat) + (capped.length - 1) * 3 + 1;
                    if (score > bestScore) { bestScore = score; best = { t: t, crown: crown, carried: capped.length - 1 }; }
                }
                if (lid && lid.kind === 'cat' && !finished[lid.cat] && slotOf(lid.cat) < 0) {
                    var fromPile = pressure(lid.cat) + 0.5;
                    if (fromPile > bestScore) best = { t: -1, crown: lid, carried: 0 };
                }
                if (best) {
                    var slot = freeSlot();
                    if (best.t >= 0) {
                        tableau[best.t].splice(tableau[best.t].length - (best.carried + 1), best.carried + 1);
                        flip(tableau[best.t]);
                        step('tableau', best.t, 'foundation', slot);
                    } else {
                        waste.pop();
                        step('waste', 0, 'foundation', slot);
                    }
                    piles[slot] = { cat: best.crown.cat, count: 0 };
                    progress++;
                    if (best.carried) bank(best.crown.cat, best.carried);
                    continue;
                }
            }

            // 4. The pile's top onto a column of its own words, which keeps the
            //    pile shallow. A crowned card goes this way only to park on its
            //    own words while every slot is taken.
            if (lid && !(explore && random() < 0.15)) {
                for (t = 0; t < COLUMNS && !acted; t++) {
                    var head = tableau[t].length ? tableau[t][tableau[t].length - 1] : null;
                    if (!head || !head.faceUp || head.kind !== 'word' || head.cat !== lid.cat) continue;
                    if (lid.kind === 'cat' && freeSlot() >= 0) continue;
                    tableau[t].push(waste.pop());
                    step('waste', 0, 'tableau', t);
                    acted = true;
                }
                if (acted) continue;
            }

            // 5. Dig: move a run that sits on a face-down card, onto a column of
            //    its own words or into an empty column, to turn that card over.
            //    A capped stack can only take the empty column.
            if (!(explore && random() < 0.15)) {
                for (t = 0; t < COLUMNS && !acted; t++) {
                    var dig = topRunOf(tableau[t]);
                    if (!dig.length || dig.length === tableau[t].length) continue;
                    var cappedDig = crownIn(dig) && dig.length > 1;
                    if (tableau[t][tableau[t].length - dig.length - 1].faceUp) continue;
                    for (var d = 0; d < COLUMNS && !acted; d++) {
                        if (d === t) continue;
                        var onto = tableau[d];
                        var top = onto.length ? onto[onto.length - 1] : null;
                        var fits = !top || (!cappedDig &&
                            top.faceUp && top.kind === 'word' && top.cat === dig[0].cat);
                        if (!fits) continue;
                        tableau[t].splice(tableau[t].length - dig.length, dig.length);
                        flip(tableau[t]);
                        tableau[d] = onto.concat(dig);
                        step('tableau', t, 'tableau', d);
                        acted = true;
                    }
                }
                if (acted) continue;
            }

            // 6. Deal.
            if (stock.length) {
                var dealt = stock.pop();
                dealt.faceUp = true;
                waste.push(dealt);
                line.push({ draw: true });
                continue;
            }

            // 7. With the deck out, a dead card on the pile can wait in an
            //    empty column rather than go round again.
            if (lid && waste.length > 1) {
                for (t = 0; t < COLUMNS && !acted; t++) {
                    if (tableau[t].length) continue;
                    tableau[t].push(waste.pop());
                    step('waste', 0, 'tableau', t);
                    acted = true;
                }
                if (acted) continue;
            }

            // 8. Turn the pile back — unless the last whole pass changed nothing.
            if (waste.length) {
                if (progress === progressAtRecycle) return null;
                progressAtRecycle = progress;
                stock = waste.reverse();
                stock.forEach(function (card) { card.faceUp = false; });
                waste = [];
                line.push({ draw: true });                 // a tap on the empty deck
                continue;
            }
            return null;
        }
        return null;
    }

    /* How hard the dealer looks for a short line before it sets the budget.
       One try is plain greedy play, so straightforward play always gets home
       with the slack in hand; each extra try is a playout with some
       exploration, and the budget comes from the shortest. A level that
       searches harder finds shorter lines, so its budget leaves less room
       for a player who just plays the obvious move. */
    var PLAYOUTS = 12;

    function buildDeal(level, random) {
        var tightest = null;   // the shortest line seen, if the pin refuses them all
        for (var attempt = 0; attempt < 400; attempt++) {
            var cards = shuffle(buildCards(level), random);
            spreadDeck(cards, deckSegments(level, cards.length), random);
            // A staircase, as the board is dealt: 4, 5, 6, 7 for rows = 4.
            var tableau = [];
            var k = 0;
            for (var c = 0; c < COLUMNS; c++) {
                var column = [];
                var depth = level.rows + c;
                for (var n = 0; n < depth; n++) {
                    var card = cards[k++];
                    card.faceUp = n === depth - 1;          // only the card on top shows
                    column.push(card);
                }
                tableau.push(column);
            }
            // cards[k] is drawn first, so the stock is the rest, reversed
            var stock = cards.slice(k).reverse();
            stock.forEach(function (card) { card.faceUp = false; });

            var board = { tableau: tableau, stock: stock, waste: [], foundations: [null, null, null, null], completed: [] };
            var best = null;
            var tries = level.tries || PLAYOUTS;
            for (var p = 0; p < tries; p++) {
                var tried = playThrough(board, random, p > 0);
                if (tried && (!best || tried.moves < best.moves)) best = tried;
            }
            if (!best) continue;
            // A level may pin its budget outright. Deal again rather than hand
            // over a board the pin cannot pay for.
            if (level.moves && best.moves > level.moves) {
                if (!tightest || best.moves < tightest.plan.moves) {
                    tightest = { plan: best, tableau: tableau, stock: stock, attempt: attempt };
                }
                continue;
            }
            return finish(best, tableau, stock, attempt + 1);
        }
        // Every deal overshot the pin, so it is set below what the level can be
        // won in. Hand over the closest board at its own line — losing on the
        // deal is worse than a budget that does not match the data.
        if (tightest) {
            if (window.console && console.warn) {
                console.warn('Word Solitaire: ' + level.name + ' is pinned to ' + level.moves +
                    ' moves but needs at least ' + tightest.plan.moves);
            }
            return finish(tightest.plan, tightest.tableau, tightest.stock, tightest.attempt + 1, true);
        }
        return null;

        function finish(plan, tableau, stock, attempts, overshot) {
            return {
                tableau: tableau,
                stock: stock,
                solution: plan.moves,
                line: plan.line,
                moveLimit: level.moves && !overshot
                    ? level.moves       // the level says what it allows
                    : level.minimal || overshot
                        ? plan.moves + (overshot ? 0 : level.extra || 0)   // the line, plus any flat allowance
                        : Math.round(plan.moves * (1 + level.slack)) + (level.extra || 0),
                attempts: attempts
            };
        }
    }

    /* ------------------------------------------------------------- game flow */

    function newGame(levelIndex, prebuilt) {
        var level = LEVELS[levelIndex];
        var deal = prebuilt || null;   // a test can hand in a deal it has already seen
        while (!deal) deal = buildDeal(level, mulberry32((Math.random() * 4294967296) >>> 0));
        var foundations = [];
        for (var i = 0; i < SLOTS; i++) foundations.push(null);
        state = {
            levelIndex: levelIndex,
            level: level,
            stock: deal.stock,
            waste: [],
            foundations: foundations,
            tableau: deal.tableau,
            completed: [],
            moves: deal.moveLimit,
            moveLimit: deal.moveLimit,
            solution: deal.solution,
            history: [],
            tools: { hint: LIMITS.hint, undo: LIMITS.undo, wild: LIMITS.wild },
            over: null
        };
        closeOverlay();
        render();
    }

    function snapshot() {
        state.history.push(JSON.parse(JSON.stringify({
            stock: state.stock,
            waste: state.waste,
            foundations: state.foundations,
            tableau: state.tableau,
            completed: state.completed,
            moves: state.moves,
            tools: state.tools
        })));
        if (state.history.length > 250) state.history.shift();
    }

    /* One tap deals one card, as many times as the stock lasts. A card you
       cannot use just stays on the pile and the next one covers it. */
    function drawCard() {
        if (state.over) return;
        if (!state.stock.length) {
            recycle();
            return;
        }
        snapshot();
        var card = state.stock.pop();
        card.faceUp = true;
        state.waste.push(card);
        state.moves--;
        render();
        checkEnd();
    }

    /* With the stock empty, the unplaced pile goes back into it in the order
       it was dealt, ready for another pass. */
    function recycle() {
        if (state.over) return;
        if (state.stock.length) return;
        if (!state.waste.length) {
            toast('Nothing left to deal');
            return;
        }
        snapshot();
        state.stock = state.waste.reverse();
        state.stock.forEach(function (card) { card.faceUp = false; });
        state.waste = [];
        state.moves--;
        render();
        checkEnd();
    }

    function pickable(zone, index) {
        if (zone === 'tableau') return state.tableau[index] ? topRun(state.tableau[index]) : [];
        if (zone === 'waste') return state.waste.length ? [state.waste[state.waste.length - 1]] : [];
        return [];
    }

    function take(from) {
        if (from.zone === 'tableau') {
            var column = state.tableau[from.index];
            var run = topRun(column);
            column.splice(column.length - run.length, run.length);
            flipTop(column);
            return run;
        }
        return state.waste.splice(state.waste.length - 1, 1);
    }

    function destinations() {
        var list = [];
        var i;
        for (i = 0; i < SLOTS; i++) list.push({ zone: 'foundation', index: i });
        for (i = 0; i < COLUMNS; i++) list.push({ zone: 'tableau', index: i });
        return list;
    }

    function canDrop(cards, to) {
        if (!cards.length) return false;
        if (to.zone === 'foundation') {
            return to.index < state.foundations.length && canPlaceOnFoundation(cards, to.index);
        }
        if (to.zone === 'tableau') return state.tableau[to.index] ? canPlaceOnColumn(cards, to.index) : false;
        return false;               // the pile only ever fills from the deck
    }

    function rejection(cards, to) {
        if (to.zone === 'waste') return 'Only the deck fills that pile';
        if (to.zone === 'foundation') {
            if (cards[0].kind === 'joker') return 'A joker has no slot';
            var pile = state.foundations[to.index];
            if (!pile) return 'Crowned cards open slots';
            if (cards[0].kind === 'cat') return 'That slot is taken';
        }
        if (to.zone === 'tableau') {
            var column = state.tableau[to.index];
            var top = column.length ? column[column.length - 1] : null;
            if (top && top.faceUp && top.kind === 'cat') {
                return 'Closed by its crowned card';
            }
            if (crownOf(cards) && cards.length > 1) return 'Empty column or joker only';
        }
        return 'Same category only';
    }

    function moveCards(from, to) {
        if (state.over) return false;
        var cards = pickable(from.zone, from.index);
        if (!cards.length) return false;
        if (from.zone === to.zone && from.index === to.index) return false;
        if (!canDrop(cards, to)) {
            toast(rejection(cards, to));
            shake(to.zone, to.index);
            flashZone(to, 'rejected');
            return false;
        }
        snapshot();
        var moved = take(from);
        if (to.zone === 'foundation') {
            var crown = crownOf(moved);
            if (crown) {
                state.foundations[to.index] = { cat: crown.cat, cards: moved.slice(0, -1) };
            } else {
                state.foundations[to.index].cards = state.foundations[to.index].cards.concat(moved);
            }
        } else {
            var landing = state.tableau[to.index];
            var under = landing.length ? landing[landing.length - 1] : null;
            if (under && under.kind === 'joker') under.used = true;   // it has done its job
            state.tableau[to.index] = landing.concat(moved);
        }
        state.moves--;
        burnSpentJokers();
        resolveCompletions();
        render();
        flashZone(to, 'landed');
        checkEnd();
        return true;
    }

    /* A joker is good for one stack. Once something has been piled onto it and
       then taken off again, the joker goes with it. */
    function burnSpentJokers() {
        state.tableau.forEach(function (column, index) {
            var top = column.length ? column[column.length - 1] : null;
            if (!top || top.kind !== 'joker' || !top.used) return;
            column.pop();
            flipTop(column);
            state.tableau[index] = column;
            toast('Joker spent');
        });
    }

    /* A foundation holding every word of its category locks in, clears the
       slot for the next category, and pays out. */
    function resolveCompletions() {
        state.foundations.forEach(function (pile, index) {
            if (!pile || pile.cards.length < catSize(pile.cat)) return;
            state.foundations[index] = null;
            state.completed.push(pile.cat);
            toast(CATEGORIES[pile.cat].name + ' complete');
        });
    }

    /* ------------------------------------------------------------ move lists */

    function sources() {
        var list = [];
        state.tableau.forEach(function (column, index) {
            var run = topRun(column);
            if (run.length) list.push({ zone: 'tableau', index: index, cards: run });
        });
        if (state.waste.length) {
            list.push({ zone: 'waste', index: 0, cards: [state.waste[state.waste.length - 1]] });
        }
        return list;
    }

    function legalMoves() {
        var moves = [];
        sources().forEach(function (from) {
            destinations().forEach(function (to) {
                if (from.zone === to.zone && from.index === to.index) return;
                if (!canDrop(from.cards, to)) return;
                // Sliding a whole column into an empty one is not progress.
                if (to.zone === 'tableau' && !state.tableau[to.index].length &&
                    from.zone === 'tableau' &&
                    state.tableau[from.index].length === from.cards.length) return;
                moves.push({ from: from, to: to });
            });
        });
        return moves;
    }

    function scoreMove(move) {
        var cards = move.from.cards;
        var score = 0;
        if (move.to.zone === 'foundation') {
            var pile = state.foundations[move.to.index];
            if (cards[0].kind === 'cat') return 70;
            score = 80 + cards.length;
            if (pile.cards.length + cards.length === catSize(pile.cat)) score += 60;
            return score;
        }
        score = cards[0].kind === 'cat' ? 25 : 40 + cards.length;
        if (move.from.zone === 'waste') score += 10;                      // uncovers the pile
        if (move.from.zone === 'tableau') {
            var column = state.tableau[move.from.index];
            if (column.length === cards.length) score += 15;              // empties a column
            else if (!column[column.length - cards.length - 1].faceUp) score += 20;   // uncovers
        }
        return score;
    }

    function checkEnd() {
        if (state.over) return;
        if (!cardsLeft() && !state.foundations.some(Boolean)) {
            // sweep off any joker still lying about, so the table really is clear
            state.waste = state.waste.filter(function (card) { return !isJoker(card); });
            state.tableau = state.tableau.map(function (column) {
                return column.filter(function (card) { return !isJoker(card); });
            });
            state.over = 'win';
            if (state.levelIndex + 1 > progress) {
                progress = state.levelIndex + 1;
                writeNumber(KEY_PROGRESS, progress);
            }
            render();
            showWin();
            return;
        }
        if (state.moves <= 0) {
            state.over = 'lose';
            render();
            showLose();
            return;
        }
        // Dealing and recycling shuffle the same cards around, so the board is
        // only truly stuck when nothing on it can be placed and nothing still
        // to come can be either.
        if (legalMoves().length) return;
        var undealt = state.stock.concat(state.waste.slice(0, -1));
        var help = undealt.some(function (card) {
            return destinations().some(function (to) { return canDrop([card], to, false); });
        });
        if (!help) showStuck();
    }

    /* -------------------------------------------------------------- power-ups */

    function useHint() {
        if (state.over) return;
        if (!state.tools.hint) {
            toast('No hints left');
            return;
        }
        var moves = legalMoves();
        if (!moves.length) {
            toast(state.stock.length ? 'Nothing to place — deal' : 'No legal move left');
            return;
        }
        state.tools.hint--;
        var best = moves.reduce(function (a, b) { return scoreMove(b) > scoreMove(a) ? b : a; });
        render();
        highlight(best.from.zone, best.from.index, 'hint-from');
        highlight(best.to.zone, best.to.index, 'hint-to');
    }

    function useUndo() {
        if (!state.history.length) {
            toast('Nothing to undo');
            return;
        }
        if (!state.tools.undo) {
            toast('No undos left');
            return;
        }
        state.tools.undo--;
        var previous = state.history.pop();
        if (previous.tools) {                  // the undo just spent stays spent
            state.tools = {
                hint: previous.tools.hint,
                undo: state.tools.undo,
                wild: previous.tools.wild
            };
        }
        state.stock = previous.stock;
        state.waste = previous.waste;
        state.foundations = previous.foundations;
        state.tableau = previous.tableau;
        state.completed = previous.completed;
        state.moves = previous.moves;
        state.over = null;
        closeOverlay();
        render();
    }

    /* The joker is a card, not a mode. Taking one deals it onto the unplaced
       pile; from there you drag it like anything else. It lands on any column,
       and once down, anything can be stacked on it. */
    function takeJoker() {
        if (state.over) return;
        if (!state.tools.wild) {
            toast('No jokers left');
            return;
        }
        snapshot();
        state.tools.wild--;
        state.waste.push({
            id: 'joker-' + state.waste.length + '-' + state.moves,
            kind: 'joker',
            cat: null,
            word: 'Joker',
            faceUp: true
        });
        toast('Joker dealt — drag it anywhere');
        render();
    }

    /* ---------------------------------------------------------------- render */

    var boardEl = document.getElementById('board');
    var wasteEl = document.getElementById('waste');
    var stockEl = document.getElementById('stock');
    var foundationsEl = document.getElementById('foundations');
    var movesEl = document.getElementById('moves');
    var dotsEl = document.getElementById('dots');
    var levelEl = document.getElementById('level-name');
    var toastEl = document.getElementById('toast');
    var overlayEl = document.getElementById('overlay');
    var panelEl = document.getElementById('panel');

    function cardFace(card, options) {
        options = options || {};
        var classes = 'card' + (card.kind === 'cat' ? ' catcard' : '') + (options.classes || '');
        var style = options.style ? ' style="' + options.style + '"' : '';
        var inner = options.prefix || '';
        if (card.kind === 'joker') {
            return '<div class="' + classes.replace('card', 'card jokercard') + '"' + style + '>' +
                inner + '<span class="jokerface">&#127183;</span><span class="word">Joker</span></div>';
        }
        if (card.kind === 'cat') {
            inner += '<span class="crown">&#9819;</span>' +
                '<span class="count">0/' + catSize(card.cat) + '</span>';
        }
        inner += '<span class="word' + (card.word.length > 7 ? ' long' : '') + '">' + card.word + '</span>';
        return '<div class="' + classes + '"' + style + '>' + inner + '</div>';
    }

    function render() {
        renderHeader();
        renderWaste();
        renderFoundations();
        renderTableau();
        renderTools();
        saveGame();
    }

    function renderTools() {
        ['hint', 'undo', 'wild'].forEach(function (tool) {
            var button = document.getElementById('tool-' + tool);
            var left = state.tools[tool];
            button.querySelector('.badge').textContent = left;
            button.classList.toggle('spent', !left);
        });
    }

    function renderHeader() {
        movesEl.textContent = state.moves;
        movesEl.classList.toggle('low', state.moves <= 5);
        levelEl.textContent = 'LVL ' + (state.levelIndex + 1);
        var dots = '';
        state.level.cats.forEach(function (catId) {
            var done = state.completed.indexOf(catId) >= 0;
            dots += '<span class="dot' + (done ? ' done' : '') + '">' + (done ? '&#10003;' : '') + '</span>';
        });
        dotsEl.innerHTML = dots;
    }

    /* The pile shows its top card in full with the next couple peeking out
       behind it, so you can see what dealing has buried. */
    function renderWaste() {
        var html = '';
        var shown = state.waste.slice(-WASTE_PEEK);
        shown.forEach(function (card, i) {
            var age = shown.length - 1 - i;          // 0 is the card on top
            if (!age) {
                html += '<div class="wastecard top" data-zone="waste" data-index="0" style="order:0">' +
                    cardFace(card) + '</div>';
                return;
            }
            html += '<div class="wastecard peek" style="order:' + age + '">' +
                '<div class="peekcard' + (card.kind === 'cat' ? ' catcard' : '') + '">' +
                card.word + '</div></div>';
        });
        if (state.waste.length > WASTE_PEEK) {
            html += '<div class="wastemore">+' + (state.waste.length - WASTE_PEEK) + '</div>';
        }
        wasteEl.innerHTML = html;

        stockEl.innerHTML = state.stock.length
            ? '<div class="card facedown"><span class="stockcount">' + state.stock.length + '</span></div>'
            : '<div class="hole' + (state.waste.length ? ' recycle' : ' empty-stock') + '">' +
              (state.waste.length ? '&#8635;' : '') + '</div>';
    }

    function renderFoundations() {
        var html = '';
        state.foundations.forEach(function (pile, index) {
            if (!pile) {
                html += '<div class="fslot" data-zone="foundation" data-index="' + index + '">' +
                    '<div class="hole"><span>&#9819;</span></div></div>';
                return;
            }
            var category = CATEGORIES[pile.cat];
            var top = pile.cards[pile.cards.length - 1];
            var body = '<span class="tab" style="background:' + category.color + '">' + category.name + '</span>' +
                '<div class="card' + (pile.cards.length ? '' : ' catcard') + '">' +
                (pile.cards.length ? '' : '<span class="crown">&#9819;</span>') +
                '<span class="count">' + pile.cards.length + '/' + catSize(pile.cat) + '</span>' +
                '<span class="word' + (top && top.word.length > 7 ? ' long' : '') + '">' +
                (top ? top.word : category.name) + '</span></div>';
            html += '<div class="fslot filled" data-zone="foundation" data-index="' + index + '">' + body + '</div>';
        });
        foundationsEl.innerHTML = html;
    }

    function renderTableau() {
        var html = '';
        state.tableau.forEach(function (column, index) {
            var faceDownBefore = 0;
            var faceUpBefore = 0;
            var lastFd = 0;
            var lastFu = 0;
            var cards = '';

            column.forEach(function (card, position) {
                var offset = 'calc(var(--fd) * ' + faceDownBefore + ' + var(--fu) * ' + faceUpBefore + ')';
                lastFd = faceDownBefore;
                lastFu = faceUpBefore;
                if (card.faceUp) faceUpBefore++; else faceDownBefore++;

                if (!card.faceUp) {
                    cards += '<div class="card facedown" style="top:' + offset + '"></div>';
                    return;
                }

                cards += cardFace(card, {
                    classes: position === column.length - 1 ? '' : ' covered',
                    style: 'top:' + offset
                });
            });

            if (!column.length) cards = '<div class="hole"></div>';

            var height = column.length
                ? 'calc(var(--card-h) + var(--fd) * ' + lastFd + ' + var(--fu) * ' + lastFu + ')'
                : 'var(--card-h)';
            var lid = column.length ? column[column.length - 1] : null;
            var closed = lid && lid.faceUp && lid.kind === 'cat' ? ' closed' : '';
            html += '<div class="col' + closed + '" data-zone="tableau" data-index="' + index +
                '" style="min-height:' + height + '">' + cards + '</div>';
        });
        boardEl.innerHTML = html;
    }

    /* ------------------------------------------------------------- feedback */

    var toastTimer = null;
    function toast(message) {
        toastEl.textContent = message;
        toastEl.classList.add('show');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () { toastEl.classList.remove('show'); }, 1200);
    }

    function zoneEl(zone, index) {
        return document.querySelector('[data-zone="' + zone + '"][data-index="' + index + '"]');
    }

    /* Green where a card lands, red where one is turned away. */
    function flashZone(to, mark) {
        var el = zoneEl(to.zone, to.index);
        if (!el) return;
        el.classList.remove(mark);
        void el.offsetWidth;
        el.classList.add(mark);
        window.setTimeout(function () { el.classList.remove(mark); }, 520);
    }

    function shake(zone, index) {
        var el = zoneEl(zone, index);
        if (!el) return;
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
    }

    function highlight(zone, index, cls) {
        var el = zoneEl(zone, index);
        if (!el) return;
        el.classList.add(cls);
        window.setTimeout(function () { el.classList.remove(cls); }, 3000);
    }

    function clearHints() {
        Array.prototype.forEach.call(document.querySelectorAll('.hint-from, .hint-to'), function (el) {
            el.classList.remove('hint-from');
            el.classList.remove('hint-to');
        });
    }

    /* -------------------------------------------------------------- overlays */

    function openOverlay(html) {
        panelEl.innerHTML = html;
        overlayEl.classList.add('show');
    }

    function closeOverlay() {
        overlayEl.classList.remove('show');
    }

    /* ------------------------------------------------------------- the prize
       Beating the last level turns up a message nobody is told about. Its
       button lays out three date options; picking one opens an email to
       PRIZE_EMAIL with the choice already written. */
    var PRIZE_EMAIL = 'manzieric420@gmail.com';
    var PRIZE_DATES = [
        {
            when: 'Friday, December 11',
            title: 'Lights and a classic diner',
            plan: 'A walk through ZooLights at Lincoln Park Zoo after dark, then dinner at ' +
                'The Chicago Diner on Halsted — all vegetarian since 1983, and famous for ' +
                'its vegan milkshakes.'
        },
        {
            when: 'Saturday, December 12',
            title: 'A downtown holiday night',
            plan: 'Glühwein at the Christkindlmarket in Daley Plaza, a lap of the Maggie ' +
                'Daley Park skating ribbon at dusk, then the vegetarian tasting menu at ' +
                'Indienne in River North.'
        },
        {
            when: 'Sunday, December 13',
            title: 'Brunch and art',
            plan: 'Brunch at Lula Cafe in Logan Square, then an afternoon at the Art ' +
                'Institute — the Thorne Miniature Rooms are worth the detour.'
        }
    ];

    function showPrize() {
        openOverlay(
            '<h2>Table cleared</h2>' +
            '<p class="prize">Congrats you have qualified for a date with eric manzi!</p>' +
            '<button class="btn primary" data-action="claim">Click here to claim your prize!</button>' +
            '<button class="btn" data-action="replay">Play again</button>' +
            '<button class="btn ghost" data-action="menu">Menu</button>'
        );
    }

    function showDates() {
        var options = PRIZE_DATES.map(function (date) {
            var subject = 'Claiming my prize: ' + date.title + ' (' + date.when + ')';
            var body = 'I beat the last level of Word Solitaire, and I pick the ' + date.when +
                ' date: ' + date.title + '.\n\n' + date.plan;
            var href = 'mailto:' + PRIZE_EMAIL + '?subject=' + encodeURIComponent(subject) +
                '&body=' + encodeURIComponent(body);
            return '<div class="date-option">' +
                '<div class="when">' + date.when + '</div>' +
                '<h3>' + date.title + '</h3>' +
                '<p>' + date.plan + '</p>' +
                '<a class="btn primary" href="' + href + '">Pick this date</a>' +
                '</div>';
        }).join('');
        openOverlay(
            '<h2>Your prize</h2>' +
            '<p>Three dates in Chicago, the weekend of December 11–13, 2026. Pick one.</p>' +
            options +
            '<button class="btn ghost" data-action="menu">Menu</button>'
        );
    }

    function showWin() {
        if (state.levelIndex === LEVELS.length - 1) {
            showPrize();
            return;
        }
        openOverlay(
            '<h2>Table cleared</h2>' +
            '<p>Every category home with ' + state.moves + ' move' + (state.moves === 1 ? '' : 's') + ' to spare.</p>' +
            (state.levelIndex + 1 < LEVELS.length
                ? '<button class="btn primary" data-action="next">Next level</button>'
                : '<p>That was the last level — nicely done.</p>') +
            '<button class="btn" data-action="replay">Play again</button>' +
            '<button class="btn ghost" data-action="menu">Menu</button>'
        );
    }

    function showLose() {
        openOverlay(
            '<h2>Out of moves</h2>' +
            '<p>' + cardsLeft() + ' card' + (cardsLeft() === 1 ? '' : 's') + ' still on the table.' +
            (state.tools.undo ? ' An undo keeps the board alive.' : '') + '</p>' +
            '<button class="btn primary" data-action="replay">Try again</button>' +
            (state.tools.undo
                ? '<button class="btn" data-action="undo">Undo last move (' + state.tools.undo + ' left)</button>'
                : '') +
            '<button class="btn ghost" data-action="menu">Menu</button>'
        );
    }

    function showStuck() {
        var outs = (state.tools.wild
            ? '<button class="btn primary" data-action="wild">Take the joker (' + state.tools.wild + ' left)</button>'
            : '') +
            (state.tools.undo
                ? '<button class="btn" data-action="undo">Undo (' + state.tools.undo + ' left)</button>'
                : '');
        openOverlay(
            '<h2>No moves left</h2>' +
            '<p>Nothing can be placed.' +
            (outs ? ' A joker is a card that lands on any column, or you can take a move back.'
                  : ' Nothing left to spend on this one — deal it again.') + '</p>' +
            outs +
            '<button class="btn' + (outs ? ' ghost' : ' primary') + '" data-action="replay">Restart level</button>'
        );
    }

    function showMenu() {
        var levels = LEVELS.map(function (level, i) {
            return '<button class="level-btn' + (i < progress ? ' cleared' : '') +
                '" data-action="goto" data-level="' + i + '">' +
                '<span class="n">' + (i + 1) + '</span>' + level.name +
                (i < progress ? '<span class="tick">&#10003;</span>' : '') + '</button>';
        }).join('');
        openOverlay(
            '<h2>Word Solitaire</h2>' +
            '<p>Open a category in one of the four slots, then send it every word ' +
            'that belongs to it. Every level is open — start wherever you like.</p>' +
            '<div class="levels">' + levels + '</div>' +
            '<button class="btn primary" data-action="close">Resume</button>' +
            '<button class="btn" data-action="replay">Restart level</button>' +
            '<button class="btn ghost" data-action="help">How to play</button>' +
            '<a class="btn ghost" href="index.html">Leave game</a>'
        );
    }

    function showHelp() {
        openOverlay(
            '<h2>How to play</h2>' +
            '<ul class="help">' +
            '<li><b>Everything moves by dragging.</b> Drag a card, or a group of ' +
            'them, from where it is to where it belongs.</li>' +
            '<li><b>Open a category.</b> A card like <i>Praise 0/8</i> is a category ' +
            'card: drag it into one of the four slots and that category starts ' +
            'collecting. Only four run at once.</li>' +
            '<li><b>Send words home.</b> Drag a word onto its slot. Extol goes ' +
            'to Praise, Nile goes to Rivers — nothing else is accepted.</li>' +
            '<li><b>Use the columns.</b> Drag a word onto another word of the same ' +
            'category to keep it handy; the whole group then moves in one go. Any ' +
            'card can go on an empty column.</li>' +
            '<li><b>A crowned card closes a stack.</b> Drop one on a stack of its ' +
            'own words and it caps them, marked with a gold lid. Only a joker can ' +
            'go on top after that. Drag the crowned card again and the whole ' +
            'capped stack comes with it — to an empty slot, where it opens the ' +
            'category and banks every word it carries in one move, or to an ' +
            'empty column or a joker to wait. It never goes onto a word.</li>' +
            '<li><b>The joker is a card.</b> Take one and it is dealt onto the ' +
            'unplaced pile. Drag it onto any column, whatever is sitting there — ' +
            'a gold lid included — and anything can then be stacked on it, a ' +
            'capped stack too. It is good for that one stack: lift what you piled ' +
            'on and the joker goes with it.</li>' +
            '<li><b>Deal when stuck.</b> Tap the deck as often as you like. Each ' +
            'card lands on the unplaced pile beside it, and only the card on top ' +
            'of that pile is in play — the ones behind it are waiting.</li>' +
            '<li><b>Turn the pile back.</b> When the deck runs out, tap it once ' +
            'more and the whole unplaced pile becomes the deck again, in the same ' +
            'order, ready for another pass.</li>' +
            '<li>Filling a category clears its slot for the next one. Every action ' +
            'costs a move — empty the table before the counter runs out.</li>' +
            '</ul>' +
            '<button class="btn primary" data-action="close">Got it</button>'
        );
    }

    /* --------------------------------------------------------------- events */

    var drag = null;

    function zoneAt(x, y) {
        var el = document.elementFromPoint(x, y);
        var holder = el && el.closest ? el.closest('[data-zone]') : null;
        if (!holder) return null;
        return {
            zone: holder.getAttribute('data-zone'),
            index: parseInt(holder.getAttribute('data-index'), 10),
            el: holder
        };
    }

    function clearTargets() {
        Array.prototype.forEach.call(document.querySelectorAll('.drop-over'), function (el) {
            el.classList.remove('drop-over');
        });
    }

    function moveGhost(x, y) {
        drag.ghost.style.transform = 'translate(' + (x + drag.dx) + 'px,' + (y + drag.dy) + 'px)';
    }

    function onDragStart(event) {
        if (state.over || drag) return;
        if (event.button && event.button !== 0) return;
        var holder = event.target.closest ? event.target.closest('[data-zone]') : null;
        if (!holder) return;
        var zone = holder.getAttribute('data-zone');
        var index = parseInt(holder.getAttribute('data-index'), 10);
        clearHints();

        if (zone === 'stock') {
            drawCard();
            return;
        }

        var selection = window.getSelection ? window.getSelection() : null;
        if (selection && selection.rangeCount) selection.removeAllRanges();

        var cards = pickable(zone, index);
        if (!cards.length) {
            if (zone === 'tableau' && state.tableau[index].length) toast('That card is face down');
            return;
        }

        var cardEls = holder.querySelectorAll('.card');
        var first = cardEls[cardEls.length - cards.length];
        var rect = first.getBoundingClientRect();

        var ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        ghost.style.width = rect.width + 'px';
        ghost.innerHTML = cards.map(function (card, i) {
            return cardFace(card, { style: 'top:calc(var(--fu) * ' + i + ')' });
        }).join('');
        document.body.appendChild(ghost);

        drag = {
            from: { zone: zone, index: index },
            cards: cards,
            ghost: ghost,
            dx: rect.left - event.clientX,
            dy: rect.top - event.clientY,
            x: event.clientX,
            y: event.clientY,
            moved: false
        };
        moveGhost(event.clientX, event.clientY);
        for (var i = cardEls.length - cards.length; i < cardEls.length; i++) {
            cardEls[i].classList.add('dragging');
        }
        document.addEventListener('pointermove', onDragMove);
        document.addEventListener('pointerup', onDragEnd);
        document.addEventListener('pointercancel', onDragEnd);
        event.preventDefault();
    }

    function onDragMove(event) {
        if (!drag) return;
        if (Math.abs(event.clientX - drag.x) + Math.abs(event.clientY - drag.y) > 6) drag.moved = true;
        moveGhost(event.clientX, event.clientY);
        Array.prototype.forEach.call(document.querySelectorAll('.drop-over'), function (el) {
            el.classList.remove('drop-over');
        });
        // Whatever is under the finger is marked, legal or not: showing only
        // the legal ones would answer the puzzle for the player.
        var over = zoneAt(event.clientX, event.clientY);
        if (over && over.zone !== 'stock' && !(over.zone === drag.from.zone && over.index === drag.from.index)) {
            over.el.classList.add('drop-over');
        }
    }

    function onDragEnd(event) {
        if (!drag) return;
        document.removeEventListener('pointermove', onDragMove);
        document.removeEventListener('pointerup', onDragEnd);
        document.removeEventListener('pointercancel', onDragEnd);
        var current = drag;
        drag = null;
        current.ghost.parentNode.removeChild(current.ghost);
        clearTargets();

        // Put the lifted cards back before anything else happens. This must
        // come first: drawing the board again after the move would replace
        // the very cards the move just flashed green or shook red, and the
        // player would see no feedback at all.
        render();
        if (!current.moved) return;   // a tap is not a move
        var over = zoneAt(event.clientX, event.clientY);
        if (over && !(over.zone === current.from.zone && over.index === current.from.index)) {
            moveCards(current.from, { zone: over.zone, index: over.index });
        }
    }

    document.addEventListener('pointerdown', onDragStart);

    // A second guard behind the CSS one: no selection starts anywhere in the
    // game, and a long press never opens the context menu over the board.
    document.addEventListener('selectstart', function (event) { event.preventDefault(); });
    document.addEventListener('contextmenu', function (event) {
        if (event.target.closest && event.target.closest('[data-zone], .drag-ghost')) event.preventDefault();
    });

    document.getElementById('tool-hint').addEventListener('click', useHint);
    document.getElementById('tool-undo').addEventListener('click', useUndo);
    document.getElementById('tool-wild').addEventListener('click', takeJoker);
    document.getElementById('menu-btn').addEventListener('click', showMenu);

    overlayEl.addEventListener('click', function (event) {
        if (event.target === overlayEl) {
            if (!state.over) closeOverlay();
            return;
        }
        var trigger = event.target.closest('[data-action]');
        if (!trigger) return;
        var action = trigger.getAttribute('data-action');
        if (action === 'close') closeOverlay();
        if (action === 'menu') showMenu();
        if (action === 'help') showHelp();
        if (action === 'replay') newGame(state.levelIndex);
        if (action === 'next') newGame(Math.min(state.levelIndex + 1, LEVELS.length - 1));
        if (action === 'goto') newGame(parseInt(trigger.getAttribute('data-level'), 10));
        if (action === 'undo') useUndo();
        if (action === 'claim') showDates();
        if (action === 'wild') { closeOverlay(); takeJoker(); }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        if (overlayEl.classList.contains('show')) {
            if (!state.over) closeOverlay();
        }
    });

    /* Small hook for the browser console and for automated checks. */
    window.WordSolitaire = {
        state: function () { return state; },
        newGame: newGame,
        move: moveCards,
        draw: drawCard,
        legalMoves: legalMoves,
        checkLevels: checkLevels,
        deal: function (levelIndex) {
            return buildDeal(LEVELS[levelIndex], mulberry32((Math.random() * 4294967296) >>> 0));
        },
        // the move the dealer's own player would make next, without making it
        nextStep: function () {
            if (!state || state.over) return null;
            var next = playThrough(state, Math.random, false, true);
            return next && next.line.length ? next.line[0] : null;
        }
    };

    var firstVisit = false;
    try { firstVisit = window.localStorage.getItem(KEY_PROGRESS) === null; } catch (err) { firstVisit = true; }

    if (!resumeGame()) newGame(Math.min(progress, LEVELS.length - 1));
    if (firstVisit) showHelp();
}());
