import type { KeyboardEvent } from "react";
import { nodeLabel, useLang, zoneLabel } from "./i18n.ts";
import type { SimulationSnapshot, StreetScenario } from "./types.ts";

type Props = {
  world: StreetScenario;
  snapshot: SimulationSnapshot;
  previous: SimulationSnapshot;
  selected: string;
  running: boolean;
  showCatchments: boolean;
  onSelect: (id: string) => void;
};

const scale = 14;
const px = (x: number) => 30 + x * scale;
const py = (y: number) => 38 + y * scale;

const materialClass = {
  roof: "roof",
  paving: "paving",
  asphalt: "asphalt",
  "vegetated-soil": "vegetated-soil",
} as const;

function activateZone(event: KeyboardEvent<SVGGElement>, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

// A pure projection of domain state. It does not mutate the world or calculate water.
export function StreetDiagram({
  world,
  snapshot,
  previous,
  selected,
  running,
  showCatchments,
  onSelect,
}: Props) {
  const { lang, t } = useLang();
  const nodes = new Map(world.nodes.map((node) => [node.id, node]));
  const materialFor = (zoneId: string) =>
    world.surfaces.find((surface) => surface.zoneId === zoneId)!.material;

  return (
    <div className={`world street-diagram ${running ? "is-raining" : ""}`}>
      <svg
        viewBox="0 0 900 510"
        role="img"
        aria-labelledby="street-diagram-title street-diagram-description"
      >
        <title id="street-diagram-title">{t("diagram.title")}</title>
        <desc id="street-diagram-description">{t("diagram.desc")}</desc>
        <defs>
          {(["flow", "infiltration", "overflow"] as const).map((kind) => (
            <marker
              key={kind}
              id={`arrow-${kind}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className={`arrow ${kind}`} />
            </marker>
          ))}
          <pattern id="window-grid" width="84" height="68" patternUnits="userSpaceOnUse">
            <rect width="65" height="62" x="4" y="3" rx="2" className="building-block" />
            <path d="M10 10h53v45H10zM36 10v45" className="window-line" />
          </pattern>
        </defs>

        <rect width="900" height="510" className="diagram-background" />
        <g className="rain-layer" aria-hidden="true">
          {Array.from({ length: 34 }, (_, index) => (
            <line
              key={index}
              x1={45 + ((index * 97) % 820)}
              y1={45 + ((index * 53) % 390)}
              x2={41 + ((index * 97) % 820)}
              y2={58 + ((index * 53) % 390)}
              style={{ animationDelay: `${(index % 9) * -0.11}s` }}
            />
          ))}
        </g>

        <g className="zones-layer">
          {world.zones.map((zone) => {
            const material = materialFor(zone.id);
            const x = px(zone.rect.x);
            const y = py(zone.rect.y);
            const width = zone.rect.width * scale;
            const height = zone.rect.height * scale - 2;
            return (
              <g
                key={zone.id}
                className={`zone ${zone.id === selected ? "selected" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={t("diagram.inspect", { zone: zoneLabel(lang, zone) })}
                onClick={() => onSelect(zone.id)}
                onKeyDown={(event) => activateZone(event, () => onSelect(zone.id))}
              >
                <rect x={x} y={y} width={width} height={height} className={`surface ${materialClass[material]}`} />
                {zone.kind === "building" && <rect x={x + 24} y={y + 9} width={width - 48} height={height - 18} fill="url(#window-grid)" />}
                {zone.kind === "road" && <path d={`M ${x + 25} ${y + height / 2} H ${x + width - 25}`} className="road-centre" />}
                {zone.kind === "parking" && zone.parkingSpaces > 0 && Array.from({ length: zone.parkingSpaces }, (_, index) => {
                  const carX = x + 42 + index * 102;
                  return <g key={index} className={`car car-${index + 1}`}><rect x={carX} y={y + 6} width="78" height="18" rx="6" /><rect x={carX + 20} y={y + 9} width="28" height="12" rx="3" className="car-window" /></g>;
                })}
                {material === "vegetated-soil" && <g className="planting" aria-hidden="true">{Array.from({ length: 15 }, (_, index) => <g key={index} transform={`translate(${x + 42 + index * 48} ${y + height / 2})`}><circle r="8" /><circle cx="6" cy="-6" r="5" /></g>)}</g>}
                <text x={x + 14} y={y + (zone.kind === "parking" ? -6 : 20)} className={`zone-label ${material === "asphalt" ? "on-dark" : ""}`}>
                  {zone.id === "zone-2" && material === "vegetated-soil" ? t("diagram.gardenLabel") : zoneLabel(lang, zone).toLocaleUpperCase(lang)}
                </text>
              </g>
            );
          })}
        </g>

        <g className="connections-layer" aria-hidden="true">
          {world.connections.map((connection) => {
            const from = nodes.get(connection.from)!.position;
            const to = nodes.get(connection.to)!.position;
            const catchment = connection.id.startsWith("rain-");
            if (catchment && !showCatchments) return null;
            const active = (snapshot.edgeVolumes[connection.id] ?? 0) - (previous.edgeVolumes[connection.id] ?? 0) > 1e-9;
            return (
              <line
                key={connection.id}
                x1={px(from.x)}
                y1={py(from.y)}
                x2={px(to.x)}
                y2={py(to.y)}
                className={`connection ${connection.kind} ${catchment ? "catchment" : ""} ${active ? "active" : ""}`}
                markerEnd={catchment ? undefined : `url(#arrow-${connection.kind})`}
              />
            );
          })}
        </g>

        <g className="assets-layer">
          {world.assets.map((asset) => {
            const x = px(asset.position.x);
            const y = py(asset.position.y);
            if (asset.kind === "rain-garden") {
              const node = nodes.get(asset.nodeId)!;
              const fill = node.kind === "storage" && node.capacityM3 > 0
                ? (snapshot.nodeStorage[asset.nodeId] ?? 0) / node.capacityM3
                : 0;
              return <g key={asset.id} className="garden-storage"><rect x={x - 48} y={y - 12} width="96" height="24" rx="6" /><rect x={x - 44} y={y - 8} width={88 * fill} height="16" rx="4" className="stored-water" /></g>;
            }
            return <g key={asset.id} className="drain-asset"><rect x={x - 9} y={y - 9} width="18" height="18" rx="3" /><path d={`M${x - 5} ${y}h10`} /></g>;
          })}
        </g>

        <g className="nodes-layer">
          {world.nodes.filter((node) => node.kind !== "catchment").map((node) => {
            const hasAsset = world.assets.some((asset) => asset.nodeId === node.id);
            return <g key={node.id} transform={`translate(${px(node.position.x)} ${py(node.position.y)})`} className={`hydro-node ${node.kind}`}>
              {!hasAsset && <circle r="6" />}
              <text x="-27" y="28">{nodeLabel(lang, node)}</text>
            </g>;
          })}
        </g>
        <text x="30" y="492" className="plan-caption">{t("diagram.caption")}</text>
      </svg>
    </div>
  );
}
