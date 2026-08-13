import { describe, expect, it } from 'vitest';
import { PROVENANCE, isAdmissibleInRigor } from './index.js';

describe('provenance', () => {
  it('has exactly three tags', () => {
    expect(PROVENANCE).toEqual(['CALIBRATED', 'ESTIMATED', 'INVENTED']);
  });

  it('refuses INVENTED in Rigor mode', () => {
    expect(isAdmissibleInRigor('INVENTED')).toBe(false);
    expect(isAdmissibleInRigor('CALIBRATED')).toBe(true);
    expect(isAdmissibleInRigor('ESTIMATED')).toBe(true);
  });
});
