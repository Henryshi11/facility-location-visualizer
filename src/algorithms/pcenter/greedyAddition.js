import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import { getAssignments } from '../shared/assignments';

function computeMaxDistance(nodes, assignments) {
  if (!assignments || Object.keys(assignments).length === 0) return Infinity;

  return nodes.reduce((maxValue, node) => {
    const assignment = assignments[node.id];
    if (!assignment) return maxValue;
    return Math.max(maxValue, assignment.distance);
  }, 0);
}

export function generatePCenterGreedySteps(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const p = Math.max(1, Math.min(params.p ?? 2, nodes.length));

  const steps = [];
  const selected = [];
  let unselected = nodes.map((n) => n.id);

  steps.push(
    createSnapshot({
      type: STEP_TYPES.INIT,
      selected: [],
      evaluating: null,
      assignments: {},
      scoreboard: [],
      metrics: {
        maxDistance: Infinity,
        round: 0,
        p,
      },
      explanation:
        `Initializing greedy p-Center.\n` +
        `Goal: choose ${p} facilities to minimize the maximum service distance.\n` +
        `Heuristic note: this is a greedy teaching algorithm, not an exact solver.`,
    })
  );

  for (let round = 1; round <= p; round++) {
    let bestCandidate = null;
    let bestMaxDistance = Infinity;
    let bestAssignments = {};
    let currentScoreboard = [];

    const currentAssignments =
      selected.length > 0 ? getAssignments(nodes, selected, distMatrix) : {};

    const currentMaxDistance =
      selected.length > 0
        ? computeMaxDistance(nodes, currentAssignments)
        : Infinity;

    steps.push(
      createSnapshot({
        type: STEP_TYPES.ROUND_START,
        selected: [...selected],
        evaluating: null,
        assignments: currentAssignments,
        scoreboard: [],
        metrics: {
          maxDistance: currentMaxDistance,
          round,
          p,
        },
        explanation:
          `--- Round ${round} of ${p} ---\n` +
          `Scan every remaining node as a candidate facility.\n` +
          `For each candidate, compute the worst-case distance from any node to its nearest facility.`,
      })
    );

    for (const candidateId of unselected) {
      const trialFacilities = [...selected, candidateId];
      const trialAssignments = getAssignments(nodes, trialFacilities, distMatrix);
      const trialMaxDistance = computeMaxDistance(nodes, trialAssignments);

      currentScoreboard.push({
        id: candidateId,
        score: trialMaxDistance,
        isBest: false,
      });

      if (trialMaxDistance < bestMaxDistance) {
        bestMaxDistance = trialMaxDistance;
        bestCandidate = candidateId;
        bestAssignments = trialAssignments;
      }

      currentScoreboard = currentScoreboard.map((item) => ({
        ...item,
        isBest: item.id === bestCandidate,
      }));

      steps.push(
        createSnapshot({
          type: STEP_TYPES.EVALUATE,
          selected: [...selected],
          evaluating: candidateId,
          assignments: trialAssignments,
          scoreboard: [...currentScoreboard],
          metrics: {
            maxDistance: trialMaxDistance,
            round,
            p,
          },
          explanation:
            `Evaluating node ${candidateId}.\n` +
            `If selected now, the worst-case distance becomes ${trialMaxDistance.toFixed(0)}.`,
        })
      );
    }

    steps.push(
      createSnapshot({
        type: STEP_TYPES.ROUND_SUMMARY,
        selected: [...selected],
        evaluating: bestCandidate,
        assignments: bestAssignments,
        scoreboard: [...currentScoreboard],
        metrics: {
          maxDistance: bestMaxDistance,
          round,
          p,
        },
        explanation:
          `Round ${round} complete.\n` +
          `Best candidate: ${bestCandidate}.\n` +
          `Lowest worst-case distance found this round: ${bestMaxDistance.toFixed(0)}.`,
      })
    );

    selected.push(bestCandidate);
    unselected = unselected.filter((id) => id !== bestCandidate);

    steps.push(
      createSnapshot({
        type: STEP_TYPES.SELECT,
        selected: [...selected],
        evaluating: null,
        assignments: bestAssignments,
        scoreboard: [...currentScoreboard],
        metrics: {
          maxDistance: bestMaxDistance,
          round,
          p,
        },
        explanation:
          `Lock in node ${bestCandidate} as a facility.\n` +
          `Selected facilities so far: ${selected.join(', ')}.`,
      })
    );
  }

  const finalAssignments = getAssignments(nodes, selected, distMatrix);
  const finalMaxDistance = computeMaxDistance(nodes, finalAssignments);

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      selected: [...selected],
      evaluating: null,
      assignments: finalAssignments,
      scoreboard: [],
      metrics: {
        maxDistance: finalMaxDistance,
        round: p,
        p,
      },
      explanation:
        `Greedy p-Center finished.\n` +
        `Final facilities: ${selected.join(', ')}.\n` +
        `Final worst-case distance: ${finalMaxDistance.toFixed(0)}.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}