// F06 · Admin Client Analytics Tracking
// Route under test: GET /api/admin/stats
const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../../src/util/emailer', () => ({
  sendInquiryNotification: jest.fn().mockResolvedValue(),
  sendConfirmation: jest.fn().mockResolvedValue(),
  sendReply: jest.fn().mockResolvedValue(),
  sendReplyEmail: jest.fn().mockResolvedValue(),
  sendClientWelcome: jest.fn().mockResolvedValue(),
}));
jest.mock('../../src/util/emailValidator', () => ({
  isValidInquiryEmail: jest.fn().mockResolvedValue({ valid: true }),
}));

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';

const app = require('../../src/app');
const Admin = require('../../src/models/Admin');
const Client = require('../../src/models/Client');
const Inquiry = require('../../src/models/Inquiry');
const Remittance = require('../../src/models/Remittance');
const { sendClientWelcome } = require('../../src/util/emailer');

const DAY = 24 * 60 * 60 * 1000;

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
afterAll(async () => {
  await mongoose.connection.close();
  if (mongo) await mongo.stop();
});

let agent, adminId, clientId;
beforeEach(async () => {
  await Promise.all([Admin.deleteMany({}), Client.deleteMany({}), Inquiry.deleteMany({}), Remittance.deleteMany({})]);
  const hashed = await bcrypt.hash('Plmb2026.', 10);
  const admin = await Admin.create({ username: 'plmbadmin', password: hashed });
  adminId = String(admin._id);
  agent = request.agent(app);
  await agent.post('/api/admin/login').send({ username: 'plmbadmin', password: 'Plmb2026.' });
  const clientRes = await agent.post('/api/admin/clients').send({
    email: 'client@biz.com', firstName: 'Ana', lastName: 'Reyes',
    phoneNumber: '09171234567', address: '1 Rizal Ave', city: 'Manila', businessName: 'Biz',
  });
  clientId = clientRes.body.client.id;
  sendClientWelcome.mockClear();
});

const newInquiry = (overrides = {}) => Inquiry.create({
  firstName: 'A', lastName: 'B', businessName: 'X', email: 'a@b.com',
  industrySector: 'Retail', category: 'Other', subject: 'S', message: 'M',
  ...overrides,
});

const newRemittance = (overrides = {}) => Remittance.create({
  client: clientId, taxType: 'VAT', amount: 100, createdBy: adminId, ...overrides,
});

// ================================================================ access
describe('F06 · access control', () => {
  // SITUATION: unauthenticated request to stats endpoint.
  // CHECKS: 401.
  test('rejects unauthenticated requests with 401', async () => {
    expect((await request(app).get('/api/admin/stats')).status).toBe(401);
  });
});

// ================================================================ response shape
describe('F06 · response shape', () => {
  // SITUATION: no data in db.
  // CHECKS: all counts are zero, avgResponseMinutes is null.
  test('returns correct zero-state shape', async () => {
    const res = await agent.get('/api/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      totalAdmins: 1,
      publishedNewsletters: 0,
      pendingNewsletters: 0,
      pendingInquiries: 0,
      inquiries: { byStatus: { new: 0, in_progress: 0, answered: 0 }, overdue: 0, avgResponseMinutes: null },
      remittances: { byStatus: { Pending: 0, Processing: 0, Remitted: 0, Completed: 0 }, overdue: 0 },
    });
  });
});

