import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';

function getOrderedPathData(graph) {
  const { nodes, edges } = graph;
  const orderedNodes = [...nodes].sort((a, b) =>
    String(a.id).localeCompare(String(b.id))
  );

  const edgeLengthMap = new Map();
  for (const edge of edges) {
    const key1 = `${edge.u}::${edge.v}`;
    const key2 = `${edge.v}::${edge.u}`;
    edgeLengthMap.set(key1, edge.length ?? 1);
    edgeLengthMap.set(key2, edge.length ?? 1);
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

function buildIntervals(orderedNodes, lambdaValue) {
  return orderedNodes.map((node) => {
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
  });
}

// Keep intervals ordered by right endpoint.
// For visualization, we also remove intervals that are fully contained
// in a later-processed “better” interval with smaller/equal right endpoint.
function buildProperIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => {
    if (a.right !== b.right) return a.right - b.right;
    if (a.left !== b.left) return a.left - b.left;
    return String(a.id).localeCompare(String(b.id));
  });

  const proper = [];
  let bestLeftSoFar = Infinity;

  for (const interval of sorted) {
    if (interval.left >= bestLeftSoFar) {
      continue;
    }
    proper.push(interval);
    bestLeftSoFar = interval.left;
  }

  return proper;
}

function computeCoveredNodeIds(intervals, facilityPositions) {
  return intervals
    .filter((interval) =>
      facilityPositions.some(
        (facilityPos) =>
          facilityPos >= interval.left && facilityPos <= interval.right
      )
    )
    .map((interval) => interval.id);
}

function buildIntervalScoreboard(intervals, coveredSet) {
  return intervals.map((interval) => ({
    id: interval.id,
    score: interval.right - interval.left,
    isBest: coveredSet.has(interval.id),
  }));
}

function simulateGreedyPlacements(intervals, properIntervals) {
  const placements = [];
  const facilityPositions = [];
  let nextIndex = 0;

  while (nextIndex < properIntervals.length) {
    const anchor = properIntervals[nextIndex];
    const facilityPos = anchor.right;

    facilityPositions.push(facilityPos);

    const coveredThisRound = [];
    let scanIndex = nextIndex;

    while (
      scanIndex < properIntervals.length &&
      facilityPos >= properIntervals[scanIndex].left &&
      facilityPos <= properIntervals[scanIndex].right
    ) {
      coveredThisRound.push(properIntervals[scanIndex].id);
      scanIndex += 1;
    }

    placements.push({
      anchorIntervalId: anchor.id,
      facilityPos,
      coveredProperIntervalIds: coveredThisRound,
      facilityPositions: [...facilityPositions],
      coveredNodeIds: computeCoveredNodeIds(intervals, facilityPositions),
    });

    nextIndex = scanIndex;
  }

  return placements;
}

export function runPCenterFeasibilityTest(graph, params = {}) {
  const p = Math.max(1, params.p ?? 2);
  const lambdaValue = Math.max(0, params.lambdaValue ?? 30);

  const { orderedNodes, totalLength } = getOrderedPathData(graph);
  const intervals = buildIntervals(orderedNodes, lambdaValue);
  const properIntervals = buildProperIntervals(intervals);

  const placementSteps = simulateGreedyPlacements(intervals, properIntervals);
  const facilityPositions =
    placementSteps.length > 0
      ? placementSteps[placementSteps.length - 1].facilityPositions
      : [];
  const coveredNodeIds = computeCoveredNodeIds(intervals, facilityPositions);
  const feasible = facilityPositions.length <= p;

  return {
    p,
    lambdaValue,
    totalLength,
    orderedNodes,
    intervals,
    properIntervals,
    placementSteps,
    facilityPositions,
    coveredNodeIds,
    facilityCount: facilityPositions.length,
    feasible,
  };
}

export function generatePCenterFeasibilityTestSteps(graph, params = {}) {
  const result = runPCenterFeasibilityTest(graph, params);

  const {
    p,
    lambdaValue,
    totalLength,
    intervals,
    properIntervals,
    placementSteps,
    coveredNodeIds,
    facilityCount,
    feasible,
  } = result;

  const steps = [];

  steps.push(
    createSnapshot({
      type: STEP_TYPES.INIT,
      phase: 'init',
      selected: [],
      covered: [],
      metrics: {
        p,
        lambdaValue,
        facilityCount: 0,
        coveredCount: 0,
        total: intervals.length,
      },
      overlays: {
        mode: 'pcenter_feasibility',
        totalLength,
        intervals,
        properIntervals: [],
        facilityPositions: [],
      },
      explanation:
        `Initializing λ-feasibility test for p-Center on a path.\n` +
        `Given λ = ${lambdaValue} and p = ${p}, compute intervals I_i(λ) where each node must be covered.\n` +
        `Then use the greedy interval stabbing rule: place a facility at the right endpoint of the next interval.`,
    })
  );

  placementSteps.forEach((placement, index) => {
    const coveredSet = new Set(placement.coveredNodeIds);

    steps.push(
      createSnapshot({
        type: STEP_TYPES.SELECT,
        phase: 'place_facility',
        selected: [],
        covered: placement.coveredNodeIds,
        scoreboard: buildIntervalScoreboard(intervals, coveredSet),
        metrics: {
          p,
          lambdaValue,
          facilityCount: placement.facilityPositions.length,
          coveredCount: placement.coveredNodeIds.length,
          total: intervals.length,
          round: index + 1,
        },
        overlays: {
          mode: 'pcenter_feasibility',
          totalLength,
          intervals,
          properIntervals,
          facilityPositions: placement.facilityPositions,
          activeIntervalId: placement.anchorIntervalId,
          coveredProperIntervalIds: placement.coveredProperIntervalIds,
        },
        explanation:
          `Greedy step ${index + 1}.\n` +
          `Take the next uncovered interval in right-endpoint order and place a facility at its right endpoint.\n` +
          `This placement is anchored by interval ${placement.anchorIntervalId}.`,
      })
    );
  });

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      phase: 'finish',
      selected: [],
      covered: coveredNodeIds,
      scoreboard: buildIntervalScoreboard(intervals, new Set(coveredNodeIds)),
      metrics: {
        p,
        lambdaValue,
        facilityCount,
        coveredCount: coveredNodeIds.length,
        total: intervals.length,
        feasible,
      },
      overlays: {
        mode: 'pcenter_feasibility',
        totalLength,
        intervals,
        properIntervals,
        facilityPositions:
          placementSteps.length > 0
            ? placementSteps[placementSteps.length - 1].facilityPositions
            : [],
      },
      explanation:
        `Feasibility test finished.\n` +
        `Facilities needed = ${facilityCount}.\n` +
        `Since ${facilityCount} ${facilityCount <= p ? '≤' : '>'} ${p}, this λ is ${feasible ? 'feasible' : 'not feasible'}.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}