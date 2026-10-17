import { describe, expect, it } from 'vitest';
import { COMPETENCIES, FACTORS, RARITY, ROUNDS } from '../content/game-content';
import { RoundMatcher, normalize } from '../shared/matcher';

describe('content bank', () => {
  it('has six rounds with the required prompts', () => {
    expect(ROUNDS.map((r) => r.prompt)).toEqual([
      'Name something that uses a lot of water.',
      'Name something that makes a road trip annoying.',
      'Name a way to raise money for a project.',
      'Name something a self-driving car needs to notice.',
      'Your first product flopped. Name a smart next move.',
      'Name a way to help a friend starting something new.',
    ]);
  });

  it('has 30+ answers per round and 200+ overall, with every tier present', () => {
    let total = 0;
    for (const r of ROUNDS) {
      expect(r.answers.length, r.id).toBeGreaterThanOrEqual(30);
      expect(r.answers.length, r.id).toBeLessThanOrEqual(80);
      for (const t of Object.keys(RARITY)) expect(r.answers.some((a) => a.tier === t), `${r.id} ${t}`).toBe(true);
      total += r.answers.length;
    }
    expect(total).toBeGreaterThanOrEqual(200);
  });

  it('has no alias that resolves to two different answers', () => {
    for (const r of ROUNDS) expect(new RoundMatcher(r).conflicts, r.id).toEqual([]);
  });

  it('has no duplicate labels inside a round', () => {
    for (const r of ROUNDS) {
      const labels = r.answers.map((a) => normalize(a.label));
      expect(new Set(labels).size, r.id).toBe(labels.length);
    }
  });

  it('keeps a source URL beside every factual insight and factor', () => {
    for (const r of ROUNDS) {
      expect(r.insight.sources.length).toBeGreaterThan(0);
      for (const s of r.insight.sources) expect(s.url).toMatch(/^https:\/\//);
      expect(FACTORS.some((f) => f.id === r.factorId)).toBe(true);
    }
    expect(FACTORS).toHaveLength(5);
    for (const f of FACTORS) for (const s of f.sources) expect(s.url).toMatch(/^https:\/\//);
    expect(COMPETENCIES.map((c) => c.title)).toEqual(['Pursuing Innovation', 'Cultivating Resilience', 'Empowering Leadership']);
  });

  it('ranks sample answers in the expected tiers', () => {
    const m = new RoundMatcher(ROUNDS[0]);
    expect(m.match('Shower')?.answer.tier).toBe('common');
    expect(m.match('Garden')?.answer.tier).toBe('uncommon');
    expect(m.match('Farming')?.answer.tier).toBe('rare');
    expect(m.match('Jeans')?.answer.tier).toBe('gem');
  });
});
