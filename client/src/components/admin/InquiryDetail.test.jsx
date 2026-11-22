import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import InquiryDetail from './InquiryDetail.jsx';
vi.mock('./AdminHeader', () => ({ default: () => <div>header</div> }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const respond = (data, ok = true) => Promise.resolve({ ok, json: async () => data });

const base = {
  _id: 'abc123', ticketNumber: 'INQ-0001', subject: 'Statutory Audit Inquiry',
  category: 'Audit & Assurance', industrySector: 'Retail',
  message: 'We need an audit quote.', email: 'juan@gmail.com',
  isRead: true, isAnswered: false, isArchived: false,
  reply: null, repliedAt: null, responseTimeMinutes: null,
};
const replied = (minutes) => ({
  ...base, isAnswered: true, reply: 'Hello',
  repliedAt: '2026-11-09T04:30:00.000Z', responseTimeMinutes: minutes,
});

// fake api
async function renderDetail(inquiry, onWrite = () => respond({ inquiry })) {
  fetch.mockImplementation((url, opts = {}) =>
    (opts.method || 'GET') === 'GET' ? respond({ inquiry }) : onWrite(url, opts));
  render(
    <MemoryRouter initialEntries={['/admin/inquiries/abc123']}>
      <Routes><Route path="/admin/inquiries/:id" element={<InquiryDetail />} /></Routes>
    </MemoryRouter>
  );
  await screen.findByRole('heading', { name: inquiry.subject });
}

const writes = () => fetch.mock.calls.filter(([, o]) => o?.method && o.method !== 'GET');
const box = () => screen.getByLabelText('Reply to Client');
const sendBtn = () => screen.getByRole('button', { name: 'Send Reply' });

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe('F03 AC2 · reply validation in the ui', () => {
  // SITUATION: admin clicks send with an empty box or only spaces.
  // CHECKS: error shown, NO request sent, button still usable.
  it.each([['nothing', ''], ['only spaces', '   ']])('sending %s shows an error', async (_l, text) => {
    const user = userEvent.setup();
    await renderDetail(base);
    if (text) await user.type(box(), text);
    await user.click(sendBtn());

    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a reply before sending.');
    expect(writes()).toHaveLength(0);
    expect(sendBtn()).toBeEnabled();
  });

  it('10,001 characters is blocked, 10,000 is sent', async () => {
    const user = userEvent.setup();
    await renderDetail(base, () => respond({ inquiry: replied(5) }));

    fireEvent.change(box(), { target: { value: 'a'.repeat(10001) } });
    await user.click(sendBtn());
    expect(screen.getByRole('alert')).toHaveTextContent('10,000 characters or fewer');
    expect(writes()).toHaveLength(0);

    fireEvent.change(box(), { target: { value: 'a'.repeat(10000) } });
    await user.click(sendBtn());
    await waitFor(() => expect(writes()).toHaveLength(1));
  });

  // SITUATION: the server rejects the reply (email failed). 
  // CHECKS: error shown, form stays.
  it('shows the server error and keeps the form', async () => {
    const user = userEvent.setup();
    await renderDetail(base, () => respond({ error: 'Unable to send reply. Please try again.' }, false));
    await user.type(box(), 'Hello');
    await user.click(sendBtn());

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to send reply');
    expect(box()).toHaveValue('Hello');   // the admin's text is not lost
  });

  it('shows a network error when the server is unreachable', async () => {
    const user = userEvent.setup();
    await renderDetail(base, () => Promise.reject(new Error('offline')));
    await user.type(box(), 'Hello');
    await user.click(sendBtn());
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server');
  });

  it('disables the button while sending (stops double replies)', async () => {
    const user = userEvent.setup();
    await renderDetail(base, () => new Promise(() => {}));
    await user.type(box(), 'Hello');
    await user.click(sendBtn());
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
  });
});

describe('F03 AC1 · a valid reply and the response time', () => {
  // SITUATION: admin sends a good reply. 
  // CHECKS: the request is right (url, method, trimmed text),
  // the success message shows, the form is replaced by the reply details with the response time.
  it('sends the trimmed reply and shows the response time', async () => {
    const user = userEvent.setup();
    await renderDetail(base, () => respond({ inquiry: replied(150) }));
    await user.type(box(), '  Hello  ');
    await user.click(sendBtn());

    expect(await screen.findByRole('status')).toHaveTextContent('Reply sent successfully.');
    const [url, opts] = writes()[0];
    expect(url).toBe('/api/inquiries/abc123/reply');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ reply: 'Hello' });
    expect(screen.getByText('Response Time:').parentElement).toHaveTextContent(/2 hours 30 minutes/);
    expect(screen.queryByLabelText('Reply to Client')).not.toBeInTheDocument();
  });

  // SITUATION: opening an already replied inquiry. 
  // CHECKS: no reply form, and the time is formatted correctly 
  // at every boundary (0, 1, 59, 60, 61 minutes, null).
  it.each([
    [null, 'Not available'], [0, 'Under 1 minute'], [1, '1 minute'], [45, '45 minutes'],
    [60, '1 hour'], [61, '1 hour 1 minute'], [150, '2 hours 30 minutes'],
  ])('response time %s is shown as "%s"', async (minutes, expected) => {
    await renderDetail(replied(minutes));
    expect(screen.queryByLabelText('Reply to Client')).not.toBeInTheDocument();
    expect(screen.getByText('Response Time:').parentElement)
      .toHaveTextContent(new RegExp(`Response Time:\\s*${expected}$`));
  });
});

