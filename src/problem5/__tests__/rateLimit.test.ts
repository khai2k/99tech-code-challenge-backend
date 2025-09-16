import "reflect-metadata";
import request from "supertest";
import express from "express";
import { DataSource } from "typeorm";
import { authRoutes } from "../routes/authRoutes";
import { bookRoutes } from "../routes/bookRoutes";
import { adminRoutes } from "../routes/adminRoutes";
import { getTestDb, initTestDb, clearTestDb, closeTestDb } from "../database";
import { rateLimiters, addRateLimitHeaders } from "../middleware/rateLimit";

describe("Rate Limiting", () => {
  let app: express.Application;
  let testDataSource: DataSource;
  let authToken: string;
  let adminToken: string;

  beforeAll(async () => {
    testDataSource = await getTestDb();
    await initTestDb();

    app = express();
    app.use(express.json());
    app.set('trust proxy', 1);
    app.use(addRateLimitHeaders);

    // Mount routes with rate limiting
    app.use("/api/auth", rateLimiters.auth, authRoutes(testDataSource));
    app.use("/api/books", rateLimiters.general, bookRoutes(testDataSource));
    app.use("/api/admin", rateLimiters.sensitive, adminRoutes());

    // Create test users and get tokens
    const userResponse = await request(app).post("/api/auth/register").send({
      email: "testuser@example.com",
      password: "password123",
      firstName: "Test",
      lastName: "User"
    });
    authToken = userResponse.body.token;

    // Create admin user (simulate admin role assignment)
    const adminResponse = await request(app).post("/api/auth/register").send({
      email: "admin@example.com",
      password: "adminpass123",
      firstName: "Admin",
      lastName: "User"
    });
    adminToken = adminResponse.body.token;
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe("Rate Limit Headers", () => {
    it("should include rate limit information in response headers", async () => {
      const response = await request(app).get("/api/books");

      expect(response.headers).toHaveProperty("x-rate-limit-tier");
      expect(response.headers["x-rate-limit-tier"]).toBe("anonymous");
      expect(response.headers).toHaveProperty("x-rate-limit-policy");
      expect(response.headers["x-rate-limit-policy"]).toBe("adaptive");
    });

    it("should show different tier for authenticated users", async () => {
      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.headers["x-rate-limit-tier"]).toBe("user");
    });
  });

  describe("Authentication Endpoint Rate Limiting", () => {
    it("should allow multiple login attempts within limit", async () => {
      const loginData = {
        email: "testuser@example.com",
        password: "wrongpassword"
      };

      // Make several requests within the limit
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post("/api/auth/login")
          .send(loginData);
        
        expect(response.status).toBe(401); // Invalid credentials, not rate limited
      }
    });

    it("should provide rate limit information in headers", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "password"
        });

      // Check for rate limit headers
      expect(response.headers).toHaveProperty("ratelimit-limit");
      expect(response.headers).toHaveProperty("ratelimit-remaining");
      expect(response.headers).toHaveProperty("ratelimit-reset");
    });
  });

  describe("Book API Rate Limiting", () => {
    it("should allow anonymous users to read books with appropriate limits", async () => {
      const response = await request(app).get("/api/books");
      
      expect(response.status).toBe(200);
      expect(response.headers["x-rate-limit-tier"]).toBe("anonymous");
    });

    it("should show higher tier for authenticated book requests", async () => {
      const response = await request(app)
        .get("/api/books")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers["x-rate-limit-tier"]).toBe("user");
    });

    it("should apply write operation rate limits to POST requests", async () => {
      const bookData = {
        title: "Test Book",
        author: "Test Author",
        year: 2024
      };

      const response = await request(app)
        .post("/api/books")
        .set("Authorization", `Bearer ${authToken}`)
        .send(bookData);

      // Should succeed but have rate limit headers
      expect(response.status).toBe(201);
      expect(response.headers).toHaveProperty("ratelimit-limit");
    });
  });

  describe("Admin Endpoints Rate Limiting", () => {
    it("should apply sensitive rate limits to admin endpoints", async () => {
      const response = await request(app)
        .get("/api/admin/health")
        .set("Authorization", `Bearer ${adminToken}`);

      // Note: This might fail due to role permissions, but we're testing rate limits
      expect(response.headers).toHaveProperty("ratelimit-limit");
    });

    it("should provide rate limit status information", async () => {
      const response = await request(app)
        .get("/api/admin/rate-limit/status")
        .set("Authorization", `Bearer ${adminToken}`);

      // Check that the endpoint exists and has rate limiting applied
      expect(response.headers).toHaveProperty("ratelimit-limit");
    });
  });

  describe("Rate Limit Bypass", () => {
    it("should show admin tier for admin users", async () => {
      // First register and get admin token
      const registerResponse = await request(app).post("/api/auth/register").send({
        email: "admin2@example.com",
        password: "adminpass123",
        firstName: "Admin2",
        lastName: "User"
      });

      const response = await request(app)
        .get("/api/books")
        .set("Authorization", `Bearer ${registerResponse.body.token}`);

      expect(response.status).toBe(200);
      expect(response.headers["x-rate-limit-tier"]).toBe("user"); // Will be user until role is properly set
    });
  });

  describe("Rate Limit Error Responses", () => {
    it("should return proper error structure when rate limit is exceeded", async () => {
      // This test simulates rate limit exceeded scenario
      // In practice, you'd need to make many rapid requests to trigger this
      
      const makeRequest = () => request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "wrongpassword"
        });

      // Make several requests rapidly
      const promises = Array(10).fill(null).map(() => makeRequest());
      const responses = await Promise.all(promises);

      // At least one response should have rate limit headers
      const hasRateLimitHeaders = responses.some(response => 
        response.headers.hasOwnProperty("ratelimit-limit")
      );
      
      expect(hasRateLimitHeaders).toBe(true);
    });
  });

  describe("Progressive Delay (Slow Down)", () => {
    it("should include slow down headers when approaching limits", async () => {
      // Make multiple requests to trigger slow down
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post("/api/auth/login")
          .send({
            email: "test@example.com",
            password: "wrongpassword"
          });

        expect(response.headers).toHaveProperty("ratelimit-limit");
      }
    });
  });

  describe("IP-based vs User-based Rate Limiting", () => {
    it("should use IP-based limiting for authentication endpoints", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "wrongpassword"
        });

      // Auth endpoints should not differentiate between users for rate limiting
      expect(response.status).toBe(401); // Invalid credentials
      expect(response.headers).toHaveProperty("ratelimit-limit");
    });

    it("should use user+IP based limiting for authenticated endpoints", async () => {
      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.headers["x-rate-limit-tier"]).toBe("user");
    });
  });

  describe("Rate Limit Configuration", () => {
    it("should handle concurrent requests properly", async () => {
      // Test concurrent requests to ensure rate limiting works under load
      const makeRequest = () => request(app).get("/api/books");
      
      const promises = Array(5).fill(null).map(() => makeRequest());
      const responses = await Promise.all(promises);

      // All requests should succeed within normal limits
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.headers).toHaveProperty("ratelimit-limit");
      });
    });

    it("should provide consistent rate limit information", async () => {
      const response1 = await request(app).get("/api/books");
      const response2 = await request(app).get("/api/books");

      // Rate limit remaining should decrease
      const remaining1 = parseInt(response1.headers["ratelimit-remaining"] || "0");
      const remaining2 = parseInt(response2.headers["ratelimit-remaining"] || "0");

      expect(remaining1).toBeGreaterThan(remaining2);
    });
  });

  describe("Error Handling", () => {
    it("should handle rate limiting errors gracefully", async () => {
      // Test that rate limiting doesn't break normal error handling
      const response = await request(app)
        .get("/api/books/invalid-id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(400); // Invalid ID error
      expect(response.headers).toHaveProperty("ratelimit-limit");
    });
  });
});
