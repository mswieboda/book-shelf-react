/**
 * Knobs for the fake backend. You can change them here, or at runtime from the
 * browser console without touching code:
 *
 *   localStorage.setItem('mock:failRate', '0.3')   // 30% of /api requests fail with a 500
 *   localStorage.setItem('mock:latency', '2000')   // every /api request takes ~2s
 *   localStorage.removeItem('mock:failRate')       // back to defaults
 *
 * Reload the page after changing them.
 */

function readNumber(key: string, fallback: number): number {
  if (typeof localStorage === 'undefined') return fallback // Node / tests
  const raw = localStorage.getItem(key)
  const n = raw === null ? NaN : Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export const mockConfig = {
  /** Base latency in ms. Each request waits between this and 2x this. (0 under Vitest.) */
  latencyMs: readNumber('mock:latency', import.meta.env.MODE === 'test' ? 0 : 400),
  /** 0..1 chance that any /api request fails with a 500. */
  failRate: readNumber('mock:failRate', 0),
}
