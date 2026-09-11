/* Word Solitaire — category data and level definitions.

   Three rules hold across this file, and `checkLevels()` at the bottom
   enforces them in the console:
     - a word belongs to exactly one category, everywhere
     - a category belongs to exactly one level, so nothing repeats as you play
     - a category's name never matches a card in its own level, or the crowned
       card and a word card would read the same

   Each category also has a category card: the crowned card that opens a
   foundation slot for it, showing its name and size as 0/3, 0/6 and so on. */

var CATEGORIES = {
    /* ---- the early levels: plain, unambiguous sets ---- */
    greek:     { name: 'Greek',     color: '#3aa6a0', words: ['Kappa', 'Sigma', 'Delta'] },
    rest:      { name: 'Rest',      color: '#7a63d8', words: ['Sleep', 'Chill', 'Relax', 'Nap', 'Doze'] },
    cities:    { name: 'Cities',    color: '#4b8ce8', words: ['Chicago', 'Toronto', 'Nairobi', 'Lisbon', 'Osaka'] },
    fruit:     { name: 'Fruit',     color: '#d9534f', words: ['Mango', 'Papaya', 'Lychee', 'Guava', 'Apricot'] },
    weather:   { name: 'Weather',   color: '#3f8fd0', words: ['Drizzle', 'Blizzard', 'Monsoon', 'Hail'] },

    robots:    { name: 'Robots',    color: '#5f7c8a', words: ['Robovac', 'Android', 'Drone', 'Cyborg', 'Servo'] },
    sticky:    { name: 'Sticky',    color: '#c9a227', words: ['Glue', 'Wax', 'Tape', 'Resin', 'Syrup', 'Honey'] },
    coffee:    { name: 'Coffee',    color: '#8b5e3c', words: ['Espresso', 'Latte', 'Cortado', 'Ristretto', 'Macchiato'] },
    dance:     { name: 'Dance',     color: '#d4548c', words: ['Tango', 'Salsa', 'Waltz', 'Samba'] },
    raptors:   { name: 'Raptors',   color: '#39916b', words: ['Falcon', 'Kestrel', 'Osprey', 'Harrier', 'Buzzard'] },

    planets:   { name: 'Planets',   color: '#6b6fd8', words: ['Mercury', 'Venus', 'Saturn', 'Neptune'] },
    music:     { name: 'Music',     color: '#8a5fbf', words: ['Cello', 'Oboe', 'Banjo', 'Sitar'] },
    boats:     { name: 'Boats',     color: '#4468b8', words: ['Kayak', 'Schooner', 'Ferry', 'Canoe'] },
    fabrics:   { name: 'Fabrics',   color: '#a0577f', words: ['Denim', 'Velvet', 'Linen', 'Tweed'] },
    rivers:    { name: 'Rivers',    color: '#2f9e8f', words: ['Nile', 'Amazon', 'Danube'] },
    large:     { name: 'Large',     color: '#e07a3f', words: ['Huge', 'Colossal', 'Immense', 'Massive', 'Vast', 'Big'] },

    spices:    { name: 'Spices',    color: '#b8742a', words: ['Cumin', 'Saffron', 'Paprika', 'Nutmeg', 'Clove'] },
    geology:   { name: 'Geology',   color: '#7a6a52', words: ['Magma', 'Basalt', 'Caldera', 'Geyser'] },
    physics:   { name: 'Physics',   color: '#c2536b', words: ['Velocity', 'Torque', 'Inertia', 'Friction'] },
    gems:      { name: 'Gems',      color: '#2f9e8f', words: ['Opal', 'Topaz', 'Garnet', 'Jade', 'Amber'] },
    metals:    { name: 'Metals',    color: '#6f7f8c', words: ['Copper', 'Nickel', 'Cobalt', 'Pewter', 'Zinc'] },
    soup:      { name: 'Soup',      color: '#c8763a', words: ['Gazpacho', 'Miso', 'Bisque', 'Chowder', 'Pho'] },

    cheese:    { name: 'Cheese',    color: '#d1a43a', words: ['Brie', 'Gouda', 'Feta', 'Havarti', 'Gruyere'] },
    bread:     { name: 'Bread',     color: '#a9763f', words: ['Baguette', 'Brioche', 'Pita', 'Naan', 'Ciabatta'] },
    dessert:   { name: 'Dessert',   color: '#d4548c', words: ['Sorbet', 'Eclair', 'Flan', 'Trifle', 'Parfait'] },
    dogs:      { name: 'Dogs',      color: '#8a6f42', words: ['Beagle', 'Corgi', 'Husky', 'Poodle', 'Mastiff'] },
    cats:      { name: 'Cats',      color: '#9a6ab0', words: ['Siamese', 'Persian', 'Sphynx', 'Bengal', 'Ragdoll'] },
    insects:   { name: 'Insects',   color: '#5f8a3a', words: ['Beetle', 'Cricket', 'Locust', 'Mantis', 'Weevil'] },

    pasta:     { name: 'Pasta',     color: '#c9a227', words: ['Penne', 'Fusilli', 'Orzo', 'Farfalle', 'Rigatoni'] },
    herbs:     { name: 'Herbs',     color: '#4a8f4a', words: ['Basil', 'Thyme', 'Oregano', 'Sage', 'Chive'] },
    peaks:     { name: 'Peaks',     color: '#7a8a99', words: ['Everest', 'Denali', 'Eiger', 'Fuji', 'Elbrus'] },
    deserts:   { name: 'Deserts',   color: '#c2a05a', words: ['Sahara', 'Gobi', 'Mojave', 'Atacama', 'Kalahari'] },
    seas:      { name: 'Seas',      color: '#2f7f9e', words: ['Baltic', 'Aegean', 'Caspian', 'Adriatic', 'Arabian'] },
    islands:   { name: 'Islands',   color: '#3aa68a', words: ['Crete', 'Bali', 'Malta', 'Corfu', 'Zanzibar'] },

    capitals:  { name: 'Capitals',  color: '#4b8ce8', words: ['Oslo', 'Lima', 'Hanoi', 'Kigali', 'Prague'] },
    winds:     { name: 'Winds',     color: '#6fa8c9', words: ['Zephyr', 'Sirocco', 'Gale', 'Squall', 'Typhoon'] },
    clouds:    { name: 'Clouds',    color: '#8fa9bf', words: ['Cirrus', 'Cumulus', 'Stratus', 'Nimbus'] },
    horses:    { name: 'Horses',    color: '#8a5a3a', words: ['Mustang', 'Palomino', 'Appaloosa', 'Shetland'] },
    snakes:    { name: 'Snakes',    color: '#4f7a3a', words: ['Viper', 'Adder', 'Python', 'Mamba', 'Boa'] },
    wine:      { name: 'Wine',      color: '#8c2f4a', words: ['Merlot', 'Shiraz', 'Riesling', 'Malbec', 'Chianti'] },

    beer:      { name: 'Beer',      color: '#b8862a', words: ['Lager', 'Stout', 'Porter', 'Pilsner', 'Saison'] },
    cocktails: { name: 'Cocktails', color: '#c9506b', words: ['Mojito', 'Negroni', 'Daiquiri', 'Martini', 'Sidecar'] },
    furniture: { name: 'Furniture', color: '#7a6a52', words: ['Ottoman', 'Divan', 'Credenza', 'Armoire', 'Chaise'] },
    hats:      { name: 'Hats',      color: '#a0577f', words: ['Fedora', 'Beret', 'Bowler', 'Turban', 'Sombrero'] },
    shoes:     { name: 'Shoes',     color: '#5f5f7a', words: ['Loafer', 'Sandal', 'Clog', 'Brogue', 'Moccasin'] },
    space:     { name: 'Space',     color: '#4b4b8c', words: ['Comet', 'Quasar', 'Nebula', 'Pulsar', 'Meteor'] },
    waters:    { name: 'Waters',    color: '#2f8f9e', words: ['Lagoon', 'Fjord', 'Bayou', 'Inlet', 'Strait'] },

    math:      { name: 'Math',      color: '#5a6fd8', words: ['Vector', 'Matrix', 'Scalar', 'Integral', 'Tangent'] },
    chemistry: { name: 'Chemistry', color: '#3a8a7a', words: ['Isotope', 'Polymer', 'Catalyst', 'Solvent', 'Alloy'] },
    type:      { name: 'Type',      color: '#6b6b6b', words: ['Serif', 'Kerning', 'Ligature', 'Italic', 'Bold'] },
    sewing:    { name: 'Sewing',    color: '#b06a8a', words: ['Bobbin', 'Thimble', 'Hem', 'Seam', 'Pleat'] },
    fungi:     { name: 'Fungi',     color: '#8a7a5a', words: ['Morel', 'Shiitake', 'Truffle', 'Enoki', 'Cremini'] },
    peppers:   { name: 'Peppers',   color: '#c2402a', words: ['Jalapeno', 'Habanero', 'Poblano', 'Serrano', 'Cayenne'] },
    citrus:    { name: 'Citrus',    color: '#d9a02a', words: ['Lemon', 'Yuzu', 'Pomelo', 'Tangerine', 'Kumquat'] },

    sauces:    { name: 'Sauces',    color: '#a8562a', words: ['Pesto', 'Aioli', 'Harissa', 'Tahini', 'Ketchup'] },
    grains:    { name: 'Grains',   color: '#b89a5a', words: ['Quinoa', 'Millet', 'Barley', 'Sorghum', 'Farro'] },
    cardgames: { name: 'Cards',     color: '#4a7a4a', words: ['Rummy', 'Canasta', 'Euchre', 'Whist', 'Cribbage'] },
    martial:   { name: 'Martial',   color: '#8c3a3a', words: ['Judo', 'Karate', 'Aikido', 'Kendo', 'Sumo'] },
    track:     { name: 'Track',     color: '#3a6a8c', words: ['Javelin', 'Hurdles', 'Discus', 'Relay', 'Vault'] },
    mammals:   { name: 'Mammals',   color: '#7a5a3a', words: ['Otter', 'Badger', 'Lynx', 'Weasel', 'Bison'] },

    /* ---- the trap levels ----
       Every word here has a second life in another category on the same
       table: Rook is a bird, Swift means fast, Bluff is a cliff, Cutter is a
       tool, Fleet is a group of ships, Teal is a duck, Palm is a tree. */
    hardbirds: { name: 'Birds',     color: '#3f7d5a', words: ['Crane', 'Swallow', 'Kite', 'Martin', 'Swift'] },
    chess:     { name: 'Chess',     color: '#4a4a5c', words: ['Rook', 'Bishop', 'Knight', 'Pawn', 'Castle'] },
    poker:     { name: 'Poker',     color: '#a33b4a', words: ['Flush', 'River', 'Bluff', 'Fold', 'Ante'] },
    landform:  { name: 'Landform',  color: '#8a6f42', words: ['Mesa', 'Butte', 'Ridge', 'Crag'] },
    fast:      { name: 'Fast',      color: '#c25e2a', words: ['Rapid', 'Fleet', 'Brisk', 'Hasty'] },
    ships:     { name: 'Ships',     color: '#2f6f9e', words: ['Frigate', 'Cutter', 'Sloop', 'Galleon'] },
    tools:     { name: 'Tools',     color: '#6b6b4e', words: ['Chisel', 'Auger', 'Plane', 'Rasp'] },

    fish:      { name: 'Fish',      color: '#3a7a9e', words: ['Salmon', 'Perch', 'Sole', 'Ray', 'Skate'] },
    colors:    { name: 'Colors',    color: '#b0447a', words: ['Crimson', 'Indigo', 'Ochre', 'Teal', 'Mauve'] },
    ducks:     { name: 'Ducks',     color: '#4a8a5a', words: ['Mallard', 'Eider', 'Pintail', 'Gadwall', 'Shoveler'] },
    body:      { name: 'Body',      color: '#c2726b', words: ['Shin', 'Wrist', 'Temple', 'Palm', 'Iris'] },
    flowers:   { name: 'Flowers',   color: '#d4548c', words: ['Rose', 'Dahlia', 'Peony', 'Aster', 'Lupin'] },
    buildings: { name: 'Buildings', color: '#8a7a6a', words: ['Mill', 'Lodge', 'Manor', 'Abbey', 'Villa'] },
    trees:     { name: 'Trees',     color: '#4a7a3a', words: ['Willow', 'Birch', 'Cedar', 'Aspen', 'Alder'] }
};

