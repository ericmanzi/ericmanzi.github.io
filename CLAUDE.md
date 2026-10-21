# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal portfolio website (ericmanzi.github.io) hosted on GitHub Pages. It's a static site containing a simple portfolio landing page, an AI chat interface, and a Bananagrams word game.

## Architecture

### Site Structure
- `index.html` - Main landing page with profile links (LinkedIn, GitHub, Resume, Email)
- `chat/index.html` - AI chat interface using Groq API
- `bananagrams/index.html` - Single-player Bananagrams word game built with React
- `solitaire/` - Word Solitaire: a landing page (`index.html`) and the game itself (`game.html`)
- `nanagrams/` - Support page (`index.html`) and privacy policy (`privacy.html`) for
  the Nanagrams iOS app (repo `ericmanzi/Bananagrams`); App Store Connect links to both,
  so keep the URLs stable and the privacy policy true to what the app and `backend/` do
- `email.html` - Simple contact information page
- `assets/` - Static assets (CSS, content like resume PDF)

### Technology Stack
- Pure HTML/CSS for the landing page
- Vanilla JavaScript for the chat interface
- React 18 (loaded via CDN with Babel standalone) for Bananagrams game
- Bootstrap 4.5 for styling the main landing page
- No build system or package manager

### Chat Application (`chat/index.html`)
- Self-contained single-file application
- Uses Groq API for AI chat functionality
- API key stored in localStorage
- Supports multiple Llama and Mixtral models
- Maintains conversation history in memory
- Note: Contains a hardcoded API key (line 240) - should be removed before deploying to production

### Bananagrams Game (`bananagrams/`)
- Single-player word game implementation
- React component loaded via CDN (no build step)
- Uses local word validation with a hardcoded COMMON_WORDS set
- Implements tap-to-select, tap-to-place tile mechanics
- 15x15 grid with 21 starting tiles
- PEEL and DUMP game mechanics

### Word Solitaire (`solitaire/`)
- `index.html` is a static landing page; `game.html` is the playable game
- Vanilla JS, no framework and no build step: `levels.js` holds the categories
  and level definitions, `game.js` holds the engine and rendering
- Two rows of card slots: four foundation slots above four tableau stacks. The
  stock sits beside the moves ribbon and deals onto the unplaced pile to its
  left, one card per tap with no limit; that space shows nothing until it does.
  Only the top card of the pile is in play, with the next two peeking out
  behind it. With the stock empty, tapping it turns the whole pile back into
  the stock in the same order. A crowned category card (`Praise 0/8`) opens a
  slot; that category's words then collect on it. Only crowned cards open
  slots, and nothing can be placed onto the unplaced pile
- Tableau columns are working space: words of one category stack on each other
  and move as a group. A crowned card may be dropped on a stack of its own
  words, which caps it — a crowned card is a lid, so nothing (not even a joker)
  goes on top until it is moved off. Dragging that crowned card lifts the whole
  capped stack (`topRun` keeps the words under it), and a capped stack is only
  droppable on an empty foundation slot, where the crowned card opens the
  category and its words land on it in the same move. Cards are dealt face
  down except the card on top of each column, in a staircase (rows, rows+1,
  rows+2, rows+3)
- Filling a category clears its slot. Every action costs a move; the level is
  lost when the counter reaches zero with cards still out
- Ten levels, none of them locked — any level can be started from the menu.
  Level 1 (`Far Places`) is geography anyone knows; levels 2-10 are GRE
  vocabulary, each category a plain-English meaning on the crowned card
  (`Praise`, `Stubborn`) and the GRE words that carry it. The original word
  list the user supplied is all there, folded into bigger sets; only virago,
  askance and disenfranchise were left out, for want of a clear synonym set.
  The last two levels each pair categories a player will confuse on purpose:
  `Short-lived` and `Concise` (brief in time, brief in words) on level 9,
  `Impartial` and `Indifferent` (disinterested vs uninterested) on level 10
- Sets run from four words to nine, about six on average, deliberately mixed
  so a board holds long and short sets rather than six of everything. Keep the
  crowned names plain — the hard part should be the words
- No word appears in two categories and no category appears in two levels, so
  nothing repeats as you play. `WordSolitaire.checkLevels()` enforces that,
  along with a category never being named after a card in its own level — run
  it after editing `levels.js`
- Every level needs more cards than its tableau takes (`4 * rows + 6`), or
  there is no stock at all. Depth ramps with difficulty: 4 rows on level 1, 5
  through level 6, 6 after
- The dealer shuffles fairly and then proves the shuffle can be won by playing
  it (`buildDeal`). It used to do the reverse — build the deck by handing over
  only a card the player could use right then — and that showed: the deck came
  in waves of whichever four categories were open, ending with two of them
  taking turns (`e f e f e f`). Do not go back to choosing the order
