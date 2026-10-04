/* Word Solitaire — category data and level definitions.

   Three rules hold across this file, and `checkLevels()` at the bottom
   enforces them in the console:
     - a word belongs to exactly one category, everywhere
     - a category belongs to exactly one level, so nothing repeats as you play
     - a category's name never matches a card in its own level, or the crowned
       card and a word card would read the same

   Sets run from three words to seven, and the last level stretches to nine.
   Everyday sets use words anyone would recognise; the vocabulary sets at the
   end are deliberately the opposite, each one a word and its synonyms. */

var CATEGORIES = {
    /* ---- three-word sets ---- */
    greek:      { name: 'Greek',     color: '#3aa6a0', words: ['Kappa', 'Sigma', 'Delta'] },
    rivers:     { name: 'Rivers',    color: '#2f9e8f', words: ['Nile', 'Amazon', 'Danube'] },
    lifestage:  { name: 'Ages',      color: '#c2726b', words: ['Kid', 'Teen', 'Adult'] },
    filmgenre:  { name: 'Films',     color: '#8a5fbf', words: ['Comedy', 'Drama', 'Western'] },
    skincare:   { name: 'Skincare',  color: '#d4548c', words: ['Toner', 'Serum', 'Patches'] },
    clouds:     { name: 'Clouds',    color: '#8fa9bf', words: ['Cirrus', 'Cumulus', 'Stratus'] },
    soup:       { name: 'Soup',      color: '#c8763a', words: ['Miso', 'Chowder', 'Broth'] },
    tea:        { name: 'Tea',       color: '#5a8a4a', words: ['Matcha', 'Oolong', 'Chai'] },
    beer:       { name: 'Beer',      color: '#b8862a', words: ['Lager', 'Stout', 'Pilsner'] },
    continents: { name: 'Lands',     color: '#4b8ce8', words: ['Africa', 'Europe', 'Asia'] },
    geology:    { name: 'Geology',   color: '#7a6a52', words: ['Magma', 'Lava', 'Basalt'] },
    winds:      { name: 'Winds',     color: '#6fa8c9', words: ['Gale', 'Squall', 'Breeze'] },

    /* ---- four-word sets ---- */
    suits:      { name: 'Suits',     color: '#a33b4a', words: ['Clubs', 'Spades', 'Hearts', 'Diamonds'] },
    berries:    { name: 'Berries',   color: '#b0447a', words: ['Raspberry', 'Cranberry', 'Blueberry', 'Cherry'] },
    veg:        { name: 'Veg',       color: '#5f8a3a', words: ['Eggplant', 'Cabbage', 'Zucchini', 'Broccoli'] },
    bigcats:    { name: 'Big Cats',  color: '#c2802a', words: ['Leopard', 'Cheetah', 'Tiger', 'Jaguar'] },
    catbreeds:  { name: 'Cats',      color: '#9a6ab0', words: ['Persian', 'Siamese', 'Sphynx', 'Ragdoll'] },
    golf:       { name: 'Golf',      color: '#4a8f4a', words: ['Tee', 'Club', 'Hole', 'Putt'] },
    darts:      { name: 'Darts',     color: '#3a6a8c', words: ['Target', 'Throw', 'Board', 'Score'] },
    treeparts:  { name: 'Tree',      color: '#4a7a3a', words: ['Trunk', 'Bark', 'Branch', 'Root'] },
    birdparts:  { name: 'Bird',      color: '#39916b', words: ['Tail', 'Beak', 'Feathers', 'Wings'] },
    bovines:    { name: 'Cattle',    color: '#7a5a3a', words: ['Buffalo', 'Bison', 'Yak', 'Angus'] },
    weights:    { name: 'Weights',   color: '#6f7f8c', words: ['Kilogram', 'Gram', 'Pound', 'Ounce'] },
    temps:      { name: 'Warmth',    color: '#c25e2a', words: ['Cold', 'Hot', 'Warm', 'Cool'] },
    flowers:    { name: 'Flowers',   color: '#d4548c', words: ['Tulip', 'Rose', 'Daisy', 'Lily'] },
    catsounds:  { name: 'Kitty',     color: '#b06a8a', words: ['Whiskers', 'Purr', 'Meow', 'Scratch'] },
    drinks:     { name: 'Drinks',    color: '#d9a02a', words: ['Juice', 'Soda', 'Lemonade', 'Water'] },
    pets:       { name: 'Pets',      color: '#8a6f42', words: ['Hamster', 'Gerbil', 'Parrot', 'Goldfish'] },
    baked:      { name: 'Baked',     color: '#a9763f', words: ['Cookie', 'Cake', 'Pie', 'Brownie'] },
    boardgames: { name: 'Games',     color: '#4a4a5c', words: ['Checkers', 'Dominoes', 'Backgammon', 'Scrabble'] },
    musicgenre: { name: 'Sounds',    color: '#8a3a8c', words: ['Jazz', 'Blues', 'Disco', 'Reggae'] },
    dance:      { name: 'Dance',     color: '#d4548c', words: ['Tango', 'Salsa', 'Waltz', 'Samba'] },
    weather:    { name: 'Weather',   color: '#3f8fd0', words: ['Drizzle', 'Blizzard', 'Monsoon', 'Hail'] },
    robots:     { name: 'Robots',    color: '#5f7c8a', words: ['Android', 'Drone', 'Cyborg', 'Robot'] },
    boats:      { name: 'Boats',     color: '#4468b8', words: ['Kayak', 'Ferry', 'Canoe', 'Yacht'] },
    fabrics:    { name: 'Fabrics',   color: '#a0577f', words: ['Denim', 'Velvet', 'Linen', 'Silk'] },
    spices:     { name: 'Spices',    color: '#b8742a', words: ['Cumin', 'Paprika', 'Nutmeg', 'Cinnamon'] },
    physics:    { name: 'Physics',   color: '#c2536b', words: ['Velocity', 'Torque', 'Inertia', 'Friction'] },
    gems:       { name: 'Gems',      color: '#2f9e8f', words: ['Opal', 'Ruby', 'Jade', 'Amber'] },
    metals:     { name: 'Metals',    color: '#6f7f8c', words: ['Copper', 'Nickel', 'Zinc', 'Bronze'] },
    cheese:     { name: 'Cheese',    color: '#d1a43a', words: ['Brie', 'Gouda', 'Feta', 'Cheddar'] },
    bread:      { name: 'Bread',     color: '#a9763f', words: ['Baguette', 'Pita', 'Naan', 'Sourdough'] },
    insects:    { name: 'Insects',   color: '#5f8a3a', words: ['Beetle', 'Cricket', 'Locust', 'Mantis'] },
    pasta:      { name: 'Pasta',     color: '#c9a227', words: ['Penne', 'Ravioli', 'Lasagna', 'Spaghetti'] },
    herbs:      { name: 'Herbs',     color: '#4a8f4a', words: ['Basil', 'Thyme', 'Oregano', 'Sage'] },
    peaks:      { name: 'Peaks',     color: '#7a8a99', words: ['Everest', 'Denali', 'Fuji', 'Eiger'] },
    deserts:    { name: 'Deserts',   color: '#c2a05a', words: ['Sahara', 'Gobi', 'Mojave', 'Kalahari'] },
    seas:       { name: 'Seas',      color: '#2f7f9e', words: ['Baltic', 'Aegean', 'Caspian', 'Arctic'] },
    islands:    { name: 'Islands',   color: '#3aa68a', words: ['Crete', 'Bali', 'Malta', 'Corfu'] },
    snakes:     { name: 'Snakes',    color: '#4f7a3a', words: ['Viper', 'Adder', 'Python', 'Cobra'] },
    waters:     { name: 'Waters',    color: '#2f8f9e', words: ['Lagoon', 'Fjord', 'Inlet', 'Strait'] },
    math:       { name: 'Math',      color: '#5a6fd8', words: ['Vector', 'Matrix', 'Cosine', 'Tangent'] },
    chemistry:  { name: 'Chemistry', color: '#3a8a7a', words: ['Isotope', 'Polymer', 'Solvent', 'Alloy'] },
    fungi:      { name: 'Fungi',     color: '#8a7a5a', words: ['Morel', 'Truffle', 'Shiitake', 'Portobello'] },
    peppers:    { name: 'Peppers',   color: '#c2402a', words: ['Jalapeno', 'Habanero', 'Poblano', 'Cayenne'] },
    citrus:     { name: 'Citrus',    color: '#d9a02a', words: ['Lemon', 'Lime', 'Pomelo', 'Tangerine'] },
    sauces:     { name: 'Sauces',    color: '#a8562a', words: ['Pesto', 'Ketchup', 'Gravy', 'Mustard'] },
    grains:     { name: 'Grains',    color: '#b89a5a', words: ['Quinoa', 'Millet', 'Barley', 'Oats'] },
    cardgames:  { name: 'Cards',     color: '#4a7a4a', words: ['Rummy', 'Bridge', 'Canasta', 'Whist'] },
    track:      { name: 'Track',     color: '#3a6a8c', words: ['Javelin', 'Hurdles', 'Discus', 'Relay'] },
    mammals:    { name: 'Mammals',   color: '#7a5a3a', words: ['Otter', 'Badger', 'Lynx', 'Marmot'] },
    martialart: { name: 'Dojo',      color: '#8c3a3a', words: ['Judo', 'Karate', 'Aikido', 'Sumo'] },
    seasons:    { name: 'Seasons',   color: '#6fa8c9', words: ['Spring', 'Summer', 'Autumn', 'Winter'] },
    orchard:    { name: 'Orchard',   color: '#b0447a', words: ['Fig', 'Date', 'Olive', 'Quince'] },
    amphibians: { name: 'Amphibian', color: '#5f8a5a', words: ['Frog', 'Toad', 'Newt', 'Salamander'] },

    /* ---- five-word sets ---- */
    rest:       { name: 'Rest',      color: '#7a63d8', words: ['Sleep', 'Chill', 'Relax', 'Nap', 'Doze'] },
    cities:     { name: 'Cities',    color: '#4b8ce8', words: ['Chicago', 'Toronto', 'Nairobi', 'Lisbon', 'Osaka'] },
    fruit:      { name: 'Fruit',     color: '#d9534f', words: ['Mango', 'Papaya', 'Peach', 'Plum', 'Apricot'] },
    coffee:     { name: 'Coffee',    color: '#8b5e3c', words: ['Espresso', 'Latte', 'Mocha', 'Americano', 'Cappuccino'] },
    planets:    { name: 'Planets',   color: '#6b6fd8', words: ['Jupiter', 'Venus', 'Saturn', 'Neptune', 'Pluto'] },
    space:      { name: 'Space',     color: '#4b4b8c', words: ['Comet', 'Meteor', 'Moon', 'Stars', 'Nebula'] },
    dogs:       { name: 'Dogs',      color: '#8a6f42', words: ['Beagle', 'Corgi', 'Husky', 'Poodle', 'Terrier'] },
    capitals:   { name: 'Capitals',  color: '#4b8ce8', words: ['Oslo', 'Lima', 'Hanoi', 'Paris', 'Prague'] },
    sticky:     { name: 'Sticky',    color: '#c9a227', words: ['Glue', 'Wax', 'Tape', 'Syrup', 'Honey'] },
    dessert:    { name: 'Dessert',   color: '#d4548c', words: ['Sorbet', 'Pudding', 'Flan', 'Mousse', 'Sundae'] },
    hats:       { name: 'Hats',      color: '#a0577f', words: ['Fedora', 'Beret', 'Cap', 'Turban', 'Helmet'] },
    shoes:      { name: 'Shoes',     color: '#5f5f7a', words: ['Sandal', 'Boot', 'Sneaker', 'Slipper', 'Heel'] },
    furniture:  { name: 'Furniture', color: '#7a6a52', words: ['Sofa', 'Dresser', 'Stool', 'Bench', 'Desk'] },
    toolbox:    { name: 'Toolbox',   color: '#6b6b4e', words: ['Hammer', 'Wrench', 'Pliers', 'Drill', 'Nail'] },
    instrument: { name: 'Music',     color: '#8a5fbf', words: ['Cello', 'Oboe', 'Banjo', 'Flute', 'Drums'] },
    large:      { name: 'Large',     color: '#e07a3f', words: ['Huge', 'Giant', 'Massive', 'Vast', 'Big'] },
    gardenbird: { name: 'Birds',     color: '#39916b', words: ['Robin', 'Sparrow', 'Pigeon', 'Owl', 'Duck'] },
    type:       { name: 'Letters',   color: '#6b6b6b', words: ['Bold', 'Italic', 'Serif', 'Caps', 'Font'] },

    /* ---- six-word sets ---- */
    greens:     { name: 'Greens',    color: '#4a8a4a', words: ['Spinach', 'Kale', 'Lettuce', 'Celery', 'Pea', 'Bean'] },
    wine:       { name: 'Wine',      color: '#8c2f4a', words: ['Merlot', 'Shiraz', 'Riesling', 'Malbec', 'Chianti', 'Pinot'] },
    horses:     { name: 'Horses',    color: '#8a5a3a', words: ['Mustang', 'Palomino', 'Pony', 'Stallion', 'Mare', 'Foal'] },
    sewing:     { name: 'Sewing',    color: '#b06a8a', words: ['Needle', 'Thread', 'Button', 'Zipper', 'Hem', 'Patch'] },
    ocean:      { name: 'Ocean',     color: '#2f8a9e', words: ['Squid', 'Crab', 'Oyster', 'Urchin', 'Clam', 'Prawn'] },

    /* ---- the trap levels ----
       Every word here has a second life in another category on the same
       table: Rook is a bird, Swift means fast, Bluff is a cliff, Bank is
       poker and a river, Tender is gentle, Level and Square and Punch are
       tools and not, Reel and Hook and Net are tackle and tools alike, Teal
       is a duck, Palm is a tree, Hazel and Chestnut are trees and colours,
       Beech sounds like a beach. */
    hardbirds:  { name: 'Birds',     color: '#3f7d5a', words: ['Crane', 'Swallow', 'Kite', 'Martin', 'Swift', 'Jay', 'Wren'] },
    chess:      { name: 'Chess',     color: '#4a4a5c', words: ['Rook', 'Bishop', 'Knight', 'Pawn', 'Castle', 'Queen', 'King'] },
    poker:      { name: 'Poker',     color: '#a33b4a', words: ['Flush', 'River', 'Bluff', 'Fold', 'Ante', 'Check', 'Deal'] },
    landform:   { name: 'Landform',  color: '#8a6f42', words: ['Mesa', 'Butte', 'Ridge', 'Crag', 'Bank', 'Basin', 'Plateau'] },
    fast:       { name: 'Fast',      color: '#c25e2a', words: ['Rapid', 'Fleet', 'Brisk', 'Hasty', 'Fly', 'Quick', 'Prompt'] },
    ships:      { name: 'Ships',     color: '#2f6f9e', words: ['Frigate', 'Cutter', 'Sloop', 'Galleon', 'Tender', 'Clipper', 'Barge'] },
    tools:      { name: 'Tools',     color: '#6b6b4e', words: ['Chisel', 'Auger', 'Plane', 'Rasp', 'Level', 'Square', 'Punch'] },
    fishing:    { name: 'Fishing',   color: '#3a7a6a', words: ['Reel', 'Rod', 'Hook', 'Line', 'Sinker', 'Float', 'Net'] },

    fish:       { name: 'Fish',      color: '#3a7a9e', words: ['Salmon', 'Perch', 'Sole', 'Ray', 'Skate', 'Bass', 'Char'] },
    colors:     { name: 'Colors',    color: '#b0447a', words: ['Crimson', 'Indigo', 'Ochre', 'Teal', 'Mauve', 'Coral', 'Slate'] },
    waterfowl:  { name: 'Ducks',     color: '#4a8a5a', words: ['Mallard', 'Drake', 'Gosling', 'Duckling', 'Pintail'] },
    body:       { name: 'Body',      color: '#c2726b', words: ['Shin', 'Wrist', 'Temple', 'Palm', 'Iris', 'Pupil', 'Arch'] },
    blooms:     { name: 'Blooms',    color: '#d4548c', words: ['Dahlia', 'Peony', 'Aster', 'Lupin', 'Poppy', 'Bluebell', 'Foxglove'] },
    buildings:  { name: 'Buildings', color: '#8a7a6a', words: ['Mill', 'Lodge', 'Manor', 'Abbey', 'Villa', 'Keep', 'Tower'] },
    trees:      { name: 'Trees',     color: '#4a7a3a', words: ['Willow', 'Birch', 'Cedar', 'Aspen', 'Alder', 'Elm', 'Beech'] },
    nuts:       { name: 'Nuts',      color: '#9e6b3a', words: ['Acorn', 'Chestnut', 'Walnut', 'Pecan', 'Almond', 'Hazel', 'Cashew', 'Pistachio', 'Peanut'] },

    /* ---- the vocabulary sets ----
       Each is a word and its synonyms. Words with no clear set of three or
       more synonyms were left out: chauvinist, demagogue, flush, junta,
       virago, askance, disenfranchise. */
    truthful:   { name: 'Truthful',   color: '#7a63d8', words: ['Aboveboard', 'Candid', 'Forthright', 'Honest'] },
    praise:     { name: 'Praise',     color: '#c2536b', words: ['Accolade', 'Tribute', 'Kudos'] },
    warlike:    { name: 'Warlike',    color: '#3a8a7a', words: ['Bellicose', 'Belligerent', 'Pugnacious', 'Combative'] },
    bringup:    { name: 'Bring Up',   color: '#b8742a', words: ['Broach', 'Introduce', 'Mention', 'Propose'] },
    frolic:     { name: 'Frolic',     color: '#4b68c9', words: ['Cavort', 'Romp', 'Gambol', 'Caper'] },
    rude:       { name: 'Rude',       color: '#8c3a6a', words: ['Churlish', 'Boorish', 'Gruff', 'Uncivil'] },
    cautious:   { name: 'Cautious',   color: '#4a8f4a', words: ['Circumspect', 'Wary', 'Prudent', 'Guarded'] },

    mercy:      { name: 'Mercy',      color: '#a8562a', words: ['Clemency', 'Leniency', 'Pardon', 'Grace'] },
    merge:      { name: 'Merge',      color: '#5a6fd8', words: ['Coalesce', 'Fuse', 'Unite', 'Blend'] },
    convincing: { name: 'Convincing', color: '#8a5fbf', words: ['Cogent', 'Persuasive', 'Compelling', 'Forceful'] },
    shortage:   { name: 'Shortage',   color: '#7a63d8', words: ['Dearth', 'Paucity', 'Scarcity', 'Lack'] },
    degrade:    { name: 'Degrade',    color: '#c2536b', words: ['Debase', 'Cheapen', 'Demean', 'Corrupt'] },
    propriety:  { name: 'Propriety',  color: '#3a8a7a', words: ['Decorum', 'Etiquette', 'Manners', 'Dignity'] },
    respect:    { name: 'Respect',    color: '#b8742a', words: ['Deference', 'Regard', 'Esteem', 'Homage'] },

    harmful:    { name: 'Harmful',    color: '#4b68c9', words: ['Deleterious', 'Damaging', 'Injurious', 'Noxious'] },
    object:     { name: 'Object To',  color: '#8c3a6a', words: ['Demur', 'Protest', 'Balk', 'Hesitate'] },
    mock:       { name: 'Mock',       color: '#4a8f4a', words: ['Deride', 'Ridicule', 'Taunt', 'Scorn'] },
    tyrant:     { name: 'Tyrant',     color: '#a8562a', words: ['Despot', 'Dictator', 'Autocrat', 'Oppressor'] },
    rant:       { name: 'Rant',       color: '#5a6fd8', words: ['Diatribe', 'Tirade', 'Harangue', 'Screed'] },
    preachy:    { name: 'Preachy',    color: '#8a5fbf', words: ['Didactic', 'Instructive', 'Moralizing', 'Pedantic'] },
    excusing:   { name: 'Excusing',   color: '#7a63d8', words: ['Extenuating', 'Mitigating', 'Justifying'] },

    swindle:    { name: 'Swindle',    color: '#c2536b', words: ['Fleece', 'Defraud', 'Bilk', 'Cheat'] },
    weariness:  { name: 'Weariness',  color: '#3a8a7a', words: ['Lassitude', 'Lethargy', 'Torpor', 'Fatigue'] },
    importance: { name: 'Importance', color: '#b8742a', words: ['Moment', 'Weight', 'Consequence', 'Gravity'] },
    plenty:     { name: 'Plenty',     color: '#4b68c9', words: ['Raft', 'Slew', 'Heap'] },
    full:       { name: 'Full',       color: '#8c3a6a', words: ['Replete', 'Stuffed', 'Brimming', 'Loaded'] },
    flinch:     { name: 'Flinch',     color: '#4a8f4a', words: ['Start', 'Jump', 'Jolt', 'Twitch'] },
    brawl:      { name: 'Brawl',      color: '#a8562a', words: ['Melee', 'Scuffle', 'Fracas', 'Skirmish'] },

    loner:      { name: 'Loner',      color: '#5a6fd8', words: ['Misanthrope', 'Cynic', 'Recluse', 'Grouch'] },
    hopeful:    { name: 'Hopeful',    color: '#8a5fbf', words: ['Sanguine', 'Optimistic', 'Upbeat', 'Buoyant'] },
    dazzling:   { name: 'Dazzling',   color: '#7a63d8', words: ['Scintillating', 'Sparkling', 'Brilliant', 'Vivid'] },
    resist:     { name: 'Resist',     color: '#c2536b', words: ['Buck', 'Oppose', 'Defy', 'Withstand'] },
    joking:     { name: 'Joking',     color: '#3a8a7a', words: ['Facetious', 'Flippant', 'Playful', 'Waggish'] },
    friendly:   { name: 'Friendly',   color: '#b8742a', words: ['Genial', 'Affable', 'Cordial', 'Amiable'] },
    refined:    { name: 'Refined',    color: '#4b68c9', words: ['Genteel', 'Courtly', 'Elegant'] },

    slick:      { name: 'Slick',      color: '#8c3a6a', words: ['Glib', 'Smooth', 'Facile', 'Superficial'] },
    hindered:   { name: 'Hindered',   color: '#4a8f4a', words: ['Hamstrung', 'Hobbled', 'Thwarted', 'Crippled'] },
    military:   { name: 'Military',   color: '#a8562a', words: ['Martial', 'Soldierly', 'Armed', 'Tactical'] },
    irritate:   { name: 'Irritate',   color: '#5a6fd8', words: ['Rankle', 'Gall', 'Annoy', 'Chafe'] },
    reject:     { name: 'Reject',     color: '#8a5fbf', words: ['Spurn', 'Rebuff', 'Snub', 'Shun'] },
    grumpy:     { name: 'Grumpy',     color: '#7a63d8', words: ['Surly', 'Sullen', 'Cranky', 'Testy'] },
    gaudy:      { name: 'Gaudy',      color: '#c2536b', words: ['Tawdry', 'Garish', 'Tacky', 'Flashy'] },

    uproar:     { name: 'Uproar',     color: '#3a8a7a', words: ['Tumult', 'Commotion', 'Turmoil', 'Bedlam'] },
    suave:      { name: 'Suave',      color: '#b8742a', words: ['Urbane', 'Sophisticated', 'Debonair', 'Worldly'] },
    sizable:    { name: 'Sizable',    color: '#4b68c9', words: ['Appreciable', 'Considerable', 'Substantial', 'Notable'] },
    dread:      { name: 'Dread',      color: '#8c3a6a', words: ['Apprehension', 'Anxiety', 'Unease', 'Foreboding'] },
    dominance:  { name: 'Dominance',  color: '#4a8f4a', words: ['Ascendancy', 'Supremacy', 'Sway', 'Primacy'] },
    struggle:   { name: 'Struggle',   color: '#a8562a', words: ['Flounder', 'Stumble', 'Falter', 'Blunder'] },
    cleverness: { name: 'Cleverness', color: '#5a6fd8', words: ['Ingenuity', 'Invention', 'Creativity', 'Wit'] },

    dilemma:    { name: 'Dilemma',    color: '#8a5fbf', words: ['Quandary', 'Predicament', 'Plight', 'Bind'] },
    sarcastic:  { name: 'Sarcastic',  color: '#7a63d8', words: ['Snide', 'Sneering', 'Catty', 'Cutting'] },
    impassive:  { name: 'Impassive',  color: '#c2536b', words: ['Stolid', 'Stoic', 'Unmoved', 'Wooden'] },
    fleeting:   { name: 'Fleeting',   color: '#3a8a7a', words: ['Transitory', 'Temporary', 'Brief', 'Passing'] },
    dislike:    { name: 'Dislike',    color: '#b8742a', words: ['Antipathy', 'Aversion', 'Loathing', 'Hostility'] },
    trite:      { name: 'Trite',      color: '#4b68c9', words: ['Banality', 'Cliche', 'Platitude', 'Truism'] },
    cowardly:   { name: 'Cowardly',   color: '#8c3a6a', words: ['Craven', 'Timid', 'Spineless', 'Gutless'] },

    impartial:  { name: 'Impartial',  color: '#4a8f4a', words: ['Dispassionate', 'Objective', 'Neutral', 'Detached'] },
    drawout:    { name: 'Draw Out',   color: '#a8562a', words: ['Elicit', 'Evoke', 'Extract', 'Provoke'] },
    learned:    { name: 'Learned',    color: '#5a6fd8', words: ['Erudite', 'Scholarly', 'Educated', 'Bookish'] },
    fussy:      { name: 'Fussy',      color: '#8a5fbf', words: ['Fastidious', 'Meticulous', 'Picky', 'Choosy'] },
    sneaky:     { name: 'Sneaky',     color: '#7a63d8', words: ['Furtive', 'Stealthy', 'Secretive', 'Sly'] },
    firebrand:  { name: 'Firebrand',  color: '#c2532a', words: ['Demagogue', 'Agitator', 'Zealot', 'Instigator'] },
    regime:     { name: 'Regime',     color: '#5a5a7a', words: ['Junta', 'Cabal', 'Faction', 'Clique'] }
};

