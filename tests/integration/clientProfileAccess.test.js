// F02 · Client Profile: access control, missing data and how birthday/TIN get in (api-level)
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

const app = require('../../src/app');
const Admin = require('../../src/models/Admin');
const Client = require('../../src/models/Client');

const PASSWORD = 'Newpass123.';

const base = (n, over = {}) => ({
  email: `client${n}@business.com`,
  firstName: `First${n}`, lastName: `Last${n}`,
  phoneNumber: '09171234567', address: 'Unit 4B, 123 Rizal Ave.', city: 'Manila',
  businessName: `Business ${n}`, tin: `111-222-333-00${n}`, birthday: new Date('1990-05-17'),
  mustChangePassword: false,
  ...over,
});
async function loginClient(n, over = {}) {
  await Client.create({ ...base(n, over), password: await bcrypt.hash(PASSWORD, 10) });
  const agent = request.agent(app);
  const res = await agent.post('/api/client/login').send({ email: `client${n}@business.com`, password: PASSWORD });
  expect(res.status).toBe(200);
  return agent;
}
async function adminAgent() {
  await Admin.create({ username: 'plmbadmin', password: await bcrypt.hash('Plmb2026.', 10) });
  const agent = request.agent(app);
  await agent.post('/api/admin/login').send({ username: 'plmbadmin', password: 'Plmb2026.' });
  return agent;
}
const newClientBody = (over = {}) => ({
  email: 'new@business.com', firstName: 'Ana', lastName: 'Reyes', phoneNumber: '09171234567',
  address: 'Unit 4B, 123 Rizal Ave.', city: 'Manila', businessName: 'Reyes Co.', ...over,
});

let mongo, errSpy;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
afterAll(async () => {
  await mongoose.connection.close();
  if (mongo) await mongo.stop();
});
beforeEach(async () => {
  await Promise.all([Client.deleteMany({}), Admin.deleteMany({})]);
  jest.clearAllMocks();
  errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errSpy.mockRestore());

// ================================================================ AC3
describe('F02 AC3 · who can read the profile', () => {
  // SITUATION: nobody is logged in and calls /api/client/me.
  // CHECKS: 401 and the body contains no personal data.
  test('logged out gets 401 and no personal data', async () => {
    await Client.create({ ...base(1), password: await bcrypt.hash(PASSWORD, 10) });
    const res = await request(app).get('/api/client/me');
    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toMatch(/111-222-333|client1@business|First1/);
  });

  // SITUATION: the session expired (simulation by logging out, which destroys the session).
  // CHECKS: the same cookie no longer works: 401 and no data.
  test('after logout the old session cannot read the profile', async () => {
    const agent = await loginClient(1);
    expect((await agent.get('/api/client/me')).status).toBe(200);
    await agent.post('/api/client/logout');
    const res = await agent.get('/api/client/me');
    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toMatch(/111-222-333/);
  });

  // SITUATION: client still has the temporary password.
  // CHECKS: 403 with mustChangePassword and no profile data (TIN).
  test('a client on the temp password gets 403 and no personal data', async () => {
    await Client.create({ ...base(1, { mustChangePassword: true }), password: await bcrypt.hash(PASSWORD, 10) });
    const agent = request.agent(app);
    await agent.post('/api/client/login').send({ email: 'client1@business.com', password: PASSWORD });
    const res = await agent.get('/api/client/me');
    expect(res.status).toBe(403);
    expect(res.body.mustChangePassword).toBe(true);
    expect(JSON.stringify(res.body)).not.toMatch(/111-222-333|client1@business/);
  });

  // SITUATION: an admin (no client session) calls the client profile endpoint.
  // CHECKS: 401 and no data.
  test('an admin session cannot use the client profile endpoint', async () => {
    await Client.create({ ...base(1), password: await bcrypt.hash(PASSWORD, 10) });
    const admin = await adminAgent();
    const res = await admin.get('/api/client/me');
    expect(res.status).toBe(401);
    expect(JSON.stringify(res.body)).not.toMatch(/111-222-333/);
  });

  // SITUATION: client 1 is logged in and tries to read client 2 by adding an id/email to the url.
  // CHECKS: the query is ignored, client 1 only ever gets client 1 (and never client 2's TIN).
  // WHY: access is session-based, so the bracketed "cross-client 403" text of AC3 does not apply.
  test('a client cannot read another client by changing the url', async () => {
    const agent = await loginClient(1);
    await Client.create({ ...base(2), password: await bcrypt.hash(PASSWORD, 10) });
    const two = await Client.findOne({ email: 'client2@business.com' });

    const res = await agent.get(`/api/client/me?id=${two._id}&email=client2@business.com&clientId=${two._id}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('client1@business.com');
    expect(JSON.stringify(res.body)).not.toMatch(/111-222-333-002|client2@business/);
  });
});

// ================================================================ AC2
describe('F02 AC2 · profile with missing data', () => {
  // SITUATION: a client with no birthday and no TIN logs in.
  // CHECKS: 200 and those fields are simply absent, so the page can show a placeholder.
  test('missing birthday and TIN do not break the endpoint', async () => {
    const agent = await loginClient(1, { birthday: undefined, tin: undefined });
    const res = await agent.get('/api/client/me');
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('First1');
    expect(res.body.tin).toBeUndefined();
    expect(res.body.birthday).toBeUndefined();
  });
});

// ================================================================ how birthday and TIN get in
describe('F02 · birthday and TIN when an admin creates a client', () => {
  // SITUATION: admin creates a client through the api with a birthday and a TIN.
  // CHECKS: both are saved and the client sees them on /api/client/me after the first login.
  test('birthday and TIN are saved and shown to the client', async () => {
    const admin = await adminAgent();
    const res = await admin.post('/api/admin/clients').send(newClientBody({ birthday: '1990-05-17', tin: '123-456-789-000' }));
    expect(res.status).toBe(201);
    const saved = await Client.findOne({ email: 'new@business.com' });
    expect(saved.tin).toBe('123-456-789-000');
    expect(saved.birthday.toISOString()).toMatch(/^1990-05-17/);
  });

  // SITUATION: admin creates a client WITHOUT birthday/TIN (what the Add Client form does today:
  //            the form has no birthday or TIN field).
  // CHECKS: the account is created fine and both fields stay empty.
  test('creating a client without birthday and TIN works, both stay empty', async () => {
    const admin = await adminAgent();
    const res = await admin.post('/api/admin/clients').send(newClientBody());
    expect(res.status).toBe(201);
    const saved = await Client.findOne({ email: 'new@business.com' });
    expect(saved.tin).toBeUndefined();
    expect(saved.birthday).toBeUndefined();
  });

  // SITUATION: admin enters a nonsense TIN.
  // CHECKS: it should be refused (400). Today any text is accepted and saved.
  test.failing('GAP (AC2): an invalid TIN is rejected', async () => {
    const admin = await adminAgent();
    const res = await admin.post('/api/admin/clients').send(newClientBody({ tin: 'not-a-tin' }));
    expect(res.status).toBe(400);
    expect(await Client.countDocuments()).toBe(0);
  });

  // SITUATION: admin sends a birthday that is not a date.
  // CHECKS: should be a clean 400. Today it is a 500 "An error occurred" because mongoose fails to cast it.
  test.failing('GAP: an invalid birthday gets a 400, not a 500', async () => {
    const admin = await adminAgent();
    const res = await admin.post('/api/admin/clients').send(newClientBody({ birthday: 'not-a-date' }));
    expect(res.status).toBe(400);
  });
});
