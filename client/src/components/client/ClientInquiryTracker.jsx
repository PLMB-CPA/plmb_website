import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './ClientDashboard.css';
import './ClientInquiryTracker.css';
// Reused from the admin inquiry page so dates read the same on both sides
// (Philippine time, same format).
import { formatManilaTimestamp } from '../../util/inquiryReply';

// One inquiry card: what the client sent and admin reply if there is one
function InquiryCard({ inquiry }) {
    const submitted = formatManilaTimestamp(inquiry.date);
    const repliedAt = formatManilaTimestamp(inquiry.repliedAt);
    // "Answered" means there is reply text to show. isAnswered alone is not enough:
    // an admin can mark an inquiry answered without writing a reply here.
    const hasReply = Boolean(inquiry.reply);

    return (
        <article className="inquiry-card">
            <div className="inquiry-card-header">
                <div className="inquiry-card-title-block">
                    {inquiry.ticketNumber && (
                        <span className="inquiry-ticket">{inquiry.ticketNumber}</span>
                    )}
                    <h2 className="inquiry-card-title">{inquiry.subject}</h2>
                </div>
                <span className={`inquiry-status ${hasReply ? 'answered' : 'awaiting'}`}>
                    {hasReply ? 'Answered' : 'No reply yet'}
                </span>
            </div>

            {submitted && <p className="inquiry-submitted">Submitted {submitted}</p>}

            <p className="inquiry-message">{inquiry.message}</p>

            {hasReply ? (
                <section className="inquiry-reply" aria-label="Reply from PLMB">
                    <div className="inquiry-reply-meta">
                        <span className="inquiry-reply-badge">Reply from PLMB</span>
                        {repliedAt && <span className="inquiry-reply-time">{repliedAt}</span>}
                    </div>
                    <p className="inquiry-reply-message">{inquiry.reply}</p>
                </section>
            ) : (
                <p className="inquiry-no-reply">
                    We have received your inquiry and have not replied yet.
                </p>
            )}
        </article>
    );
}

function ClientInquiryTracker() {
    const navigate = useNavigate();

    // Auth state
    const [client, setClient] = useState(null);
    const [authError, setAuthError] = useState('');

    // Data state
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dataError, setDataError] = useState('');

    // Confirm who is logged in. 401 = not logged in, 403 = still on a temporary password.
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

    // Load this client's inquiries once we know who they are.
    useEffect(() => {
        if (!client) return;

        fetch('/api/client/inquiries')
            .then(async res => {
                if (res.status === 401) { navigate('/client/login', { replace: true }); return null; }
                if (res.status === 403) { navigate('/client/change-password', { replace: true }); return null; }

                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    setDataError('Could not load your inquiries. Please try again later.');
                    return null;
                }
                return data;
            })
            .then(data => {
                if (data) setInquiries(Array.isArray(data.inquiries) ? data.inquiries : []);
            })
            .catch(() => setDataError('Could not reach the server. Please try again later.'))
            .finally(() => setLoading(false));
    }, [client, navigate]);

    async function handleLogout() {
        await fetch('/api/client/logout', { method: 'POST' });
        navigate('/client/login', { replace: true });
    }

    if (authError) return <p className="state-msg">{authError}</p>;
    if (!client) return <p className="state-msg">Loading…</p>;

    return (
        <div className="client-shell">
            <div className="bg-container">

                <aside className="sidebar">
                    <div className="sidebar-brand">
                        <img src="/image/logo.png" alt="Logo" />
                        <h1>PLMB</h1>
                    </div>

                    <nav className="sidebar-nav">
                        <Link to="/client" className="sidebar-link" style={{ textDecoration: 'none' }}>
                            <img className="menu-icon" src="/image/menu.png" alt="" />
                            <span>Dashboard</span>
                        </Link>
                        <Link to="/client/remittances" className="sidebar-link" style={{ textDecoration: 'none' }}>
                            <img className="menu-icon" src="/image/peso-icon.png" alt="" />
                            <span>Remittances</span>
                        </Link>
                        {/* Inquiries is the active page */}
                        <div className="sidebar-link active">
                            <img className="menu-icon" src="/image/inquiries-icon.png" alt="" />
                            <span>Inquiries</span>
                        </div>
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

                    <div className="page-body inquiries-client-page">
                        <div className="labels">
                            <h1>My Inquiries</h1>
                            <p>See the inquiries you sent us and our replies.</p>
                        </div>

                        {loading && <p className="inquiries-empty">Loading your inquiries…</p>}

                        {!loading && dataError && (
                            <p className="inquiries-empty" role="alert">{dataError}</p>
                        )}

                        {!loading && !dataError && inquiries.length === 0 && (
                            <p className="inquiries-empty">No inquiries on record.</p>
                        )}

                        {!loading && !dataError && inquiries.length > 0 && (
                            <div className="inquiry-list">
                                {inquiries.map(inquiry => (
                                    <InquiryCard key={inquiry._id} inquiry={inquiry} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ClientInquiryTracker;