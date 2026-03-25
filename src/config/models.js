export const MODELS = {
  PMEDIAN: 'pmedian',
  PCENTER: 'pcenter',
  SETCOVER: 'setcover',
};

export const MODEL_INFO = {
  [MODELS.PMEDIAN]: {
    name: 'p-Median',
    description: 'Minimize total assignment cost Σ w_i d(i,S)',
    short: 'Total weighted cost minimization',
  },

  [MODELS.PCENTER]: {
    name: 'p-Center',
    description: 'Minimize maximum assignment cost max_i w_i d(i,S)',
    short: 'Worst weighted cost minimization',
  },

  [MODELS.SETCOVER]: {
    name: 'λ-Covering',
    description:
      'Find a minimum-cardinality full λ-cover; break ties by total weighted service cost',
    short: 'λ-cover with cost tie-break',
  },
};