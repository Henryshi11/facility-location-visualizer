import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import {
  computeMaxAssignmentCost,
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

export function generatePCenterGreedySteps(graph, params = {}) {
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
        maxCost: Infinity,
        round: 0,
        p,
      },
      explanation:
        `Initializing greedy p-Center.\n` +
        `Goal: choose ${p} facilities to minimize the worst assignment cost.\n` +
        `Here cost means weight × distance, so the objective is max_i w_i d(i,S).\n` +
        `Greedy rule: at each round, add the facility that gives the best immediate maximum cost.`,
    })
  );

  for (let round = 1; round <= p; round++) {
    const candidates = [];

    const currentAssignments = getAssignments(nodes, selected, distMatrix);
    const currentMaxCost =
      selected.length > 0
        ? computeMaxAssignmentCost(nodes, currentAssignments)
        : Infinity;

    steps.push(
      createSnapshot({
        type: STEP_TYPES.ROUND_START,
        phase: 'round_start',
        selected: [...selected],
        assignments: currentAssignments,
        scoreboard: [],
        metrics: {
          maxCost: currentMaxCost,
          round,
          p,
        },
        explanation:
          `--- Round ${round} of ${p} ---\n` +
          `Try every unselected node as the next facility and compare the resulting worst weighted cost.`,
      })
    );

    for (const node of nodes) {
      if (selected.includes(node.id)) continue;

      const trialFacilities = [...selected, node.id];
      const assignments = getAssignments(nodes, trialFacilities, distMatrix);
      const maxCost = computeMaxAssignmentCost(nodes, assignments);

      candidates.push({
        id: node.id,
        score: maxCost,
        assignments,
      });

      const currentBest =
        candidates.reduce((best, item) => {
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
            maxCost,
            round,
            p,
          },
          explanation:
            `Evaluate candidate ${node.id}.\n` +
            `If selected next, the maximum weighted assignment cost becomes ${maxCost.toFixed(0)}.`,
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
          assignments: currentAssignments,
          scoreboard: [],
          metrics: {
            maxCost: currentMaxCost,
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
          maxCost: bestCandidate.score,
          round,
          p,
        },
        explanation:
          `Select node ${bestCandidate.id} as the next facility.\n` +
          `Current facility set: { ${selected.join(', ')} }.\n` +
          `Current maximum weighted assignment cost: ${bestCandidate.score.toFixed(0)}.`,
      })
    );
  }

  const finalAssignments = getAssignments(nodes, selected, distMatrix);
  const finalMaxCost = computeMaxAssignmentCost(nodes, finalAssignments);

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      phase: 'finish',
      selected: [...selected],
      assignments: finalAssignments,
      metrics: {
        maxCost: finalMaxCost,
        round: selected.length,
        p,
      },
      explanation:
        `Greedy p-Center finished.\n` +
        `Final facilities: { ${selected.join(', ')} }.\n` +
        `Final maximum weighted assignment cost: ${finalMaxCost.toFixed(0)}.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}