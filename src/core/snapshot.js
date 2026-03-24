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
    metrics,

    overlays,
  };
}