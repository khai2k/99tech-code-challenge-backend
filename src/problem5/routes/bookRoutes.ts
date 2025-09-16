import { Router, Response } from "express";
import { Repository } from "typeorm";
import { AppDataSource } from "../database";
import { Book } from "../entities/Book";
import { authenticateToken, optionalAuth, AuthenticatedRequest } from "../middleware/auth";
import { rateLimiters } from "../middleware/rateLimit";

/**
 * @swagger
 * components:
 *   schemas:
 *     Book:
 *       type: object
 *       required:
 *         - title
 *         - author
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the book
 *         title:
 *           type: string
 *           description: The title of the book
 *         author:
 *           type: string
 *           description: The author of the book
 *         year:
 *           type: integer
 *           description: The publication year
 *         genre:
 *           type: string
 *           description: The genre of the book
 *         isbn:
 *           type: string
 *           description: The ISBN of the book (unique)
 *         description:
 *           type: string
 *           description: A description of the book
 *         pageCount:
 *           type: integer
 *           description: Number of pages in the book
 *         rating:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 5
 *           description: Book rating (0-5)
 *         price:
 *           type: number
 *           format: float
 *           minimum: 0
 *           description: Book price
 *         coverImage:
 *           type: string
 *           description: URL to book cover image
 *         publisher:
 *           type: string
 *           description: Book publisher
 *         language:
 *           type: string
 *           description: Book language
 *           default: English
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

export function bookRoutes(dataSource?: any) {
  const router = Router();
  const ds = dataSource || AppDataSource;
  const bookRepository: Repository<Book> = ds.getRepository(Book);

  /**
   * @swagger
   * /api/books:
   *   post:
   *     summary: Create a new book
   *     tags: [Books]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - author
   *             properties:
   *               title:
   *                 type: string
   *               author:
   *                 type: string
   *               year:
   *                 type: integer
   *     responses:
   *       201:
   *         description: The book was successfully created
   *       400:
   *         description: Missing required fields
   *       500:
   *         description: Server error
   */
  router.post("/", rateLimiters.writeOperations, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, author, year, genre, isbn, description, pageCount, rating, price, coverImage, publisher, language } = req.body;

      if (!title || !author) {
        return res.status(400).json({ error: "Title and author are required" });
      }

      const book = new Book();
      book.title = title;
      book.author = author;
      book.year = year;
      book.genre = genre;
      book.isbn = isbn;
      book.description = description;
      book.pageCount = pageCount;
      book.rating = rating;
      book.price = price;
      book.coverImage = coverImage;
      book.publisher = publisher;
      book.language = language || "English";

      const savedBook = await bookRepository.save(book);
      res.status(201).json(savedBook);
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: "ISBN already exists" });
      }
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/books:
   *   get:
   *     summary: Get all books
   *     tags: [Books]
   *     parameters:
   *       - in: query
   *         name: author
   *         schema:
   *           type: string
   *         description: Filter by author name
   *       - in: query
   *         name: year
   *         schema:
   *           type: integer
   *         description: Filter by publication year
   *     responses:
   *       200:
   *         description: List of books
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Book'
   */
  router.get("/", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { author, year, genre, rating } = req.query;
      const where: any = {};

      if (author) where.author = author;
      if (year) where.year = parseInt(year as string);
      if (genre) where.genre = genre;
      if (rating) where.rating = parseFloat(rating as string);

      const books = await bookRepository.find({
        where: Object.keys(where).length > 0 ? where : undefined,
        order: { created_at: "DESC" }
      });

      res.json(books);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/books/{id}:
   *   get:
   *     summary: Get book by ID
   *     tags: [Books]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Book ID
   *     responses:
   *       200:
   *         description: Book details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Book'
   *       404:
   *         description: Book not found
   */
  router.get("/:id", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid book ID" });
      }

      const book = await bookRepository.findOne({ where: { id } });
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }
      res.json(book);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/books/{id}:
   *   put:
   *     summary: Update a book
   *     tags: [Books]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Book ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - author
   *             properties:
   *               title:
   *                 type: string
   *               author:
   *                 type: string
   *               year:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Book updated successfully
   *       404:
   *         description: Book not found
   *       400:
   *         description: Missing required fields
   */
  router.put("/:id", rateLimiters.writeOperations, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid book ID" });
      }

      const { title, author, year, genre, isbn, description, pageCount, rating, price, coverImage, publisher, language } = req.body;

      if (!title || !author) {
        return res.status(400).json({ error: "Title and author are required" });
      }

      const book = await bookRepository.findOne({ where: { id } });
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }

      // Update book properties
      book.title = title;
      book.author = author;
      book.year = year;
      book.genre = genre;
      book.isbn = isbn;
      book.description = description;
      book.pageCount = pageCount;
      book.rating = rating;
      book.price = price;
      book.coverImage = coverImage;
      book.publisher = publisher;
      book.language = language || book.language;

      const updatedBook = await bookRepository.save(book);
      res.json(updatedBook);
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: "ISBN already exists" });
      }
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * @swagger
   * /api/books/{id}:
   *   delete:
   *     summary: Delete a book
   *     tags: [Books]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: Book ID
   *     responses:
   *       200:
   *         description: Book deleted successfully
   *       404:
   *         description: Book not found
   */
  router.delete("/:id", rateLimiters.writeOperations, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid book ID" });
      }

      const book = await bookRepository.findOne({ where: { id } });
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }

      await bookRepository.remove(book);
      res.json({ message: "Book deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
