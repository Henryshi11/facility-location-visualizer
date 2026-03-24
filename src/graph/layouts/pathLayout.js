export function applyPathLayout(nodes, edges) {
  const totalNodes = nodes.length;

  if (totalNodes === 0) {
    return {
      nodes: [],
      edges,
    };
  }

  const nodesPerRow = 4;
  const leftX = 110;
  const rightX = 1130;
  const rowGap = 150;
  const topY = 120;

  const rowCount = Math.ceil(totalNodes / nodesPerRow);

  const laidOutNodes = nodes.map((node, index) => {
    const rowIndex = Math.floor(index / nodesPerRow);
    const indexInRow = index % nodesPerRow;

    const rowStart = rowIndex * nodesPerRow;
    const rowEnd = Math.min(rowStart + nodesPerRow, totalNodes);
    const rowNodeCount = rowEnd - rowStart;

    const usableWidth = rightX - leftX;
    const horizontalGap =
      rowNodeCount <= 1 ? 0 : usableWidth / (rowNodeCount - 1);

    const isLeftToRight = rowIndex % 2 === 0;

    let x;
    if (rowNodeCount === 1) {
      x = (leftX + rightX) / 2;
    } else if (isLeftToRight) {
      x = leftX + indexInRow * horizontalGap;
    } else {
      x = rightX - indexInRow * horizontalGap;
    }

    const y = topY + rowIndex * rowGap;

    return {
      ...node,
      x,
      y,
    };
  });

  return {
    nodes: laidOutNodes,
    edges,
  };
}