/* RFC4180-ish CSV serializer */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function toCsv(header: string[], rows: any[][]): string {
  const escape = (val: any) => {
    if (val === null || val === undefined) return '';
    const s = String(val);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [header.map(escape).join(',')];
  for (const r of rows) lines.push(r.map(escape).join(','));
  return lines.join('\n');
}
