import { computeDistanceMatrix } from '../algorithms/shared/distance';
import { applyPathLayout } from '../graph/layouts/pathLayout';

function createPathGraph({ name, description, weights, lengths }) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const nodes = weights.map((weight, index) => ({
    id: letters[index],
    weight,
  }));

  const edges = [];
  for (let i = 0; i < weights.length - 1; i++) {
    edges.push({
      u: letters[i],
      v: letters[i + 1],
      length: lengths?.[i] ?? 10,
    });
  }

  const laidOut = applyPathLayout(nodes, edges);

  return {
    name,
    description,
    type: 'path',
    nodes: laidOut.nodes,
    edges: laidOut.edges,
    distMatrix: computeDistanceMatrix(laidOut.nodes, laidOut.edges),
  };
}

export const EXAMPLE_GRAPHS = [
  createPathGraph({
    name: 'Path Small (7)',
    description: 'Basic small path for quick testing and teaching demos.',
    weights: [1, 1, 1, 1, 1, 1, 1],
    lengths: [10, 10, 10, 10, 10, 10],
  }),

  createPathGraph({
    name: 'Weighted Path',
    description:
      'Non-uniform demand weights make p-median decisions more interesting.',
    weights: [1, 2, 3, 4, 3, 2, 1, 5],
    lengths: [10, 20, 10, 20, 10, 20, 10],
  }),

  createPathGraph({
    name: 'Greedy Trap Case',
    description:
      'A path designed to expose the behavior of greedy-style selection.',
    weights: [1, 1, 10, 1, 1, 10, 1],
    lengths: [10, 10, 30, 10, 10, 30],
  }),

  createPathGraph({
    name: 'Cover Radius Demo',
    description:
      'Useful for coverage experiments with different radius values.',
    weights: [1, 1, 1, 1, 1, 1],
    lengths: [10, 15, 20, 15, 10],
  }),

  createPathGraph({
    name: 'PCenter Demo',
    description:
      'Good for visualizing how p-center balances the worst-case distance.',
    weights: [1, 5, 1, 5, 1, 5, 1],
    lengths: [20, 10, 20, 10, 20, 10],
  }),

  createPathGraph({
    name: 'Long Balanced Path',
    description:
      'A longer path for testing p-center and p-median on more nodes without being random.',
    weights: [2, 2, 3, 3, 4, 4, 3, 3, 2, 2],
    lengths: [8, 12, 8, 12, 8, 12, 8, 12, 8],
  }),

  createPathGraph({
    name: 'Heavy Middle Demand',
    description:
      'Useful for showing how weighted objectives pull p-median facilities toward the center.',
    weights: [1, 1, 3, 8, 12, 8, 3, 1, 1],
    lengths: [12, 12, 10, 10, 10, 10, 12, 12],
  }),

  createPathGraph({
    name: 'Separated Clusters',
    description:
      'A path with long gaps, useful for seeing cluster-like behavior on a line.',
    weights: [3, 3, 2, 1, 1, 2, 3, 3],
    lengths: [8, 8, 35, 8, 35, 8, 8],
  }),
];