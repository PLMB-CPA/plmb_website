import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import useClickOutside from './useClickOutside';
import './AdminNewsletterList.css';

// Replaces src/views/admin_newsletter.html + public/js/admin_newsletter.js

function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return 'N/A';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Bodies are stored as HTML from the editor, so take the words out before
// trimming: slicing the markup would leave a half-written tag on screen.
function toPlainText(html) {
    if (!html) return '';
    // Closing block tags imply a space, otherwise words from separate paragraphs run together
    const spaced = html.replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote)>|<br\s*\/?>/gi, ' ');
    const parsed = new DOMParser().parseFromString(spaced, 'text/html');
    return (parsed.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function preview(content) {
    const text = toPlainText(content);
    return text.length > 120 ? text.slice(0, 120) + '...' : text;
}

function matchesSearch(news, term) {
    if (!term) return true;
    return ((news.title || '') + ' ' + toPlainText(news.content)).toLowerCase().includes(term);
}

// Shared left side of both row types
function RowInfo({ news, dateLabel }) {
    return (
        <>
            <div className="newsletter-info">
                <h3>{news.title}</h3>
                <p>{preview(news.content)}</p>
            </div>
            <div className="user-stat">
                <h3>{news.author || 'N/A'}</h3>
                <p>Author</p>
            </div>
            <div className="user-stat">
                <h3>{formatDate(news.date)}</h3>
                <p>{dateLabel}</p>
            </div>
        </>
    );
}

function PendingRow({ news, onApprove, onDelete }) {
    return (
        <div className="newsletter-row">
            <RowInfo news={news} dateLabel="Date Created" />
            <div className="review-actions">
                <button type="button" className="action-circle approve" title="Publish" onClick={() => onApprove(news._id)}>
                    <i className="fa-solid fa-check"></i>
                </button>
                <button type="button" className="action-circle reject" title="Delete" onClick={() => onDelete(news._id)}>
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>
        </div>
    );
}

function PublishedRow({ news, onUnpublish, onDelete }) {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useClickOutside(() => setMenuOpen(false));

    function pick(action) {
        setMenuOpen(false);
        action();
    }

    return (
        <div className="newsletter-row">
            <RowInfo news={news} dateLabel="Date Published" />
            <div className="dropdown-btn" ref={menuRef}>
                <button type="button" className="more-btn" onClick={() => setMenuOpen(!menuOpen)}>&#8942;</button>
                <div className={`dropdown-content ${menuOpen ? 'show' : ''}`}>
                    <button type="button" onClick={() => pick(() => navigate(`/admin/newsletters/${news._id}/edit`))}>Edit</button>
                    <button type="button" onClick={() => pick(() => onUnpublish(news._id))}>Unpublish</button>
                    <button type="button" onClick={() => pick(() => onDelete(news._id))}>Delete</button>
                </div>
            </div>
        </div>
    );
}

function AdminNewsletterList() {
    const navigate = useNavigate();
    const [newsletters, setNewsletters] = useState([]);
    const [loadError, setLoadError] = useState('');
    const [pendingSearch, setPendingSearch] = useState('');
    const [publishedSearch, setPublishedSearch] = useState('');

    const fetchNewsletters = useCallback(() => {
        fetch('/api/announcements/all')
            .then(res => res.json())
            .then(data => {
                setNewsletters(data.newsletters || []);
                setLoadError('');
            })
            .catch(() => setLoadError('Could not reach the server.'));
    }, []);

    useEffect(() => { fetchNewsletters(); }, [fetchNewsletters]);

    // Every action: send the request, show any error, otherwise reload the lists
    async function act(request, failMessage) {
        try {
            const res = await request();
            const data = await res.json();
            if (data.error) window.alert(data.error);
            else fetchNewsletters();
        } catch {
            window.alert(failMessage);
        }
    }

    function patch(id, body) {
        return fetch(`/api/announcements/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    }

    const approve = id => act(() => patch(id, { isPublished: true, date: new Date().toISOString() }), 'Failed to publish newsletter.');
    const unpublish = id => act(() => patch(id, { isPublished: false }), 'Failed to unpublish newsletter.');
    const remove = id => {
        if (!window.confirm('Are you sure you want to delete this newsletter?')) return;
        act(() => fetch(`/api/announcements/${id}`, { method: 'DELETE' }), 'Failed to delete newsletter.');
    };

    const pending = newsletters.filter(n => !n.isPublished);
    const published = newsletters.filter(n => n.isPublished);
    const pendingShown = pending.filter(n => matchesSearch(n, pendingSearch.trim().toLowerCase()));
    const publishedShown = published.filter(n => matchesSearch(n, publishedSearch.trim().toLowerCase()));

    return (
        <div className="admin-newsletters-page">
            <AdminHeader />

            <div className="dashboard-header">
                <div className="labels">
                    <div className="labels-text">
                        <h1>Newsletters</h1>
                        <p>Check the currently published and pending newsletters.</p>
                    </div>
                </div>

                <div className="approve">
                    <button type="button" className="new-newsletter-btn" onClick={() => navigate('/admin/newsletters/new')}>
                        <i className="fa-solid fa-plus"></i>
                        <span>New Newsletter</span>
                    </button>
                </div>
            </div>

            <div className="dashboard-content">
                <div className="content-header">
                    <h1>Pending</h1>
                    <div className="manage-search">
                        <img src="/image/search-icon.png" className="search-icon" alt="" />
                        <input type="text" placeholder="Search..."
                            value={pendingSearch} onChange={e => setPendingSearch(e.target.value)} />
                    </div>
                </div>

                <div className="newsletter-list">
                    {loadError && <p className="empty-list">{loadError}</p>}
                    {!loadError && pending.length === 0 && <p className="empty-list">No pending newsletters.</p>}
                    {pendingShown.map(n => (
                        <PendingRow key={n._id} news={n} onApprove={approve} onDelete={remove} />
                    ))}
                </div>

                <div className="published-section">
                    <div className="content-header">
                        <h1>Published Newsletters</h1>
                        <div className="manage-search">
                            <img src="/image/search-icon.png" className="search-icon" alt="" />
                            <input type="text" placeholder="Search..."
                                value={publishedSearch} onChange={e => setPublishedSearch(e.target.value)} />
                        </div>
                    </div>

                    <div className="newsletter-list">
                        {!loadError && published.length === 0 && <p className="empty-list">No published newsletters yet.</p>}
                        {publishedShown.map(n => (
                            <PublishedRow key={n._id} news={n} onUnpublish={unpublish} onDelete={remove} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminNewsletterList;
