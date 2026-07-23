/** Light UI tokens from product mocks */
export const UI = {
  bg: '#F2F3F0',
  card: '#FFFFFF',
  ink: '#111111',
  inkMuted: '#6B6B6B',
  inkDim: '#9A9A9A',
  border: '#E8E8E4',
  borderStrong: '#D4D4D0',
  accent: '#C4A035',
  accentDark: '#A8862A',
  black: '#111111',
  agents: {
    planner: '#2DD4BF',
    recovery: '#5B8DEF',
    nutrition: '#6B9E4A',
    adaptation: '#9B7FD4',
    accountability: '#D4845C',
  },
  agentBg: {
    planner: '#E6FAF7',
    recovery: '#EAF1FF',
    nutrition: '#EEF5E8',
    adaptation: '#F3EDFC',
    accountability: '#FBF0EA',
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    pill: 999,
  },
} as const;

export const AGENT_LABELS = {
  planner: 'Planner',
  recovery: 'Recovery',
  nutrition: 'Nutrition',
  adaptation: 'Adaptation',
  accountability: 'Accountability',
} as const;
