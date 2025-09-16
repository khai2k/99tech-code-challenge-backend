import { Request, Response, NextFunction } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { AppDataSource } from "../database";
import { User, UserRole } from "../entities/User";
import { authLogger, loggerUtils } from "../utils/logger";

// JWT Secret - in production, this should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface JWTPayload {
  userId: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export const generateToken = (user: User): string => {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as any };
  const token = jwt.sign(payload, JWT_SECRET, options);
  
  authLogger.info("JWT token generated", {
    userId: user.id,
    email: user.email,
    role: user.role,
    expiresIn: JWT_EXPIRES_IN
  });
  
  return token;
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      loggerUtils.logAuthEvent("token_missing", undefined, undefined, req.ip, false);
      res.status(401).json({ error: "Access token required" });
      return;
    }

    const decoded = verifyToken(token);
    const userRepository = AppDataSource.getRepository(User);
    
    const user = await userRepository.findOne({ 
      where: { id: decoded.userId, isActive: true } 
    });

    if (!user) {
      loggerUtils.logAuthEvent("user_not_found_or_inactive", decoded.userId, decoded.email, req.ip, false);
      res.status(401).json({ error: "Invalid token or user not found" });
      return;
    }

    // Update last login time
    user.lastLoginAt = new Date();
    userRepository.save(user).catch(err => {
      authLogger.warn("Failed to update last login time", { 
        userId: user.id,
        error: err.message 
      });
    });

    req.user = user;
    loggerUtils.logAuthEvent("token_verified", user.id, user.email, req.ip, true);
    next();
  } catch (error: any) {
    if (error instanceof jwt.JsonWebTokenError) {
      loggerUtils.logAuthEvent("token_invalid", undefined, undefined, req.ip, false, error);
      res.status(401).json({ error: "Invalid token" });
    } else if (error instanceof jwt.TokenExpiredError) {
      loggerUtils.logAuthEvent("token_expired", undefined, undefined, req.ip, false, error);
      res.status(401).json({ error: "Token expired" });
    } else {
      authLogger.error("Authentication error", {
        error: error.message,
        stack: error.stack,
        ip: req.ip
      });
      res.status(500).json({ error: "Authentication error" });
    }
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        error: "Insufficient permissions", 
        required: roles,
        current: req.user.role 
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole([UserRole.ADMIN]);

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      const decoded = verifyToken(token);
      const userRepository = AppDataSource.getRepository(User);
      
      const user = await userRepository.findOne({ 
        where: { id: decoded.userId, isActive: true } 
      });

      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we continue even if token is invalid
    next();
  }
};
