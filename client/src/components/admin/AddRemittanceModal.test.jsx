// F04 · Client Tax Remittance Status Tracking (admin "Add Tax Remittance" popup)
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import AddRemittanceModal from './AddRemittanceModal.jsx';

const CLIENTS = [
  { _id: 'c1', firstName: 'Juan', lastName: 'Dela Cruz', businessName: 'Dela Cruz Trading' },
  { _id: 'c2', firstName: 'Maria', lastName: 'Santos', businessName: 'Santos Bakery' },
];
const respond = (data, ok = true) => Promise.resolve({ ok, json: async () => data });

function setup(props = {}) {
  const onClose = vi.fn(); const onSuccess = vi.fn();
  render(<AddRemittanceModal clients={CLIENTS} onClose={onClose} onSuccess={onSuccess} {...props} />);
  return { onClose, onSuccess };
}
async function pickClient(label) {
  await userEvent.click(screen.getByText('Select a client...'));
  await userEvent.click(screen.getByText(label));
}
const amountInput = () => screen.getByRole('spinbutton');

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  window.alert = vi.fn();
});

describe('F04 · add remittance form layout', () => {
  // SITUATION: admin clicks "+ Add Record".
  // CHECKS: the form has client, tax type, amount and due date, with the 4 tax types in the list.
  it('shows the fields and all four tax types', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Add Tax Remittance' })).toBeInTheDocument();
    expect(screen.getByText('Select a client...')).toBeInTheDocument();
    const taxOptions = screen.getAllByRole('option').map((o) => o.textContent);
    expect(taxOptions).toEqual(['VAT', 'Percentage Tax', 'Income Tax', 'Withholding Tax']);
    expect(screen.getByText('Due Date')).toBeInTheDocument();
  });

  // SITUATION: admin types a negative amount.
  // CHECKS: the amount box is required and has min=0 so the browser blocks negatives.
  it('amount is required and cannot be negative', () => {
    setup();
    expect(amountInput()).toBeRequired();
    expect(amountInput()).toHaveAttribute('min', '0');
  });

  // SITUATION: admin clicks Cancel.
  // CHECKS: onClose fires and nothing is sent to the server.
  it('Cancel closes the popup without saving', async () => {
    const { onClose, onSuccess } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('F04 · searchable client dropdown', () => {
  // SITUATION: admin opens the dropdown and types part of a name.
  // CHECKS: list narrows by first name, last name or business name.
  it('filters clients by name or business', async () => {
    setup();
    await userEvent.click(screen.getByText('Select a client...'));
    await userEvent.type(screen.getByPlaceholderText('Search client name...'), 'bakery');
    expect(screen.getByText('Maria Santos (Santos Bakery)')).toBeInTheDocument();
    expect(screen.queryByText('Juan Dela Cruz (Dela Cruz Trading)')).not.toBeInTheDocument();
  });

  // SITUATION: admin searches for someone who does not exist.
  // CHECKS: "No clients found" shows.
  it('shows "No clients found" when nothing matches', async () => {
    setup();
    await userEvent.click(screen.getByText('Select a client...'));
    await userEvent.type(screen.getByPlaceholderText('Search client name...'), 'zzzz');
    expect(screen.getByText('No clients found')).toBeInTheDocument();
  });

  // SITUATION: admin picks a client.
  // CHECKS: the header now shows "First Last (Business)" and the menu closes.
  it('shows the chosen client and closes the menu', async () => {
    setup();
    await pickClient('Juan Dela Cruz (Dela Cruz Trading)');
    expect(screen.getByText(/Juan Dela Cruz \(Dela Cruz Trading\)/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search client name...')).not.toBeInTheDocument();
  });
});

describe('F04 · saving a record', () => {
  // SITUATION: admin presses Save without picking a client.
  // CHECKS: an alert asks for a client and nothing is sent.
  it('blocks save when no client is selected', async () => {
    setup();
    await userEvent.type(amountInput(), '1500');
    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please select a client.');
    // expect(window.alert).toHaveBeenCalledWith('Please select a client.');
    expect(window.alert).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  // SITUATION: admin fills everything and saves.
  // CHECKS: POST /api/admin/remittances with client, taxType, amount, dueDate; onSuccess gets the new record.
  it('posts the form and hands the new record to onSuccess', async () => {
    const saved = { _id: 'r1', client: 'c1', taxType: 'Income Tax', amount: 1500, status: 'Pending' };
    fetch.mockReturnValue(respond({ message: 'Remittance record created', remittance: saved }));
    const { onSuccess } = setup();
    await pickClient('Juan Dela Cruz (Dela Cruz Trading)');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'Income Tax');
    await userEvent.type(amountInput(), '1500');
    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(saved));
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe('/api/admin/remittances');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ client: 'c1', taxType: 'Income Tax', amount: '1500', dueDate: '' });
  });

  // SITUATION: due date is optional (AC) so admin leaves it blank.
  // CHECKS: the form still saves.
  it('saves fine with no due date', async () => {
    fetch.mockReturnValue(respond({ remittance: { _id: 'r1' } }));
    const { onSuccess } = setup();
    await pickClient('Maria Santos (Santos Bakery)');
    await userEvent.type(amountInput(), '200');
    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(JSON.parse(fetch.mock.calls[0][1].body).dueDate).toBe('');
  });

  // SITUATION: the server rejects the record with a message.
  // CHECKS: the admin sees that message and the popup does not report success.
  it('shows the server message when saving fails', async () => {
    fetch.mockReturnValue(respond({ message: 'Invalid tax type selected' }, false));
    const { onSuccess } = setup();
    await pickClient('Juan Dela Cruz (Dela Cruz Trading)');
    await userEvent.type(amountInput(), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Invalid tax type selected'));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // SITUATION: the server is down.
  // CHECKS: a network error alert shows instead of a crash.
  it('shows a network error alert when the request throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetch.mockRejectedValue(new Error('offline'));
    const { onSuccess } = setup();
    await pickClient('Juan Dela Cruz (Dela Cruz Trading)');
    await userEvent.type(amountInput(), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Network error while creating record.'));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  // SITUATION: the api rejects with the raw-error shape {error: "..."} instead of the expected {message: "..."}.
  // CHECKS: admin falls back to the generic text (documents the message/error key mismatch).
  it('falls back to a generic message when the api sends {error} instead of {message}', async () => {
    fetch.mockReturnValue(respond({ error: 'Remittance validation failed: client: Cast to ObjectId failed' }, false));
    setup();
    await pickClient('Juan Dela Cruz (Dela Cruz Trading)');
    await userEvent.type(amountInput(), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Failed to create record'));
  });
});

// ================================================================ AC2 gap (admin side)
describe('F04 · AC2 gap on the add form', () => {
  // SITUATION: admin presses Save with no client selected.
  // CHECKS: AC2: the save is rejected with an error beside the invalid field (shown on the page).
  //         For now, it only fires a window.alert() popup and nothing appears in the form.
  it('shows the error inside the form, not as a popup alert', async () => {
    setup();
    await userEvent.type(amountInput(), '1500');
    await userEvent.click(screen.getByRole('button', { name: 'Save Record' }));
    expect(screen.getByText('Please select a client.')).toBeInTheDocument();
    expect(window.alert).not.toHaveBeenCalled();
  });
});