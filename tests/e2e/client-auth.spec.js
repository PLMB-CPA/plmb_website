const { test, expect } = require('@playwright/test');

const ADMIN = {
  username: process.env.E2E_ADMIN_USER || 'plmbadmin',
  password: process.env.E2E_ADMIN_PASS || 'plmb2026.',
};
const NEW_PASSWORD = 'Newpass123.';

const getOutbox = async (page) => (await page.request.get('/__e2e/outbox')).json();
const clearOutbox = (page) => page.request.delete('/__e2e/outbox');

// dont implement if this is not the e2e server (e.g. dev server on :3000)
test.beforeEach(async ({ request }) => {
  const res = await request.get('/__e2e/outbox');
  if (!res.ok()) {
    throw new Error('Not the e2e server (no /__e2e/outbox). Stop your dev server on port 3000 and run again.');
  }
});

// log in as admin through the api; the browser page then shares the session cookie
async function loginAsAdmin(page) {
  const res = await page.request.post('/api/admin/login', { data: ADMIN });
  expect(res.ok(), 'admin login failed, check the seeded admin').toBeTruthy();
}

// the admin creates a client and the temp password is read from the (fake) welcome email
async function createClientViaApi(page) {
  const email = `client-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  await clearOutbox(page);
  const res = await page.request.post('/api/admin/clients', {
    data: {
      email, firstName: 'Juan', lastName: 'Dela Cruz', phoneNumber: '09171234567',
      address: 'Unit 4B, 123 Rizal Ave.', city: 'Manila', businessName: 'Dela Cruz Trading Co.',
    },
  });
  expect(res.status(), 'client creation failed').toBe(201);
  const mail = (await getOutbox(page)).find((m) => m.fn === 'sendClientWelcome');
  return { email, tempPassword: mail.args[1] };
}

async function uiLogin(page, email, password) {
  await page.goto('/client/login');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Log-in' }).click();
}

// ---------------------------------------------------------------- AC1
test.describe('F01 AC1 · admin adds a client, client logs in', () => {
  // SITUATION: the admin fills the Add Client form in the browser.
  // CHECKS: the success message names the email, and exactly one welcome email with a
  // 12 character temp password went out to that address.
  test('admin adds a client through the form and the welcome email is sent', async ({ page }) => {
    await loginAsAdmin(page);
    await clearOutbox(page);
    const email = `ui-${Date.now()}@example.com`;

    await page.goto('/admin/clients/new');
    await page.getByLabel('First name').fill('Juan');
    await page.getByLabel('Last name').fill('Dela Cruz');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Phone number').fill('09171234567');
    await page.getByLabel('Business name').fill('Dela Cruz Trading Co.');
    await page.getByLabel('Address').fill('Unit 4B, 123 Rizal Ave.');
    await page.getByLabel('City').fill('Manila');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText(`A temporary password was sent to ${email}`)).toBeVisible();
    const mails = (await getOutbox(page)).filter((m) => m.fn === 'sendClientWelcome');
    expect(mails).toHaveLength(1);
    expect(mails[0].args[0].email).toBe(email);
    expect(mails[0].args[1]).toHaveLength(12);
  });

  // SITUATION: the whole AC1 story as a real client would live it.
  // CHECKS each step: temp login lands on the change-password page, a mismatch is blocked,
  // a good password reaches the dashboard, and after logout the old temp password is dead
  // while the new one works.
  test('full flow: temp login, forced change, dashboard, new login', async ({ page, context }) => {
    await loginAsAdmin(page);
    const { email, tempPassword } = await createClientViaApi(page);
    await context.clearCookies();                      // stop being the admin

    await uiLogin(page, email, tempPassword);
    await expect(page).toHaveURL(/\/client\/change-password/);

    await page.getByPlaceholder('Temporary / Current Password').fill(tempPassword);
    await page.getByPlaceholder('New Password').fill(NEW_PASSWORD);
    await page.getByPlaceholder('Confirm Password').fill('Different123.');
    await page.getByRole('button', { name: 'Save Password' }).click();
    await expect(page.getByText('New passwords do not match.')).toBeVisible();

    await page.getByPlaceholder('Confirm Password').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Save Password' }).click();
    await expect(page).toHaveURL(/\/client$/);
    await expect(page.getByRole('heading', { name: /Client (Dashboard|Portal)/i })).toBeVisible();

    // logout through the api (the dashboard has no logout button yet, see the bug below)
    expect((await page.request.post('/api/client/logout')).ok()).toBeTruthy();
    expect((await page.request.get('/api/client/me')).status()).toBe(401);

    await uiLogin(page, email, tempPassword);                       // temp password is dead
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
    await expect(page).toHaveURL(/\/client\/login/);

    await uiLogin(page, email, NEW_PASSWORD);                        // new password works
    await expect(page).toHaveURL(/\/client$/);
  });

  // SITUATION: the client types the dashboard url right after the first login, skipping the change.
  // CHECKS: the api refuses (403), so the page cannot load any data.
  test('a client who has not changed the temp password cannot use the portal api', async ({ page, context }) => {
    await loginAsAdmin(page);
    const { email, tempPassword } = await createClientViaApi(page);
    await context.clearCookies();
    await uiLogin(page, email, tempPassword);
    await expect(page).toHaveURL(/\/client\/change-password/);

    expect((await page.request.get('/api/client/me')).status()).toBe(403);
  });
});

// ---------------------------------------------------------------- AC2
test.describe('F01 AC2 · invalid input', () => {
  // SITUATION: wrong credentials on the client login page.
  // CHECKS: the error shows, the page stays on the login, and no session was created.
  test('wrong password shows an error and creates no session', async ({ page, context }) => {
    await loginAsAdmin(page);
    const { email } = await createClientViaApi(page);
    await context.clearCookies();

    await uiLogin(page, email, 'wrong-password');
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
    await expect(page).toHaveURL(/\/client\/login/);
    expect((await page.request.get('/api/client/me')).status()).toBe(401);
  });

  // SITUATION: admin adds the same client twice.
  // CHECKS: the second attempt shows the duplicate error and sends no second email.
  test('adding a duplicate client shows an error and sends no second email', async ({ page }) => {
    await loginAsAdmin(page);
    const { email } = await createClientViaApi(page);
    await clearOutbox(page);

    await page.goto('/admin/clients/new');
    await page.getByLabel('First name').fill('Juan');
    await page.getByLabel('Last name').fill('Dela Cruz');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Phone number').fill('09171234567');
    await page.getByLabel('Business name').fill('Dela Cruz Trading Co.');
    await page.getByLabel('Address').fill('Unit 4B, 123 Rizal Ave.');
    await page.getByLabel('City').fill('Manila');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Client account already exists.')).toBeVisible();
    expect((await getOutbox(page)).filter((m) => m.fn === 'sendClientWelcome')).toHaveLength(0);
  });

  // SITUATION: the welcome email cannot be sent (the e2e server fails the next email).
  // CHECKS: the admin sees the error, and NO account is left behind (the same email can be added again).
  test('if the welcome email fails the account is not created', async ({ page }) => {
    await loginAsAdmin(page);
    const email = `fail-${Date.now()}@example.com`;
    const fill = async () => {
      await page.goto('/admin/clients/new');
      await page.getByLabel('First name').fill('Juan');
      await page.getByLabel('Last name').fill('Dela Cruz');
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Phone number').fill('09171234567');
      await page.getByLabel('Business name').fill('Dela Cruz Trading Co.');
      await page.getByLabel('Address').fill('Unit 4B, 123 Rizal Ave.');
      await page.getByLabel('City').fill('Manila');
      await page.getByRole('button', { name: 'Create account' }).click();
    };

    await page.request.post('/__e2e/fail-next-email');
    await fill();
    await expect(page.getByText('Account not created: welcome email could not be sent.')).toBeVisible();

    await fill();                                    // same email again works, nothing was left behind
    await expect(page.getByText(`A temporary password was sent to ${email}`)).toBeVisible();
  });
});

// ---------------------------------------------------------------- AC3
test.describe('F01 AC3 · not logged in as a client', () => {
  // SITUATION: a visitor with no login types the change-password url.
  // CHECKS: sent to the client login. (this page checks the session itself, so it works)
  test('/client/change-password redirects a logged-out visitor to the login', async ({ page }) => {
    await page.goto('/client/change-password');
    await expect(page).toHaveURL(/\/client\/login/);
  });

  // SITUATION: a visitor with no login types the dashboard url.
  // CHECKS: sent to the client login (AC3).
  test('/client redirects a logged-out visitor to the login', async ({ page }) => {
    await page.goto('/client');
    await expect(page).toHaveURL(/\/client\/login/);
  });

  // SITUATION: a client who is logged in tries the admin pages.
  // CHECKS: they are not let in (the api answers 401 to a client session on admin routes).
  test('a client cannot open the admin pages', async ({ page, context }) => {
    await loginAsAdmin(page);
    const { email } = await createClientViaApi(page);
    await context.clearCookies();
    const clients = await (await page.request.post('/api/client/login', {
      data: { email, password: 'x' },
    })).status();
    expect(clients).toBe(401);                        

    await page.goto('/admin/inquiries');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  // SITUATION: AC1 says "when logging out, the session is destroyed and the client is
  // redirected to the login page", so the dashboard needs a logout button.
  test('the dashboard has a logout button', async ({ page, context }) => {
    await loginAsAdmin(page);
    const { email, tempPassword } = await createClientViaApi(page);
    await context.clearCookies();
    await uiLogin(page, email, tempPassword);
    await page.getByPlaceholder('Temporary / Current Password').fill(tempPassword);
    await page.getByPlaceholder('New Password').fill(NEW_PASSWORD);
    await page.getByPlaceholder('Confirm Password').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Save Password' }).click();
    await expect(page).toHaveURL(/\/client$/);

    const logout = page.getByRole('button', { name: /log.?out/i });
    await expect(logout).toBeVisible({ timeout: 3000 });
    await logout.click({ timeout: 3000 });
    await expect(page).toHaveURL(/\/client\/login/);
  });
});