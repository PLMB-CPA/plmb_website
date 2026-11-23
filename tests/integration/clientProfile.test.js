// F02 · Client Profile (api-level)
const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../../src/app');
const Client = require('../../src/models/Client');

const PASSWORD = 'Newpass123.';

async function loggedInClient(overrides = {}) {
  await Client.create({
    email: 'juan@business.com',
    password: await bcrypt.hash(PASSWORD, 10),
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    phoneNumber: '09171234567',
    address: 'Unit 4B, 123 Rizal Ave.',
    city: 'Manila',
    businessName: 'Dela Cruz Trading Co.',
    birthday: new Date('1990-05-17'),
    tin: '123-456-789-000',
    mustChangePassword: false,
    ...overrides,
  });
  const agent = request.agent(app);
  await agent.post('/api/client/login').send({ email: 'juan@business.com', password: PASSWORD });
  return agent;
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
  await Client.deleteMany({});
});

describe('F02 · client profile data', () => {
  test('returns every field the profile page shows', async () => {
    const agent = await loggedInClient();
    const res = await agent.get('/api/client/me');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email: 'juan@business.com',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      phoneNumber: '09171234567',
      address: 'Unit 4B, 123 Rizal Ave.',
      city: 'Manila',
      businessName: 'Dela Cruz Trading Co.',
      tin: '123-456-789-000',
    });
    expect(res.body.birthday).toMatch(/^1990-05-17/);
    expect(res.body.password).toBeUndefined();
  });

  test('returns 404 when the client was deleted while logged in', async () => {
    const agent = await loggedInClient();
    await Client.deleteMany({});

    const res = await agent.get('/api/client/me');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found, cannot retrieve information.');
  });
});