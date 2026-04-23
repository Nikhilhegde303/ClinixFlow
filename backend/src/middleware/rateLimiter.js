import rateLimit from 'express-rate-limit';

// Strict limiter for joining the queue to prevent spam/bots
export const queueJoinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 join requests per window
  message: {
    status: 'error',
    message: 'Too many queue join requests from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// A slightly more relaxed limiter for general API routes (optional, but good practice)
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});