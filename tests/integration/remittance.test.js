// F04 · Client Tax Remittance Status Tracking (api-level)
// Routes under test:
//   admin : GET/POST /api/admin/remittances, PUT/DELETE /api/admin/remittances/:id
//   client: GET /api/client/remittances
// test.failing = a confirmed bug. It PASSES while the bug exists and turns RED the day the
// bug is fixed. When that happens, change test.failing back to test.
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
const Remittance = require('../../src/models/Remittance');
const { sendClientWelcome } = require('../../src/util/emailer');

const STRONG = 'Newpass123.';
const GHOST_ID = '64b7f0f2f2f2f2f2f2f2f2f2';   // a valid ObjectId that matches nothing
const DAY = 24 * 60 * 60 * 1000;
const inDays = (n) => new Date(Date.now() + n * DAY).toISOString();

// ---------------------------------------------------------------- helpers
async function adminAgent() {
  const hashed = await bcrypt.hash('Plmb2026.', 10);
  const admin = await Admin.create({ username: 'plmbadmin', password: hashed });
  const agent = request.agent(app);
  await agent.post('/api/admin/login').send({ username: 'plmbadmin', password: 'Plmb2026.' });
  return { agent, adminId: String(admin._id) };
}

// creates a client through the real endpoint, returns its id + temp password
async function newClient(admin, n = 1) {
  const body = {
    email: `client${n}@business.com`, firstName: `First${n}`, lastName: `Last${n}`,
    phoneNumber: '09171234567', address: 'Unit 4B, 123 Rizal Ave.', city: 'Manila',
    businessName: `Business ${n}`,
  };
  const res = await admin.post('/api/admin/clients').send(body);
  expect(res.status).toBe(201);
  const calls = sendClientWelcome.mock.calls;
  return { id: res.body.client.id, email: body.email, tempPassword: calls[calls.length - 1][1] };
}

// a client who already replaced the temp password (so requireClient lets them in)
async function readyClient(admin, n = 1) {
  const c = await newClient(admin, n);
  const agent = request.agent(app);
  await agent.post('/api/client/login').send({ email: c.email, password: c.tempPassword });
  const res = await agent.put('/api/client/password')
    .send({ currentPassword: c.tempPassword, newPassword: STRONG });
  expect(res.status).toBe(200);
  return { ...c, agent };
}

const addRemittance = (admin, over = {}) =>
  admin.post('/api/admin/remittances').send({ taxType: 'VAT', amount: 1500, ...over });

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
  await Promise.all([Admin.deleteMany({}), Client.deleteMany({}), Remittance.deleteMany({})]);
  jest.clearAllMocks();
  errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});  // controller logs every 400/500
});
afterEach(() => errSpy.mockRestore());

