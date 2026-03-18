export const MODELS = {
  PMEDIAN: 'pmedian',
  PCENTER: 'pcenter',
  SETCOVER: 'setcover',
};

export const MODEL_INFO = {
  [MODELS.PMEDIAN]: {
    name: 'p-Median',
    description: 'Minimize weighted total distance',
    metric: 'Weighted Distance',
  },
  [MODELS.PCENTER]: {
    name: 'p-Center',
    description: 'Minimize maximum distance',
    metric: 'Max Distance',
  },
  [MODELS.SETCOVER]: {
    name: 'Set Covering',
    description: 'Cover all nodes within radius',
    metric: 'Coverage',
  },
};