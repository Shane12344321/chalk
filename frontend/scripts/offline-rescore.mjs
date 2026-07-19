import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  rescoreRetainedFixtures,
  rescoreRetainedNdjson,
} from "../src/board/offlineRescore.ts";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDirectory, "..");
const projectRoot = resolve(frontendRoot, "..");
const retainedRawDirectory = join(
  projectRoot,
  "artifacts/evidence/m3-luna-v2-batch-20260717-0635/raw",
);

const cached = [
  ["cached-derivative", "demo/cached_lessons/derivative-slope.lesson.json"],
  ["cached-projectile", "demo/cached_lessons/projectile-range.lesson.json"],
  ["cached-unit-circle", "demo/cached_lessons/unit-circle-sine.lesson.json"],
].map(([topicId, path]) => ({
  topicId,
  source: readTrustedJsonFixture(join(projectRoot, path)),
}));
const golden = readdirSync(join(projectRoot, "tests/golden"), { encoding: "utf8" })
  .filter((name) => name.endsWith(".lesson.json"))
  .sort()
  .map((name) => ({
    topicId: name.replace(/\.lesson\.json$/u, ""),
    source: readTrustedJsonFixture(join(projectRoot, "tests/golden", name)),
  }));
const captured = readdirSync(retainedRawDirectory, { encoding: "utf8" })
  .filter((name) => name.endsWith(".ndjson"))
  .sort()
  .map((name) => ({
    topicId: name.replace(/\.ndjson$/u, ""),
    source: readFileSync(join(retainedRawDirectory, name), "utf8"),
  }));

const output = {
  schema: "chalk.offline-drawing-rescore-bundle.v1",
  fixtureRescore: rescoreRetainedFixtures([...cached, ...golden]),
  retainedNdjsonRescore: rescoreRetainedNdjson(captured),
};
if (
  output.fixtureRescore.topics.length !== 13 ||
  output.retainedNdjsonRescore.topics.length !== 10
) {
  throw new Error("Pinned offline evidence corpus is incomplete.");
}
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

function readTrustedJsonFixture(path) {
  return JSON.parse(readFileSync(path, "utf8"), (key, value) => {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      throw new Error(`Unsafe JSON key in ${path}.`);
    }
    return value;
  });
}
