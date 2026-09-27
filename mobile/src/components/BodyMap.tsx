// The muscle map: front/back silhouettes whose muscles fill by level (0–4) with animated colour.
import geometry from '@shared/body-geometry.json';
import { memo, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Ellipse, G, Path } from 'react-native-svg';
import type { Muscle } from '@/features/muscles';
import { color as C, heat } from '@/theme/tokens';

type Base = { kind: 'ellipse' | 'path'; cx?: number; cy?: number; rx?: number; ry?: number; d?: string; mirror: boolean };
type ViewGeo = { base: Base[]; muscles: Partial<Record<Muscle, string>> };
const GEO = geometry as unknown as { front: ViewGeo; back: ViewGeo };

export const READY_PALETTE = ['#1D4A3D', '#2B6B55', '#8F6A2C', '#C0522F', '#E8583A'] as const;

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Colour at a fractional level 0..4 along the palette. */
export function paletteAt(palette: readonly string[], level: number): string {
  const l = Math.max(0, Math.min(palette.length - 1, level));
  const i = Math.floor(l);
  const f = l - i;
  if (f === 0 || i >= palette.length - 1) return palette[Math.round(l)];
  const a = hexToRgb(palette[i]);
  const b = hexToRgb(palette[i + 1]);
  const c = a.map((x, k) => Math.round(x + (b[k] - x) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Tween a number with requestAnimationFrame (works the same on Android and web, no native colour props). */
function useTween(target: number, delay: number, duration = 520): number {
  const [v, setV] = useState(0);
  const cur = useRef(0);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const from = cur.current;
    const timer = setTimeout(() => {
      const step = (t: number) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / duration);
        const e = 1 - Math.pow(1 - p, 3);
        cur.current = from + (target - from) * e;
        setV(cur.current);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [target, delay, duration]);
  return v;
}

const MusclePath = memo(function MusclePath({
  d, level, palette, delay, selected, dim, onPress, label,
}: { d: string; level: number; palette: readonly string[]; delay: number; selected: boolean; dim: boolean; onPress?: () => void; label: string }) {
  const lv = useTween(level, delay);
  const common = {
    fill: paletteAt(palette, lv),
    stroke: selected ? C.ink : C.outline,
    strokeWidth: selected ? 2.2 : 1.2,
    strokeLinejoin: 'round' as const,
    opacity: dim ? 0.35 : 1,
    onPress,
    accessibilityLabel: label,
  };
  return (
    <>
      <Path d={d} {...common} />
      <G transform="translate(200,0) scale(-1,1)">
        <Path d={d} {...common} />
      </G>
    </>
  );
});

export type BodyMapProps = {
  view: 'front' | 'back';
  levels: Partial<Record<Muscle, number>>;
  width: number;
  palette?: readonly string[];
  selected?: Muscle | null;
  /** When set, muscles not in this list are dimmed (e.g. show only one exercise). */
  focus?: readonly Muscle[] | null;
  onPressMuscle?: (m: Muscle) => void;
  /** Stagger the fill animation (ms per muscle) for the heat-up reveal. */
  stagger?: number;
  startDelay?: number;
  labels?: Partial<Record<Muscle, string>>;
};

export const BodyMap = memo(function BodyMap({
  view, levels, width, palette = heat, selected = null, focus = null, onPressMuscle, stagger = 0, startDelay = 0, labels,
}: BodyMapProps) {
  const g = GEO[view];
  const height = width * 2.2;
  const entries = Object.entries(g.muscles) as [Muscle, string][];
  return (
    <View style={{ width, height }} accessibilityRole="image">
      <Svg width={width} height={height} viewBox="0 0 200 440">
        {g.base.map((b, i) => {
          const el =
            b.kind === 'ellipse' ? (
              <Ellipse key={`b${i}`} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={C.bodyBase} />
            ) : (
              <Path key={`b${i}`} d={b.d!} fill={C.bodyBase} />
            );
          return b.mirror ? (
            <G key={`g${i}`}>
              {el}
              <G transform="translate(200,0) scale(-1,1)">{el}</G>
            </G>
          ) : (
            el
          );
        })}
        {entries.map(([m, d], i) => (
          <MusclePath
            key={m}
            d={d}
            level={levels[m] ?? 0}
            palette={palette}
            delay={startDelay + i * stagger}
            selected={selected === m}
            dim={!!focus && !focus.includes(m)}
            onPress={onPressMuscle ? () => onPressMuscle(m) : undefined}
            label={labels?.[m] ?? m}
          />
        ))}
      </Svg>
    </View>
  );
});

/** Front and back side by side. */
export function BodyPair({ levels, width, gap = 8, palette, focus, stagger, startDelay }: Omit<BodyMapProps, 'view' | 'width'> & { width: number; gap?: number }) {
  const w = (width - gap) / 2;
  return (
    <View style={{ flexDirection: 'row', gap }}>
      <BodyMap view="front" levels={levels} width={w} palette={palette} focus={focus} stagger={stagger} startDelay={startDelay} />
      <BodyMap view="back" levels={levels} width={w} palette={palette} focus={focus} stagger={stagger} startDelay={(startDelay ?? 0) + (stagger ?? 0) * 4} />
    </View>
  );
}

/** Level for the readiness palette: 0 fresh … 4 fatigued. */
export function readinessLevel(pct: number): number {
  if (pct >= 95) return 0;
  if (pct >= 80) return 1;
  if (pct >= 65) return 2;
  if (pct >= 50) return 3;
  return 4;
}