// ================================================================ inquiry analytics
describe('F06 · inquiry analytics', () => {
  // SITUATION: one inquiry in each status.
  // CHECKS: byStatus counts are correct, pendingInquiries = new + in_progress.
  test('counts inquiries by status', async () => {
    await newInquiry({ isRead: false, isAnswered: false });
    await newInquiry({ isRead: true, isAnswered: false });
    await newInquiry({ isRead: true, isAnswered: true, repliedAt: new Date() });
    const res = await agent.get('/api/admin/stats');
    expect(res.body.inquiries.byStatus).toEqual({ new: 1, in_progress: 1, answered: 1 });
    expect(res.body.pendingInquiries).toBe(2);
  });

  // SITUATION: answered inquiry with known submitted and replied timestamps.
  // CHECKS: avgResponseMinutes is computed correctly.
  test('calculates avgResponseMinutes', async () => {
    await newInquiry({
      isAnswered: true,
      date: new Date('2025-01-01T08:00:00Z'),
      repliedAt: new Date('2025-01-01T10:00:00Z'), // 120 min
    });
    const res = await agent.get('/api/admin/stats');
    expect(res.body.inquiries.avgResponseMinutes).toBe(120);
  });

  // SITUATION: two answered inquiries, 60 and 180 min response times.
  // CHECKS: avgResponseMinutes is the average (120).
  test('averages response time across multiple answered inquiries', async () => {
    await newInquiry({ isAnswered: true, date: new Date('2025-01-01T08:00:00Z'), repliedAt: new Date('2025-01-01T09:00:00Z') });
    await newInquiry({ isAnswered: true, date: new Date('2025-01-01T08:00:00Z'), repliedAt: new Date('2025-01-01T11:00:00Z') });
    const res = await agent.get('/api/admin/stats');
    expect(res.body.inquiries.avgResponseMinutes).toBe(120);
  });

  // SITUATION: unanswered inquiry submitted well past the 2-business-day threshold.
  // CHECKS: overdue count is 1.
  test('flags overdue unanswered inquiries', async () => {
    await newInquiry({ isAnswered: false, isArchived: false, date: new Date('2020-01-01') });
    const res = await agent.get('/api/admin/stats');
    expect(res.body.inquiries.overdue).toBe(1);
  });

  // SITUATION: answered inquiry that is past the threshold.
  // CHECKS: answered inquiries are never flagged overdue.
  test('does not flag answered inquiries as overdue', async () => {
    await newInquiry({ isAnswered: true, date: new Date('2020-01-01'), repliedAt: new Date() });
    const res = await agent.get('/api/admin/stats');
    expect(res.body.inquiries.overdue).toBe(0);
  });

  // SITUATION: archived inquiry that is past the threshold.
  // CHECKS: archived inquiries are excluded from all counts.
  test('excludes archived inquiries from all counts', async () => {
    await newInquiry({ isAnswered: false, isArchived: true, date: new Date('2020-01-01') });
    const res = await agent.get('/api/admin/stats');
    expect(res.body.inquiries.byStatus).toEqual({ new: 0, in_progress: 0, answered: 0 });
    expect(res.body.inquiries.overdue).toBe(0);
  });
});

// ================================================================ remittance analytics
describe('F06 · remittance analytics', () => {
  // SITUATION: remittances in each status.
  // CHECKS: byStatus counts are correct.
  test('counts remittances by status', async () => {
    await newRemittance({ status: 'Pending' });
    await newRemittance({ status: 'Processing' });
    await newRemittance({ status: 'Remitted' });
    await newRemittance({ status: 'Completed' });
    const res = await agent.get('/api/admin/stats');
    expect(res.body.remittances.byStatus).toEqual({ Pending: 1, Processing: 1, Remitted: 1, Completed: 1 });
  });

  // SITUATION: Pending remittance with a past due date.
  // CHECKS: overdue count is 1.
  test('flags overdue pending remittances', async () => {
    await newRemittance({ status: 'Pending', dueDate: new Date(Date.now() - 2 * DAY) });
    const res = await agent.get('/api/admin/stats');
    expect(res.body.remittances.overdue).toBe(1);
  });

  // SITUATION: Completed and Remitted remittances with past due dates.
  // CHECKS: they are not counted as overdue.
  test.each(['Completed', 'Remitted'])('%s remittances are not overdue even if past due', async (status) => {
    await newRemittance({ status, dueDate: new Date(Date.now() - 2 * DAY) });
    const res = await agent.get('/api/admin/stats');
    expect(res.body.remittances.overdue).toBe(0);
  });

  // SITUATION: Pending remittance with a future due date.
  // CHECKS: not flagged as overdue.
  test('does not flag remittances with future due dates', async () => {
    await newRemittance({ status: 'Pending', dueDate: new Date(Date.now() + 10 * DAY) });
    const res = await agent.get('/api/admin/stats');
    expect(res.body.remittances.overdue).toBe(0);
  });
});
