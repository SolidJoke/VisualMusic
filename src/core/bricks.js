// src/core/bricks.js

export const BRICKS = [
    // ---------------------------------------------------------
    // GENRES ORIGINAUX
    // ---------------------------------------------------------
    {
        name: { fr: "Techno Euphorique", en: "Euphoric Techno", pt: "Techno Eufórico", zh: "欢快 Techno" },
        bpm: 130, modeName: "Ionian", rootValue: 0, tuning: "Standard",
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
        bpm: 140, modeName: "Dorian", rootValue: 2, tuning: "Standard",
        guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Basse KBBB très serrée. Cible la 6te majeure.", en: "Tight KBBB rolling bass. Target major 6th.", pt: "Baixo KBBB muito firme.", zh: "紧凑的 KBBB 滚动低音。" },
        examples: { fr: "Progression: 1- - 6 - 7 - 1-. Arpèges rapides.", en: "Progression: 1- - 6 - 7 - 1-. Fast arpeggios.", pt: "Progressão: 1- - 6 - 7 - 1-.", zh: "和弦进行: 1- - 6 - 7 - 1-." },
        theme: { primary: '#b000ff', bg: '#1a0026' },
        nnsProgression: ['1-', '6', '7', '1-'], nnsProgressionVariation: ['1-', 'b3', '4', '5'],
        drumTracks: [ { name: 'Kick', activeSteps: [0, 4, 8, 12] } ],
        drumTracksVariation: [ { name: 'Kick', activeSteps: [0, 4, 8, 12] }, { name: 'Hat', activeSteps: [2, 6, 10, 14] } ],
        melodyTracks: [ { name: 'Bass', activeSteps: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], lowVelocitySteps: [1, 5, 9, 13] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15] } ]
    },
    {
        name: { fr: "Metal Épique", en: "Epic Metal", pt: "Metal Épico", zh: "史诗金属" },
        bpm: 180, modeName: "Phrygian", rootValue: 4, tuning: "Drop D",
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
        bpm: 90, modeName: "Ionian", rootValue: 7, tuning: "Standard",
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
        bpm: 110, modeName: "Lydian", rootValue: 5, tuning: "Standard",
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
    // NOUVEAUX GENRES
    // ---------------------------------------------------------
    {
        name: { fr: "Hip-Hop Boom Bap", en: "Oldschool Boom Bap", pt: "Hip-Hop Oldschool", zh: "老派嘻哈" },
        bpm: 88, modeName: "Aeolian", rootValue: 1, // C#
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Rythmique swinguée, basse lourde et chaude.", en: "Swung rhythm, warm heavy bass.", pt: "Ritmo com swing, baixo pesado.", zh: "摇摆节奏，厚重的低音。" },
        examples: { fr: "Caisse claire sur les temps 2 et 4.", en: "Snare on 2 and 4.", pt: "Caixa nos tempos 2 e 4.", zh: "2和4拍上的军鼓。" },
        theme: { primary: '#fbc02d', bg: '#261b00' }, // Jaune / Marron
        nnsProgression: ['1-', '4-', '5-', '1-'], nnsProgressionVariation: ['1-', '6', '7', '1-'],
        drumTracks: [ 
            { name: 'Kick', activeSteps: [0, 9] }, 
            { name: 'Snare', activeSteps: [4, 12] }, 
            { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14], lowVelocitySteps: [2, 6, 10, 14] } 
        ],
        drumTracksVariation: [ 
            { name: 'Kick', activeSteps: [0, 7, 10] }, 
            { name: 'Snare', activeSteps: [4, 12] }, 
            { name: 'Hat', activeSteps: [0, 4, 8, 12] } 
        ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 3, 8, 9] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 2, 4, 7, 10] } ]
    },
    {
        name: { fr: "Trap / Hip-Hop Récent", en: "Modern Trap", pt: "Trap Moderno", zh: "现代陷阱说唱" },
        bpm: 140, modeName: "Phrygian", rootValue: 3, // D#
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Charlestons très rapides (Rolls) et grosse caisse 808 glissante.", en: "Fast hi-hat rolls and gliding 808 kicks.", pt: "Hi-hats muito rápidos e baixo 808.", zh: "快速的踩镲滚奏和滑音 808 底鼓。" },
        examples: { fr: "Ressenti 'Halftime' avec la caisse claire sur le temps 3.", en: "Halftime feel with snare on beat 3.", pt: "Sensação 'Halftime'.", zh: "半拍感觉。" },
        theme: { primary: '#ff1744', bg: '#1f0005' }, // Rouge sang / Noir
        nnsProgression: ['1', 'b2', '1', 'b2'], nnsProgressionVariation: ['1', '1', 'b6', '5'],
        drumTracks: [ 
            { name: 'Kick', activeSteps: [0, 10] }, 
            { name: 'Snare', activeSteps: [8] }, // Snare sur le temps 3 (Halftime)
            { name: 'Hat', activeSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], lowVelocitySteps: [1, 3, 5, 7, 9, 11, 13, 15] } 
        ],
        drumTracksVariation: [ 
            { name: 'Kick', activeSteps: [0, 2, 10, 11] }, 
            { name: 'Snare', activeSteps: [8] }, 
            { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } 
        ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 10] } ], // Sub Bass 808
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 8, 14] } ]
    },
    {
        name: { fr: "Funk Groovy", en: "Groovy Funk", pt: "Funk Clássico", zh: "律动放克" },
        bpm: 105, modeName: "Dorian", rootValue: 4, // E
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Basse très syncopée (Slap) et guitare rythmique type 'Cocotte'.", en: "Syncopated slap bass and scratchy rhythm guitar.", pt: "Baixo muito sincopado e guitarra rítmica.", zh: "切分音贝司和扫弦吉他。" },
        examples: { fr: "Accent sur le premier temps (The One).", en: "Heavy accent on 'The One'.", pt: "Acento forte no tempo 1.", zh: "重音在第一拍。" },
        theme: { primary: '#ff9100', bg: '#2b1600' }, // Orange funky
        nnsProgression: ['1-', '4', '1-', '4'], nnsProgressionVariation: ['1-', '1-', '2-', '5'],
        drumTracks: [ 
            { name: 'Kick', activeSteps: [0, 8, 14] }, 
            { name: 'Snare', activeSteps: [4, 12] }, 
            { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } 
        ],
        drumTracksVariation: [ 
            { name: 'Kick', activeSteps: [0, 7, 10] }, 
            { name: 'Snare', activeSteps: [4, 9, 12] }, // Ghost note sur le 9
            { name: 'Hat', activeSteps: [2, 6, 10, 14] } // Contre-temps purs
        ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 3, 7, 10, 14] } ],
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 2, 3, 8, 10, 12] } ]
    },
    {
        name: { fr: "Rock 60s (Pop Rock)", en: "60s Rock", pt: "Rock Anos 60", zh: "60年代摇滚" },
        bpm: 120, modeName: "Mixolydian", rootValue: 9, // A
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Rythme droit, accords ouverts et basse mélodique.", en: "Straight rhythm, open chords and melodic bass.", pt: "Ritmo reto, acordes abertos.", zh: "直白节奏，开放和弦。" },
        examples: { fr: "Grosse caisse sur 1 et 3, caisse claire sur 2 et 4.", en: "Kick on 1 & 3, Snare on 2 & 4.", pt: "Bumbo no 1 e 3, Caixa no 2 e 4.", zh: "1和3拍底鼓，2和4拍军鼓。" },
        theme: { primary: '#4dd0e1', bg: '#002226' }, // Bleu ciel rétro
        nnsProgression: ['1', '4', '5', '4'], nnsProgressionVariation: ['1', 'b7', '4', '1'],
        drumTracks: [ 
            { name: 'Kick', activeSteps: [0, 8] }, 
            { name: 'Snare', activeSteps: [4, 12] }, 
            { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } 
        ],
        drumTracksVariation: [ 
            { name: 'Kick', activeSteps: [0, 8, 10] }, 
            { name: 'Snare', activeSteps: [4, 12] }, 
            { name: 'Crash', activeSteps: [0] } 
        ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } ], // Basse en croches continues (driving bass)
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 4, 8, 12] } ]
    },
    {
        name: { fr: "Rock Progressif", en: "Progressive Rock", pt: "Rock Progressivo", zh: "前卫摇滚" },
        bpm: 135, modeName: "Lydian", rootValue: 2, // D
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Polyrhythmies, accents décalés créant une illusion de mesure asymétrique.", en: "Polyrhythms, off-beat accents creating odd-meter illusions.", pt: "Polirritmias, acentos deslocados.", zh: "复合节奏，错位重音。" },
        examples: { fr: "Accentuation par groupes de 3 croches (3-3-2).", en: "Accents in groups of 3 (3-3-2 feel).", pt: "Acentuação em grupos de 3.", zh: "3-3-2 节奏感觉。" },
        theme: { primary: '#ab47bc', bg: '#1c0024' }, // Violet mystique
        nnsProgression: ['1', '2', '4', '5'], nnsProgressionVariation: ['1', '3-', '4', '2'],
        drumTracks: [ 
            { name: 'Kick', activeSteps: [0, 3, 6, 10, 13] }, // Rythme très cassé
            { name: 'Snare', activeSteps: [8] }, 
            { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } 
        ],
        drumTracksVariation: [ 
            { name: 'Kick', activeSteps: [0, 5, 10] }, 
            { name: 'Snare', activeSteps: [4, 12] }, 
            { name: 'Hat', activeSteps: [0, 3, 6, 9, 12] } 
        ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 3, 6, 10, 13] } ], // Suit parfaitement le kick
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } ]
    },
    {
        name: { fr: "House / Deep House", en: "House", pt: "House", zh: "浩室音乐" },
        bpm: 124, modeName: "Aeolian", rootValue: 6, // F#
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Groove constant 'Four-on-the-floor' avec charleston ouvert sur les contre-temps.", en: "Constant 4/4 groove with open hi-hats on offbeats.", pt: "Groove constante 4/4 com hi-hats no contratempo.", zh: "持续的 4/4 律动，反拍开启踩镲。" },
        examples: { fr: "Caisse claire/Clap sur les temps 2 et 4.", en: "Clap/Snare on beats 2 and 4.", pt: "Clap nos tempos 2 e 4.", zh: "2和4拍上的拍手/军鼓。" },
        theme: { primary: '#64dd17', bg: '#0b1a00' }, // Vert acide club
        nnsProgression: ['1-', '7', '6', '7'], nnsProgressionVariation: ['1-', '4-', '5-', '1-'],
        drumTracks: [ 
            { name: 'Kick', activeSteps: [0, 4, 8, 12] }, 
            { name: 'Snare', activeSteps: [4, 12] }, // Fait office de Clap
            { name: 'Hat', activeSteps: [2, 6, 10, 14] } // Hat ouvert
        ],
        drumTracksVariation: [ 
            { name: 'Kick', activeSteps: [0, 4, 8, 12] }, 
            { name: 'Snare', activeSteps: [4, 12] }, 
            { name: 'Hat', activeSteps: [2, 6, 10, 14] },
            { name: 'Rim', activeSteps: [3, 7, 15] } // Percussions syncopées
        ],
        melodyTracks: [ { name: 'Bass', activeSteps: [2, 6, 10, 14] } ], // Basse purement sur les contre-temps (très Deep House)
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 3, 8, 11] } ]
    },
    {
        name: { fr: "Thrash / Groove Metal", en: "Groove Metal", pt: "Thrash / Groove Metal", zh: "激流/律动金属" },
        bpm: 160, modeName: "Locrian", rootValue: 4, // E (Tuning très grave simulé)
        tuning: "Drop D", guitarStrings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['D1', 'A1', 'D2', 'G2'],
        effects: { fr: "Riffs lourds, dissonants, et double pédale agressive (façon Sepultura/Pantera).", en: "Heavy, dissonant riffs and aggressive double kick.", pt: "Riffs pesados e pedal duplo agressivo.", zh: "沉重不和谐的连段和激烈的双底鼓。" },
        examples: { fr: "Attaque constante, étouffement des cordes (Palm Mute).", en: "Constant attack, heavy palm muting.", pt: "Ataque constante, palm muting.", zh: "持续的攻击感，手掌闷音。" },
        theme: { primary: '#d50000', bg: '#1a0000' }, // Rouge profond
        nnsProgression: ['1°', 'b2', 'b5', '1°'], nnsProgressionVariation: ['1°', 'b5', 'b3', 'b2'], // Accords très sombres
        drumTracks: [ 
            { name: 'Kick', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] }, // Double pédale continue en croches
            { name: 'Snare', activeSteps: [4, 12] },
            { name: 'Crash', activeSteps: [0] }
        ],
        drumTracksVariation: [ 
            { name: 'Kick', activeSteps: [0, 1, 3, 4, 8, 9, 11, 12] }, // Rythme cassé et brutal (syncopé)
            { name: 'Snare', activeSteps: [4, 12] }
        ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] } ], // Chug en croches
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 1, 3, 4, 8, 9, 11, 12] } ]
    },
    {
        name: { fr: "Musique Orientale / Arabe", en: "Middle Eastern", pt: "Música Árabe", zh: "中东音乐" },
        bpm: 100, modeName: "PhrygianDominant", rootValue: 2, // D
        tuning: "Standard", guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: { fr: "Rythme de Darbuka (Dum-Tek) et intervalles exotiques avec la seconde mineure et tierce majeure.", en: "Darbuka rhythm (Dum-Tek) and exotic intervals.", pt: "Ritmo de Darbuka e intervalos exóticos.", zh: "达布卡鼓节奏和充满异国情调的音程。" },
        examples: { fr: "Kick grave (Dum) au centre, Rim/Snare aigu (Tek) sur les bords.", en: "Low kick (Dum) center, high Rim (Tek) on edge.", pt: "Bumbo grave (Dum), Rim agudo (Tek).", zh: "低沉底鼓 (Dum)，清脆边击 (Tek)。" },
        theme: { primary: '#d4af37', bg: '#261e00' }, // Or / Sable
        nnsProgression: ['1', 'b2', '1', '4m'], nnsProgressionVariation: ['1', 'b7m', 'b6', '5'],
        drumTracks: [ 
            { name: 'Kick', activeSteps: [0, 7] }, // "Dum"
            { name: 'Rim', activeSteps: [3, 10, 12] }, // "Tek" (Simule le rythme Maqsum ou Baladi)
            { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14], lowVelocitySteps: [0, 2, 4, 6, 8, 10, 12, 14] } // Tambourin léger
        ],
        drumTracksVariation: [ 
            { name: 'Kick', activeSteps: [0, 3, 8] }, // Rythme Malfuf
            { name: 'Rim', activeSteps: [6, 12, 14] }
        ],
        melodyTracks: [ { name: 'Bass', activeSteps: [0, 3, 7, 10] } ], // Ligne mélodique hypnotique
        melodyTracksVariation: [ { name: 'Bass', activeSteps: [0, 2, 4, 7, 9, 12] } ]
    }
];