import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import {
  computeTotalAssignmentCost,
  getAssignments,
} from '../shared/assignments';

function combinations(array, k) {
  const result = [];

  function backtrack(start, current) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < array.length; i++) {
      current.push(array[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}

function comboLabel(combo) {
  return combo.join(', ');
}

function buildScoreboard(entries, bestKey) {
  return entries
    .slice()
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.id.localeCompare(b.id);
    })
    .map((item) => ({
      id: item.id,
      score: item.score,
      isBest: item.id === bestKey,
    }));
}

export function generatePMedianExactBruteforceSteps(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const p = Math.max(1, Math.min(params.p ?? 2, nodes.length));
  const nodeIds = nodes.map((node) => node.id);
  const combos = combinations(nodeIds, p);

  const steps = [];
  const scoreboardEntries = [];

  let bestCombo = null;
  let bestAssignments = {};
  let bestCost = Infinity;

  steps.push(
    createSnapshot({
      type: STEP_TYPES.INIT,
      phase: 'init',
      selected: [],
      assignments: {},
      scoreboard: [],
      metrics: {
        totalCost: Infinity,
        checked: 0,
        totalCombos: combos.length,
        p,
      },
      explanation:
        `Initializing exact brute-force p-Median.\n` +
        `Goal: choose ${p} facilities to minimize total assignment cost Σ w_i d(i,S).\n` +
        `This method checks every possible size-${p} facility set, so it is only suitable for small graphs.`,
    })
  );

  combos.forEach((combo, index) => {
    const assignments = getAssignments(nodes, combo, distMatrix);
    const totalCost = computeTotalAssignmentCost(nodes, assignments);
    const label = comboLabel(combo);

    scoreboardEntries.push({
      id: label,
      score: totalCost,
    });

    steps.push(
      createSnapshot({
        type: STEP_TYPES.EVALUATE,
        phase: 'evaluate_combo',
        selected: [...combo],
        evaluating: combo[combo.length - 1] ?? null,
        assignments,
        scoreboard: buildScoreboard(
          scoreboardEntries,
          bestCombo ? comboLabel(bestCombo) : null
        ),
        metrics: {
          totalCost,
          checked: index + 1,
          totalCombos: combos.length,
          p,
        },
        explanation:
          `Evaluating facility set { ${label} }.\n` +
          `Total assignment cost = ${totalCost.toFixed(0)}.\n` +
          `Checked ${index + 1} of ${combos.length} candidate sets.`,
      })
    );

    if (totalCost < bestCost) {
      bestCost = totalCost;
      bestCombo = [...combo];
      bestAssignments = assignments;

      steps.push(
        createSnapshot({
          type: STEP_TYPES.UPDATE_BEST,
          phase: 'update_best',
          selected: [...bestCombo],
          currentBest: bestCombo[0] ?? null,
          assignments: bestAssignments,
          scoreboard: buildScoreboard(scoreboardEntries, comboLabel(bestCombo)),
          metrics: {
            totalCost: bestCost,
            checked: index + 1,
            totalCombos: combos.length,
            p,
          },
          explanation:
            `New best solution found: { ${comboLabel(bestCombo)} }.\n` +
            `Best total assignment cost is now ${bestCost.toFixed(0)}.`,
        })
      );
    }
  });

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      phase: 'finish',
      selected: bestCombo ?? [],
      assignments: bestAssignments,
      scoreboard: buildScoreboard(
        scoreboardEntries,
        bestCombo ? comboLabel(bestCombo) : null
      ),
      metrics: {
        totalCost: bestCost,
        checked: combos.length,
        totalCombos: combos.length,
        p,
      },
      explanation:
        bestCombo
          ? `Exact brute-force p-Median finished.\nFinal optimal facilities: { ${comboLabel(bestCombo)} }.\nOptimal total assignment cost: ${bestCost.toFixed(0)}.`
          : `Exact brute-force p-Median finished, but no valid solution was found.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}