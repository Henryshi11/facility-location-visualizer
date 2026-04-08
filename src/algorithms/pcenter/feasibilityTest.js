import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import { getAssignments } from '../shared/assignments';

function getOrderedPathData(graph) {
  const { nodes, edges } = graph;

  const orderedNodes = [...nodes].sort((a, b) =>
    String(a.id).localeCompare(String(b.id))
  );

  const edgeLengthMap = new Map();
  for (const edge of edges) {
    edgeLengthMap.set(`${edge.u}::${edge.v}`, edge.length ?? 1);
    edgeLengthMap.set(`${edge.v}::${edge.u}`, edge.length ?? 1);
  }

  let cumulative = 0;
  const nodePositions = orderedNodes.map((node, index) => {
    if (index > 0) {
      const prev = orderedNodes[index - 1];
      cumulative += edgeLengthMap.get(`${prev.id}::${node.id}`) ?? 1;
    }

    return {
      ...node,
      pathPosition: cumulative,
    };
  });

  return {
    orderedNodes: nodePositions,
    totalLength: cumulative,
  };
}

function buildDemandIntervals(orderedNodes, lambdaValue) {
  return orderedNodes.map((node, index) => {
    const weight = node.weight ?? 1;
    const radius = weight > 0 ? lambdaValue / weight : Infinity;

    return {
      id: node.id,
      originalIndex: index,
      center: node.pathPosition,
      radius,
      left: node.pathPosition - radius,
      right: node.pathPosition + radius,
      weight,
    };
  });
}

function sortIntervalsByLeft(intervals) {
  return [...intervals].sort((a, b) => {
    if (a.left !== b.left) return a.left - b.left;
    if (a.right !== b.right) return a.right - b.right;
    return String(a.id).localeCompare(String(b.id));
  });
}

/**
 * Keep only critical intervals:
 * - if one interval strictly contains another, the larger one is redundant
 * - after this filtering, left and right endpoints are both increasing
 *
 * We sort by left asc, then right asc.
 * For chains of containment, we keep the smallest / most restrictive interval.
 */
function buildCriticalIntervals(sortedIntervals) {
  const stack = [];

  for (const interval of sortedIntervals) {
    while (stack.length > 0) {
      const top = stack[stack.length - 1];

      // Same left endpoint: the larger/right-longer interval is redundant.
      if (interval.left === top.left && interval.right >= top.right) {
        // current interval contains top or is equal-but-not-better
        // skip current
        break;
      }

      // Current interval is contained in the top interval => top is redundant.
      if (interval.right <= top.right) {
        stack.pop();
        continue;
      }

      break;
    }

    const top = stack[stack.length - 1];
    if (
      top &&
      interval.left === top.left &&
      interval.right >= top.right
    ) {
      continue;
    }

    stack.push(interval);
  }

  return stack;
}

function buildFacilityPositions(orderedNodes, facilityNodeIds) {
  const posMap = new Map(
    orderedNodes.map((node) => [node.id, node.pathPosition])
  );

  return facilityNodeIds
    .map((id) => posMap.get(id))
    .filter((value) => Number.isFinite(value));
}

function intervalContainsPoint(interval, x) {
  return x >= interval.left && x <= interval.right;
}

/**
 * For each critical interval, compute the feasible facility-node index range [leftIdx, rightIdx].
 * Because critical intervals have increasing left/right endpoints, this is a linear sweep.
 */
function attachFeasibleNodeRanges(criticalIntervals, orderedNodes) {
  const positions = orderedNodes.map((node) => node.pathPosition);
  const result = [];

  let leftPtr = 0;
  let rightPtr = -1;

  for (const interval of criticalIntervals) {
    while (leftPtr < positions.length && positions[leftPtr] < interval.left) {
      leftPtr += 1;
    }

    if (rightPtr < leftPtr - 1) {
      rightPtr = leftPtr - 1;
    }

    while (
      rightPtr + 1 < positions.length &&
      positions[rightPtr + 1] <= interval.right
    ) {
      rightPtr += 1;
    }

    result.push({
      ...interval,
      leftNodeIndex: leftPtr,
      rightNodeIndex: rightPtr,
    });
  }

  return result;
}

