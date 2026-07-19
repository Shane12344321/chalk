import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import lessonSchema from "../../../shared/schema/lesson.schema.json";
import type { LayoutRelation, LessonOp, LessonProgram } from "./lesson.generated";

const SCHEMA_ID = "https://chalk.local/schema/lesson.schema.json";
const ajv = new Ajv({ allErrors: true, strict: true });
ajv.addSchema(lessonSchema, SCHEMA_ID);

const lessonValidator = requiredValidator<LessonProgram>(SCHEMA_ID);
const opValidator = requiredValidator<LessonOp>(`${SCHEMA_ID}#/$defs/op`);
const layoutRelationValidator = requiredValidator<LayoutRelation>(
  `${SCHEMA_ID}#/$defs/layoutRelation`,
);

const schemaDefinitions = lessonSchema.$defs;
export const ELEMENT_ID_PATTERN = new RegExp(schemaDefinitions.elementId.pattern);
export const LESSON_SCRIPT_MAX_LENGTH = schemaDefinitions.step.properties.script.maxLength;

export function isLessonProgram(value: unknown): value is LessonProgram {
  return lessonValidator(value);
}

export function isLessonOp(value: unknown): value is LessonOp {
  return opValidator(value);
}

export function isLayoutRelation(value: unknown): value is LayoutRelation {
  return layoutRelationValidator(value);
}

export function lessonSchemaErrors(): string[] {
  return formatErrors(lessonValidator.errors);
}

export function lessonOpSchemaErrors(): string[] {
  return formatErrors(opValidator.errors);
}

export function layoutRelationSchemaErrors(): string[] {
  return formatErrors(layoutRelationValidator.errors);
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
