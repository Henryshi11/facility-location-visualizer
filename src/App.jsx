import { useEffect, useMemo, useState } from 'react';

import { MODELS, MODEL_INFO } from './config/models';
import { ALGORITHMS, getImplementedAlgorithmOptions } from './config/algorithms';

import { EXAMPLE_GRAPHS } from './data/exampleGraphs';
import { generateRandomPathGraph } from './graph/generators/randomPath';
import { buildSnapshots } from './features/simulation/buildSnapshots';
import CanvasRenderer from './render/canvasRenderer.jsx';
import { getTheme } from './render/themes';

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

function SunIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth="1.8" />
      <path d="M12 2.5V5.2M12 18.8V21.5M21.5 12H18.8M5.2 12H2.5M18.7 5.3L16.8 7.2M7.2 16.8L5.3 18.7M18.7 18.7L16.8 16.8M7.2 7.2L5.3 5.3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18.5 14.8A8 8 0 0 1 9.2 5.5a8.5 8.5 0 1 0 9.3 9.3Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThemeToggle({ themeName, theme, onChange }) {
  const isNeo = themeName === 'neumorphism';

  return (
    <div style={themeToggleWrapStyle(theme)}>
      <button
        type="button"
        onClick={() => onChange('neumorphism')}
        aria-label="Switch to neumorphism theme"
        title="Neumorphism"
        style={themeIconButtonStyle(theme, isNeo)}
      >
        <SunIcon color={isNeo ? theme.titleColor : theme.mutedText} />
      </button>

      <button
        type="button"
        onClick={() => onChange('dark')}
        aria-label="Switch to dark theme"
        title="Dark"
        style={themeIconButtonStyle(theme, !isNeo)}
      >
        <MoonIcon color={!isNeo ? theme.titleColor : theme.mutedText} />
      </button>
    </div>
  );
}

