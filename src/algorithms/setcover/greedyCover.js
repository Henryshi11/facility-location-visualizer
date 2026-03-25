import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import {
  computeCostCoveredNodes,
  computeMaxAssignmentCost,
  getAssignments,
  isCostCoverFeasible,
} from '../shared/assignments';

function buildScoreboard(candidates, bestId) {
  return candidates
    .slice()
    .sort((a, b) => {
      if (b.newlyCovered !== a.newlyCovered) return b.newlyCovered - a.newlyCovered;
      if (a.maxCost !== b.maxCost) return a.maxCost - b.maxCost;
      return String(a.id).localeCompare(String(b.id));
    })
    .map((item) => ({
      id: `${item.id} (+${item.newlyCovered})`,
      score: item.newlyCovered,
      isBest: item.id === bestId,
    }));
}

export function generateSetCoverGreedySteps(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const lambdaValue = Math.max(0, params.lambdaValue ?? 30);

  const steps = [];
  const selected = [];

  let assignments = getAssignments(nodes, selected, distMatrix);
  let covered = computeCostCoveredNodes(nodes, assignments, lambdaValue);

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
        maxCost: Infinity,
      },
      explanation:
        `Initializing greedy cost covering.\n` +
        `Goal: minimize the number of facilities.\n` +
        `Constraint: every node must satisfy w_i d(i,S) ≤ λ, where λ = ${lambdaValue}.\n` +
        `Greedy rule: at each round, add the facility that makes the largest number of currently infeasible nodes become feasible.`,
    })
  );

  let round = 0;

  while (!isCostCoverFeasible(nodes, assignments, lambdaValue)) {
    round += 1;
    const uncoveredSet = new Set(
      nodes
        .filter((node) => {
          const cost = assignments[node.id]?.cost ?? Infinity;
          return cost > lambdaValue;
        })
        .map((node) => node.id)
    );

    const candidates = [];

    steps.push(
      createSnapshot({
        type: STEP_TYPES.ROUND_START,
        phase: 'round_start',
        selected: [...selected],
        covered,
        assignments,
        scoreboard: [],
        metrics: {
          lambdaValue,
          facilityCount: selected.length,
          coveredCount: covered.length,
          total: nodes.length,
          maxCost: computeMaxAssignmentCost(nodes, assignments),
          round,
        },
        explanation:
          `--- Round ${round} ---\n` +
          `Currently feasible nodes: ${covered.length}/${nodes.length}.\n` +
          `Try every unselected node as the next facility.`,
      })
    );

    for (const node of nodes) {
      if (selected.includes(node.id)) continue;

      const trialSelected = [...selected, node.id];
      const trialAssignments = getAssignments(nodes, trialSelected, distMatrix);
      const trialCovered = computeCostCoveredNodes(nodes, trialAssignments, lambdaValue);

      let newlyCovered = 0;
      for (const id of trialCovered) {
        if (uncoveredSet.has(id)) newlyCovered += 1;
      }

      const trialMaxCost = computeMaxAssignmentCost(nodes, trialAssignments);

      candidates.push({
        id: node.id,
        newlyCovered,
        covered: trialCovered,
        assignments: trialAssignments,
        maxCost: trialMaxCost,
      });

      const currentBest =
        candidates.reduce((best, item) => {
          if (!best) return item;
          if (item.newlyCovered > best.newlyCovered) return item;
          if (item.newlyCovered === best.newlyCovered) {
            if (item.maxCost < best.maxCost) return item;
            if (item.maxCost === best.maxCost) {
              return String(item.id).localeCompare(String(best.id)) < 0 ? item : best;
            }
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
          covered,
          evalCovered: trialCovered,
          assignments: trialAssignments,
          scoreboard: buildScoreboard(candidates, currentBest),
          metrics: {
            lambdaValue,
            facilityCount: trialSelected.length,
            coveredCount: trialCovered.length,
            total: nodes.length,
            newlyCovered,
            maxCost: trialMaxCost,
            round,
          },
          explanation:
            `Evaluate candidate ${node.id}.\n` +
            `It makes ${newlyCovered} currently infeasible nodes satisfy the cost threshold.\n` +
            `Resulting worst weighted cost: ${Number.isFinite(trialMaxCost) ? trialMaxCost.toFixed(0) : '∞'}.`,
        })
      );
    }

    const bestCandidate = candidates.reduce((best, item) => {
      if (!best) return item;
      if (item.newlyCovered > best.newlyCovered) return item;
      if (item.newlyCovered === best.newlyCovered) {
        if (item.maxCost < best.maxCost) return item;
        if (item.maxCost === best.maxCost) {
          return String(item.id).localeCompare(String(best.id)) < 0 ? item : best;
        }
      }
      return best;
    }, null);

    if (!bestCandidate || bestCandidate.newlyCovered <= 0) {
      steps.push(
        createSnapshot({
          type: STEP_TYPES.NO_PROGRESS,
          phase: 'no_progress',
          selected: [...selected],
          covered,
          assignments,
          scoreboard: buildScoreboard(candidates, null),
          metrics: {
            lambdaValue,
            facilityCount: selected.length,
            coveredCount: covered.length,
            total: nodes.length,
            maxCost: computeMaxAssignmentCost(nodes, assignments),
            round,
          },
          explanation:
            `No candidate improves feasibility under the current threshold.\n` +
            `The greedy algorithm stops without a full feasible cover.`,
        })
      );
      break;
    }

    selected.push(bestCandidate.id);
    assignments = bestCandidate.assignments;
    covered = bestCandidate.covered;

    steps.push(
      createSnapshot({
        type: STEP_TYPES.SELECT,
        phase: 'select_candidate',
        selected: [...selected],
        currentBest: bestCandidate.id,
        covered,
        assignments,
        scoreboard: buildScoreboard(candidates, bestCandidate.id),
        metrics: {
          lambdaValue,
          facilityCount: selected.length,
          coveredCount: covered.length,
          total: nodes.length,
          maxCost: computeMaxAssignmentCost(nodes, assignments),
          round,
        },
        explanation:
          `Select node ${bestCandidate.id} as the next facility.\n` +
          `Current facility count: ${selected.length}.\n` +
          `Current feasible nodes: ${covered.length}/${nodes.length}.`,
      })
    );
  }

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      phase: 'finish',
      selected: [...selected],
      covered,
      assignments,
      metrics: {
        lambdaValue,
        facilityCount: selected.length,
        coveredCount: covered.length,
        total: nodes.length,
        maxCost: computeMaxAssignmentCost(nodes, assignments),
        feasible: isCostCoverFeasible(nodes, assignments, lambdaValue),
      },
      explanation:
        `Greedy cost covering finished.\n` +
        `Selected facilities: { ${selected.join(', ')} }.\n` +
        `Facility count: ${selected.length}.\n` +
        `Feasible under threshold: ${isCostCoverFeasible(nodes, assignments, lambdaValue) ? 'yes' : 'no'}.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}