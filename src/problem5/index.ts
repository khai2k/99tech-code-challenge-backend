import "reflect-metadata";
import express from "express";
import { bookRoutes } from "./routes/bookRoutes";
import { authRoutes } from "./routes/authRoutes";
import { adminRoutes } from "./routes/adminRoutes";
import { initializeDatabase } from "./database";
import swaggerUi from "swagger-ui-express";
import { specs } from "./swagger";
import { rateLimiters, addRateLimitHeaders } from "./middleware/rateLimit";
import logger, { loggerUtils } from "./utils/logger";
import { 
  addRequestId, 
  logRequest, 
  logError, 
  performanceMonitor, 
  logSecurityEvents,
  healthCheckLogger 
} from "./middleware/requestLogger";

const app = express();
const port = 3000;

// Middleware
app.use(express.json());

// Trust proxy for accurate IP addresses (important for rate limiting and logging)
app.set('trust proxy', 1);

// Request logging middleware (applied early to capture all requests)
app.use(addRequestId);
app.use(healthCheckLogger);
app.use(logRequest);
app.use(performanceMonitor);
app.use(logSecurityEvents);

// Global rate limiting headers
app.use(addRateLimitHeaders);

// Swagger documentation with lenient rate limiting
app.use("/api-docs", rateLimiters.publicRead, swaggerUi.serve, swaggerUi.setup(specs));

// Initialize TypeORM database and start server
initializeDatabase()
  .then(() => {
    // Routes with specific rate limiting
    app.use("/api/auth", rateLimiters.auth, authRoutes());
    app.use("/api/books", rateLimiters.general, bookRoutes());
    app.use("/api/admin", rateLimiters.sensitive, adminRoutes());

    // Add health check endpoint
    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development"
      });
    });

    // Error handling middleware (applied last)
    app.use(logError);

    app.listen(port, () => {
      logger.info("Server started successfully", {
        port,
        environment: process.env.NODE_ENV || "development",
        urls: {
          api: `http://localhost:${port}`,
          swagger: `http://localhost:${port}/api-docs`,
          health: `http://localhost:${port}/health`
        }
      });
    });
  })
  .catch((error) => {
    logger.error("Failed to initialize application", {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });
