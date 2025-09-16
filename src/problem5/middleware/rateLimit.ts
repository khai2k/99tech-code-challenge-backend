import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { UserRole } from '../entities/User';

// Rate limiting configuration interface
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Rate limiting tiers based on user authentication and role
export const RATE_LIMIT_TIERS = {
  // Anonymous users (not authenticated)
  ANONYMOUS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    message: 'Too many requests from this IP. Please authenticate for higher limits.'
  },
  
  // Authenticated regular users
  USER: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500, // 500 requests per 15 minutes
    message: 'Rate limit exceeded. Please wait before making more requests.'
  },
  
  // Admin users get higher limits
  ADMIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 2000, // 2000 requests per 15 minutes
    message: 'Admin rate limit exceeded. Please wait before making more requests.'
  },
  
  // Strict limits for authentication endpoints to prevent brute force
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20, // 20 attempts per 15 minutes
    message: 'Too many authentication attempts. Please try again later.'
  },
  
  // More restrictive limits for write operations
  WRITE_OPERATIONS: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 50, // 50 write operations per 5 minutes
    message: 'Too many write operations. Please slow down.'
  }
} as const;

// Note: Custom key generators removed to avoid IPv6 validation issues
// Using default IPv6-safe key generation provided by express-rate-limit

// Custom skip function that bypasses rate limiting for admins when needed
const createSkipFunction = (allowAdminBypass: boolean = false) => {
  return (req: Request): boolean => {
    if (!allowAdminBypass) return false;
    
    const authReq = req as AuthenticatedRequest;
    return authReq.user?.role === UserRole.ADMIN;
  };
};

// Custom handler for rate limit exceeded
const rateLimitHandler = (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  
  // Import here to avoid circular dependency
  const { rateLimitLogger, loggerUtils } = require('../utils/logger');
  
  // Log rate limit violations for monitoring
  loggerUtils.logRateLimit(
    req.ip || 'unknown',
    req.path,
    parseInt(res.getHeader('X-RateLimit-Limit') as string || '0'),
    parseInt(res.getHeader('X-RateLimit-Remaining') as string || '0'),
    authReq.user?.id,
    true // blocked
  );
  
  rateLimitLogger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    method: req.method,
    userId: authReq.user?.id,
    userEmail: authReq.user?.email,
    userAgent: req.get('User-Agent'),
    limit: res.getHeader('X-RateLimit-Limit'),
    remaining: res.getHeader('X-RateLimit-Remaining'),
    reset: res.getHeader('X-RateLimit-Reset')
  });
  
  // Return structured error response
  res.status(429).json({
    error: 'Rate limit exceeded',
    message: 'Too many requests. Please try again later.',
    retryAfter: res.getHeader('Retry-After'),
    limit: res.getHeader('X-RateLimit-Limit'),
    remaining: res.getHeader('X-RateLimit-Remaining'),
    reset: res.getHeader('X-RateLimit-Reset'),
    documentation: 'See API documentation for rate limiting details'
  });
};

// Enhanced rate limiter factory with comprehensive options
export const createRateLimit = (config: RateLimitConfig, options: {
  useAuthStatus?: boolean;
  allowAdminBypass?: boolean;
  enableSlowDown?: boolean;
} = {}) => {
  const {
    useAuthStatus = true,
    allowAdminBypass = false,
    enableSlowDown = false
  } = options;

  const rateLimiter = rateLimit({
    windowMs: config.windowMs,
    max: config.maxRequests,
    message: config.message,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Use default IPv6-safe key generation
    skip: createSkipFunction(allowAdminBypass),
    handler: rateLimitHandler,
    skipSuccessfulRequests: config.skipSuccessfulRequests || false,
    skipFailedRequests: config.skipFailedRequests || false,
    // Custom store could be added here for Redis in production
    // store: new RedisStore({...})
  });

  // Optional slow down middleware for progressive delays
  if (enableSlowDown) {
    const slowDownMiddleware = slowDown({
      windowMs: config.windowMs,
      delayAfter: Math.floor(config.maxRequests * 0.7), // Start slowing after 70% of limit
      delayMs: 500, // Add 500ms delay per request after delayAfter
      maxDelayMs: 5000, // Maximum delay of 5 seconds
      // Remove custom keyGenerator to avoid IPv6 validation issues
      skip: createSkipFunction(allowAdminBypass)
    });

    return [slowDownMiddleware, rateLimiter];
  }

  return rateLimiter;
};

