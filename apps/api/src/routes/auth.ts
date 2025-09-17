import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { db } from "@girschworks/database";
import { AuthMiddleware } from "../middleware/auth";

const router = Router();

// Validation schemas
const RegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  tenantName: z.string().min(1, "Organization name is required"),
  tenantDomain: z.string().min(1, "Domain is required"),
});

const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

/**
 * POST /auth/register
 * Register new user and create tenant (for first user of organization)
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, tenantName, tenantDomain } = RegisterSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        error: "User already exists",
        message: "An account with this email already exists"
      });
    }

    // Check if tenant domain already exists
    const existingTenant = await db.tenant.findUnique({
      where: { domain: tenantDomain }
    });

    if (existingTenant) {
      return res.status(400).json({
        error: "Domain already taken",
        message: "This domain is already registered"
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create tenant and user in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          domain: tenantDomain,
          settings: {
            allowRegistration: false, // Only admin can add users initially
            defaultRole: "EDITOR"
          }
        }
      });

      // Create user as ADMIN of the new tenant
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: "ADMIN", // First user is always admin
          tenantId: tenant.id,
        }
      });

      return { tenant, user };
    });

    // Generate tokens
    const accessToken = AuthMiddleware.generateToken({
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      tenantId: result.user.tenantId,
    });

    const refreshToken = AuthMiddleware.generateRefreshToken({
      id: result.user.id
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        domain: result.tenant.domain,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: "24h"
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors
      });
    }

    console.error("Registration error:", error);
    res.status(500).json({
      error: "Registration failed",
      message: "Internal server error"
    });
  }
});

/**
 * POST /auth/login
 * Login existing user
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    // Find user with tenant information
    const user = await db.user.findUnique({
      where: { 
        email,
        isActive: true 
      },
      include: {
        tenant: true
      }
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Email or password is incorrect"
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Email or password is incorrect"
      });
    }

    // Generate tokens
    const accessToken = AuthMiddleware.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    const refreshToken = AuthMiddleware.generateRefreshToken({
      id: user.id
    });

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        domain: user.tenant.domain,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: "24h"
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors
      });
    }

    console.error("Login error:", error);
    res.status(500).json({
      error: "Login failed",
      message: "Internal server error"
    });
  }
});

/**
 * GET /auth/me
 * Get current user info (protected route)
 */
router.get("/me", AuthMiddleware.authenticate, async (req: Request, res: Response) => {
  res.json({
    user: req.user,
    tenant: req.tenant
  });
});

/**
 * POST /auth/logout
 * Logout user (in a real app, you'd invalidate the token)
 */
router.post("/logout", AuthMiddleware.authenticate, (req: Request, res: Response) => {
  // In a production app, you'd add the token to a blacklist
  // For now, we just return success - client should delete the token
  res.json({
    message: "Logout successful"
  });
});

export default router;