import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "@girschworks/database";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        tenantId: string;
      };
      tenant?: {
        id: string;
        name: string;
        domain: string;
      };
    }
  }
}

// JWT payload schema
const JWTPayloadSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  role: z.string(),
  tenantId: z.string(),
});

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

export class AuthMiddleware {
  /**
   * Middleware to verify JWT token and populate req.user
   */
  static async authenticate(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ 
          error: "Authentication required", 
          message: "Please provide a valid Bearer token" 
        });
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix
      
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const payload = JWTPayloadSchema.parse(decoded);

      // Fetch user from database to ensure they still exist and are active
      const user = await db.user.findUnique({
        where: { 
          id: payload.userId,
          isActive: true 
        },
        include: {
          tenant: true
        }
      });

      if (!user) {
        return res.status(401).json({ 
          error: "Invalid token", 
          message: "User not found or inactive" 
        });
      }

      // Populate request with user and tenant info
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      };

      req.tenant = {
        id: user.tenant.id,
        name: user.tenant.name,
        domain: user.tenant.domain,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ 
          error: "Invalid token", 
          message: "JWT token is malformed or expired" 
        });
      }
      
      console.error("Authentication error:", error);
      return res.status(500).json({ 
        error: "Authentication failed", 
        message: "Internal server error during authentication" 
      });
    }
  }

  /**
   * Middleware to check if user has required role
   */
  static requireRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ 
          error: "Authentication required" 
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: "Insufficient permissions", 
          message: `Required role: ${roles.join(" or ")}, your role: ${req.user.role}` 
        });
      }

      next();
    };
  }

  /**
   * Middleware to ensure user can only access their tenant's data
   */
  static requireTenant(req: Request, res: Response, next: NextFunction) {
    if (!req.user || !req.tenant) {
      return res.status(401).json({ 
        error: "Authentication required" 
      });
    }

    // This can be extended to check tenant-specific permissions
    // For now, we just ensure the user belongs to a tenant
    next();
  }

  /**
   * Generate JWT token for user
   */
  static generateToken(user: { id: string; email: string; role: string; tenantId: string }): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };

    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: "24h",
      issuer: "girschworks-cms",
      audience: "girschworks-cms-users"
    });
  }

  /**
   * Generate refresh token (longer expiry)
   */
  static generateRefreshToken(user: { id: string }): string {
    return jwt.sign(
      { userId: user.id, type: "refresh" }, 
      JWT_SECRET, 
      { 
        expiresIn: "7d",
        issuer: "girschworks-cms",
        audience: "girschworks-cms-users"
      }
    );
  }
}