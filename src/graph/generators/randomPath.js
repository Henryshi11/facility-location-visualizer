import { applyPathLayout } from '../layouts/pathLayout';

function buildDistanceMatrix(nodes, edges) {
  const ids = nodes.map((node) => node.id);
  const dist = {};

  for (const id of ids) {
    dist[id] = {};
    for (const other of ids) {
      dist[id][other] = id === other ? 0 : Infinity;
    }
  }

  for (const edge of edges) {
    const length = edge.length ?? 1;
    dist[edge.u][edge.v] = Math.min(dist[edge.u][edge.v], length);
    dist[edge.v][edge.u] = Math.min(dist[edge.v][edge.u], length);
  }

  for (const k of ids) {
    for (const i of ids) {
      for (const j of ids) {
        const throughK = dist[i][k] + dist[k][j];
        if (throughK < dist[i][j]) {
          dist[i][j] = throughK;
        }
      }
    }
  }

  return dist;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomPathGraph(options = {}) {
  const {
    minNodes = 5,
    maxNodes = 8,
    minWeight = 1,
    maxWeight = 6,
    minEdgeLength = 1,
    maxEdgeLength = 5,
  } = options;

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const count = randomInt(minNodes, maxNodes);

  const baseNodes = Array.from({ length: count }, (_, index) => ({
    id: letters[index],
    weight: randomInt(minWeight, maxWeight),
  }));

  const edges = [];
  for (let i = 0; i < count - 1; i++) {
    edges.push({
      u: letters[i],
      v: letters[i + 1],
      length: randomInt(minEdgeLength, maxEdgeLength),
    });
  }

  const laidOut = applyPathLayout(baseNodes, edges);

  return {
    name: `Random Path (${count})`,
    type: 'path',
    nodes: laidOut.nodes,
    edges: laidOut.edges,
    distMatrix: buildDistanceMatrix(laidOut.nodes, laidOut.edges),
  };
}