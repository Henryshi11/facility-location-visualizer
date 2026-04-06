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
      return 'λ-Feasibility Test (Greedy)';
    case ALGORITHMS.PARAMETRIC_SEARCH:
      return 'Parametric Search (Binary Search)';
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

function shouldShowP(model) {
  return model === MODELS.PMEDIAN || model === MODELS.PCENTER;
}

function SunIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth="1.8" />
      <path
        d="M12 2.5V5.2M12 18.8V21.5M21.5 12H18.8M5.2 12H2.5M18.72 5.28L16.8 7.2M7.2 16.8L5.28 18.72M18.72 18.72L16.8 16.8M7.2 7.2L5.28 5.28"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  const [themeName, setThemeName] = useState('dark');

  const [model, setModel] = useState(MODELS.PCENTER);
  const algorithmOptions = useMemo(
    () => getImplementedAlgorithmOptions(model),
    [model]
  );

  const [algorithm, setAlgorithm] = useState(
    algorithmOptions[0]?.id ?? ALGORITHMS.EXACT_BRUTEFORCE
  );

  const [graphKey, setGraphKey] = useState(EXAMPLE_GRAPHS[0]?.name ?? '');
  const [customGraph, setCustomGraph] = useState(null);

  const [p, setP] = useState(2);
  const [lambdaValue, setLambdaValue] = useState(8);

  const [snapshots, setSnapshots] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const nextOptions = getImplementedAlgorithmOptions(model);
    if (!nextOptions.some((item) => item.id === algorithm)) {
      setAlgorithm(nextOptions[0]?.id ?? ALGORITHMS.EXACT_BRUTEFORCE);
    }
  }, [model, algorithm]);

  const theme = useMemo(() => getTheme(themeName), [themeName]);

  const selectedGraph = useMemo(() => {
    if (graphKey === RANDOM_GRAPH_OPTION && customGraph) {
      return customGraph;
    }

    return EXAMPLE_GRAPHS.find((graph) => graph.name === graphKey) ?? EXAMPLE_GRAPHS[0];
  }, [graphKey, customGraph]);

  const currentSnapshot = snapshots[stepIndex] ?? null;
  const primaryMetric = getPrimaryMetric(currentSnapshot, model);

  function rebuildSnapshots(nextGraph = selectedGraph) {
    const built = buildSnapshots({
      model,
      algorithm,
      graph: nextGraph,
      params: {
        p,
        lambdaValue,
      },
    });

    setSnapshots(built);
    setStepIndex(0);
  }

  useEffect(() => {
    rebuildSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, algorithm, graphKey, customGraph, p, lambdaValue]);

  function handleRandomGraph() {
    const graph = generateRandomPathGraph();
    setCustomGraph(graph);
    setGraphKey(RANDOM_GRAPH_OPTION);
  }

  const pageStyle = {
    minHeight: '100vh',
    background: theme.pageBg,
    color: theme.bodyText,
    fontFamily: 'Inter, Arial, sans-serif',
  };

  const wrapperStyle = {
    maxWidth: '1500px',
    margin: '0 auto',
    padding: '28px 20px 44px',
  };

  const headerStyle = {
    marginBottom: '18px',
  };

  const titleStyle = {
    fontSize: '32px',
    fontWeight: 800,
    lineHeight: 1.1,
    color: theme.titleColor,
    marginBottom: '8px',
    letterSpacing: '-0.03em',
  };

  const subtitleStyle = {
    fontSize: '15px',
    color: theme.subtitleColor,
    maxWidth: '820px',
    lineHeight: 1.6,
  };

  const topBarStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '22px',
  };

  const themeButtonStyle = (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: theme.radius?.button ?? '14px',
    border: theme.buttonBorder,
    background: active ? theme.buttonBg : theme.panelBg,
    color: theme.buttonText,
    boxShadow: theme.buttonShadow,
    cursor: 'pointer',
  });

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: '360px minmax(0, 1fr) 340px',
    gap: '18px',
    alignItems: 'start',
  };

  const panelStyle = {
    background: theme.panelBg,
    border: theme.panelBorder,
    boxShadow: theme.panelShadow,
    borderRadius: theme.radius?.panel ?? '18px',
    padding: '18px',
  };

  const sectionTitleStyle = {
    fontSize: '15px',
    fontWeight: 700,
    color: theme.titleColor,
    marginBottom: '12px',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    color: theme.mutedText,
  };

  const controlGroupStyle = {
    marginBottom: '14px',
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 12px',
    borderRadius: theme.radius?.input ?? '12px',
    border: theme.inputBorder,
    background: theme.inputBg,
    color: theme.inputText,
    boxShadow: theme.inputShadow,
  };

  const buttonRowStyle = {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  };

  const actionButtonStyle = {
    padding: '11px 14px',
    borderRadius: theme.radius?.button ?? '14px',
    border: theme.buttonBorder,
    background: theme.buttonBg,
    color: theme.buttonText,
    boxShadow: theme.buttonShadow,
    cursor: 'pointer',
  };

  const neutralButtonStyle = {
    ...actionButtonStyle,
    background: theme.panelBg,
    color: theme.bodyText,
  };

  const metricCardStyle = {
    ...panelStyle,
    padding: '20px',
  };

  const metricLabelStyle = {
    color: theme.mutedText,
    fontSize: '13px',
    marginBottom: '6px',
  };

  const metricValueStyle = {
    fontSize: '40px',
    fontWeight: 800,
    lineHeight: 1.1,
    color: theme.titleColor,
    marginBottom: '12px',
    letterSpacing: '-0.03em',
  };

  const infoLineStyle = {
    marginBottom: '9px',
    lineHeight: 1.55,
    fontSize: '14px',
  };

  const mutedBlockStyle = {
    color: theme.mutedText,
    fontSize: '14px',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
  };

  const navRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '14px',
    flexWrap: 'wrap',
  };

  const scoreListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '10px',
  };

  const scoreRowStyle = (isBest = false) => ({
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

  function renderExtraMetrics() {
    if (!currentSnapshot) return null;

    const m = currentSnapshot.metrics ?? {};

    return (
      <div style={{ marginTop: '14px' }}>
        <div style={sectionTitleStyle}>Step Details</div>

        {m.low != null || m.mid != null || m.high != null ? (
          <>
            <div style={infoLineStyle}>low: {formatMetricValue(m.low)}</div>
            <div style={infoLineStyle}>mid: {formatMetricValue(m.mid)}</div>
            <div style={infoLineStyle}>high: {formatMetricValue(m.high)}</div>
          </>
        ) : null}

        {m.usedFacilities != null ? (
          <div style={infoLineStyle}>
            facilities used: {formatMetricValue(m.usedFacilities)}
          </div>
        ) : null}

        {m.coveredCount != null && m.total != null ? (
          <div style={infoLineStyle}>
            covered: {formatMetricValue(m.coveredCount)} / {formatMetricValue(m.total)}
          </div>
        ) : null}

        {m.decision ? (
          <div style={infoLineStyle}>decision: {String(m.decision)}</div>
        ) : null}

        {m.feasible != null ? (
          <div style={infoLineStyle}>
            feasible: {m.feasible ? 'true' : 'false'}
          </div>
        ) : null}

        {m.checked != null ? (
          <div style={infoLineStyle}>step count: {formatMetricValue(m.checked)}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={wrapperStyle}>
        <div style={topBarStyle}>
          <div style={headerStyle}>
            <div style={titleStyle}>Facility Location Visualizer</div>
            <div style={subtitleStyle}>
              Interactive visualization for p-Median, p-Center, and Cost Covering.
              Focused on exact baselines, greedy feasibility, and binary-search-style
              parametric search on path graphs.
            </div>
          </div>

          <div style={buttonRowStyle}>
            <button
              type="button"
              style={themeButtonStyle(themeName === 'dark')}
              onClick={() => setThemeName('dark')}
            >
              <MoonIcon color={themeName === 'dark' ? '#ffffff' : theme.bodyText} />
              Dark
            </button>
            <button
              type="button"
              style={themeButtonStyle(themeName === 'neumorphism')}
              onClick={() => setThemeName('neumorphism')}
            >
              <SunIcon color={themeName === 'neumorphism' ? '#ffffff' : theme.bodyText} />
              Neumorphism
            </button>
          </div>
        </div>

        <div style={gridStyle}>
          <div style={panelStyle}>
            <div style={sectionTitleStyle}>Controls</div>

            <div style={controlGroupStyle}>
              <label style={labelStyle}>Model</label>
              <select
                style={inputStyle}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {Object.values(MODELS).map((value) => (
                  <option key={value} value={value}>
                    {MODEL_INFO[value]?.name ?? value}
                  </option>
                ))}
              </select>
            </div>

            <div style={controlGroupStyle}>
              <label style={labelStyle}>Algorithm</label>
              <select
                style={inputStyle}
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
              >
                {algorithmOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {getAlgorithmLabel(option.id, algorithmOptions)}
                  </option>
                ))}
              </select>
            </div>

            <div style={controlGroupStyle}>
              <label style={labelStyle}>Graph</label>
              <select
                style={inputStyle}
                value={graphKey}
                onChange={(e) => setGraphKey(e.target.value)}
              >
                {EXAMPLE_GRAPHS.map((graph) => (
                  <option key={graph.name} value={graph.name}>
                    {graph.name}
                  </option>
                ))}
                {customGraph ? (
                  <option value={RANDOM_GRAPH_OPTION}>
                    {customGraph.name}
                  </option>
                ) : null}
              </select>
            </div>

            <div style={buttonRowStyle}>
              <button type="button" style={neutralButtonStyle} onClick={handleRandomGraph}>
                Generate Random Path
              </button>
              <button type="button" style={actionButtonStyle} onClick={() => rebuildSnapshots()}>
                Rebuild
              </button>
            </div>

            {shouldShowP(model) ? (
              <div style={{ ...controlGroupStyle, marginTop: '14px' }}>
                <label style={labelStyle}>p</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="1"
                  max="8"
                  value={p}
                  onChange={(e) => setP(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            ) : null}

            {shouldShowLambda(model, algorithm) ? (
              <div style={controlGroupStyle}>
                <label style={labelStyle}>λ</label>
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  step="1"
                  value={lambdaValue}
                  onChange={(e) => setLambdaValue(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            ) : null}

            <div style={{ marginTop: '18px' }}>
              <div style={sectionTitleStyle}>Model Summary</div>
              <div style={mutedBlockStyle}>
                {MODEL_INFO[model]?.description ?? 'No description available.'}
              </div>
            </div>
          </div>

          <div style={panelStyle}>
            <div style={{ marginBottom: '12px', ...sectionTitleStyle }}>
              Visualization
            </div>

            <CanvasRenderer
              graph={selectedGraph}
              snapshot={currentSnapshot}
              themeName={themeName}
              themeTokens={theme}
            />

            <div style={navRowStyle}>
              <button
                type="button"
                style={neutralButtonStyle}
                onClick={() => setStepIndex((v) => Math.max(0, v - 1))}
                disabled={stepIndex <= 0}
              >
                Previous
              </button>

              <button
                type="button"
                style={neutralButtonStyle}
                onClick={() =>
                  setStepIndex((v) => Math.min(Math.max(0, snapshots.length - 1), v + 1))
                }
                disabled={stepIndex >= snapshots.length - 1}
              >
                Next
              </button>

              <button
                type="button"
                style={neutralButtonStyle}
                onClick={() => setStepIndex(0)}
                disabled={!snapshots.length}
              >
                Reset
              </button>

              <div style={{ marginLeft: '4px', color: theme.mutedText, fontSize: '14px' }}>
                step {snapshots.length ? stepIndex + 1 : 0} / {snapshots.length}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={metricCardStyle}>
              <div style={metricLabelStyle}>
                {primaryMetric?.label ?? 'Metric'}
              </div>
              <div style={metricValueStyle}>
                {formatMetricValue(primaryMetric?.value)}
              </div>

              <div style={infoLineStyle}>
                <strong>model:</strong> {MODEL_INFO[model]?.name ?? model}
              </div>
              <div style={infoLineStyle}>
                <strong>algorithm:</strong> {getAlgorithmLabel(algorithm, algorithmOptions)}
              </div>
              <div style={infoLineStyle}>
                <strong>round:</strong> {getRoundLabel(currentSnapshot, model)}
              </div>

              {renderExtraMetrics()}
            </div>

            <div style={panelStyle}>
              <div style={sectionTitleStyle}>Explanation</div>
              <div style={mutedBlockStyle}>
                {currentSnapshot?.explanation ?? 'No snapshot available yet.'}
              </div>
            </div>

            <div style={panelStyle}>
              <div style={sectionTitleStyle}>Scoreboard</div>
              {currentSnapshot?.scoreboard?.length ? (
                <div style={scoreListStyle}>
                  {currentSnapshot.scoreboard.map((row) => (
                    <div key={row.id} style={scoreRowStyle(Boolean(row.isBest))}>
                      <span>{row.id}</span>
                      <span>{formatMetricValue(row.score)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={mutedBlockStyle}>
                  No scoreboard entries for this step.
                </div>
              )}
            </div>

            <div style={panelStyle}>
              <div style={sectionTitleStyle}>Binary Search Guide</div>
              <div style={mutedBlockStyle}>
                For p-Center parametric search:
                {'\n'}- infeasible λ → move right
                {'\n'}- feasible λ → record answer, move left
                {'\n'}This works because feasibility is monotone in λ.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}