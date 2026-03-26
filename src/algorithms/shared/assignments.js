import { getDistance } from './distance';

export function getAssignments(nodes, selectedFacilities, distMatrix) {
  const assignments = {};

  if (!selectedFacilities || selectedFacilities.length === 0) {
    return assignments;
  }

  for (const node of nodes) {
    let bestFacility = null;
    let bestDistance = Infinity;

    for (const facilityId of selectedFacilities) {
      const d = getDistance(distMatrix, node.id, facilityId);

      if (d < bestDistance) {
        bestDistance = d;
        bestFacility = facilityId;
      } else if (d === bestDistance && bestFacility !== null) {
        if (String(facilityId).localeCompare(String(bestFacility)) < 0) {
          bestFacility = facilityId;
        }
      }
    }

    assignments[node.id] = {
      facility: bestFacility,
      distance: bestDistance,
      cost: (node.weight ?? 1) * bestDistance,
    };
  }

  return assignments;
}

export function computeWeightedObjective(nodes, assignments) {
  let total = 0;

  for (const node of nodes) {
    const distance = assignments[node.id]?.distance ?? Infinity;
    total += (node.weight ?? 1) * distance;
  }

  return total;
}

// p-median files already import this name, so export it explicitly.
export function computeTotalAssignmentCost(nodes, assignments) {
  return computeWeightedObjective(nodes, assignments);
}

export function computeMaxAssignmentDistance(nodes, assignments) {
  let maxDistance = 0;

  for (const node of nodes) {
    const distance = assignments[node.id]?.distance ?? Infinity;
    if (distance > maxDistance) {
      maxDistance = distance;
    }
  }

  return maxDistance;
}

export function computeMaxAssignmentCost(nodes, assignments) {
  let maxCost = 0;

  for (const node of nodes) {
    const cost = assignments[node.id]?.cost ?? Infinity;
    if (cost > maxCost) {
      maxCost = cost;
    }
  }

  return maxCost;
}

export function computeCostCoveredNodes(nodes, assignments, lambdaValue) {
  const covered = [];

  for (const node of nodes) {
    const cost = assignments[node.id]?.cost ?? Infinity;
    if (cost <= lambdaValue) {
      covered.push(node.id);
    }
  }

  return covered;
}

export function isCostCoverFeasible(nodes, assignments, lambdaValue) {
  for (const node of nodes) {
    const cost = assignments[node.id]?.cost ?? Infinity;
    if (cost > lambdaValue) {
      return false;
    }
  }
  return true;
}