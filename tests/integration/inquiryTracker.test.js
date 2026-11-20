// F03 · Admin Inquiry Tracking (api level)
const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../../src/util/emailer', () => ({
  sendInquiryNotification: jest.fn().mockResolvedValue(),
  sendConfirmation: jest.fn().mockResolvedValue(),
  sendReply: jest.fn().mockResolvedValue(),
  sendReplyEmail: jest.fn().mockResolvedValue(),
}));
jest.mock('../../src/util/emailValidator', () => ({
  isValidInquiryEmail: jest.fn().mockResolvedValue({ valid: true }),
}));

const app = require('../../src/app');
const Admin = require('../../src/models/Admin');
const Inquiry = require('../../src/models/Inquiry');
const { sendReplyEmail } = require('../../src/util/emailer');

const PAYLOAD = {
  firstName: 'Juan', lastName: 'Dela Cruz', businessName: 'JDC Corp',
  email: 'juan@gmail.com', number: '09171234567', industrySector: 'Retail',
  category: 'Audit & Assurance', subject: 'Statutory Audit Inquiry',
  message: 'We need an audit quote for FY 2026.',
};

async function createAdminAndLogin() {
  const hashed = await bcrypt.hash('Plmb2026.', 10);
  await Admin.create({ username: 'plmbadmin', password: hashed });
  const agent = request.agent(app);
  await agent.post('/api/admin/login').send({ username: 'plmbadmin', password: 'Plmb2026.' });
  return agent;
}

const minutesAgo = (n) => new Date(Date.now() - n * 60000);
const daysAgo = (n) => minutesAgo(n * 24 * 60);
const makeInquiry = (extra = {}) =>
  Inquiry.create({ ...PAYLOAD, ticketNumber: 'INQ-0001', ...extra });


function answeredInquiry(ticketNumber, minutes) {
  const date = daysAgo(10);
  return {
    ...PAYLOAD, ticketNumber, date, isRead: true, isAnswered: true,
    repliedAt: new Date(date.getTime() + minutes * 60000), responseTimeMinutes: minutes,
  };
}

let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
afterAll(async () => {
  await mongoose.connection.close();
  if (mongo) await mongo.stop();       
});
beforeEach(async () => {
  await Promise.all([Admin.deleteMany({}), Inquiry.deleteMany({})]);
  jest.clearAllMocks();
});

// ---------------------------------------------------------------- AC1
describe('F03 AC1 · analytics and response time', () => {
  // SITUATION: the db has one inquiry in every state (new, in progress, overdue,
  // answered x2, archived). 
  // CHECKS: every number on the tracker is exact, and
  // total = new + inProgress + answered + archived. 
  test('GET /api/inquiries/stats returns the correct numbers', async () => {
    const agent = await createAdminAndLogin();
    await Inquiry.create([
      { ...PAYLOAD, ticketNumber: 'INQ-0001' },                                    // new
      { ...PAYLOAD, ticketNumber: 'INQ-0002', isRead: true, date: daysAgo(30) },   // in progress + overdue
      answeredInquiry('INQ-0003', 90),
      answeredInquiry('INQ-0004', 30),
      { ...PAYLOAD, ticketNumber: 'INQ-0005', isArchived: true, date: daysAgo(30) }, // archived, not overdue
    ]);

    const res = await agent.get('/api/inquiries/stats');
    const s = res.body.stats;

    expect(res.status).toBe(200);
    expect(s).toEqual({
      total: 5, new: 1, inProgress: 1, answered: 2, archived: 1,
      overdue: 1, replied: 2, averageResponseTimeMinutes: 60,   
    });
    expect(s.total).toBe(s.new + s.inProgress + s.answered + s.archived);
  });

  // SITUATION: brand new system, no inquiries. 
  // CHECKS: zeros and a null average (not NaN).
  test('stats on an empty database are all zero with a null average', async () => {
    const agent = await createAdminAndLogin();
    const res = await agent.get('/api/inquiries/stats');
    expect(res.body.stats).toEqual({
      total: 0, new: 0, inProgress: 0, answered: 0, archived: 0,
      overdue: 0, replied: 0, averageResponseTimeMinutes: null,
    });
  });

  // SITUATION: admin replies to an inquiry submitted 2 hours ago.
  // CHECKS: response time (~120 min) is saved, returned by the api, and the tracker counts it.
  test('a reply stores the response time and the tracker picks it up', async () => {
    const agent = await createAdminAndLogin();
    const inquiry = await makeInquiry({ date: minutesAgo(120) });

    const reply = await agent
      .post(`/api/inquiries/${inquiry._id}/reply`)
      .send({ reply: 'We can help with that.' });
    expect(reply.status).toBe(200);
    const minutes = reply.body.inquiry.responseTimeMinutes;
    expect(Math.abs(minutes - 120)).toBeLessThanOrEqual(1);

    const stored = await Inquiry.findById(inquiry._id);
    expect(stored.repliedAt).toBeInstanceOf(Date);
    expect(stored.isAnswered).toBe(true);
    expect(stored.responseTimeMinutes).toBe(minutes);

    const detail = await agent.get(`/api/inquiries/${inquiry._id}`);
    expect(detail.body.inquiry.responseTimeMinutes).toBe(minutes);

    const { stats } = (await agent.get('/api/inquiries/stats')).body;
    expect(stats).toMatchObject({ total: 1, new: 0, inProgress: 0, answered: 1, replied: 1 });
    expect(Math.abs(stats.averageResponseTimeMinutes - 120)).toBeLessThanOrEqual(1);
  });

  // SITUATION: a valid reply. CHECKS: ONE email to the client, with the TRIMMED text.
  test('a valid reply emails the client once with the trimmed text', async () => {
    const agent = await createAdminAndLogin();
    const inquiry = await makeInquiry();

    await agent.post(`/api/inquiries/${inquiry._id}/reply`).send({ reply: '  Hello  ' });

    expect(sendReplyEmail).toHaveBeenCalledTimes(1);
    expect(sendReplyEmail.mock.calls[0][0].email).toBe('juan@gmail.com');
    expect(sendReplyEmail.mock.calls[0][1]).toBe('Hello');
    expect((await Inquiry.findById(inquiry._id)).reply).toBe('Hello');
  });
});

