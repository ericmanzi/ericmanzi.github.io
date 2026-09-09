/* Word Solitaire — game engine and UI.
   No backend: the board lives in memory, coins and level progress in
   localStorage. Depends on CATEGORIES and LEVELS from levels.js.

   The board has four zones. The stock deals face-up cards into the row
   beside it; that row is your holding space, a few slots wide. Four
   foundation slots each hold one category, opened by that category's card
   and filled with its words. The four tableau columns are working space:
   words of one category stack on each other there and travel as a group. */

(function () {
    'use strict';

    var LIMITS = { hint: 3, undo: 5, wild: 1 };   // per level, refilled on a new deal
    var ROW_SLOTS = 3;          // the row the deck deals into
    var SLOTS = 4;              // foundation slots
    var COLUMNS = 4;            // tableau columns
    var KEY_PROGRESS = 'wordSolitaire.progress';

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

    /* ----------------------------------------------------------- card rules */

    function catSize(catId) { return CATEGORIES[catId].words.length; }

    /* What dragging a column picks up: the face-up run of same-category word
       cards on top of it, or a single category card. */
    function topRun(column) {
        if (!column.length) return [];
        var last = column[column.length - 1];
        if (!last.faceUp) return [];
        if (last.kind === 'cat') return [last];
        var run = [];
        for (var i = column.length - 1; i >= 0; i--) {
            var card = column[i];
            if (!card.faceUp || card.kind !== 'word' || card.cat !== last.cat) break;
            run.unshift(card);
        }
        return run;
    }

    function slotOf(catId) {
        for (var i = 0; i < state.foundations.length; i++) {
            if (state.foundations[i] && state.foundations[i].cat === catId) return i;
        }
        return -1;
    }

    function canPlaceOnFoundation(cards, index) {
        var pile = state.foundations[index];
        var card = cards[0];
        if (card.kind === 'cat') {
            return cards.length === 1 && !pile && slotOf(card.cat) < 0 &&
                state.completed.indexOf(card.cat) < 0;
        }
        return !!pile && pile.cat === card.cat && pile.cards.length + cards.length <= catSize(pile.cat);
    }

    function canPlaceOnColumn(cards, index, wild) {
        var column = state.tableau[index];
        if (!column.length) return true;
        var top = column[column.length - 1];
        if (!top.faceUp) return false;
        if (wild) return true;
        return top.kind === 'word' && cards[0].kind === 'word' && top.cat === cards[0].cat;
    }

    function flipTop(column) {
        if (column.length) column[column.length - 1].faceUp = true;
    }

    function cardsLeft() {
        var total = state.stock.length + state.row.length;
        state.tableau.forEach(function (column) { total += column.length; });
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

    function simulate(level, layout, pool) {
        var tableau = layout.map(function (column) { return column.map(cloneCard); });
        var row = [];
        var piles = [];
        var open = {};
        var finished = {};
        var stock = [];
        var left = pool.map(cloneCard);
        var moves = 0;
        var i;

        for (i = 0; i < SLOTS; i++) piles.push(null);

        function freeSlot() { return piles.indexOf(null); }

        function empty() {
            return !left.length && !row.length && tableau.every(function (c) { return !c.length; });
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

        function openCategory(card) {
            var slot = freeSlot();
            piles[slot] = { cat: card.cat, count: 0 };
            open[card.cat] = slot;
            moves++;
        }

        // How many cards of a category are waiting on the board — the dealer
        // opens the category that unblocks the most.
        function pressure(catId) {
            var n = 0;
            tableau.forEach(function (column) {
                column.forEach(function (card) { if (card.cat === catId && card.kind === 'word') n++; });
            });
            row.forEach(function (card) { if (card.cat === catId && card.kind === 'word') n++; });
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
                if (!run.length || run[0].kind !== 'word' || !open.hasOwnProperty(run[0].cat)) continue;
                column.splice(column.length - run.length, run.length);
                flipTop(column);
                collect(run);
                acted = true;
            }
            if (acted) continue;

            // 2. Then from the row the deck deals into.
            for (i = 0; i < row.length && !acted; i++) {
                if (row[i].kind === 'word' && open.hasOwnProperty(row[i].cat)) {
                    collect(row.splice(i, 1));
                    acted = true;
                }
            }
            if (acted) continue;

            // 3. Open a category with a card that is already in reach.
            if (freeSlot() >= 0) {
                for (t = 0; t < tableau.length && !acted; t++) {
                    var col = tableau[t];
                    if (!col.length) continue;
                    card = col[col.length - 1];
                    if (card.kind === 'cat' && !finished[card.cat] && !open.hasOwnProperty(card.cat)) {
                        col.pop();
                        flipTop(col);
                        openCategory(card);
                        acted = true;
                    }
                }
                for (i = 0; i < row.length && !acted; i++) {
                    card = row[i];
                    if (card.kind === 'cat' && !finished[card.cat] && !open.hasOwnProperty(card.cat)) {
                        row.splice(i, 1);
                        openCategory(card);
                        acted = true;
                    }
                }
                if (acted) continue;
            }

            // 4. Draw. The dealer picks a card the player can use right now.
            if (left.length && row.length < ROW_SLOTS) {
                var pick = -1;
                for (i = 0; i < left.length; i++) {
                    if (left[i].kind === 'word' && open.hasOwnProperty(left[i].cat)) { pick = i; break; }
                }
                if (pick < 0 && freeSlot() >= 0) {
                    var best = -1;
                    for (i = 0; i < left.length; i++) {
                        if (left[i].kind !== 'cat' || finished[left[i].cat] || open.hasOwnProperty(left[i].cat)) continue;
                        var score = pressure(left[i].cat);
                        if (score > best) { best = score; pick = i; }
                    }
                }
                if (pick < 0) pick = 0;
                card = left.splice(pick, 1)[0];
                card.faceUp = true;
                stock.push(card);
                row.push(card);
                moves++;
                continue;
            }

            // 5. Unload the row onto a column of the same category.
            for (i = 0; i < row.length && !acted; i++) {
                if (row[i].kind !== 'word') continue;
                for (t = 0; t < tableau.length && !acted; t++) {
                    var head = tableau[t].length ? tableau[t][tableau[t].length - 1] : null;
                    if (!head || !head.faceUp || head.kind !== 'word' || head.cat !== row[i].cat) continue;
                    tableau[t].push(row.splice(i, 1)[0]);
                    moves++;
                    acted = true;
                }
            }
            if (acted) continue;

            // 6. Dig: move a run onto a matching column to uncover what is under it.
            for (t = 0; t < tableau.length && !acted; t++) {
                var dig = topRunOf(tableau[t]);
                if (!dig.length || dig.length === tableau[t].length || dig[0].kind !== 'word') continue;
                for (var d = 0; d < tableau.length && !acted; d++) {
                    if (d === t) continue;
                    var onto = tableau[d];
                    if (!onto.length) continue;
                    var lid = onto[onto.length - 1];
                    if (!lid.faceUp || lid.kind !== 'word' || lid.cat !== dig[0].cat) continue;
                    tableau[t].splice(tableau[t].length - dig.length, dig.length);
                    flipTop(tableau[t]);
                    tableau[d] = onto.concat(dig);
                    moves++;
                    acted = true;
                }
            }
            if (acted) continue;

            // 7. Last resort: an empty column will take anything.
            for (i = 0; i < row.length && !acted; i++) {
                for (t = 0; t < tableau.length && !acted; t++) {
                    if (tableau[t].length) continue;
                    tableau[t].push(row.splice(i, 1)[0]);
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
        if (last.kind === 'cat') return [last];
        var run = [];
        for (var i = column.length - 1; i >= 0; i--) {
            var card = column[i];
            if (!card.faceUp || card.kind !== 'word' || card.cat !== last.cat) break;
            run.unshift(card);
        }
        return run;
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
            var plan = simulate(level, tableau, cards);
            if (!plan) continue;
            return {
                tableau: tableau,
                stock: plan.stock.map(function (card) {
                    card.faceUp = false;
                    return card;
                }).reverse(),                          // drawn from the end
                solution: plan.moves,
                moveLimit: Math.round(plan.moves * (1 + level.slack)),
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
            row: [],
            foundations: foundations,
            tableau: deal.tableau,
            completed: [],
            moves: deal.moveLimit,
            moveLimit: deal.moveLimit,
            solution: deal.solution,
            history: [],
            tools: { hint: LIMITS.hint, undo: LIMITS.undo, wild: LIMITS.wild },
            wild: false,
            over: null
        };
        closeOverlay();
        render();
    }

    function snapshot() {
        state.history.push(JSON.parse(JSON.stringify({
            stock: state.stock,
            row: state.row,
            foundations: state.foundations,
            tableau: state.tableau,
            completed: state.completed,
            moves: state.moves
        })));
        if (state.history.length > 250) state.history.shift();
    }

    function drawCard() {
        if (state.over) return;
        if (!state.stock.length) {
            toast('The deck is empty.');
            return;
        }
        if (state.row.length >= ROW_SLOTS) {
            toast('No room in the row — place a card first.');
            return;
        }
        snapshot();
        var card = state.stock.pop();
        card.faceUp = true;
        state.row.push(card);
        state.moves--;
        render();
        checkEnd();
    }

    function pickable(zone, index) {
        if (zone === 'tableau') return state.tableau[index] ? topRun(state.tableau[index]) : [];
        if (zone === 'row') return state.row[index] ? [state.row[index]] : [];
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
        return state.row.splice(from.index, 1);
    }

    function destinations() {
        var list = [];
        var i;
        for (i = 0; i < SLOTS; i++) list.push({ zone: 'foundation', index: i });
        for (i = 0; i < COLUMNS; i++) list.push({ zone: 'tableau', index: i });
        return list;
    }

    function canDrop(cards, to, wild) {
        if (!cards.length) return false;
        if (to.zone === 'foundation') {
            return to.index < state.foundations.length && canPlaceOnFoundation(cards, to.index);
        }
        if (to.zone === 'tableau') return state.tableau[to.index] ? canPlaceOnColumn(cards, to.index, wild) : false;
        return false;               // the row only ever fills from the deck
    }

    function rejection(cards, to) {
        if (to.zone === 'row') return 'The row only takes cards dealt from the deck.';
        if (to.zone === 'foundation') {
            var pile = state.foundations[to.index];
            if (!pile) return 'Only a crowned category card can open a slot.';
            if (cards[0].kind === 'cat') return 'That slot is already taken.';
        }
        return 'You can only stack words from the same category.';
    }

    function moveCards(from, to) {
        if (state.over) return false;
        var cards = pickable(from.zone, from.index);
        if (!cards.length) return false;
        if (from.zone === to.zone && from.index === to.index) return false;
        if (!canDrop(cards, to, state.wild)) {
            toast(rejection(cards, to));
            shake(to.zone, to.index);
            return false;
        }
        var neededWild = to.zone === 'tableau' && !canPlaceOnColumn(cards, to.index, false);
        snapshot();
        var moved = take(from);
        if (to.zone === 'foundation') {
            if (moved[0].kind === 'cat') {
                state.foundations[to.index] = { cat: moved[0].cat, cards: [] };
            } else {
                state.foundations[to.index].cards = state.foundations[to.index].cards.concat(moved);
            }
        } else {
            state.tableau[to.index] = state.tableau[to.index].concat(moved);
        }
        if (neededWild) state.wild = false;
        state.moves--;
        resolveCompletions();
        render();
        checkEnd();
        return true;
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
        state.row.forEach(function (card, index) {
            list.push({ zone: 'row', index: index, cards: [card] });
        });
        return list;
    }

    function legalMoves() {
        var moves = [];
        sources().forEach(function (from) {
            destinations().forEach(function (to) {
                if (from.zone === to.zone && from.index === to.index) return;
                if (!canDrop(from.cards, to, false)) return;
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
        score = 40 + cards.length;
        if (move.from.zone === 'row') score += 10;                        // frees a slot
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
        var canDraw = state.stock.length && state.row.length < ROW_SLOTS;
        if (!canDraw && !legalMoves().length) showStuck();
    }

    /* -------------------------------------------------------------- power-ups */

    function useHint() {
        if (state.over) return;
        if (!state.tools.hint) {
            toast('No hints left on this level.');
            return;
        }
        var moves = legalMoves();
        if (!moves.length) {
            toast(state.stock.length ? 'Nothing to place — draw a card.' : 'No legal move left.');
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
            toast('Nothing to undo yet.');
            return;
        }
        if (!state.tools.undo) {
            toast('No undos left on this level.');
            return;
        }
        state.tools.undo--;
        var previous = state.history.pop();
        state.stock = previous.stock;
        state.row = previous.row;
        state.foundations = previous.foundations;
        state.tableau = previous.tableau;
        state.completed = previous.completed;
        state.moves = previous.moves;
        state.over = null;
        closeOverlay();
        render();
    }

    function useWild() {
        if (state.over) return;
        if (state.wild) {                       // putting it away hands it back
            state.wild = false;
            state.tools.wild++;
            toast('Joker put away.');
            render();
            return;
        }
        if (!state.tools.wild) {
            toast('No jokers left on this level.');
            return;
        }
        state.tools.wild--;
        state.wild = true;
        toast('Joker ready — your next group can start a column anywhere.');
        render();
    }

    /* ---------------------------------------------------------------- render */

    var boardEl = document.getElementById('board');
    var rowEl = document.getElementById('row');
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
        if (card.kind === 'cat') {
            inner += '<span class="crown">&#9819;</span>' +
                '<span class="count">0/' + catSize(card.cat) + '</span>';
        }
        inner += '<span class="word' + (card.word.length > 7 ? ' long' : '') + '">' + card.word + '</span>';
        return '<div class="' + classes + '"' + style + '>' + inner + '</div>';
    }

    function render() {
        renderHeader();
        renderRow();
        renderFoundations();
        renderTableau();
        renderTools();
    }

    function renderTools() {
        ['hint', 'undo', 'wild'].forEach(function (tool) {
            var button = document.getElementById('tool-' + tool);
            var left = state.tools[tool];
            button.querySelector('.badge').textContent = left;
            button.classList.toggle('spent', !left);
        });
        document.getElementById('tool-wild').classList.toggle('armed', state.wild);
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

    function renderRow() {
        // Cards dealt from the deck sit beside it. There are no empty slots to
        // show: until the deck deals, that space is simply table.
        var html = '';
        state.row.forEach(function (card, i) {
            html += '<div class="rowslot" data-zone="row" data-index="' + i + '">' +
                cardFace(card) + '</div>';
        });
        rowEl.innerHTML = html;
        stockEl.innerHTML = state.stock.length
            ? '<div class="card facedown"><span class="stockcount">' + state.stock.length + '</span></div>'
            : '<div class="hole empty-stock"></div>';
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
            html += '<div class="col" data-zone="tableau" data-index="' + index + '" style="min-height:' +
                height + '">' + cards + '</div>';
        });
        boardEl.innerHTML = html;
    }

    /* ------------------------------------------------------------- feedback */

    var toastTimer = null;
    function toast(message) {
        toastEl.textContent = message;
        toastEl.classList.add('show');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
    }

    function zoneEl(zone, index) {
        return document.querySelector('[data-zone="' + zone + '"][data-index="' + index + '"]');
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
            '<p>Nothing can be placed and the row is jammed.' +
            (outs ? ' A joker starts a column anywhere, or you can take a move back.'
                  : ' Nothing left to spend on this one — deal it again.') + '</p>' +
            outs +
            '<button class="btn' + (outs ? ' ghost' : ' primary') + '" data-action="replay">Restart level</button>'
        );
    }

    function showMenu() {
        var levels = LEVELS.map(function (level, i) {
            var locked = i > progress;
            return '<button class="level-btn' + (locked ? ' locked' : '') + '"' +
                (locked ? ' disabled' : ' data-action="goto" data-level="' + i + '"') + '>' +
                '<span class="n">' + (i + 1) + '</span>' + level.name + '</button>';
        }).join('');
        openOverlay(
            '<h2>Word Solitaire</h2>' +
            '<p>Open a category in one of the four slots, then send it every word ' +
            'that belongs to it.</p>' +
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
            '<li><b>Draw when stuck.</b> Tap the deck and it deals a card into the ' +
            'row beside it, which holds three. Nothing can be put back there, so ' +
            'keep that row moving.</li>' +
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

    function markTargets(cards, from) {
        destinations().forEach(function (to) {
            if (from.zone === to.zone && from.index === to.index) return;
            if (!canDrop(cards, to, state.wild)) return;
            var el = zoneEl(to.zone, to.index);
            if (el) el.classList.add('drop-ok');
        });
    }

    function clearTargets() {
        Array.prototype.forEach.call(document.querySelectorAll('.drop-ok, .drop-over'), function (el) {
            el.classList.remove('drop-ok');
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
            if (zone === 'tableau' && state.tableau[index].length) toast('That card is face down.');
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
        markTargets(cards, drag.from);
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
        var over = zoneAt(event.clientX, event.clientY);
        if (over && over.el.classList.contains('drop-ok')) over.el.classList.add('drop-over');
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
    document.getElementById('tool-wild').addEventListener('click', useWild);
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
        if (action === 'wild') { closeOverlay(); useWild(); }
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
        deal: function (levelIndex) {
            return buildDeal(LEVELS[levelIndex], mulberry32((Math.random() * 4294967296) >>> 0));
        }
    };

    var firstVisit = false;
    try { firstVisit = window.localStorage.getItem(KEY_PROGRESS) === null; } catch (err) { firstVisit = true; }

    newGame(Math.min(progress, LEVELS.length - 1));
    if (firstVisit) showHelp();
}());
