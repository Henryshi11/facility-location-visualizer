import { STEP_TYPES } from '../../config/stepTypes';
import { createSnapshot } from '../../core/snapshot';
import { computeCoveredNodes } from '../shared/assignments';

function buildScoreboard(candidates, bestId) {
  return candidates
    .slice()
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.id).localeCompare(String(b.id));
    })
    .map((item) => ({
      id: item.id,
      score: item.score,
      isBest: item.id === bestId,
    }));
}

export function generateSetCoverGreedySteps(graph, params = {}) {
  const { nodes, distMatrix } = graph;
  const radius = Math.max(1, params.radius ?? 30);

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
        total: nodes.length,
        radius,
      },
      explanation:
        `Initializing greedy covering.\n` +
        `Goal: cover all demand nodes using radius ${radius}.\n` +
        `Greedy rule: at each round, choose the facility that covers the most currently uncovered nodes.`,
    })
  );

  while (covered.length < nodes.length) {
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
          total: nodes.length,
          radius,
        },
        explanation:
          `A new covering round begins.\n` +
          `Currently covered: ${covered.length} of ${nodes.length} nodes.`,
      })
    );

    for (const node of nodes) {
      if (selected.includes(node.id)) continue;

      const trialSelected = [...selected, node.id];
      const trialCovered = computeCoveredNodes(nodes, trialSelected, distMatrix, radius);

      let newlyCoveredCount = 0;
      for (const id of trialCovered) {
        if (uncoveredSet.has(id)) newlyCoveredCount += 1;
      }

      candidates.push({
        id: node.id,
        score: newlyCoveredCount,
        covered: trialCovered,
      });

      const currentBest =
        candidates.reduce((best, item) => {
          if (!best) return item;
          if (item.score > best.score) return item;
          if (item.score === best.score) {
            return String(item.id).localeCompare(String(best.id)) < 0 ? item : best;
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
          scoreboard: buildScoreboard(candidates, currentBest),
          metrics: {
            coveredCount: covered.length,
            total: nodes.length,
            candidateGain: newlyCoveredCount,
            radius,
          },
          explanation:
            `Evaluate candidate ${node.id}.\n` +
            `It would newly cover ${newlyCoveredCount} currently uncovered node(s).`,
        })
      );
    }

    const bestCandidate = candidates.reduce((best, item) => {
      if (!best) return item;
      if (item.score > best.score) return item;
      if (item.score === best.score) {
        return String(item.id).localeCompare(String(best.id)) < 0 ? item : best;
      }
      return best;
    }, null);

    if (!bestCandidate || bestCandidate.score <= 0) {
      steps.push(
        createSnapshot({
          type: STEP_TYPES.NO_PROGRESS,
          phase: 'no_progress',
          selected: [...selected],
          covered: [...covered],
          scoreboard: buildScoreboard(candidates, null),
          metrics: {
            coveredCount: covered.length,
            total: nodes.length,
            radius,
          },
          explanation:
            `No candidate can cover any new node.\n` +
            `The greedy covering algorithm stops without full coverage.`,
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
        scoreboard: buildScoreboard(candidates, bestCandidate.id),
        metrics: {
          coveredCount: covered.length,
          total: nodes.length,
          radius,
        },
        explanation:
          `Select node ${bestCandidate.id} as a covering facility.\n` +
          `Covered nodes so far: ${covered.length}/${nodes.length}.`,
      })
    );
  }

  steps.push(
    createSnapshot({
      type: STEP_TYPES.FINISH,
      phase: 'finish',
      selected: [...selected],
      covered: [...covered],
      metrics: {
        coveredCount: covered.length,
        total: nodes.length,
        radius,
      },
      explanation:
        `Greedy covering finished.\n` +
        `Selected facilities: { ${selected.join(', ')} }.\n` +
        `Covered nodes: ${covered.length}/${nodes.length}.`,
    })
  );

  return steps.map((step, index) => ({
    ...step,
    stepIndex: index,
  }));
}