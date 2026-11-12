// F05 · Inquiry Confirmation Email (e2e, against the real running app with the fake emailer)
const { test, expect } = require('@playwright/test');

const ADMIN = {
  username: process.env.E2E_ADMIN_USER || 'plmbadmin',
  password: process.env.E2E_ADMIN_PASS || 'plmb2026.',
};
const PAYLOAD = {
  firstName: 'Juan', lastName: 'Dela Cruz', businessName: 'JDC Corp',
  email: 'juan@gmail.com', number: '09171234567', industrySector: 'Retail',
  category: 'Audit & Assurance', subject: 'Statutory Audit Inquiry',
  message: 'We need an audit quote for FY 2026.',
};

const getOutbox = async (page) => (await page.request.get('/__e2e/outbox')).json();
const clearOutbox = (page) => page.request.delete('/__e2e/outbox');
const failNext = (page, fn) => page.request.post(`/__e2e/fail-next-email?fn=${fn}`);
const sent = async (page, fn) => (await getOutbox(page)).filter((m) => m.fn === fn);
const uniqueSubject = () => `E2E F05 ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const submit = (page, overrides = {}) =>
  page.request.post('/api/inquiries', { data: { ...PAYLOAD, subject: uniqueSubject(), ...overrides } });

async function adminList(page) {
  const login = await page.request.post('/api/admin/login', { data: ADMIN });
  expect(login.ok(), 'admin login failed, check the seeded admin').toBeTruthy();
  return (await (await page.request.get('/api/inquiries')).json()).inquiries;
}

// dont implement if this is not the e2e server (e.g. dev server on :3000)
test.beforeEach(async ({ page }) => {
  const res = await page.request.get('/__e2e/outbox');
  if (!res.ok()) {
    throw new Error('Not the e2e server (no /__e2e/outbox). Stop your dev server on port 3000 and run again.');
  }
  await clearOutbox(page);          
});

// ---------------------------------------------------------------- AC1
test.describe('F05 AC1 · valid inquiry', () => {
  // SITUATION: a visitor submits a valid inquiry.
  // CHECKS: 201 + success message, saved, the client gets EXACTLY ONE confirmation addressed to
  // the email they typed, carrying the ticket that was saved, and the firm gets one notification.
  test('is saved and the client gets exactly one confirmation', async ({ page }) => {
    const subject = uniqueSubject();
    const res = await submit(page, { subject });
    expect(res.status()).toBe(201);
    const { message, inquiry } = await res.json();
    expect(message).toBe('Your inquiry has been recorded.');

    await expect.poll(async () => (await sent(page, 'sendConfirmation')).length).toBe(1);
    await page.waitForTimeout(300);
    const confirmations = await sent(page, 'sendConfirmation');
    expect(confirmations).toHaveLength(1);
    expect(confirmations[0].args[0].email).toBe('juan@gmail.com');
    expect(confirmations[0].args[0].ticketNumber).toBe(inquiry.ticketNumber);
    expect(await sent(page, 'sendInquiryNotification')).toHaveLength(1);

    const saved = (await adminList(page)).find((i) => i.subject === subject);
    expect(saved.ticketNumber).toBe(inquiry.ticketNumber);
  });

  // SITUATION: two different visitors submit one after the other.
  // CHECKS: each gets their own ticket in their own email.
  test('two inquiries get two different tickets in two different emails', async ({ page }) => {
    const a = await (await submit(page, { email: 'ana@gmail.com' })).json();
    const b = await (await submit(page, { email: 'ben@gmail.com' })).json();
    expect(a.inquiry.ticketNumber).not.toBe(b.inquiry.ticketNumber);

    await expect.poll(async () => (await sent(page, 'sendConfirmation')).length).toBe(2);
    const ticketFor = Object.fromEntries(
      (await sent(page, 'sendConfirmation')).map((m) => [m.args[0].email, m.args[0].ticketNumber]),
    );
    expect(ticketFor['ana@gmail.com']).toBe(a.inquiry.ticketNumber);
    expect(ticketFor['ben@gmail.com']).toBe(b.inquiry.ticketNumber);
  });
});

// ---------------------------------------------------------------- AC2
test.describe('F05 AC2 · invalid inquiry', () => {
  // SITUATION: the visitor leaves one required field out (each of the 8 in turn).
  // CHECKS: 400 with an error, nothing is saved, and NO email goes out (not to the client, not to the firm).
  for (const field of ['firstName', 'lastName', 'businessName', 'email', 'industrySector', 'category', 'subject', 'message']) {
    test(`missing ${field} is rejected, nothing saved, no email`, async ({ page }) => {
      const before = (await adminList(page)).length;
      const body = { ...PAYLOAD, subject: uniqueSubject() };
      delete body[field];

      const res = await page.request.post('/api/inquiries', { data: body });
      expect(res.status()).toBe(400);
      const error = (await res.json()).error;
      expect(error).toBeTruthy();
      if (field !== 'email') expect(error).toMatch(new RegExp(field, 'i'));   // the error names the field

      await page.waitForTimeout(300);
      expect(await getOutbox(page)).toHaveLength(0);
      expect((await adminList(page)).length).toBe(before);
    });
  }

  // SITUATION: the visitor types something that is not an email address
  test('an invalid email address is rejected and nothing is sent', async ({ page }) => {
    const before = (await adminList(page)).length;
    const res = await submit(page, { email: 'not-an-email' });
    expect(res.status()).toBe(400);

    await page.waitForTimeout(300);
    expect(await getOutbox(page)).toHaveLength(0);
    expect((await adminList(page)).length).toBe(before);
  });
});

// ---------------------------------------------------------------- AC3
test.describe('F05 AC3 · the confirmation email fails', () => {
  // SITUATION: the visitor submits a valid inquiry, but the confirmation email fails.
  // CHECKS: still 201 and saved, the failed email was not delivered, and the firm was still notified.
  test('the inquiry is still saved', async ({ page }) => {
    await failNext(page, 'sendConfirmation');
    const subject = uniqueSubject();
    const res = await submit(page, { subject });
    expect(res.status()).toBe(201);

    await expect.poll(async () => (await sent(page, 'sendInquiryNotification')).length).toBe(1);
    await page.waitForTimeout(300);
    expect(await sent(page, 'sendConfirmation')).toHaveLength(0);
    expect((await adminList(page)).some((i) => i.subject === subject)).toBe(true);
  });

  // SITUATION: same failure. CHECKS: the user is told the inquiry was sent AND the email failed.
  // passes while the bug exists, goes red when it's fixed (then delete the test.fail() line).
  test('the user is told the confirmation email failed', async ({ page }) => {
    test.fail();
    await failNext(page, 'sendConfirmation');
    const res = await submit(page);
    const body = JSON.stringify(await res.json()).toLowerCase();
    expect(body).toMatch(/email.*fail|fail.*email/);
  });
});

// BUG: the phone number typed in the form is never saved (the Inquiry model has no `number` field),
// so the firm's notification email shows "Phone Number: undefined".
test('F05 · the phone number from the form is saved', async ({ page }) => {
  test.fail();
  const subject = uniqueSubject();
  await submit(page, { subject });
  const saved = (await adminList(page)).find((i) => i.subject === subject);
  expect(saved.number).toBe('09171234567');
});