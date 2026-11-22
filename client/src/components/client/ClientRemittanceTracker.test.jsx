// F04 · Client Tax Remittance Status Tracking (client-facing page, read-only)
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import ClientRemittanceTracker from './ClientRemittanceTracker.jsx';

const respond = (data, ok = true, status = 200) => Promise.resolve({ ok, status, json: async () => data });

function day(offset) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toISOString();
}

const ME = { firstName: 'Juan', lastName: 'Dela Cruz', email: 'juan@biz.com' };
const RECORDS = [
  { _id: 'r1', taxType: 'VAT', amount: 1500, dueDate: day(-5), status: 'Pending' },          // overdue
  { _id: 'r2', taxType: 'Income Tax', amount: 2500, dueDate: day(-5), status: 'Completed' },   // past but done
  { _id: 'r3', taxType: 'Withholding Tax', amount: 300, dueDate: day(10), status: 'Processing' }, // upcoming
  { _id: 'r4', taxType: 'Percentage Tax', amount: 99, dueDate: null, status: 'Remitted' },     // no date
];

function setupApi({ me = respond(ME), remittances = respond(RECORDS), logout = respond({}) } = {}) {
  fetch.mockImplementation((url, opts = {}) => {
    if (url === '/api/client/me') return me;
    if (url === '/api/client/remittances') return remittances;
    if (url === '/api/client/logout') return logout;
    return respond({});
  });
}
function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/client/remittances']}>
      <Routes>
        <Route path="/client/remittances" element={<ClientRemittanceTracker />} />
        <Route path="/client/login" element={<p>LOGIN PAGE</p>} />
        <Route path="/client/change-password" element={<p>CHANGE PASSWORD PAGE</p>} />
        <Route path="/client" element={<p>CLIENT DASHBOARD</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
const rows = () => document.querySelectorAll('.user-row');

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('F04 · client page access', () => {
  // SITUATION: someone who is not logged in opens /client/remittances.
  // CHECKS: they are sent to the client login page and no remittance data is requested.
  it('redirects to login on 401 and never asks for remittances', async () => {
    setupApi({ me: respond({ error: 'Unauthorized.' }, false, 401) });
    renderPage();
    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument();
    expect(fetch.mock.calls.some(([u]) => u === '/api/client/remittances')).toBe(false);
  });

  // SITUATION: client still has the temporary password (api answers 403).
  // CHECKS: they are sent to change-password first.
  it('redirects to change-password on 403', async () => {
    setupApi({ me: respond({ mustChangePassword: true }, false, 403) });
    renderPage();
    expect(await screen.findByText('CHANGE PASSWORD PAGE')).toBeInTheDocument();
  });

  // SITUATION: the profile call fails (server down).
  // CHECKS: "Could not load profile." instead of an endless "Loading…".
  it('shows an error when the profile cannot be loaded', async () => {
    fetch.mockRejectedValue(new Error('offline'));
    renderPage();
    expect(await screen.findByText('Could not load profile.')).toBeInTheDocument();
  });

  // SITUATION: the page is waiting for the profile.
  // CHECKS: "Loading…" shows first.
  it('shows Loading… while the profile is pending', () => {
    fetch.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });
});

describe('F04 · client list', () => {
  // SITUATION: logged-in client opens the page.
  // CHECKS: welcome with their name, title, and each record with tax type, peso amount and status.
  it('shows the welcome header and the client\'s own records', async () => {
    setupApi();
    renderPage();
    expect(await screen.findByText('Welcome, Juan')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Tax Remittances' })).toBeInTheDocument();
    await waitFor(() => expect(rows()).toHaveLength(4));
    const first = within(rows()[0]);
    expect(first.getByText('VAT')).toBeInTheDocument();
    expect(first.getByText(/1,500\.00/)).toBeInTheDocument();
    expect(first.getByText('Pending', { selector: '.status-badge' })).toBeInTheDocument();
  });

  // SITUATION: the client has no records.
  // CHECKS: empty state text.
  it('shows the empty state when there are no records', async () => {
    setupApi({ remittances: respond([]) });
    renderPage();
    expect(await screen.findByText('No remittances on record.')).toBeInTheDocument();
  });

  // SITUATION: the remittances call fails with a message.
  // CHECKS: the message is shown.
  it('shows the data error message', async () => {
    setupApi({ remittances: respond({ message: 'Failed to load records.' }, false, 500) });
    renderPage();
    expect(await screen.findByText('Failed to load records.')).toBeInTheDocument();
  });

  // SITUATION: the remittances call cannot reach the server.
  it('shows "Failed to reach the server." on a network error', async () => {
    fetch.mockImplementation((url) =>
      url === '/api/client/me' ? respond(ME) : Promise.reject(new Error('offline')));
    renderPage();
    expect(await screen.findByText('Failed to reach the server.')).toBeInTheDocument();
  });

  // SITUATION: client looks at the page.
  // CHECKS: it is read-only. No add, delete, status menu or client-name search.
  it('has no admin controls', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(4));
    expect(screen.queryByRole('button', { name: '+ Add Record' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '⋮' })).not.toBeInTheDocument();
    expect(screen.queryByText('Delete Record')).not.toBeInTheDocument();
    expect(screen.queryByText(/Mark Completed/)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Search/)).not.toBeInTheDocument();
  });

  // SITUATION: the api row carries who last edited it.
  // CHECKS: the client page never shows the editor's name or an "Updated by" line.
  it('never shows who last edited a record', async () => {
    setupApi({
      remittances: respond([{ ...RECORDS[0], lastEditedBy: { username: 'plmbadmin' }, updatedAt: new Date().toISOString() }]),
    });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(screen.queryByText(/plmbadmin/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Updated:/)).not.toBeInTheDocument();
  });
});

