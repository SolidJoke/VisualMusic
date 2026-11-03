// src/core/scalePositions.js
//
// VMU-202 (engine) — the pure scale-position engine. No React, no state, no
// hooks: it turns "this scale, on this neck, from this pitch" into an ordered
// list of positions, and answers the questions the UI will later ask about
// them (which position holds a fret, how they stack into rails, which one to
// show first). It is deliberately not wired into the UI yet.
//
// Vocabulary. A position is a fret window of span <= 5 holding exactly one
// cell for each of the N+1 notes of the octave [startPitch, startPitch + 12]
// (N = number of scale intervals, so a heptatonic scale has 8 notes). Span 4
// is normal; span 5 is the "grandEcart" (warning). Where the scale has no
// span-<=5 window below the first plain position (a "hole" under the first
// position), a single-shift position fills it: a strict prefix of the octave
// sits in a span-4 window, the hand shifts up at most 5 frets, and the rest
// sits in a second span-4 window.
//
// String indexing: stringIndex 0 = the highest string, the indexing
// scaleFrets already uses. The input tuning is low -> high (the order
// getStringTuning returns), so it is reversed internally.
import { resolveScaleSemitones, midiToNoteName } from './theory';

/**
 * The one pure entry point. Returns every position of the scale, from the nut
 * towards the body, numbered `index` 0..n-1 and identified by a stable `id`.
 *
 * @param {object} args
 * @param {string} args.scaleType - scale dictionary key (e.g. 'scale_major')
 * @param {number} args.startPitch - MIDI pitch of the octave's first note.
 *   The root is implied by startPitch (the root of the scale is the first
 *   note), so `root` is intentionally not a separate input here.
 * @param {string} args.instrument - 'guitar' | 'bass' (used for the id)
 * @param {number[]} args.tuning - open-string MIDI pitches, low -> high
 * @param {number} args.numFrets - number of frets on the neck
 * @param {object} [args.options] - { maxSpan = 4, warnSpan = 5, maxShiftDistance = 5 }
 * @returns {object[]} positions sorted by (minFret, maxFret)
 */