- After the shuffle, `spreadDeck` breaks up what a fair shuffle throws up and
  the eye reads as unshuffled: no two cards of a category side by side in a
  column or in the stock (a fair shuffle does that about one pair in nine), and
  no two categories taking turns four cards running (`c d c d`, in about a
  quarter of fair decks). Each category then spreads over 60-70% of the stock
- `playThrough` is the proof: a player who sees only what a person sees (column
  tops, the whole pile, the slots, the deck count) and plays greedily — bank,
  open the category with most in reach, keep the pile shallow, dig to turn
  cards over, then deal, and recycle only if the last pass changed something.
  Played plainly it is deterministic; `explore` adds randomness for extra
  playouts. A shuffle no playout wins is thrown away. Its line is recorded in
  the board's own move terms (`deal().line`), and a test must replay that line
  through `move()`/`draw()` and win with exactly `moveLimit - solution` left —
  that is what keeps the dealer's rules and the board's rules from drifting
- The move budget is the best line found times `1 + slack`. Two knobs set
  difficulty: `slack` (0.15 on level 1 down to 0.05 on level 9; level 10 is
  `minimal`, the line plus a flat `extra: 5`) and `tries`, how many playouts the dealer runs
  before taking the shortest (1 on levels 1-3, so plain greedy play always
  gets home with the slack in hand; 12 from level 7, so the obvious move every
  time is not enough). Check a retune by playing the dealer's own policy
  through the real engine (`nextStep()`) while deviating to a random legal move
  a set share of the time — the user asked for hard, and at 10% deviation
  levels 7-9 should still be won most of the time with a handful to spare
- A level can name its budget outright with `moves`, which beats both slack and
  `minimal`. The dealer throws away any deal it cannot win inside the pin, so
  pinning never deals a board that cannot be won; pin one below what the level
  needs and the console says so and that deal falls back to its own line
- A refused move shakes the stack it was aimed at and flashes it red; a move
  that lands flashes the destination green. Both are a tint plus a ring that
  swells and fades on the card itself. The colour holds for the first quarter
  of the half second before it drains, or the eye misses it (`flashZone`).
  `onDragEnd` must redraw the board *before* making the move: redrawing after
  it replaces the very element the move just flashed, which is how drag-and-
  drop once showed no feedback at all while API-driven tests still passed —
  test feedback with real pointer drags. The toast is secondary: a small pill
  in a reserved strip above the tools (`.toastrail`), about a second long, so
  keep its wording to a few words
- The level shows as a number in the top-left corner (`LVL 7`), which leaves
  the height for the board and keeps the tool row clear of the bottom edge
- While a card is being dragged, only the zone under the pointer is marked, and
  the same way whether the drop is legal or not. Marking just the legal targets
  would tell the player which category a card belongs to
- Cards move by drag and drop only (pointer events, so mouse and touch alike).
  A tap or click never moves a card; tapping the stock is the one exception, and
  it deals rather than moves
- Nothing in the game is selectable text. Safari only honours
  `-webkit-user-select` and needs `-webkit-touch-callout: none` too, so both
  sit on `body` beside the unprefixed rule; behind them, a `selectstart`
  listener cancels any selection anywhere in the game
- The board is written to `localStorage` after every change and restored on
  load, so a reload (a pull-to-refresh on a phone, say) resumes the same game
  rather than dealing a new one; the save is cleared when the level ends. The
  keys carry `.v2` because the level list was rebuilt, and a saved board whose
  cards are not all in its level's categories is refused rather than resumed
- The joker is a card, not a mode: taking one deals a `kind: 'joker'` card onto
  the unplaced pile. It can be dropped on any column whatever sits there (a
  crowned lid excepted), and once down, anything stacks on it. It never goes to
  a foundation, is not counted among the cards left to clear, and is swept off
  when the level is won. It is good for one stack: anything placed on a joker
  marks it `used`, and `burnSpentJokers()` removes it as soon as it is uncovered
  again
- No coins. Hint, undo and joker are capped per level (3 / 5 / 1, see `LIMITS`
  in `game.js`) and the allowance refills on a new deal; each button shows what
  is left and greys out when spent. Undo rewinds the move counter too. Only
  level progress is stored, in `localStorage`
- `window.WordSolitaire` exposes `state()`, `newGame(level, deal?)`, `move()`,
  `draw()`, `legalMoves()`, `deal()`, `nextStep()` and `checkLevels()` for
  console poking and automated checks. `newGame` takes a prebuilt deal so a
  test can build a board to order or replay a deal it has already seen

## Development Workflow

Since this is a static GitHub Pages site with no build process:

1. **Local Development**: Open HTML files directly in a browser, or use a simple HTTP server:
   ```bash
   python3 -m http.server 8000
   # or
   npx http-server
   ```

2. **Deployment**: Push to the `master` branch - GitHub Pages automatically serves the site

3. **Pull requests**: Always open a pull request for work pushed to a branch.
   Nothing reaches the live site until it is merged into `master`, so a branch
   without an open PR is work the site will never show.

