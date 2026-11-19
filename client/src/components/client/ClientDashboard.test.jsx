// F02 · Client Profile landing page (/client)
// it.fails = known gap against the acceptance criteria. It PASSES while the gap exists and goes RED
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import ClientDashboard from './ClientDashboard.jsx';

const respond = (data, ok = true, status = 200) => Promise.resolve({ ok, status, json: async () => data });

function day(offset) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toISOString();
}

const ME = {
  email: 'juan@business.com', firstName: 'Juan', lastName: 'Dela Cruz',
  phoneNumber: '09171234567', address: 'Unit 4B, 123 Rizal Ave.', city: 'Manila',
  businessName: 'Dela Cruz Trading Co.', tin: '123-456-789-000',
  birthday: '1990-05-17T12:00:00.000Z',      // midday so the shown date is the same in every timezone
};

function setupApi({ me = respond(ME), remittances = respond([]), logout = respond({}) } = {}) {
  fetch.mockImplementation((url) => {
    if (url === '/api/client/me') return me;
    if (url === '/api/client/remittances') return remittances;
    if (url === '/api/client/logout') return logout;
    return respond({});
  });
}
function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/client']}>
      <Routes>
        <Route path="/client" element={<ClientDashboard />} />
        <Route path="/client/login" element={<p>LOGIN PAGE</p>} />
        <Route path="/client/change-password" element={<p>CHANGE PASSWORD PAGE</p>} />
        <Route path="/client/remittances" element={<p>REMITTANCES PAGE</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
// the value shown next to a label in the Profile card
const field = (label) => screen.getByText(label, { selector: '.profile-label' }).nextElementSibling;

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('F02 AC1 · profile is shown after login', () => {
  // SITUATION: a client with a complete profile opens the landing page.
  // CHECKS: name, email, contact number, birthday, TIN, company and address are all shown.
  it('shows the whole profile', async () => {
    setupApi();
    renderPage();
    expect(await screen.findByText('Welcome, Juan')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Juan Dela Cruz', level: 3 })).toBeInTheDocument();
    expect(field('Email')).toHaveTextContent('juan@business.com');
    expect(field('Contact Number')).toHaveTextContent('09171234567');
    expect(field('Birthday')).toHaveTextContent('May 17, 1990');
    expect(field('TIN')).toHaveTextContent('123-456-789-000');
    expect(field('Associated Company')).toHaveTextContent('Dela Cruz Trading Co.');
    expect(field('Address')).toHaveTextContent('Unit 4B, 123 Rizal Ave., Manila');
  });

  // SITUATION: the profile call is still loading.
  // CHECKS: "Loading…" shows and no profile data yet.
  it('shows Loading… while waiting', () => {
    fetch.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  // SITUATION: the client has remittances due on different days.
  // CHECKS: the deadlines card lists them nearest to furthest, with tax type and date.
  it('lists upcoming deadlines from nearest to furthest', async () => {
    setupApi({
      remittances: respond([
        { _id: 'c', taxType: 'Income Tax', dueDate: day(6), status: 'Pending' },
        { _id: 'a', taxType: 'VAT', dueDate: day(1), status: 'Pending' },
        { _id: 'b', taxType: 'Percentage Tax', dueDate: day(3), status: 'Processing' },
      ]),
    });
    renderPage();
    await waitFor(() => expect(document.querySelectorAll('.deadline-item')).toHaveLength(3));
    const types = [...document.querySelectorAll('.deadline-type')].map((e) => e.textContent);
    expect(types).toEqual(['VAT', 'Percentage Tax', 'Income Tax']);
  });

  // SITUATION: the client has a mix of records.
  // CHECKS: only unfinished records due from today up to 7 days ahead are listed. Not listed:
  //         Completed/Remitted, past due, due in 8+ days, and no due date.
  it('only lists unfinished records due within the next 7 days', async () => {
    setupApi({
      remittances: respond([
        { _id: '1', taxType: 'VAT', dueDate: day(2), status: 'Pending' },               // shown
        { _id: '2', taxType: 'Income Tax', dueDate: day(2), status: 'Completed' },      // finished
        { _id: '3', taxType: 'Withholding Tax', dueDate: day(2), status: 'Remitted' },  // finished
        { _id: '4', taxType: 'Percentage Tax', dueDate: day(-2), status: 'Pending' },   // already late
        { _id: '5', taxType: 'Percentage Tax', dueDate: day(8), status: 'Pending' },    // too far
        { _id: '6', taxType: 'Income Tax', dueDate: null, status: 'Pending' },          // no date
      ]),
    });
    renderPage();
    await waitFor(() => expect(document.querySelectorAll('.deadline-item')).toHaveLength(1));
    expect(document.querySelector('.deadline-type')).toHaveTextContent('VAT');
  });
});

describe('F02 AC2 · missing or empty data', () => {
  // SITUATION: no upcoming deadlines.
  // CHECKS: the card says "No upcoming deadlines" (the page adds "within 7 days").
  it('shows "No upcoming deadlines" when there are none', async () => {
    setupApi({ remittances: respond([]) });
    renderPage();
    expect(await screen.findByText(/No upcoming deadlines/)).toBeInTheDocument();
  });

  // SITUATION: the client's remittance list fails to load.
  // CHECKS: the profile still renders and the page does not crash.
  it('still renders the profile when the remittances call fails', async () => {
    fetch.mockImplementation((url) => (url === '/api/client/me' ? respond(ME) : Promise.reject(new Error('offline'))));
    renderPage();
    expect(await screen.findByText('Welcome, Juan')).toBeInTheDocument();
    expect(screen.getByText(/No upcoming deadlines/)).toBeInTheDocument();
  });

  // SITUATION: an empty profile (no phone, birthday, TIN, company or address).
  // CHECKS: the page renders without errors and each empty field shows a placeholder (a dash today).
  it('renders every empty field with a placeholder instead of crashing', async () => {
    setupApi({ me: respond({ email: 'a@b.com', firstName: 'Juan', lastName: 'Dela Cruz' }) });
    renderPage();
    expect(await screen.findByText('Welcome, Juan')).toBeInTheDocument();
    ['Contact Number', 'Birthday', 'TIN', 'Associated Company', 'Address'].forEach((label) => {
      expect(field(label)).toHaveTextContent('Not provided');
    });
  });

  // SITUATION: same empty profile.
  // CHECKS: AC2 says the placeholder is "Not provided". Rn, it is "—".
  it('an empty field shows "Not provided"', async () => {
    setupApi({ me: respond({ email: 'a@b.com', firstName: 'Juan', lastName: 'Dela Cruz' }) });
    renderPage();
    await screen.findByText('Welcome, Juan');
    expect(field('TIN')).toHaveTextContent('Not provided');
    expect(field('Contact Number')).toHaveTextContent('Not provided');
  });

  // SITUATION: an incomplete profile (no TIN, no phone).
  // CHECKS: AC2 says incomplete fields are flagged with a prompt to contact the firm. Not implemented.
  it('an incomplete profile shows a "contact the firm" prompt', async () => {
    setupApi({ me: respond({ ...ME, tin: undefined, phoneNumber: undefined }) });
    renderPage();
    await screen.findByText('Welcome, Juan');
    expect(screen.getByText(/contact the firm/i)).toBeInTheDocument();
  });

  // SITUATION: a complete profile.
  // CHECKS: no contact prompt, so the flag cannot appear for everybody once it is built.
  it('a complete profile has no contact prompt', async () => {
    setupApi();
    renderPage();
    await screen.findByText('Welcome, Juan');
    expect(screen.queryByText(/contact the firm/i)).not.toBeInTheDocument();
  });

  // SITUATION: the profile api answers 404 (the client was deleted while logged in) or 500.
  // CHECKS: the page should show an error message. Today it shows an empty "Welcome, " page, because the
  //         error object from the api is treated as the client.
  it.each([[404], [500]])('GAP: a %i from the profile api does not render an empty profile', async (status) => {
    setupApi({ me: respond({ error: 'User not found, cannot retrieve information.' }, false, status) });
    renderPage();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/Welcome,/)).not.toBeInTheDocument();
  });
});

describe('F02 AC3 · not allowed in', () => {
  // SITUATION: not logged in or the session expired (api answers 401).
  // CHECKS: sent to the client login and no profile data (TIN, email) is ever on screen.
  it('redirects to login on 401 and shows no personal data', async () => {
    setupApi({ me: respond({ error: 'Unauthorized.' }, false, 401) });
    renderPage();
    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument();
    expect(screen.queryByText('TIN')).not.toBeInTheDocument();
    expect(screen.queryByText(/juan@business.com/)).not.toBeInTheDocument();
  });

  // SITUATION: the client still has the temporary password (403).
  // CHECKS: sent to change-password.
  it('redirects to change-password on 403', async () => {
    setupApi({ me: respond({ mustChangePassword: true }, false, 403) });
    renderPage();
    expect(await screen.findByText('CHANGE PASSWORD PAGE')).toBeInTheDocument();
  });

  // SITUATION: the profile call cannot reach the server.
  it('shows "Could not load profile." on a network error', async () => {
    fetch.mockRejectedValue(new Error('offline'));
    renderPage();
    expect(await screen.findByText('Could not load profile.')).toBeInTheDocument();
  });
});

describe('F02 · navigation on the landing page', () => {
  // SITUATION: client clicks Remittances in the sidebar.
  it('links to the remittances page', async () => {
    setupApi();
    renderPage();
    await userEvent.click(await screen.findByRole('link', { name: /Remittances/ }));
    expect(await screen.findByText('REMITTANCES PAGE')).toBeInTheDocument();
  });

  // SITUATION: client clicks Logout.
  // CHECKS: POST /api/client/logout then the login page.
  it('logout ends the session and goes to the login page', async () => {
    setupApi();
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /Logout/ }));
    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument();
    expect(fetch.mock.calls.find(([u]) => u === '/api/client/logout')[1].method).toBe('POST');
  });
});
