import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import {
  computeCoveredDemandWeight,
  computeCoveredNodes,
  computeLambdaServiceCost,
  getAssignments,
} from '../shared/assignments';

function buildScoreboard(candidates, bestId) {
  return candidates
    .slice()
    .sort((a, b) => {
      if (b.coveredWeight !== a.coveredWeight) return b.coveredWeight - a.coveredWeight;
      if (a.serviceCost !== b.serviceCost) return a.serviceCost - b.serviceCost;
      return String(a.id).localeCompare(String(b.id));
    })
    .map((item) => ({
      id: `${item.id} (w=${item.coveredWeight}, c=${Number.isFinite(item.serviceCost) ? item.serviceCost.toFixed(0) : '∞'})`,
      score: item.coveredWeight,
      isBest: item.id === bestId,
    }));
}

export function generateSetCoverGreedySteps(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const lambdaValue = Math.max(1, params.lambdaValue ?? params.radius ?? 30);

  const steps = [];
  const selected = [];
  let covered = [];

  steps.push(
    createSnapshot({
      type: STEP_TYPES.INIT,
      phase: 'init',
      selected: [],
      covered: [],
      scoreboard: [],
      metrics: {
        coveredCount: 0,
        coveredDemandWeight: 0,
        total: nodes.length,
        lambda: lambdaValue,
      },
      explanation:
        `Initializing greedy λ-covering.\n` +
        `Coverage rule: each node must lie within λ = ${lambdaValue} of some chosen facility.\n` +
        `Primary goal: achieve full cover with as few facilities as possible.\n` +
        `Greedy rule: choose the facility that covers the most uncovered demand weight; break ties by smaller weighted service cost.`,
    })
  );

  let round = 0;

  while (covered.length < nodes.length) {
    round += 1;

    const uncoveredSet = new Set(nodes.map((n) => n.id).filter((id) => !covered.includes(id)));
    const candidates = [];

    steps.push(
      createSnapshot({
        type: STEP_TYPES.ROUND_START,
        phase: 'round_start',
        selected: [...selected],
        covered: [...covered],
        scoreboard: [],
        metrics: {
          coveredCount: covered.length,
          coveredDemandWeight: computeCoveredDemandWeight(nodes, covered),
          total: nodes.length,
          lambda: lambdaValue,
          round,
        },
        explanation:
          `--- Covering round ${round} ---\n` +
          `Currently covered: ${covered.length} of ${nodes.length} nodes.`,
      })
    );

    for (const node of nodes) {
      if (selected.includes(node.id)) continue;

      const trialSelected = [...selected, node.id];
      const trialCovered = computeCoveredNodes(nodes, trialSelected, distMatrix, lambdaValue);
      const trialAssignments = getAssignments(nodes, trialSelected, distMatrix);

      let newlyCoveredWeight = 0;
      for (const coveredId of trialCovered) {
        if (uncoveredSet.has(coveredId)) {
          const coveredNode = nodes.find((n) => n.id === coveredId);
          newlyCoveredWeight += coveredNode?.weight ?? 1;
        }
      }

      const serviceCost = computeLambdaServiceCost(nodes, trialAssignments, lambdaValue);

      candidates.push({
        id: node.id,
        coveredWeight: newlyCoveredWeight,
        serviceCost,
        covered: trialCovered,
        assignments: trialAssignments,
      });

      const currentBest =
        candidates.reduce((best, item) => {
          if (!best) return item;
          if (item.coveredWeight > best.coveredWeight) return item;
          if (item.coveredWeight === best.coveredWeight) {
            if (item.serviceCost < best.serviceCost) return item;
            if (item.serviceCost === best.serviceCost) {
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
          covered: [...covered],
          evalCovered: trialCovered,
          assignments: trialAssignments,
          scoreboard: buildScoreboard(candidates, currentBest),
          metrics: {
            coveredCount: covered.length,
            coveredDemandWeight: computeCoveredDemandWeight(nodes, covered),
            total: nodes.length,
            candidateCoveredWeight: newlyCoveredWeight,
            candidateServiceCost: serviceCost,
            lambda: lambdaValue,
            round,
          },
          explanation:
            `Evaluate candidate ${node.id}.\n` +
            `It would newly cover demand weight ${newlyCoveredWeight}.\n` +
            `Tie-break weighted service cost = ${Number.isFinite(serviceCost) ? serviceCost.toFixed(0) : '∞'}.`,
        })
      );
    }

    const bestCandidate = candidates.reduce((best, item) => {
      if (!best) return item;
      if (item.coveredWeight > best.coveredWeight) return item;
      if (item.coveredWeight === best.coveredWeight) {
        if (item.serviceCost < best.serviceCost) return item;
        if (item.serviceCost === best.serviceCost) {
          return String(item.id).localeCompare(String(best.id)) < 0 ? item : best;
        }
      }
      return best;
    }, null);

    if (!bestCandidate || bestCandidate.coveredWeight <= 0) {
      steps.push(
        createSnapshot({
          type: STEP_TYPES.NO_PROGRESS,
          phase: 'no_progress',
          selected: [...selected],
          covered: [...covered],
          scoreboard: buildScoreboard(candidates, null),
          metrics: {
            coveredCount: covered.length,
            coveredDemandWeight: computeCoveredDemandWeight(nodes, covered),
            total: nodes.length,
            lambda: lambdaValue,
            round,
          },
          explanation:
            `No candidate can cover any new demand weight.\n` +
            `The greedy λ-covering algorithm stops without full coverage.`,
        })
      );
      break;
    }

    selected.push(bestCandidate.id);
    covered = [...bestCandidate.covered];

    steps.push(
      createSnapshot({
        type: STEP_TYPES.SELECT,
        phase: 'select_candidate',
        selected: [...selected],
        currentBest: bestCandidate.id,
        covered: [...covered],
        assignments: bestCandidate.assignments,
        scoreboard: buildScoreboard(candidates, bestCandidate.id),
        metrics: {
          coveredCount: covered.length,
          coveredDemandWeight: computeCoveredDemandWeight(nodes, covered),
          total: nodes.length,
          lambda: lambdaValue,
          serviceCost: bestCandidate.serviceCost,
          round,
        },
        explanation:
          `Select node ${bestCandidate.id} as a covering facility.\n` +
          `Covered nodes so far: ${covered.length}/${nodes.length}.\n` +
          `Covered demand weight so far: ${computeCoveredDemandWeight(nodes, covered)}.`,
      })
    );
  }

  const finalAssignments = getAssignments(nodes, selected, distMatrix);
  const finalServiceCost =
    covered.length === nodes.length
      ? computeLambdaServiceCost(nodes, finalAssignments, lambdaValue)
      : Infinity;

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      phase: 'finish',
      selected: [...selected],
      covered: [...covered],
      assignments: finalAssignments,
      metrics: {
        coveredCount: covered.length,
        coveredDemandWeight: computeCoveredDemandWeight(nodes, covered),
        total: nodes.length,
        lambda: lambdaValue,
        facilityCount: selected.length,
        serviceCost: finalServiceCost,
      },
      explanation:
        `Greedy λ-covering finished.\n` +
        `Selected facilities: { ${selected.join(', ')} }.\n` +
        `Covered nodes: ${covered.length}/${nodes.length}.\n` +
        `Facility count: ${selected.length}.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}