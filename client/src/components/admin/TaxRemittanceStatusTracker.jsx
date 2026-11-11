import { useState, useEffect } from 'react';
import AdminHeader from './AdminHeader';
import AddRemittanceModal from './AddRemittanceModal';
import useClickOutside from './useClickOutside';
import './TaxRemittanceStatusTracker.css';
import './AddRemittanceModal.css';
import { REMITTANCE_STATUS } from '../../util/constants';

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCurrency(amount) {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

// Helper to determine if a record is overdue
function checkIsOverdue(dueDate, status) {
    if (!dueDate || status === 'Completed' || status === 'Remitted') return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to midnight to avoid timezone hour shifts
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    return due < today;
}

// Component representing a single row in the remittance list
function RemittanceRow({ remittance, onStatusUpdate }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useClickOutside(() => setMenuOpen(false));

    const statusClass = remittance.status.toLowerCase();
    const isOverdue = checkIsOverdue(remittance.dueDate, remittance.status);

    const clientName = remittance.client ? `${remittance.client.firstName} ${remittance.client.lastName}` : 'Unknown Client';
    const clientEmail = remittance.client ? remittance.client.email : '—';
    const editorName = remittance.lastEditedBy ? remittance.lastEditedBy.username : '—';
    const lastUpdated = remittance.updatedAt 
        ? new Date(remittance.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
        : '—';

    const handleStatusChange = (newStatus) => {
        onStatusUpdate(remittance._id, newStatus);
        setMenuOpen(false);
    };

    return (
        <div className="user-row">
            <div className="user-info">
                <span className="mobile-label">Client: </span>
                <div>
                    <h3>{clientName}</h3>
                    <p>{clientEmail}</p>
                </div>
            </div>

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
                    {/* Apply a red class if the record is past due */}
                    <h3 className={isOverdue ? 'date-overdue' : ''}>
                        {formatDate(remittance.dueDate)} {isOverdue && ' (Overdue)'}
                    </h3>
                    {remittance.lastEditedBy ? (
                        <p>Last edited: {editorName} ({lastUpdated})</p>
                    ) : (
                        <p style={{ visibility: 'hidden' }}>No edits</p>
                    )}
                </div>
            </div>

            <div className="status-badge-container">
                <span className="mobile-label">Status: </span>
                <div className={`status-badge ${statusClass}`}>
                    {remittance.status}
                </div>
            </div>

            {/* Action Dropdown Menu */}
            <div className="dropdown-btn" ref={menuRef}>
                <button type="button" className="more-btn" onClick={() => setMenuOpen(!menuOpen)}>⋮</button>
                <div className={`dropdown-content ${menuOpen ? 'show' : ''}`}>
                    <button type="button" className="status-opt pending" onClick={() => handleStatusChange('Pending')}>Mark Pending</button>
                    <button type="button" className="status-opt processing" onClick={() => handleStatusChange('Processing')}>Mark Processing</button>
                    <button type="button" className="status-opt remitted" onClick={() => handleStatusChange('Remitted')}>Mark Remitted</button>
                    <button type="button" className="status-opt completed" onClick={() => handleStatusChange('Completed')}>Mark Completed</button>
                </div>
            </div>
        </div>
    );
}

// Main container component for the admin tax remittance dashboard
function TaxRemittanceStatusTracker() {
    const [remittances, setRemittances] = useState([]);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('All'); // New date filter state
    
    const [showModal, setShowModal] = useState(false);
    const [clients, setClients] = useState([]);

    useEffect(() => {
        fetch('/api/admin/remittances')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setRemittances(data);
                } else {
                    setError(data.error || 'Failed to load remittances.');
                }
            })
            .catch(() => setError('Failed to reach the server.'));

        fetch('/api/admin/clients')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setClients(data);
            })
            .catch(err => console.error('Failed to load clients', err));
    }, []);

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            const res = await fetch(`/api/admin/remittances/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();

            if (res.ok) {
                setRemittances(prev => prev.map(rem =>
                    rem._id === id ? { 
                        ...rem, 
                        status: data.remittance.status, 
                        lastEditedBy: data.remittance.lastEditedBy,
                        updatedAt: data.remittance.updatedAt || new Date().toISOString()
                    } : rem
                ));
            } else {
                window.alert(data.message || 'Failed to update status');
            }
        } catch (err) {
            console.error('Status update error:', err);
            window.alert('Network error while updating status.');
        }
    };

    const handleRecordAdded = (newRemittance) => {
        if (typeof newRemittance.client === 'string') {
            const fullClientObj = clients.find(c => c._id === newRemittance.client);
            newRemittance.client = fullClientObj || newRemittance.client;
        }
        setRemittances([...remittances, newRemittance]);
        setShowModal(false);
    };

    // Filters based on search, status tab, AND the date dropdown
    const displayedRemittances = remittances.filter(rem => {
        const clientName = rem.client ? `${rem.client.firstName} ${rem.client.lastName}`.toLowerCase() : '';
        const matchesSearch = clientName.includes(search.toLowerCase());
        const matchesStatus = filter === 'All' || rem.status === filter;
        
        let matchesDate = true;
        if (dateFilter !== 'All') {
            const hasDate = !!rem.dueDate;
            const isCleared = rem.status === 'Completed' || rem.status === 'Remitted';
            
            let isOverdue = false;
            let isUpcoming = false;
            
            if (hasDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Normalize to midnight
                const due = new Date(rem.dueDate);
                due.setHours(0, 0, 0, 0);
                
                // Only count as overdue/upcoming if the status isn't already cleared
                isOverdue = !isCleared && (due < today);
                isUpcoming = !isCleared && (due >= today);
            }

            if (dateFilter === 'Overdue') matchesDate = isOverdue;
            if (dateFilter === 'Upcoming') matchesDate = isUpcoming;
            if (dateFilter === 'No Due Date') matchesDate = !hasDate;
        }

        return matchesSearch && matchesStatus && matchesDate;
    });

    return (
        <div className="remittance-page">
            <AdminHeader title="Admin Dashboard" />

            <div className="dashboard-header">
                <div className="labels">
                    <div className="labels-text">
                        <h1>Tax Remittances</h1>
                        <p>View, filter, and update client tax remittance records.</p>
                    </div>
                </div>
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
                        <div className="manage-search">
                            <img src="/image/search-icon.png" className="search-icon" alt="Search" />
                            <input
                                type="text"
                                placeholder="Search by client name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        
                        {/* New Date Filter Dropdown */}
                        <select 
                            className="date-filter-select"
                            value={dateFilter} 
                            onChange={(e) => setDateFilter(e.target.value)}
                        >
                            <option value="All">All Dates</option>
                            <option value="Overdue">Overdue</option>
                            <option value="Upcoming">Upcoming</option>
                            <option value="No Due Date">No Due Date</option>
                        </select>

                        <button type="button" className="add-btn" onClick={() => setShowModal(true)}>
                            + Add Record
                        </button>
                    </div>
                </div>

                <div className="remittance-list">
                    {!error && displayedRemittances.length > 0 && (
                        <div className="list-header">
                            <div className="header-client">Client Details</div>
                            <div className="header-tax">Tax & Amount</div>
                            <div className="header-date">Due Date</div>
                            <div className="header-status">Status</div>
                            <div className="header-spacer"></div>
                        </div>
                    )}

                    {error && <p className="empty-list">{error}</p>}

                    {!error && displayedRemittances.length === 0 && (
                        <p className="empty-list">No remittance records found matching your criteria.</p>
                    )}

                    {displayedRemittances.map(rem => (
                        <RemittanceRow 
                            key={rem._id} 
                            remittance={rem} 
                            onStatusUpdate={handleStatusUpdate} 
                        />
                    ))}
                </div>
            </div>

            {showModal && (
                <AddRemittanceModal 
                    clients={clients} 
                    onClose={() => setShowModal(false)} 
                    onSuccess={handleRecordAdded} 
                />
            )}
        </div>
    );
}

export default TaxRemittanceStatusTracker;