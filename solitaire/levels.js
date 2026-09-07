/* Word Solitaire — category data and level definitions.
   Every word belongs to exactly one category within a level, so an
   association is never ambiguous while you are playing.

   Each category also has a category card: the card that opens a foundation
   slot for it. Its size is just the number of words, shown on the card as
   0/3, 0/6 and so on. */

var CATEGORIES = {
    cities:  { name: 'Cities',  color: '#4b8ce8', words: ['Chicago', 'Toronto', 'Nairobi', 'Lisbon', 'Osaka'] },
    rest:    { name: 'Rest',    color: '#7a63d8', words: ['Sleep', 'Rest', 'Chill', 'Relax', 'Nap'] },
    big:     { name: 'Big',     color: '#e07a3f', words: ['Huge', 'Colossal', 'Immense', 'Massive', 'Vast', 'Big'] },
    greek:   { name: 'Greek',   color: '#3aa6a0', words: ['Kappa', 'Sigma', 'Delta'] },
    robots:  { name: 'Robots',  color: '#5f7c8a', words: ['Robovac', 'Android', 'Drone', 'Cyborg', 'Bot', 'Servo'] },
    sticky:  { name: 'Sticky',  color: '#c9a227', words: ['Glue', 'Wax', 'Tape', 'Resin', 'Syrup', 'Honey'] },
    physics: { name: 'Physics', color: '#c2536b', words: ['Velocity', 'Torque', 'Inertia', 'Friction'] },
    fruit:   { name: 'Fruit',   color: '#d9534f', words: ['Mango', 'Papaya', 'Lychee', 'Guava', 'Apricot'] },
    weather: { name: 'Weather', color: '#3f8fd0', words: ['Drizzle', 'Blizzard', 'Monsoon', 'Hail'] },
    music:   { name: 'Music',   color: '#8a5fbf', words: ['Cello', 'Oboe', 'Banjo', 'Sitar'] },
    coffee:  { name: 'Coffee',  color: '#8b5e3c', words: ['Espresso', 'Latte', 'Cortado', 'Ristretto', 'Macchiato'] },
    rivers:  { name: 'Rivers',  color: '#2f9e8f', words: ['Nile', 'Amazon', 'Danube'] },
    dance:   { name: 'Dance',   color: '#d4548c', words: ['Tango', 'Salsa', 'Waltz', 'Samba'] },
    boats:   { name: 'Boats',   color: '#4468b8', words: ['Kayak', 'Schooner', 'Ferry', 'Canoe'] },
    planets: { name: 'Planets', color: '#6b6fd8', words: ['Mercury', 'Venus', 'Saturn', 'Neptune'] },
    spices:  { name: 'Spices',  color: '#b8742a', words: ['Cumin', 'Saffron', 'Paprika', 'Nutmeg', 'Clove'] },
    birds:   { name: 'Birds',   color: '#39916b', words: ['Falcon', 'Heron', 'Puffin', 'Magpie'] },
    fabrics: { name: 'Fabrics', color: '#a0577f', words: ['Denim', 'Velvet', 'Linen', 'Tweed'] },
    geology: { name: 'Geology', color: '#7a6a52', words: ['Magma', 'Basalt', 'Caldera', 'Geyser'] }
};

/* rows  — cards dealt into each of the four tableau columns; everything
           left over becomes the stock you draw from
   slack — spare moves on top of the solution the dealer worked out, as a
           fraction of it */
var LEVELS = [
    { name: 'Warm Up',     cats: ['greek', 'rest', 'cities', 'fruit'],                                     rows: 3, slack: 0.50 },
    { name: 'Draw Pile',   cats: ['robots', 'sticky', 'coffee', 'weather', 'dance'],                       rows: 4, slack: 0.45 },
    { name: 'Four Slots',  cats: ['greek', 'planets', 'birds', 'boats', 'fabrics', 'big'],                 rows: 4, slack: 0.40 },
    { name: 'Deep Stacks', cats: ['rivers', 'spices', 'fabrics', 'music', 'geology', 'birds'],             rows: 4, slack: 0.35 },
    { name: 'Tight Board', cats: ['big', 'robots', 'coffee', 'dance', 'planets', 'physics'],               rows: 5, slack: 0.32 },
    { name: 'Full Table',  cats: ['cities', 'weather', 'sticky', 'fruit', 'music', 'boats', 'spices', 'greek'], rows: 5, slack: 0.30 }
];
