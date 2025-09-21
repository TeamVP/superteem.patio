// Legacy runtime visibility test placeholder gated by RUN_HEAVY
/* global process */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const heavyRun = typeof process !== 'undefined' && (process as any).env?.RUN_HEAVY === '1';
(heavyRun ? describe : describe.skip)('runtime visibility legacy', () => {
  it('placeholder', () => {
    expect(true).toBe(true);
  });
});
