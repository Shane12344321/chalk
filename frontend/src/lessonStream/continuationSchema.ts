import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import continuationSchema from "../../../shared/schema/lesson-continuation.schema.json";
import lessonSchema from "../../../shared/schema/lesson.schema.json";
import planSchema from "../../../shared/schema/lesson-plan.schema.json";
import sceneSchema from "../../../shared/schema/resolved-board-scene.schema.json";
import type {
  LessonContinuationRequest,
  LessonContinuationSuccess,
  LessonContinuationTerminal,
} from "./continuation.generated";

export type LessonContinuationResponse =
  | LessonContinuationSuccess
  | LessonContinuationTerminal;

const CONTINUATION_SCHEMA_ID = "https://chalk.local/schema/lesson-continuation.schema.json";
const ajv = new Ajv({ allErrors: true, strict: true });
ajv.addSchema(lessonSchema);
ajv.addSchema(planSchema);
ajv.addSchema(sceneSchema);
ajv.addSchema(continuationSchema, CONTINUATION_SCHEMA_ID);

const requestValidator = requiredValidator<LessonContinuationRequest>(
  `${CONTINUATION_SCHEMA_ID}#/$defs/request`,
);
const responseValidator = requiredValidator<LessonContinuationResponse>(
  `${CONTINUATION_SCHEMA_ID}#/$defs/response`,
);

export function isLessonContinuationRequest(
  value: unknown,
): value is LessonContinuationRequest {
  return requestValidator(value);
}

export function isLessonContinuationResponse(
  value: unknown,
): value is LessonContinuationResponse {
  return responseValidator(value);
}

export function lessonContinuationSchemaErrors(
  kind: "request" | "response",
): string[] {
  return formatErrors(kind === "request" ? requestValidator.errors : responseValidator.errors);
}

function requiredValidator<T>(reference: string): ValidateFunction<T> {
  const validator = ajv.getSchema<T>(reference);
  if (!validator) throw new Error(`Missing compiled schema reference: ${reference}`);
  return validator;
}

function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors) return [];
  return errors.slice(0, 8).map((error) => {
    const path = error.instancePath || "/";
    return `${path} ${error.message ?? error.keyword}`;
  });
}
