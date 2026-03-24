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

function formatAlgorithmLabel(algorithmId) {
  switch (algorithmId) {
    case ALGORITHMS.GREEDY_ADDITION:
      return 'Greedy Addition';
    case ALGORITHMS.LOCAL_SWAP:
      return 'Local Swap';
    case ALGORITHMS.FARTHEST_FIRST:
      return 'Farthest First';
    case ALGORITHMS.GREEDY_COVER:
      return 'Greedy Cover';
    case ALGORITHMS.EXACT_BRUTEFORCE:
      return 'Exact (Small Only)';
    default:
      return algorithmId;
  }
}

function getRoundLabel(snapshot, model) {
  if (!snapshot) return '-';

  if (model === MODELS.SETCOVER) {
    if (snapshot.metrics?.radius != null) {
      return `radius ${snapshot.metrics.radius}`;
    }
    return snapshot.metrics?.round ?? '-';
  }

  if (snapshot.metrics?.iteration != null) {
    return `iteration ${snapshot.metrics.iteration}`;
  }

  if (snapshot.metrics?.round != null) {
    return `round ${snapshot.metrics.round}`;
  }

  if (snapshot.metrics?.p != null) {
    return `p = ${snapshot.metrics.p}`;
  }

  return '-';
}

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

    const timer = window.setTimeout(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= snapshots.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, playbackSpeed);

    return () => window.clearTimeout(timer);
  }, [isPlaying, currentStepIndex, snapshots, playbackSpeed]);

  const currentSnapshot = snapshots[currentStepIndex] ?? null;
  const modelInfo = MODEL_INFO[model];

  const handleGenerateRandomPath = () => {
    const randomGraph = generateRandomPathGraph();
    setGraph(randomGraph);
    setGraphSource(randomGraph.name);
  };

  const handleGraphChange = (event) => {
    const nextName = event.target.value;

    if (nextName === 'Random Path') {
      const randomGraph = generateRandomPathGraph();
      setGraph(randomGraph);
      setGraphSource(randomGraph.name);
      return;
    }

    const selectedExample = EXAMPLE_GRAPHS.find((item) => item.name === nextName);
    if (selectedExample) {
      setGraph(selectedExample);
      setGraphSource(selectedExample.name);
    }
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.min(snapshots.length - 1, prev + 1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const scorePreview = (currentSnapshot?.scoreboard ?? []).slice(0, 8);

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Facility Location Visualizer</h1>
          <p style={subtitleStyle}>
            Explore facility location models with example graphs and animated snapshots.
          </p>
        </div>

        <div style={controlsGridStyle}>
          <div style={panelStyle}>
            <div style={labelStyle}>Model</div>
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
              style={inputStyle}
            >
              <option value={MODELS.PMEDIAN}>p-Median</option>
              <option value={MODELS.PCENTER}>p-Center</option>
              <option value={MODELS.SETCOVER}>Set Covering</option>
            </select>
          </div>

          <div style={panelStyle}>
            <div style={labelStyle}>Algorithm</div>
            <select
              value={algorithm}
              onChange={(event) => setAlgorithm(event.target.value)}
              style={inputStyle}
            >
              {currentAlgorithmOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div style={panelStyle}>
            <div style={labelStyle}>Graph</div>
            <select value={graphSource} onChange={handleGraphChange} style={inputStyle}>
              {EXAMPLE_GRAPHS.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
              <option value="Random Path">Random Path</option>
            </select>
          </div>

          {model === MODELS.SETCOVER ? (
            <div style={panelStyle}>
              <div style={labelStyle}>Radius</div>
              <input
                type="number"
                min="1"
                value={radius}
                onChange={(event) => setRadius(Number(event.target.value))}
                style={inputStyle}
              />
            </div>
          ) : (
            <div style={panelStyle}>
              <div style={labelStyle}>p Value</div>
              <input
                type="number"
                min="1"
                max={Math.max(1, graph?.nodes?.length ?? 1)}
                value={p}
                onChange={(event) => setP(Number(event.target.value))}
                style={inputStyle}
              />
            </div>
          )}

          <div style={panelStyle}>
            <div style={labelStyle}>Action</div>
            <button style={primaryButtonStyle} onClick={handleGenerateRandomPath}>
              Generate Random Path
            </button>
          </div>
        </div>

        <div style={panelStyle}>
          <h2 style={sectionTitleStyle}>Visualization</h2>

          <div style={metaGridStyle}>
            <div>
              <div style={metaLineStyle}>
                <strong>Graph:</strong> <span>{graph?.name ?? '-'}</span>
              </div>
              <div style={metaLineStyle}>
                <strong>Type:</strong> <span>{graph?.type ?? '-'}</span>
              </div>
              <div style={metaLineStyle}>
                <strong>Description:</strong> <span>{graph?.description ?? '-'}</span>
              </div>
            </div>

            <div>
              <div style={metaLineStyle}>
                <strong>Algorithm:</strong> <span>{formatAlgorithmLabel(algorithm)}</span>
              </div>
              <div style={metaLineStyle}>
                <strong>Step:</strong>{' '}
                <span>
                  {snapshots.length === 0 ? '0 / 0' : `${currentStepIndex + 1} / ${snapshots.length}`}
                </span>
              </div>
            </div>
          </div>

          <CanvasRenderer graph={graph} snapshot={currentSnapshot} />

          <div style={legendStyle}>
            <span style={legendItemStyle}>
              <span style={{ ...legendDotStyle, background: '#2563eb' }} />
              Selected facility
            </span>
            <span style={legendItemStyle}>
              <span
                style={{
                  ...legendDotStyle,
                  background: '#f59e0b',
                  transform: 'rotate(45deg)',
                  borderRadius: '2px',
                }}
              />
              Evaluating node
            </span>
            <span style={legendItemStyle}>
              <span style={{ ...legendDotStyle, background: '#22c55e' }} />
              Covered node
            </span>
            <span style={legendItemStyle}>
              <span
                style={{
                  ...legendDotStyle,
                  background: '#475569',
                  border: '1px solid #94a3b8',
                }}
              />
              Ordinary node
            </span>
            <span style={legendItemStyle}>
              <span
                style={{
                  ...legendDotStyle,
                  background: 'transparent',
                  border: '2px solid #facc15',
                }}
              />
              Current best halo
            </span>
          </div>
        </div>

        <div style={bottomGridStyle}>
          <div style={panelStyle}>
            <h2 style={sectionTitleStyle}>Simulation State</h2>

            <div style={statsGridStyle}>
              <div style={statBoxStyle}>
                <div style={statLabelStyle}>Model</div>
                <div style={statValueStyle}>{modelInfo?.name ?? '-'}</div>
              </div>

              <div style={statBoxStyle}>
                <div style={statLabelStyle}>Round / Param</div>
                <div style={statValueStyle}>{getRoundLabel(currentSnapshot, model)}</div>
              </div>
            </div>

            <div style={metaLineStyle}>
              <strong>Objective:</strong> <span>{modelInfo?.description ?? '-'}</span>
            </div>
            <div style={metaLineStyle}>
              <strong>Step Type:</strong> <span>{currentSnapshot?.type ?? '-'}</span>
            </div>
            <div style={metaLineStyle}>
              <strong>Phase:</strong> <span>{currentSnapshot?.phase ?? '-'}</span>
            </div>

            <div style={{ marginTop: '18px' }}>
              <input
                type="range"
                min="0"
                max={Math.max(0, snapshots.length - 1)}
                value={currentStepIndex}
                onChange={(event) => {
                  setIsPlaying(false);
                  setCurrentStepIndex(Number(event.target.value));
                }}
                style={rangeStyle}
              />
            </div>

            <div style={buttonRowStyle}>
              <button style={buttonStyle} onClick={handleReset}>
                Reset
              </button>
              <button style={buttonStyle} onClick={handlePrev}>
                Prev
              </button>
              <button
                style={primaryInlineButtonStyle}
                onClick={() => setIsPlaying((prev) => !prev)}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button style={buttonStyle} onClick={handleNext}>
                Next
              </button>
            </div>

            <div style={{ marginTop: '14px' }}>
              <div style={labelStyle}>Playback Speed: {playbackSpeed} ms</div>
              <input
                type="range"
                min="200"
                max="2000"
                step="100"
                value={playbackSpeed}
                onChange={(event) => setPlaybackSpeed(Number(event.target.value))}
                style={rangeStyle}
              />
            </div>
          </div>

          <div style={panelStyle}>
            <h2 style={sectionTitleStyle}>Explanation</h2>
            <div style={textCardStyle}>
              <div style={multilineTextStyle}>
                {currentSnapshot?.explanation || 'No explanation available for this step.'}
              </div>
            </div>
          </div>

          <div style={panelStyle}>
            <h2 style={sectionTitleStyle}>Top Scoreboard</h2>
            <div style={textCardStyle}>
              {scorePreview.length === 0 ? (
                <div style={emptyStyle}>No scoreboard data on this step.</div>
              ) : (
                <div style={scoreboardListStyle}>
                  {scorePreview.map((item) => (
                    <div key={item.id} style={scoreRowStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '999px',
                            background: item.isBest ? '#facc15' : '#334155',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: '#e2e8f0' }}>{item.id}</span>
                      </div>
                      <span style={{ color: item.isBest ? '#fde68a' : '#93c5fd' }}>
                        {Number.isFinite(item.score) ? item.score : '∞'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={panelStyle}>
            <h2 style={sectionTitleStyle}>Current Snapshot JSON</h2>
            <pre style={jsonStyle}>
              {JSON.stringify(currentSnapshot ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #020617 0%, #071127 100%)',
  color: '#e2e8f0',
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const shellStyle = {
  maxWidth: '1500px',
  margin: '0 auto',
  padding: '28px 20px 48px',
};

const headerStyle = {
  marginBottom: '22px',
};

const titleStyle = {
  margin: 0,
  fontSize: '32px',
  fontWeight: 800,
  color: '#f8fafc',
};

const subtitleStyle = {
  marginTop: '10px',
  marginBottom: 0,
  color: '#94a3b8',
  fontSize: '15px',
};

const panelStyle = {
  background: 'rgba(15, 23, 42, 0.92)',
  border: '1px solid #1e293b',
  borderRadius: '16px',
  padding: '18px',
  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.18)',
  minWidth: 0,
};

const controlsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '14px',
  marginBottom: '18px',
  alignItems: 'end',
};

const bottomGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '18px',
  marginTop: '18px',
};

const sectionTitleStyle = {
  marginTop: 0,
  marginBottom: '18px',
  fontSize: '20px',
  color: '#f8fafc',
};

const metaGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '12px 24px',
  marginBottom: '16px',
};

const metaLineStyle = {
  marginBottom: '10px',
  color: '#cbd5e1',
  lineHeight: 1.5,
};

const labelStyle = {
  color: '#94a3b8',
  fontSize: '12px',
  marginBottom: '8px',
  fontWeight: 600,
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  borderRadius: '10px',
  border: '1px solid #334155',
  background: '#020617',
  color: '#f8fafc',
  fontSize: '15px',
  outline: 'none',
};

const buttonStyle = {
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1px solid #334155',
  background: '#020617',
  color: '#e2e8f0',
  cursor: 'pointer',
  fontWeight: 600,
};

const primaryButtonStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '10px',
  border: 'none',
  background: '#2563eb',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 700,
};

const primaryInlineButtonStyle = {
  ...buttonStyle,
  background: '#2563eb',
  border: 'none',
  color: 'white',
};

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '12px',
  marginBottom: '18px',
};

const statBoxStyle = {
  background: '#020617',
  border: '1px solid #1e293b',
  borderRadius: '12px',
  padding: '14px',
};

const statLabelStyle = {
  color: '#94a3b8',
  fontSize: '12px',
  marginBottom: '6px',
};

const statValueStyle = {
  fontSize: '16px',
  fontWeight: 700,
  color: '#f8fafc',
};

const buttonRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  marginTop: '16px',
};

const rangeStyle = {
  width: '100%',
  cursor: 'pointer',
};

const textCardStyle = {
  background: '#020617',
  border: '1px solid #1e293b',
  borderRadius: '12px',
  padding: '16px',
};

const multilineTextStyle = {
  whiteSpace: 'pre-line',
  color: '#e2e8f0',
  lineHeight: 1.7,
};

const emptyStyle = {
  color: '#64748b',
};

const scoreboardListStyle = {
  display: 'grid',
  gap: '10px',
};

const scoreRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '10px 12px',
  borderRadius: '10px',
  background: '#0b1220',
  border: '1px solid #1e293b',
};

const jsonStyle = {
  margin: 0,
  padding: '16px',
  borderRadius: '12px',
  background: '#020617',
  border: '1px solid #1e293b',
  color: '#cbd5e1',
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontSize: '12px',
  lineHeight: 1.5,
};

const legendStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '16px',
  marginTop: '16px',
  color: '#cbd5e1',
  fontSize: '14px',
};

const legendItemStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
};

const legendDotStyle = {
  width: '14px',
  height: '14px',
  borderRadius: '999px',
  display: 'inline-block',
};