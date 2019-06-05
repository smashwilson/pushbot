class RemResolver {
  get({key}, {robot}) {
    const value = robot.rem.get(key);
    if (value) {
      return {key, value};
    } else {
      return null;
    }
  }

  search({query, first, after, orderField, orderDirection}, {robot}) {
    const limit = first || 100;
    const afterInd = after ? parseInt(after, 10) + 1 : 0;
    const field = orderField || "KEY";
    const direction = orderDirection || "ASCENDING";

    const keys = robot.rem.search(query);
    keys.sort(getComparator(field, direction));

    return {
      pageInfo: {
        count: keys.length,
        hasPreviousPage: afterInd > 0,
        hasNextPage: keys.length - afterInd > limit,
      },
      edges: keys.slice(afterInd, afterInd + limit).map((key, i) => {
        return {
          cursor: (i + afterInd).toString(),
          node: {key, value: robot.rem.get(key)},
        };
      }),
    };
  }
}

function getComparator(field, direction) {
  if (field === "RANDOM") {
    return () => Math.random() * 2 + -1;
  } else if (field === "KEY") {
    const adjust = direction === "ASCENDING" ? 1 : -1;
    return (a, b) =>
      a.localeCompare(b, undefined, {sensitivity: "base"}) * adjust;
  } else {
    throw new Error(`Invalid order field: ${field}`);
  }
}

module.exports = {RemResolver};
