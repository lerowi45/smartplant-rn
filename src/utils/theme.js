// src/utils/theme.js
// Shared design tokens used across all screens

export const COLORS = {
  greenDeep:   '#1a3a2a',
  greenMid:    '#2d6a4f',
  greenLight:  '#52b788',
  greenPale:   '#b7e4c7',
  greenMint:   '#e8f5ee',
  cream:       '#f8f4ee',
  creamDark:   '#ede8df',
  brown:       '#6b4226',
  text:        '#1a1a18',
  textSoft:    '#5a5a50',
  white:       '#ffffff',
  danger:      '#c0392b',
  dangerLight: '#fde8e8',
  warning:     '#e67e22',
  success:     '#27ae60',
  successLight:'#e8f8ee',
  overlay:     'rgba(26,58,42,0.85)',
};

export const FONTS = {
  // After loading with expo-google-fonts, use these names
  display:     'Fraunces_700Bold',
  displayItal: 'Fraunces_300Light_Italic',
  body:        'DMSans_400Regular',
  bodyMedium:  'DMSans_500Medium',
  bodyLight:   'DMSans_300Light',
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const RADIUS = {
  sm:   8,
  md:   16,
  lg:   24,
  full: 999,
};

export const SHADOW = {
  card: {
    shadowColor: '#1a3a2a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
  },
  strong: {
    shadowColor: '#1a3a2a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
};
