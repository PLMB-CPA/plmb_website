// F04 · backend and frontend constants must stay identical
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';
import { TAX_TYPES, REMITTANCE_STATUS, STATUS_COLORS } from './constants.js';

const backend = createRequire(import.meta.url)('../../../src/util/constants.js');

describe('F04 · frontend/backend constants match', () => {
  it('tax types are identical', () => {
    expect(TAX_TYPES).toEqual(backend.TAX_TYPES);
  });

  it('remittance statuses are identical', () => {
    expect(REMITTANCE_STATUS).toEqual(backend.REMITTANCE_STATUS);
  });

  // SITUATION: a status has no badge colour.
  // CHECKS: every status has a bg and text colour, so no badge falls back to plain grey.
  it('every status has badge colours', () => {
    Object.values(REMITTANCE_STATUS).forEach((s) => {
      expect(STATUS_COLORS[s]).toEqual({ bg: expect.any(String), text: expect.any(String) });
    });
  });
});
