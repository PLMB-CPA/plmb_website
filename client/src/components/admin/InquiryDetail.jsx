import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import './InquiryDetail.css';

// Replaces src/views/inquiry-full.html + public/js/inquiry-full.js
// URL: /admin/inquiries/:id   (old: /inquiry-full.html?id=...)

function InquiryDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [inquiry, setInquiry] = useState(null);
    const [error, setError] = useState('');
    const [reply, setReply] = useState('');
    const [replyError, setReplyError] = useState('');
    const [replySuccess, setReplySuccess] = useState('');
    const [sending, setSending] = useState(false);

    // PATCH a few fields, then show what the server saved
    const updateInquiry = useCallback(async (payload) => {
        try {
            const res = await fetch(`/api/inquiries/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (res.ok) setInquiry(data.inquiry);
            else window.alert(data.error || 'Could not update inquiry.');
        } catch {
            window.alert('Could not reach the server.');
        }
    }, [id]);

    useEffect(() => {
        fetch(`/api/inquiries/${id}`)
            .then(res => res.json().then(data => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
                if (!ok) {
                    setError(data.error || 'Could not load inquiry.');
                    return;
                }
                setInquiry(data.inquiry);
                // Opening an unread inquiry marks it read, same as before
                if (!data.inquiry.isRead) updateInquiry({ isRead: true });
            })
            .catch(() => setError('Could not reach the server.'));
    }, [id, updateInquiry]);


    // F03 - Handle inquiry replies with input validation
    async function handleReply(event) {
        event.preventDefault();

        setReplyError('');
        setReplySuccess('');

        const trimmedReply = reply.trim();
        if (!trimmedReply) {
            setReplyError('Please enter a reply before sending.');
            return;
        }
        if (trimmedReply.length > 10000) {
            setReplyError('Reply must be 10,000 characters or fewer.');
            return;
        }

        setSending(true);

        try {
            const res = await fetch(`/api/inquiries/${id}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reply: trimmedReply }),
            });

            const data = await res.json();

            if (!res.ok) {
                setReplyError(data.error || 'Could not send the reply. Please try again.');
                return;
            }
            setInquiry(data.inquiry);
            setReply('');
            setReplySuccess('Reply sent successfully.');

        } catch {
            setReplyError('Could not reach the server. Please try again.');
        } finally {
            setSending(false);
        }
    }


    // F03 - Format the recorded response time for display
    function formatResponseTime(minutes) {
        if (minutes == null) {
            return 'Not available';
        }

        if (minutes < 1) {
            return 'Under 1 minute';
        }

        if (minutes < 60) {
            return `${minutes} minute${minutes === 1 ? '' : 's'}`;
        }

        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        return `${hours} hour${hours === 1 ? '' : 's'}${remainingMinutes ? ` ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}` : ''}`;
    }


    async function handleDelete() {
        if (!window.confirm('Delete this inquiry? This cannot be undone.')) return;
        try {
            const res = await fetch(`/api/inquiries/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) navigate('/admin/inquiries');
            else window.alert(data.error || 'Could not delete inquiry.');
        } catch {
            window.alert('Could not reach the server.');
        }
    }

    return (
        <div className="inquiry-detail-page">
            <AdminHeader />

            <div className="content-body">
                <Link to="/admin/inquiries" className="back-link">&larr; Back to Inquiries</Link>

                {!inquiry ? (
                    <div className="inquiry-message">
                        <p className="content">{error || 'Loading...'}</p>
                    </div>
                ) : (
                    <div className="inquiry-message">
                        <div className="message-header">
                            <h1 className="title">{inquiry.subject}</h1>
                            <div className="status-badges">
                                <span className={`status-badge ${inquiry.isRead ? 'read' : 'unread'}`}>
                                    {inquiry.isRead ? 'Read' : 'Unread'}
                                </span>
                                <span className={`status-badge ${inquiry.isAnswered ? 'answered' : 'unanswered'}`}>
                                    {inquiry.isAnswered ? 'Answered' : 'Unanswered'}
                                </span>
                                {inquiry.isArchived && <span className="status-badge archived">Archived</span>}
                            </div>
                        </div>

                        <div className="tags">
                            <p className="category">{inquiry.category}</p>
                            <p className="industry">{inquiry.industrySector}</p>
                        </div>

                        <p className="content">{inquiry.message}</p>

                        <div className="contact-container">
                            <p>Contact:</p>
                            <p className="contact">{inquiry.email}</p>
                        </div>
                        {inquiry.repliedAt && (
                            <div className="reply-details">

                                <h3>Reply Information</h3>

                                <p>
                                    <strong>Status:</strong> Answered
                                </p>

                                <p>
                                    <strong>Replied At:</strong>{' '}
                                    {new Date(inquiry.repliedAt).toLocaleString(
                                        'en-PH',
                                        { timeZone: 'Asia/Manila' }
                                    )}
                                </p>

                                <p>
                                    <strong>Response Time:</strong>{' '}
                                    {formatResponseTime(inquiry.responseTimeMinutes)}
                                </p>

                                <p>
                                    <strong>Reply:</strong> {inquiry.reply}
                                </p>

                            </div>
                        )}
                        {!inquiry.repliedAt && (
                            <form
                                className="inquiry-reply-form"
                                onSubmit={handleReply}
                                noValidate
                            >

                                <label htmlFor="reply-message">
                                    Reply to Client
                                </label>

                                <textarea
                                    id="reply-message"
                                    value={reply}
                                    onChange={(event) => setReply(event.target.value)}
                                    placeholder="Write your reply here..."
                                    rows={5}
                                    aria-describedby={
                                        replyError ? 'reply-error' : undefined
                                    }
                                />

                                {replyError && (
                                    <p
                                        id="reply-error"
                                        className="reply-error"
                                        role="alert"
                                    >
                                        {replyError}
                                    </p>
                                )}

                                <button type="submit" disabled={sending}>
                                    {sending ? 'Sending...' : 'Send Reply'}
                                </button>

                            </form>
                        )}
                        {replySuccess && (
                            <p role="status" className="reply-success">
                                {replySuccess}
                            </p>
                        )}
                        <div className="action-bar">
                            <div className="status-actions">
                                <button type="button" className="action-btn read-btn"
                                    onClick={() => updateInquiry({ isRead: !inquiry.isRead })}>
                                    {inquiry.isRead ? 'Read' : 'Mark as Read'}
                                </button>
                                <button type="button" className="action-btn answered-btn"
                                    onClick={() => updateInquiry({ isAnswered: !inquiry.isAnswered })}>
                                    {inquiry.isAnswered ? 'Answered' : 'Mark as Answered'}
                                </button>
                                <button type="button" className="action-btn archive-btn"
                                    onClick={() => updateInquiry({ isArchived: !inquiry.isArchived })}>
                                    {inquiry.isArchived ? 'Unarchive' : 'Archive'}
                                </button>
                            </div>
                            <button type="button" className="delete-button" onClick={handleDelete}>
                                Delete Inquiry
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default InquiryDetail;