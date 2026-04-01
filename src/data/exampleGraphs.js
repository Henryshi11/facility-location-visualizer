function buildDistMatrix(nodes, edges) {
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

function createPathGraph({ name, weights, edgeLengths, y = 220 }) {
  const spacing = 120;

  const nodes = weights.map((weight, index) => ({
    id: String.fromCharCode(65 + index), // A, B, C, ...
    x: 100 + index * spacing,
    y,
    weight,
  }));

  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      u: nodes[i].id,
      v: nodes[i + 1].id,
      length: edgeLengths[i] ?? 1,
    });
  }

  return {
    name,
    type: 'path',
    nodes,
    edges,
    distMatrix: buildDistMatrix(nodes, edges),
  };
}

export const EXAMPLE_GRAPHS = [
  createPathGraph({
    name: 'Path Example 1 (Balanced)',
    weights: [1, 2, 1, 3, 1, 2],
    edgeLengths: [2, 2, 2, 2, 2],
  }),

  createPathGraph({
    name: 'Path Example 2 (Uneven Weights)',
    weights: [1, 4, 1, 5, 2, 1],
    edgeLengths: [1, 2, 1, 3, 2],
  }),

  createPathGraph({
    name: 'Path Example 3 (Long Right Tail)',
    weights: [2, 1, 3, 1, 1, 4],
    edgeLengths: [1, 1, 2, 3, 5],
  }),

  createPathGraph({
    name: 'Path Example 4 (Covering Friendly)',
    weights: [1, 1, 1, 1, 1, 1, 1],
    edgeLengths: [2, 2, 2, 2, 2, 2],
  }),

  createPathGraph({
    name: 'Path Example 5 (Center Stress Test)',
    weights: [1, 6, 1, 1, 5, 1, 2],
    edgeLengths: [1, 2, 1, 2, 1, 3],
  }),
];