function buildCoveredNodeIds(nodes, assignments, lambdaValue) {
  return nodes
    .filter((node) => (assignments[node.id]?.cost ?? Infinity) <= lambdaValue)
    .map((node) => node.id);
}

function getOriginalIntervalsCoveredByNode(sortedIntervals, facilityPosition) {
  return sortedIntervals
    .filter((interval) => intervalContainsPoint(interval, facilityPosition))
    .map((interval) => interval.id);
}

function describeNodeRange(orderedNodes, leftIndex, rightIndex) {
  if (leftIndex > rightIndex) {
    return '(empty)';
  }

  const leftId = orderedNodes[leftIndex]?.id ?? '?';
  const rightId = orderedNodes[rightIndex]?.id ?? '?';

  if (leftId === rightId) {
    return leftId;
  }

  return `${leftId} ... ${rightId}`;
}

function buildExplanationForPlacement({
  startInterval,
  packedIntervalIds,
  leftIndex,
  rightIndex,
  chosenNode,
  usedFacilities,
  p,
  orderedNodes,
}) {
  return (
    `Discrete intersection-based feasibility step.\n` +
    `Start from the leftmost uncovered critical interval ${startInterval.id}.\n` +
    `Expand rightward while the feasible node-index ranges still intersect.\n` +
    `Packed critical intervals: ${packedIntervalIds.join(', ')}.\n` +
    `Common feasible node range: ${describeNodeRange(
      orderedNodes,
      leftIndex,
      rightIndex
    )}.\n` +
    `Choose the rightmost common node ${chosenNode.id} at position ${chosenNode.pathPosition.toFixed(2)}.\n` +
    `Facilities used so far: ${usedFacilities}/${p}.`
  );
}

/**
 * Core feasibility scan:
 * - build original intervals
 * - filter to critical intervals
 * - convert each critical interval to a feasible node-index interval [L_i, R_i]
 * - scan left-to-right, maintaining intersection [currentL, currentR]
 *
 * The scan itself is O(n).
 */
