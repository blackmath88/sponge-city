export type Point = { x: number; y: number };
export type Rect = Point & { width: number; height: number };
export type Zone = {
  id: string;
  kind: "building" | "sidewalk" | "parking" | "road";
  label: string;
  rect: Rect;
  ownership: "unknown";
  parkingSpaces: number;
};
export type Surface = {
  id: string;
  zoneId: string;
  material: "roof" | "paving" | "asphalt" | "vegetated-soil";
};
export type Asset = {
  id: string;
  kind: "downpipe" | "drain" | "rain-garden";
  zoneId: string;
  position: Point;
  nodeId: string;
};
type NodeBase = { id: string; label: string; position: Point };
export type HydroNode = NodeBase &
  (
    | { kind: "catchment"; surfaceId: string; areaM2: number }
    | { kind: "conveyance" }
    | { kind: "storage"; capacityM3: number; infiltrationM3PerHour: number }
    | { kind: "soil" | "sewer" }
  );
export type Connection = {
  id: string;
  from: string;
  to: string;
  kind: "flow" | "infiltration" | "overflow";
};
// Structural subset of Andy's CandidateArea; no indicator becomes street geometry or a hydraulic parameter.
export type CandidateSiteContext = {
  id: string;
  name: string;
  district: string;
  coordinates: [number, number];
  indicators: { sources: string[]; missingData: string[] };
  constraints: string[];
  directions: string[];
};
export type StreetScenario = {
  id: string;
  label: string;
  evidence: {
    classification: "illustrative";
    routing: {
      state: "assumed" | "observed" | "unknown";
      note: string;
    };
    assumptions: string[];
    site?: CandidateSiteContext;
  };
  zones: Zone[];
  surfaces: Surface[];
  assets: Asset[];
  nodes: HydroNode[];
  connections: Connection[];
};
export type InterventionPlan = { rainGarden: boolean; connected: boolean };
export type EvidenceState = "supported" | "illustrative" | "unknown";
export type MechanismClaim = {
  id: "absorb" | "store" | "slow";
  label: string;
  active: boolean;
  state: EvidenceState;
  explanation: string;
  drivers: string[];
};
export type Storm = { depthMm: number; durationMinutes: number };
export type SimulationSnapshot = {
  elapsedMinutes: number;
  rainM3: number;
  storedM3: number;
  infiltratedM3: number;
  sewerM3: number;
  balanceErrorM3: number;
  nodeStorage: Record<string, number>;
  edgeVolumes: Record<string, number>;
};
