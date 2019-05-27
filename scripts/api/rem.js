class RemResolver {
  get({key}, {robot}) {
    const value = robot.rem.get(key);
    if (value) {
      return {key, value};
    } else {
      return null;
    }
  }

  search({query, first, after}, {robot}) {
    const limit = first || 100;
    const afterInd = after ? parseInt(after, 10) + 1 : 0;

    const keys = robot.rem.search(query);

    return {
      pageInfo: {
        total: keys.length,
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

module.exports = {RemResolver};
