import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createDemoStreet } from "./scenario.ts";
import { applyPlan } from "./interventions.ts";
import { simulate } from "./simulation.ts";
import { StreetDiagram } from "./StreetDiagram.tsx";
import { parseSiteHandoff, scopingToolUrl } from "./site-context.ts";
import { DATA_READINESS, DESIGN_SOURCES, explainMechanisms } from "./knowledge.ts";
import type { InterventionPlan, SimulationSnapshot } from "./types.ts";
import "./style.css";

const handoff = parseSiteHandoff(window.location.search);
const baseline = createDemoStreet(handoff?.site);
const emptyPlan: InterventionPlan = { rainGarden: false, connected: false };
function WaterBalance({
  snapshot,
  label,
}: {
  snapshot: SimulationSnapshot;
  label: string;
}) {
  const paths = [
    { label: "Stored", value: snapshot.storedM3, className: "stored" },
    { label: "Soil", value: snapshot.infiltratedM3, className: "infiltrated" },
    { label: "Sewer", value: snapshot.sewerM3, className: "sewer" },
  ];
  return (
    <div className="water-comparison">
      <div className="water-caption">
        <strong>{label}</strong>
        <span>{snapshot.rainM3.toFixed(1)} m³ rain</span>
      </div>
      <div
        className="water-bar"
        role="img"
        aria-label={`${label}: ${paths.map((p) => `${p.value.toFixed(1)} cubic metres ${p.label.toLowerCase()}`).join(", ")}`}
      >
        {paths.map((p) => (
          <span
            key={p.label}
            className={p.className}
            style={{
              width: `${snapshot.rainM3 > 0 ? (p.value / snapshot.rainM3) * 100 : 0}%`,
            }}
          />
        ))}
      </div>
      <div className="water-key">
        {paths.map((p) => (
          <span key={p.label}>
            <i className={p.className} />
            {p.label} <strong>{p.value.toFixed(1)}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
function App() {
  const [plan, setPlan] = useState(emptyPlan);
  const [depthMm, setDepth] = useState(30);
  const [selected, select] = useState("zone-2");
  const [frame, setFrame] = useState(0);
  const [running, setRunning] = useState(false);
  const [compare, setCompare] = useState(false);
  const [showCatchments, setShowCatchments] = useState(false);
  const world = useMemo(() => applyPlan(baseline, plan), [plan]);
  const frames = useMemo(
    () => simulate(world, { depthMm, durationMinutes: 30 }),
    [world, depthMm],
  );
  const baseFrames = useMemo(
    () => simulate(baseline, { depthMm, durationMinutes: 30 }),
    [depthMm],
  );
  const snapshot = (compare ? baseFrames : frames)[frame];
  const activeWorld = compare ? baseline : world;
  const zone = activeWorld.zones.find((z) => z.id === selected)!;
  const surface = activeWorld.surfaces.find((s) => s.zoneId === selected)!;
  const end = frames.at(-1)!;
  const baseEnd = baseFrames.at(-1)!;
  const mechanisms = explainMechanisms(plan, world);
  const changePlan = (next: InterventionPlan) => {
    setPlan(next);
    setRunning(false);
    setCompare(false);
  };
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(
      () =>
        setFrame((f) => {
          if (f >= 30) return f;
          return f + 1;
        }),
      300,
    );
    return () => clearInterval(timer);
  }, [running]);
  useEffect(() => {
    if (frame === 30) setRunning(false);
  }, [frame]);
  const run = () => {
    setFrame(0);
    setRunning(true);
  };
  return (
    <main>
      <header>
        <a className="brand" href={scopingToolUrl()}>
          SPONGE SQUAD <span>/ STREET LAB</span>
        </a>
        <nav className="journey-progress" aria-label="Prototype journey">
          <a href={scopingToolUrl()}>1 · Find</a><i>→</i><strong>2 · Test</strong><i>→</i><span>3 · Explain</span>
        </nav>
        <span className="tag">Illustrative scenario · v0.4</span>
        <a className="tag" href="./rain-walk/">Rain Walk · collect street evidence →</a>
      </header>
      <section className="intro">
        <div>
          <p className="eyebrow">01 / UNDERSTAND THE CONNECTION</p>
          <h1>A street, connected.</h1>
          <p>
            Give rain somewhere to go. Add a garden, open the kerb, then follow
            the water.
          </p>
        </div>
        <div className="place">
          {handoff ? 'SELECTED CANDIDATE' : 'BASEL-INSPIRED'}
          <br />
          <strong>{handoff?.site.name ?? 'Synthetic demo street'}</strong>
          <br />
          {handoff ? `${handoff.site.district} · context only` : 'No surveyed site selected'}
        </div>
      </section>
      {handoff && <section className="site-context" aria-label="Selected candidate context">
        <div><p className="eyebrow">HANDOFF FROM SITE SCOPING</p><h2>{handoff.site.name}</h2><p>{handoff.provenance.note}</p></div>
        <div><strong>Evidence leads</strong>{handoff.site.indicators.sources.map((item) => <span key={item}>{item}</span>)}</div>
        <div><strong>Still unknown</strong>{[...handoff.site.indicators.missingData, ...handoff.site.constraints].slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div>
      </section>}
      <section className="design-controls" aria-label="Design your street">
        <div className="design-title">
          <p className="eyebrow">DESIGN YOUR STREET</p>
          <h2>Two changes. One connected system.</h2>
        </div>
        <div className="design-actions">
          {" "}
          <button
            className={"intervention " + (plan.rainGarden ? "active" : "")}
            aria-pressed={plan.rainGarden}
            onClick={() =>
              changePlan({ rainGarden: !plan.rainGarden, connected: false })
            }
          >
            <span className="step">1</span>
            <span>
              <strong>
                {plan.rainGarden ? "Rain garden added" : "Add a rain garden"}
              </strong>
              <small>
                Replace the north parking strip.
                <br />
                12 m³ storage · 3 spaces removed
              </small>
            </span>
            <b>{plan.rainGarden ? "✓" : "+"}</b>
          </button>
          <button
            className={"intervention " + (plan.connected ? "active" : "")}
            disabled={!plan.rainGarden}
            aria-pressed={plan.connected}
            onClick={() => changePlan({ ...plan, connected: !plan.connected })}
          >
            <span className="step">2</span>
            <span>
              <strong>Connect street runoff</strong>
              <small>
                Open the kerb to feed the garden.
                <br />
                Overflow still reaches the drain.
              </small>
            </span>
            <b>{plan.connected ? "✓" : "+"}</b>
          </button>
          <p className="explanation" role="status">
            {!plan.rainGarden
              ? "The sealed surfaces send all rainfall to the sewer. Start with one garden."
              : !plan.connected
                ? "The garden catches rain falling on itself. Runoff from the rest of the street still bypasses it."
                : "Roof and street runoff now feed the garden. Water infiltrates into soil; once storage is full, the excess flows to the sewer."}
          </p>
        </div>
      </section>
      <div className="layout">
        <section className="workspace" aria-label="Street workspace">
          <div className="viewbar">
            <span>
              {compare
                ? "BASELINE / SEALED STREET"
                : "YOUR STREET / " +
                  (plan.rainGarden
                    ? plan.connected
                      ? "CONNECTED GARDEN"
                      : "ISOLATED GARDEN"
                    : "SEALED")}
            </span>
            <button
              aria-pressed={compare}
              onClick={() => setCompare((v) => !v)}
            >
              {compare ? "Show your street" : "Compare baseline"}
            </button>
          </div>
          <StreetDiagram
            world={activeWorld}
            snapshot={snapshot}
            previous={(compare ? baseFrames : frames)[Math.max(0, frame - 1)]}
            selected={selected}
            running={running}
            onSelect={select}
            showCatchments={showCatchments}
          />
          <div className="legend">
            <span>
              <i className="blue" />
              Drainage
            </span>
            <span>
              <i className="green" />
              Infiltration
            </span>
            <span>
              <i className="amber" />
              Overflow
            </span>
            <label className="catchment-toggle">
              <input
                type="checkbox"
                checked={showCatchments}
                onChange={(e) => setShowCatchments(e.target.checked)}
              />
              All catchment links
            </label>
          </div>
          <div className="selection-strip" aria-live="polite">
            <strong>
              {surface.material === "vegetated-soil"
                ? "Rain garden"
                : zone.label}
            </strong>
            <span>
              {zone.rect.width * zone.rect.height} m² ·{" "}
              {surface.material.replaceAll("-", " ")} · {zone.parkingSpaces}{" "}
              parking spaces
            </span>
          </div>
          <div className="flow-summary" aria-label="Active water route">
            {compare || !plan.connected
              ? "Roof & street → drain → sewer"
              : "Roof & street → garden → soil + overflow to sewer"}
            {!compare && plan.rainGarden && !plan.connected && (
              <span>Garden receives only rain on its own footprint.</span>
            )}
          </div>
          <div className="storm">
            <button
              className="primary"
              onClick={() => {
                if (running) setRunning(false);
                else if (frame > 0 && frame < 30) setRunning(true);
                else run();
              }}
            >
              {running
                ? "Pause rain"
                : frame === 30
                  ? "Replay rain"
                  : frame > 0
                    ? "Continue rain"
                    : "Run rain"}
            </button>
            <button
              aria-label="Rewind storm"
              disabled={frame === 0 && !running}
              onClick={() => {
                setFrame(0);
                setRunning(false);
              }}
            >
              Rewind
            </button>
            <label>
              Rain in 30 minutes
              <select
                value={depthMm}
                onChange={(e) => {
                  setDepth(Number(e.target.value));
                  setFrame(0);
                  setRunning(false);
                }}
              >
                <option value="10">10 mm</option>
                <option value="30">30 mm</option>
                <option value="60">60 mm</option>
              </select>
            </label>
            <span className="clock">{snapshot.elapsedMinutes} / 30 min</span>
          </div>
          <label className="timeline">
            Storm progress
            <input
              aria-label="Storm progress"
              type="range"
              min="0"
              max="30"
              value={frame}
              onChange={(e) => {
                setRunning(false);
                setFrame(Number(e.target.value));
              }}
            />
          </label>
          <div className="metrics" aria-label="Current water balance">
            {[
              ["Rain received", snapshot.rainM3],
              ["Held in garden", snapshot.storedM3],
              ["Into soil", snapshot.infiltratedM3],
              ["Into sewer", snapshot.sewerM3],
            ].map(([name, value]) => (
              <div key={name}>
                <span>{name}</span>
                <strong>
                  {Number(value).toFixed(1)} <small>m³</small>
                </strong>
              </div>
            ))}
          </div>
          <p className="balance">
            Rain = stored + infiltrated + sewer · Results at minute {frame}.
            Simulation time is accelerated.
          </p>
        </section>
        <aside>
          <p className="eyebrow">FOLLOW THE WATER</p>
          <h2>Where does the rain go?</h2>
          <p className="comparison-time">
            Same rain. Same minute: <strong>{frame} / 30</strong>
          </p>
          <WaterBalance snapshot={baseFrames[frame]} label="Sealed street" />
          <WaterBalance snapshot={frames[frame]} label="Your design" />
          {frame === 0 && (
            <p className="empty-hint">
              Run rain or move the timeline to see water enter the system.
            </p>
          )}
          <button
            className="jump-end"
            onClick={() => {
              setFrame(30);
              setRunning(false);
            }}
          >
            See complete storm
          </button>
          <div className="forecast">
            <span>At the end of this storm</span>
            <strong>{(baseEnd.sewerM3 - end.sewerM3).toFixed(1)} m³</strong>
            <p>less water reaches the sewer than in the baseline</p>
            <table>
              <thead>
                <tr>
                  <th>Water path</th>
                  <th>Before</th>
                  <th>After</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Stored", "storedM3"],
                    ["Infiltrated", "infiltratedM3"],
                    ["Sewer", "sewerM3"],
                  ] as const
                ).map(([label, key]) => (
                  <tr key={key}>
                    <th>{label}</th>
                    <td>{baseEnd[key].toFixed(1)}</td>
                    <td>{end[key].toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <small>Volumes in m³ · illustrative parameters</small>
          </div>
          <button
            className="reset"
            onClick={() => {
              changePlan(emptyPlan);
              setFrame(0);
              setDepth(30);
              select("zone-2");
            }}
          >
            Reset street & rain
          </button>
        </aside>
      </div>
      <section className="details">
        <div>
          <p className="eyebrow">LOOK UNDER THE SURFACE</p>
          <h2>Every part has an identity.</h2>
          <div className="zones" aria-label="Inspect zone">
            {activeWorld.zones.map((z) => (
              <button
                key={z.id}
                aria-pressed={z.id === selected}
                onClick={() => select(z.id)}
              >
                {activeWorld.surfaces.find((s) => s.zoneId === z.id)
                  ?.material === "vegetated-soil"
                  ? "Rain garden"
                  : z.label}
              </button>
            ))}
          </div>
          <dl>
            <dt>Zone</dt>
            <dd>
              {zone.id} · {zone.kind}
            </dd>
            <dt>Surface</dt>
            <dd>{surface.material}</dd>
            <dt>Area</dt>
            <dd>{zone.rect.width * zone.rect.height} m²</dd>
            <dt>Parking spaces</dt>
            <dd>{zone.parkingSpaces}</dd>
            <dt>Ownership</dt>
            <dd>Unknown — needs site evidence</dd>
          </dl>
        </div>
        <div>
          <h3>Model boundaries</h3>
          <p>
            This is an explanation of connected water systems, not a hydraulic
            model or a site recommendation.
          </p>
          <ul>
            {baseline.evidence.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <details>
            <summary>Inspect world data & water connections</summary>
            <pre>
              {JSON.stringify({ plan, world: activeWorld, snapshot }, null, 2)}
            </pre>
          </details>
        </div>
      </section>
      <section className="evidence-layer" aria-labelledby="evidence-title">
        <div className="evidence-heading">
          <p className="eyebrow">FROM DEMO TO DECISION SUPPORT</p>
          <h2 id="evidence-title">Show the mechanism. Label the evidence.</h2>
          <p>
            The diagram explains a connected system. Its exact volumes are demo
            parameters; source-backed guidance and real Basel inputs stay visibly separate.
          </p>
        </div>
        <div className="mechanism-grid">
          {mechanisms.map((claim) => (
            <article key={claim.id} className={claim.active ? "mechanism active" : "mechanism"}>
              <div><strong>{claim.label}</strong><span className={`evidence-badge ${claim.state}`}>{claim.state}</span></div>
              <p>{claim.explanation}</p>
              <small>Driven by: {claim.drivers.join(" · ")}</small>
            </article>
          ))}
        </div>
        <div className="evidence-columns">
          <div>
            <h3>Routing evidence</h3>
            <p><span className="evidence-badge illustrative">{world.evidence.routing.state}</span>{world.evidence.routing.note}</p>
            <p className="evidence-rule">A selected candidate adds context only. It never creates pipes, gullies or flow paths.</p>
          </div>
          <div>
            <h3>Curb-opening references</h3>
            {DESIGN_SOURCES.map((source) => (
              <a className="source-row" href={source.href} target="_blank" rel="noreferrer" key={source.href}>
                <span>{source.label}<small>{source.geography}</small></span><b aria-hidden="true">↗</b>
              </a>
            ))}
          </div>
        </div>
        <div className="data-readiness">
          <div><p className="eyebrow">BASEL DATA ADAPTER / NEXT</p><h3>What can replace the demo inputs?</h3></div>
          {DATA_READINESS.map((source) => {
            const content = <><strong>{source.label}</strong><span>{source.detail}</span><i className={source.state}>{source.state}</i></>;
            return "href" in source ? <a href={source.href} target="_blank" rel="noreferrer" key={source.label}>{content}</a> : <div key={source.label}>{content}</div>;
          })}
        </div>
      </section>
      <footer>
        SpongeSquad / Hack am Rhein 2026{" "}
        <span>Site scoping → Street model → Interventions → Water paths</span>
      </footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
