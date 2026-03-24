export function computeDistanceMatrix(nodes, edges) {
  const nodeIds = nodes.map((node) => node.id);
  const dist = {};

  for (const fromId of nodeIds) {
    dist[fromId] = {};
    for (const toId of nodeIds) {
      dist[fromId][toId] = fromId === toId ? 0 : Infinity;
    }
  }

  for (const edge of edges) {
    const u = edge.u;
    const v = edge.v;
    const length = edge.length ?? 1;

    if (!dist[u]) dist[u] = {};
    if (!dist[v]) dist[v] = {};

    dist[u][v] = Math.min(dist[u][v] ?? Infinity, length);
    dist[v][u] = Math.min(dist[v][u] ?? Infinity, length);
  }

  for (const k of nodeIds) {
    for (const i of nodeIds) {
      for (const j of nodeIds) {
        const throughK = (dist[i][k] ?? Infinity) + (dist[k][j] ?? Infinity);
        if (throughK < (dist[i][j] ?? Infinity)) {
          dist[i][j] = throughK;
        }
      }
    }
  }

  return dist;
}

export function getDistance(distMatrix, fromId, toId) {
  return distMatrix?.[fromId]?.[toId] ?? Infinity;
}