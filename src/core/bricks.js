// src/core/bricks.js

export const BRICKS = [
    // ---------------------------------------------------------
    // GENRES ORIGINAUX (5)
    // ---------------------------------------------------------
    {
        name: { fr: "Techno Euphorique", en: "Euphoric Techno", pt: "Techno Eufórico", zh: "欢快 Techno" },
        _group: 'electronic', bpm: 130, modeName: "Ionian", rootValue: 0, tuning: "Standard",
        guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: {
            fr: "Grosse caisse 'Four-on-the-floor' avec un 'Rumble' en sidechain sur la basse.",
            en: "Four-on-the-floor kick with a sidechained 'Rumble' on the bass.",
            pt: "Bumbo 'Four-on-the-floor' com um 'Rumble' em sidechain no baixo.",
            zh: "四四拍底鼓，低音带有侧链 'Rumble' 效果。"
        },
        examples: {
            fr: "Progression: 1 - 5 - 4 - 1. Rythme 16èmes de notes.",
            en: "Progression: 1 - 5 - 4 - 1. 16th note rhythms.",
            pt: "Progressão: 1 - 5 - 4 - 1. Ritmos de semicolcheia.",
            zh: "和弦进行: 1 - 5 - 4 - 1. 十六分音符节奏。"
        },
        theme: { primary: '#00e5ff', bg: '#001a1f' },
        nnsProgression: ['1', '5', '4', '1'], nnsProgressionVariation: ['1', '6-', '4', '5'],
        drumTracks: [ { name: 'Kick', activeSteps: [0, 4, 8, 12] }, { name: 'Hat', activeSteps: [2, 6, 10, 14] } ],
        drumTracksVariation: [ { name: 'Kick', activeSteps: [0, 4, 8, 12] }, { name: 'Hat', activeSteps: [2, 6, 10, 14] }, { name: 'Snare', activeSteps: [4, 12] } ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14], lowVelocitySteps: [2, 6, 10, 14] } ]
    },
    {
        name: { fr: "Psytrance Nostalgique", en: "Nostalgic Psytrance", pt: "Psytrance Nostálgico", zh: "怀旧 Psytrance" },
        _group: 'electronic', bpm: 140, modeName: "Dorian", rootValue: 2, tuning: "Standard",
        guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Basse KBBB très serrée. Cible la 6te majeure.", en: "Tight KBBB rolling bass. Target major 6th.", pt: "Baixo KBBB muito firme.", zh: "紧凑的 KBBB 滚动低音。" },
        examples: { fr: "Progression: 1- - 6 - 7 - 1-. Arpèges rapides.", en: "Progression: 1- - 6 - 7 - 1-. Fast arpeggios.", pt: "Progressão: 1- - 6 - 7 - 1-.", zh: "和弦进行: 1- - 6 - 7 - 1-." },
        theme: { primary: '#b000ff', bg: '#1a0026' },
        nnsProgression: ['1-', '6', '7', '1-'], nnsProgressionVariation: ['1-', 'b3', '4', '5'],
        drumTracks: [ { name: 'Kick', activeSteps: [0, 4, 8, 12] } ],
        drumTracksVariation: [ { name: 'Kick', activeSteps: [0, 4, 8, 12] }, { name: 'Hat', activeSteps: [2, 6, 10, 14] } ],
        melodyTracks: [ { name: 'Bass', activeSteps: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], lowVelocitySteps: [1, 5, 9, 13], pitchSteps: { 1: 'R', 2: '8va', 3: '5', 5: 'R', 6: '8va', 7: '5', 9: 'R', 10: '8va', 11: '5', 13: 'R', 14: '8va', 15: '5' } } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], pitchSteps: { 1: 'R', 2: '5', 3: '8va', 5: 'R', 6: '5', 7: '8va', 9: 'R', 10: '5', 11: '8va', 13: 'R', 14: '5', 15: '8va' } } ]
    },
    {
        name: { fr: "Metal Épique", en: "Epic Metal", pt: "Metal Épico", zh: "史诗金属" },
        _group: 'rock', bpm: 180, modeName: "Phrygian", rootValue: 4, tuning: "Drop D",
        guitarStrings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['D1', 'A1', 'D2', 'G2'],
        effects: { fr: "Power chords avec distorsion et 'chugs'.", en: "Distorted power chords with palm-muted 'chugs'.", pt: "Power chords com distorção.", zh: "带有失真的强力和弦。" },
        examples: { fr: "Rythme galopant.", en: "Galloping rhythm.", pt: "Ritmo galopante.", zh: "奔腾节奏。" },
        theme: { primary: '#ff3300', bg: '#260000' },
        nnsProgression: ['1', 'b2', 'b6', '5'], nnsProgressionVariation: ['1', 'b5', '4', 'b2'],
        drumTracks: [ { name: 'Kick', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] }, { name: 'Snare', activeSteps: [4, 12] } ],
        drumTracksVariation: [ { name: 'Kick', activeSteps: [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14] }, { name: 'Snare', activeSteps: [4, 12] }, { name: 'Crash', activeSteps: [0] } ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 1, 2, 3, 4, 5, 6] } ]
    },
    {
        name: { fr: "Reggae Joyeux", en: "Joyful Reggae", pt: "Reggae Alegre", zh: "欢快雷鬼" },
        _group: 'world', bpm: 90, modeName: "Ionian", rootValue: 7, tuning: "Standard",
        guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Skank sur le contretemps.", en: "Skank on the offbeats.", pt: "Skank no contratempo.", zh: "反拍上的 Skank。" },
        examples: { fr: "Beat 'One Drop'.", en: "'One Drop' beat.", pt: "Batida 'One Drop'.", zh: "'One Drop' 鼓点。" },
        theme: { primary: '#00ff00', bg: '#002600' },
        nnsProgression: ['1', '4', '5', '4'], nnsProgressionVariation: ['1', '2-', '5', '1'],
        drumTracks: [ { name: 'Kick', activeSteps: [8] }, { name: 'Rim', activeSteps: [8] }, { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } ],
        drumTracksVariation: [ { name: 'Kick', activeSteps: [0, 4, 8, 12] }, { name: 'Rim', activeSteps: [4, 12] }, { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 3, 8, 11] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [2, 6, 10, 14] } ]
    },
    {
        name: { fr: "Ambient Berlin School", en: "Berlin School Ambient", pt: "Ambient Berlin School", zh: "柏林学派氛围音乐" },
        _group: 'electronic', bpm: 110, modeName: "Lydian", rootValue: 5, tuning: "Standard",
        guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Séquences hypnotiques avec 'Ratcheting'.", en: "Hypnotic sequences with 'Ratcheting'.", pt: "Sequências hipnóticas.", zh: "带有 'Ratcheting' 的催眠序列。" },
        examples: { fr: "Drone on 1. Polyrhythms.", en: "Drone on 1. Polyrhythms.", pt: "Drone no 1. Polirritmias.", zh: "复合节奏。" },
        theme: { primary: '#ff00ff', bg: '#260026' },
        nnsProgression: ['1', '1', '4', '1'], nnsProgressionVariation: ['1', '5', '4', '1'],
        drumTracks: [], drumTracksVariation: [ { name: 'Hat', activeSteps: [0, 1, 2, 3] } ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 1, 2, 3, 4, 5, 6, 7] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 1, 2, 3, 4, 5, 6, 11, 14] } ]
    },

    // ---------------------------------------------------------
    // GENRES ADDITIONNELS (8)
    // ---------------------------------------------------------
    {
        name: { fr: "Hip-Hop Boom Bap", en: "Oldschool Boom Bap", pt: "Hip-Hop Oldschool", zh: "老派嘻哈" },
        _group: 'urban', bpm: 88, modeName: "Aeolian", rootValue: 1,
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Rythmique swinguée, basse lourde et chaude.", en: "Swung rhythm, warm heavy bass.", pt: "Ritmo com swing, baixo pesado.", zh: "摇摆节奏，厚重的低音。" },
        examples: { fr: "Caisse claire sur les temps 2 et 4.", en: "Snare on 2 and 4.", pt: "Caixa nos tempos 2 e 4.", zh: "2和4拍上的军鼓。" },
        theme: { primary: '#fbc02d', bg: '#261b00' },
        nnsProgression: ['1-', '4-', '5-', '1-'], nnsProgressionVariation: ['1-', '6', '7', '1-'],
        drumTracks: [ { name: 'Kick', activeSteps: [0, 9] }, { name: 'Snare', activeSteps: [4, 12] }, { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14], lowVelocitySteps: [2, 6, 10, 14] } ],
        drumTracksVariation: [ { name: 'Kick', activeSteps: [0, 7, 10] }, { name: 'Snare', activeSteps: [4, 12] }, { name: 'Hat', activeSteps: [0, 4, 8, 12] } ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 3, 8, 9] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 2, 4, 7, 10] } ]
    },
    {
        name: { fr: "Trap / Hip-Hop Récent", en: "Modern Trap", pt: "Trap Moderno", zh: "现代陷阱说唱" },
        _group: 'urban', bpm: 140, modeName: "Phrygian", rootValue: 3,
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Charlestons très rapides (Rolls) et grosse caisse 808 glissante.", en: "Fast hi-hat rolls and gliding 808 kicks.", pt: "Hi-hats muito rápidos e baixo 808.", zh: "快速的踩镲滚奏和滑音 808 底鼓。" },
        examples: { fr: "Ressenti 'Halftime' avec la caisse claire sur le temps 3.", en: "Halftime feel with snare on beat 3.", pt: "Sensação 'Halftime'.", zh: "半拍感觉。" },
        theme: { primary: '#ff1744', bg: '#1f0005' },
        nnsProgression: ['1', 'b2', '1', 'b2'], nnsProgressionVariation: ['1', '1', 'b6', '5'],
        drumTracks: [ { name: 'Kick', activeSteps: [0, 10] }, { name: 'Snare', activeSteps: [8] }, { name: 'Hat', activeSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], lowVelocitySteps: [1, 3, 5, 7, 9, 11, 13, 15] } ],
        drumTracksVariation: [ { name: 'Kick', activeSteps: [0, 2, 10, 11] }, { name: 'Snare', activeSteps: [8] }, { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 10] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 8, 14] } ]
    },
    {
        name: { fr: "Funk Groovy", en: "Groovy Funk", pt: "Funk Clássico", zh: "律动放克" },
        _group: 'pop', bpm: 105, modeName: "Dorian", rootValue: 4,
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Basse très syncopée (Slap) et guitare rythmique type 'Cocotte'.", en: "Syncopated slap bass and scratchy rhythm guitar.", pt: "Baixo sincopado e guitarra rítmica.", zh: "切分音贝司和扫弦吉他。" },
        examples: { fr: "Accent sur le premier temps (The One).", en: "Heavy accent on 'The One'.", pt: "Acento forte no tempo 1.", zh: "重音在第一拍。" },
        theme: { primary: '#ff9100', bg: '#2b1600' },
        nnsProgression: ['1-', '4', '1-', '4'], nnsProgressionVariation: ['1-', '1-', '2-', '5'],
        drumTracks: [ { name: 'Kick', activeSteps: [0, 8, 14] }, { name: 'Snare', activeSteps: [4, 12] }, { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } ],
        drumTracksVariation: [ { name: 'Kick', activeSteps: [0, 7, 10] }, { name: 'Snare', activeSteps: [4, 9, 12] }, { name: 'Hat', activeSteps: [2, 6, 10, 14] } ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 3, 7, 10, 14], pitchSteps: { 0: 'R', 3: '5', 7: 'R', 10: 'b7', 14: '5' } } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 2, 3, 8, 10, 12], pitchSteps: { 0: 'R', 2: '3', 3: '5', 8: 'R', 10: 'b7', 12: '8va' } } ]
    },
    {
        name: { fr: "Rock 60s (Pop Rock)", en: "60s Rock", pt: "Rock Anos 60", zh: "60年代摇滚" },
        _group: 'rock', bpm: 120, modeName: "Mixolydian", rootValue: 9,
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Rythme droit, accords ouverts et basse mélodique.", en: "Straight rhythm, open chords and melodic bass.", pt: "Ritmo reto, acordes abertos.", zh: "直白节奏，开放和弦。" },
        examples: { fr: "Grosse caisse sur 1 et 3, caisse claire sur 2 et 4.", en: "Kick on 1 & 3, Snare on 2 & 4.", pt: "Bumbo no 1 e 3, Caixa no 2 e 4.", zh: "1和3拍底鼓，2和4拍军鼓。" },
        theme: { primary: '#4dd0e1', bg: '#002226' },
        nnsProgression: ['1', '4', '5', '4'], nnsProgressionVariation: ['1', 'b7', '4', '1'],
        drumTracks: [ { name: 'Kick', activeSteps: [0, 8] }, { name: 'Snare', activeSteps: [4, 12] }, { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } ],
        drumTracksVariation: [ { name: 'Kick', activeSteps: [0, 8, 10] }, { name: 'Snare', activeSteps: [4, 12] }, { name: 'Crash', activeSteps: [0] } ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 4, 8, 12] } ]
    },
    {
        name: { fr: "Rock Progressif", en: "Progressive Rock", pt: "Rock Progressivo", zh: "前卫摇滚" },
        _group: 'rock', bpm: 135, modeName: "Lydian", rootValue: 2,
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Polyrhythmies, accents décalés créant une illusion de mesure asymétrique.", en: "Polyrhythms, off-beat accents creating odd-meter illusions.", pt: "Polirritmias, acentos deslocados.", zh: "复合节奏，错位重音。" },
        examples: { fr: "Accentuation par groupes de 3 croches (3-3-2).", en: "Accents in groups of 3 (3-3-2 feel).", pt: "Acentuação em grupos de 3.", zh: "3-3-2 节奏感觉。" },
        theme: { primary: '#ab47bc', bg: '#1c0024' },
        nnsProgression: ['1', '2', '4', '5'], nnsProgressionVariation: ['1', '3-', '4', '2'],
        drumTracks: [ { name: 'Kick', activeSteps: [0, 3, 6, 10, 13] }, { name: 'Snare', activeSteps: [8] }, { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } ],
        drumTracksVariation: [ { name: 'Kick', activeSteps: [0, 5, 10] }, { name: 'Snare', activeSteps: [4, 12] }, { name: 'Hat', activeSteps: [0, 3, 6, 9, 12] } ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 3, 6, 10, 13] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } ]
    },
    {
        name: { fr: "House / Deep House", en: "House", pt: "House", zh: "浩室音乐" },
        _group: 'electronic', bpm: 124, modeName: "Aeolian", rootValue: 6,
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Groove constant 'Four-on-the-floor' avec charleston ouvert sur les contre-temps.", en: "Constant 4/4 groove with open hi-hats on offbeats.", pt: "Groove constante 4/4 com hi-hats no contratempo.", zh: "持续的 4/4 律动，反拍开启踩镲。" },
        examples: { fr: "Caisse claire/Clap sur les temps 2 et 4.", en: "Clap/Snare on beats 2 and 4.", pt: "Clap nos tempos 2 e 4.", zh: "2和4拍上的拍手/军鼓。" },
        theme: { primary: '#64dd17', bg: '#0b1a00' },
        nnsProgression: ['1-', '7', '6', '7'], nnsProgressionVariation: ['1-', '4-', '5-', '1-'],
        drumTracks: [ { name: 'Kick', activeSteps: [0, 4, 8, 12] }, { name: 'Snare', activeSteps: [4, 12] }, { name: 'Hat', activeSteps: [2, 6, 10, 14] } ],
        drumTracksVariation: [ { name: 'Kick', activeSteps: [0, 4, 8, 12] }, { name: 'Snare', activeSteps: [4, 12] }, { name: 'Hat', activeSteps: [2, 6, 10, 14] }, { name: 'Rim', activeSteps: [3, 7, 15] } ],
        melodyTracks: [ { name: 'Bass', activeSteps: [2, 6, 10, 14] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 3, 8, 11] } ]
    },
    {
        name: { fr: "Thrash / Groove Metal", en: "Groove Metal", pt: "Thrash / Groove Metal", zh: "激流/律动金属" },
        _group: 'rock', bpm: 160, modeName: "Locrian", rootValue: 4,
        tuning: "Drop D", guitarStrings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['D1', 'A1', 'D2', 'G2'],
        effects: { fr: "Riffs lourds, dissonants, et double pédale agressive.", en: "Heavy, dissonant riffs and aggressive double kick.", pt: "Riffs pesados e pedal duplo agressivo.", zh: "沉重不和谐的连段和激烈的双底鼓。" },
        examples: { fr: "Attaque constante, étouffement des cordes (Palm Mute).", en: "Constant attack, heavy palm muting.", pt: "Ataque constante, palm muting.", zh: "持续的攻击感，手掌闷音。" },
        theme: { primary: '#d50000', bg: '#1a0000' },
        nnsProgression: ['1°', 'b2', 'b5', '1°'], nnsProgressionVariation: ['1°', 'b5', 'b3', 'b2'],
        drumTracks: [ { name: 'Kick', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] }, { name: 'Snare', activeSteps: [4, 12] }, { name: 'Crash', activeSteps: [0] } ],
        drumTracksVariation: [ { name: 'Kick', activeSteps: [0, 1, 3, 4, 8, 9, 11, 12] }, { name: 'Snare', activeSteps: [4, 12] } ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 1, 3, 4, 8, 9, 11, 12] } ]
    },
    {
        name: { fr: "Musique Orientale / Arabe", en: "Middle Eastern", pt: "Música Árabe", zh: "中东音乐" },
        _group: 'world', bpm: 100, modeName: "PhrygianDominant", rootValue: 2,
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Rythme de Darbuka (Dum-Tek) et intervalles exotiques avec la seconde mineure et tierce majeure.", en: "Darbuka rhythm (Dum-Tek) and exotic intervals.", pt: "Ritmo de Darbuka e intervalos exóticos.", zh: "达布卡鼓节奏和充满异国情调的音程。" },
        examples: { fr: "Kick grave (Dum) au centre, Rim/Snare aigu (Tek) sur les bords.", en: "Low kick (Dum) center, high Rim (Tek) on edge.", pt: "Bumbo grave (Dum), Rim agudo (Tek).", zh: "低沉底鼓 (Dum)，清脆边击 (Tek)。" },
        theme: { primary: '#d4af37', bg: '#261e00' },
        nnsProgression: ['1', 'b2', '1', '4m'], nnsProgressionVariation: ['1', 'b7m', 'b6', '5'],
        drumTracks: [ { name: 'Kick', activeSteps: [0, 7] }, { name: 'Rim', activeSteps: [3, 10, 12] }, { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14], lowVelocitySteps: [0, 2, 4, 6, 8, 10, 12, 14] } ],
        drumTracksVariation: [ { name: 'Kick', activeSteps: [0, 3, 8] }, { name: 'Rim', activeSteps: [6, 12, 14] } ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 3, 7, 10] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 2, 4, 7, 9, 12] } ]
    },

    // ---------------------------------------------------------
    // GENRES SUPPLÉMENTAIRES (3) - POP, DISCO, CLASSIC ROCK
    // ---------------------------------------------------------
    {
        name: { fr: "Pop Moderne (Ballade)", en: "Modern Pop (Ballad)", pt: "Pop Moderno", zh: "现代流行音乐" },
        _group: 'pop', bpm: 120, modeName: "Ionian", rootValue: 0,
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "La progression d'accords la plus célèbre de la Pop mondiale.", en: "The most famous pop chord progression.", pt: "A progressão mais famosa do Pop.", zh: "最著名的流行和弦进行。" },
        examples: { fr: "1-5-6-4 : Utilisée dans des milliers de hits (Jason Mraz, Adele...).", en: "1-5-6-4: Used in thousands of hits.", pt: "1-5-6-4: Usada em milhares de hits.", zh: "1-5-6-4 : 用于数以千计的热门歌曲中。" },
        inspiration: { fr: "🎧 Adele, Ed Sheeran, Jason Mraz — progressions pop universelles.", en: "🎧 Adele, Ed Sheeran, Jason Mraz — universal pop progressions." },
        theme: { primary: '#e91e63', bg: '#26000d' },
        nnsProgression: ['1', '5', '6-', '4'], nnsProgressionVariation: ['6-', '4', '1', '5'],
        drumTracks: [ { name: 'Kick', activeSteps: [0, 8] }, { name: 'Snare', activeSteps: [4, 12] }, { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } ],
        drumTracksVariation: [ { name: 'Kick', activeSteps: [0, 8, 10] }, { name: 'Snare', activeSteps: [4, 12] }, { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 8] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 8, 14] } ]
    },
    {
        name: { fr: "Funk / Disco (Dance)", en: "Disco Funk", pt: "Disco Funk", zh: "迪斯科放克" },
        _group: 'pop', bpm: 115, modeName: "Dorian", rootValue: 4,
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Basse syncopée et charleston à contretemps (Style Daft Punk, Stevie Wonder).", en: "Syncopated bass and off-beat hats (Daft Punk style).", pt: "Baixo sincopado e hi-hats no contratempo.", zh: "切分低音和反拍踩镲。" },
        examples: { fr: "Kick sur tous les temps (Four on the floor), Clap sur 2 et 4.", en: "Four on the floor kick, Clap on 2 and 4.", pt: "Bumbo no 1,2,3,4. Clap no 2 e 4.", zh: "四四拍底鼓，2和4拍拍手。" },
        inspiration: { fr: "🎧 Daft Punk, Chic, Stevie Wonder — le groove qui fait danser.", en: "🎧 Daft Punk, Chic, Stevie Wonder — groove that makes you dance." },
        theme: { primary: '#9c27b0', bg: '#1c0024' },
        nnsProgression: ['1-', '4', '1-', '4'], nnsProgressionVariation: ['1-', 'b3', '4', '5'],
        drumTracks: [ { name: 'Kick', activeSteps: [0, 4, 8, 12] }, { name: 'Snare', activeSteps: [4, 12] }, { name: 'Hat', activeSteps: [2, 6, 10, 14] } ],
        drumTracksVariation: [ { name: 'Kick', activeSteps: [0, 4, 8, 12] }, { name: 'Snare', activeSteps: [4, 12] }, { name: 'Hat', activeSteps: [2, 6, 10, 14] }, { name: 'Rim', activeSteps: [7, 15] } ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 3, 7, 10, 14] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 2, 4, 7, 10, 12] } ]
    },
    {
        name: { fr: "Classic Rock (Hard Rock)", en: "Classic Rock", pt: "Rock Clássico", zh: "经典摇滚" },
        _group: 'rock', bpm: 100, modeName: "Mixolydian", rootValue: 9,
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "L'attitude Blues-Rock classique et les accords puissants.", en: "Classic Blues-Rock attitude and power chords.", pt: "Atitude Blues-Rock e power chords.", zh: "经典的蓝调摇滚态度和强力和弦。" },
        examples: { fr: "Rythme lourd binaire, grosse caisse qui appuie la fondamentale.", en: "Heavy straight rhythm, kick supports the root.", pt: "Ritmo pesado e reto.", zh: "沉重的二拍子节奏。" },
        inspiration: { fr: "🎧 AC/DC, Led Zeppelin, Deep Purple — l'attitude rock pur.", en: "🎧 AC/DC, Led Zeppelin, Deep Purple — pure rock attitude." },
        theme: { primary: '#e65100', bg: '#260d00' },
        nnsProgression: ['1', '4', '1', '5'], nnsProgressionVariation: ['1', 'b7', '4', '1'],
        drumTracks: [ { name: 'Kick', activeSteps: [0, 8] }, { name: 'Snare', activeSteps: [4, 12] }, { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } ],
        drumTracksVariation: [ { name: 'Kick', activeSteps: [0, 8, 10] }, { name: 'Snare', activeSteps: [4, 12] }, { name: 'Crash', activeSteps: [0] } ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 8] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 4, 8, 12] } ]
    },

    // ---------------------------------------------------------
    // NOUVEAUX GENRES (6) — WORLD / JAZZ / ELECTRONIC / URBAN
    // ---------------------------------------------------------
    {
        name: { fr: "Bossa Nova", en: "Bossa Nova", pt: "Bossa Nova", zh: "波萨诺瓦" },
        _group: 'jazz', bpm: 130, modeName: "Ionian", rootValue: 7,
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Rythme syncopé brésilien (clave), basse légère et accords enrichis.", en: "Brazilian syncopated clave rhythm, light bass and enriched chords.", pt: "Ritmo sincopado brasileiro (clave), baixo leve e acordes enriquecidos.", zh: "巴西切分节奏 (克拉维节奏)，轻盈贝司和丰富和弦。" },
        examples: { fr: "Charleston sur les contretemps, kick léger au 1.", en: "Hi-hat on offbeats, light kick on beat 1.", pt: "Hi-hat nos contratempos, bumbo leve no 1.", zh: "反拍踩镲，第一拍轻踩底鼓。" },
        inspiration: { fr: "🎧 João Gilberto, Antônio Carlos Jobim — Garota de Ipanema.", en: "🎧 João Gilberto, Antônio Carlos Jobim — The Girl from Ipanema." },
        theme: { primary: '#26c6da', bg: '#001f26' },
        nnsProgression: ['2-', '5', '1', '1'], nnsProgressionVariation: ['1', '6-', '2-', '5'],
        drumTracks: [
            { name: 'Kick', activeSteps: [0, 10] },
            { name: 'Rim', activeSteps: [3, 7, 10, 14] },
            { name: 'Hat', activeSteps: [2, 6, 10, 14] }
        ],
        drumTracksVariation: [
            { name: 'Kick', activeSteps: [0, 6, 10] },
            { name: 'Rim', activeSteps: [3, 7, 12, 15] },
            { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14], lowVelocitySteps: [0, 4, 8, 12] }
        ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 3, 8, 11], pitchSteps: { 0: 'R', 3: '5', 8: 'R', 11: '3' } } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 2, 6, 8, 12, 14], pitchSteps: { 0: 'R', 2: '5', 6: 'R', 8: '3', 12: 'R', 14: '5' } } ]
    },
    {
        name: { fr: "Jazz Standard (Swing)", en: "Jazz Standard (Swing)", pt: "Jazz Standard", zh: "爵士乐标准曲" },
        _group: 'jazz', bpm: 120, modeName: "Dorian", rootValue: 2,
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Swing 4/4 avec ride sur les triolets et caisse claire légère sur 2 et 4.", en: "4/4 swing with ride on triplets and light snare on 2 and 4.", pt: "Swing 4/4 com ride em tercinas e caixa leve no 2 e 4.", zh: "4/4 摇摆，骑镲三连音，2和4拍轻军鼓。" },
        examples: { fr: "ii-V-I : La progression fondamentale du jazz.", en: "ii-V-I: The fundamental jazz progression.", pt: "ii-V-I: A progressão fundamental do jazz.", zh: "ii-V-I：爵士乐的基本和弦进行。" },
        inspiration: { fr: "🎧 Miles Davis, Bill Evans, Thelonious Monk — l'ère bebop.", en: "🎧 Miles Davis, Bill Evans, Thelonious Monk — the bebop era." },
        theme: { primary: '#ffca28', bg: '#1a1500' },
        nnsProgression: ['2-', '5', '1', '6-'], nnsProgressionVariation: ['1', '6-', '2-', '5'],
        drumTracks: [
            { name: 'Kick', activeSteps: [0, 8] },
            { name: 'Snare', activeSteps: [4, 12], lowVelocitySteps: [4, 12] },
            { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14], lowVelocitySteps: [2, 6, 10, 14] }
        ],
        drumTracksVariation: [
            { name: 'Kick', activeSteps: [0, 6, 10] },
            { name: 'Snare', activeSteps: [4, 12] },
            { name: 'Hat', activeSteps: [0, 3, 6, 9, 12, 15] }
        ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 4, 8, 12] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 3, 6, 9, 12] } ]
    },
    {
        name: { fr: "Drum & Bass (Liquid)", en: "Liquid Drum & Bass", pt: "Drum & Bass Líquido", zh: "流畅 Drum & Bass" },
        _group: 'electronic', bpm: 174, modeName: "Aeolian", rootValue: 2,
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Breakbeat 2-step fluide, basse Reese et atmosphère sombre mais mélodique.", en: "Fluid 2-step breakbeat, Reese bass and dark yet melodic atmosphere.", pt: "Breakbeat 2-step fluido, baixo Reese e atmosfera sombria mas melódica.", zh: "流畅二步节奏，Reese 贝司，黑暗而旋律性的氛围。" },
        examples: { fr: "Kick sur le 1 et 'e-of-3', Snare sur 2 et 4 (pattern 2-step).", en: "Kick on beat 1 and 'e-of-3', Snare on 2 and 4 (2-step pattern).", pt: "Kick no 1 e 'e-of-3', Snare no 2 e 4 (padrão 2-step).", zh: "底鼓在第1拍和第3拍的'e'，军鼓在2和4拍 (二步节拍)。" },
        inspiration: { fr: "🎧 LTJ Bukem, Goldie 'Timeless', Hospital Records — DnB liquide.", en: "🎧 LTJ Bukem, Goldie 'Timeless', Hospital Records — liquid DnB." },
        theme: { primary: '#00e5ff', bg: '#00101a' },
        nnsProgression: ['1-', 'b3', '4', '5'], nnsProgressionVariation: ['1-', 'b7', 'b6', '5'],
        drumTracks: [
            { name: 'Kick', activeSteps: [0, 10] },
            { name: 'Snare', activeSteps: [4, 12] },
            { name: 'Hat', activeSteps: [2, 6, 10, 14], lowVelocitySteps: [6, 14] }
        ],
        drumTracksVariation: [
            { name: 'Kick', activeSteps: [0, 9, 10] },
            { name: 'Snare', activeSteps: [4, 12] },
            { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14], lowVelocitySteps: [0, 4, 8, 12] }
        ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 2, 10, 14] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 3, 8, 10, 14] } ]
    },
    {
        name: { fr: "Jungle / Breakbeat", en: "Jungle / Breakbeat", pt: "Jungle / Breakbeat", zh: "丛林/碎拍" },
        _group: 'electronic', bpm: 165, modeName: "Aeolian", rootValue: 10,
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Amen break haché, accents irréguliers, basse saccadée et atmosphère rave.", en: "Chopped Amen break, irregular accents, choppy bass and rave atmosphere.", pt: "Amen break picotado, acentos irregulares, baixo cortado.", zh: "切碎的 Amen 节奏，不规则重音，rave 氛围。" },
        examples: { fr: "Kick sur 1 et 3, Snare sur 7 et 13, Hat sur les contretemps (Amen Feel).", en: "Kick on 1 & 3, Snare on steps 7 & 13, Hat on offbeats (Amen feel).", pt: "Kick no 1 e 3, Snare nos passos 7 e 13, Hat nos contratempos.", zh: "底鼓在1和3, 军鼓在第7和13步, 踩镲在反拍 (Amen感)。" },
        inspiration: { fr: "🎧 The Prodigy, Shy FX, LTJ Bukem — l'âge d'or du Jungle UK.", en: "🎧 The Prodigy, Shy FX, LTJ Bukem — the golden age of UK Jungle." },
        theme: { primary: '#76ff03', bg: '#0d1a00' },
        nnsProgression: ['1-', '4-', 'b7', '1-'], nnsProgressionVariation: ['1-', 'b3', 'b6', '5'],
        drumTracks: [
            { name: 'Kick', activeSteps: [0, 8] },
            { name: 'Snare', activeSteps: [7, 13] },
            { name: 'Hat', activeSteps: [2, 6, 10, 14] }
        ],
        drumTracksVariation: [
            { name: 'Kick', activeSteps: [0, 3, 8, 11] },
            { name: 'Snare', activeSteps: [6, 10, 14] },
            { name: 'Hat', activeSteps: [1, 3, 5, 7, 9, 11, 13, 15], lowVelocitySteps: [1, 5, 9, 13] }
        ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 7, 10, 13] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 3, 6, 8, 11, 14] } ]
    },
    {
        name: { fr: "Afrobeat", en: "Afrobeat", pt: "Afrobeat", zh: "非洲节拍" },
        _group: 'world', bpm: 100, modeName: "Mixolydian", rootValue: 4,
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Pattern cyclique 16 temps entrelacé, accents off-beat et groove hypnotique.", en: "Interlocking 16-step cyclic pattern, off-beat accents and hypnotic groove.", pt: "Padrão cíclico de 16 passos, acentos no contratempo e groove hipnótico.", zh: "交织的16步循环节奏，反拍重音和催眠律动。" },
        examples: { fr: "Basse fondamentale sur le 1, kick au centre, cloche (agogô) sur les contretemps.", en: "Root bass on beat 1, kick center, bell (agogô) on offbeats.", pt: "Baixo fundamental no 1, kick no centro, sino no contratempo.", zh: "根音贝司在第1拍，底鼓居中，铃鼓在反拍。" },
        inspiration: { fr: "🎧 Fela Kuti 'Water No Get Enemy', Tony Allen — pères de l'Afrobeat.", en: "🎧 Fela Kuti 'Water No Get Enemy', Tony Allen — fathers of Afrobeat." },
        theme: { primary: '#ff8f00', bg: '#1a0f00' },
        nnsProgression: ['1', '4', '1', '4'], nnsProgressionVariation: ['1', 'b7', '4', '1'],
        drumTracks: [
            { name: 'Kick', activeSteps: [0, 6, 10] },
            { name: 'Snare', activeSteps: [4, 12] },
            { name: 'Hat', activeSteps: [2, 5, 8, 11, 14], lowVelocitySteps: [5, 11] }
        ],
        drumTracksVariation: [
            { name: 'Kick', activeSteps: [0, 8, 14] },
            { name: 'Rim', activeSteps: [3, 7, 11, 15] },
            { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14], lowVelocitySteps: [2, 6, 10, 14] }
        ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 4, 8, 12] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 3, 6, 8, 11, 14] } ]
    },
    {
        name: { fr: "R&B / Neo-Soul", en: "R&B / Neo-Soul", pt: "R&B / Neo-Soul", zh: "节奏布鲁斯 / 新灵魂" },
        _group: 'urban', bpm: 88, modeName: "Dorian", rootValue: 9,
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Groove mesuré, ghost notes à la caisse claire, basse chaude et expressive.", en: "Measured groove, ghost notes on snare, warm and expressive bass.", pt: "Groove medido, ghost notes na caixa, baixo quente e expressivo.", zh: "克制的律动，军鼓鬼音，温暖而富有表情的贝司。" },
        examples: { fr: "Kick sur 1 et 'and-of-3', ghost notes très légères autour du Snare.", en: "Kick on beat 1 and 'and-of-3', very light ghost notes around the Snare.", pt: "Kick no 1 e 'and-of-3', ghost notes muito leves ao redor da caixa.", zh: "底鼓在第1拍和第3拍的'and'，军鼓周围的鬼音。" },
        inspiration: { fr: "🎧 D'Angelo 'Voodoo', Marvin Gaye, H.E.R. — l'âme du groove.", en: "🎧 D'Angelo 'Voodoo', Marvin Gaye, H.E.R. — the soul of groove." },
        theme: { primary: '#ef9a9a', bg: '#1a0808' },
        nnsProgression: ['1-', '4-', 'b7', '1-'], nnsProgressionVariation: ['1-', 'b3', 'b7', '4'],
        drumTracks: [
            { name: 'Kick', activeSteps: [0, 10] },
            { name: 'Snare', activeSteps: [4, 12] },
            { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14], lowVelocitySteps: [2, 6, 10, 14] }
        ],
        drumTracksVariation: [
            { name: 'Kick', activeSteps: [0, 9, 10] },
            { name: 'Snare', activeSteps: [4, 6, 12, 14], lowVelocitySteps: [6, 14] },
            { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] }
        ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 3, 8, 11], pitchSteps: { 0: 'R', 3: '5', 8: 'R', 11: 'b7' } } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 2, 6, 8, 12, 14], pitchSteps: { 0: 'R', 2: '3', 6: '5', 8: 'R', 12: 'b7', 14: '8va' } } ]
    }
];