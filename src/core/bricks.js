export const BRICKS = [
    {
        name: {
            fr: "Techno Euphorique",
            en: "Euphoric Techno",
            pt: "Techno Eufórico",
            zh: "欢快 Techno"
        },
        bpm: 130,
        modeName: "Ionian",
        rootValue: 0, // C
        tuning: "Standard",
        guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
        bassStrings: ['E1', 'A1', 'D2', 'G2'],
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
        nnsProgression: ['1', '5', '4', '1'],
        nnsProgressionVariation: ['1', '6-', '4', '5'],
        drumTracks: [
            { name: 'Kick', activeSteps: [0, 4, 8, 12] },
            { name: 'Hat', activeSteps: [2, 6, 10, 14] }
        ],
        drumTracksVariation: [
            { name: 'Kick', activeSteps: [0, 4, 8, 12] },
            { name: 'Hat', activeSteps: [2, 6, 10, 14] },
            { name: 'Snare', activeSteps: [4, 12] }
        ],
        melodyTracks: [
            { name: 'Bass', activeSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] }
        ],
        melodyTracksVariation: [
            { name: 'Bass', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14], lowVelocitySteps: [2, 6, 10, 14] }
        ]
    },
    {
        name: {
            fr: "Psytrance Nostalgique",
            en: "Nostalgic Psytrance",
            pt: "Psytrance Nostálgico",
            zh: "怀旧 Psytrance"
        },
        bpm: 140,
        modeName: "Dorian",
        rootValue: 2, // D
        tuning: "Standard",
        guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
        bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: {
            fr: "Basse KBBB (Kick-Bass-Bass-Bass) très serrée. Cible la 6te majeure pour la nostalgie.",
            en: "Tight KBBB (Kick-Bass-Bass-Bass) rolling bass. Target the major 6th for nostalgia.",
            pt: "Baixo KBBB muito firme. Foque na 6ª maior para nostalgia.",
            zh: "紧凑的 KBBB 滚动低音。强调大六度以产生怀旧感。"
        },
        examples: {
            fr: "Progression: 1- - 6 - 7 - 1-. Arpèges rapides.",
            en: "Progression: 1- - 6 - 7 - 1-. Fast arpeggios.",
            pt: "Progressão: 1- - 6 - 7 - 1-. Arpejos rápidos.",
            zh: "和弦进行: 1- - 6 - 7 - 1-. 快速琶音。"
        },
        theme: { primary: '#b000ff', bg: '#1a0026' },
        nnsProgression: ['1-', '6', '7', '1-'],
        nnsProgressionVariation: ['1-', 'b3', '4', '5'],
        drumTracks: [
            { name: 'Kick', activeSteps: [0, 4, 8, 12] }
        ],
        drumTracksVariation: [
            { name: 'Kick', activeSteps: [0, 4, 8, 12] },
            { name: 'Hat', activeSteps: [2, 6, 10, 14] }
        ],
        melodyTracks: [
            { name: 'Bass', activeSteps: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], lowVelocitySteps: [1, 5, 9, 13] }
        ],
        melodyTracksVariation: [
            { name: 'Bass', activeSteps: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15] }
        ]
    },
    {
        name: {
            fr: "Metal Épique",
            en: "Epic Metal",
            pt: "Metal Épico",
            zh: "史诗金属"
        },
        bpm: 180,
        modeName: "Phrygian",
        rootValue: 4, // E
        tuning: "Drop D",
        guitarStrings: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
        bassStrings: ['D1', 'A1', 'D2', 'G2'],
        effects: {
            fr: "Power chords avec distorsion et 'chugs' en palm-mute sur la fondamentale.",
            en: "Distorted power chords with palm-muted 'chugs' on the root.",
            pt: "Power chords com distorção e 'chugs' na tônica.",
            zh: "带有失真的强力和弦，以及在根音上的手掌闷音 'chugs'。"
        },
        examples: {
            fr: "Progression: 1 - b2 - b6 - 5. Rythme galopant.",
            en: "Progression: 1 - b2 - b6 - 5. Galloping rhythm.",
            pt: "Progressão: 1 - b2 - b6 - 5. Ritmo galopante.",
            zh: "和弦进行: 1 - b2 - b6 - 5. 奔腾节奏。"
        },
        theme: { primary: '#ff3300', bg: '#260000' },
        nnsProgression: ['1', 'b2', 'b6', '5'],
        nnsProgressionVariation: ['1', 'b5', '4', 'b2'],
        drumTracks: [
            { name: 'Kick', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] },
            { name: 'Snare', activeSteps: [4, 12] }
        ],
        drumTracksVariation: [
            { name: 'Kick', activeSteps: [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14] },
            { name: 'Snare', activeSteps: [4, 12] },
            { name: 'Crash', activeSteps: [0] }
        ],
        melodyTracks: [
            { name: 'Bass', activeSteps: [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14] }
        ],
        melodyTracksVariation: [
            { name: 'Bass', activeSteps: [0, 1, 2, 3, 4, 5, 6] }
        ]
    },
    {
        name: {
            fr: "Reggae Joyeux",
            en: "Joyful Reggae",
            pt: "Reggae Alegre",
            zh: "欢快雷鬼"
        },
        bpm: 90,
        modeName: "Ionian",
        rootValue: 7, // G
        tuning: "Standard",
        guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
        bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: {
            fr: "Skank sur le contretemps (et) et technique du 'Bubble' à l'orgue.",
            en: "Skank on the offbeats (and) with organ 'Bubble' technique.",
            pt: "Skank no contratempo (e) com técnica 'Bubble'.",
            zh: "反拍上的 Skank 和风琴 'Bubble' 技巧。"
        },
        examples: {
            fr: "Progression: 1 - 4 - 5 - 4. Beat 'One Drop'.",
            en: "Progression: 1 - 4 - 5 - 4. 'One Drop' beat.",
            pt: "Progressão: 1 - 4 - 5 - 4. Batida 'One Drop'.",
            zh: "和弦进行: 1 - 4 - 5 - 4. 'One Drop' 鼓点。"
        },
        theme: { primary: '#00ff00', bg: '#002600' },
        nnsProgression: ['1', '4', '5', '4'],
        nnsProgressionVariation: ['1', '2-', '5', '1'],
        drumTracks: [
            { name: 'Kick', activeSteps: [8] },
            { name: 'Rim', activeSteps: [8] },
            { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] }
        ],
        drumTracksVariation: [
            { name: 'Kick', activeSteps: [0, 4, 8, 12] },
            { name: 'Rim', activeSteps: [4, 12] },
            { name: 'Hat', activeSteps: [0, 2, 4, 6, 8, 10, 12, 14] }
        ],
        melodyTracks: [
            { name: 'Bass', activeSteps: [0, 3, 8, 11] }
        ],
        melodyTracksVariation: [
            { name: 'Bass', activeSteps: [2, 6, 10, 14] }
        ]
    },
    {
        name: {
            fr: "Ambient Berlin School",
            en: "Berlin School Ambient",
            pt: "Ambient Berlin School",
            zh: "柏林学派氛围音乐"
        },
        bpm: 110,
        modeName: "Lydian",
        rootValue: 5, // F
        tuning: "Standard",
        guitarStrings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
        bassStrings: ['E1', 'A1', 'D2', 'G2'],
        effects: {
            fr: "Séquences hypnotiques avec 'Ratcheting' (répétitions rapides) et delays.",
            en: "Hypnotic sequences with 'Ratcheting' (fast repeats) and delays.",
            pt: "Sequências hipnóticas com 'Ratcheting' e delays.",
            zh: "带有 'Ratcheting' (快速重复) 和延迟效果的催眠序列。"
        },
        examples: {
            fr: "Progression: 1 continu. Polyrhythmies (séquenceur 8 pas vs 7 pas).",
            en: "Progression: Drone on 1. Polyrhythms.",
            pt: "Progressão: Drone no 1. Polirritmias.",
            zh: "和弦进行: 保持在 1。复合节奏。"
        },
        theme: { primary: '#ff00ff', bg: '#260026' },
        nnsProgression: ['1', '1', '4', '1'],
        nnsProgressionVariation: ['1', '5', '4', '1'],
        drumTracks: [],
        drumTracksVariation: [
            { name: 'Hat', activeSteps: [0, 1, 2, 3] }
        ],
        melodyTracks: [
            { name: 'Bass', activeSteps: [0, 1, 2, 3, 4, 5, 6, 7] }
        ],
        melodyTracksVariation: [
            { name: 'Bass', activeSteps: [0, 1, 2, 3, 4, 5, 6, 11, 14] }
        ]
    }
];