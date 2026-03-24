export const MODELS = {
  PMEDIAN: 'pmedian',
  PCENTER: 'pcenter',
  SETCOVER: 'setcover',
};

export const MODEL_INFO = {
  [MODELS.PMEDIAN]: {
    name: 'p-Median',
    description: 'Minimize weighted total distance',
    short: 'Weighted total distance minimization',
  },

  [MODELS.PCENTER]: {
    name: 'p-Center',
    description: 'Minimize the maximum distance to the nearest facility',
    short: 'Worst-case distance minimization',
  },

  [MODELS.SETCOVER]: {
    name: 'Set Covering',
    description: 'Cover all demand nodes using radius-based facility coverage',
    short: 'Radius-based covering',
  },
};