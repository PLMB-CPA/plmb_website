const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

const RESPONSE_THRESHOLD_BUSINESS_DAYS = 2;

// For calculating of inquiry status 
function inquiryStatus(inquiry) {
  if (inquiry.isAnswered) {
    return 'answered';
  }

  if (inquiry.isRead) {
    return 'in_progress';
  }

  return 'new';
}

// For calculating response time in minutes
function responseTimeMinutes(inquiry) {
  if (inquiry.responseTimeMinutes != null) {
    return inquiry.responseTimeMinutes;
  }

  if (!inquiry.date || !inquiry.repliedAt) {
    return null;
  }

  const submitted = new Date(inquiry.date);
  const replied = new Date(inquiry.repliedAt);

  const difference = replied - submitted;

  if (!Number.isFinite(difference)) {
    return null;
  }

  return Math.max(
    0,
    Math.round(difference / 60000)
  );
}

// For calculating deadline after two business days
function dueAt(date) {
  const original = new Date(date);

  if (Number.isNaN(original.getTime())) {
    return null;
  }

  const manilaDate = new Date(
    original.getTime() + MANILA_OFFSET_MS
  );

  let remaining = RESPONSE_THRESHOLD_BUSINESS_DAYS;

  while (remaining > 0) {
    manilaDate.setUTCDate(
      manilaDate.getUTCDate() + 1
    );

    const day = manilaDate.getUTCDay();

    // Sunday = 0, Saturday = 6
    if (day !== 0 && day !== 6) {
      remaining--;
    }
  }

  return new Date(
    manilaDate.getTime() - MANILA_OFFSET_MS
  );
}

// To determine whether inquiry is overdue
function isOverdue(inquiry, now = new Date()) {
  if (inquiry.isAnswered || inquiry.isArchived) {
    return false;
  }

  const deadline = dueAt(inquiry.date);

  return Boolean(deadline && now > deadline);
}

// Prepare inquiry data for the frontend
function serializeInquiry(inquiry) {
  const data =
    typeof inquiry.toObject === 'function'
      ? inquiry.toObject()
      : { ...inquiry };

  return {
    ...data,
    status: inquiryStatus(data),
    responseTimeMinutes: responseTimeMinutes(data),
    isOverdue: isOverdue(data)
  };
}

module.exports = {
  inquiryStatus,
  responseTimeMinutes,
  dueAt,
  isOverdue,
  serializeInquiry
};