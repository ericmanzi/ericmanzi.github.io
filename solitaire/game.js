/* Word Solitaire — game engine and UI.
   No backend: the board lives in memory, coins and level progress in
   localStorage. Depends on CATEGORIES and LEVELS from levels.js. */

(function () {
    'use strict';

    var COSTS = { hint: 1100, undo: 600, wild: 2250 };
    var START_COINS = 2303;
    var REWARD_CATEGORY = 150;
    var REWARD_LEVEL = 400;
    var REWARD_PER_MOVE = 25;
    var KEY_COINS = 'wordSolitaire.coins';
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

    var coins = readNumber(KEY_COINS, START_COINS);
    var progress = readNumber(KEY_PROGRESS, 0);
    var state = null;

    /* ------------------------------------------------------------ card help */

    function categoryOf(card) { return CATEGORIES[card.cat]; }

    /* The cards a tap picks up: the run of same-category face-up cards at the
       top of a column. Everything the game does keys off this one idea. */
    function topRun(column, ignoreFacing) {
        if (!column.length) return [];
        var last = column[column.length - 1];
        if (!last.faceUp && !ignoreFacing) return [];
        var run = [];
        for (var i = column.length - 1; i >= 0; i--) {
            var card = column[i];
            if (card.cat !== last.cat) break;
            if (!card.faceUp && !ignoreFacing) break;
            run.unshift(card);
        }
        return run;
    }

    function canPlace(run, column, wild) {
        if (!run.length) return false;
        if (!column.length) return true;
        if (wild) return true;
        var top = column[column.length - 1];
        return top.faceUp && top.cat === run[0].cat;
    }

    function flipTop(column) {
        if (column.length) column[column.length - 1].faceUp = true;
    }

    function cardsLeft() {
        return state.columns.reduce(function (total, column) { return total + column.length; }, 0);
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

    function pickIndex(list, random, ok) {
        var candidates = [];
        for (var i = 0; i < list.length; i++) if (ok(list[i], i)) candidates.push(i);
        if (!candidates.length) return -1;
        return candidates[Math.floor(random() * candidates.length)];
    }

    /* Deal by playing a solved board backwards: start with every category
       stacked in its own column, then repeatedly lift part of a group and
       drop it elsewhere. Each of those is the exact inverse of a legal move,
       so replaying them in reverse always solves the deal. */
    function scramble(columns, count, maxHeight, random) {
        var applied = 0;
        var guard = 0;
        while (applied < count && guard < count * 80) {
            guard++;
            var from = pickIndex(columns, random, function (column) { return column.length > 0; });
            if (from < 0) break;
            var run = topRun(columns[from], true);
            var take = 1 + Math.floor(random() * run.length);
            var to = pickIndex(columns, random, function (column, i) {
                return i !== from && column.length + take <= maxHeight;
            });
            if (to < 0) continue;
            // Sliding a whole column into an empty one changes nothing.
            if (columns[from].length === take && !columns[to].length) continue;
            columns[to] = columns[to].concat(columns[from].splice(columns[from].length - take, take));
            applied++;
        }
        return applied;
    }

    function hasCompleteColumn(columns) {
        return columns.some(function (column) {
            var run = topRun(column, true);
            return run.length && run.length === categoryOf(run[0]).words.length;
        });
    }

    function freshLayout(level) {
        var columns = [];
        for (var i = 0; i < level.columns; i++) columns.push([]);
        level.cats.forEach(function (catId, index) {
            columns[index] = CATEGORIES[catId].words.map(function (word, n) {
                return { id: catId + '-' + n, word: word, cat: catId, faceUp: true };
            });
        });
        return columns;
    }

    function buildDeal(level, random) {
        var columns = freshLayout(level);
        // Re-deal rather than shuffling further, so the move budget stays tied
        // to the scramble length: a board that starts with a finished group or
        // with no free column makes for a poor opening.
        for (var attempt = 0; attempt < 60; attempt++) {
            var candidate = freshLayout(level);
            if (scramble(candidate, level.scramble, level.maxHeight, random) < level.scramble) continue;
            if (hasCompleteColumn(candidate)) continue;
            if (!candidate.some(function (column) { return !column.length; })) continue;
            columns = candidate;
            break;
        }

        // Bury everything under a column's top group except the single card
        // right beneath it — enough mystery to matter, enough information to
        // plan with. That card can never share the group's category, since the
        // group above it is already maximal.
        var hidden = 0;
        if (level.hidden) {
            columns.forEach(function (column) {
                var buried = column.length - topRun(column, true).length - 1;
                for (var n = 0; n < buried; n++) {
                    column[n].faceUp = false;
                    hidden++;
                }
            });
        }

        // Replaying the scramble backwards always solves the board; a face-down
        // card can force a group to travel one card at a time, so those are
        // paid for too, plus the level's slack for the player's own detours.
        return {
            columns: columns,
            hidden: hidden,
            moveLimit: level.scramble + hidden + level.slack
        };
    }

    /* ------------------------------------------------------------- game flow */

    function newGame(levelIndex) {
        var level = LEVELS[levelIndex];
        var deal = buildDeal(level, mulberry32((Math.random() * 4294967296) >>> 0));
        state = {
            levelIndex: levelIndex,
            level: level,
            columns: deal.columns,
            moves: deal.moveLimit,
            moveLimit: deal.moveLimit,
            collected: [],
            selection: null,
            history: [],
            wild: false,
            earned: 0,
            over: null
        };
        closeOverlay();
        render();
    }

    function snapshot() {
        state.history.push({
            columns: JSON.parse(JSON.stringify(state.columns)),
            collected: state.collected.slice(),
            moves: state.moves
        });
        if (state.history.length > 200) state.history.shift();
    }

    function onColumn(index) {
        if (state.over) return;
        clearHints();
        if (state.selection === null) {
            if (!topRun(state.columns[index]).length) {
                toast(state.columns[index].length ? 'That card is still face down.' : 'That column is empty.');
                return;
            }
            state.selection = index;
            render();
            return;
        }
        if (state.selection === index) {
            state.selection = null;
            render();
            return;
        }
        tryMove(state.selection, index);
    }

    function tryMove(from, to) {
        var run = topRun(state.columns[from]);
        var wild = state.wild;
        if (!canPlace(run, state.columns[to], wild)) {
            toast('You can only stack words from the same category.');
            shake(to);
            return;
        }
        snapshot();
        var moved = state.columns[from].splice(state.columns[from].length - run.length, run.length);
        state.columns[to] = state.columns[to].concat(moved);
        flipTop(state.columns[from]);
        state.moves--;
        state.selection = null;
        if (wild) state.wild = false;
        resolveCompletions();
        render();
        checkEnd();
    }

    /* A column holding every word of a category locks the group in and
       clears it off the board. */
    function resolveCompletions() {
        var again = true;
        while (again) {
            again = false;
            state.columns.forEach(function (column) {
                var run = topRun(column);
                if (!run.length || run.length !== categoryOf(run[0]).words.length) return;
                column.splice(column.length - run.length, run.length);
                state.collected.push(run[0].cat);
                flipTop(column);
                addCoins(REWARD_CATEGORY);
                state.earned += REWARD_CATEGORY;
                toast(categoryOf(run[0]).name + ' complete  +' + REWARD_CATEGORY);
                again = true;
            });
        }
    }

    function legalMoves() {
        var moves = [];
        state.columns.forEach(function (column, from) {
            var run = topRun(column);
            if (!run.length) return;
            state.columns.forEach(function (target, to) {
                if (to === from) return;
                if (!canPlace(run, target, false)) return;
                // Shuffling a whole column into an empty one is not progress.
                if (!target.length && column.length === run.length) return;
                moves.push({ from: from, to: to, run: run, target: target });
            });
        });
        return moves;
    }

    function scoreMove(move) {
        var size = categoryOf(move.run[0]).words.length;
        var score = 0;
        if (move.target.length && move.target.length + move.run.length === size) score += 100;
        if (move.target.length) score += 40 + move.run.length;
        if (state.columns[move.from].length === move.run.length) score += 20;
        return score;
    }

    function checkEnd() {
        if (state.over) return;
        if (!cardsLeft()) {
            var bonus = REWARD_LEVEL + state.moves * REWARD_PER_MOVE;
            addCoins(bonus);
            state.earned += bonus;
            state.over = 'win';
            if (state.levelIndex + 1 > progress) {
                progress = state.levelIndex + 1;
                writeNumber(KEY_PROGRESS, progress);
            }
            render();
            showWin(bonus);
            return;
        }
        if (state.moves <= 0) {
            state.over = 'lose';
            render();
            showLose();
            return;
        }
        if (!legalMoves().length) showStuck();
    }

    /* -------------------------------------------------------------- power-ups */

    function addCoins(amount) {
        coins += amount;
        writeNumber(KEY_COINS, coins);
    }

    function spend(cost) {
        if (coins < cost) {
            toast('Not enough coins for that.');
            return false;
        }
        addCoins(-cost);
        return true;
    }

    function useHint() {
        if (state.over) return;
        var moves = legalMoves();
        if (!moves.length) {
            toast('No legal move on the board — try a joker or restart.');
            return;
        }
        if (!spend(COSTS.hint)) return;
        var best = moves.reduce(function (a, b) { return scoreMove(b) > scoreMove(a) ? b : a; });
        state.selection = null;
        render();
        highlight(best.from, 'hint-from');
        highlight(best.to, 'hint-to');
    }

    function useUndo() {
        if (!state.history.length) {
            toast('Nothing to undo yet.');
            return;
        }
        if (!spend(COSTS.undo)) return;
        var previous = state.history.pop();
        state.columns = previous.columns;
        state.collected = previous.collected;
        state.moves = previous.moves;
        state.selection = null;
        state.over = null;
        closeOverlay();
        render();
    }

    function useWild() {
        if (state.over) return;
        if (state.wild) {            // tapping again cancels and refunds
            state.wild = false;
            addCoins(COSTS.wild);
            toast('Joker put back. Coins refunded.');
            render();
            return;
        }
        if (!spend(COSTS.wild)) return;
        state.wild = true;
        toast('Joker ready — your next group can start a stack anywhere.');
        render();
    }

    /* ---------------------------------------------------------------- render */

    var boardEl = document.getElementById('board');
    var trayEl = document.getElementById('tray');
    var movesEl = document.getElementById('moves');
    var coinsEl = document.getElementById('coins');
    var earnedEl = document.getElementById('earned');
    var dotsEl = document.getElementById('dots');
    var levelEl = document.getElementById('level-name');
    var toastEl = document.getElementById('toast');
    var overlayEl = document.getElementById('overlay');
    var panelEl = document.getElementById('panel');

    function render() {
        renderHeader();
        renderTray();
        renderBoard();
        renderTools();
    }

    function renderHeader() {
        coinsEl.textContent = coins;
        movesEl.textContent = state ? state.moves : '—';
        movesEl.classList.toggle('low', !!state && state.moves <= 5);
        levelEl.textContent = state ? 'Level ' + (state.levelIndex + 1) + ' · ' + state.level.name : '';
        earnedEl.textContent = state && state.earned ? '+' + state.earned : '';
        earnedEl.classList.toggle('show', !!(state && state.earned));

        var dots = '';
        for (var i = 0; i < LEVELS.length; i++) {
            var cls = 'dot';
            if (i < progress) cls += ' done';
            if (state && i === state.levelIndex) cls += ' current';
            dots += '<span class="' + cls + '">' + (i < progress ? '&#10003;' : '') + '</span>';
        }
        dotsEl.innerHTML = dots;
    }

    function renderTray() {
        var html = '';
        state.level.cats.forEach(function (catId) {
            var category = CATEGORIES[catId];
            if (state.collected.indexOf(catId) >= 0) {
                html += '<div class="done-card" style="border-color:' + category.color + '">' +
                    '<span class="crown">&#9819;</span>' + category.name + '</div>';
            } else {
                html += '<div class="done-slot"><span>&#9819;</span></div>';
            }
        });
        trayEl.innerHTML = html;
    }

    function renderBoard() {
        var html = '';
        state.columns.forEach(function (column, index) {
            var run = topRun(column);
            var selected = state.selection === index;
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

                var category = CATEGORIES[card.cat];
                var inRun = selected && position >= column.length - run.length;
                var isTop = position === column.length - 1;
                var classes = 'card' + (inRun ? ' picked' : '');
                // A group of two or more has given its category away, so name it
                // on the card along with how much of the set is together.
                var badge = '';
                if (isTop && run.length > 1) {
                    badge = '<span class="tag" style="background:' + category.color + '"><i>' +
                        category.name + '</i><b>' + run.length + '/' + category.words.length + '</b></span>';
                } else if (isTop && run.length) {
                    badge = '<span class="count">' + run.length + '/' + category.words.length + '</span>';
                }
                var wordClass = 'word' + (card.word.length > 7 ? ' long' : '');
                if (!isTop) classes += ' covered';   // word rides up into the visible sliver
                cards += '<div class="' + classes + '" style="top:' + offset + '">' + badge +
                    '<span class="' + wordClass + '">' + card.word + '</span></div>';
            });

            if (!column.length) {
                cards = '<div class="slot"><span>&#9819;</span></div>';
            }

            var height = column.length
                ? 'calc(var(--card-h) + var(--fd) * ' + lastFd + ' + var(--fu) * ' + lastFu + ')'
                : 'var(--card-h)';

            html += '<div class="col' + (selected ? ' selected' : '') + '" data-index="' + index +
                '" style="min-height:' + height + '">' + cards + '</div>';
        });
        boardEl.innerHTML = html;
    }

    function renderTools() {
        document.getElementById('tool-wild').classList.toggle('armed', !!state && state.wild);
    }

    /* ------------------------------------------------------------- feedback */

    var toastTimer = null;
    function toast(message) {
        toastEl.textContent = message;
        toastEl.classList.add('show');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
    }

    function columnEl(index) {
        return boardEl.querySelector('[data-index="' + index + '"]');
    }

    function shake(index) {
        var el = columnEl(index);
        if (!el) return;
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
    }

    function highlight(index, cls) {
        var el = columnEl(index);
        if (!el) return;
        el.classList.add(cls);
        window.setTimeout(function () { el.classList.remove(cls); }, 3000);
    }

    function clearHints() {
        Array.prototype.forEach.call(boardEl.querySelectorAll('.hint-from, .hint-to'), function (el) {
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

    function showWin(bonus) {
        openOverlay(
            '<h2>Board cleared</h2>' +
            '<p>Every word grouped with ' + state.moves + ' move' + (state.moves === 1 ? '' : 's') + ' to spare.</p>' +
            '<p class="reward"><span class="coin">&#9819;</span> +' + bonus + '</p>' +
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
            '<p>' + cardsLeft() + ' card' + (cardsLeft() === 1 ? '' : 's') + ' left on the table. ' +
            'Undo costs coins but keeps the board alive.</p>' +
            '<button class="btn primary" data-action="replay">Try again</button>' +
            '<button class="btn" data-action="undo">Undo last move &nbsp;&#9819; ' + COSTS.undo + '</button>' +
            '<button class="btn ghost" data-action="menu">Menu</button>'
        );
    }

    function showStuck() {
        openOverlay(
            '<h2>No moves left</h2>' +
            '<p>Nothing on the board can be stacked. A joker starts a new stack ' +
            'anywhere, or you can take a move back.</p>' +
            '<button class="btn primary" data-action="wild">Joker &nbsp;&#9819; ' + COSTS.wild + '</button>' +
            '<button class="btn" data-action="undo">Undo &nbsp;&#9819; ' + COSTS.undo + '</button>' +
            '<button class="btn ghost" data-action="replay">Restart level</button>'
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
            '<p>Stack a word on another word from the same category. Fill a category ' +
            'and the whole group locks in and clears the column.</p>' +
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
            '<li>Tap a column to pick up the group of same-category cards on top of it.</li>' +
            '<li>Tap another column to drop them. A drop is legal only on an empty ' +
            'column or on a card from the same category.</li>' +
            '<li>Once every word of a category sits in one column the group locks in, ' +
            'clears, and pays out coins.</li>' +
            '<li>Uncovering a face-down card turns it over for free. Every drop costs ' +
            'one move — clear the board before the counter runs out.</li>' +
            '<li>Stuck? A hint points at the best move, undo takes one back, and the ' +
            'joker lets a group start a stack anywhere.</li>' +
            '</ul>' +
            '<button class="btn primary" data-action="close">Got it</button>'
        );
    }

    /* --------------------------------------------------------------- events */

    boardEl.addEventListener('click', function (event) {
        var col = event.target.closest('.col');
        if (col) onColumn(parseInt(col.getAttribute('data-index'), 10));
    });

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
        if (event.key === 'Escape') {
            if (overlayEl.classList.contains('show')) {
                if (!state.over) closeOverlay();
            } else if (state.selection !== null) {
                state.selection = null;
                render();
            }
        }
    });

    /* Small hook for the browser console and for automated checks. */
    window.WordSolitaire = {
        state: function () { return state; },
        newGame: newGame,
        tapColumn: onColumn,
        deal: function (levelIndex) {
            return buildDeal(LEVELS[levelIndex], mulberry32((Math.random() * 4294967296) >>> 0));
        }
    };

    var firstVisit = false;
    try { firstVisit = window.localStorage.getItem(KEY_PROGRESS) === null; } catch (err) { firstVisit = true; }

    newGame(Math.min(progress, LEVELS.length - 1));
    if (firstVisit) showHelp();
}());
