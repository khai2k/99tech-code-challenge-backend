import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Book Management API with Authentication & Rate Limiting",
      version: "2.1.0",
      description: `A comprehensive Express Book API with JWT authentication, user management, and advanced rate limiting.

## Rate Limiting

This API implements adaptive rate limiting with different tiers:

### Rate Limit Tiers
- **Anonymous Users**: 100 requests per 15 minutes
- **Authenticated Users**: 500 requests per 15 minutes  
- **Admin Users**: 2000 requests per 15 minutes
- **Authentication Endpoints**: 20 attempts per 15 minutes (to prevent brute force)
- **Write Operations**: 50 operations per 5 minutes
- **Sensitive Operations**: 10 requests per hour

### Rate Limit Headers
All responses include rate limiting information:
- \`RateLimit-Limit\`: Maximum requests allowed
- \`RateLimit-Remaining\`: Requests remaining in current window
- \`RateLimit-Reset\`: Time when the rate limit resets
- \`X-Rate-Limit-Tier\`: Current user tier (anonymous/user/admin)
- \`X-Rate-Limit-Policy\`: Rate limiting policy (adaptive)

### Progressive Delay
Authentication and write endpoints implement progressive delays - requests slow down before hitting hard limits.

### Admin Bypass
Admin users can bypass certain rate limits for write operations (but not authentication endpoints).`,
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT Authorization header using the Bearer scheme. Example: 'Authorization: Bearer {token}'"
        },
      },
    },
  },
  apis: ["./routes/*.ts", "./entities/*.ts", "./middleware/*.ts"], // Path to the API routes
};

export const specs = swaggerJsdoc(options);
