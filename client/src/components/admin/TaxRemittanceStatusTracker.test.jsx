// F04 · Client Tax Remittance Status Tracking (admin page)
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import TaxRemittanceStatusTracker from './TaxRemittanceStatusTracker.jsx';
vi.mock('./AdminHeader', () => ({ default: () => <div>header</div> }));

const respond = (data, ok = true) => Promise.resolve({ ok, json: async () => data });

function day(offset) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toISOString();
}

const JUAN = { _id: 'c1', firstName: 'Juan', lastName: 'Dela Cruz', email: 'juan@biz.com', businessName: 'Dela Cruz Trading' };
const MARIA = { _id: 'c2', firstName: 'Maria', lastName: 'Santos', email: 'maria@biz.com', businessName: 'Santos Bakery' };

const rec = (over) => ({
  _id: 'r1', client: JUAN, taxType: 'VAT', amount: 1500, dueDate: day(10), status: 'Pending', ...over,
});

//5 records
const RECORDS = [
  rec({ _id: 'r1', client: JUAN, taxType: 'VAT', amount: 1500, dueDate: day(-5), status: 'Pending' }),       // overdue
  rec({ _id: 'r2', client: MARIA, taxType: 'Income Tax', amount: 2500, dueDate: day(-5), status: 'Completed' }), // past but done
  rec({ _id: 'r3', client: JUAN, taxType: 'Withholding Tax', amount: 300, dueDate: day(10), status: 'Processing' }), // upcoming
  rec({ _id: 'r4', client: MARIA, taxType: 'Percentage Tax', amount: 99, dueDate: null, status: 'Remitted' }),  // no date
];

function setupApi({ remittances = RECORDS, remittancesOk = true, clients = [JUAN, MARIA], put, post, del } = {}) {
  fetch.mockImplementation((url, opts = {}) => {
    const method = opts.method || 'GET';
    if (url === '/api/admin/remittances' && method === 'GET') return respond(remittances, remittancesOk);
    if (url === '/api/admin/clients') return respond(clients);
    if (method === 'PUT') return put ? put(url, opts) : respond({});
    if (method === 'POST') return post ? post(url, opts) : respond({});
    if (method === 'DELETE') return del ? del(url, opts) : respond({ message: 'deleted' });
    return respond({});
  });
}
const renderPage = () => render(<TaxRemittanceStatusTracker />);
const rows = () => document.querySelectorAll('.user-row');
const rowOf = (name) => screen.getByRole('heading', { name, level: 3 }).closest('.user-row');
const [taxSelect, dateSelect] = [() => screen.getByDisplayValue('All Taxes'), () => screen.getByDisplayValue('All Dates')];

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  window.alert = vi.fn();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('F04 · admin list', () => {
  // SITUATION: admin opens /admin/remittances.
  // CHECKS: every record shows client name + email, tax type, peso amount, status.
  it('lists every record with client, tax type, amount and status', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(4));
    const first = within(rows()[0]);
    expect(first.getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(first.getByText('juan@biz.com')).toBeInTheDocument();
    expect(first.getByText('VAT')).toBeInTheDocument();
    expect(first.getByText(/1,500\.00/)).toBeInTheDocument();
    expect(first.getByText('Pending', { selector: '.status-badge' })).toBeInTheDocument();
  });

  // SITUATION: there are no records yet.
  // CHECKS: friendly empty text, no table header.
  it('shows the empty state when there are no records', async () => {
    setupApi({ remittances: [] });
    renderPage();
    expect(await screen.findByText('No remittances on record.')).toBeInTheDocument();
    expect(screen.queryByText('Client Details')).not.toBeInTheDocument();
  });

  // SITUATION: the api answers with an error object (ie. session expired).
  // CHECKS: the error text is shown instead of a blank page.
  it('shows the api error message', async () => {
    setupApi({ remittances: { error: 'Unauthorized.' } });
    renderPage();
    expect(await screen.findByText('Unauthorized.')).toBeInTheDocument();
  });

  // SITUATION: the server is unreachable.
  // CHECKS: "Failed to reach the server." shows.
  it('shows a network error message', async () => {
    fetch.mockRejectedValue(new Error('offline'));
    renderPage();
    expect(await screen.findByText('Failed to reach the server.')).toBeInTheDocument();
  });

  // SITUATION: a record's client was deleted so populate() gave back null.
  // CHECKS: the row says "Unknown Client" instead of crashing the whole page.
  it('survives a record whose client no longer exists', async () => {
    setupApi({ remittances: [rec({ client: null })] });
    renderPage();
    expect(await screen.findByText('Unknown Client')).toBeInTheDocument();
  });
});

