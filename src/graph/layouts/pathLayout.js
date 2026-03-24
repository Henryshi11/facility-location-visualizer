export function applyPathLayout(nodes, edges) {
  const marginX = 80;
  const usableWidth = 1120;
  const y = 280;

  const totalLength = edges.reduce((sum, edge) => sum + (edge.length ?? 1), 0);

  let currentX = marginX;

  const laidOutNodes = nodes.map((node, index) => {
    const laidOutNode = {
      ...node,
      x: currentX,
      y,
    };

    const nextEdge = edges[index];
    if (nextEdge) {
      const edgeLength = nextEdge.length ?? 1;
      const spacing =
        totalLength > 0 ? (edgeLength / totalLength) * usableWidth : usableWidth / Math.max(1, edges.length);
      currentX += spacing;
    }

    return laidOutNode;
  });

  return {
    nodes: laidOutNodes,
    edges,
  };
}