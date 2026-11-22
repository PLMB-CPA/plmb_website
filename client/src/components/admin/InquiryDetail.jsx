import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import {
    MAX_REPLY_LENGTH,
    formatResponseTime,
    formatManilaTimestamp,
    supportsConversationHistory,
    getReplyHistory,
    didReplyEmailFail,
    getFriendlyErrorMessage,
} from '../../util/inquiryReply';
import './InquiryDetail.css';

// Replaces src/views/inquiry-full.html + public/js/inquiry-full.js
// URL: /admin/inquiries/:id   (old: /inquiry-full.html?id=...)

async function parseJsonSafely(res) {
    try {
        return await res.json();
    } catch {
        return {};
    }
}

function InquiryDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [inquiry, setInquiry] = useState(null);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const [reply, setReply] = useState('');
    const [replyError, setReplyError] = useState('');
    const [replySuccess, setReplySuccess] = useState('');
    const [replyWarning, setReplyWarning] = useState('');
    const [sending, setSending] = useState(false);

    // PATCH a few fields, then show what the server saved
    const updateInquiry = useCallback(async (payload) => {
        setActionError('');
        try {
            const res = await fetch(`/api/inquiries/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.status === 401) {
                navigate('/admin/login', { replace: true });
                return;
            }

            if (res.status === 403) {
                setActionError('You are not authorized to update this inquiry.');
                return;
            }

            const data = await parseJsonSafely(res);
            if (res.ok && data.inquiry) {
                setInquiry((prev) => (prev ? { ...prev, ...data.inquiry } : data.inquiry));
            } else {
                setActionError(getFriendlyErrorMessage(data.error, 'Could not update inquiry.'));
            }
        } catch {
            setActionError('Could not reach the server.');
        }
    }, [id, navigate]);

    useEffect(() => {
        let cancelled = false;

        async function loadInquiry() {
            setError('');
            setActionError('');
            setReplyError('');
            setReplySuccess('');
            setReplyWarning('');

            try {
                const res = await fetch(`/api/inquiries/${id}`);
                if (cancelled) return;

                if (res.status === 401) {
                    navigate('/admin/login', { replace: true });
                    return;
                }

                if (res.status === 403) {
                    setInquiry(null);
                    setError('You are not authorized to view this inquiry.');
                    return;
                }

                const data = await parseJsonSafely(res);
                if (cancelled) return;

                if (!res.ok || !data.inquiry) {
                    setInquiry(null);
                    setError(getFriendlyErrorMessage(data.error, 'Could not load inquiry.'));
                    return;
                }

                setInquiry(data.inquiry);
                // Opening an unread inquiry marks it read, same as before
                if (!data.inquiry.isRead) {
                    updateInquiry({ isRead: true });
                }
            } catch {
                if (!cancelled) {
                    setError('Could not reach the server.');
                }
            }
        }

        loadInquiry();

        return () => {
            cancelled = true;
        };
    }, [id, navigate, updateInquiry]);

    // F03 / F10b - Handle inquiry replies with validation, conversation history, and email-failure warnings
    async function handleReply(event) {
        event.preventDefault();

        setReplyError('');
        setReplySuccess('');
        setReplyWarning('');

        const trimmedReply = reply.trim();
        if (!trimmedReply) {
            setReplyError('Please enter a reply before sending.');
            return;
        }
        if (trimmedReply.length > MAX_REPLY_LENGTH) {
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

            if (res.status === 401) {
                navigate('/admin/login', { replace: true });
                return;
            }

            if (res.status === 403) {
                setReplyError('You are not authorized to reply to this inquiry.');
                return;
            }

            const data = await parseJsonSafely(res);

            if (!res.ok) {
                setReplyError(
                    getFriendlyErrorMessage(data.error, 'Could not send the reply. Please try again.')
                );
                return;
            }

            const nextInquiry = data.inquiry
                ? data.inquiry
                : {
                    ...inquiry,
                    ...(Array.isArray(data.conversation) ? { conversation: data.conversation } : {}),
                    ...(Array.isArray(data.replies) ? { replies: data.replies } : {}),
                    ...(data.emailNotificationFailed !== undefined
                        ? { emailNotificationFailed: data.emailNotificationFailed }
                        : {}),
                    isAnswered: true,
                };

            setInquiry(nextInquiry);
            setReply('');

            const updatedHistory = getReplyHistory(nextInquiry);
            if (didReplyEmailFail(data, updatedHistory)) {
                setReplyWarning(
                    getFriendlyErrorMessage(
                        data.message,
                        'Reply saved, but the email could not be sent.'
                    )
                );
            } else {
                setReplySuccess(
                    getFriendlyErrorMessage(data.message, 'Reply sent successfully.')
                );
            }
        } catch {
            setReplyError('Could not reach the server. Please try again.');
        } finally {
            setSending(false);
        }
    }

    async function handleDelete() {
        setActionError('');
        if (!window.confirm('Delete this inquiry? This cannot be undone.')) return;

        try {
            const res = await fetch(`/api/inquiries/${id}`, { method: 'DELETE' });

            if (res.status === 401) {
                navigate('/admin/login', { replace: true });
                return;
            }

            if (res.status === 403) {
                setActionError('You are not authorized to delete this inquiry.');
                return;
            }

            const data = await parseJsonSafely(res);
            if (res.ok) {
                navigate('/admin/inquiries');
            } else {
                setActionError(getFriendlyErrorMessage(data.error, 'Could not delete inquiry.'));
            }
        } catch {
            setActionError('Could not reach the server.');
        }
    }

    const hasConversationMode = supportsConversationHistory(inquiry);
    const replyHistory = getReplyHistory(inquiry);
    const firstReplyTimestamp = inquiry?.repliedAt || replyHistory[0]?.sentAt || null;
    const formattedFirstReply = formatManilaTimestamp(firstReplyTimestamp);
    const formattedSubmittedDate = formatManilaTimestamp(inquiry?.date);
    const senderName = [inquiry?.firstName, inquiry?.lastName].filter(Boolean).join(' ').trim();
    const showReplySection = Boolean(
        hasConversationMode || inquiry?.repliedAt || replyHistory.length > 0
    );
    const showReplyForm = Boolean(inquiry && (hasConversationMode || !inquiry.repliedAt));
    const hasEntryLevelEmailFailure = replyHistory.some((entry) => entry.emailFailed);
    const showInquiryLevelEmailWarning = Boolean(
        inquiry?.emailNotificationFailed && !hasEntryLevelEmailFailure
    );
    const trimmedLength = reply.trim().length;
    const isOverLimit = trimmedLength > MAX_REPLY_LENGTH;
    const replyDescribedBy = [replyError ? 'reply-error' : null, 'reply-char-count']
        .filter(Boolean)
        .join(' ');

    return (
        <div className="inquiry-detail-page">
            <AdminHeader />

            <div className="content-body">
                <Link to="/admin/inquiries" className="back-link">&larr; Back to Inquiries</Link>

                {!inquiry ? (
                    <div className="inquiry-message">
                        <p className="content" role={error ? 'alert' : undefined}>
                            {error || 'Loading...'}
                        </p>
                    </div>
                ) : (
                    <div className="inquiry-message">
                        <div className="message-header">
                            <div className="title-block">
                                {inquiry.ticketNumber && (
                                    <span className="ticket-number">{inquiry.ticketNumber}</span>
                                )}
                                <h1 className="title">{inquiry.subject}</h1>
                            </div>
                            <div className="status-badges">
                                <span className={`status-badge ${inquiry.isRead ? 'read' : 'unread'}`}>
                                    {inquiry.isRead ? 'Read' : 'Unread'}
                                </span>
                                <span className={`status-badge ${inquiry.isAnswered ? 'answered' : 'unanswered'}`}>
                                    {inquiry.isAnswered ? 'Answered' : 'Unanswered'}
                                </span>
                                {inquiry.isOverdue && (
                                    <span className="status-badge overdue">Overdue</span>
                                )}
                                {inquiry.isArchived && (
                                    <span className="status-badge archived">Archived</span>
                                )}
                            </div>
                        </div>

                        <div className="tags">
                            <p className="category">{inquiry.category}</p>
                            <p className="industry">{inquiry.industrySector}</p>
                        </div>

                        <p className="content">{inquiry.message}</p>

                        <div className="contact-container">
                            <div className="contact-item">
                                <p>Contact:</p>
                                <p className="contact">{inquiry.email}</p>
                            </div>
                            {senderName && (
                                <div className="contact-item">
                                    <p>From:</p>
                                    <p className="contact">{senderName}</p>
                                </div>
                            )}
                            {inquiry.businessName && (
                                <div className="contact-item">
                                    <p>Business:</p>
                                    <p className="contact">{inquiry.businessName}</p>
                                </div>
                            )}
                            {inquiry.number && (
                                <div className="contact-item">
                                    <p>Phone:</p>
                                    <p className="contact">{inquiry.number}</p>
                                </div>
                            )}
                            {formattedSubmittedDate && (
                                <div className="contact-item">
                                    <p>Submitted:</p>
                                    <p className="contact">{formattedSubmittedDate}</p>
                                </div>
                            )}
                        </div>

                        {showReplySection && (
                            <section className="reply-details" aria-label="Reply History">
                                <div className="reply-history-header">
                                    <h3>Reply History</h3>
                                    {replyHistory.length > 0 && (
                                        <span className="reply-count-badge">
                                            {replyHistory.length}{' '}
                                            {replyHistory.length === 1 ? 'reply' : 'replies'}
                                        </span>
                                    )}
                                </div>

                                {(inquiry.repliedAt || replyHistory.length > 0) && (
                                    <div className="reply-summary-meta">
                                        <p>
                                            <strong>Status:</strong> Answered
                                        </p>
                                        {formattedFirstReply && (
                                            <p>
                                                <strong>Replied At:</strong> {formattedFirstReply}
                                            </p>
                                        )}
                                        <p>
                                            <strong>Response Time:</strong>{' '}
                                            {formatResponseTime(inquiry.responseTimeMinutes)}
                                        </p>
                                    </div>
                                )}

                                {showInquiryLevelEmailWarning && (
                                    <p className="reply-history-warning">
                                        Email notification could not be sent for the latest reply. The reply is saved in the application.
                                    </p>
                                )}

                                {replyHistory.length === 0 ? (
                                    <p className="reply-history-empty">No replies have been sent yet.</p>
                                ) : (
                                    <ol className="reply-history-list">
                                        {replyHistory.map((entry) => {
                                            const formattedTime = formatManilaTimestamp(entry.sentAt);
                                            return (
                                                <li
                                                    key={entry.id}
                                                    className={`reply-history-item ${entry.sender}`}
                                                >
                                                    <div className="reply-item-meta">
                                                        <span className={`reply-sender-badge ${entry.sender}`}>
                                                            {entry.senderLabel}
                                                        </span>
                                                        {entry.emailFailed && (
                                                            <span className="reply-email-failed-badge">
                                                                Email not sent
                                                            </span>
                                                        )}
                                                        {formattedTime && (
                                                            <time
                                                                className="reply-timestamp"
                                                                dateTime={new Date(entry.sentAt).toISOString()}
                                                            >
                                                                {formattedTime}
                                                            </time>
                                                        )}
                                                    </div>
                                                    <p className="reply-history-message">
                                                        {entry.message}
                                                    </p>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                )}
                            </section>
                        )}

                        {replyWarning && (
                            <p role="alert" className="reply-warning">
                                {replyWarning}
                            </p>
                        )}

                        {replySuccess && (
                            <p role="status" className="reply-success">
                                {replySuccess}
                            </p>
                        )}

                        {showReplyForm && (
                            <form
                                className="inquiry-reply-form"
                                onSubmit={handleReply}
                                noValidate
                            >
                                <label htmlFor="reply-message">
                                    Reply to Client
                                </label>

                                <p className="reply-recipient-hint">
                                    Replying to <strong>{inquiry.email}</strong>
                                    {inquiry.ticketNumber ? ` · ${inquiry.ticketNumber}` : ''}
                                </p>

                                <textarea
                                    id="reply-message"
                                    value={reply}
                                    onChange={(event) => {
                                        setReply(event.target.value);
                                        if (replyError) setReplyError('');
                                    }}
                                    placeholder="Write your reply here..."
                                    rows={5}
                                    disabled={sending}
                                    aria-invalid={Boolean(replyError)}
                                    aria-describedby={replyDescribedBy}
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

                                <div className="reply-form-footer">
                                    <span
                                        id="reply-char-count"
                                        className={`reply-char-count${isOverLimit ? ' over-limit' : ''}`}
                                    >
                                        {trimmedLength.toLocaleString()} / {MAX_REPLY_LENGTH.toLocaleString()} characters
                                    </span>

                                    <button type="submit" disabled={sending}>
                                        {sending ? 'Sending...' : 'Send Reply'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {actionError && (
                            <p role="alert" className="action-error">
                                {actionError}
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
