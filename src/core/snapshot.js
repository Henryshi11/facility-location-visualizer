export function createSnapshot({
  type,
  explanation = '',
  selected = [],
  evaluating = null,
  assignments = {},
  covered = [],
  evalCovered = [],
  scoreboard = [],
  metrics = {},
}) {
  return {
    type,
    explanation,
    selected,
    evaluating,
    assignments,
    covered,
    evalCovered,
    scoreboard,
    metrics,
  };
}