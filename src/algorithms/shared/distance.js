// Floyd-Warshall
export function computeDistanceMatrix(nodes, edges) {
  const dist = {};

  nodes.forEach(n1 => {
    dist[n1.id] = {};
    nodes.forEach(n2 => {
      dist[n1.id][n2.id] = n1.id === n2.id ? 0 : Infinity;
    });
  });

  edges.forEach(e => {
    dist[e.u][e.v] = e.length;
    dist[e.v][e.u] = e.length;
  });

  nodes.forEach(k => {
    nodes.forEach(i => {
      nodes.forEach(j => {
        if (dist[i.id][k.id] + dist[k.id][j.id] < dist[i.id][j.id]) {
          dist[i.id][j.id] = dist[i.id][k.id] + dist[k.id][j.id];
        }
      });
    });
  });

  return dist;
}