export function runPCenterFeasibilityTest(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const p = Math.max(1, Math.min(params.p ?? 2, nodes.length));
  const lambdaValue = Math.max(0, params.lambdaValue ?? 30);

  const { orderedNodes, totalLength } = getOrderedPathData(graph);

  const originalIntervals = sortIntervalsByLeft(
    buildDemandIntervals(orderedNodes, lambdaValue)
  );

  const criticalIntervals = attachFeasibleNodeRanges(
    buildCriticalIntervals(originalIntervals),
    orderedNodes
  );

  // If any critical interval has no feasible node, infeasible immediately.
  for (const interval of criticalIntervals) {
    if (interval.leftNodeIndex > interval.rightNodeIndex) {
      return {
        p,
        lambdaValue,
        totalLength,
        orderedNodes,
        intervals: originalIntervals,
        criticalIntervals,
        facilityNodeIds: [],
        facilityPositions: [],
        coveredNodeIds: [],
        facilityCount: 0,
        feasible: false,
        assignments: {},
        witnessMaxCost: Infinity,
        witnessSteps: [],
        failureIntervalId: interval.id,
      };
    }
  }

  const coveredSet = new Set();
  const facilityNodeIds = [];
  const witnessSteps = [];

  let i = 0;

  while (i < criticalIntervals.length && facilityNodeIds.length < p) {
    const startInterval = criticalIntervals[i];
    let currentL = startInterval.leftNodeIndex;
    let currentR = startInterval.rightNodeIndex;
    const packedIntervalIds = [startInterval.id];

    let j = i + 1;

    while (j < criticalIntervals.length) {
      const nextInterval = criticalIntervals[j];

      const nextL = Math.max(currentL, nextInterval.leftNodeIndex);
      const nextR = Math.min(currentR, nextInterval.rightNodeIndex);

      if (nextL > nextR) {
        break;
      }

      currentL = nextL;
      currentR = nextR;
      packedIntervalIds.push(nextInterval.id);
      j += 1;
    }

    const chosenNode = orderedNodes[currentR];
    if (!chosenNode) {
      return {
        p,
        lambdaValue,
        totalLength,
        orderedNodes,
        intervals: originalIntervals,
        criticalIntervals,
        facilityNodeIds,
        facilityPositions: buildFacilityPositions(orderedNodes, facilityNodeIds),
        coveredNodeIds: [],
        facilityCount: facilityNodeIds.length,
        feasible: false,
        assignments: {},
        witnessMaxCost: Infinity,
        witnessSteps,
        failureIntervalId: startInterval.id,
      };
    }

    facilityNodeIds.push(chosenNode.id);

    const newlyCovered = getOriginalIntervalsCoveredByNode(
      originalIntervals,
      chosenNode.pathPosition
    );

    for (const intervalId of newlyCovered) {
      coveredSet.add(intervalId);
    }

    witnessSteps.push({
      activeIntervalId: startInterval.id,
      chosenFacilityId: chosenNode.id,
      chosenFacilityPosition: chosenNode.pathPosition,
      newlyCoveredIds: [...newlyCovered],
      packedIntervalIds: [...packedIntervalIds],
      commonLeftIndex: currentL,
      commonRightIndex: currentR,
      coveredIdsAfterStep: [...coveredSet],
      facilityNodeIdsAfterStep: [...facilityNodeIds],
      explanation: buildExplanationForPlacement({
        startInterval,
        packedIntervalIds,
        leftIndex: currentL,
        rightIndex: currentR,
        chosenNode,
        usedFacilities: facilityNodeIds.length,
        p,
        orderedNodes,
      }),
    });

    i = j;
  }

  const feasible =
    i >= criticalIntervals.length && facilityNodeIds.length <= p;

  const assignments = feasible
    ? getAssignments(nodes, facilityNodeIds, distMatrix)
    : {};

  const coveredNodeIds = feasible
    ? buildCoveredNodeIds(nodes, assignments, lambdaValue)
    : [...coveredSet];

  let witnessMaxCost = 0;
  if (feasible) {
    for (const node of nodes) {
      const cost = assignments[node.id]?.cost ?? Infinity;
      if (cost > witnessMaxCost) {
        witnessMaxCost = cost;
      }
    }
  } else {
    witnessMaxCost = Infinity;
  }

  return {
    p,
    lambdaValue,
    totalLength,
    orderedNodes,
    intervals: originalIntervals,
    criticalIntervals,
    facilityNodeIds,
    facilityPositions: buildFacilityPositions(orderedNodes, facilityNodeIds),
    coveredNodeIds,
    facilityCount: facilityNodeIds.length,
    feasible,
    assignments,
    witnessMaxCost,
    witnessSteps,
    failureIntervalId: feasible
      ? null
      : criticalIntervals[i]?.id ?? null,
  };
}

