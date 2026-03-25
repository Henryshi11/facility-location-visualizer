export const MODELS = {
  PMEDIAN: 'pmedian',
  PCENTER: 'pcenter',
  SETCOVER: 'setcover',
};

export const MODEL_INFO = {
  [MODELS.PMEDIAN]: {
    name: 'p-Median',
    description: 'Given p, minimize total weighted assignment cost Σ w_i d(i,S)',
    short: 'Total weighted cost minimization',
  },

  [MODELS.PCENTER]: {
    name: 'p-Center',
    description: 'Given p, minimize worst weighted assignment cost max_i w_i d(i,S)',
    short: 'Worst weighted cost minimization',
  },

  [MODELS.SETCOVER]: {
    name: 'Cost Covering',
    description: 'Given λ, minimize the number of facilities such that w_i d(i,S) ≤ λ for every node',
    short: 'Minimum facility count under cost threshold',
  },
};