describe('F03 · moderation buttons', () => {
  it('opening an unread inquiry marks it as read, an already read one is left alone', async () => {
    await renderDetail({ ...base, isRead: false });
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(JSON.parse(writes()[0][1].body)).toEqual({ isRead: true });

    vi.clearAllMocks();
    document.body.innerHTML = '';
    await renderDetail(base);
    expect(writes()).toHaveLength(0);
  });

  it.each([
    ['Read', { isRead: false }],
    ['Mark as Answered', { isAnswered: true }],
    ['Archive', { isArchived: true }],
  ])('clicking "%s" sends PATCH %j', async (name, payload) => {
    const user = userEvent.setup();
    await renderDetail(base);
    await user.click(screen.getByRole('button', { name }));

    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0][1].method).toBe('PATCH');
    expect(JSON.parse(writes()[0][1].body)).toEqual(payload);
  });

  it('delete does nothing if the admin cancels the confirm box', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await renderDetail(base);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Delete Inquiry' }));
    expect(writes()).toHaveLength(0);
  });

  it('confirmed delete calls DELETE and goes back to the list', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await renderDetail(base, () => respond({ message: 'Inquiry deleted' }));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Delete Inquiry' }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/admin/inquiries'));
    expect(writes()[0][1].method).toBe('DELETE');
  });
});

it('shows the server message when the inquiry cannot be loaded', async () => {
  fetch.mockImplementation(() => respond({ error: 'Inquiry not found' }, false));
  render(
    <MemoryRouter initialEntries={['/admin/inquiries/abc123']}>
      <Routes><Route path="/admin/inquiries/:id" element={<InquiryDetail />} /></Routes>
    </MemoryRouter>
  );
  expect(await screen.findByText('Inquiry not found')).toBeInTheDocument();
});

const respondWithStatus = (status, data, ok = status >= 200 && status < 300) =>
  Promise.resolve({ ok, status, json: async () => data });

describe('F10b AC1 · conversation history and follow-up replies', () => {
  it('shows empty reply history and keeps reply form visible when conversation array is empty', async () => {
    await renderDetail({
      ...base,
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      businessName: 'JDC Corp',
      number: '09171234567',
      isOverdue: true,
      conversation: [],
    });

    expect(screen.getByText('INQ-0001')).toBeInTheDocument();
    expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.getByText('JDC Corp')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reply History' })).toBeInTheDocument();
    expect(screen.getByText('No replies have been sent yet.')).toBeInTheDocument();
    expect(box()).toBeInTheDocument();
  });

  it('displays existing conversation entries with timestamps and appends a follow-up reply', async () => {
    const user = userEvent.setup();
    const initialConversation = [
      {
        _id: 'msg-1',
        sender: 'admin',
        message: 'Thank you for reaching out.',
        sentAt: '2026-11-19T02:00:00.000Z',
      },
    ];
    const updatedInquiry = {
      ...base,
      isAnswered: true,
      repliedAt: '2026-11-19T02:00:00.000Z',
      responseTimeMinutes: 30,
      conversation: [
        ...initialConversation,
        {
          _id: 'msg-2',
          sender: 'admin',
          message: 'Here is our updated quote.',
          sentAt: '2026-11-19T04:15:00.000Z',
        },
      ],
    };

    await renderDetail(
      {
        ...base,
        isAnswered: true,
        repliedAt: '2026-11-19T02:00:00.000Z',
        responseTimeMinutes: 30,
        conversation: initialConversation,
      },
      () => respond({ message: 'Reply sent successfully.', inquiry: updatedInquiry })
    );

    expect(screen.getByText('1 reply')).toBeInTheDocument();
    expect(screen.getByText('Thank you for reaching out.')).toBeInTheDocument();
    expect(box()).toBeInTheDocument();

    await user.type(box(), 'Here is our updated quote.');
    await user.click(sendBtn());

    expect(await screen.findByRole('status')).toHaveTextContent('Reply sent successfully.');
    expect(screen.getByText('2 replies')).toBeInTheDocument();
    expect(screen.getByText('Here is our updated quote.')).toBeInTheDocument();
    expect(box()).toHaveValue('');
  });
});

