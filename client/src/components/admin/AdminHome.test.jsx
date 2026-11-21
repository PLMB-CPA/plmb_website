import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';

import AdminHome from './AdminHome';
import { saveLastAdminPage } from './lastAdminPage';

function Landed() {
    const location = useLocation();
    return <p data-testid="landed">{location.pathname + location.search}</p>;
}

function landAs(admin) {
    render(
        <MemoryRouter initialEntries={['/admin']}>
            <Routes>
                <Route path="/admin" element={<Outlet context={{ admin }} />}>
                    <Route index element={<AdminHome />} />
                    <Route path="*" element={<Landed />} />
                </Route>
            </Routes>
        </MemoryRouter>
    );
    return screen.getByTestId('landed').textContent;
}

const admin = (overrides = {}) => ({ id: 'a1', isMain: false, openLastPage: false, ...overrides });

beforeEach(() => localStorage.clear());

describe('admin landing page', () => {
    it('opens Manage Clients by default', () => {
        expect(landAs(admin())).toBe('/admin/clients');
    });

    it('ignores the last page while the setting is off', () => {
        saveLastAdminPage('a1', '/admin/inquiries');
        expect(landAs(admin())).toBe('/admin/clients');
    });

    it('opens the last visited page when the setting is on', () => {
        saveLastAdminPage('a1', '/admin/inquiries');
        expect(landAs(admin({ openLastPage: true }))).toBe('/admin/inquiries');
    });

    it('keeps the query string of the last page', () => {
        saveLastAdminPage('a1', '/admin/newsletters/new?draft=1');
        expect(landAs(admin({ openLastPage: true }))).toBe('/admin/newsletters/new?draft=1');
    });

    it('falls back to Manage Clients when nothing was saved yet', () => {
        expect(landAs(admin({ openLastPage: true }))).toBe('/admin/clients');
    });

    it('keeps each admin\'s last page separate', () => {
        saveLastAdminPage('someone-else', '/admin/inquiries');
        expect(landAs(admin({ openLastPage: true }))).toBe('/admin/clients');
    });

    it('does not reopen Manage Admin for an admin who is no longer main', () => {
        saveLastAdminPage('a1', '/admin/manage');
        expect(landAs(admin({ openLastPage: true, isMain: false }))).toBe('/admin/clients');
    });

    it('reopens Manage Admin for a main admin', () => {
        saveLastAdminPage('a1', '/admin/manage');
        expect(landAs(admin({ openLastPage: true, isMain: true }))).toBe('/admin/manage');
    });

    it('never saves the login page or /admin itself as the last page', () => {
        saveLastAdminPage('a1', '/admin/inquiries');
        saveLastAdminPage('a1', '/admin/login');
        saveLastAdminPage('a1', '/admin');
        expect(landAs(admin({ openLastPage: true }))).toBe('/admin/inquiries');
    });
});