describe('F04 · overdue indicator', () => {
  // SITUATION: due date passed and the record is still Pending.
  // CHECKS: "(Overdue)" text and the red class show.
  it('flags a past-due unfinished record in red', async () => {
    setupApi({ remittances: [RECORDS[0]] });
    renderPage();
    const due = await screen.findByText(/\(Overdue\)/);
    expect(due).toHaveClass('date-overdue');
  });

  // SITUATION: due date passed but it is Completed or Remitted.
  // CHECKS: NOT flagged. 
  it.each(['Completed', 'Remitted'])('does not flag a %s record', async (status) => {
    setupApi({ remittances: [rec({ dueDate: day(-30), status })] });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(screen.queryByText(/\(Overdue\)/)).not.toBeInTheDocument();
  });

  // SITUATION: due date is in the future, or there is no due date at all.
  // CHECKS: not flagged.
  it('does not flag future or undated records', async () => {
    setupApi({ remittances: [rec({ _id: 'a', dueDate: day(3) }), rec({ _id: 'b', dueDate: null })] });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(screen.queryByText(/\(Overdue\)/)).not.toBeInTheDocument();
  });

  // SITUATION: record is due TODAY and still Pending.
  // CHECKS: not overdue yet (overdue = strictly before today).
  it('treats a record due today as not overdue', async () => {
    setupApi({ remittances: [rec({ dueDate: day(0) })] });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(screen.queryByText(/\(Overdue\)/)).not.toBeInTheDocument();
  });

  // SITUATION: no due date shows a dash.
  it('shows a dash for a missing due date', async () => {
    setupApi({ remittances: [rec({ dueDate: null })] });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(within(rows()[0]).getByText('—')).toBeInTheDocument();
  });
});

describe('F04 · filters and search', () => {
  // SITUATION: admin clicks a status tab.
  // CHECKS: only records with that status remain; "All" brings everything back.
  it('filters by status tab', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.click(screen.getByRole('button', { name: 'Completed' }));
    expect(rows()).toHaveLength(1);
    expect(within(rows()[0]).getByText('Maria Santos')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(rows()).toHaveLength(4);
  });

  // SITUATION: admin types a client name.
  // CHECKS: case-insensitive match on the full name, only that client's records remain.
  it('searches by client name', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.type(screen.getByPlaceholderText('Search by client name...'), 'MARIA');
    expect(rows()).toHaveLength(2);
    rows().forEach((r) => expect(within(r).getByText('Maria Santos')).toBeInTheDocument());
  });

  // SITUATION: the search matches nobody.
  // CHECKS: empty state shows.
  it('shows the empty state when the search matches nothing', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.type(screen.getByPlaceholderText('Search by client name...'), 'nobody');
    expect(screen.getByText('No remittances on record.')).toBeInTheDocument();
  });

  // SITUATION: admin picks a tax type from the dropdown.
  // CHECKS: only that tax type remains.
  it('filters by tax type', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.selectOptions(taxSelect(), 'Income Tax');
    expect(rows()).toHaveLength(1);
    expect(within(rows()[0]).getByText('Income Tax')).toBeInTheDocument();
  });

  // SITUATION: admin chooses the "Overdue" date filter.
  // CHECKS: only the unfinished past-due record shows (not the Completed one with the same date).
  it('date filter "Overdue" shows only unfinished past-due records', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.selectOptions(dateSelect(), 'Overdue');
    expect(rows()).toHaveLength(1);
    expect(within(rows()[0]).getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(within(rows()[0]).getByText('VAT')).toBeInTheDocument();
  });

  // SITUATION: admin chooses "Upcoming".
  // CHECKS: only unfinished records due today or later show.
  it('date filter "Upcoming" shows only unfinished future records', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.selectOptions(dateSelect(), 'Upcoming');
    expect(rows()).toHaveLength(1);
    expect(within(rows()[0]).getByText('Withholding Tax')).toBeInTheDocument();
  });

  // SITUATION: admin chooses "No Due Date".
  // CHECKS: only the undated record shows.
  it('date filter "No Due Date" shows only undated records', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.selectOptions(dateSelect(), 'No Due Date');
    expect(rows()).toHaveLength(1);
    expect(within(rows()[0]).getByText('Percentage Tax')).toBeInTheDocument();
  });

  // SITUATION: admin combines status tab + client search + tax filter.
  // CHECKS: all filters apply together (AND).
  it('combines filters', async () => {
    setupApi();
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.type(screen.getByPlaceholderText('Search by client name...'), 'juan');
    await userEvent.selectOptions(taxSelect(), 'Withholding Tax');
    expect(rows()).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Pending' }));
    expect(screen.getByText('No remittances on record.')).toBeInTheDocument();
  });
});

