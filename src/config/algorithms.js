export const ALGORITHMS = {
  EXACT_BRUTEFORCE: 'exact_bruteforce',
  FEASIBILITY_TEST: 'feasibility_test',
  PARAMETRIC_SEARCH: 'parametric_search',
};

export const ALGORITHM_OPTIONS = {
  pmedian: [
    {
      id: ALGORITHMS.EXACT_BRUTEFORCE,
      label: 'Exact (Small Only)',
      implemented: true,
      category: 'baseline',
    },
  ],

  pcenter: [
    {
      id: ALGORITHMS.FEASIBILITY_TEST,
      label: 'λ-Feasibility Test',
      implemented: true,
      category: 'course_core',
    },
    {
      id: ALGORITHMS.PARAMETRIC_SEARCH,
      label: 'Parametric Search',
      implemented: true,
      category: 'course_core',
    },
    {
      id: ALGORITHMS.EXACT_BRUTEFORCE,
      label: 'Exact (Small Only)',
      implemented: true,
      category: 'baseline',
    },
  ],

  setcover: [
    {
      id: ALGORITHMS.EXACT_BRUTEFORCE,
      label: 'Exact (Small Only)',
      implemented: true,
      category: 'baseline',
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