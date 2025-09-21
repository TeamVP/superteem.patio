import type { JSONLogicExpression } from '../../../lib/expression/jsonlogic-types';

export interface EvalContext {
  answers: Record<string, unknown>;
}

export function evaluate(expr: JSONLogicExpression, ctx: EvalContext): unknown {
  if (expr == null) return null;
  if (typeof expr !== 'object') return expr as unknown;
  if ('var' in expr) {
    return resolveVar(expr.var as string, ctx.answers);
  }
  const op = Object.keys(expr)[0];
  const val = (expr as Record<string, unknown>)[op];
  switch (op) {
    case '&&':
      return (val as JSONLogicExpression[]).every((e) => truthy(evaluate(e, ctx)));
    case '||':
      return (val as JSONLogicExpression[]).some((e) => truthy(evaluate(e, ctx)));
    case '+':
      return (val as JSONLogicExpression[]).reduce(
        (a, b) => Number(a) + Number(evaluate(b, ctx)),
        0
      );
    case '*':
      return (val as JSONLogicExpression[]).reduce(
        (a, b) => Number(a) * Number(evaluate(b, ctx)),
        1
      );
    case '-': {
      const arr = val as JSONLogicExpression[];
      if (arr.length === 1) return -Number(evaluate(arr[0], ctx));
      return Number(evaluate(arr[0], ctx)) - Number(evaluate(arr[1], ctx));
    }
    case '/': {
      const arr = val as JSONLogicExpression[];
      return Number(evaluate(arr[0], ctx)) / Number(evaluate(arr[1], ctx));
    }
    case '==': {
      const [a, b] = val as JSONLogicExpression[];
      // intentional loose equality to mirror JSONLogic semantics
      return evaluate(a, ctx) == evaluate(b, ctx);
    }
    case '>': {
      const [a, b] = val as JSONLogicExpression[];
      return Number(evaluate(a, ctx)) > Number(evaluate(b, ctx));
    }
    case '<': {
      const [a, b] = val as JSONLogicExpression[];
      return Number(evaluate(a, ctx)) < Number(evaluate(b, ctx));
    }
    case '>=': {
      const [a, b] = val as JSONLogicExpression[];
      return Number(evaluate(a, ctx)) >= Number(evaluate(b, ctx));
    }
    case '<=': {
      const [a, b] = val as JSONLogicExpression[];
      return Number(evaluate(a, ctx)) <= Number(evaluate(b, ctx));
    }
    default:
      return null;
  }
}

function resolveVar(path: string, answers: Record<string, unknown>): unknown {
  if (!path) return undefined;
  if (path.startsWith('$')) path = path.slice(1);
  const parts = path.split('.');
  let cur: unknown = answers;
  for (const p of parts) {
    if (cur && typeof cur === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cur = (cur as any)[p];
    } else return undefined;
  }
  return cur;
}

function truthy(v: unknown): boolean {
  return !!v;
}
