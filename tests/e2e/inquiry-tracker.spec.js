const { test, expect } = require('@playwright/test');

// TO CHANGE IF EVER WRONG
const ADMIN = {
  username: process.env.E2E_ADMIN_USER || 'plmbadmin',
  password: process.env.E2E_ADMIN_PASS || 'plmb2026.',   
};

async function loginAsAdmin(page) {
  const res = await page.request.post('/api/admin/login', { data: ADMIN });
  expect(res.ok(), 'admin login failed, check ADMIN credentials / seed').toBeTruthy();
}

async function createInquiry(page) {
  const subject = `E2E inquiry ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const res = await page.request.post('/api/inquiries', {
    data: {
      firstName: 'Juan', lastName: 'Dela Cruz', businessName: 'JDC Corp',
      email: 'juan@gmail.com', number: '09171234567', industrySector: 'Retail',
      category: 'Audit & Assurance', subject, message: 'We need an audit quote for FY 2026.',
    },
  });
  expect(res.status(), 'could not create the test inquiry').toBe(201);
  return (await res.json()).inquiry;
}

const getInquiry = async (page, id) =>
  (await (await page.request.get(`/api/inquiries/${id}`)).json()).inquiry;



// ---------------------------------------------------------------- AC3
test.describe('F03 AC3 · not logged in', () => {
  // SITUATION: a visitor who never logged in types admin urls directly.
  // CHECKS: every one ends on the login page.
  for (const path of ['/admin/inquiries', '/admin/inquiries/665f1c2e9b1e8a0012345678']) {
    test(`${path} redirects to the login page`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
    });
  }

  // SITUATION: admin logs out, then presses back / opens the tracker again.
  test('after logout the tracker is blocked again', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/inquiries');
    await expect(page.getByRole('heading', { name: 'Inquiry Tracker' })).toBeVisible();

    await page.request.get('/api/admin/logout');
    await page.goto('/admin/inquiries');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

// ---------------------------------------------------------------- AC1
test.describe('F03 AC1 · tracker and response time', () => {
  // SITUATION: admin opens the tracker after a new inquiry came in.
  // CHECKS: the "Total Inquiries" card equals what the api says (compared live,
  // so it works whatever data is already in the db).
  test('tracker cards match the api numbers', async ({ page }) => {
    await loginAsAdmin(page);
    await createInquiry(page);
    const { stats } = await (await page.request.get('/api/inquiries/stats')).json();

    await page.goto('/admin/inquiries');
    const total = page.getByRole('heading', { name: 'Total Inquiries', level: 3 })
      .locator('xpath=following-sibling::p');
    await expect(total).toHaveText(String(stats.total));
  });

  // SITUATION: admin opens an unread inquiry.
  // CHECKS: it becomes "read" in the db (not only on screen), and the badge says Read.
  test('opening an inquiry marks it as read', async ({ page }) => {
    await loginAsAdmin(page);
    const inquiry = await createInquiry(page);
    expect(inquiry.isRead).toBe(false);

    await page.goto(`/admin/inquiries/${inquiry._id}`);
    await expect(page.getByRole('heading', { name: inquiry.subject })).toBeVisible();
    await expect.poll(async () => (await getInquiry(page, inquiry._id)).isRead).toBe(true);
  });

  // SITUATION: the whole F03 flow: open, reply, see the result.
  // CHECKS: success message, reply form replaced by reply details with a response time,
  // db says answered.
  // NEEDS: the emailer to be stubbed in start-e2e-server.js. if seen
  // "Unable to send reply" instead, the real emailer is running with fake credentials.
  // that is a test-environment problem, not a bug in the feature.
  test('admin replies and the response time appears', async ({ page }) => {
    await loginAsAdmin(page);
    const inquiry = await createInquiry(page);
    await page.goto(`/admin/inquiries/${inquiry._id}`);

    await page.getByLabel('Reply to Client').fill('Thank you, we can help with that.');
    await page.getByRole('button', { name: 'Send Reply' }).click();

    await expect(page.getByRole('status')).toHaveText('Reply sent successfully.');
    await expect(page.getByText('Response Time:')).toBeVisible();
    await expect(page.getByLabel('Reply to Client')).toHaveCount(0);

    const saved = await getInquiry(page, inquiry._id);
    expect(saved.isAnswered).toBe(true);
    expect(saved.responseTimeMinutes).not.toBeNull();
  });
});

// ---------------------------------------------------------------- AC2
test.describe('F03 AC2 · invalid reply', () => {
  // SITUATION: admin presses send with an empty box, then with only spaces.
  // CHECKS: error shows both times, and the inquiry stays unanswered in the db.
  test('empty and whitespace-only replies show an error and change nothing', async ({ page }) => {
    await loginAsAdmin(page);
    const inquiry = await createInquiry(page);
    await page.goto(`/admin/inquiries/${inquiry._id}`);
    const box = page.getByLabel('Reply to Client');
    const send = page.getByRole('button', { name: 'Send Reply' });

    await send.click();
    await expect(page.getByRole('alert')).toHaveText('Please enter a reply before sending.');

    await box.fill('     ');
    await send.click();
    await expect(page.getByRole('alert')).toHaveText('Please enter a reply before sending.');

    const saved = await getInquiry(page, inquiry._id);
    expect(saved.isAnswered).toBe(false);
    expect(saved.reply).toBeNull();
    expect(saved.repliedAt).toBeNull();
  });
});

// ---------------------------------------------------------------- known bug
// BUG: the inquiry list page never calls /api/inquiries, so it is always empty.
// test.fail() = playwright expects this test to fail. it passes while the bug exists
// and goes red once it's fixed (then delete the test.fail() line).
test('F03 · the inquiry list shows a newly created inquiry', async ({ page }) => {
  await loginAsAdmin(page);
  const inquiry = await createInquiry(page);

  await page.goto('/admin/inquiries');
  await expect(page.getByText(inquiry.ticketNumber)).toBeVisible();

  
});
