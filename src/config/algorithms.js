export const ALGORITHMS = {
  GREEDY_ADDITION: 'greedy_addition',
  LOCAL_SWAP: 'local_swap',
  FARTHEST_FIRST: 'farthest_first',
  GREEDY_COVER: 'greedy_cover',
  EXACT_BRUTEFORCE: 'exact_bruteforce',
};

export const ALGORITHM_OPTIONS = {
  pmedian: [
    {
      id: ALGORITHMS.GREEDY_ADDITION,
      label: 'Greedy Addition',
      implemented: true,
    },
    {
      id: ALGORITHMS.EXACT_BRUTEFORCE,
      label: 'Exact (Small Only)',
      implemented: true,
    },
    {
      id: ALGORITHMS.LOCAL_SWAP,
      label: 'Local Swap',
      implemented: true,
    },
  ],

  pcenter: [
    {
      id: ALGORITHMS.GREEDY_ADDITION,
      label: 'Greedy Addition',
      implemented: true,
    },
    {
      id: ALGORITHMS.FARTHEST_FIRST,
      label: 'Farthest First',
      implemented: true,
    },
    {
      id: ALGORITHMS.EXACT_BRUTEFORCE,
      label: 'Exact (Small Only)',
      implemented: true,
    },
  ],

  setcover: [
    {
      id: ALGORITHMS.GREEDY_COVER,
      label: 'Greedy Cover',
      implemented: true,
    },
    {
      id: ALGORITHMS.EXACT_BRUTEFORCE,
      label: 'Exact (Small Only)',
      implemented: true,
    },
  ],
};

export function getImplementedAlgorithmOptions(model) {
  return (ALGORITHM_OPTIONS[model] ?? []).filter((item) => item.implemented);
}

export function isAlgorithmImplemented(model, algorithmId) {
  return (ALGORITHM_OPTIONS[model] ?? []).some(
    (item) => item.id === algorithmId && item.implemented
  );
}