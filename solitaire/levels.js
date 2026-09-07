/* Word Solitaire — category data and level definitions.
   Every word belongs to exactly one category within a level, so an
   association is never ambiguous while you are playing. */

var CATEGORIES = {
    cities:  { name: 'Cities',      color: '#4b8ce8', words: ['Chicago', 'Toronto', 'Nairobi', 'Lisbon', 'Osaka'] },
    rest:    { name: 'Rest',        color: '#7a63d8', words: ['Sleep', 'Rest', 'Chill', 'Relax', 'Nap'] },
    big:     { name: 'Big',         color: '#e07a3f', words: ['Huge', 'Colossal', 'Immense', 'Massive', 'Vast', 'Big'] },
    greek:   { name: 'Greek',       color: '#3aa6a0', words: ['Kappa', 'Sigma', 'Delta', 'Omega', 'Theta'] },
    robots:  { name: 'Robots',      color: '#5f7c8a', words: ['Robovac', 'Android', 'Drone', 'Cyborg', 'Bot'] },
    sticky:  { name: 'Sticky',      color: '#c9a227', words: ['Glue', 'Wax', 'Tape', 'Resin', 'Syrup'] },
    physics: { name: 'Physics',     color: '#c2536b', words: ['Velocity', 'Dynamics', 'Torque', 'Inertia', 'Friction'] },
    fruit:   { name: 'Fruit',       color: '#d9534f', words: ['Mango', 'Papaya', 'Lychee', 'Guava', 'Apricot'] },
    weather: { name: 'Weather',     color: '#3f8fd0', words: ['Drizzle', 'Blizzard', 'Monsoon', 'Hail', 'Breeze'] },
    music:   { name: 'Music',       color: '#8a5fbf', words: ['Cello', 'Oboe', 'Banjo', 'Timpani', 'Sitar'] },
    coffee:  { name: 'Coffee',      color: '#8b5e3c', words: ['Espresso', 'Latte', 'Cortado', 'Ristretto', 'Macchiato'] },
    rivers:  { name: 'Rivers',      color: '#2f9e8f', words: ['Nile', 'Amazon', 'Danube', 'Congo', 'Mekong'] },
    dance:   { name: 'Dance',       color: '#d4548c', words: ['Tango', 'Salsa', 'Waltz', 'Samba', 'Ballet'] },
    boats:   { name: 'Boats',       color: '#4468b8', words: ['Kayak', 'Schooner', 'Ferry', 'Canoe', 'Yacht'] },
    planets: { name: 'Planets',     color: '#6b6fd8', words: ['Mercury', 'Venus', 'Saturn', 'Neptune', 'Mars'] },
    spices:  { name: 'Spices',      color: '#b8742a', words: ['Cumin', 'Saffron', 'Paprika', 'Nutmeg', 'Clove'] },
    birds:   { name: 'Birds',       color: '#39916b', words: ['Falcon', 'Heron', 'Puffin', 'Magpie', 'Toucan'] },
    fabrics: { name: 'Fabrics',     color: '#a0577f', words: ['Denim', 'Velvet', 'Linen', 'Tweed', 'Satin'] },
    geology: { name: 'Geology',     color: '#7a6a52', words: ['Magma', 'Basalt', 'Caldera', 'Geyser', 'Obsidian'] }
};

/* columns   — slots on the board (rendered 4 across)
   maxHeight — tallest column the dealer will build
   scramble  — how many shuffles the dealer works backwards from a solved
               board, so every deal is guaranteed to have a solution
   slack     — spare moves on top of the shortest known solution
   hidden    — whether cards buried under a group are dealt face down */
var LEVELS = [
    { name: 'Warm Up',      cats: ['cities', 'rest', 'fruit', 'big'],                              columns: 8, maxHeight: 5, scramble: 10, slack: 10, hidden: false },
    { name: 'Face Down',    cats: ['robots', 'sticky', 'coffee', 'weather', 'dance'],              columns: 8, maxHeight: 5, scramble: 14, slack: 16, hidden: true },
    { name: 'Crosswinds',   cats: ['greek', 'planets', 'birds', 'boats', 'fabrics'],               columns: 8, maxHeight: 6, scramble: 17, slack: 14, hidden: true },
    { name: 'Deep Stacks',  cats: ['rivers', 'spices', 'fabrics', 'music', 'geology', 'birds'],    columns: 8, maxHeight: 6, scramble: 20, slack: 14, hidden: true },
    { name: 'Tight Board',  cats: ['big', 'robots', 'coffee', 'dance', 'planets', 'physics'],      columns: 8, maxHeight: 6, scramble: 23, slack: 12, hidden: true },
    { name: 'Full Table',   cats: ['cities', 'weather', 'sticky', 'fruit', 'music', 'boats', 'spices'], columns: 8, maxHeight: 7, scramble: 26, slack: 12, hidden: true }
];
