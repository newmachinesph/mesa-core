// Design tokens as plain objects so React Native StyleSheet and web can both read them.
// Warm brass-on-ink palette — a Manila supper-club look, not a default dashboard.

export const colors = {
  ink: '#1A1614',
  inkSoft: '#2A2320',
  surface: '#FBF7F1',
  surfaceRaised: '#FFFFFF',
  surfaceSunken: '#F1E9DD',
  border: '#E4D8C7',
  text: '#241E1A',
  textMuted: '#7A6E62',
  textInverse: '#FBF7F1',
  brass: '#B4894B',
  brassSoft: '#E8D3AE',
  brassDeep: '#8A6636',
  // Semantic tones — mirror the Tone union used across the domain.
  ok: '#3F7A52',
  okSoft: '#DCEBDF',
  warn: '#C4842A',
  warnSoft: '#F6E6C9',
  danger: '#B24A3A',
  dangerSoft: '#F3D9D2',
  info: '#3E6B8A',
  infoSoft: '#D7E4EC',
  neutral: '#7A6E62',
  neutralSoft: '#E9E1D6',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const shadow = {
  sm: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;