describe('F04 · update status', () => {
  const okPut = (status) => () =>
    respond({ remittance: { status, lastEditedBy: { username: 'plmbadmin' }, updatedAt: new Date().toISOString() } });

  // SITUATION: admin opens the ⋮ menu and picks "Mark Completed".
  // CHECKS: PUT /api/admin/remittances/:id with the new status; badge and "Last edited" update.
  it('changes the status and shows who edited it', async () => {
    setupApi({ remittances: [RECORDS[0]], put: okPut('Completed') });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    await userEvent.click(within(rows()[0]).getByRole('button', { name: '⋮' }));
    await userEvent.click(within(rows()[0]).getByRole('button', { name: 'Mark Completed' }));

    await waitFor(() => expect(within(rows()[0]).getByText('Completed', { selector: '.status-badge' })).toBeInTheDocument());
    const putCall = fetch.mock.calls.find(([, o]) => o && o.method === 'PUT');
    expect(putCall[0]).toBe('/api/admin/remittances/r1');
    expect(JSON.parse(putCall[1].body)).toEqual({ status: 'Completed' });
    expect(within(rows()[0]).getByText(/Last edited: plmbadmin/)).toBeInTheDocument();
  });

  // SITUATION: the menu offers one action per status.
  // CHECKS: Pending / Processing / Remitted / Completed + Delete Record.
  it('offers every status plus delete in the menu', async () => {
    setupApi({ remittances: [RECORDS[0]] });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    const r = within(rows()[0]);
    ['Mark Pending', 'Mark Processing', 'Mark Remitted', 'Mark Completed', 'Delete Record']
      .forEach((n) => expect(r.getByRole('button', { name: n })).toBeInTheDocument());
  });

  // SITUATION: marking a past-due record Completed.
  // CHECKS: the (Overdue) flag disappears right away.
  it('removes the overdue flag once marked Completed', async () => {
    setupApi({ remittances: [RECORDS[0]], put: okPut('Completed') });
    renderPage();
    expect(await screen.findByText(/\(Overdue\)/)).toBeInTheDocument();
    await userEvent.click(within(rows()[0]).getByRole('button', { name: 'Mark Completed' }));
    await waitFor(() => expect(screen.queryByText(/\(Overdue\)/)).not.toBeInTheDocument());
  });

  // SITUATION: the server refuses the update.
  // CHECKS: alert with its message and the status stays the same.
  it('alerts and keeps the old status when the update fails', async () => {
    setupApi({ remittances: [RECORDS[0]], put: () => respond({ message: 'Invalid status update' }, false) });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    await userEvent.click(within(rows()[0]).getByRole('button', { name: 'Mark Completed' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Invalid status update'));
    expect(within(rows()[0]).getByText('Pending', { selector: '.status-badge' })).toBeInTheDocument();
  });

  // SITUATION: network drops during the update.
  // CHECKS: network alert.
  it('alerts on a network error while updating', async () => {
    setupApi({ remittances: [RECORDS[0]], put: () => Promise.reject(new Error('offline')) });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    await userEvent.click(within(rows()[0]).getByRole('button', { name: 'Mark Completed' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Network error while updating status.'));
  });
});

describe('F04 · delete record', () => {
  // SITUATION: admin clicks Delete Record then cancels.
  // CHECKS: popup shows, no DELETE request is sent, row stays.
  it('Cancel keeps the record', async () => {
    setupApi({ remittances: [RECORDS[0]] });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    await userEvent.click(within(rows()[0]).getByRole('button', { name: 'Delete Record' }));
    expect(screen.getByRole('heading', { name: 'Delete Remittance Record' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Delete Remittance Record' })).not.toBeInTheDocument();
    expect(fetch.mock.calls.some(([, o]) => o && o.method === 'DELETE')).toBe(false);
    expect(rows()).toHaveLength(1);
  });

  // SITUATION: admin confirms the delete.
  // CHECKS: DELETE /api/admin/remittances/:id, row disappears, popup closes.
  it('confirming deletes the right record', async () => {
    setupApi({ remittances: [RECORDS[0], RECORDS[2]] });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(2));
    await userEvent.click(within(rows()[1]).getByRole('button', { name: 'Delete Record' })); // r3
    await userEvent.click(screen.getByRole('button', { name: 'Yes, Delete Record' }));

    await waitFor(() => expect(rows()).toHaveLength(1));
    const del = fetch.mock.calls.find(([, o]) => o && o.method === 'DELETE');
    expect(del[0]).toBe('/api/admin/remittances/r3');
    expect(within(rows()[0]).getByText('VAT')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Delete Remittance Record' })).not.toBeInTheDocument();
  });

  // SITUATION: the server says the record is already gone (404).
  // CHECKS: alert shows the message, row stays visible.
  it('alerts when the delete fails', async () => {
    setupApi({ remittances: [RECORDS[0]], del: () => respond({ message: 'Remittance record not found' }, false) });
    renderPage();
    await waitFor(() => expect(rows()).toHaveLength(1));
    await userEvent.click(within(rows()[0]).getByRole('button', { name: 'Delete Record' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, Delete Record' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Remittance record not found'));
    expect(rows()).toHaveLength(1);
  });
});

describe('F04 · add record from the page', () => {
  async function addViaModal() {
    await userEvent.click(screen.getByRole('button', { name: '+ Add Record' }));
    await userEvent.click(screen.getByText('Select a client...'));
    await userEvent.click(screen.getByText('Maria Santos (Santos Bakery)'));
    await userEvent.type(screen.getByRole('spinbutton'), '777');
    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));
  }

  // SITUATION: admin adds a record and the api returns the client as a full object.
  // CHECKS: new row appears at once, popup closes.
  it('shows the new record and closes the popup', async () => {
    const created = rec({ _id: 'new1', client: MARIA, taxType: 'VAT', amount: 777, dueDate: null });
    setupApi({ remittances: [], post: () => respond({ remittance: created }) });
    renderPage();
    await screen.findByText('No remittances on record.');
    await addViaModal();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(within(rows()[0]).getByText('Maria Santos')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Add Tax Remittance' })).not.toBeInTheDocument();
  });

  // SITUATION: the api returns only the client id (string) for the new record.
  // CHECKS: the page looks the client up so the row shows a name, not "Unknown Client".
  it('fills in the client name when the api returns only an id', async () => {
    const created = rec({ _id: 'new1', client: 'c2', amount: 777, dueDate: null });
    setupApi({ remittances: [], post: () => respond({ remittance: created }) });
    renderPage();
    await screen.findByText('No remittances on record.');
    await addViaModal();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(within(rows()[0]).getByText('Maria Santos')).toBeInTheDocument();
  });

  // SITUATION: admin opens the popup then cancels.
  // CHECKS: popup closes and nothing is created.
  it('Cancel closes the add popup', async () => {
    setupApi({ remittances: [] });
    renderPage();
    await screen.findByText('No remittances on record.');
    await userEvent.click(screen.getByRole('button', { name: '+ Add Record' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Add Tax Remittance' })).not.toBeInTheDocument();
    expect(fetch.mock.calls.some(([, o]) => o && o.method === 'POST')).toBe(false);
  });
});
