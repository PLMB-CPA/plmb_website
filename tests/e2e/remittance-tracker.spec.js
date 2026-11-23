// F04 · Client Tax Remittance Status Tracking (browser end-to-end)
const { test, expect } = require('@playwright/test');

const ADMIN = {
  username: process.env.E2E_ADMIN_USER || 'plmbadmin',
  password: process.env.E2E_ADMIN_PASS || 'plmb2026.',
};
const NEW_PASSWORD = 'Newpass123.';

// dont run if this is not the e2e server (e.g. dev server on :3000)
test.beforeEach(async ({ request }) => {
  const res = await request.get('/__e2e/outbox');
  if (!res.ok()) {
    throw new Error('Not the e2e server (no /__e2e/outbox). Stop your dev server on port 3000 and run again.');
  }
});

// ---------------------------------------------------------------- helpers
const tag = () => Math.random().toString(36).replace(/[^a-z]/g, '').padEnd(6, 'x').slice(0, 6);
// unique peso amount per test so rows can be found by their amount (e.g. 4321.50 -> "4,321.50")
const uniqueAmount = () => 1000 + Math.floor(Math.random() * 80000) + 0.5;
const pesos = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ymd = (offsetDays) => {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function loginAsAdmin(page) {
  const res = await page.request.post('/api/admin/login', { data: ADMIN });
  expect(res.ok(), 'admin login failed, check the seeded admin').toBeTruthy();
}

async function createClient(adminPage) {
  const t = tag();
  const email = `rem-${Date.now()}-${t}@example.com`;
  await adminPage.request.delete('/__e2e/outbox');
  const res = await adminPage.request.post('/api/admin/clients', {
    data: {
      email, firstName: `Ana${t}`, lastName: `Rem${t}`, phoneNumber: '09171234567',
      address: 'Unit 4B, 123 Rizal Ave.', city: 'Manila', businessName: `Biz ${t}`,
    },
  });
  expect(res.status(), 'client creation failed').toBe(201);
  const id = (await res.json()).client.id;
  const outbox = await (await adminPage.request.get('/__e2e/outbox')).json();
  const mail = outbox.find((m) => m.fn === 'sendClientWelcome' && m.args[0].email === email);
  return { id, email, tempPassword: mail.args[1], first: `Ana${t}`, last: `Rem${t}`, full: `Ana${t} Rem${t}`, biz: `Biz ${t}` };
}

async function addRecord(adminPage, clientId, data) {
  const res = await adminPage.request.post('/api/admin/remittances', { data: { client: clientId, taxType: 'VAT', ...data } });
  expect(res.status(), 'remittance creation failed').toBe(201);
  return (await res.json()).remittance._id;
}

async function readyClient(browser, adminPage) {
  const c = await createClient(adminPage);
  const context = await browser.newContext();
  const page = await context.newPage();
  expect((await context.request.post('/api/client/login', { data: { email: c.email, password: c.tempPassword } })).ok()).toBeTruthy();
  expect((await context.request.put('/api/client/password', {
    data: { currentPassword: c.tempPassword, newPassword: NEW_PASSWORD },
  })).ok()).toBeTruthy();
  return { ...c, context, page };
}

const adminRow = (page, text) => page.locator('.user-row', { hasText: text });

// ================================================================ admin UI
test.describe('F04 · admin remittance page', () => {
  // SITUATION: admin fills the "Add Tax Remittance" popup with a past due date.
  // CHECKS: the row shows the client, tax type, peso amount, Pending status and the red "(Overdue)" flag,
  //         and it is still there after a page reload (it was really saved).
  test('admin adds a record through the popup', async ({ page }) => {
    await loginAsAdmin(page);
    const c = await createClient(page);
    const amount = uniqueAmount();

    await page.goto('/admin/remittances');
    await expect(page.getByRole('heading', { name: 'Tax Remittances' })).toBeVisible();
    await page.getByRole('button', { name: '+ Add Record' }).click();

    await page.getByText('Select a client...').click();
    await page.getByPlaceholder('Search client name...').fill(c.last);
    await page.getByText(`${c.full} (${c.biz})`).click();
    await page.locator('.modal-content select').selectOption('Income Tax');
    await page.locator('.modal-content input[type=number]').fill(String(amount));
    await page.locator('.modal-content input[type=date]').fill(ymd(-7));
    await page.getByRole('button', { name: 'Save Record' }).click();

    const row = adminRow(page, pesos(amount));
    await expect(row).toBeVisible();
    await expect(row).toContainText(c.full);
    await expect(row).toContainText('Income Tax');
    await expect(row.locator('.status-badge')).toHaveText('Pending');
    await expect(row.locator('.date-overdue')).toContainText('(Overdue)');

    await page.reload();
    await expect(adminRow(page, pesos(amount))).toBeVisible();
  });

  // SITUATION: admin presses Save without choosing a client.
  // CHECKS: a "Please select a client." alert shows and the popup stays open.
  test('saving without a client is blocked', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/remittances');
    await page.getByRole('button', { name: '+ Add Record' }).click();
    await page.locator('.modal-content input[type=number]').fill('100');

    await page.getByRole('button', { name: 'Save Record' }).click();
    // used to expect a window.alert dialog. The error is now inline, so the test looks for an alert on
    // the page instead of listening for a dialog
    await expect(page.locator('.modal-content').getByRole('alert')).toHaveText('Please select a client.');
    await expect(page.getByRole('heading', { name: 'Add Tax Remittance' })).toBeVisible();
  });

  // SITUATION: admin marks a past-due Pending record as Completed from the ⋮ menu.
  // CHECKS: badge becomes Completed, "(Overdue)" disappears, "Last edited" shows the admin, and it
  //         survives a reload.
  test('admin changes a status and it persists', async ({ page }) => {
    await loginAsAdmin(page);
    const c = await createClient(page);
    const amount = uniqueAmount();
    await addRecord(page, c.id, { amount, dueDate: ymd(-3) });

    await page.goto('/admin/remittances');
    const row = adminRow(page, pesos(amount));
    await expect(row.locator('.date-overdue')).toBeVisible();

    await row.getByRole('button', { name: '⋮' }).click();
    await row.getByRole('button', { name: 'Mark Completed' }).click();

    await expect(row.locator('.status-badge')).toHaveText('Completed');
    await expect(row.locator('.date-overdue')).toHaveCount(0);
    await expect(row).toContainText(`Last edited: ${ADMIN.username}`);

    await page.reload();
    await expect(adminRow(page, pesos(amount)).locator('.status-badge')).toHaveText('Completed');
  });

  // SITUATION: admin deletes a record: first cancels, then confirms.
  // CHECKS: Cancel keeps it; confirm removes it, also after a reload.
  test('admin deletes a record after confirming', async ({ page }) => {
    await loginAsAdmin(page);
    const c = await createClient(page);
    const amount = uniqueAmount();
    await addRecord(page, c.id, { amount });

    await page.goto('/admin/remittances');
    const row = adminRow(page, pesos(amount));
    await row.getByRole('button', { name: '⋮' }).click();
    await row.getByRole('button', { name: 'Delete Record' }).click();
    await expect(page.getByRole('heading', { name: 'Delete Remittance Record' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: '⋮' }).click();
    await row.getByRole('button', { name: 'Delete Record' }).click();
    await page.getByRole('button', { name: 'Yes, Delete Record' }).click();
    await expect(row).toHaveCount(0);

    await page.reload();
    await expect(adminRow(page, pesos(amount))).toHaveCount(0);
  });

  // SITUATION: admin uses search, status tab and date filter on a client with mixed records.
  // CHECKS: search by client name narrows to that client; "Overdue" shows the late unfinished one only;
  //         "No Due Date" shows the undated one only.
  test('admin filters by client name, status and date', async ({ page }) => {
    await loginAsAdmin(page);
    const c = await createClient(page);
    const late = uniqueAmount(), future = late + 1, undated = late + 2, done = late + 3;
    await addRecord(page, c.id, { amount: late, dueDate: ymd(-10) });
    await addRecord(page, c.id, { amount: future, dueDate: ymd(20) });
    await addRecord(page, c.id, { amount: undated });
    const doneId = await addRecord(page, c.id, { amount: done, dueDate: ymd(-10) });
    await page.request.put(`/api/admin/remittances/${doneId}`, { data: { status: 'Completed' } });

    await page.goto('/admin/remittances');
    await page.getByPlaceholder('Search by client name...').fill(c.last);
    await expect(page.locator('.user-row')).toHaveCount(4);

    await page.locator('select.filter-select').nth(1).selectOption('Overdue');
    await expect(page.locator('.user-row')).toHaveCount(1);
    await expect(page.locator('.user-row')).toContainText(pesos(late));

    await page.locator('select.filter-select').nth(1).selectOption('No Due Date');
    await expect(page.locator('.user-row')).toHaveCount(1);
    await expect(page.locator('.user-row')).toContainText(pesos(undated));

    await page.locator('select.filter-select').nth(1).selectOption('All');
    await page.getByRole('button', { name: 'Completed', exact: true }).click();
    await expect(page.locator('.user-row')).toHaveCount(1);
    await expect(page.locator('.user-row')).toContainText(pesos(done));
  });
});

// ================================================================ client UI
test.describe('F04 · client remittance page', () => {
  // SITUATION: two clients each have records; client A logs in with the real login form
  //            (temp password -> forced change -> dashboard) and opens My Tax Remittances.
  // CHECKS: A sees only A's amount, never B's, and the page has no admin controls.
  test('a client sees only their own records', async ({ page, browser }) => {
    await loginAsAdmin(page);
    const a = await createClient(page);
    const b = await createClient(page);
    const amountA = uniqueAmount(), amountB = amountA + 7;
    await addRecord(page, a.id, { amount: amountA, taxType: 'Income Tax', dueDate: ymd(5) });
    await addRecord(page, b.id, { amount: amountB, taxType: 'Withholding Tax', dueDate: ymd(5) });

    const ctx = await browser.newContext();
    const cp = await ctx.newPage();
    await cp.goto('/client/login');
    await cp.getByPlaceholder('Email').fill(a.email);
    await cp.getByPlaceholder('Password').fill(a.tempPassword);
    await cp.getByRole('button', { name: 'Log-in' }).click();
    await expect(cp).toHaveURL(/\/client\/change-password/);
    await cp.getByPlaceholder('Temporary / Current Password').fill(a.tempPassword);
    await cp.getByPlaceholder('New Password').fill(NEW_PASSWORD);
    await cp.getByPlaceholder('Confirm Password').fill(NEW_PASSWORD);
    await cp.getByRole('button', { name: 'Save Password' }).click();
    await expect(cp).toHaveURL(/\/client$/);

    await cp.goto('/client/remittances');
    await expect(cp.getByRole('heading', { name: 'My Tax Remittances' })).toBeVisible();
    await expect(cp.getByText(`Welcome, ${a.first}`)).toBeVisible();
    await expect(cp.locator('.user-row', { hasText: pesos(amountA) })).toBeVisible();
    await expect(cp.getByText(pesos(amountB))).toHaveCount(0);
    await expect(cp.getByRole('button', { name: '+ Add Record' })).toHaveCount(0);
    await expect(cp.getByRole('button', { name: '⋮' })).toHaveCount(0);
    await ctx.close();
  });

  // SITUATION: admin changes a status, the client reloads their page.
  // CHECKS: the client sees the new status.
  test('a status change made by the admin shows up for the client', async ({ page, browser }) => {
    await loginAsAdmin(page);
    const c = await readyClient(browser, page);
    const amount = uniqueAmount();
    const id = await addRecord(page, c.id, { amount, dueDate: ymd(5) });

    await c.page.goto('/client/remittances');
    await expect(c.page.locator('.user-row', { hasText: pesos(amount) }).locator('.status-badge')).toHaveText('Pending');

    expect((await page.request.put(`/api/admin/remittances/${id}`, { data: { status: 'Remitted' } })).ok()).toBeTruthy();
    await c.page.reload();
    await expect(c.page.locator('.user-row', { hasText: pesos(amount) }).locator('.status-badge')).toHaveText('Remitted');
    await c.context.close();
  });

  // SITUATION: client has a late record, a finished late record and an upcoming one.
  // CHECKS: only the unfinished late one is red "(Overdue)"; the Overdue filter and a status tab work.
  test('client sees the overdue flag and can filter', async ({ page, browser }) => {
    await loginAsAdmin(page);
    const c = await readyClient(browser, page);
    const late = uniqueAmount(), paid = late + 1, soon = late + 2;
    await addRecord(page, c.id, { amount: late, dueDate: ymd(-4) });
    const paidId = await addRecord(page, c.id, { amount: paid, dueDate: ymd(-4) });
    await addRecord(page, c.id, { amount: soon, dueDate: ymd(9) });
    await page.request.put(`/api/admin/remittances/${paidId}`, { data: { status: 'Completed' } });

    await c.page.goto('/client/remittances');
    await expect(c.page.locator('.user-row')).toHaveCount(3);
    await expect(c.page.locator('.date-overdue')).toHaveCount(1);
    await expect(c.page.locator('.user-row', { hasText: pesos(late) }).locator('.date-overdue')).toContainText('(Overdue)');

    await c.page.locator('select.filter-select').nth(1).selectOption('Overdue');
    await expect(c.page.locator('.user-row')).toHaveCount(1);
    await expect(c.page.locator('.user-row')).toContainText(pesos(late));

    await c.page.locator('select.filter-select').nth(1).selectOption('All');
    await c.page.getByRole('button', { name: 'Completed', exact: true }).click();
    await expect(c.page.locator('.user-row')).toHaveCount(1);
    await expect(c.page.locator('.user-row')).toContainText(pesos(paid));
    await c.context.close();
  });

  // SITUATION: client with no records opens the page.
  // CHECKS: the empty message shows.
  test('shows the empty state for a client with no records', async ({ page, browser }) => {
    await loginAsAdmin(page);
    const c = await readyClient(browser, page);
    await c.page.goto('/client/remittances');
    await expect(c.page.getByText('No remittances on record.')).toBeVisible();
    await c.context.close();
  });

  // SITUATION: client clicks Logout in the sidebar.
  // CHECKS: lands on the login page and the records api is closed again.
  test('logout ends the session', async ({ page, browser }) => {
    await loginAsAdmin(page);
    const c = await readyClient(browser, page);
    await c.page.goto('/client/remittances');
    await c.page.getByRole('button', { name: /Logout/ }).click();
    await expect(c.page).toHaveURL(/\/client\/login/);
    expect((await c.context.request.get('/api/client/remittances')).status()).toBe(401);
    await c.context.close();
  });
});

// ================================================================ access control
test.describe('F04 · access control in the browser', () => {
  // SITUATION: nobody is logged in and opens the client remittance page.
  // CHECKS: sent to the client login page.
  test('logged-out visitor is sent to the client login', async ({ page }) => {
    await page.goto('/client/remittances');
    await expect(page).toHaveURL(/\/client\/login/);
  });

  // SITUATION: nobody is logged in and opens the admin remittance page.
  // CHECKS: sent to the admin login page.
  test('logged-out visitor is sent to the admin login', async ({ page }) => {
    await page.goto('/admin/remittances');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  // SITUATION: client still has the temp password and types the remittance url.
  // CHECKS: pushed to change-password, no records are loaded.
  test('a client on the temp password is sent to change-password', async ({ page, browser }) => {
    await loginAsAdmin(page);
    const c = await createClient(page);
    const ctx = await browser.newContext();
    const cp = await ctx.newPage();
    await ctx.request.post('/api/client/login', { data: { email: c.email, password: c.tempPassword } });
    await cp.goto('/client/remittances');
    await expect(cp).toHaveURL(/\/client\/change-password/);
    expect((await ctx.request.get('/api/client/remittances')).status()).toBe(403);
    await ctx.close();
  });

  // SITUATION: logged-out and client sessions call the admin remittance api directly.
  // CHECKS: 401 each time, and the client cannot delete a record either.
  test('the admin remittance api rejects logged-out and client callers', async ({ page, browser, request }) => {
    expect((await request.get('/api/admin/remittances')).status()).toBe(401);

    await loginAsAdmin(page);
    const c = await readyClient(browser, page);
    const id = await addRecord(page, c.id, { amount: uniqueAmount() });
    expect((await c.context.request.get('/api/admin/remittances')).status()).toBe(401);
    expect((await c.context.request.delete(`/api/admin/remittances/${id}`)).status()).toBe(401);
    expect((await page.request.get('/api/admin/remittances')).ok()).toBeTruthy();   // admin still can
    await c.context.close();
  });
});
