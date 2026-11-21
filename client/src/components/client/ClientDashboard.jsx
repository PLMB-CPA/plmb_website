import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
    const [client, setClient] = useState(null);
    const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);

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

    // fetch remittances for the deadlines card
    useEffect(() => {
        fetch('/api/client/remittances')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // compare dates regardless of time
                    const nextWeek = new Date(today);
                    nextWeek.setDate(today.getDate() + 7);
                    
                    // only include remittances with due date and have not been completed or remitted
                    // upcoming remittances are based on remittances with their due date within 7 days 
                    // NOTE: may be subject to change if status change
                    const upcoming = data.filter(rem => {
                        if (!rem.dueDate || rem.status === 'Completed' || rem.status === 'Remitted') return false;
                        const due = new Date(rem.dueDate);
                        due.setHours(0, 0, 0, 0);
                        return due >= today && due <= nextWeek;
                    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                    
                    setUpcomingDeadlines(upcoming);
                }
            })
            .catch(err => console.error(err));
    }, []);

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
                        <Link to="/client/remittances" className="sidebar-link" style={{ textDecoration: 'none' }}>
                            <img className="menu-icon" src="/image/peso-icon.png" alt="Remittances" />
                            <span>Remittances</span>
                        </Link>
                        <Link to="/client/inquiries" className="sidebar-link" style={{ textDecoration: 'none' }}>
                            <img className="menu-icon" src="/image/inquiries-icon.png" alt="" />
                            <span>Inquiries</span>
                        </Link>
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
                                {upcomingDeadlines.length > 0 ? (
                                    <div className="upcoming-deadlines-list">
                                        {upcomingDeadlines.map(rem => (
                                            <div key={rem._id} className="deadline-item">
                                                <span className="deadline-type">{rem.taxType}</span>
                                                <span className="deadline-date">
                                                    {new Date(rem.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="deadlines-empty">No upcoming deadlines within 7 days.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ClientDashboard;