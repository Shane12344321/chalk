import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import annotationSchema from "../../../shared/schema/annotation.schema.json";
import type { AnnotationProgram } from "./annotation.generated";

const SCHEMA_ID = "https://chalk.local/schema/annotation.schema.json";
const ajv = new Ajv({ allErrors: true, strict: true });
ajv.addSchema(annotationSchema, SCHEMA_ID);
const compiledValidator = ajv.getSchema<AnnotationProgram>(SCHEMA_ID) as
  | ValidateFunction<AnnotationProgram>
  | undefined;
if (!compiledValidator) throw new Error("Missing compiled annotation schema.");
const validator: ValidateFunction<AnnotationProgram> = compiledValidator;

export function isAnnotationProgram(value: unknown): value is AnnotationProgram {
  return validator(value);
}

export function annotationSchemaErrors(): string[] {
  return formatErrors(validator.errors);
}

function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).slice(0, 8).map((error) => {
    const path = error.instancePath || "/";
    return `${path} ${error.message ?? error.keyword}`;
  });
}
