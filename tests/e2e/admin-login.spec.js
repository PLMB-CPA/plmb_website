const { test, expect } = require('@playwright/test');

const ADMIN = {
  username: process.env.E2E_ADMIN_USER || 'plmbadmin',
  password: process.env.E2E_ADMIN_PASS || 'plmb2026.',
};

// SITUATION: admin types the right credentials into the real form.
// CHECKS: ends up on /admin. WHY: every admin feature (F03 included) starts here.
test('admin logs in through the form', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByPlaceholder('Username').fill(ADMIN.username);
  await page.getByPlaceholder('Password').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Log-in' }).click();
  await expect(page).toHaveURL(/\/admin$/);
});

// SITUATION: wrong password. 
// CHECKS: stays on the login page, shows the server's error,
// and no session was created (the tracker still redirects to login).
test('wrong password keeps the admin on the login page with an error', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByPlaceholder('Username').fill(ADMIN.username);
  await page.getByPlaceholder('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Log-in' }).click();

  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByText(/invalid/i)).toBeVisible();

  await page.goto('/admin/inquiries');
  await expect(page).toHaveURL(/\/admin\/login/);
});

// passes while the bug exists,
// goes red when it's fixed.
test('login errors do not reveal which usernames exist', async ({ request }) => {
  test.fail();
  const badUser = await request.post('/api/admin/login', { data: { username: 'nobody', password: 'x' } });
  const badPass = await request.post('/api/admin/login', { data: { username: ADMIN.username, password: 'wrong' } });
  expect((await badUser.json()).error).toBe((await badPass.json()).error);
});