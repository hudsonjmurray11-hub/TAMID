import { describe, expect, it } from 'vitest';
import { ALL_ROUNDS, COMPETENCIES, FACTORS, PACKS, RARITY, ROUNDS } from '../content/game-content';
import { RoundMatcher, normalize } from '../shared/matcher';

describe('content bank', () => {
  it('has six rounds with the required prompts', () => {
    expect(ROUNDS.map((r) => r.prompt)).toEqual([
      'Name something that uses a lot of water.',
      'Name something that makes a road trip annoying.',
      'Name a way to raise money for a project.',
      'Name something a self-driving car needs to notice.',
      'You launch an app and nobody uses it. What do you do next?',
      'Name a way to help a friend starting something new.',
    ]);
  });

  it('offers two question sets of six rounds each, with unique round ids', () => {
    expect(PACKS.map((p) => p.name)).toEqual(['Startup Road Trip', 'Everyday Classics']);
    for (const p of PACKS) expect(p.rounds, p.id).toHaveLength(6);
    expect(PACKS[1].rounds.map((r) => r.prompt)).toEqual([
      'Name something you pack for a beach day.',
      'Name something your phone helps you do.',
      'Name something a new startup might need.',
      'Name a way to get around a city.',
      'You failed a test. Name something you’d do next.',
      'Name somewhere people find new ideas.',
    ]);
    const ids = ALL_ROUNDS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has 30+ answers per round and 200+ overall, with every tier present', () => {
    let total = 0;
    for (const r of ALL_ROUNDS) {
      expect(r.answers.length, r.id).toBeGreaterThanOrEqual(30);
      expect(r.answers.length, r.id).toBeLessThanOrEqual(80);
      for (const t of Object.keys(RARITY)) expect(r.answers.some((a) => a.tier === t), `${r.id} ${t}`).toBe(true);
      total += r.answers.length;
    }
    expect(total).toBeGreaterThanOrEqual(200);
  });

  it('has no alias that resolves to two different answers', () => {
    for (const r of ALL_ROUNDS) expect(new RoundMatcher(r).conflicts, r.id).toEqual([]);
  });

  it('has no duplicate labels inside a round', () => {
    for (const r of ALL_ROUNDS) {
      const labels = r.answers.map((a) => normalize(a.label));
      expect(new Set(labels).size, r.id).toBe(labels.length);
    }
  });

  it('keeps a source URL beside every factual insight and factor', () => {
    for (const r of ALL_ROUNDS) {
      expect(r.insight.sources.length).toBeGreaterThan(0);
      for (const s of r.insight.sources) expect(s.url).toMatch(/^https:\/\//);
      expect(FACTORS.some((f) => f.id === r.factorId)).toBe(true);
    }
    expect(FACTORS).toHaveLength(5);
    for (const f of FACTORS) for (const s of f.sources) expect(s.url).toMatch(/^https:\/\//);
    expect(COMPETENCIES.map((c) => c.title)).toEqual(['Pursuing Innovation', 'Cultivating Resilience', 'Empowering Leadership']);
  });

  it('includes startup-focused ways to raise money', () => {
    const money = new RoundMatcher(ROUNDS[2]);
    expect(money.match('pitching')?.answer.label).toBe('Pitch to investors');
    expect(money.match('seed round')?.answer.tier).toBe('rare');
    expect(money.match('SAFE')?.answer.tier).toBe('gem');
  });

  it('ranks sample answers in the expected tiers', () => {
    const m = new RoundMatcher(ROUNDS[0]);
    expect(m.match('Shower')?.answer.tier).toBe('common');
    expect(m.match('Garden')?.answer.tier).toBe('uncommon');
    expect(m.match('Farming')?.answer.tier).toBe('rare');
    expect(m.match('Jeans')?.answer.tier).toBe('gem');
  });
});
