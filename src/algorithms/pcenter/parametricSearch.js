import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import { getDistance } from '../shared/distance';
import { runPCenterFeasibilityTest } from './feasibilityTest';

function generateDiscreteCandidateValues(graph) {
  const { nodes, distMatrix } = graph;
  const candidates = new Set([0]);

  for (const demand of nodes) {
    const wi = demand.weight ?? 1;

    for (const facility of nodes) {
      const d = getDistance(distMatrix, demand.id, facility.id);
      const lambda = wi * d;

      if (Number.isFinite(lambda) && lambda >= 0) {
        candidates.add(Number(lambda.toFixed(6)));
      }
    }
  }

  return [...candidates].sort((a, b) => a - b);
}

export function generatePCenterParametricSearchSteps(graph, params = {}) {
  const nodeCount = graph?.nodes?.length ?? 0;
  const p = Math.max(1, Math.min(params.p ?? 2, nodeCount));
  const candidateValues = generateDiscreteCandidateValues(graph);

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
        `Initializing discrete p-Center candidate search.\n` +
        `Candidate λ values are generated from weighted node-to-node costs w_i d(i,j).\n` +
        `For correctness, this version scans candidates from small to large and stops at the first feasible λ.`,
    })
  );

  let bestResult = null;

  for (let index = 0; index < candidateValues.length; index++) {
    const lambdaValue = candidateValues[index];
    const feasibility = runPCenterFeasibilityTest(graph, { p, lambdaValue });

    steps.push(
      createSnapshot({
        type: STEP_TYPES.EVALUATE,
        phase: 'test_lambda',
        selected: feasibility.facilityNodeIds,
        covered: feasibility.coveredNodeIds,
        metrics: {
          p,
          candidateIndex: index + 1,
          candidateCount: candidateValues.length,
          lambdaValue,
          facilityCount: feasibility.facilityCount,
          feasible: feasibility.feasible,
        },
        overlays: {
          mode: 'pcenter_feasibility',
          totalLength: feasibility.totalLength,
          intervals: feasibility.intervals,
          facilityPositions: feasibility.facilityPositions,
        },
        explanation:
          `Testing candidate λ = ${lambdaValue}.\n` +
          `Facilities used by feasibility test: ${feasibility.facilityCount}.\n` +
          `Result: ${feasibility.feasible ? 'feasible' : 'not feasible'}.`,
      })
    );

    if (feasibility.feasible) {
      bestResult = feasibility;

      steps.push(
        createSnapshot({
          type: STEP_TYPES.UPDATE_BEST,
          phase: 'first_feasible_found',
          selected: feasibility.facilityNodeIds,
          covered: feasibility.coveredNodeIds,
          metrics: {
            p,
            lambdaValue,
            facilityCount: feasibility.facilityCount,
            candidateIndex: index + 1,
          },
          overlays: {
            mode: 'pcenter_feasibility',
            totalLength: feasibility.totalLength,
            intervals: feasibility.intervals,
            facilityPositions: feasibility.facilityPositions,
          },
          explanation:
            `This is the first feasible candidate in sorted order, so it is the optimal discrete λ.`,
        })
      );

      break;
    }
  }

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      phase: 'finish',
      selected: bestResult?.facilityNodeIds ?? [],
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
            facilityPositions: bestResult.facilityPositions,
          }
        : {},
      explanation:
        bestResult
          ? `Candidate search finished.\nOptimal discrete λ = ${bestResult.lambdaValue}.\nOne feasible facility set found: { ${bestResult.facilityNodeIds.join(', ')} }.`
          : `Candidate search finished, but no feasible candidate λ was found.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}