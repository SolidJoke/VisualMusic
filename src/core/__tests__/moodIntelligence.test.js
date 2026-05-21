import { describe, it, expect } from 'vitest';
import extendedTheoryData from '../extendedTheoryData.json';
import { CHORDS, SCALES } from '../theory';

describe('Mood Intelligence Integration', () => {
    it('should have a mood profile for every registered CHORD', () => {
        const chordProfiles = extendedTheoryData.moodProfiles.chords;
        const missingChords = [];

        Object.keys(CHORDS).forEach(chordKey => {
            if (!chordProfiles[chordKey]) {
                missingChords.push(chordKey);
            }
        });

        expect(missingChords).toEqual([]);
    });

    it('should have a mood profile for every registered SCALE', () => {
        const scaleProfiles = extendedTheoryData.moodProfiles.scales;
        const missingScales = [];

        Object.keys(SCALES).forEach(scaleKey => {
            if (!scaleProfiles[scaleKey]) {
                missingScales.push(scaleKey);
            }
        });

        expect(missingScales).toEqual([]);
    });

    it('should have tension, genres and tempo attributes on mood profiles', () => {
        const majorChordProfile = extendedTheoryData.moodProfiles.chords['chord_major'];
        expect(majorChordProfile.tension).toBeDefined();
        expect(typeof majorChordProfile.tension).toBe('number');
        expect(Array.isArray(majorChordProfile.genres)).toBe(true);
        expect(typeof majorChordProfile.tempo).toBe('string');
    });
});
