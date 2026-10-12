import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import useAdminSession from './useAdminSession';
import './AdminCreation.css';

// Replaces src/views/admin_creation.html + public/js/admin_creation.js
//
//   /admin/create?mode=add                 -> create a new admin
//   /admin/create?mode=change&id=<adminId> -> change that admin's password
//
// No sidebar here, so this page sits outside AdminLayout and runs the login
// check itself.

function PasswordField({ id, placeholder, value, onChange, containerId, buttonId }) {
    const [show, setShow] = useState(false);
    return (
        <div className="password" id={containerId}>
            <input type={show ? 'text' : 'password'} id={id} placeholder={placeholder}
                autoComplete="new-password" value={value} onChange={onChange} required />
            <button type="button" id={buttonId} className={show ? 'open' : ''}
                onClick={() => setShow(!show)}
                aria-label={show ? 'Hide password' : 'Show password'} />
        </div>
    );
}

function AdminCreation() {
    const loggedInAs = useAdminSession();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode') === 'change' ? 'change' : 'add';
    const adminId = searchParams.get('id') || '';

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    if (loggedInAs === null) return null; // still checking the session

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
        }
    }

    return (
        <div className="admin-create-page">
            <div className="main">
                <form className="admin_form" onSubmit={handleSubmit}>
                    <div className="admin_block">
                        <h2 className="admin_header">{mode === 'change' ? 'Change Password' : 'Add Admin'}</h2>

                        <div className="admin_inputs">
                            {mode === 'add' && (
                                <div className="username">
                                    <input type="text" id="username" placeholder="Username" autoComplete="off"
                                        value={username} onChange={e => setUsername(e.target.value)} required />
                                </div>
                            )}

                            <PasswordField id="password" placeholder="Password"
                                containerId="pw-container-1" buttonId="pw-button"
                                value={password} onChange={e => setPassword(e.target.value)} />
                            <PasswordField id="confirm-password" placeholder="Confirm Password"
                                containerId="pw-container-2" buttonId="pw-button-confirm"
                                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        </div>

                        <p className="input-error">{error}</p>

                        <div className="admin_action">
                            <button type="submit" id="submit_btn">
                                {mode === 'change' ? 'Update Password' : 'Confirm'}
                            </button>
                            <Link to="/admin/manage" className="btn">Return to Dashboard</Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AdminCreation;
