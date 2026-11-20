import { describe, it, expect } from 'vitest';
import {
    MAX_REPLY_LENGTH,
    formatResponseTime,
    formatManilaTimestamp,
    supportsConversationHistory,
    getReplyHistory,
    didReplyEmailFail,
    getFriendlyErrorMessage,
} from './inquiryReply';

describe('inquiryReply helpers', () => {
    it('exports MAX_REPLY_LENGTH as 10000', () => {
        expect(MAX_REPLY_LENGTH).toBe(10000);
    });

    it.each([
        [null, 'Not available'],
        [undefined, 'Not available'],
        [0, 'Under 1 minute'],
        [1, '1 minute'],
        [45, '45 minutes'],
        [60, '1 hour'],
        [61, '1 hour 1 minute'],
        [150, '2 hours 30 minutes'],
    ])('formatResponseTime(%s) -> %s', (minutes, expected) => {
        expect(formatResponseTime(minutes)).toBe(expected);
    });

    it('formatManilaTimestamp handles invalid or missing dates safely', () => {
        expect(formatManilaTimestamp(null)).toBeNull();
        expect(formatManilaTimestamp('not-a-date')).toBeNull();
        expect(formatManilaTimestamp('2026-11-20T04:30:00.000Z')).toMatch(/2026/);
    });

    it('detects conversation history support for conversation or replies arrays', () => {
        expect(supportsConversationHistory(null)).toBe(false);
        expect(supportsConversationHistory({ reply: 'Hi', repliedAt: '2026-11-20T04:00:00Z' })).toBe(false);
        expect(supportsConversationHistory({ conversation: [] })).toBe(true);
        expect(supportsConversationHistory({ replies: [] })).toBe(true);
    });

    it('normalizes conversation entries with sender labels and email failure flags', () => {
        const history = getReplyHistory({
            firstName: 'Juan',
            lastName: 'Dela Cruz',
            conversation: [
                {
                    _id: 'm1',
                    sender: 'admin',
                    message: 'First admin reply',
                    sentAt: '2026-11-20T04:00:00.000Z',
                },
                {
                    _id: 'm2',
                    sender: 'client',
                    text: 'Client follow up',
                    createdAt: '2026-11-20T05:00:00.000Z',
                },
                {
                    _id: 'm3',
                    sender: 'admin',
                    sentBy: { username: 'plmbadmin' },
                    reply: 'Second admin reply',
                    repliedAt: '2026-11-20T06:00:00.000Z',
                    emailNotificationFailed: true,
                },
            ],
        });

        expect(history).toHaveLength(3);
        expect(history[0]).toMatchObject({
            id: 'm1',
            sender: 'admin',
            senderLabel: 'Admin',
            message: 'First admin reply',
            emailFailed: false,
        });
        expect(history[1]).toMatchObject({
            id: 'm2',
            sender: 'client',
            senderLabel: 'Juan Dela Cruz',
            message: 'Client follow up',
            emailFailed: false,
        });
        expect(history[2]).toMatchObject({
            id: 'm3',
            sender: 'admin',
            senderLabel: 'plmbadmin',
            message: 'Second admin reply',
            emailFailed: true,
        });
    });

    it('falls back to legacy single reply when conversation array is absent', () => {
        const history = getReplyHistory({
            reply: 'Single F03 reply',
            repliedAt: '2026-11-20T04:00:00.000Z',
            emailNotificationFailed: true,
        });

        expect(history).toEqual([
            {
                id: 'legacy-reply',
                message: 'Single F03 reply',
                sender: 'admin',
                senderLabel: 'Admin',
                sentAt: '2026-11-20T04:00:00.000Z',
                emailFailed: true,
            },
        ]);
    });

    it('detects email notification failure across response, inquiry, and latest entry shapes', () => {
        expect(didReplyEmailFail({ emailNotificationFailed: true })).toBe(true);
        expect(didReplyEmailFail({ emailSent: false })).toBe(true);
        expect(didReplyEmailFail({ inquiry: { emailNotificationFailed: true } })).toBe(true);
        expect(didReplyEmailFail({}, [{ emailFailed: true }])).toBe(true);
        expect(didReplyEmailFail({ message: 'Reply sent successfully.' }, [{ emailFailed: false }])).toBe(false);
    });

    it('sanitizes raw technical errors while keeping clean user-facing messages', () => {
        expect(
            getFriendlyErrorMessage('Reply must not exceed 2000 characters.', 'Fallback')
        ).toBe('Reply must not exceed 2000 characters.');
        expect(
            getFriendlyErrorMessage('MongoServerError: E11000 duplicate key', 'Fallback')
        ).toBe('Fallback');
        expect(
            getFriendlyErrorMessage('Error: boom\n    at replyToInquiry (src/controllers/inquiry_controller.js:120:5)', 'Fallback')
        ).toBe('Fallback');
        expect(
            getFriendlyErrorMessage('<html><body>502 Bad Gateway</body></html>', 'Fallback')
        ).toBe('Fallback');
        expect(getFriendlyErrorMessage('', 'Fallback')).toBe('Fallback');
    });
});
