export function applyPathLayout(
  nodes,
  edges,
  options = {}
) {
  const {
    startX = 100,
    startY = 260,
    minSpacing = 90,
    spacingScale = 18,
  } = options;

  const edgeMap = new Map();
  for (const edge of edges ?? []) {
    edgeMap.set(`${edge.u}::${edge.v}`, edge.length ?? 1);
    edgeMap.set(`${edge.v}::${edge.u}`, edge.length ?? 1);
  }

  const ordered = [...(nodes ?? [])].sort((a, b) =>
    String(a.id).localeCompare(String(b.id))
  );

  const laidOutNodes = [];
  let x = startX;

  for (let i = 0; i < ordered.length; i++) {
    const node = ordered[i];

    if (i > 0) {
      const prev = ordered[i - 1];
      const edgeLength = edgeMap.get(`${prev.id}::${node.id}`) ?? 1;
      x += Math.max(minSpacing, edgeLength * spacingScale);
    }

    laidOutNodes.push({
      ...node,
      x,
      y: startY,
    });
  }

  return {
    nodes: laidOutNodes,
    edges: [...(edges ?? [])],
  };
}