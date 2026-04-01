import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import {
  computeMaxAssignmentCost,
  getAssignments,
} from '../shared/assignments';

function combinations(array, k) {
  const result = [];

  function backtrack(start, current) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < array.length; i++) {
      current.push(array[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}

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

function buildScoreboard(entries, bestKey) {
  return entries
    .slice()
    .sort((a, b) => {
      if (a.feasible !== b.feasible) return a.feasible ? -1 : 1;
      if (a.maxCost !== b.maxCost) return a.maxCost - b.maxCost;
      return a.id.localeCompare(b.id);
    })
    .map((item) => ({
      id: item.id,
      score: item.maxCost,
      isBest: item.id === bestKey,
    }));
}

function comboLabel(combo) {
  return combo.join(', ');
}

function computeCoveredNodeIds(nodes, assignments, lambdaValue) {
  return nodes
    .filter((node) => {
      const cost = assignments[node.id]?.cost ?? Infinity;
      return cost <= lambdaValue;
    })
    .map((node) => node.id);
}

function buildFacilityPositions(orderedNodes, facilityNodeIds) {
  const posMap = new Map(
    orderedNodes.map((node) => [node.id, node.pathPosition])
  );

  return facilityNodeIds
    .map((id) => posMap.get(id))
    .filter((value) => Number.isFinite(value));
}

export function runPCenterFeasibilityTest(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const p = Math.max(1, Math.min(params.p ?? 2, nodes.length));
  const lambdaValue = Math.max(0, params.lambdaValue ?? 30);

  const { orderedNodes, totalLength } = getOrderedPathData(graph);
  const intervals = buildDemandIntervals(orderedNodes, lambdaValue);

  const nodeIds = nodes.map((node) => node.id);
  const combos = combinations(nodeIds, p);

  let bestWitnessCombo = null;
  let bestWitnessAssignments = {};
  let bestWitnessMaxCost = Infinity;
  let bestCoveredNodeIds = [];

  for (const combo of combos) {
    const assignments = getAssignments(nodes, combo, distMatrix);
    const maxCost = computeMaxAssignmentCost(nodes, assignments);

    if (maxCost <= lambdaValue) {
      const label = comboLabel(combo);

      if (
        !bestWitnessCombo ||
        maxCost < bestWitnessMaxCost ||
        (maxCost === bestWitnessMaxCost &&
          label.localeCompare(comboLabel(bestWitnessCombo)) < 0)
      ) {
        bestWitnessCombo = [...combo];
        bestWitnessAssignments = assignments;
        bestWitnessMaxCost = maxCost;
        bestCoveredNodeIds = computeCoveredNodeIds(nodes, assignments, lambdaValue);
      }
    }
  }

  const feasible = Boolean(bestWitnessCombo);
  const facilityNodeIds = bestWitnessCombo ?? [];
  const facilityPositions = buildFacilityPositions(orderedNodes, facilityNodeIds);

  return {
    p,
    lambdaValue,
    totalLength,
    orderedNodes,
    intervals,
    facilityNodeIds,
    facilityPositions,
    coveredNodeIds: bestCoveredNodeIds,
    facilityCount: facilityNodeIds.length,
    feasible,
    assignments: bestWitnessAssignments,
    witnessMaxCost: feasible ? bestWitnessMaxCost : Infinity,
    combos,
  };
}

export function generatePCenterFeasibilityTestSteps(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const p = Math.max(1, Math.min(params.p ?? 2, nodes.length));
  const lambdaValue = Math.max(0, params.lambdaValue ?? 30);

  const { orderedNodes, totalLength } = getOrderedPathData(graph);
  const intervals = buildDemandIntervals(orderedNodes, lambdaValue);

  const nodeIds = nodes.map((node) => node.id);
  const combos = combinations(nodeIds, p);

  const steps = [];
  const scoreboardEntries = [];

  let bestWitnessCombo = null;
  let bestWitnessAssignments = {};
  let bestWitnessMaxCost = Infinity;
  let bestCoveredNodeIds = [];

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
        facilityCount: p,
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
      },
      explanation:
        `Initializing discrete λ-feasibility test for p-Center.\n` +
        `Given λ = ${lambdaValue}, check whether there exists a size-${p} node set S such that max_i w_i d(i,S) ≤ λ.\n` +
        `This version uses exact checking over all size-${p} node combinations, so it is correct for small graphs.`,
    })
  );

  combos.forEach((combo, index) => {
    const assignments = getAssignments(nodes, combo, distMatrix);
    const maxCost = computeMaxAssignmentCost(nodes, assignments);
    const coveredNodeIds = computeCoveredNodeIds(nodes, assignments, lambdaValue);
    const feasible = maxCost <= lambdaValue;
    const label = comboLabel(combo);

    scoreboardEntries.push({
      id: label,
      maxCost,
      feasible,
    });

    steps.push(
      createSnapshot({
        type: STEP_TYPES.EVALUATE,
        phase: 'evaluate_combo',
        selected: [...combo],
        assignments,
        covered: coveredNodeIds,
        scoreboard: buildScoreboard(
          scoreboardEntries,
          bestWitnessCombo ? comboLabel(bestWitnessCombo) : null
        ),
        metrics: {
          p,
          lambdaValue,
          facilityCount: combo.length,
          coveredCount: coveredNodeIds.length,
          total: nodes.length,
          checked: index + 1,
          totalCombos: combos.length,
          maxCost,
          feasible,
        },
        overlays: {
          mode: 'pcenter_feasibility',
          totalLength,
          intervals,
          facilityPositions: buildFacilityPositions(orderedNodes, combo),
        },
        explanation:
          `Evaluate facility set { ${label} }.\n` +
          `Worst weighted assignment cost = ${Number.isFinite(maxCost) ? maxCost.toFixed(0) : '∞'}.\n` +
          `This candidate is ${feasible ? 'feasible' : 'not feasible'} for λ = ${lambdaValue}.`,
      })
    );

    if (
      feasible &&
      (!bestWitnessCombo ||
        maxCost < bestWitnessMaxCost ||
        (maxCost === bestWitnessMaxCost &&
          label.localeCompare(comboLabel(bestWitnessCombo)) < 0))
    ) {
      bestWitnessCombo = [...combo];
      bestWitnessAssignments = assignments;
      bestWitnessMaxCost = maxCost;
      bestCoveredNodeIds = [...coveredNodeIds];

      steps.push(
        createSnapshot({
          type: STEP_TYPES.UPDATE_BEST,
          phase: 'update_best_feasible',
          selected: [...bestWitnessCombo],
          assignments: bestWitnessAssignments,
          covered: bestCoveredNodeIds,
          scoreboard: buildScoreboard(
            scoreboardEntries,
            comboLabel(bestWitnessCombo)
          ),
          metrics: {
            p,
            lambdaValue,
            facilityCount: bestWitnessCombo.length,
            coveredCount: bestCoveredNodeIds.length,
            total: nodes.length,
            checked: index + 1,
            totalCombos: combos.length,
            maxCost: bestWitnessMaxCost,
            feasible: true,
          },
          overlays: {
            mode: 'pcenter_feasibility',
            totalLength,
            intervals,
            facilityPositions: buildFacilityPositions(
              orderedNodes,
              bestWitnessCombo
            ),
          },
          explanation:
            `New best feasible witness found: { ${comboLabel(bestWitnessCombo)} }.\n` +
            `Its worst weighted assignment cost is ${bestWitnessMaxCost.toFixed(0)}, which satisfies λ = ${lambdaValue}.`,
        })
      );
    }
  });

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      phase: 'finish',
      selected: bestWitnessCombo ?? [],
      assignments: bestWitnessAssignments,
      covered: bestCoveredNodeIds,
      scoreboard: buildScoreboard(
        scoreboardEntries,
        bestWitnessCombo ? comboLabel(bestWitnessCombo) : null
      ),
      metrics: {
        p,
        lambdaValue,
        facilityCount: bestWitnessCombo ? bestWitnessCombo.length : p,
        coveredCount: bestCoveredNodeIds.length,
        total: nodes.length,
        checked: combos.length,
        totalCombos: combos.length,
        maxCost: bestWitnessCombo ? bestWitnessMaxCost : Infinity,
        feasible: Boolean(bestWitnessCombo),
      },
      overlays: {
        mode: 'pcenter_feasibility',
        totalLength,
        intervals,
        facilityPositions: bestWitnessCombo
          ? buildFacilityPositions(orderedNodes, bestWitnessCombo)
          : [],
      },
      explanation: bestWitnessCombo
        ? `Feasibility test finished.\nλ = ${lambdaValue} is feasible.\nOne best witness is { ${comboLabel(bestWitnessCombo)} } with worst weighted assignment cost ${bestWitnessMaxCost.toFixed(0)}.`
        : `Feasibility test finished.\nλ = ${lambdaValue} is not feasible.\nNo size-${p} node set achieves max_i w_i d(i,S) ≤ ${lambdaValue}.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}