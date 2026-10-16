/* Word Solitaire — category data and level definitions.

   Three rules hold across this file, and `checkLevels()` at the bottom
   enforces them in the console:
     - a word belongs to exactly one category, everywhere
     - a category belongs to exactly one level, so nothing repeats as you play
     - a category's name never matches a card in its own level, or the crowned
       card and a word card would read the same

   Level 1 is geography anyone knows. Every level after it is GRE vocabulary:
   each category is a plain-English meaning on the crowned card and the words
   that carry it. Sets run from four words to nine, deliberately mixed, so a
   board holds a spread of short and long sets rather than six of everything.
   Keep the crowned names plain — the hard part should be the words. */

var CATEGORIES = {
    /* ---- level 1: far places ---- */
    peaks:      { name: 'Peaks',     color: '#7a8a99', words: ['Everest', 'Denali', 'Fuji', 'Eiger', 'Kilimanjaro', 'Matterhorn', 'Olympus'] },
    deserts:    { name: 'Deserts',   color: '#c2a05a', words: ['Sahara', 'Gobi', 'Mojave', 'Kalahari', 'Atacama'] },
    seas:       { name: 'Seas',      color: '#2f7f9e', words: ['Baltic', 'Aegean', 'Caspian', 'Adriatic', 'Caribbean', 'Bering'] },
    islands:    { name: 'Islands',   color: '#3aa68a', words: ['Crete', 'Bali', 'Malta', 'Corfu', 'Sicily', 'Tahiti', 'Sardinia'] },
    capitals:   { name: 'Capitals',  color: '#4b8ce8', words: ['Oslo', 'Lima', 'Hanoi', 'Paris', 'Prague', 'Cairo', 'Ottawa', 'Dublin'] },
    waters:     { name: 'Waters',    color: '#2f8f9e', words: ['Lagoon', 'Fjord', 'Inlet', 'Strait', 'Estuary'] },
    rivers:     { name: 'Rivers',    color: '#2f9e8f', words: ['Nile', 'Amazon', 'Danube', 'Thames', 'Yangtze', 'Ganges'] },
    winds:      { name: 'Winds',     color: '#6fa8c9', words: ['Gale', 'Squall', 'Breeze', 'Gust'] },

    /* ---- the GRE sets ----
       Each is a meaning and the words that carry it. The original word list
       is all here, folded into bigger sets; words with no clear set of
       synonyms were left out: virago, askance, disenfranchise. */

    // level 2
    truthful:   { name: 'Truthful',    color: '#7a63d8', words: ['Aboveboard', 'Candid', 'Forthright', 'Veracious', 'Frank', 'Guileless'] },
    praise:     { name: 'Praise',      color: '#c2536b', words: ['Accolade', 'Laud', 'Extol', 'Acclaim', 'Commend', 'Plaudit', 'Encomium', 'Paean'] },
    warlike:    { name: 'Warlike',     color: '#3a8a7a', words: ['Bellicose', 'Belligerent', 'Pugnacious', 'Combative', 'Truculent', 'Martial', 'Militant'] },
    bringup:    { name: 'Bring Up',    color: '#b8742a', words: ['Broach', 'Moot', 'Propound', 'Ventilate', 'Raise'] },
    frolic:     { name: 'Frolic',      color: '#4b68c9', words: ['Cavort', 'Gambol', 'Romp', 'Caper', 'Frisk', 'Rollick'] },
    rude:       { name: 'Rude',        color: '#8c3a6a', words: ['Churlish', 'Surly', 'Boorish', 'Uncouth', 'Insolent', 'Impudent', 'Brusque', 'Uncivil'] },
    cautious:   { name: 'Cautious',    color: '#4a8f4a', words: ['Circumspect', 'Wary', 'Prudent', 'Chary', 'Leery', 'Heedful'] },
    friendly:   { name: 'Friendly',    color: '#d9853a', words: ['Genial', 'Affable', 'Cordial', 'Amiable', 'Convivial', 'Gregarious', 'Congenial'] },

    // level 3
    mercy:      { name: 'Mercy',       color: '#a8562a', words: ['Clemency', 'Leniency', 'Forbearance', 'Indulgence'] },
    merge:      { name: 'Merge',       color: '#5a6fd8', words: ['Coalesce', 'Amalgamate', 'Fuse', 'Meld', 'Conflate', 'Unify'] },
    convincing: { name: 'Convincing',  color: '#8a5fbf', words: ['Cogent', 'Compelling', 'Persuasive', 'Forceful', 'Telling'] },
    shortage:   { name: 'Shortage',    color: '#7a63d8', words: ['Dearth', 'Paucity', 'Scarcity', 'Deficiency', 'Want', 'Shortfall'] },
    degrade:    { name: 'Degrade',     color: '#c2536b', words: ['Debase', 'Demean', 'Abase', 'Cheapen', 'Vitiate'] },
    propriety:  { name: 'Propriety',   color: '#3a8a7a', words: ['Decorum', 'Etiquette', 'Protocol', 'Seemliness', 'Punctilio'] },
    respect:    { name: 'Respect',     color: '#b8742a', words: ['Deference', 'Esteem', 'Reverence', 'Veneration', 'Homage', 'Regard', 'Obeisance'] },
    criticize:  { name: 'Criticize',   color: '#a33b4a', words: ['Castigate', 'Excoriate', 'Upbraid', 'Berate', 'Chastise', 'Admonish', 'Censure', 'Reprove', 'Rebuke'] },

    // level 4
    harmful:    { name: 'Harmful',     color: '#4b68c9', words: ['Deleterious', 'Pernicious', 'Noxious', 'Baneful', 'Inimical', 'Detrimental', 'Injurious'] },
    object:     { name: 'Object To',   color: '#8c3a6a', words: ['Demur', 'Balk', 'Cavil', 'Quibble', 'Remonstrate', 'Expostulate'] },
    mock:       { name: 'Mock',        color: '#4a8f4a', words: ['Deride', 'Ridicule', 'Lampoon', 'Satirize', 'Taunt', 'Jeer', 'Scoff'] },
    tyrant:     { name: 'Tyrant',      color: '#a8562a', words: ['Despot', 'Autocrat', 'Dictator', 'Oppressor', 'Overlord'] },
    rant:       { name: 'Rant',        color: '#5a6fd8', words: ['Diatribe', 'Tirade', 'Harangue', 'Screed', 'Philippic', 'Invective'] },
    preachy:    { name: 'Preachy',     color: '#8a5fbf', words: ['Didactic', 'Sanctimonious', 'Moralistic', 'Homiletic', 'Sententious'] },
    excusing:   { name: 'Excusing',    color: '#7a63d8', words: ['Extenuating', 'Mitigating', 'Exculpatory', 'Vindicating'] },
    diligent:   { name: 'Hardworking', color: '#3a7a9e', words: ['Assiduous', 'Diligent', 'Sedulous', 'Industrious', 'Indefatigable', 'Tireless', 'Unflagging'] },

    // level 5
    swindle:    { name: 'Swindle',     color: '#c2536b', words: ['Fleece', 'Defraud', 'Bilk', 'Gull', 'Dupe', 'Hoodwink', 'Cozen', 'Bamboozle'] },
    weariness:  { name: 'Weariness',   color: '#3a8a7a', words: ['Lassitude', 'Lethargy', 'Torpor', 'Languor', 'Ennui', 'Listlessness', 'Enervation'] },
    importance: { name: 'Importance',  color: '#b8742a', words: ['Moment', 'Import', 'Gravity', 'Consequence', 'Significance', 'Weight'] },
    trivial:    { name: 'Trivial',     color: '#6f7f8c', words: ['Paltry', 'Trifling', 'Negligible', 'Petty', 'Piddling', 'Nugatory', 'Picayune'] },
    full:       { name: 'Full',        color: '#8c3a6a', words: ['Replete', 'Sated', 'Satiated', 'Brimming', 'Gorged', 'Teeming'] },
    abundance:  { name: 'Abundance',   color: '#4b68c9', words: ['Plethora', 'Profusion', 'Surfeit', 'Glut', 'Raft', 'Myriad', 'Cornucopia', 'Superfluity'] },
    flinch:     { name: 'Flinch',      color: '#4a8f4a', words: ['Start', 'Wince', 'Cower', 'Quail', 'Recoil', 'Blench'] },
    brawl:      { name: 'Brawl',       color: '#a8562a', words: ['Melee', 'Fracas', 'Fray', 'Scuffle', 'Affray', 'Donnybrook'] },

    // level 6
    loner:      { name: 'Loner',       color: '#5a6fd8', words: ['Misanthrope', 'Recluse', 'Hermit', 'Anchorite', 'Eremite'] },
    hopeful:    { name: 'Hopeful',     color: '#8a5fbf', words: ['Sanguine', 'Optimistic', 'Roseate', 'Bullish', 'Buoyant'] },
    dazzling:   { name: 'Dazzling',    color: '#d9a02a', words: ['Scintillating', 'Resplendent', 'Effulgent', 'Refulgent', 'Lustrous', 'Incandescent'] },
    defy:       { name: 'Defy',        color: '#c2536b', words: ['Buck', 'Flout', 'Contravene', 'Withstand', 'Oppose'] },
    joking:     { name: 'Joking',      color: '#3a8a7a', words: ['Facetious', 'Flippant', 'Jocular', 'Waggish', 'Droll', 'Jocose'] },
    refined:    { name: 'Refined',     color: '#4b68c9', words: ['Genteel', 'Cultivated', 'Courtly', 'Gracious', 'Cultured'] },
    wealthy:    { name: 'Wealthy',     color: '#b8862a', words: ['Flush', 'Affluent', 'Opulent', 'Moneyed', 'Prosperous'] },
    stubborn:   { name: 'Stubborn',    color: '#6b6b4e', words: ['Obdurate', 'Obstinate', 'Intransigent', 'Recalcitrant', 'Refractory', 'Intractable', 'Mulish', 'Pertinacious'] },

    // level 7
    slick:      { name: 'Slick',       color: '#8c3a6a', words: ['Glib', 'Facile', 'Unctuous', 'Oily', 'Superficial'] },
    hindered:   { name: 'Hindered',    color: '#4a8f4a', words: ['Hamstrung', 'Hobbled', 'Thwarted', 'Stymied', 'Fettered', 'Shackled', 'Impeded'] },
    irritate:   { name: 'Irritate',    color: '#5a6fd8', words: ['Rankle', 'Gall', 'Nettle', 'Chafe', 'Vex', 'Irk', 'Peeve', 'Pique'] },
    reject:     { name: 'Reject',      color: '#8a5fbf', words: ['Spurn', 'Rebuff', 'Repudiate', 'Snub', 'Shun', 'Eschew'] },
    gaudy:      { name: 'Gaudy',       color: '#c2536b', words: ['Tawdry', 'Garish', 'Meretricious', 'Flashy', 'Tacky', 'Ostentatious', 'Brassy'] },
    arrogant:   { name: 'Arrogant',    color: '#a33b4a', words: ['Haughty', 'Supercilious', 'Imperious', 'Overweening', 'Disdainful', 'Hubristic', 'Patronizing'] },
    soothe:     { name: 'Soothe',      color: '#3a8a7a', words: ['Placate', 'Mollify', 'Assuage', 'Appease', 'Pacify', 'Allay', 'Conciliate'] },
    firebrand:  { name: 'Firebrand',   color: '#c2532a', words: ['Demagogue', 'Agitator', 'Incendiary', 'Provocateur', 'Instigator'] },

    // level 8
    uproar:     { name: 'Uproar',      color: '#3a8a7a', words: ['Tumult', 'Commotion', 'Turmoil', 'Bedlam', 'Pandemonium', 'Furor', 'Hubbub', 'Maelstrom'] },
    suave:      { name: 'Suave',       color: '#b8742a', words: ['Urbane', 'Debonair', 'Sophisticated', 'Worldly', 'Cosmopolitan'] },
    sizable:    { name: 'Sizable',     color: '#4b68c9', words: ['Appreciable', 'Considerable', 'Substantial', 'Hefty'] },
    dread:      { name: 'Dread',       color: '#8c3a6a', words: ['Apprehension', 'Trepidation', 'Foreboding', 'Disquiet', 'Misgiving', 'Unease', 'Qualm'] },
    dominance:  { name: 'Dominance',   color: '#4a8f4a', words: ['Ascendancy', 'Hegemony', 'Supremacy', 'Primacy', 'Preeminence', 'Mastery'] },
    struggle:   { name: 'Struggle',    color: '#a8562a', words: ['Flounder', 'Falter', 'Stumble', 'Totter', 'Teeter', 'Waver'] },
    cleverness: { name: 'Cleverness',  color: '#5a6fd8', words: ['Ingenuity', 'Acumen', 'Acuity', 'Shrewdness', 'Perspicacity', 'Astuteness'] },
    obscure:    { name: 'Obscure',     color: '#6b6b6b', words: ['Abstruse', 'Arcane', 'Recondite', 'Esoteric', 'Opaque', 'Inscrutable', 'Cryptic'] },

    // level 9 — Short-lived and Concise are both "brief": one in time, one in words
    dilemma:    { name: 'Dilemma',     color: '#8a5fbf', words: ['Quandary', 'Predicament', 'Plight', 'Impasse', 'Conundrum', 'Imbroglio'] },
    sarcastic:  { name: 'Sarcastic',   color: '#7a63d8', words: ['Snide', 'Sardonic', 'Caustic', 'Mordant', 'Acerbic', 'Sneering', 'Scathing'] },
    impassive:  { name: 'Impassive',   color: '#c2536b', words: ['Stolid', 'Stoic', 'Phlegmatic', 'Imperturbable', 'Unflappable'] },
    fleeting:   { name: 'Short-lived', color: '#3a8a7a', words: ['Transitory', 'Ephemeral', 'Evanescent', 'Transient', 'Momentary', 'Fugacious'] },
    concise:    { name: 'Concise',     color: '#2f7f9e', words: ['Terse', 'Laconic', 'Pithy', 'Succinct', 'Curt', 'Crisp'] },
    wordy:      { name: 'Wordy',       color: '#b8742a', words: ['Verbose', 'Prolix', 'Loquacious', 'Garrulous', 'Voluble', 'Discursive'] },
    dislike:    { name: 'Dislike',     color: '#a33b4a', words: ['Antipathy', 'Aversion', 'Animus', 'Enmity', 'Animosity', 'Rancor', 'Loathing', 'Odium'] },
    trite:      { name: 'Trite',       color: '#4b68c9', words: ['Banality', 'Platitude', 'Bromide', 'Truism', 'Cliche', 'Commonplace'] },

    // level 10 — Impartial and Indifferent are the GRE's favourite pair:
    // disinterested means fair, uninterested means bored
    impartial:  { name: 'Impartial',   color: '#4a8f4a', words: ['Dispassionate', 'Disinterested', 'Objective', 'Unbiased', 'Equitable', 'Evenhanded', 'Neutral'] },
    indifferent:{ name: 'Indifferent', color: '#6f7f8c', words: ['Apathetic', 'Lackadaisical', 'Nonchalant', 'Insouciant', 'Blase', 'Uninterested'] },
    drawout:    { name: 'Draw Out',    color: '#a8562a', words: ['Elicit', 'Evoke', 'Extract', 'Educe'] },
    learned:    { name: 'Learned',     color: '#5a6fd8', words: ['Erudite', 'Scholarly', 'Lettered', 'Bookish', 'Donnish'] },
    fussy:      { name: 'Fussy',       color: '#8a5fbf', words: ['Fastidious', 'Meticulous', 'Punctilious', 'Finicky', 'Persnickety', 'Exacting', 'Scrupulous'] },
    sneaky:     { name: 'Sneaky',      color: '#7a63d8', words: ['Furtive', 'Surreptitious', 'Clandestine', 'Covert', 'Stealthy', 'Sly', 'Underhanded'] },
    circle:     { name: 'Inner Circle', color: '#5a5a7a', words: ['Junta', 'Cabal', 'Coterie', 'Faction', 'Clique', 'Camarilla'] },
    fanatic:    { name: 'Fanatic',     color: '#c2532a', words: ['Zealot', 'Bigot', 'Chauvinist', 'Jingoist', 'Partisan', 'Sectarian'] },
    cowardly:   { name: 'Cowardly',    color: '#8c3a6a', words: ['Craven', 'Pusillanimous', 'Timorous', 'Spineless', 'Recreant', 'Fainthearted'] }
};

