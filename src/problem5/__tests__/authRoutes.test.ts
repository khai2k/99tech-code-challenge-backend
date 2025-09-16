import "reflect-metadata";
import request from "supertest";
import express from "express";
import { DataSource } from "typeorm";
import { authRoutes } from "../routes/authRoutes";
import { bookRoutes } from "../routes/bookRoutes";
import { getTestDb, initTestDb, clearTestDb, closeTestDb } from "../database";

describe("Authentication Routes", () => {
  let app: express.Application;
  let testDataSource: DataSource;

  beforeAll(async () => {
    testDataSource = await getTestDb();
    await initTestDb();

    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes(testDataSource));
    app.use("/api/books", bookRoutes(testDataSource));
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe"
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("user");
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("expiresIn");
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.firstName).toBe(userData.firstName);
      expect(response.body.user.lastName).toBe(userData.lastName);
      expect(response.body.user).not.toHaveProperty("password");
    });

    it("should not register user with missing fields", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123"
        // Missing firstName and lastName
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Email, password, first name, and last name are required");
    });

    it("should not register user with invalid email", async () => {
      const userData = {
        email: "invalid-email",
        password: "password123",
        firstName: "John",
        lastName: "Doe"
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
    });

    it("should not register user with short password", async () => {
      const userData = {
        email: "test@example.com",
        password: "123",
        firstName: "John",
        lastName: "Doe"
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Password must be at least 6 characters long");
    });

    it("should not register user with duplicate email", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe"
      };

      // Register first user
      await request(app).post("/api/auth/register").send(userData);

      // Try to register with same email
      const response = await request(app)
        .post("/api/auth/register")
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("User with this email already exists");
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Register a test user
      await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe"
      });
    });

    it("should login with valid credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "password123"
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("user");
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("expiresIn");
      expect(response.body.user.email).toBe("test@example.com");
    });

    it("should not login with invalid email", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "wrong@example.com",
          password: "password123"
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should not login with invalid password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "wrongpassword"
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should not login with missing credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com"
          // Missing password
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Email and password are required");
    });
  });

  describe("GET /api/auth/profile", () => {
    let authToken: string;

    beforeEach(async () => {
      // Register and login to get token
      const registerResponse = await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe"
      });
      authToken = registerResponse.body.token;
    });

    it("should get user profile with valid token", async () => {
      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe("test@example.com");
      expect(response.body.firstName).toBe("John");
      expect(response.body).not.toHaveProperty("password");
    });

    it("should not get profile without token", async () => {
      const response = await request(app).get("/api/auth/profile");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Access token required");
    });

    it("should not get profile with invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid token");
    });
  });

  describe("PUT /api/auth/profile", () => {
    let authToken: string;

    beforeEach(async () => {
      const registerResponse = await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe"
      });
      authToken = registerResponse.body.token;
    });

    it("should update user profile", async () => {
      const response = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          firstName: "Jane",
          lastName: "Smith"
        });

      expect(response.status).toBe(200);
      expect(response.body.firstName).toBe("Jane");
      expect(response.body.lastName).toBe("Smith");
      expect(response.body.email).toBe("test@example.com"); // Should remain unchanged
    });

    it("should update email if valid and not taken", async () => {
      const response = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          email: "newemail@example.com"
        });

      expect(response.status).toBe(200);
      expect(response.body.email).toBe("newemail@example.com");
    });

    it("should not update to invalid email format", async () => {
      const response = await request(app)
        .put("/api/auth/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          email: "invalid-email"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid email format");
    });
  });

  describe("POST /api/auth/change-password", () => {
    let authToken: string;

    beforeEach(async () => {
      const registerResponse = await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe"
      });
      authToken = registerResponse.body.token;
    });

    it("should change password with valid current password", async () => {
      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          currentPassword: "password123",
          newPassword: "newpassword123"
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Password changed successfully");

      // Test login with new password
      const loginResponse = await request(app)
        .post("/api/auth/login")
        .send({
          email: "test@example.com",
          password: "newpassword123"
        });

      expect(loginResponse.status).toBe(200);
    });

    it("should not change password with wrong current password", async () => {
      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          currentPassword: "wrongpassword",
          newPassword: "newpassword123"
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Current password is incorrect");
    });

    it("should not change password if new password is too short", async () => {
      const response = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          currentPassword: "password123",
          newPassword: "123"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("New password must be at least 6 characters long");
    });
  });

  describe("Protected Book Routes", () => {
    let authToken: string;

    beforeEach(async () => {
      const registerResponse = await request(app).post("/api/auth/register").send({
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe"
      });
      authToken = registerResponse.body.token;
    });

    it("should allow authenticated user to create book", async () => {
      const bookData = {
        title: "Test Book",
        author: "Test Author",
        year: 2024
      };

      const response = await request(app)
        .post("/api/books")
        .set("Authorization", `Bearer ${authToken}`)
        .send(bookData);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe(bookData.title);
    });

    it("should not allow unauthenticated user to create book", async () => {
      const bookData = {
        title: "Test Book",
        author: "Test Author",
        year: 2024
      };

      const response = await request(app)
        .post("/api/books")
        .send(bookData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Access token required");
    });

    it("should allow unauthenticated user to read books", async () => {
      const response = await request(app).get("/api/books");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should allow authenticated user to update book", async () => {
      // First create a book
      const createResponse = await request(app)
        .post("/api/books")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Original Title",
          author: "Original Author",
          year: 2024
        });

      const bookId = createResponse.body.id;

      // Then update it
      const updateResponse = await request(app)
        .put(`/api/books/${bookId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Updated Title",
          author: "Updated Author",
          year: 2025
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.title).toBe("Updated Title");
    });

    it("should not allow unauthenticated user to update book", async () => {
      const response = await request(app)
        .put("/api/books/1")
        .send({
          title: "Updated Title",
          author: "Updated Author",
          year: 2025
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Access token required");
    });

    it("should allow authenticated user to delete book", async () => {
      // First create a book
      const createResponse = await request(app)
        .post("/api/books")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Book to Delete",
          author: "Author",
          year: 2024
        });

      const bookId = createResponse.body.id;

      // Then delete it
      const deleteResponse = await request(app)
        .delete(`/api/books/${bookId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.message).toBe("Book deleted successfully");
    });

    it("should not allow unauthenticated user to delete book", async () => {
      const response = await request(app).delete("/api/books/1");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Access token required");
    });
  });
});