// Simple adaptive rate limiter using a single rate limiter with dynamic skip logic
export const createAdaptiveRateLimit = (anonConfig: RateLimitConfig, userConfig: RateLimitConfig, adminConfig: RateLimitConfig) => {
  // Use the most permissive config (admin) as base and handle logic in skip function
  return rateLimit({
    windowMs: adminConfig.windowMs,
    max: (req: Request) => {
      const authReq = req as AuthenticatedRequest;
      
      if (authReq.user) {
        return authReq.user.role === UserRole.ADMIN ? adminConfig.maxRequests : userConfig.maxRequests;
      }
      return anonConfig.maxRequests;
    },
    message: (req: Request) => {
      const authReq = req as AuthenticatedRequest;
      
      if (authReq.user) {
        return authReq.user.role === UserRole.ADMIN ? adminConfig.message : userConfig.message;
      }
      return anonConfig.message;
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use default IPv6-safe key generation
    handler: rateLimitHandler,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  });
};

// Pre-configured rate limiters for different use cases
export const rateLimiters = {
  // General API rate limiting with adaptive limits based on authentication
  general: createAdaptiveRateLimit(
    RATE_LIMIT_TIERS.ANONYMOUS,
    RATE_LIMIT_TIERS.USER,
    RATE_LIMIT_TIERS.ADMIN
  ),
  
  // Strict rate limiting for authentication endpoints
  auth: rateLimit({
    windowMs: RATE_LIMIT_TIERS.AUTH.windowMs,
    max: RATE_LIMIT_TIERS.AUTH.maxRequests,
    message: RATE_LIMIT_TIERS.AUTH.message,
    standardHeaders: true,
    legacyHeaders: false,
    // Use default IPv6-safe key generation (IP-based)
    handler: rateLimitHandler
  }),
  
  // Rate limiting for write operations (POST, PUT, DELETE)
  writeOperations: rateLimit({
    windowMs: RATE_LIMIT_TIERS.WRITE_OPERATIONS.windowMs,
    max: RATE_LIMIT_TIERS.WRITE_OPERATIONS.maxRequests,
    message: RATE_LIMIT_TIERS.WRITE_OPERATIONS.message,
    standardHeaders: true,
    legacyHeaders: false,
    // Use default IPv6-safe key generation
    handler: rateLimitHandler,
    skip: createSkipFunction(true) // Allow admin bypass
  }),
  
  // Very strict rate limiting for sensitive operations
  sensitive: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour
    message: 'Sensitive operation rate limit exceeded. Please contact support if you need higher limits.',
    standardHeaders: true,
    legacyHeaders: false,
    // Use default IPv6-safe key generation
    handler: rateLimitHandler
  }),
  
  // Lenient rate limiting for public read operations
  publicRead: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    message: 'Public API rate limit exceeded.',
    standardHeaders: true,
    legacyHeaders: false,
    // Use default IPv6-safe key generation
    handler: rateLimitHandler,
    skip: createSkipFunction(true) // Allow admin bypass
  })
};

// Rate limiting metrics for monitoring
export interface RateLimitMetrics {
  requests: number;
  blocked: number;
  bypassedAdmin: number;
  slowedDown: number;
}

// Simple in-memory metrics store (could be replaced with Redis in production)
const metricsStore: Map<string, RateLimitMetrics> = new Map();

export const getRateLimitMetrics = (key: string = 'global'): RateLimitMetrics => {
  return metricsStore.get(key) || { requests: 0, blocked: 0, bypassedAdmin: 0, slowedDown: 0 };
};

export const updateRateLimitMetrics = (key: string, metric: keyof RateLimitMetrics) => {
  const current = getRateLimitMetrics(key);
  current[metric]++;
  metricsStore.set(key, current);
};

// Middleware to add rate limit information to response headers
export const addRateLimitHeaders = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  
  // Determine user tier for informational headers
  let tier = 'anonymous';
  if (authReq.user) {
    tier = authReq.user.role === UserRole.ADMIN ? 'admin' : 'user';
  }
  
  res.setHeader('X-Rate-Limit-Tier', tier);
  res.setHeader('X-Rate-Limit-Policy', 'adaptive');
  
  next();
};
