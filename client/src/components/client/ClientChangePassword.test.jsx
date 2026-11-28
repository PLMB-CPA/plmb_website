import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ClientChangePassword from './ClientChangePassword';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const respond = (data, ok = true, status = ok ? 200 : 400) =>
  Promise.resolve({ ok, status, json: async () => data });

// fake api: /api/client/me answers `me` (403 = "must change password", 401 = "not logged in")
function api({
  me = respond({ mustChangePassword: true }, false, 403),
  onPut = () => respond({ message: 'Password updated.' }),
} = {}) {
  fetch.mockImplementation((url, opts = {}) =>
    url === '/api/client/me' ? Promise.resolve(me) : onPut(url, opts)
  );
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <ClientChangePassword />
    </MemoryRouter>
  );

const passwordInputs = () =>
  Array.from(document.querySelectorAll('input[type="password"]'));
const current = () => passwordInputs()[0];
const next = () => passwordInputs()[1];
const confirm = () => passwordInputs()[2];
const save = () => screen.getByRole('button', { name: /save password|saving…/i });
const puts = () => fetch.mock.calls.filter(([url]) => url === '/api/client/password');

async function fill(user, newPw = 'Newpass123.', confirmPw = newPw) {
  await waitFor(() => expect(current()).toBeTruthy());
  await user.type(current(), 'Temp-pass_12');
  await user.type(next(), newPw);
  await user.type(confirm(), confirmPw);
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe('client change password page', () => {
  // SITUATION: AC3, someone opens this page with no session.
  it('sends a logged-out visitor to the client login', async () => {
    api({ me: respond({}, false, 401) });
    renderPage();
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/client/login', { replace: true })
    );
  });

  // SITUATION: a client with a temp password (the api answers 403 on /me).
  // CHECKS: they are NOT thrown out, they stay and see the rules.
  it('stays on the page for a client who must change the password', async () => {
    api();
    renderPage();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/client/me'));
    await waitFor(() => expect(current()).toBeInTheDocument());
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Password change required' })).toBeInTheDocument();
    expect(screen.queryByText(/Welcome,/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Dashboard/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Remittances/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Inquiries/ })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Temporary / Current Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('New Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
    [
      'At least 10 characters',
      'At least 1 uppercase letter',
      'At least 1 special character',
      'At least 1 number',
    ].forEach((rule) => expect(screen.getByText(rule)).toBeInTheDocument());
  });

  // SITUATION: the two new passwords differ.
  // CHECKS: error, and NOTHING is sent.
  it('blocks mismatched passwords without calling the api', async () => {
    api();
    renderPage();
    const user = userEvent.setup();
    await fill(user, 'Newpass123.', 'Different123.');
    await user.click(save());

    expect(await screen.findByText('New passwords do not match.')).toBeInTheDocument();
    expect(puts()).toHaveLength(0);
  });

  // SITUATION: a valid change.
  // CHECKS: PUT with the right body, then on to the dashboard.
  it('sends the change and goes to the dashboard', async () => {
    api();
    renderPage();
    const user = userEvent.setup();
    await fill(user);
    await user.click(save());

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/client', { replace: true })
    );
    const [, opts] = puts()[0];
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body)).toEqual({
      currentPassword: 'Temp-pass_12',
      newPassword: 'Newpass123.',
    });
  });

  // SITUATION: the server refuses (weak or wrong current password).
  // CHECKS: its message shows, no redirect.
  it('shows the server error and does not redirect', async () => {
    api({
      onPut: () =>
        respond({ error: 'Password must have at least one (1) number' }, false),
    });
    renderPage();
    const user = userEvent.setup();
    await fill(user);
    await user.click(save());

    expect(
      await screen.findByText('Password must have at least one (1) number')
    ).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalledWith('/client', expect.anything());
    expect(mockNavigate).not.toHaveBeenCalledWith('/client');
  });

  it('disables the button while saving', async () => {
    api({ onPut: () => new Promise(() => {}) });
    renderPage();
    const user = userEvent.setup();
    await fill(user);
    await user.click(save());
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('shows the inquiries link for clients who are not forced to change their password', async () => {
    api({ me: respond({ firstName: 'Juan', lastName: 'Dela Cruz' }) });
    renderPage();

    expect(await screen.findByRole('link', { name: /Inquiries/ })).toHaveAttribute(
      'href',
      '/client/inquiries'
    );
  });
});