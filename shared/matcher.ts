// Answer normalisation and conservative fuzzy matching.
import type { AnswerDef, RoundDef } from './types';

const LEADING_FILLERS = new Set(['a', 'an', 'the', 'some', 'my', 'your', 'our', 'to', 'just']);

function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  if (word.endsWith('sses')) return word.slice(0, -2);
  if (/(ses|xes|ches|shes|zes)$/.test(word)) return word.slice(0, -2);
  if (/(ss|us|is)$/.test(word)) return word;
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

/** Lowercase, strip accents, punctuation, leading fillers and simple plurals. */
export function normalize(input: string): string {
  let s = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`´‘]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9֐-׿]+/g, ' ')
    .trim();
  const words = s.split(' ').filter(Boolean);
  while (words.length > 1 && LEADING_FILLERS.has(words[0])) words.shift();
  return words.map(singularize).join(' ');
}

/** Restricted Damerau–Levenshtein (optimal string alignment) distance. */
export function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) d.push([i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

/** How many typos we tolerate for a key of this length. */
function typoBudget(len: number): number {
  if (len < 5) return 0;
  if (len < 9) return 1;
  return 2;
}

export function answerId(roundId: string, def: AnswerDef): string {
  return `${roundId}:${normalize(def.label).replace(/ /g, '-')}`;
}

export interface MatchResult {
  answer: AnswerDef;
  id: string;
  exact: boolean;
}

export class RoundMatcher {
  private exact = new Map<string, { id: string; def: AnswerDef }>();
  private keys: { key: string; id: string; def: AnswerDef }[] = [];
  readonly conflicts: string[] = [];

  constructor(round: RoundDef) {
    for (const def of round.answers) {
      const id = answerId(round.id, def);
      for (const raw of [def.label, ...(def.aliases ?? [])]) {
        const n = normalize(raw);
        if (!n) continue;
        for (const key of new Set([n, n.replace(/ /g, '')])) {
          const prev = this.exact.get(key);
          if (prev && prev.id !== id) this.conflicts.push(`"${raw}" → ${prev.def.label} / ${def.label}`);
          if (!prev) {
            this.exact.set(key, { id, def });
            this.keys.push({ key, id, def });
          }
        }
      }
    }
  }

  match(input: string): MatchResult | null {
    const n = normalize(input);
    if (!n || n.length > 60) return null;
    const hit = this.exact.get(n) ?? this.exact.get(n.replace(/ /g, ''));
    if (hit) return { answer: hit.def, id: hit.id, exact: true };

    // Conservative typo tolerance: same first letter, small budget, and a
    // unique best answer (no other answer equally close).
    const compact = n.replace(/ /g, '');
    let best: { dist: number; id: string; def: AnswerDef } | null = null;
    let tie = false;
    for (const k of this.keys) {
      if (k.key.includes(' ')) continue;
      const budget = Math.min(typoBudget(k.key.length), typoBudget(compact.length));
      if (budget === 0 || k.key[0] !== compact[0]) continue;
      const dist = editDistance(compact, k.key, budget);
      if (dist > budget) continue;
      if (!best || dist < best.dist) {
        best = { dist, id: k.id, def: k.def };
        tie = false;
      } else if (dist === best.dist && k.id !== best.id) {
        tie = true;
      }
    }
    if (best && !tie) return { answer: best.def, id: best.id, exact: false };
    return null;
  }
}

const cache = new Map<string, RoundMatcher>();
export function matcherFor(round: RoundDef): RoundMatcher {
  let m = cache.get(round.id);
  if (!m) {
    m = new RoundMatcher(round);
    cache.set(round.id, m);
  }
  return m;
}
