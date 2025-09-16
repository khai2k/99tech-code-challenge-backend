import "reflect-metadata";
import { DataSource } from "typeorm";
import { Book } from "./entities/Book";
import { User } from "./entities/User";
import logger, { loggerUtils } from "./utils/logger";

// Main application DataSource
export const AppDataSource = new DataSource({
  type: "better-sqlite3",
  database: "books.db",
  synchronize: true, // Auto-create tables based on entities
  logging: process.env.NODE_ENV === "development",
  entities: [Book, User],
  migrations: [],
  subscribers: [],
});

// Initialize the main database connection
export const initializeDatabase = async (): Promise<void> => {
  const startTime = Date.now();
  
  try {
    await AppDataSource.initialize();
    const duration = Date.now() - startTime;
    
    logger.info("Database initialized successfully", {
      component: "database",
      duration: `${duration}ms`,
      driver: "better-sqlite3",
      database: "books.db",
      entities: ["Book", "User"]
    });
    
    loggerUtils.logDatabaseOperation("initialize", "main", duration);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    logger.error("Failed to initialize database", {
      component: "database",
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack
    });
    
    loggerUtils.logDatabaseOperation("initialize", "main", duration, error);
    throw error;
  }
};

// Test database utilities
export const TestDataSource = new DataSource({
  type: "better-sqlite3",
  database: ":memory:",
  synchronize: true,
  logging: false,
  entities: [Book, User],
  dropSchema: true, // Clear schema on each test run
});

export const getTestDb = async (): Promise<DataSource> => {
  if (!TestDataSource.isInitialized) {
    await TestDataSource.initialize();
  }
  return TestDataSource;
};

export const initTestDb = async (): Promise<void> => {
  try {
    if (!TestDataSource.isInitialized) {
      await TestDataSource.initialize();
      logger.debug("Test database initialized", { component: "database", type: "test" });
    }
  } catch (error: any) {
    logger.error("Error initializing test database", {
      component: "database",
      type: "test",
      error: error.message
    });
    throw error;
  }
};

export const clearTestDb = async (): Promise<void> => {
  try {
    const bookRepository = TestDataSource.getRepository(Book);
    const userRepository = TestDataSource.getRepository(User);
    await bookRepository.clear();
    await userRepository.clear();
    logger.debug("Test database cleared", { component: "database", type: "test" });
  } catch (error: any) {
    logger.error("Error clearing test database", {
      component: "database",
      type: "test",
      error: error.message
    });
    throw error;
  }
};

export const closeTestDb = async (): Promise<void> => {
  try {
    if (TestDataSource.isInitialized) {
      await TestDataSource.destroy();
      logger.debug("Test database closed", { component: "database", type: "test" });
    }
  } catch (error: any) {
    logger.error("Error closing test database", {
      component: "database",
      type: "test", 
      error: error.message
    });
    throw error;
  }
};
