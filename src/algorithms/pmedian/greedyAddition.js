import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import {
  computeWeightedObjective,
  getAssignments,
} from '../shared/assignments';

function buildScoreboard(candidates, bestId) {
  return candidates
    .slice()
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return String(a.id).localeCompare(String(b.id));
    })
    .map((item) => ({
      id: item.id,
      score: item.score,
      isBest: item.id === bestId,
    }));
}

export function generatePMedianGreedySteps(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const p = Math.max(1, Math.min(params.p ?? 2, nodes.length));

  const steps = [];
  const selected = [];

  steps.push(
    createSnapshot({
      type: STEP_TYPES.INIT,
      phase: 'init',
      selected: [],
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
        `Greedy rule: at each round, add the facility that gives the best immediate objective value.`,
    })
  );

  for (let round = 1; round <= p; round++) {
    const candidates = [];

    steps.push(
      createSnapshot({
        type: STEP_TYPES.ROUND_START,
        phase: 'round_start',
        selected: [...selected],
        assignments: getAssignments(nodes, selected, distMatrix),
        scoreboard: [],
        metrics: {
          objective:
            selected.length > 0
              ? computeWeightedObjective(
                  nodes,
                  getAssignments(nodes, selected, distMatrix)
                )
              : Infinity,
          round,
          p,
        },
        explanation:
          `--- Round ${round} of ${p} ---\n` +
          `Try every unselected node as the next facility and compare the resulting objective.`,
      })
    );

    for (const node of nodes) {
      if (selected.includes(node.id)) continue;

      const trialFacilities = [...selected, node.id];
      const assignments = getAssignments(nodes, trialFacilities, distMatrix);
      const objective = computeWeightedObjective(nodes, assignments);

      candidates.push({
        id: node.id,
        score: objective,
        assignments,
      });

      const currentBest =
        candidates.length === 0
          ? null
          : candidates.reduce((best, item) => {
              if (!best) return item;
              if (item.score < best.score) return item;
              if (item.score === best.score) {
                return String(item.id).localeCompare(String(best.id)) < 0 ? item : best;
              }
              return best;
            }, null)?.id ?? null;

      steps.push(
        createSnapshot({
          type: STEP_TYPES.EVALUATE,
          phase: 'evaluate_candidate',
          selected: [...selected],
          evaluating: node.id,
          currentBest,
          assignments,
          scoreboard: buildScoreboard(candidates, currentBest),
          metrics: {
            objective,
            round,
            p,
          },
          explanation:
            `Evaluate candidate ${node.id}.\n` +
            `If selected next, the weighted total distance becomes ${objective.toFixed(0)}.`,
        })
      );
    }

    const bestCandidate = candidates.reduce((best, item) => {
      if (!best) return item;
      if (item.score < best.score) return item;
      if (item.score === best.score) {
        return String(item.id).localeCompare(String(best.id)) < 0 ? item : best;
      }
      return best;
    }, null);

    if (!bestCandidate) {
      steps.push(
        createSnapshot({
          type: STEP_TYPES.NO_PROGRESS,
          phase: 'no_progress',
          selected: [...selected],
          assignments: getAssignments(nodes, selected, distMatrix),
          scoreboard: [],
          metrics: {
            objective:
              selected.length > 0
                ? computeWeightedObjective(
                    nodes,
                    getAssignments(nodes, selected, distMatrix)
                  )
                : Infinity,
            round,
            p,
          },
          explanation: `No valid candidate remained. The algorithm stops early.`,
        })
      );
      break;
    }

    selected.push(bestCandidate.id);

    steps.push(
      createSnapshot({
        type: STEP_TYPES.SELECT,
        phase: 'select_candidate',
        selected: [...selected],
        currentBest: bestCandidate.id,
        assignments: bestCandidate.assignments,
        scoreboard: buildScoreboard(candidates, bestCandidate.id),
        metrics: {
          objective: bestCandidate.score,
          round,
          p,
        },
        explanation:
          `Select node ${bestCandidate.id} as the next facility.\n` +
          `Current facility set: { ${selected.join(', ')} }.\n` +
          `Current weighted total distance: ${bestCandidate.score.toFixed(0)}.`,
      })
    );
  }

  const finalAssignments = getAssignments(nodes, selected, distMatrix);
  const finalObjective = computeWeightedObjective(nodes, finalAssignments);

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      phase: 'finish',
      selected: [...selected],
      assignments: finalAssignments,
      scoreboard: [],
      metrics: {
        objective: finalObjective,
        round: selected.length,
        p,
      },
      explanation:
        `Greedy p-Median finished.\n` +
        `Final facilities: { ${selected.join(', ')} }.\n` +
        `Final weighted total distance: ${finalObjective.toFixed(0)}.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}