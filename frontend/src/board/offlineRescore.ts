import { decodeLesson } from "./decode";
import { layoutLintEvidence, type LayoutLintCode } from "./layoutLint";
import { RoughSvgBoardRenderer } from "./renderer";
import { decodeLessonNdjson, type LessonStreamResult } from "../lessonStream/client";
import drawingRuntimeIdentity from "../../../shared/fixtures/drawing-runtime-identity.json";

export interface OfflineFindingCount {
  code: LayoutLintCode;
  evidence: ReturnType<typeof layoutLintEvidence>;
  count: number;
}

export interface OfflineTopicRescore {
  topicId: string;
  sourceKind: "lesson_fixture" | "validated_ndjson";
  fixtureFingerprint: string;
  acceptedSteps: number;
  browserDroppedSteps: number;
  rendererDroppedOps: number;
  serverRepairs: number;
  serverDroppedSteps: number;
  sanitizedSteps: number;
  sanitizedFields: number;
  rendererCrash: false;
  findings: OfflineFindingCount[];
}

export interface OfflineDrawingRescore {
  schema: "chalk.offline-drawing-rescore.v1";
  renderer: "rough-svg";
  resolverPolicyRevision: string;
  topics: OfflineTopicRescore[];
}

const resolverPolicyRevision = drawingRuntimeIdentity.resolver_policy_revision;

/** Re-score retained JSON fixtures through the production decoder and resolver. */
export function rescoreRetainedFixtures(
  fixtures: readonly { topicId: string; source: unknown }[],
): OfflineDrawingRescore {
  const topicIds = fixtures.map(({ topicId }) => topicId);
  if (new Set(topicIds).size !== topicIds.length) {
    throw new Error("Offline rescore topic IDs must be unique.");
  }
  return {
    schema: "chalk.offline-drawing-rescore.v1",
    renderer: "rough-svg",
    resolverPolicyRevision,
    topics: fixtures.map(({ topicId, source }) => rescoreFixture(topicId, source)),
  };
}

/**
 * Re-score captured server-validated NDJSON through the production stream assembler,
 * browser decoder, resolver, renderer, and layout lints. This deliberately does not
 * reconstruct a lesson from selected envelopes: stream sequencing, counts, browser
 * drops, and sanitizer evidence are part of the retained truth being audited.
 */
export function rescoreRetainedNdjson(
  captures: readonly { topicId: string; source: string }[],
): OfflineDrawingRescore {
  assertUniqueTopicIds(captures);
  return {
    schema: "chalk.offline-drawing-rescore.v1",
    renderer: "rough-svg",
    resolverPolicyRevision,
    topics: captures.map(({ topicId, source }) => {
      let streamed: LessonStreamResult;
      try {
        streamed = decodeLessonNdjson(source);
      } catch {
        throw new Error(`Retained NDJSON ${topicId} failed production stream decoding.`);
      }
      return rescoreLesson(topicId, streamed.lesson, source, "validated_ndjson", {
        browserDroppedSteps: streamed.browserDroppedSteps,
        serverRepairs: streamed.repairs,
        serverDroppedSteps: streamed.droppedSteps,
        sanitizedSteps: streamed.sanitizedSteps,
        sanitizedFields: streamed.sanitizedFields,
      });
    }),
  };
}

function rescoreFixture(topicId: string, source: unknown): OfflineTopicRescore {
  const decoded = decodeLesson(source);
  if (!decoded.lesson || decoded.warnings.length > 0) {
    throw new Error(`Retained fixture ${topicId} failed production decoding.`);
  }
  return rescoreLesson(topicId, decoded.lesson, source, "lesson_fixture", {
    browserDroppedSteps: 0,
    serverRepairs: 0,
    serverDroppedSteps: 0,
    sanitizedSteps: 0,
    sanitizedFields: 0,
  });
}

function rescoreLesson(
  topicId: string,
  lesson: Parameters<RoughSvgBoardRenderer["prepareLesson"]>[0],
  fingerprintSource: unknown,
  sourceKind: OfflineTopicRescore["sourceKind"],
  evidence: Pick<
    OfflineTopicRescore,
    | "browserDroppedSteps"
    | "serverRepairs"
    | "serverDroppedSteps"
    | "sanitizedSteps"
    | "sanitizedFields"
  >,
): OfflineTopicRescore {
  try {
    const prepared = new RoughSvgBoardRenderer().prepareLesson(lesson);
    const counts = new Map<LayoutLintCode, number>();
    for (const issue of prepared.layoutIssues) {
      counts.set(issue.code, (counts.get(issue.code) ?? 0) + 1);
    }
    return {
      topicId,
      sourceKind,
      fixtureFingerprint: stableFixtureFingerprint(fingerprintSource),
      acceptedSteps: lesson.steps.length,
      ...evidence,
      rendererDroppedOps: prepared.build.warnings.length,
      rendererCrash: false,
      findings: [...counts.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([code, count]) => ({ code, evidence: layoutLintEvidence(code), count })),
    };
  } catch {
    // A baseline rescore must fail closed rather than turn a renderer exception
    // into a deceptively empty finding vector.
    throw new Error(`Retained fixture ${topicId} crashed the production renderer.`);
  }
}

function assertUniqueTopicIds(values: readonly { topicId: string }[]): void {
  const topicIds = values.map(({ topicId }) => topicId);
  if (new Set(topicIds).size !== topicIds.length) {
    throw new Error("Offline rescore topic IDs must be unique.");
  }
}

function stableFixtureFingerprint(value: unknown): string {
  const serialized = JSON.stringify(value);
  let hash = 2_166_136_261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
