import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const missionPath = new URL("../.weavr/missions/sponge-city-v2-reconciliation.json", import.meta.url);
const graphPath = new URL("../.weavr/plans/sponge-city-v2-reconciliation.tasks.json", import.meta.url);
const resultPath = new URL("../docs/orchestration/results/task-a-nebu.json", import.meta.url);

const load = async (path) => JSON.parse(await readFile(path, "utf8"));

test("portable Mission is bounded to orchestration work", async () => {
  const mission = await load(missionPath);
  assert.equal(mission.schema, "weavr.mission/v0");
  assert.equal(mission.id, "sponge-city-v2-reconciliation");
  assert.equal(mission.kind, "review");
  assert.ok(mission.requires.capabilities.length > 0);
  assert.ok(mission.exclusions.some((item) => item.includes("do not implement Stage 1")));
  assert.equal(mission.authority.merge, "forbidden");
});

test("task graph preserves dependencies and the implementation gate", async () => {
  const graph = await load(graphPath);
  const tasks = new Map(graph.tasks.map((task) => [task.id, task]));
  assert.deepEqual([...tasks.keys()], [
    "sponge-v2-A",
    "sponge-v2-B",
    "sponge-v2-C",
    "sponge-v2-D",
    "sponge-v2-E"
  ]);
  assert.deepEqual(tasks.get("sponge-v2-C").depends_on, ["sponge-v2-A", "sponge-v2-B"]);
  assert.deepEqual(tasks.get("sponge-v2-D").depends_on, ["sponge-v2-A", "sponge-v2-B", "sponge-v2-C"]);
  assert.deepEqual(tasks.get("sponge-v2-E").depends_on, ["sponge-v2-D"]);
  assert.equal(tasks.get("sponge-v2-E").dispatch_gate, "explicit_human_acceptance_of_task_d");
  assert.equal(tasks.get("sponge-v2-E").status, "pending");
  assert.equal(graph.canonical_owner, "weavr");
  assert.equal(graph.execution_substrate, "orca");
  assert.equal(graph.canonical_decision.state, "not_ready");
});

test("worker result keeps partial evidence distinct from acceptance", async () => {
  const result = await load(resultPath);
  for (const key of [
    "task_id",
    "worker",
    "status",
    "summary",
    "artifacts",
    "claims",
    "evidence",
    "uncertainties",
    "recommended_next"
  ]) assert.ok(Object.hasOwn(result, key), `missing ${key}`);

  assert.equal(result.status, "partial");
  assert.equal(result.runtime_provenance.accepted_by_weavr, false);
  assert.ok(result.evidence.some((item) => item.classification === "archive"));
  assert.ok(result.evidence.some((item) => item.classification === "conflict"));
});

