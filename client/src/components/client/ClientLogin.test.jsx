import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ClientLogin from './ClientLogin';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const respond = (data, ok = true) => Promise.resolve({ ok, json: async () => data });
const emailBox = () => screen.getByPlaceholderText('Email');
const passwordBox = () => screen.getByPlaceholderText('Password');
const loginBtn = () => screen.getByRole('button', { name: 'Log-in' });

async function fillAndSubmit(user, { remember = false } = {}) {
  await user.type(emailBox(), 'juan@business.com');
  await user.type(passwordBox(), 'Temp-pass_12');
  if (remember) await user.click(screen.getByLabelText('Remember Me'));
  await user.click(loginBtn());
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  render(<MemoryRouter><ClientLogin /></MemoryRouter>);
});

describe('client login form', () => {
  // SITUATION: client enters their emailed temp password.
  // CHECKS: the right request goes out (url, method, body).
  it('sends the credentials to /api/client/login', async () => {
    fetch.mockReturnValueOnce(respond({ mustChangePassword: false }));
    await fillAndSubmit(userEvent.setup());

    expect(fetch).toHaveBeenCalledWith('/api/client/login', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetch.mock.calls[0][1].body))
      .toEqual({ email: 'juan@business.com', password: 'Temp-pass_12', remember: false });
  });

  it('sends remember: true when Remember Me is ticked', async () => {
    fetch.mockReturnValueOnce(respond({ mustChangePassword: false }));
    await fillAndSubmit(userEvent.setup(), { remember: true });
    expect(JSON.parse(fetch.mock.calls[0][1].body).remember).toBe(true);
  });

  // SITUATION: AC1, first login goes to the change password page, later logins to the dashboard.
  it.each([
    [true, '/client/change-password'],
    [false, '/client'],
  ])('mustChangePassword=%s goes to %s', async (mustChangePassword, url) => {
    fetch.mockReturnValueOnce(respond({ mustChangePassword }));
    await fillAndSubmit(userEvent.setup());
    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(url));
  });

  // SITUATION: AC2, wrong credentials. CHECKS: the server's message shows, no redirect.
  it('shows the server error and stays on the page', async () => {
    fetch.mockReturnValueOnce(respond({ error: 'Invalid email or password.' }, false));
    await fillAndSubmit(userEvent.setup());
    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows a network error when the server is unreachable', async () => {
    fetch.mockRejectedValueOnce(new Error('offline'));
    await fillAndSubmit(userEvent.setup());
    expect(await screen.findByText('Could not reach the server.')).toBeInTheDocument();
  });

  it('the email box is a real email field', () => {
    expect(emailBox()).toHaveAttribute('type', 'email');
  });

  // it.fails passes while the bug exists.
  it('inputs have accessible labels (not placeholder only)', () => {
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
  });

  it('the error is announced to screen readers (role=alert)', async () => {
    fetch.mockReturnValueOnce(respond({ error: 'Invalid email or password.' }, false));
    await fillAndSubmit(userEvent.setup());
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
  });
});