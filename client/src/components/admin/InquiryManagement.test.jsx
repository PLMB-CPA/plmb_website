import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import InquiryManagement from './InquiryManagement.jsx';
vi.mock('./AdminHeader', () => ({ default: () => <div>header</div> }));
vi.mock('./useClickOutside', () => ({ default: () => ({ current: null }) }));

const DASH = '\u2014';   // the placeholder the cards show while there is no data
const respond = (data, ok = true) => Promise.resolve({ ok, json: async () => data });

const STATS = {
  total: 12, new: 3, inProgress: 4, answered: 3, overdue: 2,
  archived: 2, replied: 3, averageResponseTimeMinutes: 90,
};

function setupApi({ stats = STATS, statsOk = true, inquiries = [] } = {}) {
  fetch.mockImplementation((url) =>
    url === '/api/inquiries/stats' ? respond({ stats }, statsOk) : respond({ inquiries }));
}
const renderPage = () => render(<MemoryRouter><InquiryManagement /></MemoryRouter>);
const card = (label) => screen.getByRole('heading', { name: label, level: 3 }).nextElementSibling;

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe('F03 AC1 · analytics cards', () => {
  // SITUATION: admin opens the tracker. 
  // CHECKS: each of the 8 cards shows the number from the api.
  it.each([
    ['Total Inquiries', '12'], ['New Inquiries', '3'], ['In Progress', '4'], ['Answered', '3'],
    ['Overdue', '2'], ['Archived', '2'], ['Email Replies Sent', '3'],
    ['Average Response Time', '90 minutes'],
  ])('"%s" card shows %s', async (label, expected) => {
    setupApi();
    renderPage();
    await waitFor(() => expect(card(label)).toHaveTextContent(expected));
  });

  // SITUATION: no inquiry has been replied to yet. 
  // CHECKS: the average shows a dash, not "null minutes".
  it('shows a dash when there is no average response time', async () => {
    setupApi({ stats: { ...STATS, averageResponseTimeMinutes: null } });
    renderPage();
    await waitFor(() => expect(card('Total Inquiries')).toHaveTextContent('12'));
    expect(card('Average Response Time')).toHaveTextContent(DASH);
  });

  // SITUATION: the stats api fails (500 or no network). 
  // CHECKS: a visible error, cards show dashes.
  it('shows an error when the stats cannot be loaded', async () => {
    setupApi({ statsOk: false });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load inquiry statistics.');
    expect(card('Total Inquiries')).toHaveTextContent(DASH);
  });

  it('shows the same error when the network is down', async () => {
    fetch.mockRejectedValue(new Error('offline'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load inquiry statistics.');
  });

  // BUG #5. it.fails passes while the bug exists and goes red when it's fixed.
  it('average response time is worded correctly (1 minute, not 1 minutes)', async () => {
    setupApi({ stats: { ...STATS, averageResponseTimeMinutes: 1 } });
    renderPage();
    await waitFor(() => expect(card('Average Response Time')).toHaveTextContent(/^1 minute$/));
  });
});

describe('F03 · inquiry list', () => {
  it('shows the inquiries returned by /api/inquiries', async () => {
    setupApi({
      inquiries: [{
        _id: 'a1', ticketNumber: 'INQ-0001', businessName: 'JDC Corp', subject: 'Audit',
        message: 'Quote please', category: 'Tax Services', industrySector: 'Retail',
        date: '2026-11-09T02:00:00Z', isRead: false, isAnswered: false, isArchived: false,
      }],
    });
    renderPage();
    expect(await screen.findByText('INQ-0001')).toBeInTheDocument();
  });
});