const { test, expect } = require('@playwright/test');

const ADMIN = {
  username: process.env.E2E_ADMIN_USER || 'plmbadmin',
  password: process.env.E2E_ADMIN_PASS || 'plmb2026.',
};

async function loginAsAdmin(page) {
  const res = await page.request.post('/api/admin/login', { data: ADMIN });
  expect(res.ok(), 'admin login failed, check ADMIN credentials / seed').toBeTruthy();
}

async function createInquiry(page) {
  const subject = `F10b E2E ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const res = await page.request.post('/api/inquiries', {
    data: {
      firstName: 'Maria',
      lastName: 'Santos',
      businessName: 'Santos Holdings Inc.',
      email: 'maria@gmail.com',
      number: '09179876543',
      industrySector: 'Real Estate',
      category: 'Tax Services',
      subject,
      message: 'Please advise on our quarterly filing requirements.',
    },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).inquiry;
}

test.describe('F10b · Reply to Client Inquiries Admin UI', () => {
  test('renders conversation history, supports follow-up replies, and warns on email delivery failure', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await loginAsAdmin(page);

    const inquiryId = '665f1c2e9b1e8a0012345678';
    const conversation = [
      {
        _id: 'reply-1',
        sender: 'admin',
        message: 'We received your tax advisory inquiry and are reviewing it.',
        sentAt: '2026-11-19T02:30:00.000Z',
      },
    ];
    let emailNotificationFailed = false;

    await page.route(`**/api/inquiries/${inquiryId}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            inquiry: {
              _id: inquiryId,
              ticketNumber: 'INQ-0099',
              firstName: 'Maria',
              lastName: 'Santos',
              businessName: 'Santos Holdings Inc.',
              email: 'maria@gmail.com',
              number: '09179876543',
              industrySector: 'Real Estate',
              category: 'Tax Services',
              subject: 'Quarterly Filing Advice',
              message: 'Please advise on our quarterly filing requirements.',
              date: '2026-11-19T01:00:00.000Z',
              isRead: true,
              isAnswered: true,
              isArchived: false,
              repliedAt: '2026-11-19T02:30:00.000Z',
              responseTimeMinutes: 90,
              emailNotificationFailed,
              conversation,
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.route(`**/api/inquiries/${inquiryId}/reply`, async (route) => {
      const body = route.request().postDataJSON();
      emailNotificationFailed = true;
      conversation.push({
        _id: 'reply-2',
        sender: 'admin',
        message: body.reply,
        sentAt: '2026-11-20T03:00:00.000Z',
        emailNotificationFailed: true,
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Reply saved, but the email could not be sent.',
          emailNotificationFailed: true,
          inquiry: {
            _id: inquiryId,
            ticketNumber: 'INQ-0099',
            firstName: 'Maria',
            lastName: 'Santos',
            businessName: 'Santos Holdings Inc.',
            email: 'maria@gmail.com',
            number: '09179876543',
            industrySector: 'Real Estate',
            category: 'Tax Services',
            subject: 'Quarterly Filing Advice',
            message: 'Please advise on our quarterly filing requirements.',
            date: '2026-11-19T01:00:00.000Z',
            isRead: true,
            isAnswered: true,
            isArchived: false,
            repliedAt: '2026-11-19T02:30:00.000Z',
            responseTimeMinutes: 90,
            emailNotificationFailed: true,
            conversation,
          },
        }),
      });
    });

    await page.goto(`/admin/inquiries/${inquiryId}`);

    await expect(page.getByRole('heading', { name: 'Reply History' })).toBeVisible();
    await expect(page.getByText('1 reply')).toBeVisible();
    await expect(page.getByText('We received your tax advisory inquiry and are reviewing it.')).toBeVisible();

    await page.getByLabel('Reply to Client').fill('Follow-up: please send your latest BIR 2303.');
    await page.getByRole('button', { name: 'Send Reply' }).click();

    await expect(page.getByRole('alert')).toHaveText('Reply saved, but the email could not be sent.');
    await expect(page.getByText('2 replies')).toBeVisible();
    await expect(page.getByText('Follow-up: please send your latest BIR 2303.')).toBeVisible();
    await expect(page.getByText('Email not sent')).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test('works cleanly on mobile viewport (375px) without horizontal overflow or console errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.setViewportSize({ width: 375, height: 812 });
    await loginAsAdmin(page);
    const inquiry = await createInquiry(page);

    await page.goto(`/admin/inquiries/${inquiry._id}`);
    await expect(page.getByRole('heading', { name: inquiry.subject })).toBeVisible();
    await expect(page.getByLabel('Reply to Client')).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);

    await page.getByLabel('Reply to Client').fill('We will prepare your tax checklist today.');
    await page.getByRole('button', { name: 'Send Reply' }).click();

    await expect(page.getByRole('status')).toHaveText('Reply sent successfully.');
    await expect(page.getByRole('heading', { name: 'Reply History' })).toBeVisible();
    await expect(page.getByText('We will prepare your tax checklist today.')).toBeVisible();

    const overflowAfterReply = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflowAfterReply).toBe(false);
    expect(consoleErrors).toEqual([]);
  });
});
