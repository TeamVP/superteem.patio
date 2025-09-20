// Minimal JSONLogic type surface we plan to emit
export type JSONLogicVar = { var: string };
export type JSONLogicIf = { if: [JSONLogicExpression, JSONLogicExpression, JSONLogicExpression?] };
export type JSONLogicOp =
  | { '==': [JSONLogicExpression, JSONLogicExpression] }
  | { '>=': [JSONLogicExpression, JSONLogicExpression] }
  | { '<=': [JSONLogicExpression, JSONLogicExpression] }
  | { '>': [JSONLogicExpression, JSONLogicExpression] }
  | { '<': [JSONLogicExpression, JSONLogicExpression] }
  | { '+': JSONLogicExpression[] }
  | { '-': JSONLogicExpression[] }
  | { '*': JSONLogicExpression[] }
  | { '/': JSONLogicExpression[] }
  | { '&&': JSONLogicExpression[] }
  | { '||': JSONLogicExpression[] };
export type JSONLogicExpression =
  | JSONLogicOp
  | JSONLogicVar
  | number
  | string
  | boolean
  | null
  | JSONLogicIf;

export interface MigrationSuccess {
  ok: true;
  source: string;
  ast: JSONLogicExpression;
  warnings?: string[];
}

export type MigrationFailureReason =
  | 'parse_error'
  | 'trailing_tokens'
  | 'unsupported_operator'
  | 'unsupported_index'
  | 'unexpected_character';

export interface MigrationIssue {
  code: MigrationFailureReason | string;
  message: string;
  pos?: number;
}

export interface MigrationFailure {
  ok: false;
  source: string;
  reason: MigrationFailureReason;
  detail?: string;
  issues?: MigrationIssue[];
}

export type MigrationResult = MigrationSuccess | MigrationFailure;
