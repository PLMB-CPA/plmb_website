import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PasswordChecklist from '../PasswordChecklist';
import '../admin/Login.css';

function ClientChangePassword() {
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetch('/api/client/me').then(res => {
            if (res.status === 401) navigate('/client/login', { replace: true });
        });
    }, [navigate]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

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
            navigate('/client');
        } catch {
            setError('Could not reach the server.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="login-page">
            <div className="main">
                <form className="login_form" onSubmit={handleSubmit}>
                    <div className="login_block">
                        <h2 className="login_header">Set a New Password</h2>
                        <p>Please replace the temporary password from your welcome email.</p>

                        <div className="login_inputs">
                            <div className="password pw-field">
                                <input type={showCurrent ? 'text' : 'password'} placeholder="Temporary / Current Password"
                                    autoComplete="current-password"
                                    value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                                <button type="button"
                                    className={`pw-toggle-btn ${showCurrent ? 'open' : ''}`}
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    aria-label={showCurrent ? 'Hide current password' : 'Show current password'} />
                            </div>

                            <div className="password pw-field">
                                <input type={showNew ? 'text' : 'password'} placeholder="New Password"
                                    autoComplete="new-password"
                                    value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                                <button type="button"
                                    className={`pw-toggle-btn ${showNew ? 'open' : ''}`}
                                    onClick={() => setShowNew(!showNew)}
                                    aria-label={showNew ? 'Hide new password' : 'Show new password'} />
                            </div>

                            <div className="password pw-field">
                                <input type={showConfirm ? 'text' : 'password'} placeholder="Confirm Password"
                                    autoComplete="new-password"
                                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                                <button type="button"
                                    className={`pw-toggle-btn ${showConfirm ? 'open' : ''}`}
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'} />
                            </div>
                        </div>

                        <PasswordChecklist password={newPassword} />

                        {error && <p className="login-error">{error}</p>}

                        <div className="login_action">
                            <button type="submit" id="login_btn" disabled={submitting}>
                                {submitting ? 'Saving...' : 'Save Password'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ClientChangePassword;