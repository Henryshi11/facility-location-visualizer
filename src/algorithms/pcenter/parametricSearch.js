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
        low: 0,
        high: candidateValues.length - 1,
        mid: null,
      },
      overlays: {
        candidateValues,
      },
      explanation:
        `Initializing binary-search parametric search for discrete p-Center.\n` +
        `Candidate λ values are generated from weighted node-to-node costs w_i d(i,j).\n` +
        `Because feasibility is monotone in λ, we binary search for the smallest feasible λ in the node-restricted model.`,
    })
  );

  let low = 0;
  let high = candidateValues.length - 1;
  let bestResult = null;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const lambdaValue = candidateValues[mid];
    const feasibility = runPCenterFeasibilityTest(graph, { p, lambdaValue });

    const decision = feasibility.feasible ? 'move_left' : 'move_right';

    steps.push(
      createSnapshot({
        type: STEP_TYPES.EVALUATE,
        phase: 'binary_search_test',
        selected: feasibility.facilityNodeIds,
        covered: feasibility.coveredNodeIds,
        assignments: feasibility.assignments,
        metrics: {
          p,
          low,
          mid,
          high,
          candidateCount: candidateValues.length,
          candidateIndex: mid,
          lambdaValue,
          facilityCount: feasibility.facilityCount,
          feasible: feasibility.feasible,
          decision,
        },
        overlays: {
          mode: 'pcenter_feasibility',
          totalLength: feasibility.totalLength,
          intervals: feasibility.intervals,
          facilityPositions: feasibility.facilityPositions,
          activeIntervalId: feasibility.failureIntervalId,
          candidateValues,
        },
        explanation:
          `Binary-search test at index ${mid} with λ = ${lambdaValue}.\n` +
          `Discrete feasibility result: ${feasibility.feasible ? 'feasible' : 'infeasible'}.\n` +
          (
            feasibility.feasible
              ? `Since λ is feasible, continue searching the left half for a smaller feasible value.`
              : `Since λ is infeasible, continue searching the right half for a larger value.`
          ),
      })
    );

    if (feasibility.feasible) {
      bestResult = feasibility;

      steps.push(
        createSnapshot({
          type: STEP_TYPES.UPDATE_BEST,
          phase: 'update_best_lambda',
          selected: feasibility.facilityNodeIds,
          covered: feasibility.coveredNodeIds,
          assignments: feasibility.assignments,
          metrics: {
            p,
            low,
            mid,
            high,
            lambdaValue,
            candidateIndex: mid,
            facilityCount: feasibility.facilityCount,
            feasible: true,
            decision: 'record_and_move_left',
          },
          overlays: {
            mode: 'pcenter_feasibility',
            totalLength: feasibility.totalLength,
            intervals: feasibility.intervals,
            facilityPositions: feasibility.facilityPositions,
            activeIntervalId: null,
            candidateValues,
          },
          explanation:
            `Current λ = ${lambdaValue} is feasible in the discrete model, so record it as the best answer so far.\n` +
            `Continue searching left to check whether an even smaller feasible λ exists.`,
        })
      );

      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      phase: 'finish',
      selected: bestResult?.facilityNodeIds ?? [],
      covered: bestResult?.coveredNodeIds ?? [],
      assignments: bestResult?.assignments ?? {},
      metrics: {
        p,
        optimalLambda: bestResult?.lambdaValue ?? null,
        facilityCount: bestResult?.facilityCount ?? null,
        low,
        high,
      },
      overlays: bestResult
        ? {
            mode: 'pcenter_feasibility',
            totalLength: bestResult.totalLength,
            intervals: bestResult.intervals,
            facilityPositions: bestResult.facilityPositions,
            candidateValues,
          }
        : {
            candidateValues,
          },
      explanation:
        bestResult
          ? `Binary search finished.\nOptimal discrete λ = ${bestResult.lambdaValue}.\nOne discrete greedy-feasible facility set is { ${bestResult.facilityNodeIds.join(', ')} }.`
          : `Binary search finished, but no feasible candidate λ was found.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}