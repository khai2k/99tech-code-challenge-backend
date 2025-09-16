import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger, { httpLogger, loggerUtils } from '../utils/logger';
import { AuthenticatedRequest } from './auth';

// Extend Request interface to include logging context
export interface RequestWithLogging extends AuthenticatedRequest {
  requestId: string;
  startTime: number;
  logger: typeof logger;
}

// Request ID middleware - adds unique ID to each request
export const addRequestId = (req: Request, res: Response, next: NextFunction) => {
  const reqWithLogging = req as RequestWithLogging;
  reqWithLogging.requestId = uuidv4();
  reqWithLogging.startTime = Date.now();
  
  // Add request ID to response headers for tracing
  res.setHeader('X-Request-ID', reqWithLogging.requestId);
  
  // Create request-scoped logger with context
  reqWithLogging.logger = logger.child({
    requestId: reqWithLogging.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  next();
};

// Request logging middleware
export const logRequest = (req: Request, res: Response, next: NextFunction) => {
  const reqWithLogging = req as RequestWithLogging;
  const startTime = Date.now();
  
  // Log incoming request
  const requestData: any = {
    requestId: reqWithLogging.requestId,
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    userId: reqWithLogging.user?.id,
    userEmail: reqWithLogging.user?.email,
    timestamp: new Date().toISOString()
  };

  // Don't log sensitive data in request body
  const shouldLogBody = !req.path.includes('/auth/') && req.method !== 'GET';
  if (shouldLogBody && req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    // Remove sensitive fields
    delete sanitizedBody.password;
    delete sanitizedBody.currentPassword;
    delete sanitizedBody.newPassword;
    requestData.body = sanitizedBody;
  }

  httpLogger.http('Incoming request', requestData);

  // Capture original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  
  let responseBody: any = null;
  let responseSize = 0;

  // Override res.send to capture response
  res.send = function(body: any) {
    responseBody = body;
    responseSize = Buffer.byteLength(body || '', 'utf8');
    return originalSend.call(this, body);
  };

  // Override res.json to capture response
  res.json = function(body: any) {
    responseBody = body;
    responseSize = Buffer.byteLength(JSON.stringify(body || {}), 'utf8');
    return originalJson.call(this, body);
  };

  // Log response when request finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    const responseData: any = {
      requestId: reqWithLogging.requestId,
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      statusCode,
      duration: `${duration}ms`,
      responseSize: `${responseSize} bytes`,
      userId: reqWithLogging.user?.id,
      ip: req.ip,
      timestamp: new Date().toISOString()
    };

    // Include response body for errors or if it's small and not sensitive
    if (statusCode >= 400 || (responseSize < 1000 && !req.path.includes('/auth/'))) {
      try {
        if (typeof responseBody === 'string') {
          responseData.responseBody = JSON.parse(responseBody);
        } else {
          responseData.responseBody = responseBody;
        }
      } catch {
        // If response body is not JSON, include it as is (truncated if too long)
        responseData.responseBody = typeof responseBody === 'string' && responseBody.length > 500 
          ? responseBody.substring(0, 500) + '...' 
          : responseBody;
      }
    }

    // Use appropriate log level based on status code
    if (statusCode >= 500) {
      httpLogger.error('Request completed with server error', responseData);
    } else if (statusCode >= 400) {
      httpLogger.warn('Request completed with client error', responseData);
    } else {
      httpLogger.http('Request completed successfully', responseData);
    }

    // Also use utility function for consistent API logging
    loggerUtils.logApiRequest(
      req.method,
      req.path,
      statusCode,
      duration,
      reqWithLogging.user?.id,
      statusCode >= 500 ? new Error(`HTTP ${statusCode}`) : undefined
    );
  });

  // Log if request is closed/aborted
  req.on('close', () => {
    if (!res.headersSent) {
      httpLogger.warn('Request aborted by client', {
        requestId: reqWithLogging.requestId,
        method: req.method,
        url: req.originalUrl,
        duration: `${Date.now() - startTime}ms`,
        userId: reqWithLogging.user?.id,
        ip: req.ip
      });
    }
  });

  next();
};

// Error logging middleware
export const logError = (error: Error, req: Request, res: Response, next: NextFunction) => {
  const reqWithLogging = req as RequestWithLogging;
  const errorData = {
    requestId: reqWithLogging.requestId,
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    userId: reqWithLogging.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };

  // Log error with appropriate level
  if (error.name === 'ValidationError' || error.message.includes('400')) {
    logger.warn('Request validation error', errorData);
  } else if (error.message.includes('401') || error.message.includes('403')) {
    logger.warn('Request authorization error', errorData);
  } else if (error.message.includes('404')) {
    logger.info('Request not found error', errorData);
  } else {
    logger.error('Request processing error', errorData);
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && !res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      requestId: reqWithLogging.requestId,
      timestamp: new Date().toISOString()
    });
  } else {
    next(error);
  }
};

// Performance monitoring middleware  
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const reqWithLogging = req as RequestWithLogging;
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log slow requests
    if (duration > 1000) { // Requests taking more than 1 second
      logger.warn('Slow request detected', {
        requestId: reqWithLogging.requestId,
        method: req.method,
        path: req.path,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode,
        userId: reqWithLogging.user?.id,
        component: 'performance'
      });
    }
    
    // Log memory usage for long-running requests
    if (duration > 5000) { // Requests taking more than 5 seconds
      const memUsage = process.memoryUsage();
      logger.warn('Long-running request memory usage', {
        requestId: reqWithLogging.requestId,
        duration: `${duration.toFixed(2)}ms`,
        memory: {
          rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
        },
        component: 'performance'
      });
    }
  });
  
  next();
};

// Security event logging middleware
export const logSecurityEvents = (req: Request, res: Response, next: NextFunction) => {
  const reqWithLogging = req as RequestWithLogging;
  // Log suspicious request patterns
  const suspiciousPatterns = [
    /\.\./,           // Directory traversal
    /<script>/i,      // XSS attempts
    /union.*select/i, // SQL injection
    /exec\(/i,        // Code injection
    /eval\(/i         // Code injection
  ];

  const requestString = `${req.url} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestString)) {
      loggerUtils.logSecurityEvent(
        'suspicious_request_pattern',
        'medium',
        {
          pattern: pattern.toString(),
          url: req.url,
          method: req.method,
          userAgent: req.get('User-Agent')
        },
        req.ip,
        reqWithLogging.user?.id
      );
      break;
    }
  }

  // Log failed authentication attempts
  if (req.path.includes('/auth/login') && res.statusCode === 401) {
    loggerUtils.logSecurityEvent(
      'failed_login_attempt',
      'medium',
      {
        email: req.body?.email,
        userAgent: req.get('User-Agent')
      },
      req.ip
    );
  }

  // Log successful authentications
  if (req.path.includes('/auth/login') && res.statusCode === 200) {
    loggerUtils.logSecurityEvent(
      'successful_login',
      'low',
      {
        email: req.body?.email,
        userAgent: req.get('User-Agent')
      },
      req.ip,
      reqWithLogging.user?.id
    );
  }

  next();
};

// Health check logging (minimal logging for health endpoints)
export const healthCheckLogger = (req: Request, res: Response, next: NextFunction) => {
  const reqWithLogging = req as RequestWithLogging;
  // Only log health check requests at debug level
  if (req.path.includes('/health') || req.path.includes('/ping')) {
    logger.debug('Health check request', {
      requestId: reqWithLogging.requestId,
      path: req.path,
      ip: req.ip
    });
  }
  
  next();
};
