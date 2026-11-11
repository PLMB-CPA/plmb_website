import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import './AdminCreation.css';

function PasswordField({ label, value, onChange }) {
    const [show, setShow] = useState(false);
    return (
        <label className="field">
            {label}
            <span className="password-input">
                <input type={show ? 'text' : 'password'} autoComplete="new-password"
                    value={value} onChange={onChange} required />
                <button type="button" className={`pw-toggle ${show ? 'open' : ''}`}
                    onClick={() => setShow(!show)}
                    aria-label={show ? 'Hide password' : 'Show password'} />
            </span>
        </label>
    );
}

function AdminCreation() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode') === 'change' ? 'change' : 'add';
    const adminId = searchParams.get('id') || '';

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const title = mode === 'change' ? 'Change Password' : 'Add Admin';

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        const request = mode === 'add'
            ? { url: '/api/admin/users', method: 'POST', body: { username, password } }
            : { url: `/api/admin/users/${adminId}/password`, method: 'PUT', body: { password } };

        setSubmitting(true);
        try {
            const res = await fetch(request.url, {
                method: request.method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request.body),
            });
            const data = await res.json();
            if (data.error) {
                setError(data.error);
                return;
            }
            navigate('/admin/manage');
        } catch {
            setError('Network error. Try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="admin-form-page">
            <AdminHeader />

            <div className="form-wrap">
                <div className="form-title">
                    <nav className="breadcrumb" aria-label="Breadcrumb">
                        <Link to="/admin/manage">Manage Admin</Link>
                        <span className="sep" aria-hidden="true">/</span>
                        <span>{title}</span>
                    </nav>
                    <h1>{title}</h1>
                    <p>
                        {mode === 'change'
                            ? 'Set a new password for this admin.'
                            : 'Gives a staff member access to this admin panel.'}
                    </p>
                </div>

                <form className="form-card" onSubmit={handleSubmit}>
                    {mode === 'add' && (
                        <section className="form-section">
                            <h2>Account</h2>
                            <div className="form-grid">
                                <label className="field">
                                    Username
                                    <input type="text" autoComplete="off" placeholder="e.g. mreyes"
                                        value={username} onChange={e => setUsername(e.target.value)} required />
                                </label>
                            </div>
                        </section>
                    )}

                    <section className="form-section">
                        <h2>Password</h2>
                        <div className="form-grid">
                            <div className="field-stack">
                                <PasswordField label="Password"
                                    value={password} onChange={e => setPassword(e.target.value)} />
                                <PasswordField label="Confirm password"
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

                    {error && <p className="form-message error">{error}</p>}

                    <div className="form-actions">
                        <Link to="/admin/manage" className="btn-secondary">Cancel</Link>
                        <button type="submit" className="btn-primary" disabled={submitting}>
                            {submitting ? 'Saving...' : mode === 'change' ? 'Update password' : 'Create admin'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AdminCreation;
