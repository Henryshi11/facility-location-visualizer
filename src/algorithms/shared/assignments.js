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

export function computeCoveredNodes(nodes, selectedFacilities, distMatrix, radius) {
  const covered = [];

  for (const node of nodes) {
    let isCovered = false;

    for (const facilityId of selectedFacilities) {
      const d = getDistance(distMatrix, node.id, facilityId);
      if (d <= radius) {
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