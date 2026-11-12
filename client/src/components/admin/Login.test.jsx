import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Login from './Login.jsx';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const respond = (data, ok = true) => Promise.resolve({ ok, json: async () => data });
const usernameBox = () => screen.getByPlaceholderText('Username');
const passwordBox = () => screen.getByPlaceholderText('Password');
const loginBtn = () => screen.getByRole('button', { name: 'Log-in' });

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  render(<MemoryRouter><Login /></MemoryRouter>);
});

describe('admin login form', () => {
  // SITUATION: admin enters valid credentials. 
  // CHECKS: the right request is sent (url, method, body) and the admin is sent to /admin.
  it('sends the credentials and goes to /admin on success', async () => {
    fetch.mockReturnValueOnce(respond({ redirect: '/admin' }));
    const user = userEvent.setup();
    await user.type(usernameBox(), 'plmbadmin');
    await user.type(passwordBox(), 'plmb2026.');
    await user.click(loginBtn());

    expect(fetch).toHaveBeenCalledWith('/api/admin/login', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetch.mock.calls[0][1].body))
      .toEqual({ username: 'plmbadmin', password: 'plmb2026.', remember: false });
    await vi.waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin'));
  });

  // SITUATION: admin ticks "Remember Me". 
  // CHECKS: remember: true is sent (30 day session).
  it('sends remember: true when Remember Me is ticked', async () => {
    fetch.mockReturnValueOnce(respond({ redirect: '/admin' }));
    const user = userEvent.setup();
    await user.type(usernameBox(), 'plmbadmin');
    await user.type(passwordBox(), 'plmb2026.');
    await user.click(screen.getByLabelText('Remember Me'));
    await user.click(loginBtn());
    expect(JSON.parse(fetch.mock.calls[0][1].body).remember).toBe(true);
  });

  // SITUATION: wrong credentials. 
  // CHECKS: the server's message is shown and the admin is NOT redirected.
  it('shows the server error and stays on the page', async () => {
    fetch.mockReturnValueOnce(respond({ error: 'Invalid password' }, false));
    const user = userEvent.setup();
    await user.type(usernameBox(), 'plmbadmin');
    await user.type(passwordBox(), 'wrong');
    await user.click(loginBtn());

    expect(await screen.findByText('Invalid password')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows a fallback message when the server sends no error text', async () => {
    fetch.mockReturnValueOnce(respond({}, false));
    const user = userEvent.setup();
    await user.type(usernameBox(), 'a');
    await user.type(passwordBox(), 'b');
    await user.click(loginBtn());
    expect(await screen.findByText('Something went wrong, please try again.')).toBeInTheDocument();
  });

  it('shows a network error when the server is unreachable', async () => {
    fetch.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    await user.type(usernameBox(), 'a');
    await user.type(passwordBox(), 'b');
    await user.click(loginBtn());
    expect(await screen.findByText('Could not reach the server.')).toBeInTheDocument();
  });

  // SITUATION: admin presses Log-in with empty fields. 
  // CHECKS: nothing is sent (the inputs are `required`).
  it('does not send anything when the fields are empty', async () => {
    await userEvent.setup().click(loginBtn());
    expect(fetch).not.toHaveBeenCalled();
  });

  it('the show/hide button toggles the password', async () => {
    const user = userEvent.setup();
    expect(passwordBox()).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(passwordBox()).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(passwordBox()).toHaveAttribute('type', 'password');
  });

  //it.fails passes while the bug exists and goes red when it's fixed.
  it.fails('inputs have accessible labels (not placeholder only)', () => {
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it.fails('the login error is announced to screen readers (role=alert)', async () => {
    fetch.mockReturnValueOnce(respond({ error: 'Invalid password' }, false));
    const user = userEvent.setup();
    await user.type(usernameBox(), 'a');
    await user.type(passwordBox(), 'b');
    await user.click(loginBtn());
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid password');
  });
});