export type TemplateType = 'survey' | 'observation';

export interface Template {
  id: string;
  type: TemplateType;
  title?: string | null;
  description?: string | null;
  version: string;
  tags?: string[];
  createdBy?: string | null;
  createdAt?: string | null; // ISO date-time
  roles?: string[];
  body: Question[];
}

export type Question =
  | MultipleChoiceQuestion
  | StringQuestion
  | IntegerQuestion
  | CompositeQuestion
  | ListQuestion
  | UserQuestion;

export interface BaseQuestion {
  id?: string | null;
  type: string;
  label?: string | null;
  note?: string | null;
  required?: boolean | null;
  variable?: string | null; // must match /^\$[a-z0-9_]+$/
  enableIf?: string | null; // expression engine (RQ-003)
  customValidations?: ValidationRule[];
  display?: number | null;
  layout?: number | null;
}

export interface ValidationRule {
  expression: string;
  errorMessage: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'MultipleChoiceQuestion';
  options: string[]; // minItems 1
  minimumResponses?: number | null;
  maximumResponses?: number | null;
}

export interface StringQuestion extends BaseQuestion {
  type: 'StringQuestion';
  lineType?: number | null;
  minimumLength?: number | null;
  maximumLength?: number | null;
}

export interface IntegerQuestion extends BaseQuestion {
  type: 'IntegerQuestion';
  minimum?: number | null;
  maximum?: number | null;
}

export interface CompositeQuestion extends BaseQuestion {
  type: 'CompositeQuestion';
  questions: Question[];
}

export interface ListQuestion extends BaseQuestion {
  type: 'ListQuestion';
  minimumAnswers?: number | null;
  maximumAnswers?: number | null;
  question: Question; // the repeated question structure
}

export interface UserQuestion extends BaseQuestion {
  type: 'UserQuestion';
  jobTypeCategories?: string[] | null;
  jobTypeIds?: string[] | null;
}

// Submission context aligns with submission-context.schema.json
export interface SubmissionContext {
  unitId: string;
  teamId: string;
  reporterUserId: string;
  occurredAt: string; // ISO date-time
}

// Response aligns with response.schema.json
export type ResponseStatus = 'draft' | 'submitted';

export interface Response {
  id: string;
  templateId: string;
  templateVersion: string;
  submitterId: string;
  teamId?: string | null;
  createdAt: string; // ISO date-time
  status: ResponseStatus;
  context: SubmissionContext;
  answers: Record<string, unknown>; // keys validated by pattern in schema
  payload: unknown;
}
