import { computeDistanceMatrix } from '../../algorithms/shared/distance';
import { applyPathLayout } from '../layouts/pathLayout';

export function generateRandomPathGraph() {
  const count = Math.floor(Math.random() * 5) + 6; // 6 to 10 nodes
  const nodes = [];
  const edges = [];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (let i = 0; i < count; i++) {
    nodes.push({
      id: letters[i],
      weight: Math.floor(Math.random() * 5) + 1,
    });

    if (i > 0) {
      edges.push({
        u: letters[i - 1],
        v: letters[i],
        length: (Math.floor(Math.random() * 4) + 1) * 10,
      });
    }
  }

  const laidOut = applyPathLayout(nodes, edges);

  return {
    ...laidOut,
    distMatrix: computeDistanceMatrix(laidOut.nodes, laidOut.edges),
  };
}