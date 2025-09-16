import { Router } from "express";
import { authenticateToken, requireAdmin, AuthenticatedRequest } from "../middleware/auth";
import { getRateLimitMetrics, RATE_LIMIT_TIERS } from "../middleware/rateLimit";

export function adminRoutes() {
  const router = Router();

  /**
   * @swagger
   * /api/admin/rate-limit/status:
   *   get:
   *     summary: Get rate limiting status and metrics (Admin only)
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Rate limiting status and metrics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 rateLimitTiers:
   *                   type: object
   *                   description: Current rate limiting configuration
   *                 metrics:
   *                   type: object
   *                   description: Rate limiting metrics
   *                 activeConnections:
   *                   type: number
   *                   description: Current active connections
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Admin access required
   */
  router.get("/rate-limit/status", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const metrics = getRateLimitMetrics('global');
      
      const status = {
        rateLimitTiers: {
          anonymous: RATE_LIMIT_TIERS.ANONYMOUS,
          user: RATE_LIMIT_TIERS.USER,
          admin: RATE_LIMIT_TIERS.ADMIN,
          auth: RATE_LIMIT_TIERS.AUTH,
          writeOperations: RATE_LIMIT_TIERS.WRITE_OPERATIONS
        },
        metrics,
        configuration: {
          trustProxy: true,
          adaptiveRateLimiting: true,
          slowDownEnabled: true,
          adminBypassEnabled: true
        },
        currentTime: new Date().toISOString(),
        serverUptime: process.uptime()
      };

      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/admin/rate-limit/config:
   *   get:
   *     summary: Get detailed rate limiting configuration (Admin only)
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Detailed rate limiting configuration
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Admin access required
   */
  router.get("/rate-limit/config", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const config = {
        description: "Multi-tier adaptive rate limiting system",
        tiers: {
          anonymous: {
            ...RATE_LIMIT_TIERS.ANONYMOUS,
            description: "Unauthenticated users - most restrictive",
            keyStrategy: "IP-based",
            bypassAllowed: false
          },
          user: {
            ...RATE_LIMIT_TIERS.USER,
            description: "Authenticated regular users",
            keyStrategy: "User ID + IP based",
            bypassAllowed: false
          },
          admin: {
            ...RATE_LIMIT_TIERS.ADMIN,
            description: "Admin users - highest limits",
            keyStrategy: "User ID + IP based",
            bypassAllowed: true
          },
          auth: {
            ...RATE_LIMIT_TIERS.AUTH,
            description: "Authentication endpoints - strict to prevent brute force",
            keyStrategy: "IP-based only",
            bypassAllowed: false,
            additionalFeatures: ["progressive delay", "enhanced monitoring"]
          },
          writeOperations: {
            ...RATE_LIMIT_TIERS.WRITE_OPERATIONS,
            description: "Write operations (POST/PUT/DELETE) - moderate restrictions",
            keyStrategy: "User ID + IP based",
            bypassAllowed: true,
            additionalFeatures: ["progressive delay"]
          }
        },
        features: {
          adaptiveRateLimiting: "Rate limits adjust based on user authentication status",
          progressiveDelay: "Requests slow down before hitting hard limits",
          adminBypass: "Admins can bypass certain rate limits",
          comprehensiveHeaders: "Detailed rate limit information in response headers",
          monitoring: "Real-time metrics and monitoring capabilities"
        },
        securityFeatures: {
          proxySupport: "Accurate IP detection behind proxies",
          bruteForceProtection: "Strict limits on authentication endpoints",
          ddosProtection: "Progressive delays and blocking for suspicious traffic",
          roleBased: "Different limits based on user roles"
        }
      };

      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/admin/health:
   *   get:
   *     summary: Get API health status including rate limiting (Admin only)
   *     tags: [Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: API health status
   *       401:
   *         description: Unauthorized
   *       403:
   *         description: Admin access required
   */
  router.get("/health", authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const metrics = getRateLimitMetrics('global');
      
      const health = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        rateLimiting: {
          status: "active",
          totalRequests: metrics.requests,
          blockedRequests: metrics.blocked,
          blockRate: metrics.requests > 0 ? (metrics.blocked / metrics.requests * 100).toFixed(2) + '%' : '0%'
        },
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      };

      res.json(health);
    } catch (error: any) {
      res.status(500).json({ 
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}
