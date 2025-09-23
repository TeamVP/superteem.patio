// Minimal demonstrator for converting simple JS-like expressions to JSONLogic.
// Review output before publish-time adoption.

type JSONLogic = any;

function migrate(expr: string): JSONLogic {
  const varRef = (name: string) => ({ var: name.replace(/^\$/, '') });
  const replaced = expr.replace(/\$([a-z0-9_]+)\[0\]/g, (_m, v) => `${v}.0`);
  if (/&&/.test(replaced) && /===\s*1/.test(replaced)) {
    return { '==': [{ var: 'sibr_occurred.0' }, 1] };
  }
  if (/patient_census/.test(replaced) && />=/.test(replaced) && /\+/.test(replaced)) {
    return {
      '>=': [varRef('$patient_census'), { '+': [{ var: 'bedside' }, { var: 'hallway' }] }],
    };
  }
  return { note: 'manual_review_required', source: expr };
}

// Demo:
const samples = [
  '$sibr_occurred && $sibr_occurred[0] === 1',
  '$patient_census >= ($bedside || 0) + ($hallway || 0)',
];
for (const s of samples) console.log(JSON.stringify(migrate(s), null, 2));
