import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import {
  computeCostCoveredNodes,
  computeMaxAssignmentCost,
  getAssignments,
  isCostCoverFeasible,
} from '../shared/assignments';

function combinationsUpTo(array, maxSize) {
  const result = [];

  function backtrack(start, current, targetSize) {
    if (current.length === targetSize) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < array.length; i++) {
      current.push(array[i]);
      backtrack(i + 1, current, targetSize);
      current.pop();
    }
  }

  for (let size = 1; size <= maxSize; size++) {
    backtrack(0, [], size);
  }

  return result;
}

function comboLabel(combo) {
  return combo.join(', ');
}

function buildScoreboard(entries, bestKey) {
  return entries
    .slice()
    .sort((a, b) => {
      if (a.feasible !== b.feasible) return a.feasible ? -1 : 1;
      if (a.feasible && b.feasible && a.size !== b.size) return a.size - b.size;
      if (a.feasible && b.feasible && a.maxCost !== b.maxCost) return a.maxCost - b.maxCost;
      return a.id.localeCompare(b.id);
    })
    .map((item) => ({
      id: item.id,
      score: item.feasible ? item.size : item.coveredCount,
      isBest: item.id === bestKey,
    }));
}

export function generateSetCoverExactBruteforceSteps(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const lambdaValue = Math.max(0, params.lambdaValue ?? 30);

  const nodeIds = nodes.map((node) => node.id);
  const combos = combinationsUpTo(nodeIds, nodeIds.length);

  const steps = [];
  const scoreboardEntries = [];

  let bestCombo = null;
  let bestCovered = [];
  let bestAssignments = {};
  let bestMaxCost = Infinity;

  steps.push(
    createSnapshot({
      type: STEP_TYPES.INIT,
      phase: 'init',
      selected: [],
      covered: [],
      assignments: {},
      scoreboard: [],
      metrics: {
        lambdaValue,
        facilityCount: 0,
        coveredCount: 0,
        total: nodes.length,
        checked: 0,
        maxCost: Infinity,
      },
      explanation:
        `Initializing exact brute-force cost covering.\n` +
        `Goal: find the minimum number of facilities such that every node satisfies w_i d(i,S) ≤ λ.\n` +
        `Here λ = ${lambdaValue}.\n` +
        `This method checks every subset, so it is only suitable for small graphs.`,
    })
  );

  for (let index = 0; index < combos.length; index++) {
    const combo = combos[index];
    const assignments = getAssignments(nodes, combo, distMatrix);
    const covered = computeCostCoveredNodes(nodes, assignments, lambdaValue);
    const feasible = isCostCoverFeasible(nodes, assignments, lambdaValue);
    const maxCost = computeMaxAssignmentCost(nodes, assignments);
    const label = comboLabel(combo);

    scoreboardEntries.push({
      id: label,
      size: combo.length,
      coveredCount: covered.length,
      feasible,
      maxCost,
    });

    steps.push(
      createSnapshot({
        type: STEP_TYPES.EVALUATE,
        phase: 'evaluate_combo',
        selected: [...combo],
        covered,
        assignments,
        scoreboard: buildScoreboard(
          scoreboardEntries,
          bestCombo ? comboLabel(bestCombo) : null
        ),
        metrics: {
          lambdaValue,
          facilityCount: combo.length,
          coveredCount: covered.length,
          total: nodes.length,
          checked: index + 1,
          maxCost,
          feasible,
        },
        explanation:
          `Evaluate facility set { ${label} }.\n` +
          `Covered nodes under cost threshold: ${covered.length}/${nodes.length}.\n` +
          `Worst weighted cost: ${Number.isFinite(maxCost) ? maxCost.toFixed(0) : '∞'}.\n` +
          `Feasible: ${feasible ? 'yes' : 'no'}.`,
      })
    );

    const better =
      feasible &&
      (!bestCombo ||
        combo.length < bestCombo.length ||
        (combo.length === bestCombo.length &&
          (maxCost < bestMaxCost ||
            (maxCost === bestMaxCost &&
              label.localeCompare(comboLabel(bestCombo)) < 0))));

    if (better) {
      bestCombo = [...combo];
      bestCovered = [...covered];
      bestAssignments = assignments;
      bestMaxCost = maxCost;

      steps.push(
        createSnapshot({
          type: STEP_TYPES.UPDATE_BEST,
          phase: 'update_best',
          selected: [...bestCombo],
          covered: bestCovered,
          assignments: bestAssignments,
          scoreboard: buildScoreboard(scoreboardEntries, comboLabel(bestCombo)),
          metrics: {
            lambdaValue,
            facilityCount: bestCombo.length,
            coveredCount: bestCovered.length,
            total: nodes.length,
            checked: index + 1,
            maxCost: bestMaxCost,
            feasible: true,
          },
          explanation:
            `New best feasible solution found: { ${comboLabel(bestCombo)} }.\n` +
            `Primary objective: minimize facility count.\n` +
            `Tie-break: minimize worst weighted cost.`,
        })
      );
    }
  }

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      phase: 'finish',
      selected: bestCombo ?? [],
      covered: bestCovered,
      assignments: bestAssignments,
      scoreboard: buildScoreboard(
        scoreboardEntries,
        bestCombo ? comboLabel(bestCombo) : null
      ),
      metrics: {
        lambdaValue,
        facilityCount: bestCombo ? bestCombo.length : 0,
        coveredCount: bestCovered.length,
        total: nodes.length,
        checked: combos.length,
        maxCost: bestMaxCost,
        feasible: Boolean(bestCombo),
      },
      explanation:
        bestCombo
          ? `Exact brute-force cost covering finished.\nFinal facilities: { ${comboLabel(bestCombo)} }.\nMinimum facility count: ${bestCombo.length}.\nWorst weighted cost: ${bestMaxCost.toFixed(0)}.`
          : `Exact brute-force cost covering finished, but no feasible solution was found.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}