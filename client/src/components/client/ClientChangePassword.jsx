import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './ClientDashboard.css';

function ClientChangePassword() {
    const navigate = useNavigate();
    const [client, setClient] = useState(null);
    const [forced, setForced] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetch('/api/client/me')
            .then(res => {
                if (res.status === 401) { navigate('/client/login', { replace: true }); return null; }
                // 403 means mustChangePassword — still allow access to this page
                if (res.status === 403) { setForced(true); return res.json(); }
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then(data => { if (data) setClient(data); })
            .catch(() => navigate('/client/login', { replace: true }));
    }, [navigate]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/client/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong, please try again.');
                return;
            }

            if (forced) {
                navigate('/client', { replace: true });
            } else {
                setSuccess('Password updated successfully.');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch {
            setError('Could not reach the server.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleLogout() {
        await fetch('/api/client/logout', { method: 'POST' });
        navigate('/client/login', { replace: true });
    }

    if (!client) return <p className="state-msg">Loading…</p>;

    return (
        <div className="client-shell">
            <div className="bg-container">
                <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
                    <div className="sidebar-brand">
                        <img src="/image/logo.png" alt="Logo" />
                        <h1>PLMB</h1>
                        <button type="button" className="menu-toggle" onClick={() => setMenuOpen(v => !v)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
                            {menuOpen ? '✕' : '☰'}
                        </button>
                    </div>

                    <nav className="sidebar-nav">
                        <Link to="/client" className="sidebar-link" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                            <img className="menu-icon" src="/image/menu.png" alt="" />
                            <span>Dashboard</span>
                        </Link>
                        <Link to="/client/remittances" className="sidebar-link" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                            <img className="menu-icon" src="/image/peso-icon.png" alt="" />
                            <span>Remittances</span>
                        </Link>
                        <div className="sidebar-link active change-password-link">
                            <img className="menu-icon change-password-icon" src="/image/password-icon.png" alt="" />
                            <span>Change Password</span>
                        </div>
                    </nav>

                    <button className="sidebar-link logout" onClick={handleLogout}>
                        <img className="menu-icon" src="/image/logout.png" alt="" />
                        <span>Logout</span>
                    </button>
                </aside>

                <div className="main-content">
                    <header className="page-header">
                        <div>
                            <h1>Welcome, {client.firstName}</h1>
                        </div>
                        <div className="divider" />
                        <div className="header-right">
                            <div className="client-info">
                                <h3>{client.firstName} {client.lastName}</h3>
                                <p>Client</p>
                            </div>
                        </div>
                    </header>

                    <div className="page-body">
                        <h1>Change Password</h1>

                        <div className="card change-password-card">
                            {forced && (
                                <p className="forced-notice">
                                    You must set a new password before continuing. Please replace the temporary password from your welcome email.
                                </p>
                            )}

                            <form onSubmit={handleSubmit} className="change-password-form">
                                <div className="cp-field">
                                    <label>Current Password</label>
                                    <div className="cp-input-wrap">
                                        <input
                                            type={showCurrent ? 'text' : 'password'}
                                            autoComplete="current-password"
                                            value={currentPassword}
                                            onChange={e => setCurrentPassword(e.target.value)}
                                            required
                                        />
                                        <button type="button" className="cp-eye" onClick={() => setShowCurrent(v => !v)} aria-label={showCurrent ? 'Hide password' : 'Show password'}>
                                            <img src={showCurrent ? '/image/eye-open.svg' : '/image/eye-closed.svg'} alt="" />
                                        </button>
                                    </div>
                                </div>
                                <div className="cp-field">
                                    <label>New Password</label>
                                    <div className="cp-input-wrap">
                                        <input
                                            type={showNew ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            required
                                        />
                                        <button type="button" className="cp-eye" onClick={() => setShowNew(v => !v)} aria-label={showNew ? 'Hide password' : 'Show password'}>
                                            <img src={showNew ? '/image/eye-open.svg' : '/image/eye-closed.svg'} alt="" />
                                        </button>
                                    </div>
                                </div>
                                <div className="cp-field">
                                    <label>Confirm New Password</label>
                                    <div className="cp-input-wrap">
                                        <input
                                            type={showConfirm ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            value={confirmPassword}
                                            onChange={e => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                        <button type="button" className="cp-eye" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                                            <img src={showConfirm ? '/image/eye-open.svg' : '/image/eye-closed.svg'} alt="" />
                                        </button>
                                    </div>
                                </div>

                                <ul className="cp-rules">
                                    <li>At least 10 characters</li>
                                    <li>At least 1 uppercase letter</li>
                                    <li>At least 1 special character</li>
                                    <li>At least 1 number</li>
                                </ul>

                                {error && <p className="cp-error">{error}</p>}
                                {success && <p className="cp-success">{success}</p>}

                                <button type="submit" className="cp-submit" disabled={submitting}>
                                    {submitting ? 'Saving…' : 'Save Password'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ClientChangePassword;
