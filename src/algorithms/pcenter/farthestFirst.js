import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import {
  computeMaxAssignmentDistance,
  getAssignments,
} from '../shared/assignments';

function getDistanceScoreboard(nodes, assignments, bestId) {
  return nodes
    .map((node) => ({
      id: node.id,
      score: assignments[node.id]?.distance ?? Infinity,
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

    const distance = assignments[node.id]?.distance ?? Infinity;

    if (!farthest) {
      farthest = { id: node.id, distance };
      continue;
    }

    if (distance > farthest.distance) {
      farthest = { id: node.id, distance };
    } else if (distance === farthest.distance) {
      if (String(node.id).localeCompare(String(farthest.id)) < 0) {
        farthest = { id: node.id, distance };
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
        maxDistance: Infinity,
        round: 0,
        p,
      },
      explanation:
        `Initializing farthest-first p-Center.\n` +
        `Goal: choose ${p} facilities to reduce the worst-case distance.\n` +
        `Heuristic rule: start with one facility, then repeatedly add the node that is farthest from the current facility set.`,
    })
  );

  const firstFacility = nodes[0]?.id ?? null;
  if (firstFacility === null) {
    return steps.map((step, index) => ({ ...step, stepIndex: index }));
  }

  selected.push(firstFacility);

  let assignments = getAssignments(nodes, selected, distMatrix);
  let maxDistance = computeMaxAssignmentDistance(nodes, assignments);

  steps.push(
    createSnapshot({
      type: STEP_TYPES.SELECT,
      phase: 'seed',
      selected: [...selected],
      currentBest: firstFacility,
      assignments,
      metrics: {
        maxDistance,
        round: 1,
        p,
      },
      explanation:
        `Seed the process with node ${firstFacility} as the first facility.\n` +
        `Now measure each node's distance to its nearest selected facility.`,
    })
  );

  for (let round = 2; round <= p; round++) {
    assignments = getAssignments(nodes, selected, distMatrix);
    maxDistance = computeMaxAssignmentDistance(nodes, assignments);

    steps.push(
      createSnapshot({
        type: STEP_TYPES.ROUND_START,
        phase: 'round_start',
        selected: [...selected],
        assignments,
        scoreboard: getDistanceScoreboard(nodes, assignments, null),
        metrics: {
          maxDistance,
          round,
          p,
        },
        explanation:
          `--- Round ${round} of ${p} ---\n` +
          `Compute each node's distance to the nearest selected facility.\n` +
          `The next facility is the farthest uncovered demand point.`,
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
            maxDistance,
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
        scoreboard: getDistanceScoreboard(nodes, assignments, farthest.id),
        metrics: {
          maxDistance,
          round,
          p,
        },
        explanation:
          `The farthest node is ${farthest.id}.\n` +
          `Its nearest-facility distance is ${Number.isFinite(farthest.distance) ? farthest.distance.toFixed(0) : '∞'}.\n` +
          `Farthest-first chooses this node as the next facility.`,
      })
    );

    selected.push(farthest.id);
    assignments = getAssignments(nodes, selected, distMatrix);
    maxDistance = computeMaxAssignmentDistance(nodes, assignments);

    steps.push(
      createSnapshot({
        type: STEP_TYPES.SELECT,
        phase: 'select_farthest',
        selected: [...selected],
        currentBest: farthest.id,
        assignments,
        scoreboard: getDistanceScoreboard(nodes, assignments, null),
        metrics: {
          maxDistance,
          round,
          p,
        },
        explanation:
          `Select node ${farthest.id} as the next facility.\n` +
          `Current facility set: { ${selected.join(', ')} }.\n` +
          `New maximum assignment distance: ${maxDistance.toFixed(0)}.`,
      })
    );
  }

  assignments = getAssignments(nodes, selected, distMatrix);
  maxDistance = computeMaxAssignmentDistance(nodes, assignments);

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      phase: 'finish',
      selected: [...selected],
      assignments,
      metrics: {
        maxDistance,
        round: selected.length,
        p,
      },
      explanation:
        `Farthest-first p-Center finished.\n` +
        `Final facilities: { ${selected.join(', ')} }.\n` +
        `Final maximum assignment distance: ${maxDistance.toFixed(0)}.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}