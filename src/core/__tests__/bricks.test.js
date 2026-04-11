// src/core/__tests__/bricks.test.js
//
// Edge-case tests for BRICKS data integrity.
// These tests act as a regression safety net against the P0 crashes that occurred
// when bricks were missing required properties (examples, effects, tuning, etc.)

import { describe, it, expect } from 'vitest';
import { BRICKS } from '../bricks';

const SUPPORTED_LANGS = ['fr', 'en'];

describe('BRICKS data integrity', () => {
  it('should contain at least one brick', () => {
    expect(Array.isArray(BRICKS)).toBe(true);
    expect(BRICKS.length).toBeGreaterThan(0);
  });

  BRICKS.forEach((brick, index) => {
    const label = brick.name?.en ?? `brick[${index}]`;

    describe(`Brick: "${label}"`, () => {
      it('has a name with fr and en keys', () => {
        expect(brick.name).toBeDefined();
        SUPPORTED_LANGS.forEach(lang => {
          expect(brick.name[lang], `brick.name.${lang} missing`).toBeTruthy();
        });
      });

      it('has effects with fr and en keys', () => {
        expect(brick.effects).toBeDefined();
        SUPPORTED_LANGS.forEach(lang => {
          expect(brick.effects[lang], `brick.effects.${lang} missing`).toBeTruthy();
        });
      });

      it('has examples with fr and en keys', () => {
        expect(brick.examples).toBeDefined();
        SUPPORTED_LANGS.forEach(lang => {
          expect(brick.examples[lang], `brick.examples.${lang} missing`).toBeTruthy();
        });
      });

      it('has a valid bpm number', () => {
        expect(typeof brick.bpm).toBe('number');
        expect(brick.bpm).toBeGreaterThan(0);
        expect(brick.bpm).toBeLessThanOrEqual(300);
      });

      it('has a nnsProgression array with at least one entry', () => {
        expect(Array.isArray(brick.nnsProgression)).toBe(true);
        expect(brick.nnsProgression.length).toBeGreaterThan(0);
      });

      it('has a theme with primary and bg', () => {
        expect(brick.theme).toBeDefined();
        expect(brick.theme.primary).toBeTruthy();
        expect(brick.theme.bg).toBeTruthy();
      });

      it('has drumTracks array', () => {
        expect(Array.isArray(brick.drumTracks)).toBe(true);
      });

      it('has melodyTracks array', () => {
        expect(Array.isArray(brick.melodyTracks)).toBe(true);
      });

      // Required for expert_progressions bricks (the ones that caused P0 crashes)
      if (brick._group === 'expert_progressions') {
        it('[expert_progressions] has tuning string', () => {
          expect(typeof brick.tuning).toBe('string');
          expect(brick.tuning).toBeTruthy();
        });

        it('[expert_progressions] has guitarStrings array of 6 items', () => {
          expect(Array.isArray(brick.guitarStrings)).toBe(true);
          expect(brick.guitarStrings.length).toBe(6);
        });

        it('[expert_progressions] has bassStrings array of 4 items', () => {
          expect(Array.isArray(brick.bassStrings)).toBe(true);
          expect(brick.bassStrings.length).toBe(4);
        });

        it('[expert_progressions] has modeName string', () => {
          expect(typeof brick.modeName).toBe('string');
          expect(brick.modeName).toBeTruthy();
        });

        it('[expert_progressions] has rootValue between 0 and 11', () => {
          expect(typeof brick.rootValue).toBe('number');
          expect(brick.rootValue).toBeGreaterThanOrEqual(0);
          expect(brick.rootValue).toBeLessThanOrEqual(11);
        });
      }
    });
  });
});