export function listScalePositions({ scaleType, startPitch, instrument, tuning, numFrets, options }) {
    const { maxSpan = 4, warnSpan = 5, maxShiftDistance = 5 } = options || {};

    const semitones = resolveScaleSemitones(scaleType) ?? resolveScaleSemitones('scale_major');
    // The N scale notes plus the octave: N+1 notes.
    const pitches = [...semitones.map((s) => startPitch + s), startPitch + 12];
    const openMidis = tuning.slice().reverse(); // index 0 = highest string

    // A note the neck cannot reach at all (any fret, any string) means this
    // octave is incomplete on this instrument: no positions.
    const hasAnyCell = (pitch) => openMidis.some((open) => pitch - open >= 0 && pitch - open <= numFrets);
    if (pitches.some((pitch) => !hasAnyCell(pitch))) return [];

    const cellCandidates = (pitch, lo, hi) => {
        const cells = [];
        for (let s = 0; s < openMidis.length; s++) {
            const fret = pitch - openMidis[s];
            if (fret >= lo && fret <= hi) cells.push({ stringIndex: s, fret });
        }
        return cells;
    };

    const windowWorks = (lo, hi) => pitches.every((pitch) => cellCandidates(pitch, lo, hi).length > 0);

    // Rule 4 (fingers): the open position reads fret 1..4 as fingers 1..4,
    // open string is 0; any window's top fret is at most the pinky (4).
    const fingerFor = (fret, windowLo) =>
        fret === 0 ? 0 : Math.min(4, fret - Math.max(windowLo, 1) + 1);

    // Rule 3 (determinism): forced single-candidate cells first, then the
    // multi-candidate notes in ascending pitch, each on the string that keeps
    // the position on the fewest strings and, ties, the bass-side string
    // (larger stringIndex).
    const chooseCells = (lo, hi, pitchEntries) => {
        const byPitch = pitchEntries.map(({ pitch, step }) => ({
            pitch,
            step,
            cells: cellCandidates(pitch, lo, hi),
        }));
        const used = new Set();
        const chosen = new Map();
        for (const entry of byPitch) {
            if (entry.cells.length === 1) {
                chosen.set(entry.pitch, entry.cells[0]);
                used.add(entry.cells[0].stringIndex);
            }
        }
        for (const entry of byPitch) {
            if (chosen.has(entry.pitch)) continue;
            const best = entry.cells.reduce((a, b) => {
                const ka = [used.has(a.stringIndex) ? 0 : 1, -a.stringIndex];
                const kb = [used.has(b.stringIndex) ? 0 : 1, -b.stringIndex];
                return ka[0] < kb[0] || (ka[0] === kb[0] && ka[1] < kb[1]) ? a : b;
            });
            chosen.set(entry.pitch, best);
            used.add(best.stringIndex);
        }
        return byPitch.map(({ pitch, step }) => {
            const cell = chosen.get(pitch);
            return {
                ...cell,
                pitch,
                step,
                finger: fingerFor(cell.fret, lo),
            };
        });
    };

    // ── Plain positions: minimal working windows of span <= warnSpan ──
    const working = [];
    for (let lo = 0; lo <= numFrets; lo++) {
        for (let hi = lo; hi <= Math.min(numFrets, lo + warnSpan - 1); hi++) {
            if (windowWorks(lo, hi)) working.push({ lo, hi, span: hi - lo + 1 });
        }
    }
    const isMinimal = (w) =>
        !working.some((v) => v.lo >= w.lo && v.hi <= w.hi && (v.lo > w.lo || v.hi < w.hi));

    const plain = working.filter(isMinimal).map(({ lo, hi, span }) => {
        const pitchEntries = pitches.map((pitch, step) => ({ pitch, step }));
        const cells = chooseCells(lo, hi, pitchEntries);
        return {
            minFret: lo,
            maxFret: hi,
            span,
            warning: span > maxSpan ? 'grandEcart' : null,
            shift: null,
            cells,
            scaleFrets: cells.map(({ stringIndex, fret }) => ({ stringIndex, fret })),
        };
    });

    // ── Rule 5 (shift): one hole below the first plain position, if any ──
    let shiftPosition = null;
    if (plain.length > 0) {
        const n = semitones.length;
        const plainMinFret = Math.min(...plain.map((p) => p.minFret));
        const candidates = [];

        for (let lo1 = 0; lo1 + 3 < plainMinFret; lo1++) {
            const hi1 = lo1 + 3;
            // Longest strict prefix of the octave playable in [lo1, hi1].
            let afterStep = -1;
            for (let k = 0; k < n; k++) {
                if (cellCandidates(pitches[k], lo1, hi1).length > 0) afterStep = k;
                else break;
            }
            if (afterStep < 0 || afterStep >= n) continue; // group 2 must be non-empty

            for (let lo2 = lo1 + 1; lo2 <= Math.min(numFrets, lo1 + maxShiftDistance); lo2++) {
                const hi2 = lo2 + 3;
                if (hi2 > numFrets) continue;
                if (hi2 - lo1 + 1 <= warnSpan) continue; // would fit one plain window

                const fits = (() => {
                    for (let k = afterStep + 1; k <= n; k++) {
                        if (cellCandidates(pitches[k], lo2, hi2).length === 0) return false;
                    }
                    return true;
                })();
                if (!fits) continue;

                // onString: a string carrying at least one note of each group.
                let onString = null;
                for (let s = 0; s < openMidis.length; s++) {
                    const inFirst = pitches.some((p, k) => k <= afterStep && p - openMidis[s] >= lo1 && p - openMidis[s] <= hi1);
                    const inSecond = pitches.some((p, k) => k > afterStep && p - openMidis[s] >= lo2 && p - openMidis[s] <= hi2);
                    if (inFirst && inSecond) { onString = s; break; }
                }

                const group1 = chooseCells(lo1, hi1, pitches.slice(0, afterStep + 1).map((pitch, k) => ({ pitch, step: k })));
                const group2 = chooseCells(lo2, hi2, pitches.slice(afterStep + 1).map((pitch, k) => ({ pitch, step: afterStep + 1 + k })));
                const cells = [...group1, ...group2].sort((a, b) => a.pitch - b.pitch);

                candidates.push({
                    lo1,
                    hi1,
                    lo2,
                    hi2,
                    distance: lo2 - lo1,
                    onString,
                    afterStep,
                    stringCount: new Set(cells.map((c) => c.stringIndex)).size,
                    cells,
                });
            }
        }

        if (candidates.length > 0) {
            // Best: lowest first window, then smallest shift, then fewest strings.
            candidates.sort(
                (a, b) =>
                    a.lo1 - b.lo1 || a.distance - b.distance || a.stringCount - b.stringCount
            );
            const best = candidates[0];
            shiftPosition = {
                minFret: best.lo1,
                maxFret: best.hi2,
                span: best.hi2 - best.lo1 + 1,
                warning: null,
                shift: {
                    afterStep: best.afterStep,
                    onString: best.onString,
                    from: { lo: best.lo1, hi: best.hi1 },
                    to: { lo: best.lo2, hi: best.hi2 },
                    distance: best.distance,
                },
                cells: best.cells,
                scaleFrets: best.cells.map(({ stringIndex, fret }) => ({ stringIndex, fret })),
            };
        }
    }

    const positions = [...plain, ...(shiftPosition ? [shiftPosition] : [])];
    positions.sort((a, b) => a.minFret - b.minFret || a.maxFret - b.maxFret);
    positions.forEach((p, index) => {
        p.index = index;
        p.id = `pos_${instrument}_${startPitch}_${index}`;
    });
    return positions;
}

