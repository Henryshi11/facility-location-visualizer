import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import {
  computeMaxAssignmentCost,
  getAssignments,
} from '../shared/assignments';

function getCostScoreboard(nodes, assignments, bestId) {
  return nodes
    .map((node) => ({
      id: node.id,
      score: assignments[node.id]?.cost ?? Infinity,
      isBest: node.id === bestId,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.id).localeCompare(String(b.id));
    });
}

function chooseFarthestNode(nodes, assignments, selected) {
  let farthest = null;

  for (const node of nodes) {
    if (selected.includes(node.id)) continue;

    const cost = assignments[node.id]?.cost ?? Infinity;

    if (!farthest) {
      farthest = { id: node.id, cost };
      continue;
    }

    if (cost > farthest.cost) {
      farthest = { id: node.id, cost };
    } else if (cost === farthest.cost) {
      if (String(node.id).localeCompare(String(farthest.id)) < 0) {
        farthest = { id: node.id, cost };
      }
    }
  }

  return farthest;
}

export function generatePCenterFarthestFirstSteps(graph, params = {}) {
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
      metrics: {
        maxCost: Infinity,
        round: 0,
        p,
      },
      explanation:
        `Initializing farthest-first p-Center.\n` +
        `Goal: choose ${p} facilities to reduce the worst weighted cost max_i w_i d(i,S).\n` +
        `Heuristic rule: start with one facility, then repeatedly add the node with largest current weighted cost.`,
    })
  );

  const firstFacility = nodes[0]?.id ?? null;
  if (firstFacility === null) {
    return steps.map((step, index) => ({ ...step, stepIndex: index }));
  }

  selected.push(firstFacility);

  let assignments = getAssignments(nodes, selected, distMatrix);
  let maxCost = computeMaxAssignmentCost(nodes, assignments);

  steps.push(
    createSnapshot({
      type: STEP_TYPES.SELECT,
      phase: 'seed',
      selected: [...selected],
      currentBest: firstFacility,
      assignments,
      metrics: {
        maxCost,
        round: 1,
        p,
      },
      explanation:
        `Seed the process with node ${firstFacility} as the first facility.\n` +
        `Now measure each node's weighted assignment cost w_i d(i,S).`,
    })
  );

  for (let round = 2; round <= p; round++) {
    assignments = getAssignments(nodes, selected, distMatrix);
    maxCost = computeMaxAssignmentCost(nodes, assignments);

    steps.push(
      createSnapshot({
        type: STEP_TYPES.ROUND_START,
        phase: 'round_start',
        selected: [...selected],
        assignments,
        scoreboard: getCostScoreboard(nodes, assignments, null),
        metrics: {
          maxCost,
          round,
          p,
        },
        explanation:
          `--- Round ${round} of ${p} ---\n` +
          `Compute each node's weighted cost to the nearest selected facility.\n` +
          `The next facility is chosen from the largest-cost demand point.`,
      })
    );

    const farthest = chooseFarthestNode(nodes, assignments, selected);

    if (!farthest) {
      steps.push(
        createSnapshot({
          type: STEP_TYPES.NO_PROGRESS,
          phase: 'no_progress',
          selected: [...selected],
          assignments,
          metrics: {
            maxCost,
            round,
            p,
          },
          explanation: `No unselected node remained. The algorithm stops early.`,
        })
      );
      break;
    }

    steps.push(
      createSnapshot({
        type: STEP_TYPES.EVALUATE,
        phase: 'find_farthest',
        selected: [...selected],
        evaluating: farthest.id,
        currentBest: farthest.id,
        assignments,
        scoreboard: getCostScoreboard(nodes, assignments, farthest.id),
        metrics: {
          maxCost,
          round,
          p,
        },
        explanation:
          `The current worst-cost node is ${farthest.id}.\n` +
          `Its weighted assignment cost is ${Number.isFinite(farthest.cost) ? farthest.cost.toFixed(0) : '∞'}.\n` +
          `Farthest-first chooses this node as the next facility.`,
      })
    );

    selected.push(farthest.id);
    assignments = getAssignments(nodes, selected, distMatrix);
    maxCost = computeMaxAssignmentCost(nodes, assignments);

    steps.push(
      createSnapshot({
        type: STEP_TYPES.SELECT,
        phase: 'select_farthest',
        selected: [...selected],
        currentBest: farthest.id,
        assignments,
        scoreboard: getCostScoreboard(nodes, assignments, null),
        metrics: {
          maxCost,
          round,
          p,
        },
        explanation:
          `Select node ${farthest.id} as the next facility.\n` +
          `Current facility set: { ${selected.join(', ')} }.\n` +
          `New maximum weighted assignment cost: ${maxCost.toFixed(0)}.`,
      })
    );
  }

  assignments = getAssignments(nodes, selected, distMatrix);
  maxCost = computeMaxAssignmentCost(nodes, assignments);

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      phase: 'finish',
      selected: [...selected],
      assignments,
      metrics: {
        maxCost,
        round: selected.length,
        p,
      },
      explanation:
        `Farthest-first p-Center finished.\n` +
        `Final facilities: { ${selected.join(', ')} }.\n` +
        `Final maximum weighted assignment cost: ${maxCost.toFixed(0)}.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}