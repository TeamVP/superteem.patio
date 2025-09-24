import {
  JSONLogicExpression,
  MigrationResult,
  MigrationSuccess,
  MigrationFailure,
  MigrationIssue,
} from './jsonlogic-types';

// Token types
export type TokenType = 'VAR' | 'NUMBER' | 'LPAREN' | 'RPAREN' | 'LBRACK' | 'RBRACK' | 'OP' | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const whitespace = /[\s]+/y;
const numberRe = /(?:\d+(?:\.\d+)?)/y;
const varRe = /\$[a-zA-Z0-9_]+/y;
const opRe = /(===|==|>=|<=|&&|\|\||[+\-*/><=!])/y;

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    whitespace.lastIndex = i;
    numberRe.lastIndex = i;
    varRe.lastIndex = i;
    opRe.lastIndex = i;
    const ch = input[i];
    if (whitespace.test(input)) {
      i = whitespace.lastIndex;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: ch, pos: i++ });
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ch, pos: i++ });
      continue;
    }
    if (ch === '[') {
      tokens.push({ type: 'LBRACK', value: ch, pos: i++ });
      continue;
    }
    if (ch === ']') {
      tokens.push({ type: 'RBRACK', value: ch, pos: i++ });
      continue;
    }
    if (numberRe.test(input)) {
      const val = input.slice(numberRe.lastIndex - RegExp.lastMatch.length, numberRe.lastIndex);
      tokens.push({ type: 'NUMBER', value: val, pos: i });
      i = numberRe.lastIndex;
      continue;
    }
    if (varRe.test(input)) {
      const val = input.slice(varRe.lastIndex - RegExp.lastMatch.length, varRe.lastIndex);
      tokens.push({ type: 'VAR', value: val, pos: i });
      i = varRe.lastIndex;
      continue;
    }
    if (opRe.test(input)) {
      const val = input.slice(opRe.lastIndex - RegExp.lastMatch.length, opRe.lastIndex);
      tokens.push({ type: 'OP', value: val, pos: i });
      i = opRe.lastIndex;
      continue;
    }
    throw Object.assign(new Error(`Unexpected character '${ch}' at ${i}`), {
      code: 'unexpected_character',
      pos: i,
    });
  }
  tokens.push({ type: 'EOF', value: '', pos: i });
  return tokens;
}

// Precedence table (higher number = higher precedence)
const PRECEDENCE: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '==': 3,
  '===': 3,
  '>': 3,
  '<': 3,
  '>=': 3,
  '<=': 3,
  '+': 4,
  '-': 4,
  '*': 5,
  '/': 5,
};

interface ParserState {
  tokens: Token[];
  index: number;
}

function peek(state: ParserState): Token {
  return state.tokens[state.index];
}

function consume(state: ParserState, type?: TokenType): Token {
  const t = state.tokens[state.index];
  if (type && t.type !== type) throw new Error(`Expected ${type} got ${t.type}`);
  state.index++;
  return t;
}

function isVar(expr: JSONLogicExpression): expr is { var: string } {
  return typeof expr === 'object' && expr !== null && 'var' in expr;
}

function parsePrimary(state: ParserState): JSONLogicExpression {
  const t = peek(state);
  // Unary bang operator
  if (t.type === 'OP' && t.value === '!') {
    consume(state, 'OP');
    const inner = parsePrimary(state);
  return { '!': [inner] } as unknown as JSONLogicExpression;
  }
  if (t.type === 'NUMBER') {
    consume(state);
    return Number(t.value);
  }
  if (t.type === 'VAR') {
    consume(state);
    return { var: t.value.slice(1) };
  }
  if (t.type === 'LPAREN') {
    consume(state, 'LPAREN');
    const expr = parseExpression(state, 0);
    consume(state, 'RPAREN');
    return expr;
  }
  throw new Error(`Unexpected token ${t.type} at ${t.pos}`);
}

function parseArrayIndex(base: JSONLogicExpression, state: ParserState): JSONLogicExpression {
  while (peek(state).type === 'LBRACK') {
    consume(state, 'LBRACK');
    const idxTok = consume(state, 'NUMBER');
    consume(state, 'RBRACK');
    if (idxTok.value !== '0') {
      const err = new Error('Only zero index [0] supported');
      throw Object.assign(err, { code: 'unsupported_index', pos: idxTok.pos });
    }
    if (isVar(base)) {
      base = { var: base.var + '.0' };
      continue;
    }
    throw new Error('Indexing only supported on variables');
  }
  return base;
}

