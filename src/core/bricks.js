// src/core/bricks.js

export const BRICKS = new Array(
    {
        id: 'psytrance', name: 'Psytrance', bpm: 140, rootValue: 9, modeName: 'Dorian', tuning: 'Standard',
        effects: 'Compression Sidechain lourde.', examples: 'Dugga-dugga bassline. Mode Dorien ("Get Lucky").',
        theme: { primary: '#bb86fc', bg: '#121212' }, nnsProgression: new Array("1-", "6", "7", "1-"),
        guitarStrings: new Array(4, 11, 7, 2, 9, 4), bassStrings: new Array(7, 2, 9, 4),
        drumTracks: new Array(
            { name: 'Kick', colorClass: 'bg-kick', activeSteps: new Array(0, 4, 8, 12), lowVelocitySteps: new Array() },
            { name: 'Hi-Hat', colorClass: 'bg-hat', activeSteps: new Array(2, 6, 10, 14), lowVelocitySteps: new Array() }
        ),
        drumTracksVariation: new Array(
            { name: 'Kick', colorClass: 'bg-kick', activeSteps: new Array(0, 4, 8, 12), lowVelocitySteps: new Array() },
            { name: 'Hi-Hat (16th)', colorClass: 'bg-hat', activeSteps: new Array(2, 3, 6, 7, 10, 11, 14, 15), lowVelocitySteps: new Array(3, 7, 11, 15) }
        ),
        melodyTracks: new Array({ name: 'Bass (16th)', colorClass: 'bg-bass', activeSteps: new Array(1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15), lowVelocitySteps: new Array(1, 5, 9, 13) })
    },
    {
        id: 'metal_groove', name: 'Groove Metal (façon Sepultura)', bpm: 105, rootValue: 2, modeName: 'PhrygianDominant', tuning: 'Drop D (D-A-D-G-B-E)',
        effects: 'Grosse distorsion, Palm Mute sur cordes graves (Chugs).', examples: 'Symphony Of Destruction, Roots Bloody Roots.',
        theme: { primary: '#cf6679', bg: '#1a0b0b' }, nnsProgression: new Array("1", "b2", "1", "b6"),
        guitarStrings: new Array(4, 11, 7, 2, 9, 2), bassStrings: new Array(7, 2, 9, 2),
        drumTracks: new Array(
            { name: 'Kick', colorClass: 'bg-kick', activeSteps: new Array(0, 3, 8, 11), lowVelocitySteps: new Array() },
            { name: 'Snare', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() }
        ),
        drumTracksVariation: new Array(
            { name: 'Kick (Double)', colorClass: 'bg-kick', activeSteps: new Array(0, 2, 3, 8, 10, 11), lowVelocitySteps: new Array() },
            { name: 'Snare / Tom', colorClass: 'bg-snare', activeSteps: new Array(4, 12, 14, 15), lowVelocitySteps: new Array() }
        ),
        melodyTracks: new Array({ name: 'Chug (Palm Mute)', colorClass: 'bg-bass', activeSteps: new Array(0, 3, 8, 11), lowVelocitySteps: new Array() })
    },
    {
        id: 'breakbeat', name: 'Breakbeat (façon The Prodigy)', bpm: 135, rootValue: 4, modeName: 'Mixolydian', tuning: 'Standard',
        effects: 'Breaks de batterie découpés (Amen Break). Synthé agressif.', examples: 'Smack My Bitch Up, Voodoo People.',
        theme: { primary: '#ff3366', bg: '#111' }, nnsProgression: new Array("1", "b7", "4", "1"),
        guitarStrings: new Array(4, 11, 7, 2, 9, 4), bassStrings: new Array(7, 2, 9, 4),
        drumTracks: new Array(
            { name: 'Kick Break', colorClass: 'bg-kick', activeSteps: new Array(0, 10), lowVelocitySteps: new Array() },
            { name: 'Snare Break', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() },
            { name: 'Ghost Snare', colorClass: 'bg-snare', activeSteps: new Array(7, 9, 14), lowVelocitySteps: new Array(7, 9, 14) }
        ),
        drumTracksVariation: new Array(
            { name: 'Kick Break', colorClass: 'bg-kick', activeSteps: new Array(0, 8, 10), lowVelocitySteps: new Array() },
            { name: 'Snare Break', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() },
            { name: 'Fast Hats', colorClass: 'bg-hat', activeSteps: new Array(0,2,4,6,8,10,12,14), lowVelocitySteps: new Array(2,6,10,14) }
        ),
        melodyTracks: new Array({ name: 'Acid Synth', colorClass: 'bg-snare', activeSteps: new Array(0, 3, 6, 9, 12), lowVelocitySteps: new Array() })
    },
    {
        id: 'funk', name: 'Funk (Groove)', bpm: 110, rootValue: 2, modeName: 'Dorian', tuning: 'Standard',
        effects: 'Guitare staccato ("cocottes"), Basse très syncopée.', examples: 'Chic (Good Times), Daft Punk (Get Lucky).',
        theme: { primary: '#00e5ff', bg: '#001a1a' }, nnsProgression: new Array("1-", "2-", "4", "5"),
        guitarStrings: new Array(4, 11, 7, 2, 9, 4), bassStrings: new Array(7, 2, 9, 4),
        drumTracks: new Array(
            { name: 'Kick', colorClass: 'bg-kick', activeSteps: new Array(0, 8, 11), lowVelocitySteps: new Array() },
            { name: 'Snare', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() },
            { name: 'Hat (16th)', colorClass: 'bg-hat', activeSteps: new Array(0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15), lowVelocitySteps: new Array(1,3,5,7,9,11,13,15) }
        ),
        drumTracksVariation: new Array(
            { name: 'Kick', colorClass: 'bg-kick', activeSteps: new Array(0, 7, 10), lowVelocitySteps: new Array() },
            { name: 'Snare', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() },
            { name: 'Open Hat', colorClass: 'bg-hat', activeSteps: new Array(2, 6, 10, 14), lowVelocitySteps: new Array() }
        ),
        melodyTracks: new Array({ name: 'Slap Bass', colorClass: 'bg-bass', activeSteps: new Array(0, 2, 5, 8, 14), lowVelocitySteps: new Array() })
    },
    {
        id: 'rock60s', name: 'Rock Années 60', bpm: 120, rootValue: 9, modeName: 'Mixolydian', tuning: 'Standard',
        effects: 'Overdrive à lampes. Rythme binaire solide.', examples: 'AC/DC, Jimi Hendrix, The Beatles.',
        theme: { primary: '#ffaa00', bg: '#1a1100' }, nnsProgression: new Array("1", "b7", "4", "1"),
        guitarStrings: new Array(4, 11, 7, 2, 9, 4), bassStrings: new Array(7, 2, 9, 4),
        drumTracks: new Array(
            { name: 'Kick', colorClass: 'bg-kick', activeSteps: new Array(0, 8), lowVelocitySteps: new Array() },
            { name: 'Snare', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() },
            { name: 'Ride', colorClass: 'bg-hat', activeSteps: new Array(0, 4, 8, 12), lowVelocitySteps: new Array() }
        ),
        drumTracksVariation: new Array(
            { name: 'Kick Syncopé', colorClass: 'bg-kick', activeSteps: new Array(0, 8, 10), lowVelocitySteps: new Array() },
            { name: 'Snare', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() },
            { name: 'Hat (8th)', colorClass: 'bg-hat', activeSteps: new Array(0, 2, 4, 6, 8, 10, 12, 14), lowVelocitySteps: new Array() }
        ),
        melodyTracks: new Array({ name: 'Guitar Riff', colorClass: 'bg-bass', activeSteps: new Array(0, 2, 4, 8, 10, 12), lowVelocitySteps: new Array() })
    },
    {
        id: 'hiphop', name: 'Hip-Hop (Boom Bap)', bpm: 90, rootValue: 0, modeName: 'Aeolian', tuning: 'Standard',
        effects: 'Samples vinyle (Lo-Fi), Kick lourd, Swing sur les charleys.', examples: 'Wu-Tang Clan, Nas, Mobb Deep.',
        theme: { primary: '#ffcc00', bg: '#111' }, nnsProgression: new Array("1-", "4-", "1-", "5-"),
        guitarStrings: new Array(4, 11, 7, 2, 9, 4), bassStrings: new Array(7, 2, 9, 4),
        drumTracks: new Array(
            { name: 'Kick (Boom)', colorClass: 'bg-kick', activeSteps: new Array(0, 9), lowVelocitySteps: new Array() },
            { name: 'Snare (Bap)', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() },
            { name: 'Hat (Swung)', colorClass: 'bg-hat', activeSteps: new Array(0,2,4,6,8,10,12,14), lowVelocitySteps: new Array(2,6,10,14) }
        ),
        drumTracksVariation: new Array(
            { name: 'Kick', colorClass: 'bg-kick', activeSteps: new Array(0, 7, 10), lowVelocitySteps: new Array() },
            { name: 'Snare', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() }
        ),
        melodyTracks: new Array({ name: 'Sub Bass', colorClass: 'bg-bass', activeSteps: new Array(0, 9), lowVelocitySteps: new Array() })
    },
    {
        id: 'house', name: 'House Classic', bpm: 124, rootValue: 4, modeName: 'Dorian', tuning: 'Standard',
        effects: 'Kick 4/4, Clap sur les temps pairs, Charley à contre-temps.', examples: 'Daft Punk, Frankie Knuckles.',
        theme: { primary: '#ff00ff', bg: '#1a001a' }, nnsProgression: new Array("1-", "4", "5", "1-"),
        guitarStrings: new Array(4, 11, 7, 2, 9, 4), bassStrings: new Array(7, 2, 9, 4),
        drumTracks: new Array(
            { name: 'Kick (4/4)', colorClass: 'bg-kick', activeSteps: new Array(0, 4, 8, 12), lowVelocitySteps: new Array() },
            { name: 'Clap', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() },
            { name: 'Off-beat Hat', colorClass: 'bg-hat', activeSteps: new Array(2, 6, 10, 14), lowVelocitySteps: new Array() }
        ),
        drumTracksVariation: new Array(
            { name: 'Kick (4/4)', colorClass: 'bg-kick', activeSteps: new Array(0, 4, 8, 12), lowVelocitySteps: new Array() },
            { name: 'Clap', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() },
            { name: 'Shaker 16th', colorClass: 'bg-hat', activeSteps: new Array(1,3,5,7,9,11,13,15), lowVelocitySteps: new Array() }
        ),
        melodyTracks: new Array({ name: 'FM Bass', colorClass: 'bg-bass', activeSteps: new Array(2, 6, 9, 14), lowVelocitySteps: new Array() })
    },
    {
        id: 'retrowave', name: 'Retrowave / Synthwave', bpm: 100, rootValue: 9, modeName: 'Aeolian', tuning: 'Standard',
        effects: 'Synthétiseurs analogiques virtuels, Reverb Gated sur caisse claire.', examples: 'Kavinsky, The Midnight, Stranger Things.',
        theme: { primary: '#00ffff', bg: '#2b00ff' }, nnsProgression: new Array("6-", "4", "1", "5"),
        guitarStrings: new Array(4, 11, 7, 2, 9, 4), bassStrings: new Array(7, 2, 9, 4),
        drumTracks: new Array(
            { name: 'Kick (LinnDrum)', colorClass: 'bg-kick', activeSteps: new Array(0, 4, 8, 12), lowVelocitySteps: new Array() },
            { name: 'Snare (Gated)', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() }
        ),
        drumTracksVariation: new Array(
            { name: 'Kick', colorClass: 'bg-kick', activeSteps: new Array(0, 4, 8, 10), lowVelocitySteps: new Array() },
            { name: 'Snare (Gated)', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() },
            { name: 'Tom Fill', colorClass: 'bg-hat', activeSteps: new Array(13, 14, 15), lowVelocitySteps: new Array() }
        ),
        melodyTracks: new Array({ name: '16th Synth Bass', colorClass: 'bg-bass', activeSteps: new Array(0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15), lowVelocitySteps: new Array(1,3,5,7,9,11,13,15) })
    }
);