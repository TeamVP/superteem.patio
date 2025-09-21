import Ajv2020, { ValidateFunction, ErrorObject } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import templateSchema from '../../../spec/schema/template.schema.json';
import responseSchema from '../../../spec/schema/response.schema.json';
import submissionContextSchema from '../../../spec/schema/submission-context.schema.json';
import type { Template, Response as TemplateResponse, SubmissionContext } from '@/types/template';

const ajv = new Ajv2020({
  strict: false,
  allErrors: true,
  discriminator: true,
  allowUnionTypes: true,
});
addFormats(ajv);

// Clone and strip unsupported discriminator mapping for current ajv config
type JsonSchema = Record<string, unknown>;
const templateSchemaAdjusted: JsonSchema = JSON.parse(JSON.stringify(templateSchema)) as JsonSchema;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const defs = (templateSchemaAdjusted as any).$defs;
if (defs && defs.Question && defs.Question.discriminator) {
  delete defs.Question.discriminator;
}
if (defs && defs.BaseQuestion && defs.BaseQuestion.additionalProperties === false) {
  // Permit specialized question schemas to add properties in allOf
  defs.BaseQuestion.additionalProperties = true;
}
ajv.addSchema(submissionContextSchema);
ajv.addSchema(templateSchemaAdjusted);
ajv.addSchema(responseSchema);

function schema(name: string): ValidateFunction {
  const validate = ajv.getSchema(name);
  if (!validate) throw new Error(`Schema not found: ${name}`);
  return validate;
}

export function validateTemplate(data: unknown): data is Template {
  const validate = schema('https://patio.superteem.com/schema/template.schema.json');
  const ok = !!validate(data);
  if (!ok) lastErrors = validate.errors || null;
  return ok;
}

export function validateResponse(data: unknown): data is TemplateResponse {
  const validate = schema('https://patio.superteem.com/schema/response.schema.json');
  const ok = !!validate(data);
  if (!ok) lastErrors = validate.errors || null;
  return ok;
}

export function validateSubmissionContext(data: unknown): data is SubmissionContext {
  const validate = schema('https://patio.superteem.com/schema/submission-context.schema.json');
  const ok = !!validate(data);
  if (!ok) lastErrors = validate.errors || null;
  return ok;
}

let lastErrors: ErrorObject[] | null = null;
export function validationErrors(): string[] {
  if (!lastErrors) return [];
  return formatErrors(lastErrors);
}

function formatErrors(errors: ErrorObject[]): string[] {
  return errors.map((e) => `${e.instancePath || '/'} ${e.message || ''}`.trim());
}

export { ajv };
