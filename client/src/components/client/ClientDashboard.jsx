import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ClientDashboard.css';

function ProfileField({ label, value }) {
    return (
        <div className="profile-field">
            <span className="profile-label">{label}</span>
            <span className="profile-value">{value || '—'}</span>
        </div>
    );
}

function ClientDashboard() {
    const navigate = useNavigate();
    const [client, setClient] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/client/me')
            .then(res => {
                if (res.status === 401) { navigate('/client/login', { replace: true }); return null; }
                if (res.status === 403) { navigate('/client/change-password', { replace: true }); return null; }
                return res.json();
            })
            .then(data => { if (data) setClient(data); })
            .catch(() => setError('Could not load profile.'));
    }, [navigate]);

    async function handleLogout() {
        await fetch('/api/client/logout', { method: 'POST' });
        navigate('/client/login', { replace: true });
    }

    if (error) return <p className="profile-error">{error}</p>;
    if (!client) return <p className="profile-loading">Loading…</p>;

    const birthday = client.birthday
        ? new Date(client.birthday).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
        : null;

    return (
        <div className="client-dashboard">
            <header className="client-header">
                <h1>Client Portal</h1>
                <button className="logout-btn" onClick={handleLogout}>Log Out</button>
            </header>

            <main className="client-main">
                <section className="profile-card">
                    <h2>{client.firstName} {client.lastName}</h2>

                    <div className="profile-fields">
                        <ProfileField label="Email" value={client.email} />
                        <ProfileField label="Contact Number" value={client.phoneNumber} />
                        <ProfileField label="Birthday" value={birthday} />
                        <ProfileField label="TIN" value={client.tin} />
                        <ProfileField label="Associated Company" value={client.businessName} />
                        <ProfileField label="Address" value={client.address ? `${client.address}, ${client.city}` : null} />
                    </div>
                </section>

                <section className="deadlines-card">
                    <h2>Upcoming Tax Deadlines</h2>
                    <p className="deadlines-empty">No upcoming deadlines.</p>
                </section>
            </main>
        </div>
    );
}

export default ClientDashboard;
