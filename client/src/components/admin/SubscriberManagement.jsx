import { useState, useEffect } from 'react';
import AdminHeader from './AdminHeader';
import './SubscriberManagement.css';

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function SubscriberRow({ subscriber }) {
    const statusClass = subscriber.isSubscribed ? 'active' : 'inactive';
    const statusText = subscriber.isSubscribed ? 'Subscribed' : 'Unsubscribed';

    return (
        <div className="user-row">
            <div className="user-info">
                <h3>{subscriber.email}</h3>
            </div>
            
            <div className={`status-badge ${statusClass}`}>
                {statusText}
            </div>

            <div className="user-stat">
                <h3>{formatDate(subscriber.subscribedAt)}</h3>
                <p>Date Subscribed</p>
            </div>

            <div className="user-stat">
                <h3>{formatDate(subscriber.unsubscribedAt)}</h3>
                <p>Date Unsubscribed</p>
            </div>
        </div>
    );
}

function SubscriberManagement() {
    const [subscribers, setSubscribers] = useState([]);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // 'all', 'subscribed', 'unsubscribed'

    useEffect(() => {
        fetch('/api/admin/subscribers')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setSubscribers(data);
                } else {
                    setError(data.error || 'Failed to load subscribers.');
                }
            })
            .catch(() => setError('Failed to reach the server.'));
    }, []);

    const displayedSubscribers = subscribers.filter(sub => {
        const matchesSearch = sub.email.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'all' || 
                             (filter === 'subscribed' && sub.isSubscribed) ||
                             (filter === 'unsubscribed' && !sub.isSubscribed);
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="subscribers-page">
            <AdminHeader title="Admin Dashboard" />

            <div className="dashboard-header">
                <div className="labels">
                    <div className="labels-text">
                        <h1>Subscribers</h1>
                        <p>View and filter newsletter subscribers.</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-content">
                <div className="content-header">
                    <div className="filter-tabs">
                        <button 
                            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}>All
                        </button>
                        <button 
                            className={`filter-btn ${filter === 'subscribed' ? 'active' : ''}`}
                            onClick={() => setFilter('subscribed')}>Subscribed
                        </button>
                        <button 
                            className={`filter-btn ${filter === 'unsubscribed' ? 'active' : ''}`}
                            onClick={() => setFilter('unsubscribed')}>Unsubscribed
                        </button>
                    </div>

                    <div className="manage-search">
                        <img src="/image/search-icon.png" className="search-icon" alt="Search" />
                        <input 
                            type="text" 
                            id="manage-search" 
                            placeholder="Search by email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)} 
                        />
                    </div>
                </div>

                <div className="subscriber-list">
                    {error && <p className="empty-list">{error}</p>}
                    {!error && displayedSubscribers.length === 0 && (
                        <p className="empty-list">No subscribers found matching your criteria.</p>
                    )}
                    {displayedSubscribers.map(sub => (
                        <SubscriberRow key={sub._id || sub.email} subscriber={sub} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default SubscriberManagement;