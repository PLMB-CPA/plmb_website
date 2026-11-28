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

const adminRecoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    error: 'Too many recovery requests. Please try again later.'
  }
});

const adminResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    error: 'Too many reset attempts. Please try again later.'
  }
});

const clientSubscriptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => String(req.session.clientId),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    error: 'Too many requests. Please try again later.'
  }
});

const unsubscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    error: 'Too many requests. Please try again later.'
  }
});

module.exports = {
  clientSubscriptionLimiter,
  unsubscribeLimiter,
  inquiryLimiter: publicFormLimiter(),
  subscriberLimiter: publicFormLimiter(),
  adminRecoveryLimiter,
  adminResetLimiter
};
