import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import { getAssignments } from '../shared/assignments';

function computeWeightedObjective(nodes, assignments) {
  return nodes.reduce((sum, node) => {
    const assignment = assignments[node.id];
    if (!assignment) return sum;
    return sum + assignment.distance * node.weight;
  }, 0);
}

export function generatePMedianGreedySteps(graph, params = {}) {
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
        objective: Infinity,
        round: 0,
        p,
      },
      explanation:
        `Initializing greedy p-Median.\n` +
        `Goal: choose ${p} facilities to minimize weighted total distance.\n` +
        `Heuristic note: this is a greedy teaching algorithm, not an exact solver.`,
    })
  );

  for (let round = 1; round <= p; round++) {
    let bestCandidate = null;
    let bestObjective = Infinity;
    let bestAssignments = {};
    let currentScoreboard = [];

    const currentAssignments =
      selected.length > 0 ? getAssignments(nodes, selected, distMatrix) : {};

    const currentObjective =
      selected.length > 0
        ? computeWeightedObjective(nodes, currentAssignments)
        : Infinity;

    steps.push(
      createSnapshot({
        type: STEP_TYPES.ROUND_START,
        selected: [...selected],
        evaluating: null,
        assignments: currentAssignments,
        scoreboard: [],
        metrics: {
          objective: currentObjective,
          round,
          p,
        },
        explanation:
          `--- Round ${round} of ${p} ---\n` +
          `Scan every remaining node as a candidate facility.\n` +
          `For each candidate, compute:\n` +
          `sum( node weight × distance to nearest selected facility ).`,
      })
    );

    for (const candidateId of unselected) {
      const trialFacilities = [...selected, candidateId];
      const trialAssignments = getAssignments(nodes, trialFacilities, distMatrix);
      const trialObjective = computeWeightedObjective(nodes, trialAssignments);

      currentScoreboard.push({
        id: candidateId,
        score: trialObjective,
        isBest: false,
      });

      if (trialObjective < bestObjective) {
        bestObjective = trialObjective;
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
            objective: trialObjective,
            round,
            p,
          },
          explanation:
            `Evaluating node ${candidateId}.\n` +
            `If selected now, the weighted total distance becomes ${trialObjective.toFixed(0)}.`,
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
          objective: bestObjective,
          round,
          p,
        },
        explanation:
          `Round ${round} complete.\n` +
          `Best candidate: ${bestCandidate}.\n` +
          `Lowest weighted total distance found this round: ${bestObjective.toFixed(0)}.`,
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
          objective: bestObjective,
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
  const finalObjective = computeWeightedObjective(nodes, finalAssignments);

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      selected: [...selected],
      evaluating: null,
      assignments: finalAssignments,
      scoreboard: [],
      metrics: {
        objective: finalObjective,
        round: p,
        p,
      },
      explanation:
        `Greedy p-Median finished.\n` +
        `Final facilities: ${selected.join(', ')}.\n` +
        `Final weighted total distance: ${finalObjective.toFixed(0)}.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}