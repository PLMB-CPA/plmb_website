// F01 · Client Authentication and Registration (api-level)
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
const { sendClientWelcome } = require('../../src/util/emailer');

const CLIENT = {
  email: 'juan@business.com', firstName: 'Juan', lastName: 'Dela Cruz',
  phoneNumber: '09171234567', address: 'Unit 4B, 123 Rizal Ave.',
  city: 'Manila', businessName: 'Dela Cruz Trading Co.',
};
const STRONG = 'Newpass123.';

async function adminAgent() {
  const hashed = await bcrypt.hash('Plmb2026.', 10);
  await Admin.create({ username: 'plmbadmin', password: hashed });
  const agent = request.agent(app);
  await agent.post('/api/admin/login').send({ username: 'plmbadmin', password: 'Plmb2026.' });
  return agent;
}

async function createClient(admin, overrides = {}) {
  const body = { ...CLIENT, ...overrides };
  const res = await admin.post('/api/admin/clients').send(body);
  expect(res.status).toBe(201);
  const calls = sendClientWelcome.mock.calls;
  return { email: body.email, tempPassword: calls[calls.length - 1][1] };
}

async function loginAs(email, password, extra = {}) {
  const agent = request.agent(app);
  const res = await agent.post('/api/client/login').send({ email, password, ...extra });
  return { agent, res };
}

// a client who already replaced the temp password 
async function readyClient(admin, overrides) {
  const { email, tempPassword } = await createClient(admin, overrides);
  const { agent } = await loginAs(email, tempPassword);
  const res = await agent.put('/api/client/password')
    .send({ currentPassword: tempPassword, newPassword: STRONG });
  expect(res.status).toBe(200);
  return { agent, email };
}

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
  await Promise.all([Admin.deleteMany({}), Client.deleteMany({})]);
  jest.clearAllMocks();
  errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});  // the controller logs 500s
});
afterEach(() => errSpy.mockRestore());

