// Design tokens. Source of truth for colours, type, spacing and motion (mirrors CLAUDE.md §3).
export const color = {
  ground: '#0E1013',
  surface: '#171A1F',
  surface2: '#1F242B',
  surface3: '#262A31',
  line: '#2A3038',
  tabBar: '#14171B',
  ink: '#F3F1EC',
  ink2: '#A9B0BA',
  ink3: '#7D8591',
  ember: '#FF6A3D',
  onEmber: '#1A0A04',
  emberTint: '#3A1D12',
  emberText: '#FF8A63',
  mint: '#52E0B8',
  mintTint: '#10231E',
  mintText: '#7CF0C8',
  mintDeep: '#16341F',
  gold: '#FFC24A',
  goldTint: '#2A2110',
  goldText: '#FFD98A',
  danger: '#FF8A63',
  dangerTint: '#3A1D1A',
  scrim: 'rgba(5,6,8,0.62)',
  bodyBase: '#262A31',
  outline: '#0E1013',
} as const;

// Muscle heat: level 0..4. Lightness rises with load so the scale reads without hue.
export const heat = ['#343A43', '#5A2A2E', '#A63A2E', '#F2672E', '#FFC24A'] as const;

export const font = {
  display: 'Unbounded_700Bold',
  displayMedium: 'Unbounded_500Medium',
  body: 'Onest_400Regular',
  bodyMedium: 'Onest_500Medium',
  bodySemi: 'Onest_600SemiBold',
} as const;

export const type = {
  hero: { fontFamily: font.display, fontSize: 30, lineHeight: 34 },
  title: { fontFamily: font.display, fontSize: 24, lineHeight: 28 },
  titleSm: { fontFamily: font.displayMedium, fontSize: 19, lineHeight: 24 },
  number: { fontFamily: font.displayMedium, fontSize: 20, lineHeight: 24 },
  numberLg: { fontFamily: font.displayMedium, fontSize: 28, lineHeight: 32 },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 21 },
  bodyMd: { fontFamily: font.bodyMedium, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: font.bodySemi, fontSize: 15, lineHeight: 21 },
  lead: { fontFamily: font.bodySemi, fontSize: 17, lineHeight: 22 },
  small: { fontFamily: font.body, fontSize: 13, lineHeight: 18 },
  smallMd: { fontFamily: font.bodyMedium, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: font.bodyMedium, fontSize: 11, lineHeight: 14, letterSpacing: 0.6, textTransform: 'uppercase' as const },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const radius = { control: 14, tile: 20, card: 24, sheet: 28, pill: 999 } as const;
export const gutter = 20;
export const touch = 48;

export const motion = { fast: 180, base: 240, slow: 420 } as const;