// ---------------------------------------------------------------- AC2
describe('F03 AC2 · invalid replies change nothing', () => {
  async function expectUntouched(inquiry) {
    const inDb = await Inquiry.findById(inquiry._id);
    expect(inDb.isAnswered).toBe(false);
    expect(inDb.reply).toBeNull();
    expect(inDb.repliedAt).toBeNull();
    expect(inDb.responseTimeMinutes).toBeNull();
    expect(sendReplyEmail).not.toHaveBeenCalled();
  }

  // SITUATION: admin sends nothing, only whitespace, or a wrong type.
  // CHECKS: 400 with the error message, status unchanged, no email.
  test.each([
    ['empty string', ''],
    ['spaces only', '   '],
    ['tabs and newlines only', '\n\t  '],
    ['a number', 123],
    ['null', null],
    ['an array', ['hi']],
  ])('reply that is %s is rejected', async (_label, reply) => {
    const agent = await createAdminAndLogin();
    const inquiry = await makeInquiry();

    const res = await agent.post(`/api/inquiries/${inquiry._id}/reply`).send({ reply });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Please enter a reply before sending.');
    await expectUntouched(inquiry);
  });

  test('a missing reply field is rejected', async () => {
    const agent = await createAdminAndLogin();
    const inquiry = await makeInquiry();
    const res = await agent.post(`/api/inquiries/${inquiry._id}/reply`).send({});
    expect(res.status).toBe(400);
    await expectUntouched(inquiry);
  });

  // SITUATION: reply is longer than the limit. 
  // CHECKS: 10,001 chars rejected, exactly 10,000 allowed.
  test('10,001 characters is rejected', async () => {
    const agent = await createAdminAndLogin();
    const inquiry = await makeInquiry();
    const res = await agent
      .post(`/api/inquiries/${inquiry._id}/reply`)
      .send({ reply: 'a'.repeat(10001) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Reply must be 10,000 characters or fewer.');
    await expectUntouched(inquiry);
  });

  test('exactly 10,000 characters is accepted', async () => {
    const agent = await createAdminAndLogin();
    const inquiry = await makeInquiry();
    const res = await agent
      .post(`/api/inquiries/${inquiry._id}/reply`)
      .send({ reply: 'a'.repeat(10000) });
    expect(res.status).toBe(200);
  });

  // SITUATION: gmail is down when the admin sends a valid reply.
  // CHECKS: 500 with a retry message, and NOTHING is saved (still unanswered).
  test('if the reply email fails, nothing is saved', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    sendReplyEmail.mockRejectedValueOnce(new Error('smtp down'));
    const agent = await createAdminAndLogin();
    const inquiry = await makeInquiry();

    const res = await agent.post(`/api/inquiries/${inquiry._id}/reply`).send({ reply: 'Hello' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Unable to send reply. Please try again.');
    const inDb = await Inquiry.findById(inquiry._id);
    expect(inDb.isAnswered).toBe(false);
    expect(inDb.reply).toBeNull();
    expect(inDb.repliedAt).toBeNull();
    errSpy.mockRestore();
  });

  // SITUATION: a second admin (or a double click) replies to an inquiry that already has a reply.
  // CHECKS: 409, the first reply is kept, no second email.
  test('a second reply is rejected with 409', async () => {
    const agent = await createAdminAndLogin();
    const inquiry = await makeInquiry({ reply: 'First', repliedAt: new Date(), isAnswered: true });

    const res = await agent.post(`/api/inquiries/${inquiry._id}/reply`).send({ reply: 'Second' });

    expect(res.status).toBe(409);
    expect((await Inquiry.findById(inquiry._id)).reply).toBe('First');
    expect(sendReplyEmail).not.toHaveBeenCalled();
  });

  test.each([
    ['post', '/api/inquiries/not-an-id/reply'],
    ['patch', '/api/inquiries/not-an-id'],
  ])('%s %s returns 400 on a malformed id', async (method, path) => {
    const agent = await createAdminAndLogin();
    const res = await agent[method](path).send({ reply: 'hi', isRead: true });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------- AC3
describe('F03 AC3 · not logged in as admin', () => {
  const id = new mongoose.Types.ObjectId();

  // SITUATION: a visitor calls every admin inquiry endpoint without logging in.
  // CHECKS: all return 401.
  test.each([
    ['get', '/api/inquiries'],
    ['get', '/api/inquiries/stats'],
    ['get', `/api/inquiries/${id}`],
    ['patch', `/api/inquiries/${id}`],
    ['post', `/api/inquiries/${id}/reply`],
    ['delete', `/api/inquiries/${id}`],
  ])('%s %s returns 401', async (method, path) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(401);
  });

  // SITUATION: admin logs out, then someone uses the same browser session.
  // CHECKS: stats are blocked after logout.
  test('after logout the same session is blocked', async () => {
    const agent = await createAdminAndLogin();
    expect((await agent.get('/api/inquiries/stats')).status).toBe(200);
    await agent.get('/api/admin/logout');
    expect((await agent.get('/api/inquiries/stats')).status).toBe(401);
  });
});

// ------------------------------------------------- supporting + known bugs
describe('F03 · filters and known bugs', () => {
  test('filters by isAnswered and isRead (groupmates only tested isArchived)', async () => {
    const agent = await createAdminAndLogin();
    await Inquiry.create([
      { ...PAYLOAD, ticketNumber: 'INQ-0001', isAnswered: false, isRead: false },
      { ...PAYLOAD, ticketNumber: 'INQ-0002', isAnswered: true, isRead: true },
    ]);
    const tickets = (res) => res.body.inquiries.map((i) => i.ticketNumber);

    expect(tickets(await agent.get('/api/inquiries?isAnswered=false'))).toEqual(['INQ-0001']);
    expect(tickets(await agent.get('/api/inquiries?isAnswered=true'))).toEqual(['INQ-0002']);
    expect(tickets(await agent.get('/api/inquiries?isRead=false'))).toEqual(['INQ-0001']);
  });

  test('marking as read is saved in the database, not just echoed', async () => {
    const agent = await createAdminAndLogin();
    const inquiry = await makeInquiry();
    await agent.patch(`/api/inquiries/${inquiry._id}`).send({ isRead: true });
    expect((await Inquiry.findById(inquiry._id)).isRead).toBe(true);
  });

  // passes while the bug exists and turns red when it's fixed
  test('ticket numbers stay unique after an inquiry is deleted', async () => {
    await request(app).post('/api/inquiries').send(PAYLOAD);                                    // INQ-0001
    await request(app).post('/api/inquiries').send({ ...PAYLOAD, email: 'ana@gmail.com' });     // INQ-0002
    await Inquiry.deleteOne({ ticketNumber: 'INQ-0001' });
    await request(app).post('/api/inquiries').send({ ...PAYLOAD, email: 'ben@gmail.com' });     // INQ-0002 again

    const tickets = (await Inquiry.find()).map((i) => i.ticketNumber);
    expect(new Set(tickets).size).toBe(tickets.length);
  });

  test('PATCH cannot overwrite protected fields', async () => {
    const agent = await createAdminAndLogin();
    const inquiry = await makeInquiry();

    await agent.patch(`/api/inquiries/${inquiry._id}`).send({
      ticketNumber: 'HACKED', email: 'evil@x.com', reply: '   ',
      repliedAt: new Date(), responseTimeMinutes: 1,
    });

    const inDb = await Inquiry.findById(inquiry._id);
    expect(inDb.ticketNumber).toBe('INQ-0001');
    expect(inDb.email).toBe('juan@gmail.com');
    expect(inDb.reply).toBeNull();
    expect(inDb.repliedAt).toBeNull();
    expect(inDb.responseTimeMinutes).toBeNull();
  });

  test('PATCH on a nonexistent inquiry returns 404', async () => {
    const agent = await createAdminAndLogin();
    const res = await agent
      .patch(`/api/inquiries/${new mongoose.Types.ObjectId()}`)
      .send({ isRead: true });
    expect(res.status).toBe(404);
  });
});