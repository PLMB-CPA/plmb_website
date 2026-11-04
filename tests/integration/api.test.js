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

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';

const app = require('../../src/app');
const Admin = require('../../src/models/Admin');
const Newsletter = require('../../src/models/Newsletter');
const Inquiry = require('../../src/models/Inquiry');

describe('PLMB API & Database Integration Tests', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await Promise.all([
      Admin.deleteMany({}),
      Newsletter.deleteMany({}),
      Inquiry.deleteMany({}),
    ]);
  });

  test('GET /api/unknown-route returns 404 JSON', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  test('GET /api/announcements returns only published newsletters', async () => {
    await Newsletter.create([
      { title: 'Published Update', content: '<p>Live</p>', isPublished: true },
      { title: 'Draft Update', content: '<p>Draft</p>', isPublished: false },
    ]);

    const res = await request(app).get('/api/announcements');
    expect(res.status).toBe(200);
    expect(res.body.newsletters).toHaveLength(1);
    expect(res.body.newsletters[0].title).toBe('Published Update');
  });

  test('POST /api/inquiries records a new inquiry with generated ticket number', async () => {
    const payload = {
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

    const res = await request(app).post('/api/inquiries').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.inquiry.ticketNumber).toBe('INQ-0001');
    expect(res.body.inquiry.email).toBe('juan@gmail.com');
  });

  test('Protected admin routes reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  test('Admin can log in, view dashboard stats, and manage newsletters', async () => {
    const hashedPassword = await bcrypt.hash('plmb2026.', 10);
    await Admin.create({ username: 'plmbadmin', password: hashedPassword });

    const agent = request.agent(app);

    const loginRes = await agent
      .post('/api/admin/login')
      .send({ username: 'plmbadmin', password: 'plmb2026.' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toEqual({ redirect: '/admin' });

    const createNewsRes = await agent
      .post('/api/announcements')
      .send({
        title: 'BIR Tax Filing Advisory',
        content: '<p>Important deadline reminder<script>alert(1)</script></p>',
        isPublished: true,
      });
    expect(createNewsRes.status).toBe(201);
    expect(createNewsRes.body.newsletter.content).toBe('<p>Important deadline reminder</p>');

    const statsRes = await agent.get('/api/admin/stats');
    expect(statsRes.status).toBe(200);
    expect(statsRes.body).toEqual({
      totalAdmins: 1,
      publishedNewsletters: 1,
      pendingNewsletters: 0,
      pendingInquiries: 0,
    });
  });

  test('Session cookie is HttpOnly and SameSite=Lax', async () => {
    const hashedPassword = await bcrypt.hash('plmb2026.', 10);
    await Admin.create({ username: 'plmbadmin', password: hashedPassword });

    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'plmbadmin', password: 'plmb2026.' });
    expect(res.status).toBe(200);

    const cookie = res.headers['set-cookie'].find(c => c.startsWith('plmb.sid='));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  test('API rejects requests sent from another website with 403', async () => {
    const res = await request(app)
      .post('/api/inquiries')
      .set('Origin', 'https://evil.example')
      .send({ firstName: 'X' });
    expect(res.status).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('API allows requests from its own origin', async () => {
    const res = await request(app)
      .get('/api/announcements')
      .set('Host', 'plmb.example')
      .set('Origin', 'https://plmb.example');
    expect(res.status).toBe(200);
  });
});
