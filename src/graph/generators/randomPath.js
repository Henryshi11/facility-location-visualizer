import { computeDistanceMatrix } from '../../algorithms/shared/distance';
import { applyPathLayout } from '../layouts/pathLayout';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomPathGraph() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const nodeCount = randomInt(6, 10);

  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    id: letters[index],
    weight: randomInt(1, 9),
  }));

  const edges = [];
  for (let i = 0; i < nodeCount - 1; i++) {
    edges.push({
      u: letters[i],
      v: letters[i + 1],
      length: randomInt(8, 24),
    });
  }

  const laidOut = applyPathLayout(nodes, edges);

  return {
    name: 'Random Path',
    description: 'Randomly generated weighted path graph.',
    type: 'path',
    nodes: laidOut.nodes,
    edges: laidOut.edges,
    distMatrix: computeDistanceMatrix(laidOut.nodes, laidOut.edges),
  };
}