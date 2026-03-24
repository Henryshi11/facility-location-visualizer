import { useEffect, useRef } from 'react';

function drawSquare(ctx, x, y, size) {
  ctx.beginPath();
  ctx.rect(x - size, y - size, size * 2, size * 2);
  ctx.fill();
  ctx.stroke();
}

function drawDiamond(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawCircle(ctx, x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function getNodeById(graph, id) {
  return graph.nodes.find((node) => node.id === id);
}

function getNodeState(snapshot, nodeId) {
  return {
    isSelected: snapshot?.selected?.includes(nodeId),
    isEvaluating: snapshot?.evaluating === nodeId,
    isCovered: snapshot?.covered?.includes(nodeId),
    isEvalCovered: snapshot?.evalCovered?.includes(nodeId),
    isCurrentBest: snapshot?.currentBest === nodeId,
  };
}

function getDisplayMetrics(container) {
  const rect = container.getBoundingClientRect();
  return {
    width: Math.max(400, rect.width),
    height: Math.max(340, rect.height),
  };
}

function drawEdgeLengthLabel(ctx, x, y, text) {
  const paddingX = 6;
  const paddingY = 3;

  ctx.font = '12px Inter, Arial, sans-serif';
  const metrics = ctx.measureText(text);
  const width = metrics.width + paddingX * 2;
  const height = 18;

  ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y - height / 2, width, height, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5);
}

export default function CanvasRenderer({ graph, snapshot }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!graph || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = getDisplayMetrics(container);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // subtle top guide line
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, 40);
    ctx.lineTo(width - 24, 40);
    ctx.stroke();

    // edges
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    for (const edge of graph.edges) {
      const u = getNodeById(graph, edge.u);
      const v = getNodeById(graph, edge.v);
      if (!u || !v) continue;

      ctx.beginPath();
      ctx.moveTo(u.x, u.y);
      ctx.lineTo(v.x, v.y);
      ctx.stroke();

      const mx = (u.x + v.x) / 2;
      const my = (u.y + v.y) / 2 - 16;
      drawEdgeLengthLabel(ctx, mx, my, String(edge.length ?? 1));
    }

    // selected facility halos
    for (const facilityId of snapshot?.selected ?? []) {
      const node = getNodeById(graph, facilityId);
      if (!node) continue;

      ctx.beginPath();
      ctx.fillStyle = 'rgba(37, 99, 235, 0.10)';
      ctx.arc(node.x, node.y, 24, 0, Math.PI * 2);
      ctx.fill();
    }

    // trial coverage overlay
    if (snapshot?.evalCovered?.length > 0) {
      for (const nodeId of snapshot.evalCovered) {
        const node = getNodeById(graph, nodeId);
        if (!node) continue;

        ctx.beginPath();
        ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
        ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // confirmed covered overlay
    if (snapshot?.covered?.length > 0) {
      for (const nodeId of snapshot.covered) {
        const node = getNodeById(graph, nodeId);
        if (!node) continue;

        ctx.beginPath();
        ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
        ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // assignments
    if (snapshot?.assignments && Object.keys(snapshot.assignments).length > 0) {
      ctx.lineWidth = 2;

      for (const [nodeId, assignment] of Object.entries(snapshot.assignments)) {
        const node = getNodeById(graph, nodeId);
        const facility = getNodeById(graph, assignment.facility);

        if (!node || !facility) continue;
        if (node.id === facility.id) continue;

        ctx.strokeStyle = 'rgba(59, 130, 246, 0.45)';
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(facility.x, facility.y);
        ctx.stroke();
      }
    }

    // trial facilities overlay
    if (snapshot?.overlays?.trialFacilities?.length > 0) {
      for (const facilityId of snapshot.overlays.trialFacilities) {
        const node = getNodeById(graph, facilityId);
        if (!node) continue;

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.95)';
        ctx.lineWidth = 3;
        ctx.arc(node.x, node.y, 18, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // local swap hints
    if (snapshot?.overlays?.swapOut) {
      const node = getNodeById(graph, snapshot.overlays.swapOut);
      if (node) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.95)';
        ctx.lineWidth = 3;
        ctx.arc(node.x, node.y, 23, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (snapshot?.overlays?.swapIn) {
      const node = getNodeById(graph, snapshot.overlays.swapIn);
      if (node) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.95)';
        ctx.lineWidth = 3;
        ctx.arc(node.x, node.y, 23, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // nodes
    for (const node of graph.nodes) {
      const {
        isSelected,
        isEvaluating,
        isCovered,
        isEvalCovered,
        isCurrentBest,
      } = getNodeState(snapshot, node.id);

      let fillStyle = '#475569';
      let strokeStyle = '#0f172a';
      let shape = 'circle';

      if (isCovered) fillStyle = '#22c55e';
      if (isEvalCovered && !isCovered) fillStyle = '#f59e0b';
      if (isSelected) {
        fillStyle = '#2563eb';
        shape = 'square';
      }
      if (isEvaluating) {
        fillStyle = '#f59e0b';
        shape = 'diamond';
      }

      if (isCurrentBest) {
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

      // node id
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(String(node.id), node.x, node.y - 16);

      // node weight
      ctx.fillStyle = '#93c5fd';
      ctx.font = '11px Inter, Arial, sans-serif';
      ctx.fillText(`w=${node.weight ?? 1}`, node.x, node.y + 26);
    }
  }, [graph, snapshot]);

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