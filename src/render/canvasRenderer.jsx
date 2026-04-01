import { useEffect, useMemo, useRef } from 'react';

function drawCircle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawSquare(ctx, x, y, r) {
  ctx.beginPath();
  ctx.rect(x - r, y - r, r * 2, r * 2);
  ctx.fill();
  ctx.stroke();
}

function drawDiamond(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function getOrderedNodes(graph) {
  return [...(graph?.nodes ?? [])].sort((a, b) =>
    String(a.id).localeCompare(String(b.id))
  );
}

function getEdgeLengthMap(graph) {
  const map = new Map();
  for (const edge of graph?.edges ?? []) {
    map.set(`${edge.u}::${edge.v}`, edge.length ?? 1);
    map.set(`${edge.v}::${edge.u}`, edge.length ?? 1);
  }
  return map;
}

function computePathPositions(graph) {
  const nodes = getOrderedNodes(graph);
  const edgeMap = getEdgeLengthMap(graph);

  let cumulative = 0;
  return nodes.map((node, index) => {
    if (index > 0) {
      const prev = nodes[index - 1];
      cumulative += edgeMap.get(`${prev.id}::${node.id}`) ?? 1;
    }

    return {
      ...node,
      pathPosition: cumulative,
    };
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function CanvasRenderer({ graph, snapshot }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const orderedNodes = useMemo(() => computePathPositions(graph), [graph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !graph) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const cssWidth = Math.max(300, Math.floor(rect.width));
    const cssHeight = Math.max(300, Math.floor(rect.height));

    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.style.display = 'block';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const width = cssWidth;
    const height = cssHeight;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    if (!orderedNodes.length) {
      return;
    }

    const overlays = snapshot?.overlays ?? {};
    const intervals = overlays.intervals ?? [];
    const facilityPositions = overlays.facilityPositions ?? [];

    const totalLength =
      overlays.totalLength ??
      orderedNodes[orderedNodes.length - 1]?.pathPosition ??
      0;

    const paddingX = 48;
    const paddingBottom = 52;
    const topPadding = intervals.length > 0 ? 92 : 40;
    const baseY = clamp(height - paddingBottom, topPadding + 80, height - 40);
    const usableWidth = Math.max(1, width - paddingX * 2);

    function scalarToX(scalar) {
      if (totalLength <= 0) {
        return width / 2;
      }
      const t = clamp(scalar / totalLength, 0, 1);
      return paddingX + t * usableWidth;
    }

    function nodeToPoint(node) {
      return {
        x: scalarToX(node.pathPosition),
        y: baseY,
      };
    }

    function scalarToPoint(scalar, y = baseY) {
      return {
        x: scalarToX(scalar),
        y,
      };
    }

    const selectedSet = new Set(snapshot?.selected ?? []);
    const coveredSet = new Set(snapshot?.covered ?? []);
    const evaluatingId = snapshot?.evaluating ?? null;
    const currentBest = snapshot?.currentBest ?? null;
    const activeIntervalId = overlays.activeIntervalId ?? null;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();

    // edges
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;

    for (let i = 0; i < orderedNodes.length - 1; i++) {
      const u = orderedNodes[i];
      const v = orderedNodes[i + 1];
      const p1 = nodeToPoint(u);
      const p2 = nodeToPoint(v);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      const edge = (graph.edges ?? []).find(
        (item) =>
          (item.u === u.id && item.v === v.id) ||
          (item.u === v.id && item.v === u.id)
      );

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(edge?.length ?? 1), midX, midY - 8);
    }

    // interval overlays
    if (intervals.length > 0) {
      intervals.forEach((interval, idx) => {
        const row = idx % 3;
        const y = topPadding + row * 22;

        const leftX = scalarToX(interval.left);
        const rightX = scalarToX(interval.right);
        const centerX = scalarToX(interval.center);

        const isCovered = coveredSet.has(interval.id);
        const isActive = interval.id === activeIntervalId;

        ctx.strokeStyle = isActive
          ? 'rgba(250, 204, 21, 0.95)'
          : isCovered
            ? 'rgba(34, 197, 94, 0.85)'
            : 'rgba(148, 163, 184, 0.55)';
        ctx.lineWidth = isActive ? 4 : 3;

        ctx.beginPath();
        ctx.moveTo(leftX, y);
        ctx.lineTo(rightX, y);
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(interval.id, centerX, y - 5);
      });
    }

    // facility markers placed on path
    if (facilityPositions.length > 0) {
      for (const scalar of facilityPositions) {
        const point = scalarToPoint(scalar, baseY);

        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        drawDiamond(ctx, point.x, point.y - 38, 8);

        ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y - 28);
        ctx.lineTo(point.x, point.y - 8);
        ctx.stroke();
      }
    }

    // assignment lines
    if (snapshot?.assignments) {
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.35)';
      ctx.lineWidth = 2;

      for (const node of orderedNodes) {
        const assignment = snapshot.assignments[node.id];
        if (!assignment?.facility) continue;

        const facilityNode = orderedNodes.find(
          (item) => item.id === assignment.facility
        );
        if (!facilityNode) continue;

        const a = nodeToPoint(node);
        const b = nodeToPoint(facilityNode);

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // nodes
    for (const node of orderedNodes) {
      const point = nodeToPoint(node);

      const isSelected = selectedSet.has(node.id);
      const isCovered = coveredSet.has(node.id);
      const isEvaluating = evaluatingId === node.id;
      const isCurrentBest = currentBest === node.id;

      let fillStyle = '#0f172a';
      let strokeStyle = '#94a3b8';
      let shape = 'circle';

      if (isCovered) {
        fillStyle = '#052e16';
        strokeStyle = '#22c55e';
      }

      if (isSelected) {
        fillStyle = '#1d4ed8';
        strokeStyle = '#93c5fd';
        shape = 'square';
      }

      if (isCurrentBest) {
        fillStyle = '#7c3aed';
        strokeStyle = '#c4b5fd';
        shape = 'diamond';
      }

      if (isEvaluating) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(250, 204, 21, 0.18)';
        ctx.arc(point.x, point.y, 26, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = fillStyle;
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 2.5;

      if (shape === 'square') {
        drawSquare(ctx, point.x, point.y, 10);
      } else if (shape === 'diamond') {
        drawDiamond(ctx, point.x, point.y, 11);
      } else {
        drawCircle(ctx, point.x, point.y, 10);
      }

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(node.id), point.x, point.y - 16);

      ctx.fillStyle = '#93c5fd';
      ctx.font = '11px Inter, Arial, sans-serif';
      ctx.fillText(`w=${node.weight ?? 1}`, point.x, point.y + 26);
    }

    ctx.restore();
  }, [graph, snapshot, orderedNodes]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '560px',
        background: '#020617',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid #1e293b',
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}