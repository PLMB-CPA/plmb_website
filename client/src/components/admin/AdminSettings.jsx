import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import { PasswordField } from './AdminCreation';
import './AdminCreation.css';
import './AdminSettings.css';

function ProfileForm({ admin, setAdmin }) {
    const [name, setName] = useState(admin.name);
    const [username, setUsername] = useState(admin.username);
    const [email, setEmail] = useState(admin.email);
    const [message, setMessage] = useState(null);
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage(null);
        setSaving(true);
        try {
            const res = await fetch('/api/admin/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, username, email }),
            });
            const data = await res.json();
            if (data.error) {
                setMessage({ type: 'error', text: data.error });
                return;
            }
            setAdmin(data.admin);
            setUsername(data.admin.username);
            setEmail(data.admin.email);
            setName(data.admin.name);
            setMessage({ type: 'success', text: data.message });
        } catch {
            setMessage({ type: 'error', text: 'Network error. Try again.' });
        } finally {
            setSaving(false);
        }
    }

    return (
        <form className="form-card" onSubmit={handleSubmit}>
            <section className="form-section">
                <h2>Profile</h2>
                <div className="form-grid">
                    <label className="field">
                        Name
                        <input type="text" autoComplete="name" placeholder="e.g. Maria Reyes"
                            value={name} onChange={e => setName(e.target.value)} />
                    </label>
                    <label className="field">
                        Username
                        <input type="text" autoComplete="username"
                            value={username} onChange={e => setUsername(e.target.value)} required />
                    </label>
                    <label className="field">
                        Email
                        <input type="email" autoComplete="email" placeholder="e.g. mreyes@plmb.com"
                            value={email} onChange={e => setEmail(e.target.value)} />
                    </label>
                </div>
            </section>

            {message && <p className={`form-message ${message.type}`}>{message.text}</p>}

            <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save changes'}
                </button>
            </div>
        </form>
    );
}

function PasswordForm() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState(null);
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/admin/me/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (data.error) {
                setMessage({ type: 'error', text: data.error });
                return;
            }
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setMessage({ type: 'success', text: data.message });
        } catch {
            setMessage({ type: 'error', text: 'Network error. Try again.' });
        } finally {
            setSaving(false);
        }
    }

    return (
        <form className="form-card" onSubmit={handleSubmit}>
            <section className="form-section">
                <h2>Change Password</h2>
                <div className="form-grid">
                    <div className="field-stack">
                        <PasswordField label="Current password"
                            value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                        <PasswordField label="New password"
                            value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        <PasswordField label="Confirm new password"
                            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>

                    <div className="password-rules">
                        <strong>Password must have</strong>
                        <ul>
                            <li>At least 10 characters</li>
                            <li>One capital letter</li>
                            <li>One number</li>
                            <li>One special character</li>
                        </ul>
                    </div>
                </div>
            </section>

            {message && <p className={`form-message ${message.type}`}>{message.text}</p>}

            <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Update password'}
                </button>
            </div>
        </form>
    );
}

function PreferencesForm({ admin, setAdmin }) {
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    async function handleToggle() {
        const next = !admin.openLastPage;
        setError('');
        setSaving(true);
        setAdmin({ ...admin, openLastPage: next });
        try {
            const res = await fetch('/api/admin/me/preferences', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ openLastPage: next }),
            });
            const data = await res.json();
            if (data.error) {
                setAdmin({ ...admin, openLastPage: !next });
                setError(data.error);
                return;
            }
            setAdmin(data.admin);
        } catch {
            setAdmin({ ...admin, openLastPage: !next });
            setError('Network error. Try again.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="form-card">
            <section className="form-section">
                <h2>Preferences</h2>
                <div className="toggle-row">
                    <div className="toggle-text">
                        <strong>Open last visited page</strong>
                        <span>When on, the admin panel opens on the page you were last on instead of Manage Clients.</span>
                    </div>
                    <button type="button" role="switch" aria-checked={admin.openLastPage}
                        aria-label="Open last visited page"
                        className={`toggle ${admin.openLastPage ? 'on' : ''}`}
                        onClick={handleToggle} disabled={saving}>
                        <span className="toggle-knob" />
                    </button>
                </div>
            </section>

            {error && <p className="form-message error">{error}</p>}
        </div>
    );
}

function AdminSettings() {
    const { admin, setAdmin } = useOutletContext();

    return (
        <div className="admin-form-page">
            <AdminHeader />

            <div className="form-wrap">
                <div className="form-title">
                    <h1>Settings</h1>
                    <p>Update your profile, password, and preferences.</p>
                </div>

                <ProfileForm admin={admin} setAdmin={setAdmin} />
                <PasswordForm />
                <PreferencesForm admin={admin} setAdmin={setAdmin} />
            </div>
        </div>
    );
}

export default AdminSettings;
