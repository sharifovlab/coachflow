// Small purpose-built charts: weight trend line, 12-week activity grid.
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { WeightPoint } from '@/features/progress';
import { color as C, heat } from '@/theme/tokens';

export function TrendChart({ points, trend, width, height = 120 }: { points: WeightPoint[]; trend: WeightPoint[]; width: number; height?: number }) {
  if (points.length < 2) return <View style={{ height }} />;
  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const ks = points.map((p) => p.kg);
  const lo = Math.min(...ks) - 0.8;
  const hi = Math.max(...ks) + 0.8;
  const pad = 8;
  const X = (t: number) => pad + ((t - t0) / Math.max(1, t1 - t0)) * (width - pad * 2);
  const Y = (k: number) => pad + (1 - (k - lo) / (hi - lo)) * (height - pad * 2);
  const line = trend.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)} ${Y(p.kg).toFixed(1)}`).join(' ');
  const area = `${line} L${X(t1)} ${height} L${X(t0)} ${height} Z`;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={C.ember} stopOpacity={0.35} />
          <Stop offset="1" stopColor={C.ember} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill="url(#g)" />
      <Path d={line} stroke={C.ember} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <Circle key={i} cx={X(p.t)} cy={Y(p.kg)} r={3} fill={C.ink2} opacity={0.6} />
      ))}
      <Circle cx={X(trend[trend.length - 1].t)} cy={Y(trend[trend.length - 1].kg)} r={6} fill={C.ember} stroke={C.surface} strokeWidth={3} />
    </Svg>
  );
}

/** Weeks as columns (oldest left), Mon..Sun as rows; cells coloured by sets that day. */
export function ActivityGrid({ grid, width }: { grid: number[][]; width: number }) {
  const cols = grid.length;
  const gap = 4;
  const cell = Math.min(22, (width - gap * (cols - 1)) / cols);
  const lv = (n: number) => (n === 0 ? 0 : n < 6 ? 2 : n < 14 ? 3 : 4);
  return (
    <Svg width={cols * (cell + gap) - gap} height={7 * (cell + gap) - gap}>
      {grid.map((wk, x) =>
        wk.map((n, y) => (
          <Rect key={`${x}-${y}`} x={x * (cell + gap)} y={y * (cell + gap)} width={cell} height={cell} rx={cell * 0.28}
            fill={n === 0 ? C.surface2 : heat[lv(n)]} />
        )),
      )}
    </Svg>
  );
}
