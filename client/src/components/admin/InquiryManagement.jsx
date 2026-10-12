import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import useClickOutside from './useClickOutside';
import './InquiryManagement.css';

// Replaces src/views/admin_inquiry_management.html + public/js/admin_inquiry_management.js

const DEFAULT_FILTERS = { answered: 'all', read: 'all', archive: 'all' };

// The three radio groups in the Filter menu: [state key, heading, options]
const FILTER_GROUPS = [
    ['answered', 'Answered', [['all', 'All'], ['answered', 'Answered'], ['unanswered', 'Unanswered']]],
    ['read', 'Read status', [['all', 'All'], ['read', 'Read'], ['unread', 'Unread']]],
    ['archive', 'Archived', [['all', 'All'], ['archived', 'Archived only'], ['unarchived', 'Not archived']]],
];

function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return 'N/A';
    return d.toISOString().slice(0, 10);
}

function matchesFilters(inq, filters, search) {
    if (filters.answered === 'answered' && !inq.isAnswered) return false;
    if (filters.answered === 'unanswered' && inq.isAnswered) return false;
    if (filters.read === 'read' && !inq.isRead) return false;
    if (filters.read === 'unread' && inq.isRead) return false;
    if (filters.archive === 'archived' && !inq.isArchived) return false;
    if (filters.archive === 'unarchived' && inq.isArchived) return false;
    if (search && !(inq.ticketNumber || '').toLowerCase().includes(search)) return false;
    return true;
}

function InquiryManagement() {
    const navigate = useNavigate();
    const [inquiries, setInquiries] = useState([]);
    const [loadError, setLoadError] = useState('');
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [filterOpen, setFilterOpen] = useState(false);
    const filterRef = useClickOutside(() => setFilterOpen(false));

    useEffect(() => {
        fetch('/api/inquiries')
            .then(res => res.json())
            .then(data => setInquiries(data.inquiries || []))
            .catch(() => setLoadError('Could not reach the server.'));
    }, []);

    async function handleDelete(event, id) {
        event.stopPropagation(); // don't also open the inquiry
        if (!window.confirm('Delete this inquiry? This cannot be undone.')) return;

        try {
            const res = await fetch(`/api/inquiries/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.error) {
                window.alert(data.error);
                return;
            }
            setInquiries(inquiries.filter(inq => inq._id !== id));
        } catch {
            window.alert('Could not reach the server.');
        }
    }

    function resetFilters() {
        setFilters(DEFAULT_FILTERS);
        setSearch('');
    }

    const term = search.trim().toLowerCase();
    const visible = inquiries.filter(inq => matchesFilters(inq, filters, term));

    return (
        <div className="inquiries-page">
            <AdminHeader />

            <div className="dashboard-header">
                <div className="labels">
                    <div className="labels-text">
                        <h1>Inquiries</h1>
                        <p>Check and review user inquiries.</p>
                    </div>
                </div>

                <div className="header-actions">
                    <div className="search-bar">
                        <i className="fa-solid fa-magnifying-glass"></i>
                        <input type="text" placeholder="Search by ticket number..."
                            value={search} onChange={e => setSearch(e.target.value)} />
                    </div>

                    <div className="filter-dropdown" ref={filterRef}>
                        <button className="filter-btn" type="button" onClick={() => setFilterOpen(!filterOpen)}>
                            <i className="fa-solid fa-filter"></i> Filter <i className="fa-solid fa-chevron-down"></i>
                        </button>

                        <div className={`filter-dropdown-content ${filterOpen ? 'show' : ''}`}>
                            {FILTER_GROUPS.map(([key, heading, options]) => (
                                <Fragment key={key}>
                                    <p className="filter-group-title">{heading}</p>
                                    {options.map(([value, label]) => (
                                        <label className="filter-option" key={value}>
                                            <input type="radio" name={`${key}Filter`} value={value}
                                                checked={filters[key] === value}
                                                onChange={() => setFilters({ ...filters, [key]: value })} />
                                            {' '}{label}
                                        </label>
                                    ))}
                                </Fragment>
                            ))}

                            <button type="button" className="reset-filters-btn" onClick={resetFilters}>
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-content">
                <div className="published-section">
                    <div className="content-header"></div>
                    <div className="inquiry-list">
                        {loadError && <p className="no-inquiries">{loadError}</p>}
                        {!loadError && visible.length === 0 && <p className="no-inquiries">No inquiries found.</p>}

                        {visible.map(inq => (
                            <div key={inq._id}
                                className={`inquiry-container${!inq.isRead ? ' unread' : ''}${inq.isArchived ? ' archived' : ''}`}
                                onClick={() => navigate(`/admin/inquiries/${inq._id}`)}>
                                <p className="inquiry-ticket-id">{inq.ticketNumber}</p>
                                <div className="inquiry-labels">
                                    <p className="inquiry-category-bubble">{inq.category}</p>
                                    <p className="inquiry-subcat-bubble">{inq.industrySector}</p>
                                </div>
                                <div className="divider" id="divider-left"></div>
                                <div className="text-content">
                                    <div className="inquiry-top-text">
                                        <p className="inquiry-business">{inq.businessName}</p>
                                        <p className="dash-divider">-</p>
                                        <p className="inquiry-title">{inq.subject}</p>
                                    </div>
                                    <div className="inquiry-bottom-text">
                                        <p className="inquiry-content">{inq.message}</p>
                                    </div>
                                </div>
                                <div className="divider"></div>
                                <div className="inquiry-right-side">
                                    <p className="inquiry-date">{formatDate(inq.date)}</p>
                                    <p className={`inquiry-status ${inq.isAnswered ? 'resolved' : 'unresolved'}`}>
                                        {inq.isAnswered ? 'Resolved' : 'Unresolved'}
                                    </p>
                                    <div className="inquiry-buttons">
                                        <button type="button" className="delete-btn" aria-label="Delete inquiry"
                                            onClick={e => handleDelete(e, inq._id)}>
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InquiryManagement;
