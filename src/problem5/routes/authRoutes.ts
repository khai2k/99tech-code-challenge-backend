import { Router, Response } from "express";
import { Repository } from "typeorm";
import { AppDataSource } from "../database";
import { User, UserRole } from "../entities/User";
import { generateToken, authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { rateLimiters } from "../middleware/rateLimit";

export function authRoutes(dataSource?: any) {
  const router = Router();
  const ds = dataSource || AppDataSource;
  const userRepository: Repository<User> = ds.getRepository(User);

  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UserRegistration'
   *     responses:
   *       201:
   *         description: User registered successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       400:
   *         description: Validation error or user already exists
   *       500:
   *         description: Server error
   */
  router.post("/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validation
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ 
          error: "Email, password, first name, and last name are required" 
        });
      }

      if (password.length < 6) {
        return res.status(400).json({ 
          error: "Password must be at least 6 characters long" 
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      // Check if user already exists
      const existingUser = await userRepository.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Create new user
      const user = new User();
      user.email = email.toLowerCase();
      user.password = password; // Will be hashed by the @BeforeInsert hook
      user.firstName = firstName;
      user.lastName = lastName;
      user.role = UserRole.USER;

      const savedUser = await userRepository.save(user);

      // Generate JWT token
      const token = generateToken(savedUser);

      res.status(201).json({
        user: savedUser,
        token,
        expiresIn: "24h"
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Login user
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UserLogin'
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/AuthResponse'
   *       400:
   *         description: Missing credentials
   *       401:
   *         description: Invalid credentials
   *       500:
   *         description: Server error
   */
  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Find user by email
      const user = await userRepository.findOne({ where: { email: email.toLowerCase() } });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(401).json({ error: "Account is deactivated" });
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Update last login time
      user.lastLoginAt = new Date();
      await userRepository.save(user);

      // Generate JWT token
      const token = generateToken(user);

      res.json({
        user,
        token,
        expiresIn: "24h"
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  /**
   * @swagger
   * /api/auth/profile:
   *   get:
   *     summary: Get current user profile
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: User profile
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       401:
   *         description: Unauthorized
   */
  router.get("/profile", authenticateToken, async (req: AuthenticatedRequest, res) => {
    res.json(req.user);
  });

  /**
   * @swagger
   * /api/auth/profile:
   *   put:
   *     summary: Update user profile
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               firstName:
   *                 type: string
   *               lastName:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       400:
   *         description: Validation error
   *       401:
   *         description: Unauthorized
   */
  router.put("/profile", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { firstName, lastName, email } = req.body;
      const user = req.user!;

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      
      if (email && email !== user.email) {
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ error: "Invalid email format" });
        }

        // Check if email is already taken
        const existingUser = await userRepository.findOne({ where: { email: email.toLowerCase() } });
        if (existingUser && existingUser.id !== user.id) {
          return res.status(400).json({ error: "Email is already taken" });
        }

        user.email = email.toLowerCase();
      }

      const updatedUser = await userRepository.save(user);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Profile update failed" });
    }
  });

  /**
   * @swagger
   * /api/auth/change-password:
   *   post:
   *     summary: Change user password
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - currentPassword
   *               - newPassword
   *             properties:
   *               currentPassword:
   *                 type: string
   *               newPassword:
   *                 type: string
   *                 minLength: 6
   *     responses:
   *       200:
   *         description: Password changed successfully
   *       400:
   *         description: Validation error
   *       401:
   *         description: Invalid current password
   */
  router.post("/change-password", rateLimiters.sensitive, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = req.user!;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters long" });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Update password
      user.password = newPassword; // Will be hashed by the @BeforeUpdate hook
      await userRepository.save(user);

      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      console.error("Password change error:", error);
      res.status(500).json({ error: "Password change failed" });
    }
  });

  return router;
}
