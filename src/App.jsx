import { useEffect, useMemo, useState } from 'react';

import { MODELS, MODEL_INFO } from './config/models';
import {
  ALGORITHMS,
  getImplementedAlgorithmOptions,
} from './config/algorithms';

import { EXAMPLE_GRAPHS } from './data/exampleGraphs';
import { generateRandomPathGraph } from './graph/generators/randomPath';
import { buildSnapshots } from './features/simulation/buildSnapshots';
import CanvasRenderer from './render/canvasRenderer.jsx';

export default function App() {
  const [model, setModel] = useState(MODELS.PMEDIAN);
  const [algorithm, setAlgorithm] = useState(ALGORITHMS.GREEDY_ADDITION);

  const [graph, setGraph] = useState(() => EXAMPLE_GRAPHS[0] ?? generateRandomPathGraph());
  const [graphSource, setGraphSource] = useState(
    EXAMPLE_GRAPHS[0]?.name ?? 'Random Path'
  );

  const [p, setP] = useState(2);
  const [radius, setRadius] = useState(30);

  const [snapshots, setSnapshots] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(700);

  const currentAlgorithmOptions = useMemo(() => {
    return getImplementedAlgorithmOptions(model);
  }, [model]);

  useEffect(() => {
    const available = getImplementedAlgorithmOptions(model);
    const stillValid = available.some((item) => item.id === algorithm);

    if (!stillValid && available.length > 0) {
      setAlgorithm(available[0].id);
    }
  }, [model, algorithm]);

  useEffect(() => {
    const maxAllowedP = Math.max(1, graph?.nodes?.length ?? 1);
    if (p > maxAllowedP) {
      setP(maxAllowedP);
    }
  }, [graph, p]);

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

  function handleExampleGraphChange(name) {
    if (name === 'Random Path') {
      handleRandomGraph();
      return;
    }

    const nextGraph = EXAMPLE_GRAPHS.find((item) => item.name === name);
    if (!nextGraph) return;

    setGraph(nextGraph);
    setGraphSource(nextGraph.name);
  }

  function handleRandomGraph() {
    const nextGraph = generateRandomPathGraph();
    setGraph(nextGraph);
    setGraphSource('Random Path');
  }

  function renderMetricLabel() {
    if (model === MODELS.PMEDIAN) return 'Weighted Distance';
    if (model === MODELS.PCENTER) return 'Max Distance';
    if (model === MODELS.SETCOVER) return 'Coverage';
    return 'Metric';
  }

  function renderMetricValue() {
    if (!currentSnapshot?.metrics) return '---';

    if (model === MODELS.PMEDIAN) {
      const value = currentSnapshot.metrics.objective;
      return typeof value === 'number' && Number.isFinite(value)
        ? value.toFixed(0)
        : '---';
    }

    if (model === MODELS.PCENTER) {
      const value = currentSnapshot.metrics.maxDistance;
      return typeof value === 'number' && Number.isFinite(value)
        ? value.toFixed(0)
        : '---';
    }

    if (model === MODELS.SETCOVER) {
      const covered = currentSnapshot.metrics.coveredCount ?? 0;
      const total = currentSnapshot.metrics.total ?? graph.nodes.length;
      return `${covered}/${total}`;
    }

    return '---';
  }

  function renderAlgorithmLabel() {
    const found = currentAlgorithmOptions.find((item) => item.id === algorithm);
    return found?.label ?? algorithm;
  }

  function renderStepProgress() {
    if (!snapshots.length) return '0 / 0';
    return `${currentStepIndex + 1} / ${snapshots.length}`;
  }

  function renderExtraMetric() {
    if (!currentSnapshot?.metrics) return '---';

    if (model === MODELS.PMEDIAN) {
      if (typeof currentSnapshot.metrics.checked === 'number') {
        return `${currentSnapshot.metrics.checked}/${currentSnapshot.metrics.totalCombos ?? '?'}`;
      }
      return `round ${currentSnapshot.metrics.round ?? '-'}`;
    }

    if (model === MODELS.PCENTER) {
      if (typeof currentSnapshot.metrics.checked === 'number') {
        return `${currentSnapshot.metrics.checked}/${currentSnapshot.metrics.totalCombos ?? '?'}`;
      }
      return `round ${currentSnapshot.metrics.round ?? '-'}`;
    }

    if (model === MODELS.SETCOVER) {
      if (typeof currentSnapshot.metrics.checked === 'number') {
        return `checked ${currentSnapshot.metrics.checked}`;
      }
      return `r=${currentSnapshot.metrics.radius ?? radius}`;
    }

    return '---';
  }

  function renderExtraMetricLabel() {
    if (!currentSnapshot?.metrics) return 'Progress';

    if (
      model === MODELS.PMEDIAN &&
      typeof currentSnapshot.metrics.checked === 'number'
    ) {
      return 'Enumerated';
    }

    if (
      model === MODELS.PCENTER &&
      typeof currentSnapshot.metrics.checked === 'number'
    ) {
      return 'Enumerated';
    }

    if (
      model === MODELS.SETCOVER &&
      typeof currentSnapshot.metrics.checked === 'number'
    ) {
      return 'Enumeration';
    }

    return 'Round / Param';
  }

  const topScoreboardRows = (currentSnapshot?.scoreboard ?? []).slice(0, 8);

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
          maxWidth: '1500px',
          margin: '0 auto',
        }}
      >
        <h1 style={{ marginBottom: '8px', fontSize: '34px' }}>
          Facility Location Visualizer
        </h1>
        <p style={{ marginTop: 0, color: '#94a3b8', maxWidth: '900px', lineHeight: 1.6 }}>
          A teaching-oriented visualizer for facility location models. Explore p-Median,
          p-Center, and Covering problems through step-by-step algorithms, example graphs,
          and animated snapshots.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: '16px',
            marginTop: '24px',
            marginBottom: '24px',
          }}
        >
          <div style={cardStyle}>
            <label style={labelStyle}>Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={selectStyle}
            >
              <option value={MODELS.PMEDIAN}>p-Median</option>
              <option value={MODELS.PCENTER}>p-Center</option>
              <option value={MODELS.SETCOVER}>Set Covering</option>
            </select>
          </div>

          <div style={cardStyle}>
            <label style={labelStyle}>Algorithm</label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              style={selectStyle}
            >
              {currentAlgorithmOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div style={cardStyle}>
            <label style={labelStyle}>Graph</label>
            <select
              value={graphSource}
              onChange={(e) => handleExampleGraphChange(e.target.value)}
              style={selectStyle}
            >
              {EXAMPLE_GRAPHS.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
              <option value="Random Path">Random Path</option>
            </select>
          </div>

          <div style={cardStyle}>
            {model === MODELS.SETCOVER ? (
              <>
                <label style={labelStyle}>Radius</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={radius}
                  onChange={(e) => {
                    const nextRadius = Math.max(1, parseInt(e.target.value, 10) || 1);
                    setRadius(nextRadius);
                  }}
                  style={selectStyle}
                />
              </>
            ) : (
              <>
                <label style={labelStyle}>p Value</label>
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, graph.nodes.length)}
                  value={p}
                  onChange={(e) => {
                    const nextP = Math.max(
                      1,
                      Math.min(
                        Math.max(1, graph.nodes.length),
                        parseInt(e.target.value, 10) || 1
                      )
                    );
                    setP(nextP);
                  }}
                  style={selectStyle}
                />
              </>
            )}
          </div>

          <div
            style={{
              ...cardStyle,
              display: 'flex',
              alignItems: 'end',
            }}
          >
            <button
              onClick={handleRandomGraph}
              style={primaryButtonStyle}
            >
              Generate Random Path
            </button>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2.2fr 1fr',
            gap: '16px',
            alignItems: 'start',
          }}
        >
          <div style={panelStyle}>
            <h2 style={{ marginTop: 0, fontSize: '20px' }}>Visualization</h2>

            <div
              style={{
                marginBottom: '14px',
                color: '#94a3b8',
                lineHeight: 1.7,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}
            >
              <div>
                <div>
                  <strong style={{ color: '#e2e8f0' }}>Graph:</strong> {graphSource}
                </div>
                <div>
                  <strong style={{ color: '#e2e8f0' }}>Type:</strong> {graph.type ?? 'path'}
                </div>
              </div>
              <div>
                <div>
                  <strong style={{ color: '#e2e8f0' }}>Algorithm:</strong> {renderAlgorithmLabel()}
                </div>
                <div>
                  <strong style={{ color: '#e2e8f0' }}>Step:</strong> {renderStepProgress()}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong style={{ color: '#e2e8f0' }}>Description:</strong>{' '}
                {graph.description ?? 'Randomly generated path graph'}
              </div>
            </div>

            <CanvasRenderer graph={graph} snapshot={currentSnapshot} />

            <div
              style={{
                marginTop: '16px',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                color: '#cbd5e1',
                fontSize: '14px',
              }}
            >
              <LegendItem color="#2563eb" label="Selected facility" shape="square" />
              <LegendItem color="#f59e0b" label="Evaluating node" shape="diamond" />
              <LegendItem color="#22c55e" label="Covered node" shape="circle" />
              <LegendItem color="#475569" label="Ordinary node" shape="circle" />
              <LegendItem color="#facc15" label="Current best halo" shape="ring" />
            </div>
          </div>

          <div style={panelStyle}>
            <h2 style={{ marginTop: 0, fontSize: '20px' }}>Simulation State</h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div style={statCardStyle}>
                <div style={statLabelStyle}>Model</div>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>
                  {MODEL_INFO[model]?.name}
                </div>
              </div>

              <div style={statCardStyle}>
                <div style={statLabelStyle}>{renderMetricLabel()}</div>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>
                  {renderMetricValue()}
                </div>
              </div>

              <div style={statCardStyle}>
                <div style={statLabelStyle}>{renderExtraMetricLabel()}</div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>
                  {renderExtraMetric()}
                </div>
              </div>

              <div style={statCardStyle}>
                <div style={statLabelStyle}>Snapshots</div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>
                  {snapshots.length}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '12px', color: '#94a3b8', lineHeight: 1.7 }}>
              <div>
                <strong style={{ color: '#e2e8f0' }}>Objective:</strong>{' '}
                {MODEL_INFO[model]?.description}
              </div>
              <div>
                <strong style={{ color: '#e2e8f0' }}>Step Type:</strong>{' '}
                {currentSnapshot?.type ?? '---'}
              </div>
              <div>
                <strong style={{ color: '#e2e8f0' }}>Phase:</strong>{' '}
                {currentSnapshot?.phase ?? '---'}
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

            <div style={explanationPanelStyle}>
              <div style={{ marginBottom: '8px', color: '#93c5fd', fontWeight: 700 }}>
                Explanation
              </div>
              <div style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1', lineHeight: 1.65 }}>
                {currentSnapshot?.explanation ?? 'No snapshot yet.'}
              </div>
            </div>

            <div style={scoreboardPanelStyle}>
              <div style={{ marginBottom: '8px', color: '#93c5fd', fontWeight: 700 }}>
                Top Scoreboard
              </div>

              {topScoreboardRows.length === 0 ? (
                <div style={{ color: '#64748b' }}>No scoreboard data on this step.</div>
              ) : (
                <div style={{ display: 'grid', gap: '6px' }}>
                  {topScoreboardRows.map((row) => (
                    <div
                      key={row.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: row.isBest ? 'rgba(250, 204, 21, 0.12)' : '#020617',
                        border: row.isBest
                          ? '1px solid rgba(250, 204, 21, 0.35)'
                          : '1px solid #1e293b',
                      }}
                    >
                      <div
                        style={{
                          color: row.isBest ? '#fde68a' : '#cbd5e1',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.id}
                      </div>
                      <div
                        style={{
                          color: row.isBest ? '#fde68a' : '#93c5fd',
                          fontWeight: 700,
                        }}
                      >
                        {Number.isFinite(row.score) ? row.score.toFixed(0) : '∞'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <strong style={{ color: '#93c5fd' }}>Current Snapshot JSON:</strong>
              <pre
                style={{
                  background: '#020617',
                  padding: '12px',
                  borderRadius: '8px',
                  overflowX: 'auto',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  color: '#cbd5e1',
                  marginTop: '8px',
                  border: '1px solid #1e293b',
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

function LegendItem({ color, label, shape }) {
  let shapeStyle;

  if (shape === 'square') {
    shapeStyle = {
      width: 14,
      height: 14,
      background: color,
      borderRadius: 2,
      border: '1px solid rgba(255,255,255,0.25)',
    };
  } else if (shape === 'diamond') {
    shapeStyle = {
      width: 14,
      height: 14,
      background: color,
      transform: 'rotate(45deg)',
      borderRadius: 2,
      border: '1px solid rgba(255,255,255,0.25)',
    };
  } else if (shape === 'ring') {
    shapeStyle = {
      width: 14,
      height: 14,
      borderRadius: '50%',
      border: `3px solid ${color}`,
      background: 'transparent',
      boxSizing: 'border-box',
    };
  } else {
    shapeStyle = {
      width: 14,
      height: 14,
      background: color,
      borderRadius: '50%',
      border: '1px solid rgba(255,255,255,0.25)',
    };
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={shapeStyle} />
      <span>{label}</span>
    </div>
  );
}

const cardStyle = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '12px',
  padding: '16px',
};

const panelStyle = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '12px',
  padding: '20px',
};

const explanationPanelStyle = {
  background: '#020617',
  border: '1px solid #1e293b',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '16px',
};

const scoreboardPanelStyle = {
  background: '#0b1220',
  border: '1px solid #1e293b',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '16px',
};

const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  color: '#94a3b8',
};

const selectStyle = {
  width: '100%',
  padding: '10px',
  borderRadius: '8px',
  background: '#020617',
  color: '#e2e8f0',
  border: '1px solid #334155',
};

const statCardStyle = {
  background: '#020617',
  border: '1px solid #1e293b',
  borderRadius: '10px',
  padding: '12px',
};

const statLabelStyle = {
  color: '#94a3b8',
  fontSize: '12px',
  marginBottom: '6px',
};

const buttonStyle = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #334155',
  background: '#020617',
  color: '#e2e8f0',
  cursor: 'pointer',
};

const primaryButtonStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: 'none',
  background: '#2563eb',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 600,
};