/* rows  — cards dealt into the shortest tableau column; the four columns run
           rows, rows+1, rows+2, rows+3, and everything left over is the stock
   slack — spare moves on top of the solution the dealer worked out, as a
           fraction of it, before a capped pass through the deck is added
   minimal — ignore slack and allow exactly the solution the dealer found, so
           the level takes a near-perfect line to clear
   moves — a budget set by hand, which overrides slack and minimal both. The
           dealer throws away any deal it cannot solve inside that number, so
           a pin always leaves a line to the win; set one below what the level
           needs and the console says so and the deal falls back to minimal */
var LEVELS = [
    { name: 'Warm Up',       cats: ['greek', 'rest', 'suits', 'temps', 'lifestage'],                                    rows: 3, slack: 0.45 },
    { name: 'Kitchen',       cats: ['baked', 'drinks', 'cheese', 'berries', 'veg', 'soup'],                             rows: 3, moves: 45 },
    { name: 'Out and About', cats: ['cities', 'continents', 'weather', 'boats', 'golf', 'clouds'],                      rows: 4, slack: 0.38 },
    { name: 'Menagerie',     cats: ['catbreeds', 'bigcats', 'dogs', 'birdparts', 'bovines', 'pets', 'insects'],         rows: 4, slack: 0.35 },
    { name: 'Garden',        cats: ['flowers', 'treeparts', 'herbs', 'greens', 'fungi', 'geology', 'seasons'],          rows: 4, slack: 0.32 },
    { name: 'Pantry',        cats: ['coffee', 'tea', 'spices', 'bread', 'pasta', 'sauces', 'grains', 'citrus'],         rows: 5, slack: 0.30 },
    { name: 'Night Sky',     cats: ['planets', 'space', 'physics', 'math', 'metals', 'gems', 'chemistry', 'weights'],   rows: 5, slack: 0.28 },
    { name: 'Wardrobe',      cats: ['hats', 'shoes', 'fabrics', 'sewing', 'type', 'furniture', 'toolbox', 'skincare'],  rows: 5, slack: 0.26 },
    { name: 'Far Places',    cats: ['peaks', 'deserts', 'seas', 'islands', 'capitals', 'waters', 'rivers', 'winds'],    rows: 6, slack: 0.24 },
    { name: 'Games Night',   cats: ['boardgames', 'cardgames', 'darts', 'track', 'martialart', 'musicgenre', 'dance',
                                    'filmgenre', 'instrument'],                                                          rows: 6, slack: 0.22 },
    { name: 'Creatures',     cats: ['snakes', 'mammals', 'horses', 'gardenbird', 'catsounds', 'orchard', 'ocean',
                                    'amphibians'],                                                          rows: 6, slack: 0.20 },
    { name: 'Mixed Bag',     cats: ['robots', 'sticky', 'large', 'dessert', 'peppers', 'wine', 'fruit', 'beer'],        rows: 6, slack: 0.18 },

    /* the vocabulary levels: a word and its synonyms, set by set */
    { name: 'Plain Speech',  cats: ['truthful', 'praise', 'warlike', 'bringup', 'frolic', 'rude', 'cautious'],          rows: 4, slack: 0.34 },
    { name: 'Second Nature', cats: ['mercy', 'merge', 'convincing', 'shortage', 'degrade', 'propriety', 'respect'],     rows: 4, slack: 0.32 },
    { name: 'Sharp Tongue',  cats: ['harmful', 'object', 'mock', 'tyrant', 'rant', 'preachy', 'excusing'],              rows: 4, slack: 0.30 },
    { name: 'Short Measure', cats: ['swindle', 'weariness', 'importance', 'plenty', 'full', 'flinch', 'brawl'],         rows: 5, slack: 0.28 },
    { name: 'Good Company',  cats: ['loner', 'hopeful', 'dazzling', 'resist', 'joking', 'friendly', 'refined'],         rows: 5, slack: 0.26 },
    { name: 'Rough Edges',   cats: ['slick', 'hindered', 'military', 'irritate', 'reject', 'grumpy', 'gaudy'],          rows: 5, slack: 0.24 },
    { name: 'Upper Hand',    cats: ['uproar', 'suave', 'sizable', 'dread', 'dominance', 'struggle', 'cleverness'],      rows: 5, slack: 0.22 },
    { name: 'Tight Spot',    cats: ['dilemma', 'sarcastic', 'impassive', 'fleeting', 'dislike', 'trite', 'cowardly'],   rows: 5, slack: 0.20 },
    { name: 'Last Word',     cats: ['impartial', 'drawout', 'learned', 'fussy', 'sneaky', 'firebrand', 'regime'],       rows: 5, slack: 0.20 },

    /* the trap levels, where every word could pass for a category beside it */
    { name: 'Crossed Wires', cats: ['hardbirds', 'chess', 'poker', 'landform', 'fast', 'ships', 'tools', 'fishing'],    rows: 6, slack: 0.15 },
    { name: 'Double Lives',  cats: ['fish', 'colors', 'waterfowl', 'body', 'blooms', 'buildings', 'trees', 'nuts'],     rows: 6, slack: 0, minimal: true }
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

    Object.keys(CATEGORIES).forEach(function (id) {
        if (!used[id]) problems.push(id + ' is in no level');
    });

    return problems;
}
