// Balance insights: flag the most lopsided antagonist pair over 7 days.
import type { Credits } from './load';
import type { Muscle } from './muscles';

export type Pair = { id: string; a: Muscle[]; b: Muscle[] };
export const PAIRS: Pair[] = [
  { id: 'push_pull', a: ['chest'], b: ['lats', 'upper_back'] },
  { id: 'quad_ham', a: ['quads'], b: ['hamstrings'] },
  { id: 'bi_tri', a: ['biceps'], b: ['triceps'] },
  { id: 'abs_back', a: ['abs'], b: ['lower_back'] },
];

export type Insight = { pair: string; strong: Muscle[]; weak: Muscle[]; strongCredits: number; weakCredits: number; ratio: number };

const sum = (c: Credits, ms: Muscle[]) => ms.reduce((a, m) => a + c[m], 0);

export function balanceInsight(c: Credits): Insight | null {
  let best: Insight | null = null;
  for (const p of PAIRS) {
    const a = sum(c, p.a);
    const b = sum(c, p.b);
    const [strong, weak, sc, wc] = a >= b ? [p.a, p.b, a, b] : [p.b, p.a, b, a];
    if (sc < 4) continue;
    const ratio = wc / sc;
    if (ratio >= 0.6) continue;
    if (!best || ratio < best.ratio) best = { pair: p.id, strong, weak, strongCredits: sc, weakCredits: wc, ratio };
  }
  return best;
}