export function generatePCenterFeasibilityTestSteps(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const p = Math.max(1, Math.min(params.p ?? 2, nodes.length));
  const lambdaValue = Math.max(0, params.lambdaValue ?? 30);

  const result = runPCenterFeasibilityTest(graph, { p, lambdaValue });

  const steps = [];

  steps.push(
    createSnapshot({
      type: STEP_TYPES.INIT,
      phase: 'init',
      selected: [],
      covered: [],
      assignments: {},
      scoreboard: [],
      metrics: {
        p,
        lambdaValue,
        facilityCount: 0,
        coveredCount: 0,
        total: nodes.length,
        checked: 0,
        feasible: null,
      },
      overlays: {
        mode: 'pcenter_feasibility',
        totalLength: result.totalLength,
        intervals: result.intervals,
        facilityPositions: [],
        activeIntervalId: null,
        chosenFacilityId: null,
      },
      explanation:
        `Initializing discrete λ-feasibility test for p-Center.\n` +
        `Given λ = ${lambdaValue}, convert each demand node into a feasible interval.\n` +
        `Then filter to critical intervals and scan left-to-right by maintaining only the common feasible node-index range.`,
    })
  );

  result.witnessSteps.forEach((witnessStep, index) => {
    const partialAssignments = getAssignments(
      nodes,
      witnessStep.facilityNodeIdsAfterStep,
      distMatrix
    );

    steps.push(
      createSnapshot({
        type: STEP_TYPES.SELECT,
        phase: 'intersection_pack_and_place',
        selected: witnessStep.facilityNodeIdsAfterStep,
        covered: witnessStep.coveredIdsAfterStep,
        assignments: partialAssignments,
        metrics: {
          p,
          lambdaValue,
          facilityCount: witnessStep.facilityNodeIdsAfterStep.length,
          coveredCount: witnessStep.coveredIdsAfterStep.length,
          total: nodes.length,
          checked: index + 1,
          feasible: null,
          usedFacilities: witnessStep.facilityNodeIdsAfterStep.length,
        },
        overlays: {
          mode: 'pcenter_feasibility',
          totalLength: result.totalLength,
          intervals: result.intervals,
          facilityPositions: buildFacilityPositions(
            result.orderedNodes,
            witnessStep.facilityNodeIdsAfterStep
          ),
          activeIntervalId: witnessStep.activeIntervalId,
          chosenFacilityId: witnessStep.chosenFacilityId,
        },
        explanation: witnessStep.explanation,
      })
    );
  });

  if (result.feasible) {
    steps.push(
      createSnapshot({
        type: STEP_TYPES.FINISH,
        phase: 'finish',
        selected: result.facilityNodeIds,
        covered: result.coveredNodeIds,
        assignments: result.assignments,
        scoreboard: [],
        metrics: {
          p,
          lambdaValue,
          facilityCount: result.facilityCount,
          coveredCount: result.coveredNodeIds.length,
          total: nodes.length,
          feasible: true,
          maxCost: result.witnessMaxCost,
        },
        overlays: {
          mode: 'pcenter_feasibility',
          totalLength: result.totalLength,
          intervals: result.intervals,
          facilityPositions: result.facilityPositions,
          activeIntervalId: null,
          chosenFacilityId: null,
        },
        explanation:
          `Feasibility test finished.\n` +
          `λ = ${lambdaValue} is feasible in the discrete node-restricted model.\n` +
          `Selected facilities: { ${result.facilityNodeIds.join(', ')} }.\n` +
          `Worst weighted assignment cost = ${result.witnessMaxCost.toFixed(2)}.`,
      })
    );
  } else {
    steps.push(
      createSnapshot({
        type: STEP_TYPES.FINISH,
        phase: 'finish',
        selected: result.facilityNodeIds,
        covered: result.coveredNodeIds,
        assignments: {},
        scoreboard: [],
        metrics: {
          p,
          lambdaValue,
          facilityCount: result.facilityCount,
          coveredCount: result.coveredNodeIds.length,
          total: nodes.length,
          feasible: false,
          maxCost: Infinity,
        },
        overlays: {
          mode: 'pcenter_feasibility',
          totalLength: result.totalLength,
          intervals: result.intervals,
          facilityPositions: result.facilityPositions,
          activeIntervalId: result.failureIntervalId,
          chosenFacilityId: null,
        },
        explanation:
          `Feasibility test finished.\n` +
          `λ = ${lambdaValue} is not feasible in the discrete node-restricted model.\n` +
          `The intersection-based scan used ${result.facilityCount} facilities and still could not cover all critical intervals.`,
      })
    );
  }

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}