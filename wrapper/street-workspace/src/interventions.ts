import type { InterventionPlan, StreetScenario } from "./types.ts";

// Recompile from baseline on every change: deterministic, reversible, no accumulated patches.
export function applyPlan(
  baseline: StreetScenario,
  plan: InterventionPlan,
): StreetScenario {
  if (plan.connected && !plan.rainGarden)
    throw new Error("A runoff connection requires a rain garden.");
  const world = structuredClone(baseline);
  if (!plan.rainGarden) return world;
  if (world.nodes.some((n) => n.id === "garden"))
    throw new Error("Expected an unmodified baseline.");
  const zone = world.zones.find((z) => z.id === "zone-2");
  const surface = world.surfaces.find((s) => s.zoneId === zone?.id);
  if (!zone || zone.kind !== "parking" || !surface)
    throw new Error("This intervention needs the demo parking strip.");
  surface.material = "vegetated-soil";
  zone.parkingSpaces = 0;
  world.assets.push({
    id: "rain-garden",
    kind: "rain-garden",
    zoneId: zone.id,
    nodeId: "garden",
    position: { x: 35, y: 12 },
  });
  world.nodes.push({
    id: "garden",
    kind: "storage",
    label: "Rain garden",
    position: { x: 35, y: 12 },
    capacityM3: 12,
    infiltrationM3PerHour: 4,
  });
  world.connections.find((e) => e.id === "rain-zone-2")!.to = "garden";
  world.connections.push(
    { id: "garden-soil", from: "garden", to: "soil", kind: "infiltration" },
    { id: "garden-overflow", from: "garden", to: "drain", kind: "overflow" },
  );
  if (plan.connected)
    world.connections.find((e) => e.id === "runoff-outlet")!.to = "garden";
  return world;
}
