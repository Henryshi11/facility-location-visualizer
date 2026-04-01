import { useEffect, useMemo, useState } from 'react';

import { MODELS, MODEL_INFO } from './config/models';
import { ALGORITHMS, getImplementedAlgorithmOptions } from './config/algorithms';

import { EXAMPLE_GRAPHS } from './data/exampleGraphs';
import { generateRandomPathGraph } from './graph/generators/randomPath';
import { buildSnapshots } from './features/simulation/buildSnapshots';
import CanvasRenderer from './render/canvasRenderer.jsx';

const RANDOM_GRAPH_OPTION = '__random_path__';

function getAlgorithmLabel(algorithmId, options) {
  const found = options.find((item) => item.id === algorithmId);
  if (found?.label) return found.label;

  switch (algorithmId) {
    case ALGORITHMS.EXACT_BRUTEFORCE:
      return 'Exact (Small Only)';
    case ALGORITHMS.FEASIBILITY_TEST:
      return 'λ-Feasibility Test';
    case ALGORITHMS.PARAMETRIC_SEARCH:
      return 'Parametric Search';
    default:
      return algorithmId;
  }
}

function getRoundLabel(snapshot, model) {
  if (!snapshot) return '-';

  if (snapshot.metrics?.iteration != null) {
    return `iteration ${snapshot.metrics.iteration}`;
  }

  if (snapshot.metrics?.round != null) {
    return `round ${snapshot.metrics.round}`;
  }

  if (model === MODELS.PCENTER && snapshot.metrics?.lambdaValue != null) {
    return `λ = ${snapshot.metrics.lambdaValue}`;
  }

  if (snapshot.metrics?.p != null) {
    return `p = ${snapshot.metrics.p}`;
  }

  return '-';
}

function getPrimaryMetric(snapshot, model) {
  if (!snapshot) return null;

  if (model === MODELS.PMEDIAN) {
    return {
      label: 'Total Cost',
      value: snapshot.metrics?.totalCost,
    };
  }

  if (model === MODELS.PCENTER) {
    if (snapshot.metrics?.optimalLambda != null) {
      return {
        label: 'Optimal λ',
        value: snapshot.metrics?.optimalLambda,
      };
    }

    if (snapshot.metrics?.lambdaValue != null) {
      return {
        label: 'λ',
        value: snapshot.metrics?.lambdaValue,
      };
    }

    return {
      label: 'Max Cost',
      value: snapshot.metrics?.maxCost,
    };
  }

  if (model === MODELS.SETCOVER) {
    return {
      label: 'Facility Count',
      value: snapshot.metrics?.facilityCount,
    };
  }

  return null;
}

function formatMetricValue(value) {
  if (value == null) return '-';
  if (!Number.isFinite(value)) return '∞';
  if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
  return value.toFixed(2);
}

function shouldShowLambda(model, algorithm) {
  if (model === MODELS.SETCOVER) return true;
  if (model === MODELS.PCENTER) {
    return (
      algorithm === ALGORITHMS.FEASIBILITY_TEST ||
      algorithm === ALGORITHMS.PARAMETRIC_SEARCH
    );
  }
  return false;
}

