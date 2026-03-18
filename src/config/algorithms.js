export const ALGORITHMS = {
  GREEDY_ADDITION: 'greedy_addition',
  LOCAL_SWAP: 'local_swap',
  FARTHEST_FIRST: 'farthest_first',
  GREEDY_COVER: 'greedy_cover',
  EXACT_BRUTEFORCE: 'exact_bruteforce',
};

export const ALGORITHM_OPTIONS = {
  pmedian: [
    { id: ALGORITHMS.GREEDY_ADDITION, label: 'Greedy Addition' },
    { id: ALGORITHMS.LOCAL_SWAP, label: 'Local Swap' },
    { id: ALGORITHMS.EXACT_BRUTEFORCE, label: 'Exact (Small Only)' },
  ],
  pcenter: [
    { id: ALGORITHMS.GREEDY_ADDITION, label: 'Greedy Addition' },
    { id: ALGORITHMS.FARTHEST_FIRST, label: 'Farthest First' },
    { id: ALGORITHMS.EXACT_BRUTEFORCE, label: 'Exact (Small Only)' },
  ],
  setcover: [
    { id: ALGORITHMS.GREEDY_COVER, label: 'Greedy Cover' },
    { id: ALGORITHMS.EXACT_BRUTEFORCE, label: 'Exact (Small Only)' },
  ],
};