import { MODELS } from '../../config/models';
import { ALGORITHMS } from '../../config/algorithms';

import { generatePMedianGreedySteps } from '../../algorithms/pmedian/greedyAddition';
import { generatePCenterGreedySteps } from '../../algorithms/pcenter/greedyAddition';
import { generateSetCoverGreedySteps } from '../../algorithms/setcover/greedyCover';

export function buildSnapshots({ model, algorithm, graph, params }) {
  if (!graph || !graph.nodes || !graph.distMatrix) {
    return [];
  }

  if (model === MODELS.PMEDIAN) {
    if (algorithm === ALGORITHMS.GREEDY_ADDITION) {
      return generatePMedianGreedySteps(graph, params);
    }
  }

  if (model === MODELS.PCENTER) {
    if (algorithm === ALGORITHMS.GREEDY_ADDITION) {
      return generatePCenterGreedySteps(graph, params);
    }
  }

  if (model === MODELS.SETCOVER) {
    if (algorithm === ALGORITHMS.GREEDY_COVER) {
      return generateSetCoverGreedySteps(graph, params);
    }
  }

  return [];
}