import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import { runPCenterFeasibilityTest } from './feasibilityTest';

function getOrderedPathData(graph) {
  const { nodes, edges } = graph;
  const orderedNodes = [...nodes].sort((a, b) => String(a.id).localeCompare(String(b.id)));

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

// From the lecture note idea:
// for a pair (i, j), solve wi (x - xi) = wj (xj - x), then λ = wi (x - xi)
function generateCandidateValues(graph) {
  const { orderedNodes } = getOrderedPathData(graph);
  const candidates = new Set([0]);

  for (let i = 0; i < orderedNodes.length; i++) {
    for (let j = i + 1; j < orderedNodes.length; j++) {
      const left = orderedNodes[i];
      const right = orderedNodes[j];

      const wi = left.weight ?? 1;
      const wj = right.weight ?? 1;
      const xi = left.pathPosition;
      const xj = right.pathPosition;

      const lambda = (wi * wj * (xj - xi)) / (wi + wj);
      if (Number.isFinite(lambda) && lambda >= 0) {
        candidates.add(Number(lambda.toFixed(6)));
      }
    }
  }

  return [...candidates].sort((a, b) => a - b);
}

export function generatePCenterParametricSearchSteps(graph, params = {}) {
  const p = Math.max(1, params.p ?? 2);
  const candidateValues = generateCandidateValues(graph);

  const steps = [];

  steps.push(
    createSnapshot({
      type: STEP_TYPES.INIT,
      phase: 'init',
      metrics: {
        p,
        candidateCount: candidateValues.length,
      },
      explanation:
        `Initializing p-Center parametric search.\n` +
        `First generate a finite candidate set of λ values from pairs of path vertices.\n` +
        `Then binary search the sorted candidate list using the λ-feasibility test.`,
    })
  );

  let low = 0;
  let high = candidateValues.length - 1;
  let bestResult = null;
  let iteration = 0;

  while (low <= high) {
    iteration += 1;
    const mid = Math.floor((low + high) / 2);
    const lambdaValue = candidateValues[mid];

    const feasibility = runPCenterFeasibilityTest(graph, { p, lambdaValue });

    steps.push(
      createSnapshot({
        type: STEP_TYPES.EVALUATE,
        phase: 'test_lambda',
        covered: feasibility.coveredNodeIds,
        metrics: {
          p,
          iteration,
          low,
          high,
          mid,
          lambdaValue,
          facilityCount: feasibility.facilityCount,
          feasible: feasibility.feasible,
        },
        overlays: {
          mode: 'pcenter_feasibility',
          totalLength: feasibility.totalLength,
          intervals: feasibility.intervals,
          properIntervals: feasibility.properIntervals,
          facilityPositions: feasibility.facilityPositions,
        },
        explanation:
          `Binary-search iteration ${iteration}.\n` +
          `Test candidate λ = ${lambdaValue}.\n` +
          `The feasibility test uses ${feasibility.facilityCount} facilities, so this λ is ${feasibility.feasible ? 'feasible' : 'not feasible'}.`,
      })
    );

    if (feasibility.feasible) {
      bestResult = feasibility;
      high = mid - 1;

      steps.push(
        createSnapshot({
          type: STEP_TYPES.UPDATE_BEST,
          phase: 'update_upper_bound',
          covered: feasibility.coveredNodeIds,
          metrics: {
            p,
            iteration,
            lambdaValue,
            facilityCount: feasibility.facilityCount,
            nextLow: low,
            nextHigh: high,
          },
          overlays: {
            mode: 'pcenter_feasibility',
            totalLength: feasibility.totalLength,
            intervals: feasibility.intervals,
            properIntervals: feasibility.properIntervals,
            facilityPositions: feasibility.facilityPositions,
          },
          explanation:
            `This λ is feasible, so move left to search for a smaller feasible value.\n` +
            `Current best upper bound is λ = ${lambdaValue}.`,
        })
      );
    } else {
      low = mid + 1;

      steps.push(
        createSnapshot({
          type: STEP_TYPES.NO_PROGRESS,
          phase: 'raise_lower_bound',
          covered: feasibility.coveredNodeIds,
          metrics: {
            p,
            iteration,
            lambdaValue,
            facilityCount: feasibility.facilityCount,
            nextLow: low,
            nextHigh: high,
          },
          overlays: {
            mode: 'pcenter_feasibility',
            totalLength: feasibility.totalLength,
            intervals: feasibility.intervals,
            properIntervals: feasibility.properIntervals,
            facilityPositions: feasibility.facilityPositions,
          },
          explanation:
            `This λ is not feasible, so move right to search for a larger value.`,
        })
      );
    }
  }

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      phase: 'finish',
      covered: bestResult?.coveredNodeIds ?? [],
      metrics: {
        p,
        optimalLambda: bestResult?.lambdaValue ?? null,
        facilityCount: bestResult?.facilityCount ?? null,
      },
      overlays: bestResult
        ? {
            mode: 'pcenter_feasibility',
            totalLength: bestResult.totalLength,
            intervals: bestResult.intervals,
            properIntervals: bestResult.properIntervals,
            facilityPositions: bestResult.facilityPositions,
          }
        : {},
      explanation:
        bestResult
          ? `Parametric search finished.\nSmallest feasible candidate λ found: ${bestResult.lambdaValue}.\nFacilities used by the final feasibility test: ${bestResult.facilityCount}.`
          : `Parametric search finished, but no feasible candidate λ was found.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}