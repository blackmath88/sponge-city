import type {
  HydroNode,
  SimulationSnapshot,
  Storm,
  StreetScenario,
} from "./types.ts";

const nonnegative = (n: number) => Number.isFinite(n) && n >= 0;
export function validateWorld(world: StreetScenario): HydroNode[] {
  for (const collection of [
    world.zones,
    world.surfaces,
    world.assets,
    world.nodes,
    world.connections,
  ]) {
    if (new Set(collection.map((x) => x.id)).size !== collection.length)
      throw new Error("Duplicate ID.");
  }
  for (const s of world.surfaces)
    if (!world.zones.some((z) => z.id === s.zoneId))
      throw new Error("Surface has missing zone.");
  for (const a of world.assets)
    if (
      !world.zones.some((z) => z.id === a.zoneId) ||
      !world.nodes.some((n) => n.id === a.nodeId)
    )
      throw new Error("Asset has missing reference.");
  const nodes = new Map(world.nodes.map((n) => [n.id, n]));
  const indegree = new Map(world.nodes.map((n) => [n.id, 0]));
  for (const e of world.connections) {
    if (!nodes.has(e.from) || !nodes.has(e.to))
      throw new Error("Connection has missing endpoint.");
    indegree.set(e.to, indegree.get(e.to)! + 1);
  }
  for (const n of world.nodes) {
    const edges = world.connections.filter((e) => e.from === n.id);
    if (
      n.kind === "catchment" &&
      (!nonnegative(n.areaM2) ||
        !world.surfaces.some((s) => s.id === n.surfaceId))
    )
      throw new Error("Invalid catchment.");
    if (n.kind === "storage") {
      if (!nonnegative(n.capacityM3) || !nonnegative(n.infiltrationM3PerHour))
        throw new Error("Invalid storage.");
      if (
        edges.length !== 2 ||
        edges.filter((e) => e.kind === "overflow").length !== 1 ||
        edges.filter(
          (e) => e.kind === "infiltration" && nodes.get(e.to)?.kind === "soil",
        ).length !== 1
      )
        throw new Error("Storage needs soil and overflow outlets.");
    } else if (n.kind === "soil" || n.kind === "sewer") {
      if (edges.length) throw new Error("Sink cannot have outlets.");
    } else if (edges.length !== 1 || edges[0].kind !== "flow")
      throw new Error("Catchment/conveyance needs one flow outlet.");
  }
  const queue = world.nodes.filter((n) => indegree.get(n.id) === 0);
  const ordered: HydroNode[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    ordered.push(n);
    for (const e of world.connections.filter((e) => e.from === n.id)) {
      indegree.set(e.to, indegree.get(e.to)! - 1);
      if (indegree.get(e.to) === 0) queue.push(nodes.get(e.to)!);
    }
  }
  if (ordered.length !== world.nodes.length)
    throw new Error("Cycles are unsupported.");
  return ordered;
}

// Fixed one-minute buckets. Infiltration happens before overflow within each bucket.
// No distance-based travel time; cumulative edge volumes drive explanatory animation only.
export function simulate(
  world: StreetScenario,
  storm: Storm,
): SimulationSnapshot[] {
  if (
    !nonnegative(storm.depthMm) ||
    !Number.isFinite(storm.durationMinutes) ||
    storm.durationMinutes <= 0 ||
    storm.durationMinutes > 1440
  )
    throw new Error("Invalid storm.");
  const ordered = validateWorld(world);
  const storage = Object.fromEntries(
    world.nodes.filter((n) => n.kind === "storage").map((n) => [n.id, 0]),
  );
  const edgeVolumes = Object.fromEntries(
    world.connections.map((e) => [e.id, 0]),
  );
  let rainM3 = 0,
    infiltratedM3 = 0,
    sewerM3 = 0;
  const frames: SimulationSnapshot[] = [];
  const snapshot = (elapsedMinutes: number) => {
    const storedM3 = Object.values(storage).reduce((a, b) => a + b, 0);
    frames.push({
      elapsedMinutes,
      rainM3,
      storedM3,
      infiltratedM3,
      sewerM3,
      balanceErrorM3: rainM3 - storedM3 - infiltratedM3 - sewerM3,
      nodeStorage: { ...storage },
      edgeVolumes: { ...edgeVolumes },
    });
  };
  snapshot(0);
  for (let t = 0; t < storm.durationMinutes; t += 1) {
    const dt = Math.min(1, storm.durationMinutes - t);
    const incoming: Record<string, number> = Object.fromEntries(
      world.nodes.map((n) => [n.id, 0]),
    );
    for (const n of ordered) {
      let water = incoming[n.id];
      if (n.kind === "catchment") {
        const rain =
          (((n.areaM2 * storm.depthMm) / 1000) * dt) / storm.durationMinutes;
        water += rain;
        rainM3 += rain;
      }
      const edges = world.connections.filter((e) => e.from === n.id);
      const send = (
        kind: "flow" | "overflow" | "infiltration",
        volume: number,
      ) => {
        const edge = edges.find((e) => e.kind === kind)!;
        incoming[edge.to] += volume;
        edgeVolumes[edge.id] += volume;
      };
      if (n.kind === "storage") {
        const available = storage[n.id] + water;
        const infiltrated = Math.min(
          available,
          (n.infiltrationM3PerHour * dt) / 60,
        );
        const remaining = available - infiltrated;
        storage[n.id] = Math.min(n.capacityM3, remaining);
        send("infiltration", infiltrated);
        send("overflow", Math.max(0, remaining - n.capacityM3));
      } else if (n.kind === "soil") infiltratedM3 += water;
      else if (n.kind === "sewer") sewerM3 += water;
      else send("flow", water);
    }
    snapshot(t + dt);
  }
  return frames;
}
