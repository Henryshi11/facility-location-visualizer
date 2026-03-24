import { ALGORITHMS } from '../../config/algorithms';

import { generatePMedianGreedySteps } from '../../algorithms/pmedian/greedyAddition';
import { generatePMedianExactBruteforceSteps } from '../../algorithms/pmedian/exactBruteforce';
import { generatePMedianLocalSwapSteps } from '../../algorithms/pmedian/localSwap';

import { generatePCenterGreedySteps } from '../../algorithms/pcenter/greedyAddition';
import { generatePCenterFarthestFirstSteps } from '../../algorithms/pcenter/farthestFirst';
import { generatePCenterExactBruteforceSteps } from '../../algorithms/pcenter/exactBruteforce';

import { generateSetCoverGreedySteps } from '../../algorithms/setcover/greedyCover';
import { generateSetCoverExactBruteforceSteps } from '../../algorithms/setcover/exactBruteforce';

const SNAPSHOT_BUILDERS = {
  pmedian: {
    [ALGORITHMS.GREEDY_ADDITION]: generatePMedianGreedySteps,
    [ALGORITHMS.EXACT_BRUTEFORCE]: generatePMedianExactBruteforceSteps,
    [ALGORITHMS.LOCAL_SWAP]: generatePMedianLocalSwapSteps,
  },

  pcenter: {
    [ALGORITHMS.GREEDY_ADDITION]: generatePCenterGreedySteps,
    [ALGORITHMS.FARTHEST_FIRST]: generatePCenterFarthestFirstSteps,
    [ALGORITHMS.EXACT_BRUTEFORCE]: generatePCenterExactBruteforceSteps,
  },

  setcover: {
    [ALGORITHMS.GREEDY_COVER]: generateSetCoverGreedySteps,
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