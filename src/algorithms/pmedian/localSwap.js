import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import {
  computeTotalAssignmentCost,
  getAssignments,
} from '../shared/assignments';

function buildGreedySeed(nodes, distMatrix, p) {
  const selected = [];

  for (let round = 1; round <= p; round++) {
    let bestCandidate = null;

    for (const node of nodes) {
      if (selected.includes(node.id)) continue;

      const trial = [...selected, node.id];
      const assignments = getAssignments(nodes, trial, distMatrix);
      const totalCost = computeTotalAssignmentCost(nodes, assignments);

      if (!bestCandidate) {
        bestCandidate = {
          id: node.id,
          score: totalCost,
          assignments,
        };
        continue;
      }

      if (totalCost < bestCandidate.score) {
        bestCandidate = {
          id: node.id,
          score: totalCost,
          assignments,
        };
      } else if (totalCost === bestCandidate.score) {
        if (String(node.id).localeCompare(String(bestCandidate.id)) < 0) {
          bestCandidate = {
            id: node.id,
            score: totalCost,
            assignments,
          };
        }
      }
    }

    if (!bestCandidate) break;
    selected.push(bestCandidate.id);
  }

  return selected;
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

export function generatePMedianLocalSwapSteps(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const p = Math.max(1, Math.min(params.p ?? 2, nodes.length));

  const steps = [];
  let selected = buildGreedySeed(nodes, distMatrix, p);
  let assignments = getAssignments(nodes, selected, distMatrix);
  let totalCost = computeTotalAssignmentCost(nodes, assignments);

  steps.push(
    createSnapshot({
      type: STEP_TYPES.INIT,
      phase: 'init',
      selected: [...selected],
      assignments,
      metrics: {
        totalCost,
        p,
        iteration: 0,
      },
      explanation:
        `Initializing local-swap p-Median.\n` +
        `Start from a greedy seed solution, then try swap moves to improve total assignment cost Σ w_i d(i,S).`,
    })
  );

  let improved = true;
  let iteration = 0;

  while (improved) {
    improved = false;
    iteration += 1;

    steps.push(
      createSnapshot({
        type: STEP_TYPES.ROUND_START,
        phase: 'round_start',
        selected: [...selected],
        assignments,
        metrics: {
          totalCost,
          p,
          iteration,
        },
        explanation:
          `--- Local search iteration ${iteration} ---\n` +
          `Try replacing one current facility with one unselected node.`,
      })
    );

    const scoreboardEntries = [];
    let bestSwap = null;

    for (const outId of selected) {
      for (const inNode of nodes) {
        if (selected.includes(inNode.id)) continue;

        const trial = selected.map((id) => (id === outId ? inNode.id : id));
        const normalizedTrial = [...trial].sort((a, b) =>
          String(a).localeCompare(String(b))
        );

        const trialAssignments = getAssignments(nodes, normalizedTrial, distMatrix);
        const trialCost = computeTotalAssignmentCost(nodes, trialAssignments);
        const swapLabel = `${outId}→${inNode.id}`;

        scoreboardEntries.push({
          id: swapLabel,
          score: trialCost,
        });

        steps.push(
          createSnapshot({
            type: STEP_TYPES.EVALUATE,
            phase: 'evaluate_swap',
            selected: [...selected],
            evaluating: inNode.id,
            assignments: trialAssignments,
            scoreboard: buildScoreboard(
              scoreboardEntries,
              bestSwap ? `${bestSwap.outId}→${bestSwap.inId}` : null
            ),
            metrics: {
              totalCost: trialCost,
              currentTotalCost: totalCost,
              p,
              iteration,
            },
            overlays: {
              swapOut: outId,
              swapIn: inNode.id,
              trialFacilities: normalizedTrial,
            },
            explanation:
              `Try swapping out ${outId} and swapping in ${inNode.id}.\n` +
              `Trial facility set: { ${normalizedTrial.join(', ')} }.\n` +
              `Trial total assignment cost: ${trialCost.toFixed(0)}.`,
          })
        );

        if (
          trialCost < totalCost &&
          (!bestSwap ||
            trialCost < bestSwap.score ||
            (trialCost === bestSwap.score &&
              String(swapLabel).localeCompare(`${bestSwap.outId}→${bestSwap.inId}`) < 0))
        ) {
          bestSwap = {
            outId,
            inId: inNode.id,
            facilities: normalizedTrial,
            assignments: trialAssignments,
            score: trialCost,
          };
        }
      }
    }

    if (bestSwap) {
      selected = [...bestSwap.facilities];
      assignments = bestSwap.assignments;
      totalCost = bestSwap.score;
      improved = true;

      steps.push(
        createSnapshot({
          type: STEP_TYPES.SELECT,
          phase: 'accept_swap',
          selected: [...selected],
          currentBest: bestSwap.inId,
          assignments,
          scoreboard: buildScoreboard(
            scoreboardEntries,
            `${bestSwap.outId}→${bestSwap.inId}`
          ),
          metrics: {
            totalCost,
            p,
            iteration,
          },
          overlays: {
            swapOut: bestSwap.outId,
            swapIn: bestSwap.inId,
          },
          explanation:
            `Accept improving swap ${bestSwap.outId}→${bestSwap.inId}.\n` +
            `New facility set: { ${selected.join(', ')} }.\n` +
            `Improved total assignment cost: ${totalCost.toFixed(0)}.`,
        })
      );
    } else {
      steps.push(
        createSnapshot({
          type: STEP_TYPES.NO_PROGRESS,
          phase: 'no_improvement',
          selected: [...selected],
          assignments,
          scoreboard: buildScoreboard(scoreboardEntries, null),
          metrics: {
            totalCost,
            p,
            iteration,
          },
          explanation:
            `No improving swap was found.\n` +
            `The local search terminates at a local optimum.`,
        })
      );
    }
  }

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      phase: 'finish',
      selected: [...selected],
      assignments,
      metrics: {
        totalCost,
        p,
        iteration,
      },
      explanation:
        `Local-swap p-Median finished.\n` +
        `Final facilities: { ${selected.join(', ')} }.\n` +
        `Final total assignment cost: ${totalCost.toFixed(0)}.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}