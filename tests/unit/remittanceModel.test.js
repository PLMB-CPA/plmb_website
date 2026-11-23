// F04 · Remittance model rules (no database needed, mongoose validates in memory)
const mongoose = require('mongoose');
const Remittance = require('../../src/models/Remittance');
const { TAX_TYPES, REMITTANCE_STATUS } = require('../../src/util/constants');

const oid = () => new mongoose.Types.ObjectId();
const valid = (over = {}) => ({
  client: oid(), taxType: 'VAT', amount: 100, createdBy: oid(), ...over,
});
const errorsOf = (doc) => (doc.validateSync() ? Object.keys(doc.validateSync().errors) : []);

describe('F04 · Remittance model', () => {
  // SITUATION: a fully valid record.
  // CHECKS: passes validation; status defaults to Pending; due date and lastEditedBy are optional.
  test('accepts a valid record and defaults the status to Pending', () => {
    const doc = new Remittance(valid());
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.status).toBe('Pending');
    expect(doc.dueDate).toBeUndefined();
  });

  // SITUATION: each required field is missing.
  // CHECKS: client, taxType, amount, createdBy are required.
  test.each(['client', 'taxType', 'amount', 'createdBy'])('requires %s', (field) => {
    const data = valid();
    delete data[field];
    expect(errorsOf(new Remittance(data))).toContain(field);
  });

  // SITUATION: tax type / status outside the allowed lists.
  // CHECKS: rejected. Every listed value is accepted.
  test('only allows the listed tax types', () => {
    expect(errorsOf(new Remittance(valid({ taxType: 'Sales Tax' })))).toContain('taxType');
    Object.values(TAX_TYPES).forEach((t) =>
      expect(errorsOf(new Remittance(valid({ taxType: t })))).toEqual([]));
  });

  test('only allows the listed statuses', () => {
    expect(errorsOf(new Remittance(valid({ status: 'Paid' })))).toContain('status');
    Object.values(REMITTANCE_STATUS).forEach((s) =>
      expect(errorsOf(new Remittance(valid({ status: s })))).toEqual([]));
  });

  // SITUATION: the constant lists are what the AC / dropdowns promise.
  // CHECKS: exact values, so an accidental rename is caught.
  test('constants hold the agreed values', () => {
    expect(Object.values(TAX_TYPES)).toEqual(['VAT', 'Percentage Tax', 'Income Tax', 'Withholding Tax']);
    expect(Object.values(REMITTANCE_STATUS)).toEqual(['Pending', 'Processing', 'Remitted', 'Completed']);
  });

  // SITUATION: someone saves a negative amount straight through the model (script, future endpoint).
  // CHECKS: should be rejected. Rn, only the controller blocks negatives; the model accepts -50.
  test('model itself rejects a negative amount', () => {
    expect(errorsOf(new Remittance(valid({ amount: -50 })))).toContain('amount');
  });
});