/* rows  — cards dealt into the shortest tableau column; the four columns run
           rows, rows+1, rows+2, rows+3, and everything left over is the stock
   slack — spare moves on top of the solution the dealer worked out, as a
           fraction of it, before a free pass through the deck is added */
var LEVELS = [
    { name: 'Warm Up',       cats: ['greek', 'rest', 'cities', 'fruit', 'weather'],                                  rows: 3, slack: 0.50 },
    { name: 'Draw Pile',     cats: ['robots', 'sticky', 'coffee', 'dance', 'raptors'],                               rows: 4, slack: 0.45 },
    { name: 'Four Slots',    cats: ['planets', 'music', 'boats', 'fabrics', 'rivers', 'large'],                      rows: 4, slack: 0.40 },
    { name: 'Deep Stacks',   cats: ['spices', 'geology', 'physics', 'gems', 'metals', 'soup'],                       rows: 4, slack: 0.38 },
    { name: 'Pantry',        cats: ['cheese', 'bread', 'dessert', 'dogs', 'cats', 'insects'],                        rows: 5, slack: 0.35 },
    { name: 'Far Places',    cats: ['pasta', 'herbs', 'peaks', 'deserts', 'seas', 'islands'],                        rows: 5, slack: 0.32 },
    { name: 'Tight Board',   cats: ['capitals', 'winds', 'clouds', 'horses', 'snakes', 'wine'],                      rows: 5, slack: 0.30 },
    { name: 'Full Table',    cats: ['beer', 'cocktails', 'furniture', 'hats', 'shoes', 'space', 'waters'],           rows: 5, slack: 0.28 },
    { name: 'Workshop',      cats: ['math', 'chemistry', 'type', 'sewing', 'fungi', 'peppers', 'citrus'],            rows: 5, slack: 0.26 },
    { name: 'Long Haul',     cats: ['sauces', 'grains', 'cardgames', 'martial', 'track', 'mammals'],                 rows: 5, slack: 0.24 },
    { name: 'Crossed Wires', cats: ['hardbirds', 'chess', 'poker', 'landform', 'fast', 'ships', 'tools'],            rows: 5, slack: 0.20 },
    { name: 'Double Lives',  cats: ['fish', 'colors', 'ducks', 'body', 'flowers', 'buildings', 'trees'],             rows: 5, slack: 0.18 }
];

/* Run WordSolitaire.checkLevels() in the console to check the data holds. */
function checkLevels() {
    var problems = [];
    var homes = {};
    var used = {};

    Object.keys(CATEGORIES).forEach(function (id) {
        var category = CATEGORIES[id];
        category.words.forEach(function (word) {
            if (homes[word]) problems.push('"' + word + '" is in both ' + homes[word] + ' and ' + id);
            homes[word] = id;
            if (word === category.name) problems.push(id + ' is named after its own word "' + word + '"');
        });
    });

    LEVELS.forEach(function (level, index) {
        var seen = {};
        level.cats.forEach(function (id) {
            if (!CATEGORIES[id]) {
                problems.push('level ' + (index + 1) + ' wants a category that does not exist: ' + id);
                return;
            }
            if (used[id]) problems.push(id + ' is in level ' + used[id] + ' and level ' + (index + 1));
            used[id] = index + 1;
            [CATEGORIES[id].name].concat(CATEGORIES[id].words).forEach(function (text) {
                if (seen[text]) problems.push('level ' + (index + 1) + ' shows "' + text + '" twice');
                seen[text] = true;
            });
        });
    });

    return problems;
}