// ================================================================ AC1
describe('F01 AC1 · admin adds a client, client logs in', () => {
  // SITUATION: admin submits the Add Client form.
  // CHECKS: 201, the response leaks nothing secret, the db has a bcrypt hash (not the
  // temp password) and mustChangePassword is true.
  test('creates the client with a bcrypt-hashed temp password', async () => {
    const admin = await adminAgent();
    const res = await admin.post('/api/admin/clients').send(CLIENT);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('New client account created.');
    expect(res.body.client).toEqual({
      id: expect.any(String), email: 'juan@business.com', firstName: 'Juan', lastName: 'Dela Cruz',
    });
    const temp = sendClientWelcome.mock.calls[0][1];
    expect(JSON.stringify(res.body)).not.toContain(temp);

    const inDb = await Client.findOne({ email: 'juan@business.com' });
    expect(inDb.password).toMatch(/^\$2[aby]\$/);
    expect(inDb.password).not.toBe(temp);
    expect(await bcrypt.compare(temp, inDb.password)).toBe(true);
    expect(inDb.mustChangePassword).toBe(true);
  });

  // SITUATION: the account is created.
  // CHECKS: exactly ONE welcome email, to the client, with a 12 character temp password.
  test('sends one welcome email to the client with the temp password', async () => {
    const admin = await adminAgent();
    await admin.post('/api/admin/clients').send(CLIENT);

    expect(sendClientWelcome).toHaveBeenCalledTimes(1);
    const [client, temp] = sendClientWelcome.mock.calls[0];
    expect(client.email).toBe('juan@business.com');
    expect(temp).toHaveLength(12);
  });

  test('every client gets a different temp password', async () => {
    const admin = await adminAgent();
    const a = await createClient(admin, { email: 'a@business.com' });
    const b = await createClient(admin, { email: 'b@business.com' });
    expect(a.tempPassword).not.toBe(b.tempPassword);
  });

  // SITUATION: admin types the email with capitals and spaces; the client logs in with other capitals.
  // CHECKS: stored normalized, and login works either way.
  test('email is stored lowercase and trimmed, and login ignores case', async () => {
    const admin = await adminAgent();
    await admin.post('/api/admin/clients').send({ ...CLIENT, email: '  Juan@Business.COM ' });
    expect(await Client.countDocuments({ email: 'juan@business.com' })).toBe(1);

    const temp = sendClientWelcome.mock.calls[0][1];
    const { res } = await loginAs('JUAN@Business.com ', temp);
    expect(res.status).toBe(200);
  });

  // SITUATION: the whole AC1 story from the api's side.
  // CHECKS each step: login says "must change", portal is locked (403) until the change,
  // new password opens it, logout destroys the session, the old temp password is dead,
  // the new one works.
  test('full flow: temp login, forced change, dashboard, logout', async () => {
    const admin = await adminAgent();
    const { email, tempPassword } = await createClient(admin);

    const { agent, res: login } = await loginAs(email, tempPassword);
    expect(login.status).toBe(200);
    expect(login.body).toEqual({ mustChangePassword: true });

    const locked = await agent.get('/api/client/me');
    expect(locked.status).toBe(403);
    expect(locked.body).toEqual({ error: 'Password change required.', mustChangePassword: true });

    const change = await agent.put('/api/client/password')
      .send({ currentPassword: tempPassword, newPassword: STRONG });
    expect(change.status).toBe(200);

    const me = await agent.get('/api/client/me');
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
    expect(me.body.mustChangePassword).toBe(false);
    expect(me.body.password).toBeUndefined();

    expect((await agent.post('/api/client/logout')).status).toBe(200);
    expect((await agent.get('/api/client/me')).status).toBe(401);          // session really gone
    expect((await agent.put('/api/client/password').send({})).status).toBe(401);

    expect((await loginAs(email, tempPassword)).res.status).toBe(401);     // temp password is dead
    const again = await loginAs(email, STRONG);
    expect(again.res.status).toBe(200);
    expect(again.res.body).toEqual({ mustChangePassword: false });
  });

  // SITUATION: gmail is down when the admin creates a client.
  // CHECKS: 502, NO account is left behind, and the admin can simply try again.
  test('if the welcome email fails the account is rolled back', async () => {
    const admin = await adminAgent();
    sendClientWelcome.mockRejectedValueOnce(new Error('smtp down'));

    const res = await admin.post('/api/admin/clients').send(CLIENT);
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Account not created: welcome email could not be sent.');
    expect(await Client.countDocuments()).toBe(0);

    expect((await admin.post('/api/admin/clients').send(CLIENT)).status).toBe(201);
  });

  // SITUATION: "Remember Me" ticked or not.
  // CHECKS: ticked means a cookie that expires in ~30 days; not ticked means a browser-session
  // cookie. both are HttpOnly and SameSite=Lax.
  test('remember me controls the cookie lifetime', async () => {
    const admin = await adminAgent();
    const { email, tempPassword } = await createClient(admin);

    const plain = (await loginAs(email, tempPassword)).res.headers['set-cookie'][0];
    const remembered = (await loginAs(email, tempPassword, { remember: true })).res.headers['set-cookie'][0];

    expect(plain).toMatch(/^plmb\.sid=/);
    expect(plain).not.toMatch(/Expires=|Max-Age=/i);
    expect(plain).toMatch(/HttpOnly/i);
    expect(plain).toMatch(/SameSite=Lax/i);

    const days = (new Date(remembered.match(/Expires=([^;]+)/i)[1]) - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(31);
  });
});

// ================================================================ AC2
describe('F01 AC2 · invalid input creates no account or session', () => {
  // SITUATION: the admin leaves one required field out (each of the 7 in turn).
  // CHECKS: 400, nothing saved, no email sent.
  test.each(['email', 'firstName', 'lastName', 'phoneNumber', 'address', 'city', 'businessName'])(
    'missing %s is rejected', async (field) => {
      const admin = await adminAgent();
      const body = { ...CLIENT };
      delete body[field];

      const res = await admin.post('/api/admin/clients').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Please recheck missing information.');
      expect(await Client.countDocuments()).toBe(0);
      expect(sendClientWelcome).not.toHaveBeenCalled();
    });

  // SITUATION: the admin adds the same client twice (second time with different capitals).
  test('a duplicate email is rejected with 409 and sends no second email', async () => {
    const admin = await adminAgent();
    await createClient(admin);

    const dup = await admin.post('/api/admin/clients').send({ ...CLIENT, email: ' JUAN@business.com ' });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toBe('Client account already exists.');
    expect(await Client.countDocuments()).toBe(1);
    expect(sendClientWelcome).toHaveBeenCalledTimes(1);
  });

  // SITUATION: login with a missing field.
  // CHECKS: 400 and NO session cookie was created.
  test.each([
    ['no email', { password: 'x' }],
    ['no password', { email: 'juan@business.com' }],
    ['nothing', {}],
  ])('login with %s is rejected', async (_l, body) => {
    const res = await request(app).post('/api/client/login').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email and password are required.');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  // SITUATION: wrong password, and an email that doesn't exist.
  // CHECKS: both give 401 with the SAME message (an attacker can't tell which accounts
  // exist), no session cookie, and the portal stays closed.
  test('wrong password and unknown email look identical and create no session', async () => {
    const admin = await adminAgent();
    const { email } = await createClient(admin);

    const wrongPw = await request(app).post('/api/client/login').send({ email, password: 'nope' });
    const unknown = await request(app).post('/api/client/login').send({ email: 'nobody@x.com', password: 'nope' });

    expect(wrongPw.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPw.body).toEqual({ error: 'Invalid email or password.' });
    expect(unknown.body).toEqual(wrongPw.body);
    expect(wrongPw.headers['set-cookie']).toBeUndefined();
    expect(unknown.headers['set-cookie']).toBeUndefined();
  });

  // SITUATION: client picks a bad new password (one rule broken at a time).
  // CHECKS: 400 with the message for THAT rule, and the db is unchanged (temp password still
  // works, mustChangePassword still true).
  test.each([
    ['too short (9 chars)', 'Abcdefg1.', 'Password must be at least 10 characters long'],
    ['no special character', 'Abcdefghi12', 'Password must have at least one (1) special character'],
    ['no capital letter', 'abcdefghi1.', 'Password must have at least one (1) capitalized letter'],
    ['no number', 'Abcdefghij.', 'Password must have at least one (1) number'],
  ])('new password %s is rejected', async (_l, newPassword, message) => {
    const admin = await adminAgent();
    const { email, tempPassword } = await createClient(admin);
    const { agent } = await loginAs(email, tempPassword);

    const res = await agent.put('/api/client/password').send({ currentPassword: tempPassword, newPassword });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(message);

    const inDb = await Client.findOne({ email });
    expect(await bcrypt.compare(tempPassword, inDb.password)).toBe(true);
    expect(inDb.mustChangePassword).toBe(true);
  });

  test('wrong current password and missing fields are rejected', async () => {
    const admin = await adminAgent();
    const { email, tempPassword } = await createClient(admin);
    const { agent } = await loginAs(email, tempPassword);

    const wrong = await agent.put('/api/client/password').send({ currentPassword: 'nope', newPassword: STRONG });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error).toBe('Current password is incorrect.');

    const empty = await agent.put('/api/client/password').send({});
    expect(empty.status).toBe(400);
    expect(empty.body.error).toBe('Current and new password are required.');
  });

  test('new password cannot be the same as the current one', async () => {
    const admin = await adminAgent();
    const { agent } = await readyClient(admin);
    const res = await agent.put('/api/client/password').send({ currentPassword: STRONG, newPassword: STRONG });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('New password must be different from the current one.');
  });
});

// ================================================================ AC3
describe('F01 AC3 · not logged in as a client', () => {
  // SITUATION: a visitor calls every client and admin-client endpoint with no login.
  test.each([
    ['get', '/api/client/me'],
    ['put', '/api/client/password'],
    ['get', '/api/admin/clients'],
    ['post', '/api/admin/clients'],
  ])('%s %s returns 401', async (method, path) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(401);
  });

  // SITUATION: a client with a temp password skips the change page and calls the portal directly.
  // CHECKS: 403 on the portal route, but the change-password route stays reachable.
  test('a client who has not changed the temp password is locked out of the portal', async () => {
    const admin = await adminAgent();
    const { email, tempPassword } = await createClient(admin);
    const { agent } = await loginAs(email, tempPassword);

    expect((await agent.get('/api/client/me')).status).toBe(403);
    const change = await agent.put('/api/client/password')
      .send({ currentPassword: tempPassword, newPassword: STRONG });
    expect(change.status).toBe(200);
  });

  // SITUATION: a logged-in CLIENT pokes at admin endpoints, and an ADMIN at client endpoints.
  test('a client session cannot use admin routes', async () => {
    const admin = await adminAgent();
    const { agent } = await readyClient(admin);

    for (const [method, path] of [
      ['get', '/api/admin/clients'], ['post', '/api/admin/clients'],
      ['get', '/api/admin/users'], ['get', '/api/inquiries'], ['get', '/api/inquiries/stats'],
    ]) {
      expect((await agent[method](path).send({})).status).toBe(401);
    }
  });

  test('an admin session cannot use client routes', async () => {
    const admin = await adminAgent();
    expect((await admin.get('/api/client/me')).status).toBe(401);
    expect((await admin.put('/api/client/password').send({})).status).toBe(401);
  });

  // SITUATION: two clients logged in at the same time; one tries to ask for the other's data.
  // CHECKS: each only ever sees their own record, even with an id in the url.
  test('client A can never see client B', async () => {
    const admin = await adminAgent();
    const a = await readyClient(admin, { email: 'a@business.com', firstName: 'Ana' });
    const b = await readyClient(admin, { email: 'b@business.com', firstName: 'Ben' });
    const bId = (await Client.findOne({ email: 'b@business.com' }))._id;

    expect((await a.agent.get('/api/client/me')).body.email).toBe('a@business.com');
    expect((await b.agent.get('/api/client/me')).body.email).toBe('b@business.com');
    expect((await a.agent.get(`/api/client/me?id=${bId}`)).body.email).toBe('a@business.com');
  });

  // SITUATION: admin opens the client list.
  // CHECKS: newest first, and no password hash anywhere in the response.
  test('admin client list is newest first and never leaks hashes', async () => {
    const admin = await adminAgent();
    await createClient(admin, { email: 'first@business.com' });
    await new Promise((r) => setTimeout(r, 20));
    await createClient(admin, { email: 'second@business.com' });

    const res = await admin.get('/api/admin/clients');
    expect(res.status).toBe(200);
    expect(res.body.map((c) => c.email)).toEqual(['second@business.com', 'first@business.com']);
    res.body.forEach((c) => expect(c.password).toBeUndefined());
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
  });

  // SITUATION: another website tries to log a client in through the browser (CSRF style).
  // CHECKS: a foreign Origin is blocked before reaching the route; a same-site Origin gets through
  // (it fails with 401 only because the password is wrong). if the second part errors, it is the
  // Host header trick in the test, not the app, and you can delete that half.
  test('the cross-site origin guard also covers the client login', async () => {
    const evil = await request(app).post('/api/client/login')
      .set('Origin', 'https://evil.example').send({ email: 'a@b.com', password: 'x' });
    expect(evil.status).toBe(403);
    expect(evil.body).toEqual({ error: 'Origin not allowed.' });
    expect(evil.headers['set-cookie']).toBeUndefined();

    const same = await request(app).post('/api/client/login')
      .set('Host', 'plmb.test').set('Origin', 'http://plmb.test')
      .send({ email: 'a@b.com', password: 'x' });
    expect(same.status).toBe(401);
  });
});

// passes while the bug exists, goes red when it's fixed 
describe('F01 · known bugs', () => {
  test.failing('create rejects an email that is not an email (AC2 invalid format)', async () => {
    const admin = await adminAgent();
    const res = await admin.post('/api/admin/clients').send({ ...CLIENT, email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(await Client.countDocuments()).toBe(0);
  });

  test.failing('create rejects a first name that is only spaces', async () => {
    const admin = await adminAgent();
    const res = await admin.post('/api/admin/clients').send({ ...CLIENT, firstName: '   ' });
    expect(res.status).toBe(400);
  });

  test.failing('create answers 400, not 500, when the email is not a string', async () => {
    const admin = await adminAgent();
    const res = await admin.post('/api/admin/clients').send({ ...CLIENT, email: 12345 });
    expect(res.status).toBe(400);
  });

  test.failing('login answers 400 or 401, not 500, when the email is not a string', async () => {
    const res = await request(app).post('/api/client/login').send({ email: 12345, password: 'x' });
    expect([400, 401]).toContain(res.status);
  });

  test.failing('login answers 400 or 401, not 500, when the password is not a string', async () => {
    const admin = await adminAgent();
    const { email } = await createClient(admin);
    const res = await request(app).post('/api/client/login').send({ email, password: 12345 });
    expect([400, 401]).toContain(res.status);
  });

  test.failing('the missing-field error says which field is missing (AC2)', async () => {
    const admin = await adminAgent();
    const body = { ...CLIENT };
    delete body.email;
    const res = await admin.post('/api/admin/clients').send(body);
    expect(res.body.error).toMatch(/email/i);
  });

  // SPEC QUESTION first: should "+" count as a special character?
  test.failing('"+" is accepted as a special character', async () => {
    const admin = await adminAgent();
    const { email, tempPassword } = await createClient(admin);
    const { agent } = await loginAs(email, tempPassword);
    const res = await agent.put('/api/client/password')
      .send({ currentPassword: tempPassword, newPassword: 'Newpass123+' });
    expect(res.status).toBe(200);
  });
});