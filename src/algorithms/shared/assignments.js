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

export function computeNodeAssignmentCost(node, assignments) {
  const distance = assignments[node.id]?.distance ?? Infinity;
  return (node.weight ?? 1) * distance;
}

export function computeTotalAssignmentCost(nodes, assignments) {
  let total = 0;

  for (const node of nodes) {
    total += computeNodeAssignmentCost(node, assignments);
  }

  return total;
}

export function computeWeightedObjective(nodes, assignments) {
  return computeTotalAssignmentCost(nodes, assignments);
}

export function computeMaxAssignmentCost(nodes, assignments) {
  let maxCost = 0;

  for (const node of nodes) {
    const cost = computeNodeAssignmentCost(node, assignments);
    if (cost > maxCost) {
      maxCost = cost;
    }
  }

  return maxCost;
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

export function computeCoveredNodes(nodes, selectedFacilities, distMatrix, lambdaValue) {
  const covered = [];

  for (const node of nodes) {
    let isCovered = false;

    for (const facilityId of selectedFacilities) {
      const d = getDistance(distMatrix, node.id, facilityId);
      if (d <= lambdaValue) {
        isCovered = true;
        break;
      }
    }

    if (isCovered) {
      covered.push(node.id);
    }
  }

  return covered;
}

export function computeCoveredDemandWeight(nodes, coveredNodeIds) {
  const coveredSet = new Set(coveredNodeIds);
  let total = 0;

  for (const node of nodes) {
    if (coveredSet.has(node.id)) {
      total += node.weight ?? 1;
    }
  }

  return total;
}

export function computeLambdaServiceCost(nodes, assignments, lambdaValue) {
  let total = 0;

  for (const node of nodes) {
    const distance = assignments[node.id]?.distance ?? Infinity;
    if (distance > lambdaValue) {
      return Infinity;
    }
    total += (node.weight ?? 1) * distance;
  }

  return total;
}