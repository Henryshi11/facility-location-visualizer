import { useEffect, useMemo, useState } from 'react';

import { MODELS, MODEL_INFO } from './config/models';
import { ALGORITHMS, ALGORITHM_OPTIONS } from './config/algorithms';

import { generateRandomPathGraph } from './graph/generators/randomPath';
import { buildSnapshots } from './features/simulation/buildSnapshots';
import CanvasRenderer from './render/canvasRenderer.jsx';

export default function App() {
  const [model, setModel] = useState(MODELS.PMEDIAN);
  const [algorithm, setAlgorithm] = useState(ALGORITHMS.GREEDY_ADDITION);
  const [graph, setGraph] = useState(() => generateRandomPathGraph());

  const [p, setP] = useState(2);
  const [radius, setRadius] = useState(30);

  const [snapshots, setSnapshots] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(700);

  const currentAlgorithmOptions = useMemo(() => {
    return ALGORITHM_OPTIONS[model] ?? [];
  }, [model]);

  useEffect(() => {
    const available = ALGORITHM_OPTIONS[model] ?? [];
    const isStillValid = available.some((item) => item.id === algorithm);

    if (!isStillValid && available.length > 0) {
      setAlgorithm(available[0].id);
    }
  }, [model, algorithm]);

  useEffect(() => {
    const nextSnapshots = buildSnapshots({
      model,
      algorithm,
      graph,
      params: { p, radius },
    });

    setSnapshots(nextSnapshots);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [model, algorithm, graph, p, radius]);

  useEffect(() => {
    if (!isPlaying) return;
    if (snapshots.length === 0) return;
    if (currentStepIndex >= snapshots.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStepIndex((prev) => prev + 1);
    }, playbackSpeed);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, snapshots, playbackSpeed]);

  const currentSnapshot = snapshots[currentStepIndex] ?? null;

  const renderMetricSummary = () => {
    if (!currentSnapshot?.metrics) return '---';

    if (model === MODELS.PMEDIAN) {
      const value = currentSnapshot.metrics.objective;
      return typeof value === 'number' && value !== Infinity
        ? value.toFixed(0)
        : '---';
    }

    if (model === MODELS.PCENTER) {
      const value = currentSnapshot.metrics.maxDistance;
      return typeof value === 'number' && value !== Infinity
        ? value.toFixed(0)
        : '---';
    }

    if (model === MODELS.SETCOVER) {
      const covered = currentSnapshot.metrics.coveredCount ?? 0;
      const total = currentSnapshot.metrics.total ?? graph.nodes.length;
      return `${covered}/${total}`;
    }

    return '---';
  };

  const renderMetricLabel = () => {
    if (model === MODELS.PMEDIAN) return 'Weighted Distance';
    if (model === MODELS.PCENTER) return 'Max Distance';
    if (model === MODELS.SETCOVER) return 'Coverage';
    return 'Metric';
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#020617',
        color: '#e2e8f0',
        padding: '24px',
        fontFamily: 'Inter, Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        <h1 style={{ marginBottom: '8px', fontSize: '32px' }}>
          Facility Location Visualizer
        </h1>
        <p style={{ marginTop: 0, color: '#94a3b8' }}>
          Multi-model teaching prototype with modular architecture.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '16px',
            marginTop: '24px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                background: '#020617',
                color: '#e2e8f0',
                border: '1px solid #334155',
              }}
            >
              <option value={MODELS.PMEDIAN}>p-Median</option>
              <option value={MODELS.PCENTER}>p-Center</option>
              <option value={MODELS.SETCOVER}>Set Covering</option>
            </select>
          </div>

          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>
              Algorithm
            </label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                background: '#020617',
                color: '#e2e8f0',
                border: '1px solid #334155',
              }}
            >
              {currentAlgorithmOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            {model === MODELS.SETCOVER ? (
              <>
                <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>
                  Radius
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={radius}
                  onChange={(e) => {
                    const nextRadius = Math.max(1, parseInt(e.target.value, 10) || 1);
                    setRadius(nextRadius);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: '#020617',
                    color: '#e2e8f0',
                    border: '1px solid #334155',
                  }}
                />
              </>
            ) : (
              <>
                <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>
                  p Value
                </label>
                <input
                  type="number"
                  min="1"
                  max={graph.nodes.length}
                  value={p}
                  onChange={(e) => {
                    const nextP = Math.max(
                      1,
                      Math.min(graph.nodes.length, parseInt(e.target.value, 10) || 1)
                    );
                    setP(nextP);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    background: '#020617',
                    color: '#e2e8f0',
                    border: '1px solid #334155',
                  }}
                />
              </>
            )}
          </div>

          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'end',
            }}
          >
            <button
              onClick={() => setGraph(generateRandomPathGraph())}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: '#2563eb',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Generate Random Path
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '16px',
            alignItems: 'start',
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: '20px' }}>Visualization</h2>

            <CanvasRenderer graph={graph} snapshot={currentSnapshot} />
          </div>

          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: '20px' }}>Simulation State</h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  background: '#020617',
                  border: '1px solid #1e293b',
                  borderRadius: '10px',
                  padding: '12px',
                }}
              >
                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>
                  Model
                </div>
                <div style={{ fontSize: '22px', fontWeight: 700 }}>
                  {MODEL_INFO[model]?.name}
                </div>
              </div>

              <div
                style={{
                  background: '#020617',
                  border: '1px solid #1e293b',
                  borderRadius: '10px',
                  padding: '12px',
                }}
              >
                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>
                  {renderMetricLabel()}
                </div>
                <div style={{ fontSize: '22px', fontWeight: 700 }}>
                  {renderMetricSummary()}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '12px', color: '#94a3b8', lineHeight: 1.7 }}>
              <div>
                <strong style={{ color: '#e2e8f0' }}>Objective:</strong>{' '}
                {MODEL_INFO[model]?.description}
              </div>
              <div>
                <strong style={{ color: '#e2e8f0' }}>Snapshots:</strong>{' '}
                {snapshots.length}
              </div>
              <div>
                <strong style={{ color: '#e2e8f0' }}>Current Step:</strong>{' '}
                {currentStepIndex}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <input
                type="range"
                min="0"
                max={Math.max(0, snapshots.length - 1)}
                value={currentStepIndex}
                onChange={(e) => {
                  setCurrentStepIndex(parseInt(e.target.value, 10));
                  setIsPlaying(false);
                }}
                style={{ width: '100%' }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                marginBottom: '14px',
              }}
            >
              <button
                onClick={() => {
                  setCurrentStepIndex(0);
                  setIsPlaying(false);
                }}
                style={buttonStyle}
              >
                Reset
              </button>

              <button
                onClick={() => {
                  setCurrentStepIndex((prev) => Math.max(0, prev - 1));
                  setIsPlaying(false);
                }}
                style={buttonStyle}
              >
                Prev
              </button>

              <button
                onClick={() => setIsPlaying((prev) => !prev)}
                style={{
                  ...buttonStyle,
                  background: isPlaying ? '#dc2626' : '#2563eb',
                  border: 'none',
                }}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>

              <button
                onClick={() => {
                  setCurrentStepIndex((prev) =>
                    Math.min(Math.max(0, snapshots.length - 1), prev + 1)
                  );
                  setIsPlaying(false);
                }}
                style={buttonStyle}
              >
                Next
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#94a3b8',
                  fontSize: '13px',
                }}
              >
                Playback Speed: {playbackSpeed} ms
              </label>
              <input
                type="range"
                min="150"
                max="1500"
                step="50"
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseInt(e.target.value, 10))}
                style={{ width: '100%' }}
              />
            </div>

            <div
              style={{
                background: '#020617',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ color: '#93c5fd' }}>Step Type:</strong>{' '}
                {currentSnapshot?.type ?? '---'}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1', lineHeight: 1.6 }}>
                {currentSnapshot?.explanation ?? 'No snapshot yet.'}
              </div>
            </div>

            <div>
              <strong style={{ color: '#93c5fd' }}>Current Snapshot JSON:</strong>
              <pre
                style={{
                  background: '#020617',
                  padding: '12px',
                  borderRadius: '8px',
                  overflowX: 'auto',
                  maxHeight: '240px',
                  overflowY: 'auto',
                  color: '#cbd5e1',
                  marginTop: '8px',
                }}
              >
                {JSON.stringify(currentSnapshot, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #334155',
  background: '#020617',
  color: '#e2e8f0',
  cursor: 'pointer',
};