describe('F10b AC2 · input limits and user-friendly errors', () => {
  it('updates live character count and displays server validation errors without losing text', async () => {
    const user = userEvent.setup();
    await renderDetail(
      { ...base, conversation: [] },
      () => respondWithStatus(400, { error: 'Reply must not exceed 2000 characters.' }, false)
    );

    await user.type(box(), 'Draft message');
    expect(screen.getByText('13 / 10,000 characters')).toBeInTheDocument();

    await user.click(sendBtn());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Reply must not exceed 2000 characters.'
    );
    expect(box()).toHaveValue('Draft message');
  });

  it('replaces raw technical stack errors with a friendly fallback message', async () => {
    const user = userEvent.setup();
    await renderDetail(
      { ...base, conversation: [] },
      () =>
        respondWithStatus(
          500,
          { error: 'TypeError: Cannot read properties of undefined\n    at replyToInquiry (src/controllers/inquiry_controller.js:120:11)' },
          false
        )
    );

    await user.type(box(), 'Hello');
    await user.click(sendBtn());

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not send the reply. Please try again.');
    expect(alert).not.toHaveTextContent('TypeError');
  });
});

describe('F10b AC3 · email notification failure', () => {
  it('saves and shows the reply while warning the admin when email notification fails', async () => {
    const user = userEvent.setup();
    const savedInquiry = {
      ...base,
      isAnswered: true,
      repliedAt: '2026-11-20T03:00:00.000Z',
      responseTimeMinutes: 20,
      emailNotificationFailed: true,
      conversation: [
        {
          _id: 'msg-1',
          sender: 'admin',
          message: 'Saved despite SMTP failure.',
          sentAt: '2026-11-20T03:00:00.000Z',
        },
      ],
    };

    await renderDetail(
      { ...base, conversation: [] },
      () =>
        respondWithStatus(200, {
          message: 'Reply saved, but the email could not be sent.',
          emailNotificationFailed: true,
          inquiry: savedInquiry,
        })
    );

    await user.type(box(), 'Saved despite SMTP failure.');
    await user.click(sendBtn());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Reply saved, but the email could not be sent.'
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Saved despite SMTP failure.')).toBeInTheDocument();
    expect(box()).toHaveValue('');
  });

  it('shows a persistent email-not-sent badge on entries that failed email delivery', async () => {
    await renderDetail({
      ...base,
      isAnswered: true,
      repliedAt: '2026-11-20T03:00:00.000Z',
      responseTimeMinutes: 15,
      conversation: [
        {
          _id: 'msg-1',
          sender: 'admin',
          message: 'Reply saved in app only.',
          sentAt: '2026-11-20T03:00:00.000Z',
          emailNotificationFailed: true,
        },
      ],
    });

    expect(screen.getByText('Email not sent')).toBeInTheDocument();
    expect(screen.getByText('Reply saved in app only.')).toBeInTheDocument();
  });
});

describe('F10b AC4 · unauthorized access', () => {
  it('redirects to /admin/login on 401 when loading an inquiry without exposing conversation data', async () => {
    fetch.mockImplementation(() =>
      respondWithStatus(401, { error: 'Unauthorized.' }, false)
    );
    render(
      <MemoryRouter initialEntries={['/admin/inquiries/abc123']}>
        <Routes><Route path="/admin/inquiries/:id" element={<InquiryDetail />} /></Routes>
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/admin/login', { replace: true })
    );
    expect(screen.queryByRole('heading', { name: 'Reply History' })).not.toBeInTheDocument();
  });

  it('blocks access on 403 when loading an inquiry without exposing inquiry details', async () => {
    fetch.mockImplementation(() =>
      respondWithStatus(403, { error: 'Forbidden' }, false)
    );
    render(
      <MemoryRouter initialEntries={['/admin/inquiries/abc123']}>
        <Routes><Route path="/admin/inquiries/:id" element={<InquiryDetail />} /></Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You are not authorized to view this inquiry.'
    );
    expect(screen.queryByRole('heading', { name: base.subject })).not.toBeInTheDocument();
  });

  it('redirects to /admin/login if session expires (401) while submitting a reply', async () => {
    const user = userEvent.setup();
    await renderDetail(
      { ...base, conversation: [] },
      () => respondWithStatus(401, { error: 'Unauthorized.' }, false)
    );

    await user.type(box(), 'Attempt after expiry');
    await user.click(sendBtn());

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/admin/login', { replace: true })
    );
  });

  it('shows authorization error on 403 when submitting a reply', async () => {
    const user = userEvent.setup();
    await renderDetail(
      { ...base, conversation: [] },
      () => respondWithStatus(403, { error: 'Forbidden' }, false)
    );

    await user.type(box(), 'Unauthorized reply attempt');
    await user.click(sendBtn());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You are not authorized to reply to this inquiry.'
    );
    expect(box()).toHaveValue('Unauthorized reply attempt');
  });
});
