import { ALGORITHMS } from '../../config/algorithms';

import { generatePMedianExactBruteforceSteps } from '../../algorithms/pmedian/exactBruteforce';

import { generatePCenterExactBruteforceSteps } from '../../algorithms/pcenter/exactBruteforce';
import { generatePCenterFeasibilityTestSteps } from '../../algorithms/pcenter/feasibilityTest';
import { generatePCenterParametricSearchSteps } from '../../algorithms/pcenter/parametricSearch';

import { generateSetCoverExactBruteforceSteps } from '../../algorithms/setcover/exactBruteforce';

const SNAPSHOT_BUILDERS = {
  pmedian: {
    [ALGORITHMS.EXACT_BRUTEFORCE]: generatePMedianExactBruteforceSteps,
  },

  pcenter: {
    [ALGORITHMS.FEASIBILITY_TEST]: generatePCenterFeasibilityTestSteps,
    [ALGORITHMS.PARAMETRIC_SEARCH]: generatePCenterParametricSearchSteps,
    [ALGORITHMS.EXACT_BRUTEFORCE]: generatePCenterExactBruteforceSteps,
  },

  setcover: {
    [ALGORITHMS.EXACT_BRUTEFORCE]: generateSetCoverExactBruteforceSteps,
  },
};

function validateGraph(graph) {
  return Boolean(graph && graph.nodes && graph.edges && graph.distMatrix);
}

export function buildSnapshots({ model, algorithm, graph, params }) {
  if (!validateGraph(graph)) {
    return [];
  }

  const builder = SNAPSHOT_BUILDERS[model]?.[algorithm];

  if (!builder) {
    console.warn(`No snapshot builder found for model=${model}, algorithm=${algorithm}`);
    return [];
  }

  try {
    return builder(graph, params);
  } catch (error) {
    console.error('Snapshot generation failed:', error);
    return [];
  }
}