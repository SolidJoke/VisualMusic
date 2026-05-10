/**
 * Bass Intelligence Engine
 * Generates bass patterns based on musical genres and chord progressions.
 */

const BASS_TEMPLATES = {
    standard: {
        activeSteps: [0, 8],
        pitchSteps: { 0: 'R', 8: 'R' }
    },
    rock: {
        activeSteps: [0, 4, 8, 12],
        pitchSteps: { 0: 'R', 4: 'R', 8: 'R', 12: 'R' }
    },
    jazz: {
        activeSteps: [0, 4, 8, 12],
        pitchSteps: { 0: 'R', 4: '2', 8: '3', 12: '5' }
    },
    pop: {
        activeSteps: [0, 6, 8, 14],
        pitchSteps: { 0: 'R', 6: '5', 8: 'R', 14: '5' }
    },
    electronic: {
        activeSteps: [0, 2, 4, 6, 8, 10, 12, 14],
        pitchSteps: { 
            0: 'R', 2: '8va', 4: 'R', 6: '8va', 
            8: 'R', 10: '8va', 12: 'R', 14: '8va' 
        }
    },
    funk: {
        activeSteps: [0, 3, 7, 10, 14],
        pitchSteps: { 0: 'R', 3: '5', 7: 'R', 10: 'b7', 14: '5' }
    },
    reggae: {
        activeSteps: [2, 6, 10, 14],
        pitchSteps: { 2: 'R', 6: '5', 10: 'R', 14: '3' }
    }
};

/**
 * Maps a genre string to a template key.
 */
function getTemplateKey(genre = '') {
    const g = genre.toLowerCase();
    if (g.includes('jazz') || g.includes('bossa')) return 'jazz';
    if (g.includes('rock') || g.includes('metal')) return 'rock';
    if (g.includes('pop')) return 'pop';
    if (g.includes('funk') || g.includes('disco')) return 'funk';
    if (g.includes('electronic') || g.includes('techno') || g.includes('house')) return 'electronic';
    if (g.includes('reggae')) return 'reggae';
    return 'standard';
}

/**
 * Suggests a bass pattern for a given genre and progression.
 * @param {string} genre - Musical genre or group
 * @param {Array} chords - Array of chord objects
 * @returns {Object} A melody track object
 */
export function suggestBassPattern(genre, chords) {
    const templateKey = getTemplateKey(genre);
    const template = BASS_TEMPLATES[templateKey] || BASS_TEMPLATES.standard;

    // For now, we return the template directly.
    // In the future, we could adapt the pattern based on chord density.
    return {
        name: "Bass",
        activeSteps: [...template.activeSteps],
        pitchSteps: { ...template.pitchSteps }
    };
}
