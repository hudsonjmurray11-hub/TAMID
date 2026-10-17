import { describe, expect, it } from 'vitest';
import { ROUNDS } from '../content/game-content';
import { RoundMatcher, editDistance, normalize } from '../shared/matcher';

const m = (round: number) => new RoundMatcher(ROUNDS[round]);

describe('normalize', () => {
  it('ignores case, punctuation, accents, fillers and simple plurals', () => {
    expect(normalize('  SUNSCREEN!! ')).toBe('sunscreen');
    expect(normalize('Café')).toBe('cafe');
    expect(normalize('the Towels')).toBe('towel');
    expect(normalize('a first-aid kit')).toBe('first aid kit');
    expect(normalize('Don’t give up')).toBe(normalize("dont give up"));
    expect(normalize('Buses')).toBe('bus');
    expect(normalize('Bus')).toBe('bus');
  });

  it('measures typos with transpositions', () => {
    expect(editDistance('snorkel', 'snorkle')).toBe(1);
    expect(editDistance('umbrella', 'umbrela')).toBe(1);
  });
});

describe('every accepted answer and alias', () => {
  it('resolves to itself (label + all aliases, all rounds)', () => {
    let checked = 0;
    for (const round of ROUNDS) {
      const matcher = new RoundMatcher(round);
      for (const a of round.answers) {
        for (const text of [a.label, a.label.toUpperCase(), ...(a.aliases ?? [])]) {
          const hit = matcher.match(text);
          expect(hit?.answer.label, `${round.id}: "${text}"`).toBe(a.label);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(900);
  });
});

describe('matching examples', () => {
  it('accepts common spellings, synonyms and small typos', () => {
    const beach = m(0);
    expect(beach.match('sun block')?.answer.label).toBe('Sunscreen');
    expect(beach.match('Sunscren')?.answer.label).toBe('Sunscreen');
    expect(beach.match('umbrela')?.answer.label).toBe('Beach umbrella');
    expect(beach.match('snorkle')?.answer.label).toBe('Snorkel');
    expect(beach.match('Fisrt aid kit')?.answer.label).toBe('First-aid kit');
    expect(beach.match('BAND-AIDS')?.answer.label).toBe('First-aid kit');
    expect(beach.match('flipflops')?.answer.label).toBe('Flip-flops');
    expect(m(1).match('Google Maps')?.answer.label).toBe('Navigate');
    expect(m(2).match('VCs')?.answer.label).toBe('Investors');
    expect(m(3).match('bicycles')?.answer.label).toBe('Bike');
    expect(m(3).match('e-scooter')?.answer.label).toBe('Scooter');
    expect(m(4).match("don't give up")?.answer.label).toBe('Don’t give up');
    expect(m(4).match('post mortem')?.answer.label).toBe('Post-mortem');
    expect(m(5).match('Café')?.answer.label).toBe('Coffee shop');
  });

  it('rejects unrelated answers and does not stretch short words', () => {
    const beach = m(0);
    for (const bad of ['spaceship', 'car', 'cat', 'tax return', 'homework', 'zzzz', '', '   ', '!!!', 'dog']) {
      expect(beach.match(bad), bad).toBeNull();
    }
    expect(m(3).match('bake')).toBeNull(); // not "bike": short words need exact matches
    expect(m(3).match('trian')).not.toBeNull(); // 5 letters: one typo ok
    expect(m(1).match('call of duty')).toBeNull();
    expect(m(2).match('a pony')).toBeNull();
    expect(m(5).match('the moon')).toBeNull();
  });

  it('requires the same first letter for fuzzy matches', () => {
    expect(m(0).match('powel')).toBeNull(); // not "towel"
  });
});
