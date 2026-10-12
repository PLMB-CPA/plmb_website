import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

// Replaces src/views/admin_login.html + public/js/login.js + public/js/password-toggle.js

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, remember }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Something went wrong, please try again.');
                return;
            }
            // The server sets a session cookie on success; there's no token to store
            navigate('/admin');
        } catch {
            setError('Could not reach the server.');
        }
    }

    return (
        <div className="login-page">
            <div className="main">
                <form className="login_form" onSubmit={handleSubmit}>
                    <div className="login_block">
                        <h2 className="login_header">User Sign-In</h2>

                        <div className="login_inputs">
                            <div className="username">
                                <input type="text" id="username" placeholder="Username" autoComplete="username"
                                    value={username} onChange={e => setUsername(e.target.value)} required />
                            </div>

                            <div className="password" id="pw-container">
                                <input type={showPw ? 'text' : 'password'} id="password" placeholder="Password"
                                    autoComplete="current-password"
                                    value={password} onChange={e => setPassword(e.target.value)} required />
                                <button type="button" id="pw-button"
                                    className={showPw ? 'open' : ''}
                                    onClick={() => setShowPw(!showPw)}
                                    aria-label={showPw ? 'Hide password' : 'Show password'} />
                            </div>
                        </div>

                        <div className="remember">
                            <label>
                                <input type="checkbox" checked={remember}
                                    onChange={e => setRemember(e.target.checked)} />
                                Remember Me
                            </label>
                        </div>

                        {error && <p className="login-error">{error}</p>}

                        <div className="login_action">
                            <button type="submit" id="login_btn">Log-in</button>
                            <Link to="/" className="btn">Return to Main Page</Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Login;
