import "reflect-metadata";
import request from "supertest";
import express from "express";
import { DataSource } from "typeorm";
import { bookRoutes } from "../routes/bookRoutes";
import { getTestDb, initTestDb, clearTestDb, closeTestDb } from "../database";

describe("Book Routes", () => {
  let app: express.Application;
  let testDataSource: DataSource;

  beforeAll(async () => {
    testDataSource = await getTestDb();
    await initTestDb();

    app = express();
    app.use(express.json());
    app.use("/api/books", bookRoutes(testDataSource));
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe("POST /api/books", () => {
    it("should create a new book with valid data", async () => {
      const newBook = {
        title: "Test Book",
        author: "Test Author",
        year: 2024,
      };

      const response = await request(app).post("/api/books").send(newBook);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body.title).toBe(newBook.title);
      expect(response.body.author).toBe(newBook.author);
      expect(response.body.year).toBe(newBook.year);
    });

    it("should return 400 when title is missing", async () => {
      const invalidBook = {
        author: "Test Author",
        year: 2024,
      };

      const response = await request(app).post("/api/books").send(invalidBook);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /api/books", () => {
    beforeEach(async () => {
      // Add test books
      const testBooks = [
        { title: "Book 1", author: "Author 1", year: 2020 },
        { title: "Book 2", author: "Author 2", year: 2021 },
      ];

      for (const book of testBooks) {
        await request(app).post("/api/books").send(book);
      }
    });

    it("should return all books", async () => {
      const response = await request(app).get("/api/books");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it("should filter books by author", async () => {
      const response = await request(app)
        .get("/api/books")
        .query({ author: "Author 1" });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].author).toBe("Author 1");
    });

    it("should filter books by year", async () => {
      const response = await request(app)
        .get("/api/books")
        .query({ year: 2020 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].year).toBe(2020);
    });
  });

  describe("GET /api/books/:id", () => {
    let bookId: number;

    beforeEach(async () => {
      const response = await request(app).post("/api/books").send({
        title: "Test Book",
        author: "Test Author",
        year: 2024,
      });
      bookId = response.body.id;
    });

    it("should return a book by id", async () => {
      const response = await request(app).get(`/api/books/${bookId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(bookId);
      expect(response.body.title).toBe("Test Book");
    });

    it("should return 404 for non-existent book", async () => {
      const response = await request(app).get("/api/books/9999");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("PUT /api/books/:id", () => {
    let bookId: number;

    beforeEach(async () => {
      const response = await request(app).post("/api/books").send({
        title: "Original Title",
        author: "Original Author",
        year: 2020,
      });
      bookId = response.body.id;
    });

    it("should update a book with valid data", async () => {
      const updatedBook = {
        title: "Updated Title",
        author: "Updated Author",
        year: 2024,
      };

      const book = await request(app).get(`/api/books/${bookId}`);

      const response = await request(app)
        .put(`/api/books/${bookId}`)
        .send(updatedBook);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updatedBook.title);
      expect(response.body.author).toBe(updatedBook.author);
      expect(response.body.year).toBe(updatedBook.year);
    });

    it("should return 404 for non-existent book", async () => {
      const response = await request(app).put("/api/books/9999").send({
        title: "Updated Title",
        author: "Updated Author",
        year: 2024,
      });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /api/books/:id", () => {
    let bookId: number;

    beforeEach(async () => {
      const response = await request(app).post("/api/books").send({
        title: "Book to Delete",
        author: "Delete Author",
        year: 2024,
      });
      bookId = response.body.id;
    });

    it("should delete a book", async () => {
      const deleteResponse = await request(app).delete(`/api/books/${bookId}`);
      expect(deleteResponse.status).toBe(200);

      const getResponse = await request(app).get(`/api/books/${bookId}`);
      expect(getResponse.status).toBe(404);
    });

    it("should return 404 for non-existent book", async () => {
      const response = await request(app).delete("/api/books/9999");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });
});
