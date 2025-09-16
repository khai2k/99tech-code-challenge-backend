import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

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

@Entity("books")
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column({ nullable: true })
  year: number;

  @Column({ type: "text", nullable: true })
  genre: string;

  @Column({ unique: true, nullable: true })
  isbn: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ nullable: true })
  pageCount: number;

  @Column({ 
    type: "real", 
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: number) => value ? parseFloat(value.toString()) : value
    }
  })
  rating: number;

  @Column({ 
    type: "real", 
    nullable: true,
    transformer: {
      to: (value: number) => value,
      from: (value: number) => value ? parseFloat(value.toString()) : value
    }
  })
  price: number;

  @Column({ type: "text", nullable: true })
  coverImage: string;

  @Column({ type: "text", nullable: true })
  publisher: string;

  @Column({ type: "text", default: "English" })
  language: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
