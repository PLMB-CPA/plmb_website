const request = require('supertest');
const mongoose = require('mongoose');
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
const Inquiry = require('../../src/models/Inquiry');
const { sendConfirmation } = require('../../src/util/emailer');
const { isValidInquiryEmail } = require('../../src/util/emailValidator');

const PAYLOAD = {
  firstName: 'Juan', lastName: 'Dela Cruz', businessName: 'JDC Corp',
  email: 'juan@gmail.com', number: '09171234567', industrySector: 'Retail',
  category: 'Audit & Assurance', subject: 'Statutory Audit Inquiry',
  message: 'We need an audit quote for FY 2026.',
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

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
  await Inquiry.deleteMany({});
  jest.clearAllMocks();   // reset call counts between tests
});

describe('F05 · confirmation email on POST /api/inquiries', () => {
  // SITUATION: a visitor submits a valid inquiry.
  // CHECKS: confirmation sent once, to their email, with the ticket number that was saved.
  test('sends one confirmation to the submitter with the ticket number', async () => {
    const res = await request(app).post('/api/inquiries').send(PAYLOAD);
    await flush();

    expect(res.status).toBe(201);
    expect(sendConfirmation).toHaveBeenCalledTimes(1);
    const arg = sendConfirmation.mock.calls[0][0];
    expect(arg.email).toBe('juan@gmail.com');
    expect(arg.ticketNumber).toBe('INQ-0001');
  });

  // SITUATION: two different visitors submit one after another.
  // CHECKS: each confirmation carries its own ticket (INQ-0001 then INQ-0002).
  test('each inquiry gets its own ticket in its own email', async () => {
    await request(app).post('/api/inquiries').send(PAYLOAD);
    await request(app).post('/api/inquiries').send({ ...PAYLOAD, email: 'ana@gmail.com' });
    await flush();

    expect(sendConfirmation).toHaveBeenCalledTimes(2);
    expect(sendConfirmation.mock.calls[0][0].ticketNumber).toBe('INQ-0001');
    expect(sendConfirmation.mock.calls[1][0].ticketNumber).toBe('INQ-0002');
    expect(sendConfirmation.mock.calls[1][0].email).toBe('ana@gmail.com');
  });

  // SITUATION: someone submits the form with required fields missing.
  // CHECKS: 400, nothing saved, no email.
  test('sends no confirmation when the payload is invalid (400)', async () => {
    const res = await request(app).post('/api/inquiries').send({ email: 'juan@gmail.com' });
    await flush();

    expect(res.status).toBe(400);
    expect(await Inquiry.countDocuments()).toBe(0);
    expect(sendConfirmation).not.toHaveBeenCalled();
  });

  // SITUATION: the email fails validation (fake or disposable address).
  // CHECKS: 400, nothing saved, no email.
  test('sends no confirmation when the email address is rejected', async () => {
    isValidInquiryEmail.mockResolvedValueOnce({ valid: false });   // one-time "invalid"
    const res = await request(app).post('/api/inquiries').send(PAYLOAD);
    await flush();

    expect(res.status).toBe(400);
    expect(await Inquiry.countDocuments()).toBe(0);
    expect(sendConfirmation).not.toHaveBeenCalled();
  });

  // SITUATION: the inquiry is valid but gmail is down.
  // CHECKS: the inquiry is still saved and the user still gets 201.
  test('still saves the inquiry and returns 201 when the email fails', async () => {
    sendConfirmation.mockRejectedValueOnce(new Error('smtp down'));
    const res = await request(app).post('/api/inquiries').send(PAYLOAD);
    await flush();

    expect(res.status).toBe(201);
    expect(await Inquiry.countDocuments()).toBe(1);
  });

  // SITUATION (AC1): valid inquiry, user should see a success message.
test('AC1: returns the success message and saves the inquiry', async () => {
  const res = await request(app).post('/api/inquiries').send(PAYLOAD);
  expect(res.status).toBe(201);
  expect(res.body.message).toBe('Your inquiry has been recorded.');
  expect(await Inquiry.countDocuments()).toBe(1);
});

// SITUATION (AC2): the user leaves exactly one required field empty (tested for each field).
// CHECKS: 400, nothing saved, no email, and the error mentions WHICH field.
test.each([
  'firstName', 'lastName', 'businessName', 'email',
  'industrySector', 'category', 'subject', 'message',
])('AC2: missing %s is rejected with an error naming the field', async (field) => {
  const body = { ...PAYLOAD };
  delete body[field];

  const res = await request(app).post('/api/inquiries').send(body);
  await flush();

  expect(res.status).toBe(400);
  expect(await Inquiry.countDocuments()).toBe(0);
  expect(sendConfirmation).not.toHaveBeenCalled();
  expect(JSON.stringify(res.body)).toMatch(new RegExp(field, 'i'));
});

// SITUATION (AC3): valid inquiry, but sendConfirmation fails.
// CHECKS: saved, 201, the user is told the email failed, the failure is logged on the server.
test('AC3: saves, warns the user, and logs the failure when the email fails', async () => {
  const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  sendConfirmation.mockRejectedValueOnce(new Error('smtp down'));

  const res = await request(app).post('/api/inquiries').send(PAYLOAD);
  await flush();

  expect(res.status).toBe(201);
  expect(await Inquiry.countDocuments()).toBe(1);
  expect(JSON.stringify(res.body).toLowerCase()).toMatch(/email.*fail|fail.*email/);
  expect(errSpy).toHaveBeenCalled();
  errSpy.mockRestore();
});

// test.failing passes while the bug exists and goes red when it's fixed (then delete ".failing").
test('the phone number from the form is saved', async () => {
  await request(app).post('/api/inquiries').send(PAYLOAD);
  const saved = await Inquiry.findOne({ ticketNumber: 'INQ-0001' });
  expect(saved.toObject().number).toBe('09171234567');
});
});