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
const Newsletter = require('../../src/models/Newsletter');
const Inquiry = require('../../src/models/Inquiry');
const Subscriber = require('../../src/models/Subscriber');

const INQUIRY_PAYLOAD = {
  firstName: 'Juan',
  lastName: 'Dela Cruz',
  businessName: 'JDC Corp',
  email: 'juan@gmail.com',
  number: '09171234567',
  industrySector: 'Retail',
  category: 'Audit & Assurance',
  subject: 'Statutory Audit Inquiry',
  message: 'We need an audit quote for FY 2026.',
};

async function createAdminAndLogin() {
  const hashed = await bcrypt.hash('Plmb2026.', 10);
  const admin = await Admin.create({ username: 'plmbadmin', password: hashed });
  const agent = request.agent(app);
  await agent.post('/api/admin/login').send({ username: 'plmbadmin', password: 'Plmb2026.' });
  return { agent, admin };
}

describe('PLMB API Integration Tests', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Promise.all([
      Admin.deleteMany({}),
      Newsletter.deleteMany({}),
      Inquiry.deleteMany({}),
      Subscriber.deleteMany({}),
    ]);
  });

  // MISC
  test('GET /api/unknown-route returns 404 JSON', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  // INQUIRIES

  test('POST /api/inquiries creates inquiry with ticket number', async () => {
    const res = await request(app).post('/api/inquiries').send(INQUIRY_PAYLOAD);
    expect(res.status).toBe(201);
    expect(res.body.inquiry.ticketNumber).toBe('INQ-0001');
    expect(res.body.inquiry.email).toBe('juan@gmail.com');
  });

  test('POST /api/inquiries returns 400 on missing required fields', async () => {
    const res = await request(app).post('/api/inquiries').send({ email: 'juan@gmail.com' });
    expect(res.status).toBe(400);
  });

  test('GET /api/inquiries returns all inquiries (authenticated)', async () => {
    const { agent } = await createAdminAndLogin();
    await Inquiry.create({ ...INQUIRY_PAYLOAD, ticketNumber: 'INQ-0001' });

    const res = await agent.get('/api/inquiries');
    expect(res.status).toBe(200);
    expect(res.body.inquiries).toHaveLength(1);
  });

  test('GET /api/inquiries returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/inquiries');
    expect(res.status).toBe(401);
  });

  test('GET /api/inquiries filters by isArchived', async () => {
    const { agent } = await createAdminAndLogin();
    await Inquiry.create([
      { ...INQUIRY_PAYLOAD, ticketNumber: 'INQ-0001', isArchived: false },
      { ...INQUIRY_PAYLOAD, ticketNumber: 'INQ-0002', isArchived: true },
    ]);

    const res = await agent.get('/api/inquiries?isArchived=true');
    expect(res.status).toBe(200);
    expect(res.body.inquiries).toHaveLength(1);
    expect(res.body.inquiries[0].ticketNumber).toBe('INQ-0002');
  });

  test('GET /api/inquiries/:id returns a single inquiry', async () => {
    const { agent } = await createAdminAndLogin();
    const inquiry = await Inquiry.create({ ...INQUIRY_PAYLOAD, ticketNumber: 'INQ-0001' });

    const res = await agent.get(`/api/inquiries/${inquiry._id}`);
    expect(res.status).toBe(200);
    expect(res.body.inquiry.ticketNumber).toBe('INQ-0001');
  });

  test('GET /api/inquiries/:id returns 400 on invalid id', async () => {
    const { agent } = await createAdminAndLogin();
    const res = await agent.get('/api/inquiries/invalidid');
    expect(res.status).toBe(400);
  });

  test('PATCH /api/inquiries/:id updates inquiry fields', async () => {
    const { agent } = await createAdminAndLogin();
    const inquiry = await Inquiry.create({ ...INQUIRY_PAYLOAD, ticketNumber: 'INQ-0001' });

    const res = await agent.patch(`/api/inquiries/${inquiry._id}`).send({ isRead: true });
    expect(res.status).toBe(200);
    expect(res.body.inquiry.isRead).toBe(true);
  });

  test('POST /api/inquiries/:id/reply sends reply and marks answered', async () => {
    const { agent } = await createAdminAndLogin();
    const inquiry = await Inquiry.create({ ...INQUIRY_PAYLOAD, ticketNumber: 'INQ-0001' });

    const res = await agent
      .post(`/api/inquiries/${inquiry._id}/reply`)
      .send({ reply: 'Thank you for your inquiry.' });
    expect(res.status).toBe(200);
    expect(res.body.inquiry.isAnswered).toBe(true);
    expect(res.body.inquiry.reply).toBe('Thank you for your inquiry.');
  });

  test('POST /api/inquiries/:id/reply returns 404 on missing inquiry', async () => {
    const { agent } = await createAdminAndLogin();
    const fakeId = new mongoose.Types.ObjectId();
    const res = await agent.post(`/api/inquiries/${fakeId}/reply`).send({ reply: 'Hello' });
    expect(res.status).toBe(404);
  });

  test('DELETE /api/inquiries/:id deletes inquiry', async () => {
    const { agent } = await createAdminAndLogin();
    const inquiry = await Inquiry.create({ ...INQUIRY_PAYLOAD, ticketNumber: 'INQ-0001' });

    const res = await agent.delete(`/api/inquiries/${inquiry._id}`);
    expect(res.status).toBe(200);
    expect(await Inquiry.findById(inquiry._id)).toBeNull();
  });

  test('DELETE /api/inquiries/:id returns 404 on missing inquiry', async () => {
    const { agent } = await createAdminAndLogin();
    const fakeId = new mongoose.Types.ObjectId();
    const res = await agent.delete(`/api/inquiries/${fakeId}`);
    expect(res.status).toBe(404);
  });

  // NEWSLETTERS
  test('GET /api/announcements returns only published newsletters', async () => {
    await Newsletter.create([
      { title: 'Published', content: '<p>Live</p>', isPublished: true },
      { title: 'Draft', content: '<p>Draft</p>', isPublished: false },
    ]);

    const res = await request(app).get('/api/announcements');
    expect(res.status).toBe(200);
    expect(res.body.newsletters).toHaveLength(1);
    expect(res.body.newsletters[0].title).toBe('Published');
  });

  test('GET /api/newsletter/:id returns a published newsletter publicly', async () => {
    const newsletter = await Newsletter.create({ title: 'Public Post', content: '<p>Hello</p>', isPublished: true });

    const res = await request(app).get(`/api/newsletter/${newsletter._id}`);
    expect(res.status).toBe(200);
    expect(res.body.newsletter.title).toBe('Public Post');
  });

  test('GET /api/newsletter/:id returns 404 on missing newsletter', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/newsletter/${fakeId}`);
    expect(res.status).toBe(404);
  });

  test('GET /api/announcements/all returns all newsletters (authenticated)', async () => {
    const { agent } = await createAdminAndLogin();
    await Newsletter.create([
      { title: 'Published', content: '<p>Live</p>', isPublished: true },
      { title: 'Draft', content: '<p>Draft</p>', isPublished: false },
    ]);

    const res = await agent.get('/api/announcements/all');
    expect(res.status).toBe(200);
    expect(res.body.newsletters).toHaveLength(2);
  });

  test('GET /api/announcements/all returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/announcements/all');
    expect(res.status).toBe(401);
  });

  test('GET /api/announcements/:id returns single newsletter (authenticated)', async () => {
    const { agent } = await createAdminAndLogin();
    const newsletter = await Newsletter.create({ title: 'Draft Post', content: '<p>Draft</p>', isPublished: false });

    const res = await agent.get(`/api/announcements/${newsletter._id}`);
    expect(res.status).toBe(200);
    expect(res.body.newsletter.title).toBe('Draft Post');
  });

  test('POST /api/announcements creates newsletter and strips XSS', async () => {
    const { agent } = await createAdminAndLogin();

    const res = await agent.post('/api/announcements').send({
      title: 'Tax Advisory',
      content: '<p>Hello<script>alert(1)</script></p>',
      isPublished: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.newsletter.content).toBe('<p>Hello</p>');
  });

  test('POST /api/announcements returns 401 when unauthenticated', async () => {
    const res = await request(app).post('/api/announcements').send({
      title: 'Tax Advisory',
      content: '<p>Hello</p>',
      isPublished: true,
    });
    expect(res.status).toBe(401);
  });

  test('PATCH /api/announcements/:id updates newsletter', async () => {
    const { agent } = await createAdminAndLogin();
    const newsletter = await Newsletter.create({ title: 'Old Title', content: '<p>Content</p>', isPublished: false });

    const res = await agent.patch(`/api/announcements/${newsletter._id}`).send({ title: 'New Title', isPublished: true });
    expect(res.status).toBe(200);
    expect(res.body.newsletter.title).toBe('New Title');
    expect(res.body.newsletter.isPublished).toBe(true);
  });

  test('PATCH /api/announcements/:id returns 404 on missing newsletter', async () => {
    const { agent } = await createAdminAndLogin();
    const fakeId = new mongoose.Types.ObjectId();
    const res = await agent.patch(`/api/announcements/${fakeId}`).send({ title: 'X' });
    expect(res.status).toBe(404);
  });

  test('DELETE /api/announcements/:id deletes newsletter', async () => {
    const { agent } = await createAdminAndLogin();
    const newsletter = await Newsletter.create({ title: 'To Delete', content: '<p>Bye</p>', isPublished: false });

    const res = await agent.delete(`/api/announcements/${newsletter._id}`);
    expect(res.status).toBe(200);
    expect(await Newsletter.findById(newsletter._id)).toBeNull();
  });

  test('DELETE /api/announcements/:id returns 404 on missing newsletter', async () => {
    const { agent } = await createAdminAndLogin();
    const fakeId = new mongoose.Types.ObjectId();
    const res = await agent.delete(`/api/announcements/${fakeId}`);
    expect(res.status).toBe(404);
  });

  // SUBSCRIBERS

  test('POST /api/subscribers adds a subscriber', async () => {
    const res = await request(app).post('/api/subscribers').send({ email: 'sub@gmail.com' });
    expect(res.status).toBe(201);
    expect(res.body.subscriber.email).toBe('sub@gmail.com');
  });

  test('GET /api/unsubscribe/:token marks subscriber as unsubscribed', async () => {
    await Subscriber.create({ email: 'sub@gmail.com', unsubscribeToken: 'test-token-123' });

    const res = await request(app).get('/api/unsubscribe/test-token-123');
    expect(res.status).toBe(200);
    const sub = await Subscriber.findOne({ email: 'sub@gmail.com' });
    expect(sub.isSubscribed).toBe(false);
  });

  // ADMIN AUTH 

  test('POST /api/admin/login succeeds with valid credentials', async () => {
    const hashed = await bcrypt.hash('Plmb2026.', 10);
    await Admin.create({ username: 'plmbadmin', password: hashed });

    const res = await request(app).post('/api/admin/login').send({ username: 'plmbadmin', password: 'Plmb2026.' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ redirect: '/admin' });
  });

  test('POST /api/admin/login returns 401 on wrong password', async () => {
    const hashed = await bcrypt.hash('Plmb2026.', 10);
    await Admin.create({ username: 'plmbadmin', password: hashed });

    const res = await request(app).post('/api/admin/login').send({ username: 'plmbadmin', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  test('POST /api/admin/login returns 401 on unknown username', async () => {
    const res = await request(app).post('/api/admin/login').send({ username: 'nobody', password: 'Plmb2026.' });
    expect(res.status).toBe(401);
  });

  test('GET /api/admin/logout redirects to /admin/login', async () => {
    const { agent } = await createAdminAndLogin();
    const res = await agent.get('/api/admin/logout');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin/login');
  });

  test('GET /api/admin/username returns current admin username', async () => {
    const { agent } = await createAdminAndLogin();
    const res = await agent.get('/api/admin/username');
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('plmbadmin');
  });

  test('GET /api/admin/username returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/admin/username');
    expect(res.status).toBe(401);
  });

  // ADMIN STATS
  test('GET /api/admin/stats returns correct counts', async () => {
    const { agent } = await createAdminAndLogin();
    await Newsletter.create({ title: 'Published', content: '<p>x</p>', isPublished: true });
    await Newsletter.create({ title: 'Draft', content: '<p>x</p>', isPublished: false });
    await Inquiry.create({ ...INQUIRY_PAYLOAD, ticketNumber: 'INQ-0001', isAnswered: false, isArchived: false });

    const res = await agent.get('/api/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalAdmins: 1,
      publishedNewsletters: 1,
      pendingNewsletters: 1,
      pendingInquiries: 1,
    });
  });

  test('GET /api/admin/stats returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  // ADMIN MANAGEMENT 
  test('GET /api/admin/users returns list of admins', async () => {
    const { agent } = await createAdminAndLogin();
    const res = await agent.get('/api/admin/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].password).toBeUndefined();
  });

  test('POST /api/admin/users creates a new admin', async () => {
    const { agent } = await createAdminAndLogin();
    const res = await agent.post('/api/admin/users').send({ username: 'newadmin1', password: 'Newpass1.' });
    expect(res.status).toBe(201);
    expect(res.body.admin.username).toBe('newadmin1');
  });

  test('POST /api/admin/users returns 409 on duplicate username', async () => {
    const { agent } = await createAdminAndLogin();
    await agent.post('/api/admin/users').send({ username: 'newadmin1', password: 'Newpass1.' });
    const res = await agent.post('/api/admin/users').send({ username: 'newadmin1', password: 'Newpass1.' });
    expect(res.status).toBe(409);
  });

  test('POST /api/admin/users returns 400 on weak password', async () => {
    const { agent } = await createAdminAndLogin();
    const res = await agent.post('/api/admin/users').send({ username: 'newadmin1', password: 'weak' });
    expect(res.status).toBe(400);
  });

  test('POST /api/admin/users returns 400 on short username', async () => {
    const { agent } = await createAdminAndLogin();
    const res = await agent.post('/api/admin/users').send({ username: 'short', password: 'Newpass1.' });
    expect(res.status).toBe(400);
  });

  test('DELETE /api/admin/users/:id deletes another admin', async () => {
    const { agent } = await createAdminAndLogin();
    const hashed = await bcrypt.hash('Plmb2026.', 10);
    const other = await Admin.create({ username: 'otheradmin', password: hashed });

    const res = await agent.delete(`/api/admin/users/${other._id}`);
    expect(res.status).toBe(200);
    expect(await Admin.findById(other._id)).toBeNull();
  });

  test('DELETE /api/admin/users/:id returns 400 when deleting self', async () => {
    const { agent, admin } = await createAdminAndLogin();
    const res = await agent.delete(`/api/admin/users/${admin._id}`);
    expect(res.status).toBe(400);
  });

  test('DELETE /api/admin/users/:id returns 400 when only one admin exists', async () => {
    const { agent, admin } = await createAdminAndLogin();
    const hashed = await bcrypt.hash('Plmb2026.', 10);
    const other = await Admin.create({ username: 'otheradmin', password: hashed });

    await agent.delete(`/api/admin/users/${other._id}`);
    const res = await agent.delete(`/api/admin/users/${admin._id}`);
    expect(res.status).toBe(400);
  });

  test('PUT /api/admin/users/:id/password updates password', async () => {
    const { agent, admin } = await createAdminAndLogin();
    const res = await agent.put(`/api/admin/users/${admin._id}/password`).send({ password: 'Newpass1.' });
    expect(res.status).toBe(200);
  });

  test('PUT /api/admin/users/:id/password returns 400 on weak password', async () => {
    const { agent, admin } = await createAdminAndLogin();
    const res = await agent.put(`/api/admin/users/${admin._id}/password`).send({ password: 'weak' });
    expect(res.status).toBe(400);
  });

  test('PUT /api/admin/users/:id/password returns 404 on missing admin', async () => {
    const { agent } = await createAdminAndLogin();
    const fakeId = new mongoose.Types.ObjectId();
    const res = await agent.put(`/api/admin/users/${fakeId}/password`).send({ password: 'Newpass1.' });
    expect(res.status).toBe(404);
  });
});
