# A Crude Server API with Authentication & Rate Limiting

A comprehensive RESTful API built with Express.js, TypeScript, and TypeORM for managing a book collection with user authentication and advanced rate limiting. This API provides CRUD operations for books, user management, JWT authentication, multi-tier rate limiting, and includes comprehensive Swagger documentation.

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation Options](#installation-options)
    - [🐳 Option 1: Docker (Recommended)](#-option-1-docker-recommended)
    - [💻 Option 2: Local Development](#-option-2-local-development)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)
- [Features](#features)
  - [🔐 Authentication & Authorization](#-authentication--authorization)
  - [📚 Advanced Book Management](#-advanced-book-management)
  - [🛡️ Security Features](#️-security-features)
  - [📝 Professional Logging System](#-professional-logging-system)
  - [⚡ Rate Limiting System](#-rate-limiting-system)
- [API Documentation](#api-documentation)
  - [Available Endpoints](#available-endpoints)
  - [Request/Response Examples](#requestresponse-examples)
- [Environment Configuration](#environment-configuration)
- [🐳 Docker Deployment](#-docker-deployment)
- [Development & Testing](#development--testing)
- [Error Handling](#error-handling)
- [API Usage Tips](#api-usage-tips)
- [License](#license)

## Getting Started

### Prerequisites

- **Docker & Docker Compose** (Recommended) OR
- Node.js (v22 higher) + npm (for local development)

### Installation Options

#### 🐳 Option 1: Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd src/problem5
```

2. Copy environment file:
```bash
cp env.example .env
# Edit .env file with your configuration
```

3. Start with Docker Compose:
```bash
# Development mode with hot reloading
npm run docker:compose:dev

# Production mode
npm run docker:compose:up

# View logs
npm run docker:compose:logs
```

The server will start on `http://localhost:3000`

#### 💻 Option 2: Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd src/problem5
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript code:
```bash
npm run build
```

4. Start the server:
```bash
npm start
```

The server will start on `http://localhost:3000`

## Project Structure

```
src/problem5/
├── index.ts              # Application entry point
├── database.ts           # TypeORM DataSource configuration
├── swagger.ts           # Swagger configuration with JWT auth
├── entities/
│   ├── Book.ts          # TypeORM Book entity
│   └── User.ts          # TypeORM User entity with authentication
├── middleware/
│   ├── auth.ts          # JWT authentication middleware
│   ├── rateLimit.ts     # Rate limiting middleware
│   └── requestLogger.ts # Request logging middleware
├── routes/
│   ├── authRoutes.ts    # Authentication routes (register, login, profile)
│   ├── bookRoutes.ts    # Book routes with authentication protection
│   └── adminRoutes.ts   # Admin routes for system management
├── utils/
│   └── logger.ts        # Winston logging configuration
├── __tests__/
│   ├── authRoutes.test.ts # Comprehensive authentication tests
│   ├── bookRoutes.test.ts # Book API tests
│   └── rateLimit.test.ts  # Rate limiting tests
├── books.db             # SQLite database file (includes users table)
├── package.json         # Project dependencies
└── tsconfig.json        # TypeScript configuration with decorators
```

## Technologies Used

- **TypeScript** - Type-safe JavaScript development
- **Express.js** - Web application framework
- **TypeORM** - Object-Relational Mapping with decorators
- **SQLite3** - Database (via better-sqlite3 driver)
- **JWT (jsonwebtoken)** - Authentication token management
- **bcryptjs** - Password hashing and validation
- **express-rate-limit** - Advanced rate limiting middleware
- **express-slow-down** - Progressive delay rate limiting
- **Winston** - Professional logging library with structured output
- **winston-daily-rotate-file** - Automatic log rotation and archiving
- **UUID** - Request tracking and correlation
- **Swagger UI Express** - Interactive API documentation
- **Jest** - Testing framework with comprehensive coverage

## Features

### 🔐 Authentication & Authorization
- **User Registration** with email validation and password hashing
- **JWT-based Authentication** with configurable expiration
- **Role-based Access Control** (USER, ADMIN roles)
- **Protected Routes** for sensitive operations
- **Password Management** with secure validation
- **Profile Management** with update capabilities

### 📚 Advanced Book Management
- **Full CRUD Operations** with TypeORM integration
- **Advanced Search & Filtering** across multiple fields
- **Pagination Support** for large datasets
- **Flexible Sorting** by any field (title, author, rating, date, etc.)
- **Rich Book Data Model** (13+ fields including genre, ISBN, rating, price)
- **Public Reading Access** with optional authentication

### 🛡️ Security Features
- **Password Hashing** with bcrypt salt rounds
- **JWT Token Validation** with user existence checks
- **Input Validation** for all endpoints
- **SQL Injection Protection** via TypeORM
- **Type Safety** throughout the application
- **Secure Error Messages** without information leakage
- **Advanced Rate Limiting** with multi-tier adaptive protection
- **Comprehensive Logging** with structured output and monitoring

### 📝 Professional Logging System

The API implements enterprise-grade logging with comprehensive monitoring and debugging capabilities:

#### **🎯 Logging Features**

- **Structured JSON Logging**: All logs output in structured JSON format for easy parsing and analysis
- **Multiple Log Levels**: Error, Warn, Info, HTTP, Debug, and Trace levels
- **Request Tracking**: Unique request IDs for complete request lifecycle tracking
- **Performance Monitoring**: Automatic detection and logging of slow requests
- **Security Event Logging**: Comprehensive security event tracking and alerting
- **Component-Based Logging**: Separate loggers for different system components

#### **📊 Log Categories**

| Log Type | File | Purpose | Retention |
|----------|------|---------|-----------|
| **Application** | `application-YYYY-MM-DD.log` | General application events | 14 days |
| **HTTP Requests** | `http-YYYY-MM-DD.log` | All HTTP request/response data | 7 days |
| **Authentication** | `auth-YYYY-MM-DD.log` | Login, logout, token events | 30 days |
| **Rate Limiting** | `rate-limit-YYYY-MM-DD.log` | Rate limit violations | 14 days |
| **Errors** | `error-YYYY-MM-DD.log` | Application errors and exceptions | 30 days |
| **Exceptions** | `exceptions-YYYY-MM-DD.log` | Uncaught exceptions | 30 days |
| **Rejections** | `rejections-YYYY-MM-DD.log` | Unhandled promise rejections | 30 days |

#### **🔍 Log Format Example**

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "Request completed successfully",
  "service": "book-management-api",
  "environment": "production",
  "component": "http",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "method": "GET",
  "path": "/api/books",
  "statusCode": 200,
  "duration": "45ms",
  "userId": 123,
  "ip": "192.168.1.100"
}
```

#### **🛡️ Security Logging**

- **Authentication Events**: Login attempts, token validation, password changes
- **Suspicious Activity**: Potential XSS, SQL injection, directory traversal attempts
- **Rate Limit Violations**: Detailed information about blocked requests
- **Error Patterns**: Systematic tracking of error patterns for threat detection

#### **⚡ Performance Monitoring**

- **Request Duration**: Automatic logging of request processing times
- **Slow Query Detection**: Identification of requests taking >1 second
- **Memory Usage**: Monitoring for long-running requests (>5 seconds)
- **Resource Utilization**: Heap and memory usage tracking

### ⚡ Rate Limiting System

The API implements a sophisticated multi-tier rate limiting system designed to protect against abuse while providing fair access:

#### **📊 Rate Limiting Tiers**

| User Type | Requests/Window | Window Duration | Key Strategy | Bypass Allowed |
|-----------|----------------|----------------|--------------|----------------|
| **Anonymous** | 100 requests | 15 minutes | IP-based | ❌ No |
| **Authenticated** | 500 requests | 15 minutes | User ID + IP | ❌ No |
| **Admin** | 2,000 requests | 15 minutes | User ID + IP | ✅ Yes (some endpoints) |
| **Auth Endpoints** | 20 attempts | 15 minutes | IP-only | ❌ No |
| **Write Operations** | 50 operations | 5 minutes | User ID + IP | ✅ Yes (admins) |
| **Sensitive Operations** | 10 requests | 1 hour | User ID + IP | ❌ No |

#### **🎯 Smart Features**

- **Adaptive Rate Limiting**: Limits automatically adjust based on user authentication status and role
- **Progressive Delay**: Requests slow down before hitting hard limits (prevents immediate blocking)
- **Comprehensive Headers**: Every response includes detailed rate limit information
- **Admin Bypass**: Administrators can bypass certain rate limits for operational needs
- **Brute Force Protection**: Strict limits on authentication endpoints prevent credential attacks
- **DDoS Protection**: Progressive delays and IP-based limiting protect against distributed attacks

#### **📈 Rate Limit Headers**

All API responses include rate limiting information:

```http
RateLimit-Limit: 500
RateLimit-Remaining: 487
RateLimit-Reset: 1640995200
X-Rate-Limit-Tier: user
X-Rate-Limit-Policy: adaptive
```

#### **🚨 Rate Limit Exceeded Response**

When rate limits are exceeded, the API returns a structured error:

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": "300",
  "limit": "500",
  "remaining": "0",
  "reset": "1640995200",
  "documentation": "See API documentation for rate limiting details"
}
```

## API Documentation

The API documentation is available through Swagger UI at `http://localhost:3000/api-docs`

![Swagger UI Demo](./swagger_UI.png)

### Available Endpoints

#### 🔐 Authentication Endpoints

- `POST /api/auth/register` - Register a new user *(Rate Limited: 20/15min)*
- `POST /api/auth/login` - Login user *(Rate Limited: 20/15min)*
- `GET /api/auth/profile` - Get current user profile (protected) *(Rate Limited: 20/15min)*
- `PUT /api/auth/profile` - Update user profile (protected) *(Rate Limited: 20/15min)*
- `POST /api/auth/change-password` - Change password (protected) *(Rate Limited: 10/hour)*

#### 📚 Book Endpoints

- `GET /api/books` - Get all books (public, with advanced search & filtering) *(Adaptive Rate Limited)*
- `GET /api/books/:id` - Get a specific book by ID (public) *(Adaptive Rate Limited)*
- `POST /api/books` - Create a new book (authentication required) *(Rate Limited: 50/5min)*
- `PUT /api/books/:id` - Update a book (authentication required) *(Rate Limited: 50/5min)*
- `DELETE /api/books/:id` - Delete a book (authentication required) *(Rate Limited: 50/5min)*
- `GET /api/books/search` - Advanced search with JSON filters (public) *(Adaptive Rate Limited)*

#### 🛡️ Admin Endpoints

- `GET /api/admin/rate-limit/status` - Get rate limiting metrics (admin only) *(Rate Limited: 10/hour)*
- `GET /api/admin/rate-limit/config` - Get rate limiting configuration (admin only) *(Rate Limited: 10/hour)*
- `GET /api/admin/health` - Get API health status (admin only) *(Rate Limited: 10/hour)*

### Request/Response Examples

#### 🔐 Authentication Examples

##### Register a New User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

Response:
```json
{
  "user": {
    "id": 1,
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isActive": true,
    "created_at": "2024-01-01T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

##### Login User

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "securePassword123"
}
```

##### Get User Profile (Protected)

```http
GET /api/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 📚 Book Examples

##### Create a Book (Authentication Required)

```http
POST /api/books
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "title": "The Great Gatsby",
  "author": "F. Scott Fitzgerald",
  "year": 1925,
  "genre": "Fiction",
  "isbn": "978-0-7432-7356-5",
  "description": "A classic American novel set in the Jazz Age",
  "pageCount": 180,
  "rating": 4.5,
  "price": 12.99,
  "coverImage": "https://example.com/cover.jpg",
  "publisher": "Scribner",
  "language": "English"
}
```

##### Supported Book Fields

- **title** (required): Book title
- **author** (required): Book author
- **year**: Publication year
- **genre**: Book genre/category
- **isbn**: International Standard Book Number (unique)
- **description**: Book description
- **pageCount**: Number of pages
- **rating**: Book rating (0-5)
- **price**: Book price
- **coverImage**: URL to book cover image
- **publisher**: Publisher name
- **language**: Book language (defaults to "English")

##### Advanced Search & Filtering (Public)

```http
GET /api/books?search=gatsby&genre=Fiction&yearFrom=1920&yearTo=1930&page=1&limit=10&sortBy=rating&sortOrder=DESC
```

```http
POST /api/books/search
Content-Type: application/json

{
  "q": "American novel",
  "filters": {
    "genre": "Fiction",
    "ratingFrom": 4.0,
    "yearFrom": 1900
  },
  "page": 1,
  "limit": 10,
  "sort": "year:ASC"
}
```

## Environment Configuration

### Core Environment Variables

For production deployment, set the following environment variables:

```bash
# Core Configuration
NODE_ENV=production
PORT=3000

# JWT Configuration
JWT_SECRET=your-super-secure-secret-key-here
JWT_EXPIRES_IN=24h

# Database Configuration (optional)
DATABASE_URL=path/to/your/database.db

# Logging Configuration
LOG_LEVEL=info
LOG_DIR=./logs

# Docker
COMPOSE_PROJECT_NAME=book-management-api
```

### **📁 Log File Structure**

```
logs/
├── application-2024-01-15.log    # General application logs
├── http-2024-01-15.log           # HTTP request/response logs
├── auth-2024-01-15.log           # Authentication events
├── rate-limit-2024-01-15.log     # Rate limiting events
├── error-2024-01-15.log          # Error logs
├── exceptions-2024-01-15.log     # Uncaught exceptions
└── rejections-2024-01-15.log     # Unhandled promise rejections
```

### **⚙️ Logging Configuration**

The logging system automatically adapts based on the environment:

- **Development**: Colorized console output with debug level
- **Production**: JSON structured logs with info level
- **Test**: Minimal logging with warn level only

#### **Log Levels**

1. **Error** - System errors, exceptions, critical failures
2. **Warn** - Warning conditions, auth failures, slow requests
3. **Info** - General application flow, successful operations
4. **HTTP** - HTTP request/response logging
5. **Debug** - Detailed debugging information
6. **Trace** - Very detailed tracing information

## 🐳 Docker Deployment

### Docker Architecture

The application uses a multi-stage Docker build for optimal performance and security:

- **Builder Stage**: Compiles TypeScript and installs dependencies
- **Production Stage**: Minimal runtime environment with only production dependencies
- **Development Stage**: Full development environment with hot reloading

### Docker Commands

#### Development

```bash
# Build development image
npm run docker:build:dev

# Start development environment with hot reloading
npm run docker:compose:dev

# View development logs
npm run docker:compose:logs

# Stop development environment
npm run docker:compose:dev:down
```

#### Production

```bash
# Build production image
npm run docker:build

# Start production environment
npm run docker:compose:up

# Start with Nginx reverse proxy (optional)
docker-compose --profile nginx up -d

# View production logs
npm run docker:compose:logs

# Stop production environment
npm run docker:compose:down
```

#### Testing

```bash
# Run tests in Docker
npm run docker:compose:test

# Run tests with database viewer
docker-compose -f docker-compose.dev.yml --profile test --profile db-tools up
```

#### Utility Commands

```bash
# Clean Docker system
npm run docker:clean

# View container status
docker-compose ps

# Execute commands in running container
docker-compose exec book-api sh

# View detailed logs
docker-compose logs --tail=100 -f book-api
```

### Docker Compose Profiles

The application supports multiple Docker Compose profiles for different use cases:

| Profile | Services | Purpose |
|---------|----------|---------|
| **default** | book-api | Core application |
| **nginx** | book-api, nginx | Production with reverse proxy |
| **logging** | book-api, fluentd | Centralized logging |
| **test** | book-api-test | Automated testing |
| **db-tools** | db-viewer | Database management tools |
| **docs** | docs | Documentation server |

### Production Deployment

#### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml book-api

# Scale services
docker service scale book-api_book-api=3

# Update service
docker service update --image book-management-api:latest book-api_book-api
```

#### Kubernetes

```yaml
# Example Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: book-management-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: book-management-api
  template:
    metadata:
      labels:
        app: book-management-api
    spec:
      containers:
      - name: api
        image: book-management-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Security Considerations

- **Non-root User**: Container runs as non-root user `nodeuser`
- **Minimal Base Image**: Uses Alpine Linux for smaller attack surface
- **Multi-stage Build**: Reduces final image size and excludes build tools
- **Health Checks**: Automatic container health monitoring
- **Secret Management**: Use Docker secrets or Kubernetes secrets for sensitive data
- **Network Isolation**: Containers communicate through dedicated networks
- **Resource Limits**: Memory and CPU limits prevent resource exhaustion

### Monitoring & Observability

```bash
# Health check
curl http://localhost:3000/health

# Metrics endpoint (if implemented)
curl http://localhost:3000/metrics

# Container stats
docker stats book-management-api

# Resource usage
docker-compose top
```

### Troubleshooting

#### Common Issues

1. **Port already in use**:
   ```bash
   # Find process using port 3000
   netstat -tulpn | grep :3000
   # Or change port in docker-compose.yml
   ```

2. **Permission denied errors**:
   ```bash
   # Fix ownership issues
   sudo chown -R $USER:$USER logs/
   ```

3. **Container won't start**:
   ```bash
   # Check logs
   docker-compose logs book-api
   
   # Debug interactively
   docker run -it --rm book-management-api sh
   ```

4. **Database issues**:
   ```bash
   # Check database file permissions
   ls -la books.db
   
   # Reset database
   rm books.db && docker-compose restart
   ```

### Performance Optimization

- **Layer Caching**: Dockerfile optimized for Docker layer caching
- **Multi-stage Build**: Minimal production image size
- **Resource Limits**: Configured for optimal resource usage
- **Health Checks**: Fast startup detection and recovery
- **Log Rotation**: Prevents disk space issues

## Development & Testing

### Development

To run the application in development mode with hot reloading:

```bash
npm run dev
```

### Testing

The project includes comprehensive test coverage for both authentication and book management:

```bash
npm test
```

#### Test Coverage
- **36 comprehensive test cases**
- **Authentication flow testing** (registration, login, profile management)
- **Protected route verification** (JWT token validation)
- **Book CRUD operations** with authentication integration
- **Error scenario coverage** (validation, authorization, not found)
- **Integration testing** between auth and book systems

#### Test Structure
- `authRoutes.test.ts` - Complete authentication system testing
- `bookRoutes.test.ts` - Book API functionality testing
- `rateLimit.test.ts` - Rate limiting functionality testing
- **Test isolation** with in-memory database
- **Automatic cleanup** between test cases

## Error Handling

The API includes comprehensive error handling for:

- **Authentication Errors** (invalid tokens, expired sessions)
- **Authorization Errors** (insufficient permissions)
- **Validation Errors** (invalid input data, missing fields)
- **Not Found Resources** (users, books)
- **Database Errors** (constraint violations, connection issues)
- **Rate Limit Violations** (too many requests)
- **Server Errors** with appropriate HTTP status codes

## API Usage Tips

### Authentication Workflow
1. **Register** a new user with `POST /api/auth/register`
2. **Login** with credentials to get a JWT token via `POST /api/auth/login`
3. **Include the token** in the `Authorization: Bearer <token>` header for protected routes
4. **Manage your profile** with `GET/PUT /api/auth/profile`

### Book Management
- **Public Access**: Anyone can read books and search without authentication
- **Protected Operations**: Creating, updating, and deleting books requires authentication
- **Advanced Search**: Use query parameters or the `/search` endpoint with JSON filters
- **Pagination**: All list endpoints support `page` and `limit` parameters

### Error Handling Best Practices
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Insufficient permissions for the requested operation
- **400 Bad Request**: Invalid input data or missing required fields
- **404 Not Found**: Requested resource doesn't exist
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server-side issues

## License

This project is licensed under the MIT License.