describe('F04 · overdue indicator', () => {
  // SITUATION: Pending record past its due date.
  // CHECKS: "(Overdue)" in red.
  it('flags a past-due unfinished record', async () => {
    setupApi({ remittances: respond([RECORDS[0]]) });
    renderPage();
    expect(await screen.findByText(/\(Overdue\)/)).toHaveClass('date-overdue');
  });

  // SITUATION: Completed/Remitted/future/undated records.
  // CHECKS: none flagged.
  it('does not flag finished, future or undated records', async () => {
    setupApi({ remittances: respond([RECORDS[1], RECORDS[2], RECORDS[3]]) });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(3));
    expect(screen.queryByText(/\(Overdue\)/)).not.toBeInTheDocument();
  });
});

describe('F04 · client filters', () => {
  // SITUATION: client clicks a status tab.
  it('filters by status', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.click(screen.getByRole('button', { name: 'Processing' }));
    expect(rows()).toHaveLength(1);
    expect(within(rows()[0]).getByText('Withholding Tax')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(rows()).toHaveLength(4);
  });

  // SITUATION: client picks a tax type.
  it('filters by tax type', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.selectOptions(screen.getByDisplayValue('All Taxes'), 'Percentage Tax');
    expect(rows()).toHaveLength(1);
    expect(within(rows()[0]).getByText('Percentage Tax')).toBeInTheDocument();
  });

  // SITUATION: client picks each date filter.
  // CHECKS: Overdue = unfinished past due, Upcoming = unfinished due today or later, No Due Date = undated.
  it.each([
    ['Overdue', 'VAT'],
    ['Upcoming', 'Withholding Tax'],
    ['No Due Date', 'Percentage Tax'],
  ])('date filter "%s" shows only the %s record', async (option, tax) => {
    setupApi();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.selectOptions(screen.getByDisplayValue('All Dates'), option);
    expect(rows()).toHaveLength(1);
    expect(within(rows()[0]).getByText(tax)).toBeInTheDocument();
  });

  // SITUATION: filters match nothing.
  // CHECKS: empty state.
  it('shows the empty state when filters match nothing', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.click(screen.getByRole('button', { name: 'Pending' }));
    await userEvent.selectOptions(screen.getByDisplayValue('All Dates'), 'No Due Date');
    expect(screen.getByText('No remittances on record.')).toBeInTheDocument();
  });
});

describe('F04 · client navigation', () => {
  // SITUATION: client clicks Logout in the sidebar.
  // CHECKS: POST /api/client/logout then the login page.
  it('logs out and goes to the login page', async () => {
    setupApi();
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /Logout/ }));
    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument();
    const call = fetch.mock.calls.find(([u]) => u === '/api/client/logout');
    expect(call[1].method).toBe('POST');
  });

  // SITUATION: client clicks Dashboard in the sidebar.
  it('Dashboard link goes back to /client', async () => {
    setupApi();
    renderPage();
    await userEvent.click(await screen.findByRole('link', { name: /Dashboard/ }));
    expect(await screen.findByText('CLIENT DASHBOARD')).toBeInTheDocument();
  });
});

// ================================================================ AC2 gaps (confirmed against the acceptance criteria)
// it.fails = known gap. It PASSES while the feature is missing and goes RED once the dev adds it.
// When that happens, change it.fails back to it.
describe('F04 · AC2 gaps on the client page', () => {
  // SITUATION: a record has no due date (an empty field).
  // CHECKS: AC2 says empty fields show "Not provided". Today the page shows a dash "—".
  it('an empty due date shows "Not provided"', async () => {
    setupApi({ remittances: respond([RECORDS[3]]) });   // no due date
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(within(rows()[0]).getByText('Not provided')).toBeInTheDocument();
  });

  // SITUATION: an incomplete record (missing due date) is on the page.
  // CHECKS: AC2 says incomplete records are flagged with a prompt to contact the firm for updates.
  //         Rn, there is no such prompt anywhere on the page.
  it('an incomplete record is flagged with a "contact the firm" prompt', async () => {
    setupApi({ remittances: respond([RECORDS[3]]) });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(within(rows()[0]).getByText(/contact the firm/i)).toBeInTheDocument();
  });

  // SITUATION: a complete record (all fields present).
  // CHECKS: it must NOT get the contact prompt. Guards the flag from being shown on every row once built.
  it('a complete record has no contact prompt', async () => {
    setupApi({ remittances: respond([RECORDS[0]]) });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(within(rows()[0]).queryByText(/contact the firm/i)).not.toBeInTheDocument();
  });
});
