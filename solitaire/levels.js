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
    weather:   { name: 'Weather',   color: '#3f8fd0', words: ['Drizzle', 'Blizzard', 'Monsoon', 'Hail', 'Sleet'] },

    robots:    { name: 'Robots',    color: '#5f7c8a', words: ['Robovac', 'Android', 'Drone', 'Cyborg', 'Servo', 'Golem'] },
    sticky:    { name: 'Sticky',    color: '#c9a227', words: ['Glue', 'Wax', 'Tape', 'Resin', 'Syrup', 'Honey'] },
    coffee:    { name: 'Coffee',    color: '#8b5e3c', words: ['Espresso', 'Latte', 'Cortado', 'Ristretto', 'Macchiato', 'Americano'] },
    dance:     { name: 'Dance',     color: '#d4548c', words: ['Tango', 'Salsa', 'Waltz', 'Samba', 'Rumba'] },
    raptors:   { name: 'Raptors',   color: '#39916b', words: ['Falcon', 'Kestrel', 'Osprey', 'Harrier', 'Buzzard', 'Goshawk'] },

    planets:   { name: 'Planets',   color: '#6b6fd8', words: ['Mercury', 'Venus', 'Saturn', 'Neptune', 'Uranus'] },
    music:     { name: 'Music',     color: '#8a5fbf', words: ['Cello', 'Oboe', 'Banjo', 'Sitar', 'Bassoon', 'Timpani'] },
    boats:     { name: 'Boats',     color: '#4468b8', words: ['Kayak', 'Schooner', 'Ferry', 'Canoe', 'Dinghy', 'Punt'] },
    fabrics:   { name: 'Fabrics',   color: '#a0577f', words: ['Denim', 'Velvet', 'Linen', 'Tweed', 'Chintz', 'Organza'] },
    rivers:    { name: 'Rivers',    color: '#2f9e8f', words: ['Nile', 'Amazon', 'Danube', 'Mekong'] },
    large:     { name: 'Large',     color: '#e07a3f', words: ['Huge', 'Colossal', 'Immense', 'Massive', 'Vast', 'Big'] },

    spices:    { name: 'Spices',    color: '#b8742a', words: ['Cumin', 'Saffron', 'Paprika', 'Nutmeg', 'Clove', 'Cardamom'] },
    geology:   { name: 'Geology',   color: '#7a6a52', words: ['Magma', 'Basalt', 'Caldera', 'Geyser', 'Gneiss', 'Shale'] },
    physics:   { name: 'Physics',   color: '#c2536b', words: ['Velocity', 'Torque', 'Inertia', 'Friction', 'Momentum', 'Entropy'] },
    gems:      { name: 'Gems',      color: '#2f9e8f', words: ['Opal', 'Topaz', 'Garnet', 'Jade', 'Amber', 'Peridot'] },
    metals:    { name: 'Metals',    color: '#6f7f8c', words: ['Copper', 'Nickel', 'Cobalt', 'Pewter', 'Zinc', 'Bronze'] },
    soup:      { name: 'Soup',      color: '#c8763a', words: ['Gazpacho', 'Miso', 'Bisque', 'Chowder', 'Pho', 'Borscht'] },

    cheese:    { name: 'Cheese',    color: '#d1a43a', words: ['Brie', 'Gouda', 'Feta', 'Havarti', 'Gruyere', 'Manchego', 'Stilton'] },
    bread:     { name: 'Bread',     color: '#a9763f', words: ['Baguette', 'Brioche', 'Pita', 'Naan', 'Ciabatta', 'Challah', 'Focaccia'] },
    dessert:   { name: 'Dessert',   color: '#d4548c', words: ['Sorbet', 'Eclair', 'Flan', 'Trifle', 'Parfait', 'Tiramisu', 'Baklava'] },
    dogs:      { name: 'Dogs',      color: '#8a6f42', words: ['Beagle', 'Corgi', 'Husky', 'Poodle', 'Mastiff', 'Whippet', 'Shiba'] },
    cats:      { name: 'Cats',      color: '#9a6ab0', words: ['Siamese', 'Persian', 'Sphynx', 'Bengal', 'Ragdoll', 'Burmese'] },
    insects:   { name: 'Insects',   color: '#5f8a3a', words: ['Beetle', 'Cricket', 'Locust', 'Mantis', 'Weevil', 'Aphid'] },

    pasta:     { name: 'Pasta',     color: '#c9a227', words: ['Penne', 'Fusilli', 'Orzo', 'Farfalle', 'Rigatoni', 'Linguine', 'Gnocchi'] },
    herbs:     { name: 'Herbs',     color: '#4a8f4a', words: ['Basil', 'Thyme', 'Oregano', 'Sage', 'Chive', 'Tarragon', 'Marjoram'] },
    peaks:     { name: 'Peaks',     color: '#7a8a99', words: ['Everest', 'Denali', 'Eiger', 'Fuji', 'Elbrus', 'Rainier', 'Aconcagua'] },
    deserts:   { name: 'Deserts',   color: '#c2a05a', words: ['Sahara', 'Gobi', 'Mojave', 'Atacama', 'Kalahari', 'Namib', 'Sonoran'] },
    seas:      { name: 'Seas',      color: '#2f7f9e', words: ['Baltic', 'Aegean', 'Caspian', 'Adriatic', 'Arabian', 'Tasman', 'Ionian', 'Barents'] },
    islands:   { name: 'Islands',   color: '#3aa68a', words: ['Crete', 'Bali', 'Malta', 'Corfu', 'Zanzibar', 'Rhodes', 'Sicily', 'Madeira'] },

    capitals:  { name: 'Capitals',  color: '#4b8ce8', words: ['Oslo', 'Lima', 'Hanoi', 'Kigali', 'Prague', 'Quito', 'Dakar', 'Vienna'] },
    winds:     { name: 'Winds',     color: '#6fa8c9', words: ['Zephyr', 'Sirocco', 'Gale', 'Squall', 'Typhoon', 'Mistral', 'Chinook', 'Bora'] },
    clouds:    { name: 'Clouds',    color: '#8fa9bf', words: ['Cirrus', 'Cumulus', 'Stratus', 'Nimbus', 'Fractus', 'Pileus'] },
    horses:    { name: 'Horses',    color: '#8a5a3a', words: ['Mustang', 'Palomino', 'Appaloosa', 'Shetland', 'Morgan', 'Haflinger', 'Criollo', 'Marwari'] },
    snakes:    { name: 'Snakes',    color: '#4f7a3a', words: ['Viper', 'Adder', 'Python', 'Mamba', 'Boa', 'Krait', 'Taipan', 'Racer'] },
    wine:      { name: 'Wine',      color: '#8c2f4a', words: ['Merlot', 'Shiraz', 'Riesling', 'Malbec', 'Chianti', 'Barolo', 'Rioja', 'Sancerre'] },

    beer:      { name: 'Beer',      color: '#b8862a', words: ['Lager', 'Stout', 'Porter', 'Pilsner', 'Saison', 'Kolsch', 'Bitter'] },
    cocktails: { name: 'Cocktails', color: '#c9506b', words: ['Mojito', 'Negroni', 'Daiquiri', 'Martini', 'Sidecar', 'Paloma', 'Gimlet'] },
    furniture: { name: 'Furniture', color: '#7a6a52', words: ['Ottoman', 'Divan', 'Credenza', 'Armoire', 'Chaise', 'Bureau', 'Settee'] },
    hats:      { name: 'Hats',      color: '#a0577f', words: ['Fedora', 'Beret', 'Bowler', 'Turban', 'Sombrero', 'Trilby', 'Cloche'] },
    shoes:     { name: 'Shoes',     color: '#5f5f7a', words: ['Loafer', 'Sandal', 'Clog', 'Brogue', 'Moccasin', 'Oxford', 'Pump'] },
    space:     { name: 'Space',     color: '#4b4b8c', words: ['Comet', 'Quasar', 'Nebula', 'Pulsar', 'Meteor', 'Corona', 'Eclipse'] },
    waters:    { name: 'Waters',    color: '#2f8f9e', words: ['Lagoon', 'Fjord', 'Bayou', 'Inlet', 'Strait', 'Estuary', 'Cove'] },

    math:      { name: 'Math',      color: '#5a6fd8', words: ['Vector', 'Matrix', 'Scalar', 'Integral', 'Tangent', 'Cosine', 'Modulus'] },
    chemistry: { name: 'Chemistry', color: '#3a8a7a', words: ['Isotope', 'Polymer', 'Catalyst', 'Solvent', 'Alloy', 'Reagent', 'Ester'] },
    type:      { name: 'Type',      color: '#6b6b6b', words: ['Serif', 'Kerning', 'Ligature', 'Italic', 'Bold', 'Leading', 'Glyph'] },
    sewing:    { name: 'Sewing',    color: '#b06a8a', words: ['Bobbin', 'Thimble', 'Hem', 'Seam', 'Pleat', 'Gusset', 'Basting'] },
    fungi:     { name: 'Fungi',     color: '#8a7a5a', words: ['Morel', 'Shiitake', 'Truffle', 'Enoki', 'Cremini', 'Porcini', 'Maitake'] },
    peppers:   { name: 'Peppers',   color: '#c2402a', words: ['Jalapeno', 'Habanero', 'Poblano', 'Serrano', 'Cayenne', 'Ancho', 'Piquillo'] },
    citrus:    { name: 'Citrus',    color: '#d9a02a', words: ['Lemon', 'Yuzu', 'Pomelo', 'Tangerine', 'Kumquat', 'Citron', 'Bergamot', 'Satsuma'] },

    sauces:    { name: 'Sauces',    color: '#a8562a', words: ['Pesto', 'Aioli', 'Harissa', 'Tahini', 'Ketchup', 'Chutney', 'Gravy', 'Mustard'] },
    grains:    { name: 'Grains',    color: '#b89a5a', words: ['Quinoa', 'Millet', 'Barley', 'Sorghum', 'Farro', 'Bulgur', 'Spelt', 'Teff'] },
    cardgames: { name: 'Cards',     color: '#4a7a4a', words: ['Rummy', 'Canasta', 'Euchre', 'Whist', 'Cribbage', 'Pinochle', 'Hearts', 'Skat'] },
    martial:   { name: 'Martial',   color: '#8c3a3a', words: ['Judo', 'Karate', 'Aikido', 'Kendo', 'Sumo', 'Wushu', 'Capoeira', 'Silat'] },
    track:     { name: 'Track',     color: '#3a6a8c', words: ['Javelin', 'Hurdles', 'Discus', 'Relay', 'Vault', 'Shotput', 'Sprint', 'Steeple'] },
    mammals:   { name: 'Mammals',   color: '#7a5a3a', words: ['Otter', 'Badger', 'Lynx', 'Weasel', 'Bison', 'Tapir', 'Marmot', 'Ibex'] },
    tea:       { name: 'Tea',       color: '#5a8a4a', words: ['Matcha', 'Oolong', 'Chai', 'Rooibos', 'Assam', 'Sencha', 'Keemun'] },

    /* ---- the trap levels ----
       Every word here has a second life in another category on the same
       table: Rook is a bird, Swift means fast, Bluff is a cliff, Bank is
       poker and a river, Tender is gentle, Level and Square and Punch are
       tools and not, Teal is a duck, Palm is a tree, Beech sounds like a
       beach and Yew like you. */
    hardbirds: { name: 'Birds',     color: '#3f7d5a', words: ['Crane', 'Swallow', 'Kite', 'Martin', 'Swift', 'Robin', 'Jay', 'Wren'] },
    chess:     { name: 'Chess',     color: '#4a4a5c', words: ['Rook', 'Bishop', 'Knight', 'Pawn', 'Castle', 'Queen', 'King', 'Gambit'] },
    poker:     { name: 'Poker',     color: '#a33b4a', words: ['Flush', 'River', 'Bluff', 'Fold', 'Ante', 'Check', 'Raise', 'Deal'] },
    landform:  { name: 'Landform',  color: '#8a6f42', words: ['Mesa', 'Butte', 'Ridge', 'Crag', 'Bank', 'Basin', 'Plateau', 'Scarp'] },
    fast:      { name: 'Fast',      color: '#c25e2a', words: ['Rapid', 'Fleet', 'Brisk', 'Hasty', 'Fly', 'Quick', 'Snappy', 'Prompt'] },
    ships:     { name: 'Ships',     color: '#2f6f9e', words: ['Frigate', 'Cutter', 'Sloop', 'Galleon', 'Tender', 'Clipper', 'Ketch', 'Barge'] },
    tools:     { name: 'Tools',     color: '#6b6b4e', words: ['Chisel', 'Auger', 'Plane', 'Rasp', 'Level', 'Square', 'Vise', 'Punch', 'Awl'] },

    fish:      { name: 'Fish',      color: '#3a7a9e', words: ['Salmon', 'Perch', 'Sole', 'Ray', 'Skate', 'Bass', 'Char', 'Dab'] },
    colors:    { name: 'Colors',    color: '#b0447a', words: ['Crimson', 'Indigo', 'Ochre', 'Teal', 'Mauve', 'Coral', 'Fawn', 'Slate'] },
    ducks:     { name: 'Ducks',     color: '#4a8a5a', words: ['Mallard', 'Eider', 'Pintail', 'Gadwall', 'Shoveler', 'Scoter', 'Wigeon', 'Smew'] },
    body:      { name: 'Body',      color: '#c2726b', words: ['Shin', 'Wrist', 'Temple', 'Palm', 'Iris', 'Pupil', 'Drum', 'Arch'] },
    flowers:   { name: 'Flowers',   color: '#d4548c', words: ['Rose', 'Dahlia', 'Peony', 'Aster', 'Lupin', 'Poppy', 'Bluebell', 'Foxglove'] },
    buildings: { name: 'Buildings', color: '#8a7a6a', words: ['Mill', 'Lodge', 'Manor', 'Abbey', 'Villa', 'Keep', 'Tower', 'Barn'] },
    trees:     { name: 'Trees',     color: '#4a7a3a', words: ['Willow', 'Birch', 'Cedar', 'Aspen', 'Alder', 'Elm', 'Beech', 'Yew', 'Rowan'] }
};

