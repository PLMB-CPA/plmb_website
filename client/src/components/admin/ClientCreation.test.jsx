import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ClientCreation from './ClientCreation';

vi.mock('./AdminHeader', () => ({ default: () => <div>header</div> }));

const respond = (data, ok = true) => Promise.resolve({ ok, json: async () => data });
const VALID = {
  firstName: 'Juan', lastName: 'Dela Cruz', email: 'juan@business.com', phoneNumber: '09171234567',
  businessName: 'Dela Cruz Trading Co.', address: 'Unit 4B, 123 Rizal Ave.', city: 'Manila',
};

const field = {
  firstName: () => screen.getByLabelText(/first name/i),
  lastName: () => screen.getByLabelText(/last name/i),
  email: () => screen.getByLabelText(/^email/i),     // the label also holds a hint text
  phoneNumber: () => screen.getByLabelText(/phone number/i),
  businessName: () => screen.getByLabelText(/business name/i),
  address: () => screen.getByLabelText(/address/i),
  city: () => screen.getByLabelText(/city/i),
};
const submit = () => screen.getByRole('button', { name: /create account|creating/i });

async function fillForm(user) {
  for (const [name, value] of Object.entries(VALID)) await user.type(field[name](), value);
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  render(<MemoryRouter><ClientCreation /></MemoryRouter>);
});

describe('admin Add Client form', () => {
  // SITUATION: admin fills every field. 
  // CHECKS: all 7 go to POST /api/admin/clients.
  it('sends all seven fields', async () => {
    fetch.mockReturnValueOnce(respond({ message: 'New client account created.' }));
    const user = userEvent.setup();
    await fillForm(user);
    await user.click(submit());

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe('/api/admin/clients');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual(VALID);
  });

  // SITUATION: success. 
  // CHECKS: the message names the email, and the form is emptied for the next client.
  it('shows the success message and clears the form', async () => {
    fetch.mockReturnValueOnce(respond({ message: 'New client account created.' }));
    const user = userEvent.setup();
    await fillForm(user);
    await user.click(submit());

    expect(await screen.findByText('Account created. A temporary password was sent to juan@business.com.'))
      .toBeInTheDocument();
    expect(field.firstName()).toHaveValue('');
    expect(field.email()).toHaveValue('');
  });

  // SITUATION: duplicate client (409) or the welcome email failed (502).
  // CHECKS: the server's message shows, no success message, and the admin's typing is KEPT.
  it.each([
    ['duplicate', 'Client account already exists.'],
    ['email failure', 'Account not created: welcome email could not be sent.'],
  ])('shows the %s error and keeps what was typed', async (_l, message) => {
    fetch.mockReturnValueOnce(respond({ error: message }, false));
    const user = userEvent.setup();
    await fillForm(user);
    await user.click(submit());

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText(/temporary password was sent/i)).not.toBeInTheDocument();
    expect(field.firstName()).toHaveValue('Juan');
    expect(field.email()).toHaveValue('juan@business.com');
  });

  it('shows a network error when the server is unreachable', async () => {
    fetch.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    await fillForm(user);
    await user.click(submit());
    expect(await screen.findByText('Network error. Try again.')).toBeInTheDocument();
  });

  it('disables the button while creating', async () => {
    fetch.mockReturnValueOnce(new Promise(() => {}));
    const user = userEvent.setup();
    await fillForm(user);
    await user.click(submit());
    expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled();
  });

  // SITUATION: admin adds one client successfully, then a second one fails.
  // CHECKS: the old green message disappears, so it can't be mistaken for the new result.
  it('clears the old success message on the next submit', async () => {
    fetch.mockReturnValueOnce(respond({ message: 'ok' }));
    const user = userEvent.setup();
    await fillForm(user);
    await user.click(submit());
    await screen.findByText(/temporary password was sent/i);

    fetch.mockReturnValueOnce(respond({ error: 'Client account already exists.' }, false));
    await fillForm(user);
    await user.click(submit());

    expect(await screen.findByText('Client account already exists.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/temporary password was sent/i)).not.toBeInTheDocument());
  });
});