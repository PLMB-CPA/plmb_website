import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';
import './PasswordRecovery.css';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    
    async function handleSubmit(e) {
        e.preventDefault();

        setError('');
        setMessage('');
        setSubmitting(true);

        try {
            const res = await fetch('/api/admin/recovery/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim()
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(
                    data.error || 'Unable to process your request.'
                );
                return;
            }
            setMessage(data.message);

        } catch {
            setError('Could not reach the server. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="login-page recovery-page">
            <div className="main">
                <form className="login_form" onSubmit={handleSubmit}>
                    <div className="login_block">

                        <h2 className="login_header">
                            Admin Account Recovery
                        </h2>

                        <p className="recovery-description">
                            Enter your registered administrator email address.
                            If an account is associated with it, you will
                            receive a password recovery link.
                        </p>

                        <div className="recovery-field">
                            <label htmlFor="recovery-email">
                                Email Address
                            </label>

                            <input
                                type="email"
                                id="recovery-email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                autoComplete="email"
                                required
                            />
                        </div>

                        {error && (
                            <p className="login-error" role="alert">
                                {error}
                            </p>
                        )}

                        {message && (
                            <p className="recovery-success" role="status">
                                {message}
                            </p>
                        )}

                        <div className="login_action">
                            <button
                                type="submit"
                                id="login_btn"
                                disabled={submitting}
                            >
                                {submitting
                                    ? 'Sending...'
                                    : 'Send Recovery Link'}
                            </button>

                            <Link to="/admin/login" className="btn">
                                Back to Sign-In
                            </Link>
                        </div>

                    </div>
                </form>
            </div>
        </div>
    );
}

export default ForgotPassword;