import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import {
  computeMaxAssignmentCost,
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

export function generatePCenterExactBruteforceSteps(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const p = Math.max(1, Math.min(params.p ?? 2, nodes.length));
  const nodeIds = nodes.map((node) => node.id);
  const combos = combinations(nodeIds, p);

  const steps = [];
  const scoreboardEntries = [];

  let bestCombo = null;
  let bestAssignments = {};
  let bestMaxCost = Infinity;

  steps.push(
    createSnapshot({
      type: STEP_TYPES.INIT,
      phase: 'init',
      selected: [],
      assignments: {},
      scoreboard: [],
      metrics: {
        maxCost: Infinity,
        checked: 0,
        totalCombos: combos.length,
        p,
      },
      explanation:
        `Initializing exact brute-force p-Center.\n` +
        `Goal: choose ${p} facilities to minimize the maximum weighted assignment cost max_i w_i d(i,S).\n` +
        `This method checks every possible size-${p} facility set, so it is only suitable for small graphs.`,
    })
  );

  combos.forEach((combo, index) => {
    const assignments = getAssignments(nodes, combo, distMatrix);
    const maxCost = computeMaxAssignmentCost(nodes, assignments);
    const label = comboLabel(combo);

    scoreboardEntries.push({
      id: label,
      score: maxCost,
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
          maxCost,
          checked: index + 1,
          totalCombos: combos.length,
          p,
        },
        explanation:
          `Evaluating facility set { ${label} }.\n` +
          `Maximum weighted assignment cost = ${maxCost.toFixed(0)}.\n` +
          `Checked ${index + 1} of ${combos.length} candidate sets.`,
      })
    );

    if (maxCost < bestMaxCost) {
      bestMaxCost = maxCost;
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
            maxCost: bestMaxCost,
            checked: index + 1,
            totalCombos: combos.length,
            p,
          },
          explanation:
            `New best solution found: { ${comboLabel(bestCombo)} }.\n` +
            `Best maximum weighted assignment cost is now ${bestMaxCost.toFixed(0)}.`,
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
        maxCost: bestMaxCost,
        checked: combos.length,
        totalCombos: combos.length,
        p,
      },
      explanation:
        bestCombo
          ? `Exact brute-force p-Center finished.\nFinal optimal facilities: { ${comboLabel(bestCombo)} }.\nOptimal maximum weighted assignment cost: ${bestMaxCost.toFixed(0)}.`
          : `Exact brute-force p-Center finished, but no valid solution was found.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}