/* rows  — cards dealt into the shortest tableau column; the four columns run
           rows, rows+1, rows+2, rows+3, and everything left over is the stock
   slack — spare moves on top of the dealer's line, as a fraction of it
   tries — how many playouts the dealer runs before it sets the budget from
           the shortest line (12 if left out). One try is plain greedy play,
           so the obvious move every time always gets home; more tries find
           shorter lines and leave a plain player less room
   minimal — ignore slack and allow exactly the line the dealer found, so the
           level takes a near-perfect game to clear
   moves — a budget set by hand, which overrides slack and minimal both. The
           dealer throws away any deal it cannot win inside that number, so a
           pin always leaves a line to the win; set one below what the level
           needs and the console says so and the deal falls back to minimal */
var LEVELS = [
    { name: 'Far Places',    cats: ['peaks', 'deserts', 'seas', 'islands', 'capitals', 'waters', 'rivers', 'winds'],              rows: 4, tries: 1, slack: 0.15 },

    { name: 'Plain Speech',  cats: ['truthful', 'praise', 'warlike', 'bringup', 'frolic', 'rude', 'cautious', 'friendly'],       rows: 5, tries: 1, slack: 0.13 },
    { name: 'Second Nature', cats: ['mercy', 'merge', 'convincing', 'shortage', 'degrade', 'propriety', 'respect', 'criticize'], rows: 5, tries: 1, slack: 0.12 },
    { name: 'Sharp Tongue',  cats: ['harmful', 'object', 'mock', 'tyrant', 'rant', 'preachy', 'excusing', 'diligent'],           rows: 5, tries: 2, slack: 0.11 },
    { name: 'Short Measure', cats: ['swindle', 'weariness', 'importance', 'trivial', 'full', 'abundance', 'flinch', 'brawl'],    rows: 5, tries: 3, slack: 0.10 },
    { name: 'Good Company',  cats: ['loner', 'hopeful', 'dazzling', 'defy', 'joking', 'refined', 'wealthy', 'stubborn'],         rows: 5, tries: 4, slack: 0.09 },
    { name: 'Rough Edges',   cats: ['slick', 'hindered', 'irritate', 'reject', 'gaudy', 'arrogant', 'soothe', 'firebrand'],      rows: 6, slack: 0.08 },
    { name: 'Upper Hand',    cats: ['uproar', 'suave', 'sizable', 'dread', 'dominance', 'struggle', 'cleverness', 'obscure'],    rows: 6, slack: 0.07 },
    { name: 'Tight Spot',    cats: ['dilemma', 'sarcastic', 'impassive', 'fleeting', 'concise', 'wordy', 'dislike', 'trite'],    rows: 6, slack: 0.05 },
    { name: 'Last Word',     cats: ['impartial', 'indifferent', 'drawout', 'learned', 'fussy', 'sneaky', 'circle', 'fanatic',
                                    'cowardly'],                                                                                 rows: 6, slack: 0, minimal: true }
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
