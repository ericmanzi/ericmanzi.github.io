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
    cowardly:   { name: 'Cowardly',    color: '#8c3a6a', words: ['Craven', 'Pusillanimous', 'Timorous', 'Spineless', 'Recreant', 'Fainthearted'] },

    /* ---- levels 11-16 ----
       Built from a second word list. Where its words share a meaning they
       make a synonym set, as before; where they share only a subject they
       make a themed one (Water, Military, Faith). A word in a set that is not
       on the list is there to fill it out. The 27 list words already in the
       game stay where they were; eugenic is left out. */
    // level 11
    outofline:  { name: 'Out of Line',  color: '#7a63d8', words: ['Bumptious', 'Contumacious', 'Obstreperous', 'Unseemly', 'Raucous', 'Fractious'] },
    work:       { name: 'Work',         color: '#c2536b', words: ['Drudgery', 'Travail', 'Tedium', 'Desultory', 'Slog'] },
    worthless:  { name: 'Worthless',    color: '#3a8a7a', words: ['Dross', 'Bootless', 'Futile', 'Chaff', 'Dregs'] },
    growth:     { name: 'Growth',       color: '#b8742a', words: ['Efflorescent', 'Fructify', 'Fecundity', 'Gestate', 'Accretion', 'Burgeon'] },
    highslows:  { name: 'Highs & Lows', color: '#4b68c9', words: ['Acme', 'Culmination', 'Nadir', 'Apex', 'Zenith'] },
    style:      { name: 'Style',        color: '#8c3a6a', words: ['Disheveled', 'Askew', 'Ungainly', 'Rococo', 'Modish', 'Affected', 'Sumptuous'] },
    lessen:     { name: 'Lessen',       color: '#4a8f4a', words: ['Curtail', 'Abate', 'Skimp', 'Diminish', 'Dwindle'] },

    // level 12
    innerlife:  { name: 'Inner Life',   color: '#a8562a', words: ['Ken', 'Volition', 'Pathos', 'Credence', 'Conscience', 'Intuition'] },
    writing:    { name: 'Writing',      color: '#5a6fd8', words: ['Epilogue', 'Compendium', 'Gazette', 'Effusion', 'Cognomen', 'Emend', 'Adumbration'] },
    timing:     { name: 'Timing',       color: '#8a5fbf', words: ['Abeyance', 'Biennial', 'Diurnal', 'Concomitant', 'Hiatus'] },
    food:       { name: 'Food & Drink', color: '#2f7f9e', words: ['Victuals', 'Masticate', 'Imbibe', 'Offal', 'Piquant', 'Acetic', 'Acidulous', 'Abstemious'] },
    ghostly:    { name: 'Ghostly',      color: '#6f7f8c', words: ['Wraith', 'Uncanny', 'Ethereal', 'Tenebrous', 'Spectral', 'Eerie'] },
    sorts:      { name: 'Out of Sorts', color: '#7a63d8', words: ['Dispirited', 'Abash', 'Umbrage', 'Bristle', 'Crotchety', 'Testy', 'Taciturn'] },
    urge:       { name: 'Urge',         color: '#c2536b', words: ['Actuate', 'Importune', 'Inculcate', 'Hortatory', 'Exhort', 'Spur'] },

    // level 13
    grant:      { name: 'Give & Agree', color: '#3a8a7a', words: ['Vouchsafe', 'Deign', 'Endue', 'Accede', 'Fain', 'Bestow'] },
    landsky:    { name: 'Land & Sky',   color: '#b8742a', words: ['Acclivity', 'Hummock', 'Slough', 'Aerie', 'Welkin'] },
    healing:    { name: 'Healing',      color: '#4b68c9', words: ['Emollient', 'Analgesia', 'Palliate', 'Salubrious', 'Salutary', 'Astringent'] },
    fanciful:   { name: 'Fanciful',     color: '#8c3a6a', words: ['Quixotic', 'Chimerical', 'Vagary', 'Whimsical', 'Utopian'] },
    trickery:   { name: 'Trickery',     color: '#4a8f4a', words: ['Artifice', 'Duplicity', 'Blandish', 'Foist', 'Chicanery', 'Subterfuge'] },
    disaster:   { name: 'Disaster',     color: '#a8562a', words: ['Debacle', 'Dire', 'Baleful', 'Wreak', 'Jeopardy', 'Calamity'] },
    rogues:     { name: 'Rogues',       color: '#5a6fd8', words: ['Malefactor', 'Dastard', 'Curmudgeon', 'Dolt', 'Laggard', 'Malingerer'] },
    admirable:  { name: 'Admirable',    color: '#8a5fbf', words: ['Probity', 'Sagacious', 'Eminent', 'Laudatory', 'Illustrious'] },

    // level 14
    harsh:      { name: 'Harsh Words',  color: '#2f7f9e', words: ['Billingsgate', 'Calumniate', 'Opprobrious', 'Chide', 'Captious', 'Carping', 'Deprecatory'] },
    people:     { name: 'People',       color: '#6f7f8c', words: ['Neophyte', 'Dilettante', 'Pariah', 'Denizen', 'Kith', 'Numismatist'] },
    onthemove:  { name: 'On the Move',  color: '#7a63d8', words: ['Lope', 'Canter', 'Errant', 'Digress', 'Circuitous', 'Conveyance'] },
    weather:    { name: 'Weather',      color: '#c2536b', words: ['Swelter', 'Dank', 'Muggy', 'Sultry', 'Clammy'] },
    money:      { name: 'Money',        color: '#3a8a7a', words: ['Usury', 'Peculation', 'Hypothecate', 'Munificent', 'Fritter', 'Mulct', 'Beholden'] },
    trinkets:   { name: 'Trinkets',     color: '#b8742a', words: ['Bauble', 'Amulet', 'Gewgaw', 'Talisman', 'Curio'] },
    captivate:  { name: 'Captivate',    color: '#4b68c9', words: ['Engross', 'Enthrall', 'Beguile', 'Mesmerize', 'Rivet'] },
    senses:     { name: 'Senses',       color: '#8c3a6a', words: ['Descry', 'Odorous', 'Mellifluous', 'Olfactory', 'Tactile'] },

    // level 15
    nerve:      { name: 'Nerve',        color: '#4a8f4a', words: ['Aplomb', 'Sangfroid', 'Equanimity', 'Equable', 'Mettle', 'Doughty'] },
    language:   { name: 'Language',     color: '#a8562a', words: ['Aver', 'Avouch', 'Controvert', 'Advert', 'Analogy', 'Circumlocution', 'Exegesis', 'Denotation', 'Demotic'] },
    wicked:     { name: 'Wicked',       color: '#5a6fd8', words: ['Iniquitous', 'Dissolute', 'Impious', 'Bestial', 'Impenitent', 'Turpitude', 'Reprobate'] },
    bodily:     { name: 'Body',         color: '#8a5fbf', words: ['Corporeal', 'Somatic', 'Adipose', 'Hirsute', 'Corpulent', 'Ruddy', 'Lissome', 'Dexterous'] },
    water:      { name: 'Water',        color: '#2f7f9e', words: ['Brackish', 'Turbid', 'Tepid', 'Quay', 'Ewer', 'Shoal', 'Gaff'] },
    light:      { name: 'Light',        color: '#6f7f8c', words: ['Lucent', 'Fulgent', 'Luster', 'Burnish', 'Gloaming', 'Lambent'] },
    extent:     { name: 'Extent',       color: '#7a63d8', words: ['Exiguous', 'Arrant', 'Catholic', 'Illimitable', 'Boundless'] },
    letgo:      { name: 'Let Go',       color: '#c2536b', words: ['Abjure', 'Jettison', 'Excision', 'Cull', 'Disabuse', 'Emancipate'] },

    // level 16
    faith:      { name: 'Faith',        color: '#3a8a7a', words: ['Benison', 'Genuflect', 'Desecrate', 'Expiate', 'Avatar', 'Asceticism', 'Troth', 'Augury'] },
    military:   { name: 'Military',     color: '#b8742a', words: ['Citadel', 'Bivouac', 'Barrage', 'Beleaguer', 'Holster', 'Panoply', 'Accoutre', 'Pommel', 'Cache'] },
    shallow:    { name: 'Shallow',      color: '#4b68c9', words: ['Puerile', 'Sophomoric', 'Jejune', 'Vacuous', 'Vapid', 'Inane'] },
    law:        { name: 'Law',          color: '#8c3a6a', words: ['Arraign', 'Amnesty', 'Durance', 'Imputation', 'Fiat', 'Indict'] },
    deathage:   { name: 'Death & Age',  color: '#4a8f4a', words: ['Epitaph', 'Necrology', 'Crone', 'Dotage', 'Decrepit', 'Lugubrious'] },
    spin:       { name: 'Spin',         color: '#a8562a', words: ['Centrifugal', 'Centripetal', 'Whorl', 'Welter', 'Vortex'] },
    spirits:    { name: 'High Spirits', color: '#5a6fd8', words: ['Ebullient', 'Vivacious', 'Frolicsome', 'Revelry', 'Geniality', 'Ardor', 'Witticism', 'Burlesque'] },
    stick:      { name: 'Stick & Bind', color: '#8a5fbf', words: ['Congeal', 'Cohere', 'Glutinous', 'Batten', 'Swathe', 'Adhere'] }
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
   extra — a flat number of moves added on top of the budget, whichever way
           it was worked out (but not on top of a `moves` pin)
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
                                    'cowardly'],                                                                                 rows: 6, slack: 0, minimal: true, extra: 5 },

    /* from the second word list, smallest deck first */
    { name: 'Fine Print',   cats: ['outofline', 'work', 'worthless', 'growth', 'highslows', 'style', 'lessen'],
                                    rows: 6, slack: 0.07 },
    { name: 'Deep Water',   cats: ['innerlife', 'writing', 'timing', 'food', 'ghostly', 'sorts', 'urge'],
                                    rows: 6, slack: 0.07 },
    { name: 'Hard Words',   cats: ['grant', 'landsky', 'healing', 'fanciful', 'trickery', 'disaster', 'rogues', 'admirable'],
                                    rows: 6, slack: 0.06 },
    { name: 'Old Guard',    cats: ['harsh', 'people', 'onthemove', 'weather', 'money', 'trinkets', 'captivate', 'senses'],
                                    rows: 6, slack: 0.06 },
    { name: 'Fair Game',    cats: ['nerve', 'language', 'wicked', 'bodily', 'water', 'light', 'extent', 'letgo'],
                                    rows: 6, slack: 0.05 },
    { name: 'Endgame',      cats: ['faith', 'military', 'shallow', 'law', 'deathage', 'spin', 'spirits', 'stick'],
                                    rows: 6, slack: 0.05 }
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
