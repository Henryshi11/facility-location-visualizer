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
  return orderedNodes
    .map((node) => {
      const weight = node.weight ?? 1;
      const radius = weight > 0 ? lambdaValue / weight : Infinity;

      return {
        id: node.id,
        center: node.pathPosition,
        radius,
        left: node.pathPosition - radius,
        right: node.pathPosition + radius,
        weight,
      };
    })
    .sort((a, b) => {
      if (a.left !== b.left) return a.left - b.left;
      if (a.right !== b.right) return a.right - b.right;
      return String(a.id).localeCompare(String(b.id));
    });
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

function getCandidateNodesInsideInterval(activeInterval, orderedNodes) {
  return orderedNodes.filter((node) =>
    intervalContainsPoint(activeInterval, node.pathPosition)
  );
}

function getNewlyCoveredIds(intervals, coveredSet, facilityPosition) {
  const newlyCovered = [];

  for (const interval of intervals) {
    if (!coveredSet.has(interval.id) && intervalContainsPoint(interval, facilityPosition)) {
      newlyCovered.push(interval.id);
    }
  }

  return newlyCovered;
}

function chooseBestDiscreteNode(activeInterval, intervals, coveredSet, orderedNodes) {
  const candidates = getCandidateNodesInsideInterval(activeInterval, orderedNodes);

  if (!candidates.length) {
    return null;
  }

  let bestNode = null;
  let bestCoveredIds = [];

  for (const node of candidates) {
    const coveredIds = getNewlyCoveredIds(intervals, coveredSet, node.pathPosition);

    const better =
      !bestNode ||
      coveredIds.length > bestCoveredIds.length ||
      (coveredIds.length === bestCoveredIds.length &&
        node.pathPosition > bestNode.pathPosition) ||
      (coveredIds.length === bestCoveredIds.length &&
        node.pathPosition === bestNode.pathPosition &&
        String(node.id).localeCompare(String(bestNode.id)) < 0);

    if (better) {
      bestNode = node;
      bestCoveredIds = coveredIds;
    }
  }

  return {
    node: bestNode,
    coveredIds: bestCoveredIds,
    candidateCount: candidates.length,
  };
}

function buildCoveredNodeIds(nodes, assignments, lambdaValue) {
  return nodes
    .filter((node) => (assignments[node.id]?.cost ?? Infinity) <= lambdaValue)
    .map((node) => node.id);
}

function buildExplanationForPlacement({
  activeInterval,
  chosenNode,
  newlyCovered,
  usedFacilities,
  p,
  candidateCount,
}) {
  return (
    `Discrete greedy feasibility step.\n` +
    `The leftmost uncovered demand interval is for node ${activeInterval.id}: ` +
    `[${activeInterval.left.toFixed(2)}, ${activeInterval.right.toFixed(2)}].\n` +
    `Among the ${candidateCount} node(s) inside this interval, choose node ${chosenNode.id} ` +
    `at position ${chosenNode.pathPosition.toFixed(2)} because it covers the most remaining intervals.\n` +
    `Newly covered demand nodes: ${newlyCovered.length ? newlyCovered.join(', ') : '(none)'}.\n` +
    `Facilities used so far: ${usedFacilities}/${p}.`
  );
}

export function runPCenterFeasibilityTest(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const p = Math.max(1, Math.min(params.p ?? 2, nodes.length));
  const lambdaValue = Math.max(0, params.lambdaValue ?? 30);

  const { orderedNodes, totalLength } = getOrderedPathData(graph);
  const intervals = buildDemandIntervals(orderedNodes, lambdaValue);

  const coveredSet = new Set();
  const facilityNodeIds = [];
  const witnessSteps = [];

  while (coveredSet.size < intervals.length && facilityNodeIds.length < p) {
    const activeInterval = intervals.find((interval) => !coveredSet.has(interval.id));

    if (!activeInterval) {
      break;
    }

    const choice = chooseBestDiscreteNode(
      activeInterval,
      intervals,
      coveredSet,
      orderedNodes
    );

    if (!choice || !choice.node) {
      return {
        p,
        lambdaValue,
        totalLength,
        orderedNodes,
        intervals,
        facilityNodeIds,
        facilityPositions: buildFacilityPositions(orderedNodes, facilityNodeIds),
        coveredNodeIds: [],
        facilityCount: facilityNodeIds.length,
        feasible: false,
        assignments: {},
        witnessMaxCost: Infinity,
        witnessSteps,
        failureIntervalId: activeInterval.id,
      };
    }

    const chosenNode = choice.node;
    const newlyCovered = choice.coveredIds;

    facilityNodeIds.push(chosenNode.id);

    for (const intervalId of newlyCovered) {
      coveredSet.add(intervalId);
    }

    witnessSteps.push({
      activeIntervalId: activeInterval.id,
      chosenFacilityId: chosenNode.id,
      chosenFacilityPosition: chosenNode.pathPosition,
      newlyCoveredIds: [...newlyCovered],
      coveredIdsAfterStep: [...coveredSet],
      facilityNodeIdsAfterStep: [...facilityNodeIds],
      explanation: buildExplanationForPlacement({
        activeInterval,
        chosenNode,
        newlyCovered,
        usedFacilities: facilityNodeIds.length,
        p,
        candidateCount: choice.candidateCount,
      }),
    });
  }

  const feasible = coveredSet.size === intervals.length && facilityNodeIds.length <= p;
  const assignments = feasible ? getAssignments(nodes, facilityNodeIds, distMatrix) : {};
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
    intervals,
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
      : intervals.find((interval) => !coveredSet.has(interval.id))?.id ?? null,
  };
}

export function generatePCenterFeasibilityTestSteps(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const p = Math.max(1, Math.min(params.p ?? 2, nodes.length));
  const lambdaValue = Math.max(0, params.lambdaValue ?? 30);

  const { orderedNodes, totalLength } = getOrderedPathData(graph);
  const intervals = buildDemandIntervals(orderedNodes, lambdaValue);

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
        totalLength,
        intervals,
        facilityPositions: [],
        activeIntervalId: null,
        chosenFacilityId: null,
      },
      explanation:
        `Initializing discrete λ-feasibility test for p-Center.\n` +
        `Given λ = ${lambdaValue}, convert each demand node into a feasible service interval on the path.\n` +
        `Then repeatedly take the leftmost uncovered interval and choose a node inside it that covers the most remaining intervals.`,
    })
  );

  const result = runPCenterFeasibilityTest(graph, { p, lambdaValue });

  result.witnessSteps.forEach((witnessStep, index) => {
    const partialAssignments = getAssignments(
      nodes,
      witnessStep.facilityNodeIdsAfterStep,
      distMatrix
    );

    steps.push(
      createSnapshot({
        type: STEP_TYPES.SELECT,
        phase: 'greedy_place_facility',
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
          totalLength,
          intervals,
          facilityPositions: buildFacilityPositions(
            orderedNodes,
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
          `The greedy test used ${result.facilityCount} facilities and still could not cover all demand intervals.`,
      })
    );
  }

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}