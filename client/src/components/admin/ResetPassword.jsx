import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import './Login.css';
import './PasswordRecovery.css';

function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [token] = useState(() => searchParams.get('token') || '');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const [submitting, setSubmitting] = useState(false);

    const [invalidToken, setInvalidToken] = useState(
        !/^[a-f0-9]{64}$/.test(token)
    );

    useEffect(() => {
        if (token) {
            navigate('/admin/reset-password', { replace: true });
        }
    }, [token, navigate]);

    async function handleSubmit(e) {
        e.preventDefault();

        setError('');
        setMessage('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch('/api/admin/recovery/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },

                body: JSON.stringify({
                    token,
                    newPassword
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.code === 'INVALID_RECOVERY_TOKEN') {
                    setInvalidToken(true);
                }

                setError(
                    data.error || 'Unable to reset your password.'
                );

                return;
            }

            setMessage(data.message);

            setNewPassword('');
            setConfirmPassword('');

        } catch {
            setError('Could not reach the server. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="login-page recovery-page admin-reset-page">
            <div className="main">

                <div className="login_form">
                    <div className="login_block">

                        <h2 className="login_header">
                            Reset Admin Password
                        </h2>

                        {message ? (
                            <div className="recovery-result">

                                <p className="recovery-success" role="status">
                                    {message}
                                </p>

                                <Link
                                    to="/admin/login"
                                    className="recovery-link"
                                >
                                    Return to Sign-In
                                </Link>

                            </div>

                        ) : invalidToken ? (
                            <div className="recovery-result">

                                <p className="login-error" role="alert">
                                    {error || 'This recovery link is invalid.'}
                                </p>

                                <Link
                                    to="/admin/forgot-password"
                                    className="recovery-link"
                                >
                                    Request a New Recovery Link
                                </Link>

                            </div>

                        ) : (

                            <form onSubmit={handleSubmit} className="reset-password-form">

                                <p className="recovery-description">
                                    Enter a new password for your
                                    administrator account.
                                </p>

                                <div className="recovery-field">

                                    <label htmlFor="new-password">
                                        New Password
                                    </label>

                                    <input
                                        type="password"
                                        id="new-password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        autoComplete="new-password"
                                        required
                                    />

                                </div>

                                <div className="recovery-field">

                                    <label htmlFor="confirm-password">
                                        Confirm New Password
                                    </label>

                                    <input
                                        type="password"
                                        id="confirm-password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        autoComplete="new-password"
                                        required
                                    />

                                </div>

                                <p className="recovery-description">
                                    Password must contain at least 10
                                    characters, one uppercase letter,
                                    one number, and one special character.
                                </p>

                                {error && (
                                    <p className="login-error" role="alert">
                                        {error}
                                    </p>
                                )}

                                <div className="login_action">

                                    <button
                                        type="submit"
                                        id="login_btn"
                                        disabled={submitting}
                                    >
                                        {submitting
                                            ? 'Resetting...'
                                            : 'Reset Password'}
                                    </button>

                                    <Link
                                        to="/admin/forgot-password"
                                        className="btn"
                                    >
                                        Request a New Link
                                    </Link>

                                </div>

                            </form>
                        )}

                    </div>
                </div>

            </div>
        </div>
    );
}

export default ResetPassword;