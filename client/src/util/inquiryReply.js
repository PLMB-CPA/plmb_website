export const MAX_REPLY_LENGTH = 10000;

const RAW_ERROR_PATTERNS = [
    /\bat\s+\S+\s+\(/,
    /<\/?(html|body|pre|script)\b/i,
    /\b(MongoServerError|MongoNetworkError|CastError|ValidationError|TypeError|ReferenceError|SyntaxError|ECONNREFUSED|ENOTFOUND|ETIMEDOUT)\b/,
];

export function formatResponseTime(minutes) {
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

export function formatManilaTimestamp(value) {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
}

export function supportsConversationHistory(inquiry) {
    return Boolean(
        inquiry && (Array.isArray(inquiry.conversation) || Array.isArray(inquiry.replies))
    );
}

export function getReplyHistory(inquiry) {
    if (!inquiry) {
        return [];
    }

    const rawEntries = Array.isArray(inquiry.conversation)
        ? inquiry.conversation
        : Array.isArray(inquiry.replies)
            ? inquiry.replies
            : null;

    if (rawEntries) {
        const clientFullName = [inquiry.firstName, inquiry.lastName].filter(Boolean).join(' ').trim();

        return rawEntries
            .filter((entry) => entry && typeof entry === 'object')
            .map((entry, index) => {
                const message =
                    typeof entry.message === 'string'
                        ? entry.message
                        : typeof entry.reply === 'string'
                            ? entry.reply
                            : typeof entry.text === 'string'
                                ? entry.text
                                : '';

                const sender = entry.sender === 'client' ? 'client' : 'admin';
                const sentByName =
                    typeof entry.sentBy === 'string'
                        ? entry.sentBy
                        : entry.sentBy?.username || '';
                const senderLabel =
                    entry.senderName ||
                    entry.adminUsername ||
                    sentByName ||
                    (sender === 'client' ? clientFullName || 'Client' : 'Admin');

                const sentAt = entry.sentAt || entry.repliedAt || entry.createdAt || null;
                const emailFailed =
                    entry.emailNotificationFailed === true || entry.emailSent === false;

                return {
                    id: entry._id || `${sentAt || 'reply'}-${index}`,
                    message,
                    sender,
                    senderLabel,
                    sentAt,
                    emailFailed,
                };
            })
            .filter((entry) => entry.message.trim().length > 0);
    }

    if (inquiry.repliedAt || (typeof inquiry.reply === 'string' && inquiry.reply.trim())) {
        return [
            {
                id: 'legacy-reply',
                message: inquiry.reply || '',
                sender: 'admin',
                senderLabel: 'Admin',
                sentAt: inquiry.repliedAt || null,
                emailFailed:
                    inquiry.emailNotificationFailed === true || inquiry.emailSent === false,
            },
        ];
    }

    return [];
}

export function didReplyEmailFail(responseData, history = []) {
    const latestEntry = history.length > 0 ? history[history.length - 1] : null;

    return Boolean(
        responseData?.emailNotificationFailed === true ||
        responseData?.emailSent === false ||
        responseData?.inquiry?.emailNotificationFailed === true ||
        responseData?.inquiry?.emailSent === false ||
        latestEntry?.emailFailed === true
    );
}

export function getFriendlyErrorMessage(rawMessage, fallback) {
    if (typeof rawMessage !== 'string') {
        return fallback;
    }

    const trimmed = rawMessage.trim();
    if (!trimmed || trimmed.length > 300) {
        return fallback;
    }

    if (RAW_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed))) {
        return fallback;
    }

    return trimmed;
}
