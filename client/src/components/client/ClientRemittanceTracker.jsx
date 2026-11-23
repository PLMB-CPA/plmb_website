import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './ClientDashboard.css';
import './ClientRemittanceTracker.css';
import { REMITTANCE_STATUS, TAX_TYPES, STATUS_COLORS } from '../../util/constants';

function formatDate(dateStr) {
    if (!dateStr) return 'Not provided';
    const d = new Date(dateStr);
    if (isNaN(d)) return 'Not provided';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

function checkIsOverdue(dueDate, status) {
    if (!dueDate || status === 'Completed' || status === 'Remitted') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
}

// Read-only row component
function ClientRemittanceRow({ remittance }) {
    const isOverdue = checkIsOverdue(remittance.dueDate, remittance.status);
    const editorName = remittance.lastEditedBy ? remittance.lastEditedBy.username : '—';
    const lastUpdated = remittance.updatedAt 
        ? new Date(remittance.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
        : '—';

    return (
        <div className="user-row">
            <div className="user-stat">
                <span className="mobile-label">Tax & Amount: </span>
                <div>
                    <h3>{remittance.taxType}</h3>
                    <p className="amount-text">{formatCurrency(remittance.amount)}</p>
                </div>
            </div>

            <div className="user-stat">
                <span className="mobile-label">Due Date: </span>
                <div>
                    <h3 className={isOverdue ? 'date-overdue' : ''}>
                        {formatDate(remittance.dueDate)} {isOverdue && ' (Overdue)'}
                    </h3>
                    {!remittance.dueDate && (
                        <p className="incomplete-note">Incomplete record. Please contact the firm for updates.</p>
                    )}
                </div>
            </div>

            <div className="status-badge-container">
                <span className="mobile-label">Status: </span>
                <div 
                    className="status-badge"
                    style={{ 
                        backgroundColor: STATUS_COLORS[remittance.status]?.bg || '#f5f5f5', 
                        color: STATUS_COLORS[remittance.status]?.text || '#333' 
                    }}
                >
                    {remittance.status}
                </div>
            </div>
        </div>
    );
}

function ClientRemittanceTracker() {
    const navigate = useNavigate();
    
    // Auth State
    const [client, setClient] = useState(null);
    const [authError, setAuthError] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);

    // Data State
    const [remittances, setRemittances] = useState([]);
    const [dataError, setDataError] = useState('');
    const [filter, setFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('All');
    const [taxFilter, setTaxFilter] = useState('All');

    // authenticate the user
    useEffect(() => {
        fetch('/api/client/me')
            .then(res => {
                if (res.status === 401) { navigate('/client/login', { replace: true }); return null; }
                if (res.status === 403) { navigate('/client/change-password', { replace: true }); return null; }
                return res.json();
            })
            .then(data => { if (data) setClient(data); })
            .catch(() => setAuthError('Could not load profile.'));
    }, [navigate]);

    // Fetch the client's remittances once authenticated
    useEffect(() => {
        if (client) {
            fetch('/api/client/remittances')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setRemittances(data);
                    } else {
                        setDataError(data.message || 'Failed to load records.');
                    }
                })
                .catch(() => setDataError('Failed to reach the server.'));
        }
    }, [client]);

    async function handleLogout() {
        await fetch('/api/client/logout', { method: 'POST' });
        navigate('/client/login', { replace: true });
    }

    if (authError) return <p className="state-msg">{authError}</p>;
    if (!client) return <p className="state-msg">Loading…</p>;

    // Filter logic
    const displayedRemittances = remittances.filter(rem => {
        const matchesStatus = filter === 'All' || rem.status === filter;
        const matchesTax = taxFilter === 'All' || rem.taxType === taxFilter;

        let matchesDate = true;
        if (dateFilter !== 'All') {
            const hasDate = !!rem.dueDate;
            const isCleared = rem.status === 'Completed' || rem.status === 'Remitted';
            let isOverdue = false;
            let isUpcoming = false;
            
            if (hasDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const due = new Date(rem.dueDate);
                due.setHours(0, 0, 0, 0);
                isOverdue = !isCleared && (due < today);
                isUpcoming = !isCleared && (due >= today);
            }

            if (dateFilter === 'Overdue') matchesDate = isOverdue;
            if (dateFilter === 'Upcoming') matchesDate = isUpcoming;
            if (dateFilter === 'No Due Date') matchesDate = !hasDate;
        }

        return matchesStatus && matchesDate && matchesTax;
    });

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
                            <img className="menu-icon" src="/image/menu.png" alt="Dashboard" />
                            <span>Dashboard</span>
                        </Link>
                        <div className="sidebar-link active">
                            <img className="menu-icon" src="/image/peso-icon.png" alt="Remittances" />
                            <span>Remittances</span>
                        </div>
                        <Link to="/client/change-password" className="sidebar-link change-password-link" style={{ textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                            <img className="menu-icon change-password-icon" src="/image/password-icon.png" alt="" />
                            <span>Change Password</span>
                        </Link>
                    </nav>

                    <button className="sidebar-link logout" onClick={handleLogout}>
                        <img className="menu-icon" src="/image/logout.png" alt="Logout" />
                        <span>Logout</span>
                    </button>
                </aside>

                <div className="main-content">
                    {/* Copied Header Shell */}
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

                    {/* Tracker Content Area */}
                    <div className="page-body remittance-client-page">
                        <div className="labels">
                            <h1>My Tax Remittances</h1>
                            <p>Track the status of your tax payments and upcoming deadlines.</p>
                    </div>

                        <div className="dashboard-content">
                            <div className="content-header">
                                <div className="filter-tabs">
                                    {['All', ...Object.values(REMITTANCE_STATUS)].map(tab => (
                                        <button
                                            key={tab}
                                            className={`filter-btn ${filter === tab ? 'active' : ''}`}
                                            onClick={() => setFilter(tab)}>
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                <div className="header-actions">
                                    <select 
                                        className="filter-select"
                                        value={taxFilter} 
                                        onChange={(e) => setTaxFilter(e.target.value)}
                                    >
                                        <option value="All">All Taxes</option>
                                        {Object.values(TAX_TYPES).map(tax => (
                                            <option key={tax} value={tax}>{tax}</option>
                                        ))}
                                    </select>
                                                        
                                    <select 
                                        className="filter-select"
                                        value={dateFilter} 
                                        onChange={(e) => setDateFilter(e.target.value)}
                                    >
                                        <option value="All">All Dates</option>
                                        <option value="Overdue">Overdue</option>
                                        <option value="Upcoming">Upcoming</option>
                                        <option value="No Due Date">No Due Date</option>
                                    </select>
                                </div>
                            </div>

                            <div className="remittance-list">
                                {!dataError && displayedRemittances.length > 0 && (
                                    <div className="list-header">
                                        <div className="header-tax">Tax & Amount</div>
                                        <div className="header-date">Due Date</div>
                                        <div className="header-status">Status</div>
                                    </div>
                                )}

                                {dataError && <p className="empty-list">{dataError}</p>}
                                {!dataError && displayedRemittances.length === 0 && (
                                    <p className="empty-list">No remittances on record.</p>
                                )}

                                {displayedRemittances.map(rem => (
                                    <ClientRemittanceRow key={rem._id} remittance={rem} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ClientRemittanceTracker;