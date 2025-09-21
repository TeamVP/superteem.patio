/* global process */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const heavy = typeof process !== 'undefined' && (process as any).env?.RUN_HEAVY === '1';
// Legacy TemplateEditor test placeholder gated by RUN_HEAVY
(heavy ? describe : describe.skip)('TemplateEditor legacy', () => {
  it('placeholder', () => {
    expect(true).toBe(true);
  });
});
