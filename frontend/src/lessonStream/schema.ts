import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import lessonSchema from "../../../shared/schema/lesson.schema.json";
import streamSchema from "../../../shared/schema/lesson-stream.schema.json";
import planSchema from "../../../shared/schema/lesson-plan.schema.json";
import type { LessonStreamEnvelope } from "./stream.generated";

const STREAM_SCHEMA_ID = "https://chalk.local/schema/lesson-stream.schema.json";
const ajv = new Ajv({ allErrors: true, strict: true });
ajv.addSchema(lessonSchema);
ajv.addSchema(planSchema);
ajv.addSchema(streamSchema, STREAM_SCHEMA_ID);

const streamValidator = requiredValidator<LessonStreamEnvelope>(STREAM_SCHEMA_ID);

export function isLessonStreamEnvelope(value: unknown): value is LessonStreamEnvelope {
  return streamValidator(value);
}

export function lessonStreamSchemaErrors(): string[] {
  return formatErrors(streamValidator.errors);
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
