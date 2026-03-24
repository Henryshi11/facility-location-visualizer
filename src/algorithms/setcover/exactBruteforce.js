import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import { computeCoveredNodes } from '../shared/assignments';

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
      if (b.covered !== a.covered) return b.covered - a.covered;
      if (a.size !== b.size) return a.size - b.size;
      return a.id.localeCompare(b.id);
    })
    .map((item) => ({
      id: item.id,
      score: item.covered,
      isBest: item.id === bestKey,
    }));
}

export function generateSetCoverExactBruteforceSteps(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const radius = Math.max(1, params.radius ?? 30);
  const nodeIds = nodes.map((node) => node.id);
  const combos = combinationsUpTo(nodeIds, nodeIds.length);

  const steps = [];
  const scoreboardEntries = [];

  let bestCombo = null;
  let bestCovered = [];

  steps.push(
    createSnapshot({
      type: STEP_TYPES.INIT,
      phase: 'init',
      selected: [],
      covered: [],
      scoreboard: [],
      metrics: {
        coveredCount: 0,
        total: nodes.length,
        radius,
      },
      explanation:
        `Initializing exact brute-force covering.\n` +
        `Goal: find the smallest facility set that covers all demand nodes within radius ${radius}.\n` +
        `This method checks every possible subset, so it is only suitable for very small graphs.`,
    })
  );

  for (let index = 0; index < combos.length; index++) {
    const combo = combos[index];
    const covered = computeCoveredNodes(nodes, combo, distMatrix, radius);
    const label = comboLabel(combo);

    scoreboardEntries.push({
      id: label,
      covered: covered.length,
      size: combo.length,
    });

    steps.push(
      createSnapshot({
        type: STEP_TYPES.EVALUATE,
        phase: 'evaluate_combo',
        selected: [...combo],
        covered,
        scoreboard: buildScoreboard(
          scoreboardEntries,
          bestCombo ? comboLabel(bestCombo) : null
        ),
        metrics: {
          coveredCount: covered.length,
          total: nodes.length,
          radius,
          checked: index + 1,
        },
        explanation:
          `Evaluate facility set { ${label} }.\n` +
          `Covered nodes: ${covered.length}/${nodes.length}.`,
      })
    );

    const isFullCover = covered.length === nodes.length;
    const better =
      isFullCover &&
      (!bestCombo ||
        combo.length < bestCombo.length ||
        (combo.length === bestCombo.length &&
          label.localeCompare(comboLabel(bestCombo)) < 0));

    if (better) {
      bestCombo = [...combo];
      bestCovered = [...covered];

      steps.push(
        createSnapshot({
          type: STEP_TYPES.UPDATE_BEST,
          phase: 'update_best',
          selected: [...bestCombo],
          covered: [...bestCovered],
          scoreboard: buildScoreboard(scoreboardEntries, comboLabel(bestCombo)),
          metrics: {
            coveredCount: bestCovered.length,
            total: nodes.length,
            radius,
            checked: index + 1,
          },
          explanation:
            `New best full cover found: { ${comboLabel(bestCombo)} }.\n` +
            `This uses ${bestCombo.length} facility/facilities.`,
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
      scoreboard: buildScoreboard(
        scoreboardEntries,
        bestCombo ? comboLabel(bestCombo) : null
      ),
      metrics: {
        coveredCount: bestCovered.length,
        total: nodes.length,
        radius,
      },
      explanation:
        bestCombo
          ? `Exact brute-force covering finished.\nFinal covering facilities: { ${comboLabel(bestCombo)} }.\nThis is a minimum-cardinality full cover for the tested graph.`
          : `Exact brute-force covering finished, but no full cover was found.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}