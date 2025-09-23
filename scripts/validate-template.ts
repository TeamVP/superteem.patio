import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const templateSchema = JSON.parse(readFileSync('./spec/schema/template.schema.json', 'utf8'));
ajv.addSchema(templateSchema, 'template');

function validateFile(p: string) {
  const data = JSON.parse(readFileSync(p, 'utf8'));
  const validate = ajv.getSchema('template')!;
  const ok = validate(data);
  if (!ok) {
    console.error(`Invalid: ${p}`);
    console.error(validate.errors);
    process.exitCode = 1;
  } else {
    console.log(`OK: ${p}`);
  }
}

const dir = './spec/examples/templates';
for (const f of readdirSync(dir)) {
  if (f.endsWith('.json')) validateFile(join(dir, f));
}
