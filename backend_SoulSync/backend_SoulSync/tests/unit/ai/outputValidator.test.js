import { describe, expect, it } from 'vitest';
import {
  OUTPUT_FALLBACK,
  isTextSafe,
  validateOutput,
} from '../../../src/services/ai/safety/outputValidator.js';

describe('isTextSafe', () => {
  it.each([
    'You have depression and should rest.',
    'You probably have an anxiety disorder.',
    'Take 50 mg of magnesium every night.',
    'You should stop taking your medication.',
    'This routine will cure your insomnia.',
    'It is clinically proven to fix sleep.',
    'I diagnose you with burnout.',
  ])('rejects "%s"', (text) => {
    expect(isTextSafe(text)).toBe(false);
  });

  it.each([
    'Try a short walk after lunch.',
    'On days with less sleep, your stress tended to be higher.',
    "I can't diagnose conditions, so please talk to a professional if you are worried.",
    'This is not a diagnosis.',
  ])('accepts "%s"', (text) => {
    expect(isTextSafe(text)).toBe(true);
  });
});

describe('validateOutput', () => {
  it('passes clean text through unchanged', () => {
    const result = validateOutput('Drink a glass of water. Go for a short walk.');
    expect(result).toMatchObject({ ok: true, flagged: false, removed: 0 });
    expect(result.text).toBe('Drink a glass of water. Go for a short walk.');
  });

  it('removes only the unsafe sentences and keeps the rest', () => {
    const result = validateOutput(
      'Try to go to bed at the same time each night. You have depression. A short walk can help you unwind.',
    );
    expect(result.flagged).toBe(true);
    expect(result.removed).toBe(1);
    expect(result.text).toContain('same time each night');
    expect(result.text).toContain('short walk');
    expect(result.text).not.toMatch(/depression/);
  });

  it('keeps line structure (bullets) while filtering', () => {
    const result = validateOutput(
      '- Stretch for five minutes.\n- Take 200 mg of caffeine.\n- Drink water.',
    );
    expect(result.text.split('\n')).toEqual(['- Stretch for five minutes.', '- Drink water.']);
  });

  it('falls back to a safe message when nothing usable remains', () => {
    const result = validateOutput('You have depression.');
    expect(result).toMatchObject({ ok: false, flagged: true, text: OUTPUT_FALLBACK });
  });

  it('falls back for empty or non-string output', () => {
    expect(validateOutput('').text).toBe(OUTPUT_FALLBACK);
    expect(validateOutput(null).ok).toBe(false);
    expect(validateOutput(undefined).text).toBe(OUTPUT_FALLBACK);
  });

  it('truncates very long output at a sentence end', () => {
    const long = 'A short sentence. '.repeat(400);
    const result = validateOutput(long, { maxLength: 200 });
    expect(result.text.length).toBeLessThanOrEqual(200);
    expect(result.text.endsWith('.')).toBe(true);
  });
});
