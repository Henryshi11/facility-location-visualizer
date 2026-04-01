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
  return [...(graph?.nodes ?? [])].sort((a, b) => String(a.id).localeCompare(String(b.id)));
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

function interpolatePoint(nodes, scalar) {
  if (!nodes.length) return null;
  if (scalar <= nodes[0].pathPosition) return { x: nodes[0].x, y: nodes[0].y };
  if (scalar >= nodes[nodes.length - 1].pathPosition) {
    return {
      x: nodes[nodes.length - 1].x,
      y: nodes[nodes.length - 1].y,
    };
  }

  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i];
    const b = nodes[i + 1];

    if (scalar >= a.pathPosition && scalar <= b.pathPosition) {
      const span = b.pathPosition - a.pathPosition || 1;
      const t = (scalar - a.pathPosition) / span;
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      };
    }
  }

  return null;
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
    canvas.width = Math.max(300, rect.width * window.devicePixelRatio);
    canvas.height = Math.max(300, rect.height * window.devicePixelRatio);

    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    // background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // edges
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    for (const edge of graph.edges ?? []) {
      const u = graph.nodes.find((node) => node.id === edge.u);
      const v = graph.nodes.find((node) => node.id === edge.v);
      if (!u || !v) continue;

      ctx.beginPath();
      ctx.moveTo(u.x, u.y);
      ctx.lineTo(v.x, v.y);
      ctx.stroke();

      const midX = (u.x + v.x) / 2;
      const midY = (u.y + v.y) / 2;

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(edge.length ?? 1), midX, midY - 8);
    }

    const selectedSet = new Set(snapshot?.selected ?? []);
    const coveredSet = new Set(snapshot?.covered ?? []);
    const evaluatingId = snapshot?.evaluating ?? null;
    const currentBest = snapshot?.currentBest ?? null;

    // interval overlays for feasibility test / parametric search
    const overlays = snapshot?.overlays ?? {};
    const intervals = overlays.intervals ?? [];
    const properIntervals = overlays.properIntervals ?? [];
    const facilityPositions = overlays.facilityPositions ?? [];

    if (intervals.length > 0) {
      const yOffsetBase = 60;

      intervals.forEach((interval, idx) => {
        const leftPoint = interpolatePoint(orderedNodes, interval.left);
        const rightPoint = interpolatePoint(orderedNodes, interval.right);
        const centerPoint = interpolatePoint(orderedNodes, interval.center);

        if (!leftPoint || !rightPoint || !centerPoint) return;

        const y = centerPoint.y - yOffsetBase - (idx % 3) * 18;

        ctx.strokeStyle = properIntervals.some((item) => item.id === interval.id)
          ? 'rgba(56, 189, 248, 0.85)'
          : 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(leftPoint.x, y);
        ctx.lineTo(rightPoint.x, y);
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '10px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(interval.id, centerPoint.x, y - 4);
      });
    }

    if (facilityPositions.length > 0) {
      for (const scalar of facilityPositions) {
        const point = interpolatePoint(orderedNodes, scalar);
        if (!point) continue;

        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        drawDiamond(ctx, point.x, point.y - 38, 8);

        ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y - 28);
        ctx.lineTo(point.x, point.y - 8);
        ctx.stroke();
      }
    }

    // assignment lines for node-based algorithms
    if (snapshot?.assignments) {
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.35)';
      ctx.lineWidth = 2;

      for (const node of graph.nodes ?? []) {
        const assignment = snapshot.assignments[node.id];
        if (!assignment?.facility) continue;

        const facilityNode = graph.nodes.find((item) => item.id === assignment.facility);
        if (!facilityNode) continue;

        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(facilityNode.x, facilityNode.y);
        ctx.stroke();
      }
    }

    // nodes
    for (const node of graph.nodes ?? []) {
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
        ctx.arc(node.x, node.y, 26, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = fillStyle;
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 2.5;

      if (shape === 'square') {
        drawSquare(ctx, node.x, node.y, 10);
      } else if (shape === 'diamond') {
        drawDiamond(ctx, node.x, node.y, 11);
      } else {
        drawCircle(ctx, node.x, node.y, 10);
      }

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(node.id), node.x, node.y - 16);

      ctx.fillStyle = '#93c5fd';
      ctx.font = '11px Inter, Arial, sans-serif';
      ctx.fillText(`w=${node.weight ?? 1}`, node.x, node.y + 26);
    }
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