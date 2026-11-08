import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Contact from './Contact';

const respond = (data, ok = true) => Promise.resolve({ ok, json: async () => data });

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
  // F05 AC1 - a client fills every field correctly and submits
  // CHECKS: POST with the right body, success message with the ticket number, form is cleared.
  it('sends the inquiry and shows the success message with the ticket number', async () => {
    api();
    renderPage();
    const user = userEvent.setup();
    await fill(user);
    await user.click(send());

    expect(await screen.findByText('Inquiry sent!')).toBeInTheDocument();
    expect(screen.getByText('INQ-0001')).toBeInTheDocument();
    expect(screen.queryByText(/confirmation email.*fail|could not send a confirmation email/i)).not.toBeInTheDocument();

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

  it('closes the success popup', async () => {
    api();
    renderPage();
    const user = userEvent.setup();
    await fill(user);
    await user.click(send());
    await user.click(await screen.findByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Inquiry sent!')).not.toBeInTheDocument();
  });

  // F05 AC2 - submit with missing fields (only first name filled)
  // CHECKS: nothing is sent, no success popup, the typed value is kept, and every empty
  // field is flagged as invalid (the browser's own "fill out this field" error).
  it('blocks missing fields without calling the api and keeps the typed values', async () => {
    api();
    renderPage();
    const user = userEvent.setup();
    await user.type(firstName(), 'Juan');
    await user.click(send());

    expect(posts()).toHaveLength(0);
    expect(screen.queryByText('Inquiry sent!')).not.toBeInTheDocument();
    expect(firstName()).toHaveValue('Juan');

    expect(firstName()).toBeValid();
    for (const field of [lastName, business, category, sector, subject, message, email]) {
      expect(field()).toBeInvalid();
    }
  });

  // F05 AC2 - a field that only contains spaces is not "filled in properly"
  // CHECKS: nothing is sent, and the other fields keep their values
  it.fails('treats whitespace-only fields as missing', async () => {
    api();
    renderPage();
    const user = userEvent.setup();
    await fill(user, { subj: '   ' });
    await user.click(send());

    expect(posts()).toHaveLength(0);
    expect(firstName()).toHaveValue('Juan');
    expect(message()).toHaveValue('Hello, I need help.');
  });

  // F05 AC2 - an email that is not an email format is not accepted
  // CHECKS: nothing is sent, the email box is flagged invalid, what was typed is kept.
  it('does not send when the email format is invalid', async () => {
    api();
    renderPage();
    const user = userEvent.setup();
    await fill(user, { mail: 'not-an-email' });
    await user.click(send());

    expect(posts()).toHaveLength(0);
    expect(email()).toBeInvalid();
    expect(email()).toHaveValue('not-an-email');
  });

  // F05 AC3 - the inquiry is saved but the confirmation email failed
  // CHECKS: the popup still shows the ticket (inquiry was sent) AND tells the user the
  // confirmation email failed. The exact sentence is not in the AC, so the match is loose.
  it.fails('shows the ticket and an email-failed notice when the confirmation email fails', async () => {
    api(() => respond({ confirmationEmailSent: false, inquiry: { ticketNumber: 'INQ-0002' } }));
    renderPage();
    const user = userEvent.setup();
    await fill(user);
    await user.click(send());

    expect(await screen.findByText('Inquiry sent!')).toBeInTheDocument();
    expect(screen.getByText('INQ-0002')).toBeInTheDocument();
    expect(screen.getByText(
      /confirmation email.*(fail|could not|not (be )?sent)|(fail|could not|unable).*confirmation email/i,
    )).toBeInTheDocument();
  });

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

  it('shows a friendly message when the server cannot be reached', async () => {
    api(() => Promise.reject(new Error('network down')));
    renderPage();
    const user = userEvent.setup();
    await fill(user);
    await user.click(send());

    expect(await screen.findByText('Could not reach the server. Please try again later.')).toBeInTheDocument();
    expect(firstName()).toHaveValue('Juan');
  });

  // NOT in the F05 acceptance criteria.
  it.todo('suggestion: hide raw database errors (e.g. "Inquiry validation failed...") behind a friendly message');
  it.todo('suggestion: disable the submit button and show "Sending..." while the request is in flight (stops double submits)');
});