function parseExpression(
  state: ParserState,
  minPrec: number,
  warnings: string[] = []
): JSONLogicExpression {
  let left = parsePrimary(state);
  left = parseArrayIndex(left, state);
  for (;;) {
    const opTok = peek(state);
    if (opTok.type !== 'OP') break;
    const prec = PRECEDENCE[opTok.value];
    if (prec == null || prec < minPrec) break;
    consume(state, 'OP');
    let right = parsePrimary(state);
    right = parseArrayIndex(right, state);
    // Handle chain of higher-precedence operators binding to the right operand
    while (true) {
      const next = peek(state);
      if (next.type !== 'OP') break;
      const nextPrec = PRECEDENCE[next.value];
      if (nextPrec == null || nextPrec <= prec) break;
      const nextOp = next.value;
      consume(state, 'OP');
      let rhs = parsePrimary(state);
      rhs = parseArrayIndex(rhs, state);
      right = combineOp(nextOp, right, rhs, warnings);
    }
    left = combineOp(opTok.value, left, right, warnings);
  }
  return left;
}

function flatten(op: string, nodes: JSONLogicExpression[]): JSONLogicExpression[] {
  const out: JSONLogicExpression[] = [];
  for (const n of nodes) {
    if (
      typeof n === 'object' &&
      n &&
      op in n &&
      Array.isArray((n as Record<string, unknown>)[op] as unknown[])
    ) {
      out.push(...((n as Record<string, unknown>)[op] as JSONLogicExpression[]));
    } else {
      out.push(n);
    }
  }
  return out;
}

function combineOp(
  op: string,
  left: JSONLogicExpression,
  right: JSONLogicExpression,
  warnings: string[]
): JSONLogicExpression {
  switch (op) {
    case '&&':
      return { '&&': flatten('&&', [left, right]) } as JSONLogicExpression;
    case '||':
      return { '||': flatten('||', [left, right]) } as JSONLogicExpression;
    case '+':
      return { '+': flatten('+', [left, right]) } as JSONLogicExpression;
    case '-':
      return { '-': [left, right] } as JSONLogicExpression;
    case '*':
      return { '*': flatten('*', [left, right]) } as JSONLogicExpression;
    case '/':
      return { '/': [left, right] } as JSONLogicExpression;
    case '===':
      warnings.push('operator=== downgraded to ==');
    /* falls through */
    case '==':
      return { '==': [left, right] } as JSONLogicExpression;
    case '>=':
      return { '>=': [left, right] } as JSONLogicExpression;
    case '<=':
      return { '<=': [left, right] } as JSONLogicExpression;
    case '>':
      return { '>': [left, right] } as JSONLogicExpression;
    case '<':
      return { '<': [left, right] } as JSONLogicExpression;
    default: {
      const err = new Error(`Unsupported operator ${op}`);
      throw Object.assign(err, { code: 'unsupported_operator' });
    }
  }
}

export function toJSONLogic(source: string): MigrationResult {
  try {
    const tokens = tokenize(source);
    const state: ParserState = { tokens, index: 0 };
    const warnings: string[] = [];
    const ast = parseExpression(state, 0, warnings);
    // Post-pass: detect ($var || 0) fallback patterns
    function detectFallback(node: JSONLogicExpression): void {
      if (node && typeof node === 'object') {
        if ('||' in node) {
          const arr = (node as Record<string, JSONLogicExpression[]>)['||'];
          if (
            Array.isArray(arr) &&
            arr.length === 2 &&
            typeof arr[1] === 'number' &&
            arr[1] === 0 &&
            typeof arr[0] === 'object' &&
            arr[0] !== null &&
            'var' in (arr[0] as Record<string, unknown>)
          ) {
            if (!warnings.includes('fallback_pattern')) warnings.push('fallback_pattern');
          }
          for (const child of arr) detectFallback(child);
        } else {
          for (const key of Object.keys(node)) {
            const v = (node as Record<string, unknown>)[key];
            if (Array.isArray(v)) {
              for (const c of v) detectFallback(c as JSONLogicExpression);
            } else if (typeof v === 'object' && v !== null) {
              detectFallback(v as JSONLogicExpression);
            }
          }
        }
      }
    }
    detectFallback(ast);
    if (peek(state).type !== 'EOF') {
      return {
        ok: false,
        source,
        reason: 'trailing_tokens',
        detail: 'Unexpected tokens after end',
      } as MigrationFailure;
    }
    return { ok: true, source, ast, warnings } as MigrationSuccess;
  } catch (e) {
    const err = e as Error & { code?: string; pos?: number };
    const reasonMap: Record<string, string> = {
      unsupported_operator: 'unsupported_operator',
      unsupported_index: 'unsupported_index',
      unexpected_character: 'unexpected_character',
    };
    const reason = (err.code && reasonMap[err.code]) || 'parse_error';
    const issues: MigrationIssue[] | undefined = [reason].includes('parse_error')
      ? undefined
      : [
          {
            code: reason,
            message: err.message,
            pos: typeof err.pos === 'number' ? err.pos : undefined,
          },
        ];
    return {
      ok: false,
      source,
      reason: reason as MigrationFailure['reason'],
      detail: err.message,
      issues,
    } as MigrationFailure;
  }
}

export function migrateExpression(source: string): MigrationResult {
  return toJSONLogic(source);
}