/* rows  — cards dealt into the shortest tableau column; the four columns run
           rows, rows+1, rows+2, rows+3, and everything left over is the stock
   slack — spare moves on top of the solution the dealer worked out, as a
           fraction of it, before a free pass through the deck is added */
var LEVELS = [
    { name: 'Warm Up',       cats: ['greek', 'rest', 'cities', 'fruit', 'weather'],                                  rows: 3, slack: 0.45 },
    { name: 'Draw Pile',     cats: ['robots', 'sticky', 'coffee', 'dance', 'raptors'],                               rows: 4, slack: 0.40 },
    { name: 'Four Slots',    cats: ['planets', 'music', 'boats', 'fabrics', 'rivers', 'large'],                      rows: 4, slack: 0.34 },
    { name: 'Deep Stacks',   cats: ['spices', 'geology', 'physics', 'gems', 'metals', 'soup'],                       rows: 5, slack: 0.30 },
    { name: 'Pantry',        cats: ['cheese', 'bread', 'dessert', 'dogs', 'cats', 'insects'],                        rows: 5, slack: 0.26 },
    { name: 'Far Places',    cats: ['pasta', 'herbs', 'peaks', 'deserts', 'seas', 'islands'],                        rows: 5, slack: 0.22 },
    { name: 'Tight Board',   cats: ['capitals', 'winds', 'clouds', 'horses', 'snakes', 'wine'],                      rows: 6, slack: 0.20 },
    { name: 'Full Table',    cats: ['beer', 'cocktails', 'furniture', 'hats', 'shoes', 'space', 'waters'],           rows: 6, slack: 0.18 },
    { name: 'Workshop',      cats: ['math', 'chemistry', 'type', 'sewing', 'fungi', 'peppers', 'citrus'],            rows: 6, slack: 0.16 },
    { name: 'Long Haul',     cats: ['sauces', 'grains', 'cardgames', 'martial', 'track', 'mammals', 'tea'],          rows: 6, slack: 0.14 },
    { name: 'Crossed Wires', cats: ['hardbirds', 'chess', 'poker', 'landform', 'fast', 'ships', 'tools'],            rows: 6, slack: 0.15 },
    { name: 'Double Lives',  cats: ['fish', 'colors', 'ducks', 'body', 'flowers', 'buildings', 'trees'],             rows: 6, slack: 0.15 }
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
