export function createSnapshot({
  type,
  explanation = '',
  phase = '',

  selected = [],
  evaluating = null,
  currentBest = null,

  assignments = {},

  covered = [],
  evalCovered = [],

  feasible = null,
  radiusHighlight = null,
  pruned = [],

  scoreboard = [],
  metrics = {},

  overlays = {},
}) {
  return {
    type,
    phase,
    explanation,

    selected,
    evaluating,
    currentBest,

    assignments,

    covered,
    evalCovered,

    feasible,
    radiusHighlight,
    pruned,

    scoreboard,
    metrics: {
      iteration: null,
      round: null,
      p: null,
      lambdaValue: null,
      totalCost: null,
      maxCost: null,
      optimalLambda: null,
      facilityCount: null,
      coveredCount: null,
      total: null,
      checked: null,
      totalCombos: null,
      candidateCount: null,
      candidateIndex: null,

      low: null,
      mid: null,
      high: null,
      decision: null,
      usedFacilities: null,

      ...metrics,
    },

    overlays: {
      mode: null,
      totalLength: null,
      intervals: [],
      facilityPositions: [],
      activeIntervalId: null,
      chosenFacilityId: null,
      candidateValues: [],
      ...overlays,
    },
  };
}