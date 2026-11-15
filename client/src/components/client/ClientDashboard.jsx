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
    const [error, setError] = useState('');

    // TEMP: mock data for UI preview — delete lines 18-28 and uncomment line 30 when done
    const [client, setClient] = useState({
        firstName: 'Juan',
        lastName: 'dela Cruz',
        email: 'juan@example.com',
        phoneNumber: '09171234567',
        birthday: '1990-05-15',
        tin: '123-456-789',
        businessName: 'Sample Corp',
        address: '123 Main St',
        city: 'Manila',
    });
    // const [client, setClient] = useState(null);

    // TEMP: comment this back in when done previewing
    // useEffect(() => {
    //     fetch('/api/client/me')
    //         .then(res => {
    //             if (res.status === 401) { navigate('/client/login', { replace: true }); return null; }
    //             if (res.status === 403) { navigate('/client/change-password', { replace: true }); return null; }
    //             return res.json();
    //         })
    //         .then(data => { if (data) setClient(data); })
    //         .catch(() => setError('Could not load profile.'));
    // }, [navigate]);

    async function handleLogout() {
        await fetch('/api/client/logout', { method: 'POST' });
        navigate('/client/login', { replace: true });
    }

    if (error) return <p className="state-msg">{error}</p>;
    if (!client) return <p className="state-msg">Loading…</p>;

    const birthday = client.birthday
        ? new Date(client.birthday).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
        : null;

    return (
        <div className="client-shell">
            <div className="bg-container">
                <aside className="sidebar">
                    <div className="sidebar-brand">
                        <img src="/image/logo.png" alt="Logo" />
                        <h1>PLMB</h1>
                    </div>

                    <nav className="sidebar-nav">
                        <span className="sidebar-link active">
                            <img className="menu-icon" src="/image/menu.png" alt="" />
                            <span>Dashboard</span>
                        </span>
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
                        <h1>Dashboard</h1>

                        <div className="cards-grid">
                            <div className="card">
                                <h2>Profile</h2>
                                <div className="profile-fields">
                                    <ProfileField label="Email" value={client.email} />
                                    <ProfileField label="Contact Number" value={client.phoneNumber} />
                                    <ProfileField label="Birthday" value={birthday} />
                                    <ProfileField label="TIN" value={client.tin} />
                                    <ProfileField label="Associated Company" value={client.businessName} />
                                    <ProfileField label="Address" value={client.address ? `${client.address}, ${client.city}` : null} />
                                </div>
                            </div>

                            <div className="card">
                                <h2>Upcoming Tax Deadlines</h2>
                                <p className="deadlines-empty">No upcoming deadlines.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ClientDashboard;