/**
 * Every complete octave of the scale reachable on the neck, from the lowest
 * to the highest, as { pitch, label, positionCount } — positionCount counts
 * every position including the shift, so the same scale lists different
 * counts on octaves that have a hole under their first position.
 *
 * @param {object} args - same inputs as listScalePositions, plus the root.
 * @param {number} args.root - chromatic root value (0 = C)
 */
export function availableStartPitches({ scaleType, root, instrument, tuning, numFrets, options }) {
    const rootPc = ((root % 12) + 12) % 12;
    const minOpen = Math.min(...tuning);
    const maxOpen = Math.max(...tuning);
    const first = minOpen + ((rootPc - (((minOpen % 12) + 12) % 12) + 12) % 12);
    const out = [];
    for (let p = first; p <= maxOpen + numFrets; p += 12) {
        const positions = listScalePositions({ scaleType, root, startPitch: p, instrument, tuning, numFrets, options });
        if (positions.length >= 1) {
            out.push({ pitch: p, label: midiToNoteName(p), positionCount: positions.length });
        }
    }
    return out;
}

/**
 * The position holding a fret: the most centred one by default (ties to the
 * lower index), or the next one after previousIndex, wrapping around to the
 * first. null when no position holds the fret (or the list is empty).
 */
export function positionAtFret(positions, fret, previousIndex = null) {
    if (!positions || positions.length === 0) return null;
    const idxs = positions
        .map((p, i) => ({ i, lo: p.minFret, hi: p.maxFret }))
        .filter(({ lo, hi }) => fret >= lo && fret <= hi)
        .map(({ i }) => i);
    if (idxs.length === 0) return null;
    if (previousIndex === null || previousIndex === undefined) {
        let best = idxs[0];
        let bestDist = Infinity;
        for (const i of idxs) {
            const centre = (positions[i].minFret + positions[i].maxFret) / 2;
            const d = Math.abs(centre - fret);
            if (d < bestDist) {
                bestDist = d;
                best = i;
            }
        }
        return best;
    }
    for (const i of idxs) if (i > previousIndex) return i;
    return idxs[0];
}

/**
 * Greedy interval-graph colouring: every position gets the smallest lane
 * whose positions so far do not overlap it (two positions sharing a fret are
 * on different lanes). Returns a lane number per position, in list order.
 */
export function railLanes(positions) {
    const lanes = new Array(positions.length);
    for (let i = 0; i < positions.length; i++) {
        let lane = 0;
        while (true) {
            const clash = positions.some(
                (p, j) =>
                    j < i &&
                    lanes[j] === lane &&
                    positions[i].minFret <= p.maxFret &&
                    p.minFret <= positions[i].maxFret
            );
            if (!clash) break;
            lane++;
        }
        lanes[i] = lane;
    }
    return lanes;
}

/**
 * The index a neck should show by default: the span-4 position nearest the
 * nut when one exists, otherwise the first position. null for an empty list.
 */
export function defaultPositionIndex(positions) {
    if (!positions || positions.length === 0) return null;
    const span4 = positions
        .map((p, i) => ({ i, minFret: p.minFret, span: p.span }))
        .filter((p) => p.span === 4);
    if (span4.length > 0) {
        return span4.reduce((best, p) => (p.minFret < best.minFret ? p : best)).i;
    }
    return 0;
}
