// src/core/bricks.js

export const BRICKS = new Array(
    {
        id: 'psytrance', name: 'Psytrance (Hypnotique)', bpm: 140, rootValue: 9, modeName: 'Dorian', tuning: 'Standard',
        effects: 'Compression Sidechain lourde sur la basse.', examples: 'Dugga-dugga bassline. Mode Dorien ("Get Lucky").',
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
        id: 'reggae', name: 'Reggae / Dub (Détendu)', bpm: 75, rootValue: 0, modeName: 'Ionian', tuning: 'Standard',
        effects: 'Tape Delay avec beaucoup de feedback (Echo).', examples: 'Progression I-ii ou vi-V. "Big Ship" (Freddie McGregor).',
        theme: { primary: '#4CAF50', bg: '#0b1a0d' }, nnsProgression: new Array("1", "2-", "1", "2-"),
        guitarStrings: new Array(4, 11, 7, 2, 9, 4), bassStrings: new Array(7, 2, 9, 4),
        drumTracks: new Array(
            { name: 'Kick (One Drop)', colorClass: 'bg-kick', activeSteps: new Array(8), lowVelocitySteps: new Array() },
            { name: 'Snare (Rim)', colorClass: 'bg-snare', activeSteps: new Array(8), lowVelocitySteps: new Array() },
            { name: 'Hi-Hat', colorClass: 'bg-hat', activeSteps: new Array(0, 2, 4, 6, 8, 10, 12, 14), lowVelocitySteps: new Array() }
        ),
        drumTracksVariation: new Array(
            { name: 'Kick (Steppers)', colorClass: 'bg-kick', activeSteps: new Array(0, 4, 8, 12), lowVelocitySteps: new Array() },
            { name: 'Snare', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() },
            { name: 'Hat (Swung)', colorClass: 'bg-hat', activeSteps: new Array(0, 2, 4, 6, 8, 10, 12, 14), lowVelocitySteps: new Array(2, 6, 10, 14) }
        ),
        melodyTracks: new Array(
            { name: 'Skank (Guitare)', colorClass: 'bg-bass', activeSteps: new Array(2, 6, 10, 14), lowVelocitySteps: new Array() },
            { name: 'Bubble (Orgue)', colorClass: 'bg-kick', activeSteps: new Array(1, 3, 5, 7, 9, 11, 13, 15), lowVelocitySteps: new Array() }
        )
    },
    {
        id: 'metal_epic', name: 'Epic Metal (Puissant)', bpm: 120, rootValue: 4, modeName: 'PhrygianDominant', tuning: 'Drop D (D-A-D-G-B-E)',
        effects: 'Forte Distorsion, Palm Mute serré sur la corde de Mi.', examples: '"Symphony Of Destruction" (Megadeth).',
        theme: { primary: '#cf6679', bg: '#1a0b0b' }, nnsProgression: new Array("1", "b2", "b6", "5"),
        guitarStrings: new Array(4, 11, 7, 2, 9, 2), bassStrings: new Array(7, 2, 9, 2),
        drumTracks: new Array(
            { name: 'Kick (Double)', colorClass: 'bg-kick', activeSteps: new Array(0, 2, 3, 6, 8, 10, 11, 14), lowVelocitySteps: new Array() },
            { name: 'Snare', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() },
            { name: 'Crash', colorClass: 'bg-hat', activeSteps: new Array(0, 4, 8, 12), lowVelocitySteps: new Array() }
        ),
        drumTracksVariation: new Array(
            { name: 'Kick (Blast)', colorClass: 'bg-kick', activeSteps: new Array(0,2,4,6,8,10,12,14), lowVelocitySteps: new Array() },
            { name: 'Snare (Blast)', colorClass: 'bg-snare', activeSteps: new Array(1,3,5,7,9,11,13,15), lowVelocitySteps: new Array() }
        ),
        melodyTracks: new Array({ name: 'Chug (Palm Mute)', colorClass: 'bg-bass', activeSteps: new Array(0, 1, 2, 3, 8, 9, 10, 11), lowVelocitySteps: new Array() })
    },
    {
        id: 'techno', name: 'Industrial Techno (Rumble)', bpm: 130, rootValue: 2, modeName: 'Phrygian', tuning: 'Standard',
        effects: 'Reverb très longue sur le kick, puis filtre passe-bas (Rumble).', examples: 'Amelie Lens, Adam Beyer. Ambiance sombre et mécanique.',
        theme: { primary: '#03DAC6', bg: '#101414' }, nnsProgression: new Array("1-", "b2", "1-", "7"),
        guitarStrings: new Array(4, 11, 7, 2, 9, 4), bassStrings: new Array(7, 2, 9, 4),
        drumTracks: new Array(
            { name: 'Kick (4/4)', colorClass: 'bg-kick', activeSteps: new Array(0, 4, 8, 12), lowVelocitySteps: new Array() },
            { name: 'Off-beat Hat', colorClass: 'bg-hat', activeSteps: new Array(2, 6, 10, 14), lowVelocitySteps: new Array() },
            { name: 'Clap (Reverb)', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() }
        ),
        drumTracksVariation: new Array(
            { name: 'Kick', colorClass: 'bg-kick', activeSteps: new Array(0, 4, 8, 12), lowVelocitySteps: new Array() },
            { name: 'Rolling Hats', colorClass: 'bg-hat', activeSteps: new Array(2, 3, 6, 7, 10, 11, 14, 15), lowVelocitySteps: new Array(3, 7, 11, 15) },
            { name: 'Ride Cymbal', colorClass: 'bg-snare', activeSteps: new Array(2, 6, 10, 14), lowVelocitySteps: new Array() }
        ),
        melodyTracks: new Array(
            { name: 'Rumble (Sub)', colorClass: 'bg-bass', activeSteps: new Array(1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15), lowVelocitySteps: new Array(1, 5, 9, 13) }
        )
    },
    {
        id: 'berlin', name: 'Berlin School (Ambient)', bpm: 105, rootValue: 0, modeName: 'Lydian', tuning: 'Standard',
        effects: 'LFO lents sur le filtre. Ratcheting (répétitions ultra-rapides).', examples: 'Tangerine Dream, Klaus Schulze. Mode Lydien spatial.',
        theme: { primary: '#FF9800', bg: '#1a1305' }, nnsProgression: new Array("1", "2", "1", "4"),
        guitarStrings: new Array(4, 11, 7, 2, 9, 4), bassStrings: new Array(7, 2, 9, 4),
        drumTracks: new Array(
            { name: 'Analog Clock', colorClass: 'bg-hat', activeSteps: new Array(0, 4, 8, 12), lowVelocitySteps: new Array() }
        ),
        drumTracksVariation: new Array(
            { name: 'Syncopated Clock', colorClass: 'bg-hat', activeSteps: new Array(0, 3, 8, 11), lowVelocitySteps: new Array() }
        ),
        melodyTracks: new Array(
            { name: 'Seq Bass', colorClass: 'bg-bass', activeSteps: new Array(0, 2, 4, 6, 8, 10, 12, 14), lowVelocitySteps: new Array() },
            { name: 'Lead (Ratcheting)', colorClass: 'bg-snare', activeSteps: new Array(0, 7, 12), lowVelocitySteps: new Array() }
        )
    },
    {
        id: 'dnb', name: 'Drum & Bass / Jungle', bpm: 174, rootValue: 5, modeName: 'Aeolian', tuning: 'Drop C (Sub Bass)',
        effects: 'Découpage de Breakbeats (Amen Break). Grosse basse "Reese".', examples: 'Mode Éolien naturel. Ambiance urbaine et frénétique.',
        theme: { primary: '#E91E63', bg: '#170b10' }, nnsProgression: new Array("1-", "6", "4", "5"),
        guitarStrings: new Array(2, 9, 5, 0, 7, 0), bassStrings: new Array(5, 0, 7, 0),
        drumTracks: new Array(
            { name: 'Kick (Break)', colorClass: 'bg-kick', activeSteps: new Array(0, 10), lowVelocitySteps: new Array() },
            { name: 'Snare (Main)', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() },
            { name: 'Ghost Snare', colorClass: 'bg-snare', activeSteps: new Array(7, 9, 14), lowVelocitySteps: new Array(7, 9, 14) },
            { name: 'Hi-Hat (Fast)', colorClass: 'bg-hat', activeSteps: new Array(0, 2, 4, 6, 8, 10, 12, 14), lowVelocitySteps: new Array(2, 6, 10, 14) }
        ),
        drumTracksVariation: new Array(
            { name: 'Kick (2-Step)', colorClass: 'bg-kick', activeSteps: new Array(0, 8), lowVelocitySteps: new Array() },
            { name: 'Snare', colorClass: 'bg-snare', activeSteps: new Array(4, 12), lowVelocitySteps: new Array() },
            { name: 'Ride', colorClass: 'bg-hat', activeSteps: new Array(0, 2, 4, 6, 8, 10, 12, 14), lowVelocitySteps: new Array() }
        ),
        melodyTracks: new Array({ name: 'Reese Bass', colorClass: 'bg-bass', activeSteps: new Array(0), lowVelocitySteps: new Array() })
    },
    {
        id: 'funk', name: 'Funk (Groove)', bpm: 110, rootValue: 2, modeName: 'Dorian', tuning: 'Standard',
        effects: 'Guitare staccato ("cocottes"), Basse très syncopée.', examples: 'Chic (Good Times), Daft Punk.',
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
        effects: 'Overdrive à lampes. Rythme binaire solide.', examples: 'The Beatles, Hendrix. Gamme Mixolydienne rebelle.',
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
        effects: 'Samples vinyle (Lo-Fi), Swing fort sur les charleys.', examples: 'Wu-Tang Clan, Mobb Deep.',
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
        effects: 'Synthétiseurs analogiques, Reverb Gated sur caisse claire.', examples: 'Kavinsky, The Midnight.',
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