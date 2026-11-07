import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Contact from './Contact';

const respond = (data, ok = true) => Promise.resolve({ ok, json: async () => data });

// fake api: POST /api/inquiries answers whatever `onPost` returns
function api(onPost = () => respond({ inquiry: { ticketNumber: 'INQ-0001' } }, true)) {
  fetch.mockImplementation((url, opts = {}) => onPost(url, opts));
}
const renderPage = () => render(<Contact />);

const firstName = () => screen.getByPlaceholderText('First Name');
const lastName = () => screen.getByPlaceholderText('Last Name');
const business = () => screen.getByPlaceholderText('Business Name');
const category = () => screen.getByDisplayValue('Select Inquiry Category');
const sector = () => screen.getByDisplayValue('Select Industry Sector');
const subject = () => screen.getByPlaceholderText('Subject');
const message = () => screen.getByPlaceholderText('Send us a message...');
const email = () => screen.getByPlaceholderText('name@email.com');
const send = () => screen.getByRole('button', { name: /send inquiry|sending/i });
const posts = () => fetch.mock.calls.filter(([url]) => url === '/api/inquiries');

// fills every field with valid values
async function fill(user, o = {}) {
  const v = {
    first: 'Juan', last: 'Cruz', biz: 'JC Trading', cat: 'Tax Services',
    sec: 'Retail', subj: 'Quarterly filing', msg: 'Hello, I need help.', mail: 'juan@gmail.com', ...o,
  };
  await user.type(firstName(), v.first);
  await user.type(lastName(), v.last);
  await user.type(business(), v.biz);
  await user.selectOptions(category(), v.cat);
  await user.selectOptions(sector(), v.sec);
  await user.type(subject(), v.subj);
  await user.type(message(), v.msg);
  await user.type(email(), v.mail);
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe('contact (send inquiry) page', () => {
  // AC1, a client fills every field correctly and submits
  // POST with the right body, success message with the ticket, form is cleared
  it('sends the inquiry and shows the success message with the ticket number', async () => {
    api();
    renderPage();
    const user = userEvent.setup();
    await fill(user);
    await user.click(send());

    expect(await screen.findByText('Inquiry sent!')).toBeInTheDocument();
    expect(screen.getByText('INQ-0001')).toBeInTheDocument();
    expect(screen.getByText(/confirmation email is on its way/i)).toBeInTheDocument();
    expect(screen.queryByText(/could not send a confirmation email/i)).not.toBeInTheDocument();

    const [, opts] = posts()[0];
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({
      firstName: 'Juan', lastName: 'Cruz', businessName: 'JC Trading',
      category: 'Tax Services', industrySector: 'Retail',
      subject: 'Quarterly filing', message: 'Hello, I need help.', email: 'juan@gmail.com',
    });
    expect(firstName()).toHaveValue('');
    expect(email()).toHaveValue('');
  });

  // the success popup is open
  // close dismisses it
  it('closes the success popup', async () => {
    api();
    renderPage();
    const user = userEvent.setup();
    await fill(user);
    await user.click(send());
    await user.click(await screen.findByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Inquiry sent!')).not.toBeInTheDocument();
  });

  // AC2, submit with missing fields (only first name filled)
  // nothing is sent, an error shows on each missing field, typed value is kept
  it('blocks missing fields without calling the api and keeps the typed values', async () => {
    api();
    renderPage();
    const user = userEvent.setup();
    await user.type(firstName(), 'Juan');
    await user.click(send());

    expect(posts()).toHaveLength(0);
    expect(screen.getByText('Last name is required.')).toBeInTheDocument();
    expect(screen.getByText('Business name is required.')).toBeInTheDocument();
    expect(screen.getByText('Inquiry category is required.')).toBeInTheDocument();
    expect(screen.getByText('Industry sector is required.')).toBeInTheDocument();
    expect(screen.getByText('Subject is required.')).toBeInTheDocument();
    expect(screen.getByText('Message is required.')).toBeInTheDocument();
    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.queryByText('First name is required.')).not.toBeInTheDocument();
    expect(firstName()).toHaveValue('Juan');
    expect(screen.queryByText('Inquiry sent!')).not.toBeInTheDocument();
  });

  // AC2, fields that are only spaces
  // counted as missing, nothing is sent, the other fields keep their values
  it('treats whitespace-only fields as missing', async () => {
    api();
    renderPage();
    const user = userEvent.setup();
    await fill(user, { subj: '   ' });
    await user.click(send());

    expect(posts()).toHaveLength(0);
    expect(screen.getByText('Subject is required.')).toBeInTheDocument();
    expect(firstName()).toHaveValue('Juan');
    expect(message()).toHaveValue('Hello, I need help.');
  });

  // AC2, the email is not a valid format
  // error on the email field, nothing is sent, email text is kept
  it('rejects an invalid email format', async () => {
    api();
    renderPage();
    const user = userEvent.setup();
    await fill(user, { mail: 'not-an-email' });
    await user.click(send());

    expect(posts()).toHaveLength(0);
    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    expect(email()).toHaveValue('not-an-email');
  });

  // a field error is showing
  // goes away as soon as the user edits that field
  it('clears a field error when the user starts typing in it', async () => {
    api();
    renderPage();
    const user = userEvent.setup();
    await user.click(send());
    expect(screen.getByText('First name is required.')).toBeInTheDocument();

    await user.type(firstName(), 'J');
    expect(screen.queryByText('First name is required.')).not.toBeInTheDocument();
  });

  // AC3, the inquiry is saved but the server says the confirmation email failed
  // still shows the ticket that it was saved plus the email failed notice
  it('shows the ticket and an email-failed notice when the confirmation email fails', async () => {
    api(() => respond({ confirmationEmailSent: false, inquiry: { ticketNumber: 'INQ-0002' } }));
    renderPage();
    const user = userEvent.setup();
    await fill(user);
    await user.click(send());

    expect(await screen.findByText('Inquiry sent!')).toBeInTheDocument();
    expect(screen.getByText('INQ-0002')).toBeInTheDocument();
    expect(screen.getByText(/could not send a confirmation email/i)).toBeInTheDocument();
    expect(screen.queryByText(/confirmation email is on its way/i)).not.toBeInTheDocument();
  });

  // the server refuses the inquiry (ex: disposable email)
  // message shows, no success popup, the form keeps the values
  it('shows the server error and keeps the form filled in', async () => {
    api(() => respond({ error: 'Disposable email addresses are not allowed.' }, false));
    renderPage();
    const user = userEvent.setup();
    await fill(user);
    await user.click(send());

    expect(await screen.findByText('Disposable email addresses are not allowed.')).toBeInTheDocument();
    expect(screen.queryByText('Inquiry sent!')).not.toBeInTheDocument();
    expect(firstName()).toHaveValue('Juan');
    expect(email()).toHaveValue('juan@gmail.com');
  });

  // server returns a raw database error
  // user sees a message
  it('hides raw server errors behind a friendly message', async () => {
    api(() => respond({ error: 'Inquiry validation failed: category: `X` is not a valid enum value' }, false));
    renderPage();
    const user = userEvent.setup();
    await fill(user);
    await user.click(send());

    expect(await screen.findByText(/could not send your inquiry/i)).toBeInTheDocument();
    expect(screen.queryByText(/validation failed/i)).not.toBeInTheDocument();
  });

  // serrver cannot be reached at all
  // network message and form keeps its values
  it('shows a friendly message when the server cannot be reached', async () => {
    api(() => Promise.reject(new Error('network down')));
    renderPage();
    const user = userEvent.setup();
    await fill(user);
    await user.click(send());

    expect(await screen.findByText('Could not reach the server. Please try again later.')).toBeInTheDocument();
    expect(firstName()).toHaveValue('Juan');
  });

  // request is still in flight
  // button is disabled and says sending... so it wont be double submitted
  it('disables the button while sending', async () => {
    api(() => new Promise(() => {}));
    renderPage();
    const user = userEvent.setup();
    await fill(user);
    await user.click(send());

    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
    expect(posts()).toHaveLength(1);
  });
});
