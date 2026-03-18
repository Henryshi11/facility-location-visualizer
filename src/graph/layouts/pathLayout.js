export function applyPathLayout(nodes, edges) {
  const laidOutNodes = nodes.map((node, index) => {
    const row = Math.floor(index / 6);
    const col = index % 6;

    const y = 140 + row * 180;
    const x = row % 2 === 0 ? 140 + col * 140 : 860 - col * 140;

    return {
      ...node,
      x,
      y,
    };
  });

  return {
    nodes: laidOutNodes,
    edges,
    type: 'path',
  };
}