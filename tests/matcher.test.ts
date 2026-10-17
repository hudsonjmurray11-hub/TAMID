import { describe, expect, it } from 'vitest';
import { ROUNDS } from '../content/game-content';
import { RoundMatcher, editDistance, normalize } from '../shared/matcher';

const m = (round: number) => new RoundMatcher(ROUNDS[round]);

describe('normalize', () => {
  it('ignores case, punctuation, accents, fillers and simple plurals', () => {
    expect(normalize('  SHOWER!! ')).toBe('shower');
    expect(normalize('Café')).toBe('cafe');
    expect(normalize('the Showers')).toBe('shower');
    expect(normalize('a self-driving car')).toBe('self driving car');
    expect(normalize('Don’t give up')).toBe(normalize("dont give up"));
    expect(normalize('Buses')).toBe('bus');
    expect(normalize('Bus')).toBe('bus');
  });

  it('measures typos with transpositions', () => {
    expect(editDistance('potholes', 'potholse')).toBe(1);
    expect(editDistance('dishwasher', 'dishwahser')).toBe(1);
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
    const water = m(0);
    expect(water.match('doing laundry')?.answer.label).toBe('Washing machine');
    expect(water.match('dishwahser')?.answer.label).toBe('Dishwasher');
    expect(water.match('Agriculture')?.answer.label).toBe('Farming');
    expect(water.match('DENIM!')?.answer.label).toBe('Jeans');
    expect(water.match('data centres')?.answer.label).toBe('Data centers'); // British spelling via typo tolerance
    expect(m(1).match('traffic jams')?.answer.label).toBe('Traffic');
    expect(m(1).match('back-seat drivers')?.answer.label).toBe('Backseat drivers');
    expect(m(1).match('potholse')?.answer.label).toBe('Potholes');
    expect(m(2).match('GoFundMe')?.answer.label).toBe('Crowdfunding');
    expect(m(2).match('VCs')?.answer.label).toBe('Venture capital');
    expect(m(3).match('red lights')?.answer.label).toBe('Traffic lights');
    expect(m(3).match('pedestrains')?.answer.label).toBe('Pedestrians');
    expect(m(4).match("don't give up")?.answer.label).toBe('Don’t give up');
    expect(m(4).match('post mortem')?.answer.label).toBe('Post-mortem');
    expect(m(5).match('Introductions')?.answer.label).toBe('Introduce them to people');
    expect(m(5).match('pay it forward')?.answer.label).toBe('Pay it forward');
  });

  it('rejects unrelated answers and does not stretch short words', () => {
    for (const bad of ['spaceship', 'cat', 'tax return', 'homework', 'zzzz', '', '   ', '!!!', 'pizza']) {
      expect(m(0).match(bad), bad).toBeNull();
    }
    expect(m(3).match('bake')).toBeNull(); // not "bike": short words need exact matches
    expect(m(3).match('stop sing')).not.toBeNull(); // small typo in a longer answer is fine
    expect(m(1).match('call of duty')).toBeNull();
    expect(m(2).match('a pony')).toBeNull();
    expect(m(5).match('the moon')).toBeNull();
  });

  it('requires the same first letter for fuzzy matches', () => {
    expect(m(0).match('chower')).toBeNull(); // not "shower"
  });
});
