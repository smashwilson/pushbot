const util = require("util");

const {Admin} = require("../roles");

function adminOnly(req) {
  if (!Admin.isAllowed(req.robot, req.user))
    throw new Error("You must be an admin to perform brain surgery");
}

function targetFrom(req, name, property) {
  const root = req.robot.brain.get(name);
  if (root === null) {
    throw new Error(`Unknown brain key ${name}`);
  }

  let target = root;
  for (const step of property) {
    target = target[step];
    if (target === undefined) {
      throw new Error(`Invalid property ${step}`);
    }
  }
  return target;
}

class EntryResolver {
  constructor(target) {
    this.target = target;
  }

  children({limit, prefix}, req) {
    adminOnly(req);

    const ks = Object.keys(this.target).filter((each) =>
      each.startsWith(prefix)
    );
    ks.sort();
    return ks.slice(0, limit);
  }

  inspect({depth}, req) {
    adminOnly(req);

    return util.inspect(this.target, {
      depth,
      customInspect: false,
      showProxy: true,
      maxArrayLength: 10,
      breakLength: 100,
    });
  }

  json({pretty}, req) {
    adminOnly(req);

    return JSON.stringify(this.target, null, "  ");
  }
}

class BrainResolver {
  keys({limit, prefix}, req) {
    adminOnly(req);

    const kvs = req.robot.brain.data._private;
    const ks = Object.keys(kvs).filter((each) => each.startsWith(prefix));
    ks.sort();
    return ks.slice(0, limit);
  }

  key({name, property}, req) {
    adminOnly(req);
    const target = targetFrom(req, name, property);
    return new EntryResolver(target);
  }
}

const BrainMutator = {
  set({name, property, value}, req) {
    adminOnly(req);

    const parsed = JSON.parse(value);
    if (property.length > 0) {
      const prefix = property.slice(0, -1);
      const last = property[property.length - 1];

      const target = targetFrom(req, name, prefix);
      target[last] = parsed;
      return new EntryResolver(target);
    } else {
      req.robot.brain.set(name, parsed);
      return new EntryResolver(parsed);
    }
  },
};

module.exports = {BrainResolver, BrainMutator};