// ================================================================ access control
describe('F04 · who may call the remittance api', () => {
  // SITUATION: nobody is logged in and calls each admin remittance endpoint.
  // CHECKS: all four answer 401.
  // WHY: remittances are financial data, only a logged-in admin may read or change them.
  test.each([
    ['get', '/api/admin/remittances'],
    ['post', '/api/admin/remittances'],
    ['put', `/api/admin/remittances/${GHOST_ID}`],
    ['delete', `/api/admin/remittances/${GHOST_ID}`],
  ])('logged out: %s %s is 401', async (method, url) => {
    const res = await request(app)[method](url).send({ client: GHOST_ID, taxType: 'VAT', amount: 1, status: 'Completed' });
    expect(res.status).toBe(401);
  });

  // SITUATION: a CLIENT (logged in, password already changed) calls the admin endpoints.
  // CHECKS: 401 for list, create, update and delete, and nothing changes in the db.
  // WHY: a client must not be able to read other clients' records or edit/delete their own status.
  test('a client session cannot use the admin endpoints', async () => {
    const { agent: admin } = await adminAgent();
    const c = await readyClient(admin);
    const made = await addRemittance(admin, { client: c.id });
    const rid = made.body.remittance._id;

    expect((await c.agent.get('/api/admin/remittances')).status).toBe(401);
    expect((await c.agent.post('/api/admin/remittances').send({ client: c.id, taxType: 'VAT', amount: 5 })).status).toBe(401);
    expect((await c.agent.put(`/api/admin/remittances/${rid}`).send({ status: 'Completed' })).status).toBe(401);
    expect((await c.agent.delete(`/api/admin/remittances/${rid}`)).status).toBe(401);

    const stillThere = await Remittance.findById(rid);
    expect(stillThere.status).toBe('Pending');
    expect(await Remittance.countDocuments()).toBe(1);
  });

  // SITUATION: client page endpoint with no session, with an admin-only session, and with a temp password.
  // CHECKS: 401, 401, and 403 + mustChangePassword.
  test('GET /api/client/remittances needs a client who already changed the temp password', async () => {
    const { agent: admin } = await adminAgent();
    expect((await request(app).get('/api/client/remittances')).status).toBe(401);
    expect((await admin.get('/api/client/remittances')).status).toBe(401);

    const c = await newClient(admin);
    const agent = request.agent(app);
    await agent.post('/api/client/login').send({ email: c.email, password: c.tempPassword });
    const res = await agent.get('/api/client/remittances');
    expect(res.status).toBe(403);
    expect(res.body.mustChangePassword).toBe(true);
  });
});

