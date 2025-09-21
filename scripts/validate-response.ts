import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const responseSchema = JSON.parse(readFileSync('./spec/schema/response.schema.json', 'utf8'));
const contextSchema = JSON.parse(
  readFileSync('./spec/schema/submission-context.schema.json', 'utf8')
);
ajv.addSchema(contextSchema, 'submission-context');

const validate = ajv.compile(responseSchema);

if (process.argv[2]) {
  const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const ok = validate(data);
  if (!ok) {
    console.error(validate.errors);
    process.exit(1);
  }
  console.log('Response OK');
} else {
  console.log('Usage: pnpm run validate:responses ./spec/examples/responses/sample.json');
}
