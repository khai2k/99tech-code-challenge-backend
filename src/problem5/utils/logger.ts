import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
    trace: 5
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
    trace: 'cyan'
  }
};

// Add colors to winston
winston.addColors(customLevels.colors);

// Get log level from environment or default to 'info'
const getLogLevel = (): string => {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'development') return 'debug';
  if (env === 'test') return 'warn';
  return 'info'; // production
};

// Custom format for development (colorized and readable)
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = `\n${JSON.stringify(meta, null, 2)}`;
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Custom format for production (JSON structured logging)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    // Add additional context for structured logging
    const { timestamp, level, message, ...meta } = info;
    const logEntry = {
      timestamp,
      level,
      message,
      service: 'book-management-api',
      environment: process.env.NODE_ENV || 'development',
      ...meta
    };

    return JSON.stringify(logEntry);
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Daily rotate file transport for general logs
const fileRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d', // Keep logs for 14 days
  format: productionFormat,
  level: 'info'
});

// Daily rotate file transport for error logs
const errorFileRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d', // Keep error logs for 30 days
  format: productionFormat,
  level: 'error'
});

// HTTP requests log transport
const httpFileRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'http-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '50m',
  maxFiles: '7d', // Keep HTTP logs for 7 days
  format: productionFormat,
  level: 'http'
});

// Console transport configuration
const consoleTransport = new winston.transports.Console({
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  level: getLogLevel()
});

// Create the main logger
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: getLogLevel(),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true })
  ),
  transports: [
    consoleTransport,
    ...(process.env.NODE_ENV !== 'test' ? [
      fileRotateTransport,
      errorFileRotateTransport,
      httpFileRotateTransport
    ] : [])
  ],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: process.env.NODE_ENV !== 'test' ? [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: productionFormat
    })
  ] : [],
  rejectionHandlers: process.env.NODE_ENV !== 'test' ? [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: productionFormat
    })
  ] : [],
  exitOnError: false
});

// Create specialized loggers for different components
export const httpLogger = winston.createLogger({
  levels: customLevels.levels,
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    ...(process.env.NODE_ENV !== 'test' ? [httpFileRotateTransport] : [])
  ]
});

export const authLogger = winston.createLogger({
  levels: customLevels.levels,
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf((info) => {
      return JSON.stringify({
        ...info,
        component: 'authentication',
        service: 'book-management-api'
      });
    })
  ),
  transports: [
    consoleTransport,
    ...(process.env.NODE_ENV !== 'test' ? [
      new DailyRotateFile({
        filename: path.join(logsDir, 'auth-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d', // Keep auth logs longer for security auditing
        format: productionFormat
      })
    ] : [])
  ]
});

export const rateLimitLogger = winston.createLogger({
  levels: customLevels.levels,
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf((info) => {
      return JSON.stringify({
        ...info,
        component: 'rate-limiting',
        service: 'book-management-api'
      });
    })
  ),
  transports: [
    consoleTransport,
    ...(process.env.NODE_ENV !== 'test' ? [
      new DailyRotateFile({
        filename: path.join(logsDir, 'rate-limit-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: productionFormat
      })
    ] : [])
  ]
});

// Utility functions for common logging patterns
export const loggerUtils = {
  // Log database operations
  logDatabaseOperation: (operation: string, table: string, duration?: number, error?: Error) => {
    const logData = {
      component: 'database',
      operation,
      table,
      duration: duration ? `${duration}ms` : undefined,
      error: error?.message
    };

    if (error) {
      logger.error('Database operation failed', logData);
    } else {
      logger.debug('Database operation completed', logData);
    }
  },

  // Log API requests with performance metrics
  logApiRequest: (method: string, path: string, statusCode: number, duration: number, userId?: number, error?: Error) => {
    const logData = {
      component: 'api',
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      userId,
      error: error?.message
    };

    if (error || statusCode >= 500) {
      logger.error('API request failed', logData);
    } else if (statusCode >= 400) {
      logger.warn('API request resulted in client error', logData);
    } else {
      httpLogger.http('API request completed', logData);
    }
  },

  // Log authentication events
  logAuthEvent: (event: string, userId?: number, email?: string, ip?: string, success: boolean = true, error?: Error) => {
    const logData = {
      event,
      userId,
      email,
      ip,
      success,
      error: error?.message,
      timestamp: new Date().toISOString()
    };

    if (!success || error) {
      authLogger.warn('Authentication event failed', logData);
    } else {
      authLogger.info('Authentication event', logData);
    }
  },

  // Log rate limiting events
  logRateLimit: (ip: string, path: string, limit: number, remaining: number, userId?: number, blocked: boolean = false) => {
    const logData = {
      ip,
      path,
      limit,
      remaining,
      userId,
      blocked,
      timestamp: new Date().toISOString()
    };

    if (blocked) {
      rateLimitLogger.warn('Rate limit exceeded', logData);
    } else if (remaining < 10) {
      rateLimitLogger.info('Rate limit approaching', logData);
    } else {
      rateLimitLogger.debug('Rate limit check', logData);
    }
  },

  // Log business logic events
  logBusinessEvent: (event: string, details: Record<string, any>, userId?: number) => {
    const logData = {
      component: 'business',
      event,
      userId,
      ...details,
      timestamp: new Date().toISOString()
    };

    logger.info('Business event', logData);
  },

  // Log security events
  logSecurityEvent: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: Record<string, any>, ip?: string, userId?: number) => {
    const logData = {
      component: 'security',
      event,
      severity,
      ip,
      userId,
      ...details,
      timestamp: new Date().toISOString()
    };

    if (severity === 'critical' || severity === 'high') {
      logger.error('Security event', logData);
    } else if (severity === 'medium') {
      logger.warn('Security event', logData);
    } else {
      logger.info('Security event', logData);
    }
  }
};

// Create logs directory on startup
import fs from 'fs';
if (!fs.existsSync(logsDir) && process.env.NODE_ENV !== 'test') {
  fs.mkdirSync(logsDir, { recursive: true });
  logger.info('Created logs directory', { path: logsDir });
}

// Log startup information
logger.info('Logger initialized', {
  level: getLogLevel(),
  environment: process.env.NODE_ENV || 'development',
  logsDirectory: process.env.NODE_ENV !== 'test' ? logsDir : 'disabled (test mode)'
});

export default logger;
