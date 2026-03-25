import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import {
  computeCoveredDemandWeight,
  computeCoveredNodes,
  computeLambdaServiceCost,
  getAssignments,
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
      if (a.feasible && b.feasible && a.serviceCost !== b.serviceCost) {
        return a.serviceCost - b.serviceCost;
      }
      if (b.coveredWeight !== a.coveredWeight) return b.coveredWeight - a.coveredWeight;
      return a.id.localeCompare(b.id);
    })
    .map((item) => ({
      id: item.id,
      score: item.feasible ? item.serviceCost : item.coveredWeight,
      isBest: item.id === bestKey,
    }));
}

export function generateSetCoverExactBruteforceSteps(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const lambdaValue = Math.max(1, params.lambdaValue ?? params.radius ?? 30);
  const nodeIds = nodes.map((node) => node.id);
  const combos = combinationsUpTo(nodeIds, nodeIds.length);

  const steps = [];
  const scoreboardEntries = [];

  let bestCombo = null;
  let bestCovered = [];
  let bestAssignments = {};
  let bestServiceCost = Infinity;

  steps.push(
    createSnapshot({
      type: STEP_TYPES.INIT,
      phase: 'init',
      selected: [],
      covered: [],
      scoreboard: [],
      metrics: {
        coveredCount: 0,
        coveredDemandWeight: 0,
        total: nodes.length,
        lambda: lambdaValue,
        checked: 0,
      },
      explanation:
        `Initializing exact brute-force λ-covering.\n` +
        `Primary goal: find a minimum-cardinality full cover under λ = ${lambdaValue}.\n` +
        `Tie-break goal: among covers with the same number of facilities, minimize total weighted service cost Σ w_i d(i,S).\n` +
        `This avoids the degenerate pure-cost solution where selecting every node gives cost 0.`,
    })
  );

  for (let index = 0; index < combos.length; index++) {
    const combo = combos[index];
    const covered = computeCoveredNodes(nodes, combo, distMatrix, lambdaValue);
    const assignments = getAssignments(nodes, combo, distMatrix);
    const coveredWeight = computeCoveredDemandWeight(nodes, covered);
    const isFullCover = covered.length === nodes.length;
    const serviceCost = isFullCover
      ? computeLambdaServiceCost(nodes, assignments, lambdaValue)
      : Infinity;
    const label = comboLabel(combo);

    scoreboardEntries.push({
      id: label,
      coveredWeight,
      size: combo.length,
      feasible: isFullCover,
      serviceCost,
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
          coveredCount: covered.length,
          coveredDemandWeight: coveredWeight,
          total: nodes.length,
          lambda: lambdaValue,
          checked: index + 1,
          facilityCount: combo.length,
          serviceCost,
        },
        explanation:
          `Evaluate facility set { ${label} }.\n` +
          `Covered nodes: ${covered.length}/${nodes.length}.\n` +
          `Covered demand weight: ${coveredWeight}.\n` +
          `Feasible full cover: ${isFullCover ? 'yes' : 'no'}.`,
      })
    );

    const better =
      isFullCover &&
      (!bestCombo ||
        combo.length < bestCombo.length ||
        (combo.length === bestCombo.length &&
          (serviceCost < bestServiceCost ||
            (serviceCost === bestServiceCost &&
              label.localeCompare(comboLabel(bestCombo)) < 0))));

    if (better) {
      bestCombo = [...combo];
      bestCovered = [...covered];
      bestAssignments = assignments;
      bestServiceCost = serviceCost;

      steps.push(
        createSnapshot({
          type: STEP_TYPES.UPDATE_BEST,
          phase: 'update_best',
          selected: [...bestCombo],
          covered: [...bestCovered],
          assignments: bestAssignments,
          scoreboard: buildScoreboard(scoreboardEntries, comboLabel(bestCombo)),
          metrics: {
            coveredCount: bestCovered.length,
            coveredDemandWeight: computeCoveredDemandWeight(nodes, bestCovered),
            total: nodes.length,
            lambda: lambdaValue,
            checked: index + 1,
            facilityCount: bestCombo.length,
            serviceCost: bestServiceCost,
          },
          explanation:
            `New best full cover found: { ${comboLabel(bestCombo)} }.\n` +
            `Primary criterion: smaller facility count.\n` +
            `Tie-break criterion: smaller total weighted service cost.`,
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
        coveredCount: bestCovered.length,
        coveredDemandWeight: computeCoveredDemandWeight(nodes, bestCovered),
        total: nodes.length,
        lambda: lambdaValue,
        facilityCount: bestCombo ? bestCombo.length : 0,
        serviceCost: bestServiceCost,
        checked: combos.length,
      },
      explanation:
        bestCombo
          ? `Exact brute-force λ-covering finished.\nFinal facilities: { ${comboLabel(bestCombo)} }.\nMinimum facility count: ${bestCombo.length}.\nTie-break weighted service cost: ${bestServiceCost.toFixed(0)}.`
          : `Exact brute-force λ-covering finished, but no full cover was found.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}