export const THEMES = {
  dark: {
    name: 'dark',

    // base
    bodyBg: '#020617',
    bodyText: '#e2e8f0',
    pageBg: '#020617',

    // panels
    panelBg: '#0f172a',
    panelBorder: '1px solid #1e293b',
    panelShadow: '0 8px 24px rgba(0, 0, 0, 0.22)',

    // inputs
    inputBg: '#020617',
    inputText: '#e2e8f0',
    inputBorder: '1px solid #334155',
    inputShadow: 'none',

    // buttons
    buttonBg: '#1d4ed8',
    buttonText: '#ffffff',
    buttonBorder: 'none',
    buttonShadow: '0 6px 18px rgba(29, 78, 216, 0.28)',
    buttonPressed: 'inset 0 2px 6px rgba(0,0,0,0.28)',

    // typography
    titleColor: '#e2e8f0',
    subtitleColor: '#94a3b8',
    mutedText: '#94a3b8',
    softText: '#cbd5e1',

    // code/json
    codeBg: '#020617',

    // scoreboard
    scoreRowBg: '#020617',

    // canvas shell
    canvasBg: '#020617',
    canvasBorder: '1px solid #1e293b',
    canvasShadow: '0 10px 28px rgba(0,0,0,0.22)',

    // graph palette
    graph: {
      bg: '#020617',

      edge: '#334155',
      edgeLabel: '#94a3b8',

      intervalCovered: 'rgba(34, 197, 94, 0.85)',
      intervalIdle: 'rgba(148, 163, 184, 0.55)',
      intervalActive: 'rgba(250, 204, 21, 0.95)',

      facility: '#f59e0b',
      facilityStroke: '#fbbf24',

      assignment: 'rgba(96, 165, 250, 0.35)',

      nodeFill: '#0f172a',
      nodeStroke: '#94a3b8',

      nodeCoveredFill: '#052e16',
      nodeCoveredStroke: '#22c55e',

      nodeSelectedFill: '#1d4ed8',
      nodeSelectedStroke: '#93c5fd',

      nodeBestFill: '#7c3aed',
      nodeBestStroke: '#c4b5fd',

      text: '#e2e8f0',
      subtext: '#93c5fd',

      glow: 'rgba(250, 204, 21, 0.18)',
    },

    radius: {
      panel: '16px',
      input: '12px',
      button: '14px',
      code: '12px',
    },
  },

  neumorphism: {
    name: 'neumorphism',

    // base
    bodyBg: '#E6EBF2',
    bodyText: '#536585',
    pageBg: '#E6EBF2',

    // panels
    panelBg: '#E0E5EC',
    panelBorder: '1px solid rgba(255,255,255,0.34)',
    panelShadow: `
      10px 10px 24px rgba(163, 177, 198, 0.42),
      -10px -10px 24px rgba(255, 255, 255, 0.86)
    `,

    // inputs
    inputBg: '#E0E5EC',
    inputText: '#536585',
    inputBorder: '1px solid rgba(255,255,255,0.24)',
    inputShadow: `
      inset 4px 4px 10px rgba(163,177,198,0.32),
      inset -4px -4px 10px rgba(255,255,255,0.82)
    `,

    // buttons
    buttonBg: '#E0E5EC',
    buttonText: '#536585',
    buttonBorder: '1px solid rgba(255,255,255,0.22)',
    buttonShadow: `
      8px 8px 18px rgba(163,177,198,0.34),
      -8px -8px 18px rgba(255,255,255,0.82)
    `,
    buttonPressed: `
      inset 6px 6px 12px rgba(163,177,198,0.38),
      inset -6px -6px 12px rgba(255,255,255,0.88)
    `,

    // typography
    titleColor: '#4F6488',
    subtitleColor: '#7E8FAE',
    mutedText: '#7E8FAE',
    softText: '#677997',

    // code/json
    codeBg: '#DCE3EB',

    // scoreboard
    scoreRowBg: '#DCE3EB',

    // canvas shell
    canvasBg: '#DDE3EA',
    canvasBorder: '1px solid rgba(255,255,255,0.34)',
    canvasShadow: `
      12px 12px 28px rgba(163,177,198,0.40),
      -12px -12px 28px rgba(255,255,255,0.88)
    `,

    // graph palette
    graph: {
      bg: '#DDE3EA',

      edge: '#9BAAC2',
      edgeLabel: '#7E8FAE',

      intervalCovered: 'rgba(120, 141, 173, 0.72)',
      intervalIdle: 'rgba(148, 163, 184, 0.42)',
      intervalActive: 'rgba(86, 106, 143, 0.92)',

      facility: '#8797B5',
      facilityStroke: '#6C7EA0',

      assignment: 'rgba(120, 141, 173, 0.26)',

      nodeFill: '#E0E5EC',
      nodeStroke: '#9AA9C1',

      nodeCoveredFill: '#D6DFE9',
      nodeCoveredStroke: '#899AB5',

      nodeSelectedFill: '#CBD7E6',
      nodeSelectedStroke: '#7183A5',

      nodeBestFill: '#C2CFDF',
      nodeBestStroke: '#66789B',

      text: '#536585',
      subtext: '#7183A5',

      glow: 'rgba(255,255,255,0.52)',
    },

    radius: {
      panel: '22px',
      input: '16px',
      button: '16px',
      code: '18px',
    },
  },
};

export function getTheme(themeName = 'dark') {
  return THEMES[themeName] ?? THEMES.dark;
}