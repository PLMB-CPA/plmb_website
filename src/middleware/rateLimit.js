const { rateLimit } = require('express-rate-limit');

const isProduction = process.env.NODE_ENV === 'production';

function publicFormLimiter() {
  return rateLimit({
    windowMs: 6 * 60 * 60 * 1000,
    limit: 2,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipFailedRequests: true,
    skip: () => !isProduction,
    message: { error: 'Too many submissions. Please try again later.' },
  });
}

module.exports = {
  inquiryLimiter: publicFormLimiter(),
  subscriberLimiter: publicFormLimiter(),
};