// ================================================================ create
describe('F04 · admin adds a remittance record', () => {
  // SITUATION: admin fills tax type, amount, due date for a client.
  // CHECKS: 201, saved with Pending status, creator and lastEditedBy = the admin, due date kept.
  test('creates a record with default status Pending and the admin as creator', async () => {
    const { agent: admin, adminId } = await adminAgent();
    const c = await newClient(admin);
    const due = inDays(10);

    const res = await addRemittance(admin, { client: c.id, taxType: 'Income Tax', amount: 2500, dueDate: due });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Remittance record created');
    const saved = await Remittance.findById(res.body.remittance._id);
    expect(String(saved.client)).toBe(c.id);
    expect(saved.taxType).toBe('Income Tax');
    expect(saved.amount).toBe(2500);
    expect(saved.status).toBe('Pending');
    expect(String(saved.createdBy)).toBe(adminId);
    expect(String(saved.lastEditedBy)).toBe(adminId);
    expect(saved.dueDate.toISOString()).toBe(new Date(due).toISOString());
  });

  // SITUATION: due date is optional (AC), admin leaves it out.
  // CHECKS: saved with no due date.
  test('saves without a due date', async () => {
    const { agent: admin } = await adminAgent();
    const c = await newClient(admin);
    const res = await addRemittance(admin, { client: c.id });
    expect(res.status).toBe(201);
    expect((await Remittance.findById(res.body.remittance._id)).dueDate).toBeNull();
  });

  // SITUATION: admin picks each tax type in the dropdown.
  // CHECKS: all four are accepted.
  test.each(['VAT', 'Percentage Tax', 'Income Tax', 'Withholding Tax'])('accepts tax type %s', async (taxType) => {
    const { agent: admin } = await adminAgent();
    const c = await newClient(admin);
    const res = await addRemittance(admin, { client: c.id, taxType });
    expect(res.status).toBe(201);
    expect(res.body.remittance.taxType).toBe(taxType);
  });

  // SITUATION: the form sends the amount as a string ("1500.50"), like an <input type=number> does.
  // CHECKS: it is stored as the number 1500.5.
  test('stores a string amount as a number', async () => {
    const { agent: admin } = await adminAgent();
    const c = await newClient(admin);
    const res = await addRemittance(admin, { client: c.id, amount: '1500.50' });
    expect(res.status).toBe(201);
    expect((await Remittance.findById(res.body.remittance._id)).amount).toBe(1500.5);
  });

  // SITUATION: a required field is missing (client, taxType or amount).
  // CHECKS: 400 with the "required" message and nothing saved.
  test.each([
    ['client', { client: undefined }],
    ['taxType', { taxType: undefined }],
    ['amount', { amount: undefined }],
  ])('rejects a missing %s', async (_name, override) => {
    const { agent: admin } = await adminAgent();
    const c = await newClient(admin);
    const res = await addRemittance(admin, { client: c.id, ...override });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Client, tax type, and amount are required');
    expect(await Remittance.countDocuments()).toBe(0);
  });

  // SITUATION: someone posts a tax type that is not in the list.
  // CHECKS: 400 'Invalid tax type selected'.
  test('rejects an unknown tax type', async () => {
    const { agent: admin } = await adminAgent();
    const c = await newClient(admin);
    const res = await addRemittance(admin, { client: c.id, taxType: 'Sales Tax' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid tax type selected');
    expect(await Remittance.countDocuments()).toBe(0);
  });

  // SITUATION: the amount is negative or not a number.
  // CHECKS: 400 and nothing saved.
  test.each([[-1], ['abc']])('rejects amount %p', async (amount) => {
    const { agent: admin } = await adminAgent();
    const c = await newClient(admin);
    const res = await addRemittance(admin, { client: c.id, amount });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Amount must be/);
    expect(await Remittance.countDocuments()).toBe(0);
  });

  // SITUATION: amount 0.
  // CHECKS: today it is ACCEPTED (201), although the error text says "positive number".
  // WHY: documents current behaviour. SPEC QUESTION for the team: is a 0 remittance valid?
  test('amount 0 is currently accepted (spec question)', async () => {
    const { agent: admin } = await adminAgent();
    const c = await newClient(admin);
    const res = await addRemittance(admin, { client: c.id, amount: 0 });
    expect(res.status).toBe(201);
  });

  // SITUATION: the due date is garbage.
  // CHECKS: 400 and nothing saved.
  test('rejects an invalid due date', async () => {
    const { agent: admin } = await adminAgent();
    const c = await newClient(admin);
    const res = await addRemittance(admin, { client: c.id, dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(await Remittance.countDocuments()).toBe(0);
  });

  // SITUATION: the client does not exist (valid-looking id, e.g. client was removed meanwhile).
  // CHECKS: should be refused (400/404). Today it answers 201 and saves an orphan record.
  // WHY: an orphan shows as "Unknown Client" in the admin list and belongs to nobody.
  test('refuses a client id that does not exist', async () => {
    const { agent: admin } = await adminAgent();
    const res = await addRemittance(admin, { client: GHOST_ID });
    expect([400, 404]).toContain(res.status);
  });

  // SITUATION: the client id is not even an ObjectId ("abc").
  // CHECKS: 400 with a clean {message}. Today the 400 body is {error: "<raw mongoose text>"}.
  // WHY: every other validation error here uses "message". The raw text exposes model internals.
  test('bad client id gets a clean {message} error, not a raw mongoose error', async () => {
    const { agent: admin } = await adminAgent();
    const res = await addRemittance(admin, { client: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
    expect(res.body.error).toBeUndefined();
  });

  // SITUATION: amount is sent as null or "" (cleared field).
  // CHECKS: 400 with the same {message} as a missing amount. Today it slips past the controller's
  //         checks and fails inside mongoose with a raw {error}.
  test.each([[null], ['']])('amount %p gets the clean required-field message', async (amount) => {
    const { agent: admin } = await adminAgent();
    const c = await newClient(admin);
    const res = await addRemittance(admin, { client: c.id, amount });
    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
  });

  // SECURITY. SITUATION: admin creates a record, api answers with the populated client.
  // CHECKS: the client's password hash must NOT be in the response.
  // WHY: controller does populate('client') with no field list, so the whole Client document
  //      (including the bcrypt hash) goes back to the browser. The list endpoint correctly
  //      selects only firstName/lastName/email, so create is the odd one out.
  test('create response does not leak the client password hash', async () => {
    const { agent: admin } = await adminAgent();
    const c = await newClient(admin);
    const res = await addRemittance(admin, { client: c.id });
    expect(res.status).toBe(201);
    expect(res.body.remittance.client.password).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
  });
});

// ================================================================ admin list
describe('F04 · admin sees all remittances', () => {
  // SITUATION: no records yet.
  // CHECKS: 200 and an empty array.
  test('returns [] when there are none', async () => {
    const { agent: admin } = await adminAgent();
    const res = await admin.get('/api/admin/remittances');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // SITUATION: two clients each have records.
  // CHECKS: admin gets ALL of them, each with the client's name + email, sorted by due date (earliest first).
  test('returns every client\'s records sorted by due date', async () => {
    const { agent: admin } = await adminAgent();
    const a = await newClient(admin, 1);
    const b = await newClient(admin, 2);
    await addRemittance(admin, { client: a.id, taxType: 'VAT', dueDate: inDays(30) });
    await addRemittance(admin, { client: b.id, taxType: 'Income Tax', dueDate: inDays(5) });
    await addRemittance(admin, { client: a.id, taxType: 'Percentage Tax', dueDate: inDays(15) });

    const res = await admin.get('/api/admin/remittances');
    expect(res.status).toBe(200);
    expect(res.body.map((r) => r.taxType)).toEqual(['Income Tax', 'Percentage Tax', 'VAT']);
    expect(res.body[0].client).toMatchObject({ firstName: 'First2', lastName: 'Last2', email: 'client2@business.com' });
  });

  // SECURITY. SITUATION: admin list is loaded.
  // CHECKS: the populated client and editor carry no password.
  test('does not expose client or admin password hashes', async () => {
    const { agent: admin } = await adminAgent();
    const c = await newClient(admin);
    const made = await addRemittance(admin, { client: c.id });
    await admin.put(`/api/admin/remittances/${made.body.remittance._id}`).send({ status: 'Processing' });

    const res = await admin.get('/api/admin/remittances');
    expect(res.body[0].client.password).toBeUndefined();
    expect(res.body[0].lastEditedBy).toEqual({ _id: expect.any(String), username: 'plmbadmin' });
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
  });
});

// ================================================================ update status
describe('F04 · admin updates a status', () => {
  // SITUATION: admin marks a Pending record as Completed.
  // CHECKS: 200, db updated, lastEditedBy is the admin, amount/client/tax type untouched.
  test('updates the status and records who edited it', async () => {
    const { agent: admin, adminId } = await adminAgent();
    const c = await newClient(admin);
    const made = await addRemittance(admin, { client: c.id, amount: 999, dueDate: inDays(3) });
    const id = made.body.remittance._id;

    const res = await admin.put(`/api/admin/remittances/${id}`).send({ status: 'Completed' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Remittance status updated');
    expect(res.body.remittance.status).toBe('Completed');
    expect(res.body.remittance.lastEditedBy.username).toBe('plmbadmin');
    const saved = await Remittance.findById(id);
    expect(saved.status).toBe('Completed');
    expect(String(saved.lastEditedBy)).toBe(adminId);
    expect(saved.amount).toBe(999);
    expect(saved.taxType).toBe('VAT');
  });

  // SITUATION: each status from the ⋮ menu.
  // CHECKS: Pending, Processing, Remitted and Completed are all accepted.
  test.each(['Pending', 'Processing', 'Remitted', 'Completed'])('accepts status %s', async (status) => {
    const { agent: admin } = await adminAgent();
    const c = await newClient(admin);
    const made = await addRemittance(admin, { client: c.id });
    const res = await admin.put(`/api/admin/remittances/${made.body.remittance._id}`).send({ status });
    expect(res.status).toBe(200);
    expect(res.body.remittance.status).toBe(status);
  });

  // SITUATION: status missing or not one of the four.
  // CHECKS: 400 with the right message, record unchanged.
  test.each([
    [{}, 'Status is required'],
    [{ status: 'Paid' }, 'Invalid status update'],
    [{ status: 'completed' }, 'Invalid status update'],
  ])('rejects %j', async (body, message) => {
    const { agent: admin } = await adminAgent();
    const c = await newClient(admin);
    const made = await addRemittance(admin, { client: c.id });
    const id = made.body.remittance._id;
    const res = await admin.put(`/api/admin/remittances/${id}`).send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(message);
    expect((await Remittance.findById(id)).status).toBe('Pending');
  });

  // SITUATION: the record id does not exist (deleted by another admin meanwhile).
  // CHECKS: 404.
  test('404 for an unknown record', async () => {
    const { agent: admin } = await adminAgent();
    const res = await admin.put(`/api/admin/remittances/${GHOST_ID}`).send({ status: 'Completed' });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Remittance record not found');
  });

  // SITUATION: the id in the url is not an ObjectId.
  // CHECKS: it should be a clean 4xx with {message}. Today: 400 with {error: "Cast to ObjectId failed..."}.
  test('malformed id gets a clean {message} error, not a raw mongoose error', async () => {
    const { agent: admin } = await adminAgent();
    const res = await admin.put('/api/admin/remittances/not-an-id').send({ status: 'Completed' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.body.message).toBeDefined();
    expect(res.body.error).toBeUndefined();
  });
});

// ================================================================ delete
describe('F04 · admin deletes a record', () => {
  // SITUATION: admin confirms the delete popup.
  // CHECKS: 200, the record is gone, the other records are untouched.
  test('deletes only the chosen record', async () => {
    const { agent: admin } = await adminAgent();
    const c = await newClient(admin);
    const keep = await addRemittance(admin, { client: c.id, taxType: 'VAT' });
    const drop = await addRemittance(admin, { client: c.id, taxType: 'Income Tax' });

    const res = await admin.delete(`/api/admin/remittances/${drop.body.remittance._id}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Remittance record deleted successfully');
    expect(await Remittance.findById(drop.body.remittance._id)).toBeNull();
    expect(await Remittance.findById(keep.body.remittance._id)).not.toBeNull();
  });

  // SITUATION: delete the same record twice (double click / two admins).
  // CHECKS: the second call is 404, not a crash.
  test('deleting twice gives 404 the second time', async () => {
    const { agent: admin } = await adminAgent();
    const c = await newClient(admin);
    const made = await addRemittance(admin, { client: c.id });
    const url = `/api/admin/remittances/${made.body.remittance._id}`;
    expect((await admin.delete(url)).status).toBe(200);
    const again = await admin.delete(url);
    expect(again.status).toBe(404);
    expect(again.body.message).toBe('Remittance record not found');
  });

  // SITUATION: malformed id.
  // CHECKS: clean {message}. Today the body is the raw mongoose {error}.
  test('malformed id gets a clean {message} error, not a raw mongoose error', async () => {
    const { agent: admin } = await adminAgent();
    const res = await admin.delete('/api/admin/remittances/not-an-id');
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.body.message).toBeDefined();
    expect(res.body.error).toBeUndefined();
  });
});

// ================================================================ client view
describe('F04 · client sees only their own remittances', () => {
  // SITUATION: client A and client B both have records, A is logged in.
  // CHECKS: A gets exactly A's records and none of B's (IDOR check).
  // WHY: AC says a client can only view their own remittances.
  test('returns only the logged-in client\'s records', async () => {
    const { agent: admin } = await adminAgent();
    const a = await readyClient(admin, 1);
    const b = await readyClient(admin, 2);
    await addRemittance(admin, { client: a.id, taxType: 'VAT', amount: 111 });
    await addRemittance(admin, { client: a.id, taxType: 'Income Tax', amount: 222 });
    await addRemittance(admin, { client: b.id, taxType: 'Withholding Tax', amount: 999 });

    const resA = await a.agent.get('/api/client/remittances');
    expect(resA.status).toBe(200);
    expect(resA.body.map((r) => r.amount).sort()).toEqual([111, 222]);

    const resB = await b.agent.get('/api/client/remittances');
    expect(resB.body.map((r) => r.amount)).toEqual([999]);
  });

  // SITUATION: client A tries to read B's records by adding B's id to the url.
  // CHECKS: query params are ignored, A still only gets A's records.
  test('ignores a client id passed in the query string', async () => {
    const { agent: admin } = await adminAgent();
    const a = await readyClient(admin, 1);
    const b = await readyClient(admin, 2);
    await addRemittance(admin, { client: a.id, amount: 111 });
    await addRemittance(admin, { client: b.id, amount: 999 });

    const res = await a.agent.get(`/api/client/remittances?client=${b.id}&clientId=${b.id}`);
    expect(res.status).toBe(200);
    expect(res.body.map((r) => r.amount)).toEqual([111]);
  });

  // SITUATION: client opens the page and has no records.
  // CHECKS: 200 and [].
  test('returns [] when the client has none', async () => {
    const { agent: admin } = await adminAgent();
    const a = await readyClient(admin);
    const res = await a.agent.get('/api/client/remittances');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // SITUATION: client has several records.
  // CHECKS: sorted by due date, earliest first.
  test('sorts by due date, earliest first', async () => {
    const { agent: admin } = await adminAgent();
    const a = await readyClient(admin);
    await addRemittance(admin, { client: a.id, taxType: 'VAT', dueDate: inDays(30) });
    await addRemittance(admin, { client: a.id, taxType: 'Income Tax', dueDate: inDays(2) });
    await addRemittance(admin, { client: a.id, taxType: 'Percentage Tax', dueDate: inDays(10) });
    const res = await a.agent.get('/api/client/remittances');
    expect(res.body.map((r) => r.taxType)).toEqual(['Income Tax', 'Percentage Tax', 'VAT']);
  });

  // SITUATION: the client reads their records.
  // CHECKS: only tax type, amount, due date and status (+ _id) come back. No other client details,
  //         no admin ids.
  test('exposes only taxType, amount, dueDate and status', async () => {
    const { agent: admin } = await adminAgent();
    const a = await readyClient(admin);
    await addRemittance(admin, { client: a.id, dueDate: inDays(3) });
    const res = await a.agent.get('/api/client/remittances');
    expect(Object.keys(res.body[0]).sort()).toEqual(['_id', 'amount', 'dueDate', 'status', 'taxType']);
  });

  // SITUATION: admin updates a status, then the client refreshes.
  // CHECKS: the client sees the new status; and after a delete the record is gone.
  // WHY: AC says status changes must reach the client.
  test('shows status changes and deletions made by the admin', async () => {
    const { agent: admin } = await adminAgent();
    const a = await readyClient(admin);
    const made = await addRemittance(admin, { client: a.id });
    const url = `/api/admin/remittances/${made.body.remittance._id}`;

    await admin.put(url).send({ status: 'Remitted' });
    expect((await a.agent.get('/api/client/remittances')).body[0].status).toBe('Remitted');

    await admin.delete(url);
    expect((await a.agent.get('/api/client/remittances')).body).toEqual([]);
  });

  // SITUATION: the client page has an "Updated: ... (by admin)" line, but the api never sends
  //            lastEditedBy / updatedAt to clients (the .select() leaves them out).
  // CHECKS: documents that the line can never show up for a real client.
  // WHY: SPEC QUESTION. Either send those fields (maybe without the admin username) or remove the line.
  test('client api does not include lastEditedBy/updatedAt (spec question)', async () => {
    const { agent: admin } = await adminAgent();
    const a = await readyClient(admin);
    const made = await addRemittance(admin, { client: a.id });
    await admin.put(`/api/admin/remittances/${made.body.remittance._id}`).send({ status: 'Processing' });
    const res = await a.agent.get('/api/client/remittances');
    expect(res.body[0].lastEditedBy).toBeUndefined();
    expect(res.body[0].updatedAt).toBeUndefined();
  });
});
