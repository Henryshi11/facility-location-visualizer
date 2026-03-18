export function getAssignments(nodes, facilityIds, distMatrix) {
  const assignments = {};

  if (facilityIds.length === 0) return assignments;

  nodes.forEach(node => {
    let minDist = Infinity;
    let bestFacility = null;

    facilityIds.forEach(fid => {
      const d = distMatrix[node.id][fid];

      // tie-breaking: smaller id wins
      if (d < minDist || (d === minDist && fid < bestFacility)) {
        minDist = d;
        bestFacility = fid;
      }
    });

    assignments[node.id] = {
      facilityId: bestFacility,
      distance: minDist,
    };
  });

  return assignments;
}