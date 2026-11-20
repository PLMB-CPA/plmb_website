const {
  inquiryStatus, responseTimeMinutes, dueAt, isOverdue, serializeInquiry,
} = require('../../src/util/inquiryMetrics');

describe('inquiryStatus', () => {
  // SITUATION: the 3 states the tracker shows. 
  test.each([
    ['unread and unanswered', {}, 'new'],
    ['read but unanswered', { isRead: true }, 'in_progress'],
    ['answered and read', { isRead: true, isAnswered: true }, 'answered'],
    ['answered but never opened', { isAnswered: true }, 'answered'],
  ])('%s is %s', (_label, inquiry, expected) => {
    expect(inquiryStatus(inquiry)).toBe(expected);
  });
});

describe('responseTimeMinutes', () => {
  const date = '2026-11-09T02:00:00Z';

  test('uses the stored value first, even when it is 0', () => {
    expect(responseTimeMinutes({ responseTimeMinutes: 45 })).toBe(45);
    expect(responseTimeMinutes({ responseTimeMinutes: 0 })).toBe(0);   // 0 must not be treated as "missing"
  });

  test('computes from date and repliedAt when nothing is stored', () => {
    expect(responseTimeMinutes({ date, repliedAt: '2026-11-09T04:30:00Z' })).toBe(150);
  });

  test('rounds to the nearest minute', () => {
    expect(responseTimeMinutes({ date, repliedAt: '2026-11-09T02:01:30Z' })).toBe(2);   // 1.5 -> 2
    expect(responseTimeMinutes({ date, repliedAt: '2026-11-09T02:01:29Z' })).toBe(1);   // 1.48 -> 1
  });

  test('never returns a negative time', () => {
    expect(responseTimeMinutes({ date, repliedAt: '2026-11-09T01:00:00Z' })).toBe(0);
  });

  test.each([
    ['no reply yet', { date }],
    ['no date', { repliedAt: date }],
    ['garbage reply date', { date, repliedAt: 'not a date' }],
  ])('returns null when there is %s', (_label, inquiry) => {
    expect(responseTimeMinutes(inquiry)).toBeNull();
  });
});

describe('dueAt (2 business days, Manila time)', () => {
  // SITUATION: inquiries arrive on different weekdays. 
  // CHECKS: weekends are skipped.
  test.each([
    ['Monday 10:00 -> Wednesday', '2026-11-09T02:00:00Z', '2026-11-11T02:00:00.000Z'],
    ['Thursday 10:00 -> Monday', '2026-11-12T02:00:00Z', '2026-11-16T02:00:00.000Z'],
    ['Friday 10:00 -> Tuesday', '2026-11-13T02:00:00Z', '2026-11-17T02:00:00.000Z'],
  ])('%s', (_label, submitted, expected) => {
    expect(dueAt(submitted).toISOString()).toBe(expected);
  });

  // SITUATION: Friday 17:00Z is already Saturday 01:00 in Manila.
  test('uses the Manila weekday, not the UTC weekday', () => {
    expect(dueAt('2026-11-13T17:00:00Z').toISOString()).toBe('2026-11-16T17:00:00.000Z');
  });

  test('returns null for an invalid date', () => {
    expect(dueAt('garbage')).toBeNull();
  });
});

describe('isOverdue', () => {
  const inquiry = { date: '2026-11-09T02:00:00Z' };            // due Wed 2026-11-11 02:00Z

  test('not overdue 1 minute before the deadline, overdue 1 minute after', () => {
    expect(isOverdue(inquiry, new Date('2026-11-11T01:59:00Z'))).toBe(false);
    expect(isOverdue(inquiry, new Date('2026-11-11T02:01:00Z'))).toBe(true);
  });

  test('answered and archived inquiries are never overdue', () => {
    const late = new Date('2027-01-01T00:00:00Z');
    expect(isOverdue({ ...inquiry, isAnswered: true }, late)).toBe(false);
    expect(isOverdue({ ...inquiry, isArchived: true }, late)).toBe(false);
  });

  test('an inquiry with no valid date is not overdue', () => {
    expect(isOverdue({}, new Date())).toBe(false);
  });
});

describe('serializeInquiry', () => {
  test('adds status, response time and overdue flag, and keeps the other fields', () => {
    const out = serializeInquiry({
      ticketNumber: 'INQ-0001', isRead: true, date: '2020-01-01T00:00:00Z',
    });
    expect(out).toMatchObject({
      ticketNumber: 'INQ-0001', status: 'in_progress',
      responseTimeMinutes: null, isOverdue: true,
    });
  });

  test('works with mongoose documents (toObject)', () => {
    const doc = { toObject: () => ({ ticketNumber: 'INQ-0002', isAnswered: true }) };
    expect(serializeInquiry(doc)).toMatchObject({ ticketNumber: 'INQ-0002', status: 'answered' });
  });
});