export default function App() {
  const [model, setModel] = useState(MODELS.PCENTER);
  const [algorithm, setAlgorithm] = useState(ALGORITHMS.FEASIBILITY_TEST);

  const [graph, setGraph] = useState(() => EXAMPLE_GRAPHS[0] ?? generateRandomPathGraph());
  const [graphSelectorValue, setGraphSelectorValue] = useState(
    EXAMPLE_GRAPHS[0]?.name ?? RANDOM_GRAPH_OPTION
  );

  const [p, setP] = useState(2);
  const [lambdaValue, setLambdaValue] = useState(30);

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
      params: { p, lambdaValue },
    });

    setSnapshots(nextSnapshots);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [model, algorithm, graph, p, lambdaValue]);

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

  const currentSnapshot =
    currentStepIndex >= 0 && currentStepIndex < snapshots.length
      ? snapshots[currentStepIndex]
      : null;

  const modelInfo = MODEL_INFO[model];
  const primaryMetric = getPrimaryMetric(currentSnapshot, model);

  const handleGenerateRandomPath = () => {
    const randomGraph = generateRandomPathGraph();
    setGraph(randomGraph);
    setGraphSelectorValue(RANDOM_GRAPH_OPTION);
  };

  const handleGraphChange = (event) => {
    const nextValue = event.target.value;
    setGraphSelectorValue(nextValue);

    if (nextValue === RANDOM_GRAPH_OPTION) {
      const randomGraph = generateRandomPathGraph();
      setGraph(randomGraph);
      return;
    }

    const selectedExample = EXAMPLE_GRAPHS.find((item) => item.name === nextValue);
    if (selectedExample) {
      setGraph(selectedExample);
    }
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (snapshots.length === 0) return;
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.min(snapshots.length - 1, prev + 1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  const scorePreview = (currentSnapshot?.scoreboard ?? []).slice(0, 8);
  const showLambda = shouldShowLambda(model, algorithm);

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Facility Location Visualizer</h1>
          <p style={subtitleStyle}>
            Course-focused visualization for p-median, p-center, covering, and p-center
            parametric search on path graphs.
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
              <option value={MODELS.SETCOVER}>Covering</option>
            </select>
          </div>

          <div style={panelStyle}>
            <div style={labelStyle}>Algorithm</div>
            <select
              value={algorithm}
              onChange={(event) => setAlgorithm(event.target.value)}
              style={inputStyle}
            >
              {currentAlgorithmOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {getAlgorithmLabel(option.id, currentAlgorithmOptions)}
                </option>
              ))}
            </select>
          </div>

          <div style={panelStyle}>
            <div style={labelStyle}>Graph</div>
            <select
              value={graphSelectorValue}
              onChange={handleGraphChange}
              style={inputStyle}
            >
              {EXAMPLE_GRAPHS.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
              <option value={RANDOM_GRAPH_OPTION}>Random Path</option>
            </select>
          </div>

          <div style={panelStyle}>
            <div style={labelStyle}>Random</div>
            <button onClick={handleGenerateRandomPath} style={buttonStyle}>
              Generate Random Path
            </button>
          </div>

          <div style={panelStyle}>
            <div style={labelStyle}>p</div>
            <input
              type="number"
              min={1}
              max={graph?.nodes?.length ?? 1}
              value={p}
              onChange={(event) => setP(Math.max(1, Number(event.target.value) || 1))}
              style={inputStyle}
            />
          </div>

          <div style={panelStyle}>
            <div style={labelStyle}>λ</div>
            <input
              type="number"
              min={0}
              value={lambdaValue}
              disabled={!showLambda}
              onChange={(event) =>
                setLambdaValue(Math.max(0, Number(event.target.value) || 0))
              }
              style={{
                ...inputStyle,
                opacity: showLambda ? 1 : 0.55,
                cursor: showLambda ? 'text' : 'not-allowed',
              }}
            />
          </div>

          <div style={panelStyle}>
            <div style={labelStyle}>Speed (ms)</div>
            <input
              type="number"
              min={100}
              step={100}
              value={playbackSpeed}
              onChange={(event) =>
                setPlaybackSpeed(Math.max(100, Number(event.target.value) || 700))
              }
              style={inputStyle}
            />
          </div>
        </div>

        <div style={mainGridStyle}>
          <div style={leftColumnStyle}>
            <div style={panelStyle}>
              <div style={sectionTitleStyle}>Visualization</div>
              <CanvasRenderer graph={graph} snapshot={currentSnapshot} />
            </div>

            <div style={panelStyle}>
              <div style={sectionTitleStyle}>Playback</div>
              <div style={buttonRowStyle}>
                <button onClick={handlePrev} style={buttonStyle}>
                  Prev
                </button>
                <button
                  onClick={() => setIsPlaying((prev) => !prev)}
                  style={buttonStyle}
                  disabled={snapshots.length === 0}
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button onClick={handleNext} style={buttonStyle}>
                  Next
                </button>
                <button onClick={handleReset} style={buttonStyle}>
                  Reset
                </button>
              </div>

              <div style={metaRowStyle}>
                <div>
                  <strong>Step:</strong> {snapshots.length === 0 ? 0 : currentStepIndex + 1} /{' '}
                  {snapshots.length}
                </div>
                <div>
                  <strong>Phase:</strong> {currentSnapshot?.phase ?? '-'}
                </div>
                <div>
                  <strong>Round:</strong> {getRoundLabel(currentSnapshot, model)}
                </div>
              </div>
            </div>
          </div>

          <div style={rightColumnStyle}>
            <div style={panelStyle}>
              <div style={sectionTitleStyle}>Model Summary</div>
              <div style={infoLineStyle}>
                <strong>{modelInfo?.name}</strong>
              </div>
              <div style={infoMutedStyle}>{modelInfo?.description}</div>
              <div style={infoMutedStyle}>Graph: {graph?.name ?? '-'}</div>
              <div style={infoMutedStyle}>
                Algorithm: {getAlgorithmLabel(algorithm, currentAlgorithmOptions)}
              </div>
            </div>

            <div style={panelStyle}>
              <div style={sectionTitleStyle}>Current Metric</div>
              <div style={metricValueStyle}>
                {primaryMetric ? (
                  <>
                    <span>{primaryMetric.label}: </span>
                    <strong>{formatMetricValue(primaryMetric.value)}</strong>
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>

            <div style={panelStyle}>
              <div style={sectionTitleStyle}>Explanation</div>
              <pre style={explanationStyle}>
                {currentSnapshot?.explanation ?? 'No explanation available.'}
              </pre>
            </div>

            <div style={panelStyle}>
              <div style={sectionTitleStyle}>Scoreboard Preview</div>
              {scorePreview.length === 0 ? (
                <div style={infoMutedStyle}>No scoreboard for this step.</div>
              ) : (
                <div style={scoreListStyle}>
                  {scorePreview.map((item) => (
                    <div key={item.id} style={scoreRowStyle}>
                      <span>{item.id}</span>
                      <span>
                        {formatMetricValue(item.score)} {item.isBest ? '★' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={panelStyle}>
              <div style={sectionTitleStyle}>Snapshot JSON</div>
              <pre style={jsonStyle}>{JSON.stringify(currentSnapshot, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  background: '#020617',
  color: '#e2e8f0',
  padding: '24px',
  fontFamily: 'Inter, Arial, sans-serif',
};

const shellStyle = {
  maxWidth: '1500px',
  margin: '0 auto',
};

const headerStyle = {
  marginBottom: '20px',
};

const titleStyle = {
  margin: 0,
  fontSize: '32px',
};

const subtitleStyle = {
  marginTop: '8px',
  color: '#94a3b8',
};

const controlsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: '12px',
  marginBottom: '16px',
};

const mainGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1.5fr 1fr',
  gap: '16px',
};

const leftColumnStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const rightColumnStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const panelStyle = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '12px',
  padding: '14px',
};

const sectionTitleStyle = {
  fontWeight: 700,
  marginBottom: '10px',
};

const labelStyle = {
  fontSize: '12px',
  color: '#94a3b8',
  marginBottom: '6px',
};

const inputStyle = {
  width: '100%',
  background: '#020617',
  color: '#e2e8f0',
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '10px',
};

const buttonStyle = {
  background: '#1d4ed8',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 12px',
  cursor: 'pointer',
};

const buttonRowStyle = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
};

const metaRowStyle = {
  display: 'flex',
  gap: '16px',
  marginTop: '12px',
  flexWrap: 'wrap',
  color: '#cbd5e1',
};

const explanationStyle = {
  margin: 0,
  whiteSpace: 'pre-wrap',
  lineHeight: 1.5,
  color: '#e2e8f0',
  fontFamily: 'inherit',
};

const jsonStyle = {
  margin: 0,
  maxHeight: '320px',
  overflow: 'auto',
  background: '#020617',
  padding: '12px',
  borderRadius: '8px',
  fontSize: '12px',
};

const infoLineStyle = {
  marginBottom: '8px',
};

const infoMutedStyle = {
  color: '#94a3b8',
  marginBottom: '6px',
};

const metricValueStyle = {
  fontSize: '20px',
};

const scoreListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const scoreRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '8px 10px',
  background: '#020617',
  borderRadius: '8px',
};