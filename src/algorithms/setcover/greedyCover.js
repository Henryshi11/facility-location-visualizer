import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';

export function generateSetCoverGreedySteps(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const radius = Math.max(1, params.radius ?? 30);

  const steps = [];
  const selected = [];
  const coveredIds = new Set();
  let unselected = nodes.map((n) => n.id);

  steps.push(
    createSnapshot({
      type: STEP_TYPES.INIT,
      selected: [],
      evaluating: null,
      covered: [],
      evalCovered: [],
      scoreboard: [],
      metrics: {
        coveredCount: 0,
        total: nodes.length,
        radius,
      },
      explanation:
        `Initializing greedy Set Covering.\n` +
        `Goal: cover all nodes within radius ${radius} using as few facilities as possible.\n` +
        `Heuristic note: this is a greedy teaching algorithm, not an exact solver.`,
    })
  );

  let round = 1;

  while (coveredIds.size < nodes.length && unselected.length > 0) {
    let bestCandidate = null;
    let bestNewlyCovered = [];
    let currentScoreboard = [];

    steps.push(
      createSnapshot({
        type: STEP_TYPES.ROUND_START,
        selected: [...selected],
        evaluating: null,
        covered: Array.from(coveredIds),
        evalCovered: [],
        scoreboard: [],
        metrics: {
          coveredCount: coveredIds.size,
          total: nodes.length,
          radius,
          round,
        },
        explanation:
          `--- Round ${round} ---\n` +
          `Scan every remaining node as a candidate facility.\n` +
          `Choose the node that covers the most currently uncovered nodes within radius ${radius}.`,
      })
    );

    for (const candidateId of unselected) {
      const newlyCovered = nodes.filter(
        (node) =>
          !coveredIds.has(node.id) && distMatrix[candidateId][node.id] <= radius
      );

      currentScoreboard.push({
        id: candidateId,
        score: newlyCovered.length,
        isBest: false,
      });

      if (newlyCovered.length > bestNewlyCovered.length) {
        bestNewlyCovered = newlyCovered;
        bestCandidate = candidateId;
      }

      currentScoreboard = currentScoreboard.map((item) => ({
        ...item,
        isBest: item.id === bestCandidate,
      }));

      steps.push(
        createSnapshot({
          type: STEP_TYPES.EVALUATE,
          selected: [...selected],
          evaluating: candidateId,
          covered: Array.from(coveredIds),
          evalCovered: newlyCovered.map((n) => n.id),
          scoreboard: [...currentScoreboard],
          metrics: {
            coveredCount: coveredIds.size + newlyCovered.length,
            total: nodes.length,
            radius,
            round,
          },
          explanation:
            `Evaluating node ${candidateId}.\n` +
            `It would newly cover ${newlyCovered.length} uncovered node(s) within radius ${radius}.`,
        })
      );
    }

    if (bestNewlyCovered.length === 0) {
      steps.push(
        createSnapshot({
          type: STEP_TYPES.NO_PROGRESS,
          selected: [...selected],
          evaluating: null,
          covered: Array.from(coveredIds),
          evalCovered: [],
          scoreboard: [...currentScoreboard],
          metrics: {
            coveredCount: coveredIds.size,
            total: nodes.length,
            radius,
            round,
          },
          explanation:
            `No remaining candidate can cover any new uncovered node within radius ${radius}.\n` +
            `The greedy process stops here.`,
        })
      );
      break;
    }

    steps.push(
      createSnapshot({
        type: STEP_TYPES.ROUND_SUMMARY,
        selected: [...selected],
        evaluating: bestCandidate,
        covered: Array.from(coveredIds),
        evalCovered: bestNewlyCovered.map((n) => n.id),
        scoreboard: [...currentScoreboard],
        metrics: {
          coveredCount: coveredIds.size + bestNewlyCovered.length,
          total: nodes.length,
          radius,
          round,
        },
        explanation:
          `Round ${round} complete.\n` +
          `Best candidate: ${bestCandidate}.\n` +
          `It covers ${bestNewlyCovered.length} new node(s).`,
      })
    );

    selected.push(bestCandidate);
    bestNewlyCovered.forEach((node) => coveredIds.add(node.id));
    unselected = unselected.filter((id) => id !== bestCandidate);

    steps.push(
      createSnapshot({
        type: STEP_TYPES.SELECT,
        selected: [...selected],
        evaluating: null,
        covered: Array.from(coveredIds),
        evalCovered: [],
        scoreboard: [...currentScoreboard],
        metrics: {
          coveredCount: coveredIds.size,
          total: nodes.length,
          radius,
          round,
        },
        explanation:
          `Lock in node ${bestCandidate} as a covering facility.\n` +
          `Covered nodes so far: ${coveredIds.size}/${nodes.length}.`,
      })
    );

    round += 1;
  }

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      selected: [...selected],
      evaluating: null,
      covered: Array.from(coveredIds),
      evalCovered: [],
      scoreboard: [],
      metrics: {
        coveredCount: coveredIds.size,
        total: nodes.length,
        radius,
      },
      explanation:
        coveredIds.size === nodes.length
          ? `Greedy Set Covering finished.\nAll nodes are covered using ${selected.length} facility(ies).`
          : `Greedy Set Covering stopped.\nCovered ${coveredIds.size}/${nodes.length} nodes using ${selected.length} facility(ies).`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}