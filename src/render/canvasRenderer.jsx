import { useEffect, useRef } from 'react';

export default function CanvasRenderer({ graph, snapshot }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!graph || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const nodeMap = Object.fromEntries(graph.nodes.map((node) => [node.id, node]));

    // draw edges
    graph.edges.forEach((edge) => {
      const u = nodeMap[edge.u];
      const v = nodeMap[edge.v];
      if (!u || !v) return;

      ctx.beginPath();
      ctx.moveTo(u.x, u.y);
      ctx.lineTo(v.x, v.y);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.stroke();

      // edge length label
      const midX = (u.x + v.x) / 2;
      const midY = (u.y + v.y) / 2;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(midX - 14, midY - 10, 28, 20);

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.strokeRect(midX - 14, midY - 10, 28, 20);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(String(edge.length), midX, midY + 4);
    });

    // draw assignment lines
    if (snapshot?.assignments) {
      Object.entries(snapshot.assignments).forEach(([nodeId, assignment]) => {
        const from = nodeMap[nodeId];
        const to = nodeMap[assignment.facilityId];
        if (!from || !to || from.id === to.id) return;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);

        const cpX = (from.x + to.x) / 2 + (from.y - to.y) * 0.12;
        const cpY = (from.y + to.y) / 2 + (to.x - from.x) * 0.12;

        ctx.quadraticCurveTo(cpX, cpY, to.x, to.y);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // draw nodes
    graph.nodes.forEach((node) => {
      const isSelected = snapshot?.selected?.includes(node.id);
      const isEvaluating = snapshot?.evaluating === node.id;
      const isCovered =
        snapshot?.covered?.includes(node.id) || snapshot?.evalCovered?.includes(node.id);

      const radius = 10 + node.weight * 2;

      if (isSelected) {
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(node.x - radius, node.y - radius, radius * 2, radius * 2);

        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 2;
        ctx.strokeRect(node.x - radius, node.y - radius, radius * 2, radius * 2);
      } else if (isEvaluating) {
        ctx.save();
        ctx.translate(node.x, node.y);
        ctx.rotate(Math.PI / 4);

        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-radius, -radius, radius * 2, radius * 2);

        ctx.strokeStyle = '#fde68a';
        ctx.lineWidth = 2;
        ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);

        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

        if (isCovered) {
          ctx.fillStyle = '#22c55e';
        } else {
          ctx.fillStyle = '#475569';
        }

        ctx.fill();

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // node id
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(node.id, node.x, node.y - radius - 8);

      // weight label
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px Arial';
      ctx.fillText(`w:${node.weight}`, node.x, node.y + radius + 14);
    });
  }, [graph, snapshot]);

  return (
    <canvas
      ref={canvasRef}
      width={1100}
      height={720}
      style={{
        width: '100%',
        minHeight: '620px',
        background: '#020617',
        borderRadius: '12px',
        border: '1px solid #1e293b',
        display: 'block',
      }}
    />
  );
}