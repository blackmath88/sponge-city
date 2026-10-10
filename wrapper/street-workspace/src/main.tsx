import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createDemoStreet } from "./scenario.ts";
import { applyPlan } from "./interventions.ts";
import { simulate } from "./simulation.ts";
import { StreetDiagram } from "./StreetDiagram.tsx";
import { loadEdits, saveEdits, sessionStorageOrNull } from "./edit-state.ts";
import { parseSiteHandoff, scopingToolUrl } from "./site-context.ts";
import { DATA_READINESS, DESIGN_SOURCES, explainMechanisms } from "./knowledge.ts";
import {
  LANGS,
  assumptionTexts,
  initLang,
  kindLabel,
  materialLabel,
  routingNote,
  setLang,
  stateLabel,
  useLang,
  withLang,
  zoneLabel,
  type Key,
} from "./i18n.ts";
import type { InterventionPlan, SimulationSnapshot } from "./types.ts";
import "./style.css";

initLang();
const handoff = parseSiteHandoff(window.location.search);
const handoffFailed = !handoff && !!new URLSearchParams(window.location.search).get("site");
const baseline = createDemoStreet(handoff?.site);
const emptyPlan: InterventionPlan = { rainGarden: false, connected: false };
// Synthetic-street edits survive a language reload; keyed by place id, separate from any site evidence.
const editStorage = sessionStorageOrNull();
const placeId = handoff?.site.id;
const restored = loadEdits(editStorage, placeId);
function WaterBalance({
  snapshot,
  label,
}: {
  snapshot: SimulationSnapshot;
  label: string;
}) {
  const { t } = useLang();
  const paths = [
    { label: t("wb.stored"), aria: t("wb.storedAria", { v: snapshot.storedM3.toFixed(1) }), value: snapshot.storedM3, className: "stored" },
    { label: t("wb.soil"), aria: t("wb.soilAria", { v: snapshot.infiltratedM3.toFixed(1) }), value: snapshot.infiltratedM3, className: "infiltrated" },
    { label: t("wb.sewer"), aria: t("wb.sewerAria", { v: snapshot.sewerM3.toFixed(1) }), value: snapshot.sewerM3, className: "sewer" },
  ];
  return (
    <div className="water-comparison">
      <div className="water-caption">
        <strong>{label}</strong>
        <span>{t("wb.rain", { v: snapshot.rainM3.toFixed(1) })}</span>
      </div>
      <div
        className="water-bar"
        role="img"
        aria-label={`${label}: ${paths.map((p) => p.aria).join(", ")}`}
      >
        {paths.map((p) => (
          <span
            key={p.className}
            className={p.className}
            style={{
              width: `${snapshot.rainM3 > 0 ? (p.value / snapshot.rainM3) * 100 : 0}%`,
            }}
          />
        ))}
      </div>
      <div className="water-key">
        {paths.map((p) => (
          <span key={p.className}>
            <i className={p.className} />
            {p.label} <strong>{p.value.toFixed(1)}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
function LangSwitch() {
  const { lang, t } = useLang();
  return (
    <div className="lang-switch" role="group" aria-label={t("lang.switch")}>
      {LANGS.map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={l === lang} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
function App() {
  const { lang, t } = useLang();
  const search = window.location.search;
  const scopingHref = withLang(scopingToolUrl(), lang, search);
  useEffect(() => {
    document.title = t("doc.title");
  }, [lang]);
  const [plan, setPlan] = useState<InterventionPlan>(restored.plan);
  const [depthMm, setDepth] = useState(restored.depthMm);
  const [selected, select] = useState("zone-2");
  const [frame, setFrame] = useState(0);
  const [running, setRunning] = useState(false);
  const [compare, setCompare] = useState(false);
  const [showCatchments, setShowCatchments] = useState(false);
  useEffect(() => {
    saveEdits(editStorage, placeId, { plan, depthMm });
  }, [plan, depthMm]);
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
  const mechanisms = explainMechanisms(plan, world, lang);
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
        <a className="brand" href={scopingHref}>
          SPONGE SQUAD <span>{t("brand.suffix")}</span>
        </a>
        <nav className="journey-progress" aria-label={t("journey.label")}>
          <a href={scopingHref}>{t("journey.find")}</a><i>→</i><strong>{t("journey.test")}</strong><i>→</i><span>{t("journey.explain")}</span>
        </nav>
        <span className="tag">{t("tag.version")}</span>
        <a className="tag" href={withLang("./rain-walk/", lang, search)}>{t("tag.rainWalk")}</a>
        <LangSwitch />
      </header>
      <section className="intro">
        <div>
          <p className="eyebrow">{t("intro.eyebrow")}</p>
          <h1>{t("intro.title")}</h1>
          <p>{t("intro.lead")}</p>
        </div>
        <div className="place">
          {handoff ? t("place.selected") : t("place.inspired")}
          <br />
          <strong>{handoff?.site.name ?? t("place.syntheticName")}</strong>
          <br />
          {handoff ? t("place.contextOnly", { district: handoff.site.district }) : t("place.noSite")}
        </div>
      </section>
      {handoffFailed && <p className="site-error" role="alert">{t("site.error")}</p>}
      {handoff && <section className="site-context" aria-label={t("site.aria")}>
        <div><p className="eyebrow">{t("site.eyebrow")}</p><h2>{handoff.site.name}</h2><p>{handoff.provenance.note}</p></div>
        <div><strong>{t("site.leads")}</strong>{handoff.site.indicators.sources.map((item) => <span key={item}>{item}</span>)}</div>
        <div><strong>{t("site.unknown")}</strong>{[...handoff.site.indicators.missingData, ...handoff.site.constraints].slice(0, 4).map((item) => <span key={item}>{item}</span>)}</div>
      </section>}
      <section className="design-controls" aria-label={t("design.aria")}>
        <div className="design-title">
          <p className="eyebrow">{t("design.eyebrow")}</p>
          <h2>{t("design.title")}</h2>
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
                {plan.rainGarden ? t("iv.garden.titleOn") : t("iv.garden.titleOff")}
              </strong>
              <small>
                {t("iv.garden.line1")}
                <br />
                {t("iv.garden.line2")}
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
              <strong>{t("iv.connect.title")}</strong>
              <small>
                {t("iv.connect.line1")}
                <br />
                {t("iv.connect.line2")}
              </small>
            </span>
            <b>{plan.connected ? "✓" : "+"}</b>
          </button>
          <p className="explanation" role="status">
            {!plan.rainGarden
              ? t("iv.expl.sealed")
              : !plan.connected
                ? t("iv.expl.isolated")
                : t("iv.expl.connected")}
          </p>
        </div>
      </section>
      <div className="layout">
        <section className="workspace" aria-label={t("ws.aria")}>
          <div className="viewbar">
            <span>
              {compare
                ? t("view.baseline")
                : t("view.yours", {
                    state: plan.rainGarden
                      ? plan.connected
                        ? t("view.connected")
                        : t("view.isolated")
                      : t("view.sealed"),
                  })}
            </span>
            <button
              aria-pressed={compare}
              onClick={() => setCompare((v) => !v)}
            >
              {compare ? t("view.showYours") : t("view.compare")}
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
              {t("legend.drainage")}
            </span>
            <span>
              <i className="green" />
              {t("legend.infiltration")}
            </span>
            <span>
              <i className="amber" />
              {t("legend.overflow")}
            </span>
            <label className="catchment-toggle">
              <input
                type="checkbox"
                checked={showCatchments}
                onChange={(e) => setShowCatchments(e.target.checked)}
              />
              {t("legend.catchments")}
            </label>
          </div>
          <div className="selection-strip" aria-live="polite">
            <strong>
              {surface.material === "vegetated-soil"
                ? t("garden.name")
                : zoneLabel(lang, zone)}
            </strong>
            <span>
              {t("sel.area", {
                area: zone.rect.width * zone.rect.height,
                material: materialLabel(lang, surface.material),
                n: zone.parkingSpaces,
              })}
            </span>
          </div>
          <div className="flow-summary" aria-label={t("flow.aria")}>
            {compare || !plan.connected
              ? t("flow.direct")
              : t("flow.garden")}
            {!compare && plan.rainGarden && !plan.connected && (
              <span>{t("flow.isolatedNote")}</span>
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
                ? t("storm.pause")
                : frame === 30
                  ? t("storm.replay")
                  : frame > 0
                    ? t("storm.continue")
                    : t("storm.run")}
            </button>
            <button
              aria-label={t("storm.rewindAria")}
              disabled={frame === 0 && !running}
              onClick={() => {
                setFrame(0);
                setRunning(false);
              }}
            >
              {t("storm.rewind")}
            </button>
            <label>
              {t("storm.depth")}
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
            <span className="clock">{t("storm.clock", { t: snapshot.elapsedMinutes })}</span>
          </div>
          <label className="timeline">
            {t("storm.progress")}
            <input
              aria-label={t("storm.progress")}
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
          <div className="metrics" aria-label={t("metrics.aria")}>
            {[
              [t("metrics.rain"), snapshot.rainM3],
              [t("metrics.held"), snapshot.storedM3],
              [t("metrics.soil"), snapshot.infiltratedM3],
              [t("metrics.sewer"), snapshot.sewerM3],
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
            {t("balance.note", { t: frame })}
          </p>
        </section>
        <aside>
          <p className="eyebrow">{t("aside.eyebrow")}</p>
          <h2>{t("aside.title")}</h2>
          <p className="comparison-time">
            {t("aside.sameMinute")} <strong>{frame} / 30</strong>
          </p>
          <WaterBalance snapshot={baseFrames[frame]} label={t("aside.sealedStreet")} />
          <WaterBalance snapshot={frames[frame]} label={t("aside.yourDesign")} />
          {frame === 0 && (
            <p className="empty-hint">
              {t("aside.emptyHint")}
            </p>
          )}
          <button
            className="jump-end"
            onClick={() => {
              setFrame(30);
              setRunning(false);
            }}
          >
            {t("aside.jumpEnd")}
          </button>
          <div className="forecast">
            <span>{t("forecast.end")}</span>
            <strong>{(baseEnd.sewerM3 - end.sewerM3).toFixed(1)} m³</strong>
            <p>{t("forecast.less")}</p>
            <table>
              <thead>
                <tr>
                  <th>{t("forecast.path")}</th>
                  <th>{t("forecast.before")}</th>
                  <th>{t("forecast.after")}</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    [t("forecast.stored"), "storedM3"],
                    [t("forecast.infiltrated"), "infiltratedM3"],
                    [t("forecast.sewer"), "sewerM3"],
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
            <small>{t("forecast.note")}</small>
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
            {t("reset")}
          </button>
        </aside>
      </div>
      <section className="details">
        <div>
          <p className="eyebrow">{t("details.eyebrow")}</p>
          <h2>{t("details.title")}</h2>
          <div className="zones" aria-label={t("details.zonesAria")}>
            {activeWorld.zones.map((z) => (
              <button
                key={z.id}
                aria-pressed={z.id === selected}
                onClick={() => select(z.id)}
              >
                {activeWorld.surfaces.find((s) => s.zoneId === z.id)
                  ?.material === "vegetated-soil"
                  ? t("garden.name")
                  : zoneLabel(lang, z)}
              </button>
            ))}
          </div>
          <dl>
            <dt>{t("dl.zone")}</dt>
            <dd>
              {zone.id} · {kindLabel(lang, zone.kind)}
            </dd>
            <dt>{t("dl.surface")}</dt>
            <dd>{materialLabel(lang, surface.material)}</dd>
            <dt>{t("dl.area")}</dt>
            <dd>{zone.rect.width * zone.rect.height} m²</dd>
            <dt>{t("dl.parking")}</dt>
            <dd>{zone.parkingSpaces}</dd>
            <dt>{t("dl.ownership")}</dt>
            <dd>{t("dl.ownershipUnknown")}</dd>
          </dl>
        </div>
        <div>
          <h3>{t("bounds.title")}</h3>
          <p>{t("bounds.text")}</p>
          <ul>
            {assumptionTexts(lang, baseline.evidence.assumptions).map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <details>
            <summary>{t("bounds.inspect")}</summary>
            <pre>
              {JSON.stringify({ plan, world: activeWorld, snapshot }, null, 2)}
            </pre>
          </details>
        </div>
      </section>
      <section className="evidence-layer" aria-labelledby="evidence-title">
        <div className="evidence-heading">
          <p className="eyebrow">{t("ev.eyebrow")}</p>
          <h2 id="evidence-title">{t("ev.title")}</h2>
          <p>{t("ev.text")}</p>
        </div>
        <div className="mechanism-grid">
          {mechanisms.map((claim) => (
            <article key={claim.id} className={claim.active ? "mechanism active" : "mechanism"}>
              <div><strong>{claim.label}</strong><span className={`evidence-badge ${claim.state}`}>{stateLabel(lang, claim.state)}</span></div>
              <p>{claim.explanation}</p>
              <small>{t("ev.drivenBy", { drivers: claim.drivers.join(" · ") })}</small>
            </article>
          ))}
        </div>
        <div className="evidence-columns">
          <div>
            <h3>{t("ev.routing")}</h3>
            <p><span className="evidence-badge illustrative">{stateLabel(lang, world.evidence.routing.state)}</span>{routingNote(lang, world.evidence.routing.note)}</p>
            <p className="evidence-rule">{t("ev.rule")}</p>
          </div>
          <div>
            <h3>{t("ev.refs")}</h3>
            {DESIGN_SOURCES.map((source, i) => (
              <a className="source-row" href={source.href} target="_blank" rel="noreferrer" key={source.href}>
                <span>{source.label}<small>{t(`src.${i}.geography` as Key)}</small></span><b aria-hidden="true">↗</b>
              </a>
            ))}
          </div>
        </div>
        <div className="data-readiness">
          <div><p className="eyebrow">{t("ev.dataEyebrow")}</p><h3>{t("ev.dataTitle")}</h3></div>
          {DATA_READINESS.map((source, i) => {
            const content = <><strong>{t(`data.${i}.label` as Key)}</strong><span>{t(`data.${i}.detail` as Key)}</span><i className={source.state}>{stateLabel(lang, source.state)}</i></>;
            return "href" in source ? <a href={source.href} target="_blank" rel="noreferrer" key={source.label}>{content}</a> : <div key={source.label}>{content}</div>;
          })}
        </div>
      </section>
      <footer>
        {t("footer.left")}{" "}
        <span>{t("footer.right")}</span>
      </footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
