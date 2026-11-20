const { test, expect } = require('@playwright/test');

test.describe('PLMB Online Portal Smoke & Acceptance Tests', () => {
  test('Public pages load and navigate properly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Po Lao Marquez Benedictos/i);

    await page.goto('/services');
    await expect(page.locator('body')).toContainText(/Services/i);

    await page.goto('/about');
    await expect(page.locator('body')).toContainText(/Po Lao Marquez Benedictos/i);

    await page.goto('/contact');
    await expect(page.locator('form')).toBeVisible();
  });

  test('Admin login flow authenticates and reaches dashboard', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('.login_header')).toHaveText('User Sign-In');

    await page.fill('#username', 'plmbadmin');
    await page.fill('#password', 'plmb2026.');
    await page.click('#login_btn');

    await page.waitForURL('**/admin');
    await expect(page.locator('body')).toContainText(/Dashboard|Inquiries|Newsletter/i);
  });
});
