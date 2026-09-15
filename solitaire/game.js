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
    var RECYCLE_ALLOWANCE = 15; // spare moves for turning the pile back, at most
    var WASTE_PEEK = 3;         // how many of the unplaced pile stay in view
    var SLOTS = 4;              // foundation slots
    var COLUMNS = 4;            // tableau columns
    var KEY_PROGRESS = 'wordSolitaire.progress';
    var KEY_GAME = 'wordSolitaire.game';

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
       is a lid, and nothing sits on a lid. */
    function canPlaceOnColumn(cards, index) {
        var column = state.tableau[index];
        // A capped stack has one destination: the slot its crowned card opens.
        if (crownOf(cards) && cards.length > 1) return false;
        if (!column.length) return true;
        var top = column[column.length - 1];
        if (!top.faceUp) return false;
        if (top.kind === 'cat') return false;          // a crowned card is a lid
        if (top.kind === 'joker') return true;         // a joker takes anything
        if (cards[0].kind === 'joker') return true;    // and lands anywhere
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

    /* Play the level through with a dealer that hands over a card the player
       can actually use, and keep the order it dealt. The run only ever reads
       what a player can see — the tops of the columns and the holding row —
       so the order it produces is solvable without knowing the buried cards.
       Returns the stock order and the length of that solution. */
    function cloneCard(card) {
        return { id: card.id, kind: card.kind, cat: card.cat, word: card.word, faceUp: !!card.faceUp };
    }

    function simulate(level, layout, pool, random) {
        var tableau = layout.map(function (column) { return column.map(cloneCard); });
        var waste = [];
        var piles = [];
        var open = {};
        var finished = {};
        var stock = [];
        var left = pool.map(cloneCard);
        var moves = 0;
        var recent = [];       // the last few categories dealt, to spread them out
        var i;

        for (i = 0; i < SLOTS; i++) piles.push(null);

        function freeSlot() { return piles.indexOf(null); }

        function empty() {
            return !left.length && !waste.length && tableau.every(function (c) { return !c.length; });
        }

        function collect(cards) {
            var cat = cards[0].cat;
            var slot = open[cat];
            piles[slot].count += cards.length;
            moves++;
            if (piles[slot].count === catSize(cat)) {
                piles[slot] = null;
                delete open[cat];
                finished[cat] = true;
            }
        }

        function openCategory(card, carried) {
            var slot = freeSlot();
            piles[slot] = { cat: card.cat, count: carried ? carried.length : 0 };
            open[card.cat] = slot;
            moves++;
            if (piles[slot].count === catSize(card.cat)) {
                piles[slot] = null;
                delete open[card.cat];
                finished[card.cat] = true;
            }
        }

        // How many cards of a category are waiting on the board — the dealer
        // opens the category that unblocks the most.
        function pressure(catId) {
            var n = 0;
            tableau.forEach(function (column) {
                column.forEach(function (card) { if (card.cat === catId && card.kind === 'word') n++; });
            });
            waste.forEach(function (card) { if (card.cat === catId && card.kind === 'word') n++; });
            return n;
        }

        for (var guard = 0; guard < 6000; guard++) {
            if (empty()) return { stock: stock, moves: moves };

            var acted = false;
            var t;
            var card;

            // 1. Feed an open foundation from the tableau first: it uncovers cards.
            //    A whole group travels at once, exactly as it does on the board.
            for (t = 0; t < tableau.length && !acted; t++) {
                var column = tableau[t];
                var run = topRunOf(column);
                if (!run.length || crownIn(run)) continue;
                if (run[0].kind !== 'word' || !open.hasOwnProperty(run[0].cat)) continue;
                column.splice(column.length - run.length, run.length);
                flipTop(column);
                collect(run);
                acted = true;
            }
            if (acted) continue;

            // 2. Then the top of the unplaced pile, the only card of it in play.
            var lid = waste.length ? waste[waste.length - 1] : null;
            if (lid && lid.kind === 'word' && open.hasOwnProperty(lid.cat)) {
                collect(waste.splice(waste.length - 1, 1));
                continue;
            }

            // 3. Open a category with a card that is already in reach.
            if (freeSlot() >= 0) {
                for (t = 0; t < tableau.length && !acted; t++) {
                    var col = tableau[t];
                    if (!col.length) continue;
                    var capped = topRunOf(col);
                    var crown = crownIn(capped);
                    if (!crown || finished[crown.cat] || open.hasOwnProperty(crown.cat)) continue;
                    col.splice(col.length - capped.length, capped.length);
                    flipTop(col);
                    openCategory(crown, capped.slice(0, -1));
                    acted = true;
                }
                if (!acted && lid && lid.kind === 'cat' && !finished[lid.cat] &&
                        !open.hasOwnProperty(lid.cat)) {
                    waste.pop();
                    openCategory(lid);
                    acted = true;
                }
                if (acted) continue;
            }

            // 4. Deal. Every candidate is a card the player can use straight
            //    away, and the dealer picks among them at random, preferring a
            //    category other than the one it dealt last. Taking the first
            //    usable card every time dealt a category out in one run, which
            //    looked — and played — like an unshuffled deck.
            if (left.length) {
                var usable = [];       // goes straight to an open slot
                var openers = [];      // a crowned card, with a slot free for it
                var stackable = [];    // can at least sit on a column
                var freeOne = freeSlot() >= 0;
                for (i = 0; i < left.length; i++) {
                    var candidate = left[i];
                    if (candidate.kind === 'word' && open.hasOwnProperty(candidate.cat)) {
                        usable.push(i);
                    } else if (candidate.kind === 'cat' && freeOne && !finished[candidate.cat] &&
                            !open.hasOwnProperty(candidate.cat)) {
                        openers.push(i);
                    } else if (candidate.kind === 'word') {
                        for (t = 0; t < tableau.length; t++) {
                            var lip = tableau[t].length ? tableau[t][tableau[t].length - 1] : null;
                            if (!lip || (lip.faceUp && lip.kind === 'word' && lip.cat === candidate.cat)) {
                                stackable.push(i);
                                break;
                            }
                        }
                    }
                }

                var choices = usable.concat(openers, stackable);
                if (!choices.length) choices = left.map(function (ignored, n) { return n; });

                // Deal from whichever category still has the most cards waiting,
                // so they all run down together. Taking whatever was usable left
                // one category stranded at the bottom of the deck, dealt out in
                // a single run.
                var remaining = {};
                left.forEach(function (candidate) {
                    remaining[candidate.cat] = (remaining[candidate.cat] || 0) + 1;
                });
                var fresh = choices.filter(function (n) { return left[n].cat !== recent[recent.length - 1]; });
                var pool2 = fresh.length ? fresh : choices;
                var best = -1;
                var pick = pool2[0];
                pool2.forEach(function (n) {
                    var weight = remaining[left[n].cat] + random();   // ties fall either way
                    if (weight > best) {
                        best = weight;
                        pick = n;
                    }
                });

                card = left.splice(pick, 1)[0];
                recent.push(card.cat);
                if (recent.length > 3) recent.shift();
                card.faceUp = true;
                stock.push(card);
                waste.push(card);
                moves++;
                continue;
            }

            // 5. Unload the pile's top card onto a column of the same category.
            if (lid && lid.kind === 'word') {
                for (t = 0; t < tableau.length && !acted; t++) {
                    var head = tableau[t].length ? tableau[t][tableau[t].length - 1] : null;
                    if (!head || !head.faceUp || head.kind !== 'word' || head.cat !== lid.cat) continue;
                    tableau[t].push(waste.pop());
                    moves++;
                    acted = true;
                }
            }
            if (acted) continue;

            // 6. Dig: move a run onto a matching column to uncover what is under it.
            for (t = 0; t < tableau.length && !acted; t++) {
                var dig = topRunOf(tableau[t]);
                if (!dig.length || dig.length === tableau[t].length || crownIn(dig)) continue;
                if (dig[0].kind !== 'word') continue;
                for (var d = 0; d < tableau.length && !acted; d++) {
                    if (d === t) continue;
                    var onto = tableau[d];
                    if (!onto.length) continue;
                    var cap = onto[onto.length - 1];
                    if (!cap.faceUp || cap.kind !== 'word' || cap.cat !== dig[0].cat) continue;
                    tableau[t].splice(tableau[t].length - dig.length, dig.length);
                    flipTop(tableau[t]);
                    tableau[d] = onto.concat(dig);
                    moves++;
                    acted = true;
                }
            }
            if (acted) continue;

            // 7. Last resort: an empty column will take anything.
            if (lid) {
                for (t = 0; t < tableau.length && !acted; t++) {
                    if (tableau[t].length) continue;
                    tableau[t].push(waste.pop());
                    moves++;
                    acted = true;
                }
            }
            if (acted) continue;

            return null;   // wedged — the caller deals again
        }
        return null;
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

    // How many of one category the deck deals back to back at its worst.
    function longestRun(cards) {
        var worst = 0;
        var run = 0;
        var previous = null;
        cards.forEach(function (card) {
            run = card.cat === previous ? run + 1 : 1;
            previous = card.cat;
            if (run > worst) worst = run;
        });
        return worst;
    }

    var MAX_RUN = 4;   // a longer run reads as an unshuffled deck

    function crownIn(run) {
        var last = run[run.length - 1];
        return last && last.kind === 'cat' ? last : null;
    }

    function buildDeal(level, random) {
        for (var attempt = 0; attempt < 250; attempt++) {
            var cards = shuffle(buildCards(level), random);
            // A staircase, as the board is dealt: 4, 5, 6, 7 for rows = 4.
            var depths = [level.rows, level.rows + 1, level.rows + 2, level.rows + 3];
            var tableau = [];
            var i;
            for (i = 0; i < COLUMNS; i++) {
                tableau.push([]);
                for (var n = 0; n < depths[i]; n++) {
                    var card = cards.pop();
                    card.faceUp = n === depths[i] - 1;   // only the card on top shows
                    tableau[i].push(card);
                }
            }
            var plan = simulate(level, tableau, cards, random);
            if (!plan) continue;
            // Deal again rather than hand over a deck that runs one category
            // together; late attempts take what they can get.
            if (attempt < 200 && longestRun(plan.stock) > MAX_RUN) continue;
            return {
                tableau: tableau,
                stock: plan.stock.map(function (card) {
                    card.faceUp = false;
                    return card;
                }).reverse(),                          // drawn from the end
                solution: plan.moves,
                // The dealer never has to turn the pile back, but a player who
                // buries a card does, so the budget funds some of a pass. A big
                // deck would otherwise hand out a fortune in spare moves.
                moveLimit: level.minimal
                    ? plan.moves        // exactly the solution: no room to wander
                    : Math.round(plan.moves * (1 + level.slack)) +
                        Math.min(plan.stock.length, RECYCLE_ALLOWANCE),
                attempts: attempt + 1
            };
        }
        return null;
    }

    /* ------------------------------------------------------------- game flow */

    function newGame(levelIndex) {
        var level = LEVELS[levelIndex];
        var deal = null;
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
        if (to.zone === 'tableau' && crownOf(cards) && cards.length > 1) {
            return 'A capped stack only goes to a slot';
        }
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
        flashLanded(to);
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
        levelEl.textContent = 'Level ' + (state.levelIndex + 1) + ' · ' + state.level.name;
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

    function flashLanded(to) {
        var el = zoneEl(to.zone, to.index);
        if (!el) return;
        el.classList.remove('landed');
        void el.offsetWidth;
        el.classList.add('landed');
        window.setTimeout(function () { el.classList.remove('landed'); }, 480);
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

    function showWin() {
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
            '<li><b>Open a category.</b> A card like <i>Greek 0/3</i> is a category ' +
            'card: drag it into one of the four slots and that category starts ' +
            'collecting. Only four run at once.</li>' +
            '<li><b>Send words home.</b> Drag a word onto its slot. Kappa goes ' +
            'to Greek, Toronto goes to Cities — nothing else is accepted.</li>' +
            '<li><b>Use the columns.</b> Drag a word onto another word of the same ' +
            'category to keep it handy; the whole group then moves in one go. Any ' +
            'card can go on an empty column.</li>' +
            '<li><b>A crowned card closes a stack.</b> Drop one on a stack of its ' +
            'own words and it caps them, marked with a gold lid. Nothing can be ' +
            'added on top after that. Drag the crowned card again and the whole ' +
            'capped stack comes with it — straight to a slot, which is the only ' +
            'place it will go, opening the category and banking every word it ' +
            'carries in one move.</li>' +
            '<li><b>The joker is a card.</b> Take one and it is dealt onto the ' +
            'unplaced pile. Drag it onto any column, whatever is sitting there, ' +
            'and anything can then be stacked on it — which is how you start a ' +
            'stack with nowhere else to put it. It is good for that one stack: ' +
            'lift what you piled on and the joker goes with it.</li>' +
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

        if (!current.moved) {       // a tap is not a move: put the card back
            render();
            return;
        }
        var over = zoneAt(event.clientX, event.clientY);
        if (over && !(over.zone === current.from.zone && over.index === current.from.index)) {
            moveCards(current.from, { zone: over.zone, index: over.index });
        }
        render();
    }

    document.addEventListener('pointerdown', onDragStart);

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
        }
    };

    var firstVisit = false;
    try { firstVisit = window.localStorage.getItem(KEY_PROGRESS) === null; } catch (err) { firstVisit = true; }

    if (!resumeGame()) newGame(Math.min(progress, LEVELS.length - 1));
    if (firstVisit) showHelp();
}());
