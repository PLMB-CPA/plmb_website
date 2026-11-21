const { test, expect } = require('@playwright/test');

const ADMIN = {
  username: process.env.E2E_ADMIN_USER || 'plmbadmin',
  password: process.env.E2E_ADMIN_PASS || 'plmb2026.',
};

async function logIn(page) {
  await page.goto('/admin/login');
  await page.getByPlaceholder('Username').fill(ADMIN.username);
  await page.getByPlaceholder('Password').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Log-in' }).click();
  await page.waitForURL(/\/admin\/[a-z]/);
}

async function turnOnOpenLastPage(page) {
  await page.goto('/admin/settings');
  const toggle = page.getByRole('switch', { name: 'Open last visited page' });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(toggle).toBeEnabled();
}

test.afterEach(async ({ page }) => {
  await page.request.put('/api/admin/me/preferences', { data: { openLastPage: false } });
});

test('with the setting off, /admin opens Manage Clients', async ({ page }) => {
  await logIn(page);
  await page.goto('/admin/inquiries');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/clients$/);
});

test('with the setting on, /admin opens the last visited page', async ({ page }) => {
  await logIn(page);
  await turnOnOpenLastPage(page);
  await page.goto('/admin/inquiries');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/inquiries$/);
});

test('the setting stays on after logging out and back in', async ({ page }) => {
  await logIn(page);
  await turnOnOpenLastPage(page);
  await page.goto('/admin/subscribers');
  await page.goto('/api/admin/logout');
  await expect(page).toHaveURL(/\/admin\/login/);
  await logIn(page);
  await expect(page).toHaveURL(/\/admin\/subscribers$/);
});

test('turning the setting off goes back to Manage Clients', async ({ page }) => {
  await logIn(page);
  await turnOnOpenLastPage(page);
  const toggle = page.getByRole('switch', { name: 'Open last visited page' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(toggle).toBeEnabled();
  await page.goto('/admin/inquiries');
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/clients$/);
});