export default function App() {
  const [themeName, setThemeName] = useState('dark');
  const theme = getTheme(themeName);

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

  useEffect(() => {
    document.body.style.background = theme.bodyBg;
    document.body.style.color = theme.bodyText;
    document.body.style.fontFamily =
      theme.name === 'neumorphism'
        ? 'Segoe UI, Inter, Arial, sans-serif'
        : 'Inter, Arial, sans-serif';
  }, [theme]);

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
    <div style={pageStyle(theme)}>
      <div style={shellStyle}>
        <div style={headerRowStyle}>
          <div style={headerStyle}>
            <h1 style={titleStyle(theme)}>Facility Location Visualizer</h1>
            <p style={subtitleStyle(theme)}>
              Course-focused visualization for p-median, p-center, covering, and p-center
              parametric search on path graphs.
            </p>
          </div>

          <ThemeToggle
            themeName={themeName}
            theme={theme}
            onChange={setThemeName}
          />
        </div>

        <div style={controlsPanelStyle(theme)}>
          <div style={controlsGridStyle}>
            <div style={controlItemStyle}>
              <div style={labelStyle(theme)}>Model</div>
              <select
                value={model}
                onChange={(event) => setModel(event.target.value)}
                style={inputStyle(theme)}
              >
                <option value={MODELS.PMEDIAN}>p-Median</option>
                <option value={MODELS.PCENTER}>p-Center</option>
                <option value={MODELS.SETCOVER}>Covering</option>
              </select>
            </div>

            <div style={controlItemStyle}>
              <div style={labelStyle(theme)}>Algorithm</div>
              <select
                value={algorithm}
                onChange={(event) => setAlgorithm(event.target.value)}
                style={inputStyle(theme)}
              >
                {currentAlgorithmOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {getAlgorithmLabel(option.id, currentAlgorithmOptions)}
                  </option>
                ))}
              </select>
            </div>

            <div style={controlItemStyle}>
              <div style={labelStyle(theme)}>Graph</div>
              <select
                value={graphSelectorValue}
                onChange={handleGraphChange}
                style={inputStyle(theme)}
              >
                {EXAMPLE_GRAPHS.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
                <option value={RANDOM_GRAPH_OPTION}>Random Path</option>
              </select>
            </div>

            <div style={controlItemStyle}>
              <div style={labelStyle(theme)}>Random</div>
              <button onClick={handleGenerateRandomPath} style={buttonStyle(theme)}>
                Generate Random Path
              </button>
            </div>

            <div style={controlItemStyle}>
              <div style={labelStyle(theme)}>p</div>
              <input
                type="number"
                min={1}
                max={graph?.nodes?.length ?? 1}
                value={p}
                onChange={(event) => setP(Math.max(1, Number(event.target.value) || 1))}
                style={inputStyle(theme)}
              />
            </div>

            <div style={controlItemStyle}>
              <div style={labelStyle(theme)}>λ</div>
              <input
                type="number"
                min={0}
                value={lambdaValue}
                disabled={!showLambda}
                onChange={(event) =>
                  setLambdaValue(Math.max(0, Number(event.target.value) || 0))
                }
                style={{
                  ...inputStyle(theme),
                  opacity: showLambda ? 1 : 0.55,
                  cursor: showLambda ? 'text' : 'not-allowed',
                }}
              />
            </div>

            <div style={controlItemStyle}>
              <div style={labelStyle(theme)}>Speed (ms)</div>
              <input
                type="number"
                min={100}
                step={100}
                value={playbackSpeed}
                onChange={(event) =>
                  setPlaybackSpeed(Math.max(100, Number(event.target.value) || 700))
                }
                style={inputStyle(theme)}
              />
            </div>
          </div>
        </div>

        <div style={mainGridStyle}>
          <div style={leftColumnStyle}>
            <div style={panelStyle(theme, true)}>
              <div style={sectionTitleStyle(theme)}>Visualization</div>
              <CanvasRenderer
                graph={graph}
                snapshot={currentSnapshot}
                themeName={themeName}
                themeTokens={theme}
              />
            </div>

            <div style={panelStyle(theme)}>
              <div style={sectionTitleStyle(theme)}>Playback</div>
              <div style={buttonRowStyle}>
                <button onClick={handlePrev} style={buttonStyle(theme)}>
                  Prev
                </button>
                <button
                  onClick={() => setIsPlaying((prev) => !prev)}
                  style={buttonStyle(theme)}
                  disabled={snapshots.length === 0}
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button onClick={handleNext} style={buttonStyle(theme)}>
                  Next
                </button>
                <button onClick={handleReset} style={buttonStyle(theme)}>
                  Reset
                </button>
              </div>

              <div style={metaRowStyle(theme)}>
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
            <div style={panelStyle(theme)}>
              <div style={sectionTitleStyle(theme)}>Model Summary</div>
              <div style={infoLineStyle}>
                <strong>{modelInfo?.name ?? '-'}</strong>
              </div>
              <div style={infoMutedStyle(theme)}>{modelInfo?.description ?? '-'}</div>
              <div style={infoLineStyle}>
                <strong>Graph:</strong> {graph?.name ?? '-'}
              </div>
              <div style={infoLineStyle}>
                <strong>Algorithm:</strong>{' '}
                {getAlgorithmLabel(algorithm, currentAlgorithmOptions)}
              </div>
            </div>

            <div style={panelStyle(theme, true)}>
              <div style={sectionTitleStyle(theme)}>Current Metric</div>
              {primaryMetric ? (
                <>
                  <div style={infoMutedStyle(theme)}>{primaryMetric.label}</div>
                  <div style={metricValueStyle(theme)}>
                    {formatMetricValue(primaryMetric.value)}
                  </div>
                </>
              ) : (
                <div style={infoMutedStyle(theme)}>-</div>
              )}
            </div>

            <div style={panelStyle(theme)}>
              <div style={sectionTitleStyle(theme)}>Explanation</div>
              <p style={explanationStyle(theme)}>
                {currentSnapshot?.explanation ?? 'No explanation available.'}
              </p>
            </div>

            <div style={panelStyle(theme)}>
              <div style={sectionTitleStyle(theme)}>Scoreboard Preview</div>
              {scorePreview.length === 0 ? (
                <div style={infoMutedStyle(theme)}>No scoreboard for this step.</div>
              ) : (
                <div style={scoreListStyle}>
                  {scorePreview.map((item) => (
                    <div key={item.id} style={scoreRowStyle(theme, item.isBest)}>
                      <span>{item.id}</span>
                      <span>{formatMetricValue(item.score)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={panelStyle(theme)}>
              <div style={sectionTitleStyle(theme)}>Snapshot JSON</div>
              <pre style={jsonStyle(theme)}>
                {JSON.stringify(currentSnapshot ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const pageStyle = (theme) => ({
  minHeight: '100vh',
  background: theme.pageBg,
  color: theme.bodyText,
  padding: '20px 24px 28px',
});

const shellStyle = {
  maxWidth: '1680px',
  margin: '0 auto',
};

const headerRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '16px',
  marginBottom: '18px',
};

const headerStyle = {
  flex: 1,
};

const titleStyle = (theme) => ({
  margin: 0,
  fontSize: '32px',
  fontWeight: 800,
  letterSpacing: '-0.02em',
  color: theme.titleColor,
});

const subtitleStyle = (theme) => ({
  marginTop: '10px',
  marginBottom: 0,
  fontSize: '15px',
  color: theme.subtitleColor,
});

const themeToggleWrapStyle = (theme) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px',
  borderRadius: theme.radius?.panel ?? '18px',
  background: theme.panelBg,
  border: theme.panelBorder,
  boxShadow: theme.panelShadow,
});

const themeIconButtonStyle = (theme, active) => ({
  width: '42px',
  height: '42px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '999px',
  cursor: 'pointer',
  border: theme.buttonBorder,
  background: theme.buttonBg,
  boxShadow:
    theme.name === 'neumorphism'
      ? active
        ? theme.buttonPressed || theme.inputShadow
        : theme.buttonShadow
      : active
        ? '0 0 0 1px rgba(255,255,255,0.1) inset, 0 0 0 2px rgba(96,165,250,0.35)'
        : theme.buttonShadow,
  color: active ? theme.titleColor : theme.mutedText,
});

const controlsPanelStyle = (theme) => ({
  background: theme.panelBg,
  border: theme.panelBorder,
  borderRadius: theme.radius?.panel ?? '18px',
  boxShadow: theme.panelShadow,
  padding: '14px 16px',
  marginBottom: '16px',
});

const controlsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: '16px',
  alignItems: 'end',
};

const controlItemStyle = {
  minWidth: 0,
};

const mainGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1.6fr 0.95fr',
  gap: '18px',
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

const panelStyle = (theme, strong = false) => ({
  background:
    theme.name === 'neumorphism' && strong
      ? '#DDE3EA'
      : theme.panelBg,
  border: theme.panelBorder,
  borderRadius: theme.radius?.panel ?? '18px',
  padding: '16px',
  boxShadow:
    strong && theme.name === 'neumorphism'
      ? `
        14px 14px 30px rgba(163,177,198,0.48),
        -14px -14px 30px rgba(255,255,255,0.9)
      `
      : strong && theme.name !== 'neumorphism'
        ? '0 10px 28px rgba(0,0,0,0.24)'
        : theme.panelShadow,
});

const sectionTitleStyle = (theme) => ({
  fontWeight: 800,
  fontSize: '18px',
  marginBottom: '12px',
  color: theme.titleColor,
});

const labelStyle = (theme) => ({
  fontSize: '12px',
  fontWeight: 600,
  color: theme.mutedText,
  marginBottom: '8px',
});

const inputStyle = (theme) => ({
  width: '100%',
  background: theme.inputBg,
  color: theme.inputText,
  border: theme.inputBorder,
  borderRadius: theme.radius?.input ?? '12px',
  padding: '11px 12px',
  boxShadow: theme.inputShadow,
  outline: 'none',
});

const buttonStyle = (theme) => ({
  width: '100%',
  background: theme.buttonBg,
  color: theme.buttonText,
  border: theme.buttonBorder,
  borderRadius: theme.radius?.button ?? '14px',
  padding: '11px 14px',
  cursor: 'pointer',
  boxShadow: theme.buttonShadow,
  fontWeight: 600,
});

const buttonRowStyle = {
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
};

const metaRowStyle = (theme) => ({
  display: 'flex',
  gap: '16px',
  marginTop: '14px',
  flexWrap: 'wrap',
  color: theme.softText,
});

const explanationStyle = (theme) => ({
  margin: 0,
  whiteSpace: 'pre-wrap',
  lineHeight: 1.65,
  color: theme.bodyText,
  fontFamily: 'inherit',
  fontSize: '15px',
});

const jsonStyle = (theme) => ({
  margin: 0,
  maxHeight: '320px',
  overflow: 'auto',
  background: theme.codeBg,
  padding: '12px',
  borderRadius: theme.radius?.code ?? '16px',
  fontSize: '12px',
  color: theme.bodyText,
  boxShadow:
    theme.name === 'neumorphism'
      ? 'inset 4px 4px 10px rgba(163,177,198,0.25), inset -4px -4px 10px rgba(255,255,255,0.7)'
      : 'none',
});

const infoLineStyle = {
  marginBottom: '10px',
  lineHeight: 1.5,
};

const infoMutedStyle = (theme) => ({
  color: theme.mutedText,
  marginBottom: '8px',
  lineHeight: 1.55,
});

const metricValueStyle = (theme) => ({
  fontSize: '40px',
  fontWeight: 800,
  lineHeight: 1.1,
  color: theme.titleColor,
  letterSpacing: '-0.03em',
  marginTop: '4px',
});

const scoreListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const scoreRowStyle = (theme, isBest = false) => ({
  display: 'flex',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '9px 11px',
  background: theme.scoreRowBg,
  borderRadius: theme.radius?.input ?? '14px',
  boxShadow:
    theme.name === 'neumorphism'
      ? '6px 6px 14px rgba(163,177,198,0.18), -6px -6px 14px rgba(255,255,255,0.56)'
      : 'none',
  border: isBest
    ? theme.name === 'neumorphism'
      ? '1px solid rgba(117,133,171,0.42)'
      : '1px solid #3b82f6'
    : 'none',
});