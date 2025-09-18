import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "@girschworks/database";
import { AuthMiddleware } from "../middleware/auth";

const router = Router();

// Validation schemas
const CreatePageSchema = z.object({
  siteId: z.string().min(1, "Site ID is required"),
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  content: z.record(z.any()).optional(), // JSON content structure
  excerpt: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  isHomePage: z.boolean().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  featuredImage: z.string().url().optional(),
});

const UpdatePageSchema = CreatePageSchema.partial().omit({ siteId: true });

const PublishPageSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

/**
 * GET /pages
 * List pages with optional filtering by site
 */
router.get("/", AuthMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const { siteId, status, search } = req.query;

    // Build where clause
    const whereClause: any = {
      site: {
        tenantId: req.user!.tenantId,
      },
    };

    if (siteId) {
      whereClause.siteId = siteId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { excerpt: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const pages = await db.page.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        site: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    res.json({ pages });
  } catch (error) {
    console.error("Error fetching pages:", error);
    res.status(500).json({
      error: "Failed to fetch pages",
      message: "Internal server error",
    });
  }
});

/**
 * GET /pages/:id
 * Get a specific page by ID
 */
router.get("/:id", AuthMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const page = await db.page.findFirst({
      where: {
        id,
        site: {
          tenantId: req.user!.tenantId,
        },
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        site: {
          select: {
            id: true,
            name: true,
            domain: true,
            theme: true,
          },
        },
      },
    });

    if (!page) {
      return res.status(404).json({
        error: "Page not found",
        message: "The requested page does not exist or you don't have access to it",
      });
    }

    res.json({ page });
  } catch (error) {
    console.error("Error fetching page:", error);
    res.status(500).json({
      error: "Failed to fetch page",
      message: "Internal server error",
    });
  }
});

/**
 * POST /pages
 * Create a new page
 */
router.post("/",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("ADMIN", "EDITOR", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const data = CreatePageSchema.parse(req.body);

      // Verify site belongs to tenant
      const site = await db.site.findFirst({
        where: {
          id: data.siteId,
          tenantId: req.user!.tenantId,
        },
      });

      if (!site) {
        return res.status(404).json({
          error: "Site not found",
          message: "The specified site does not exist or you don't have access to it",
        });
      }

      // Check if slug is unique within the site
      const existingPage = await db.page.findUnique({
        where: {
          siteId_slug: {
            siteId: data.siteId,
            slug: data.slug,
          },
        },
      });

      if (existingPage) {
        return res.status(400).json({
          error: "Slug already exists",
          message: "A page with this slug already exists in this site",
        });
      }

      // If this is being set as home page, unset any existing home page
      if (data.isHomePage) {
        await db.page.updateMany({
          where: {
            siteId: data.siteId,
            isHomePage: true,
          },
          data: {
            isHomePage: false,
          },
        });
      }

      const page = await db.page.create({
        data: {
          ...data,
          status: data.status || "DRAFT",
          isHomePage: data.isHomePage || false,
          authorId: req.user!.id,
          publishedAt: (data.status || "DRAFT") === "PUBLISHED" ? new Date() : null,
        },
        include: {
          author: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          site: {
            select: {
              id: true,
              name: true,
              domain: true,
            },
          },
        },
      });

      res.status(201).json({
        message: "Page created successfully",
        page,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      }

      console.error("Error creating page:", error);
      res.status(500).json({
        error: "Failed to create page",
        message: "Internal server error",
      });
    }
  }
);

/**
 * PUT /pages/:id
 * Update an existing page
 */
router.put("/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("ADMIN", "EDITOR", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = UpdatePageSchema.parse(req.body);

      // Check if page exists and user has access
      const existingPage = await db.page.findFirst({
        where: {
          id,
          site: {
            tenantId: req.user!.tenantId,
          },
        },
      });

      if (!existingPage) {
        return res.status(404).json({
          error: "Page not found",
          message: "The requested page does not exist or you don't have access to it",
        });
      }

      // Check permissions: Editors can only edit their own pages, Admins can edit any
      if (req.user!.role === "EDITOR" && existingPage.authorId !== req.user!.id) {
        return res.status(403).json({
          error: "Insufficient permissions",
          message: "You can only edit your own pages",
        });
      }

      // Check if new slug is unique within the site (if slug is being changed)
      if (data.slug && data.slug !== existingPage.slug) {
        const slugTaken = await db.page.findUnique({
          where: {
            siteId_slug: {
              siteId: existingPage.siteId,
              slug: data.slug,
            },
          },
        });

        if (slugTaken) {
          return res.status(400).json({
            error: "Slug already exists",
            message: "A page with this slug already exists in this site",
          });
        }
      }

      // If this is being set as home page, unset any existing home page
      if (data.isHomePage) {
        await db.page.updateMany({
          where: {
            siteId: existingPage.siteId,
            isHomePage: true,
            id: { not: id },
          },
          data: {
            isHomePage: false,
          },
        });
      }

      // Set publishedAt if status is changing to PUBLISHED
      const updateData: any = { ...data };
      if (data.status === "PUBLISHED" && existingPage.status !== "PUBLISHED") {
        updateData.publishedAt = new Date();
      }

      const page = await db.page.update({
        where: { id },
        data: updateData,
        include: {
          author: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          site: {
            select: {
              id: true,
              name: true,
              domain: true,
            },
          },
        },
      });

      res.json({
        message: "Page updated successfully",
        page,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      }

      console.error("Error updating page:", error);
      res.status(500).json({
        error: "Failed to update page",
        message: "Internal server error",
      });
    }
  }
);

/**
 * PATCH /pages/:id/publish
 * Change page publication status
 */
router.patch("/:id/publish",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("ADMIN", "EDITOR", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = PublishPageSchema.parse(req.body);

      const existingPage = await db.page.findFirst({
        where: {
          id,
          site: {
            tenantId: req.user!.tenantId,
          },
        },
      });

      if (!existingPage) {
        return res.status(404).json({
          error: "Page not found",
          message: "The requested page does not exist or you don't have access to it",
        });
      }

      // Check permissions
      if (req.user!.role === "EDITOR" && existingPage.authorId !== req.user!.id) {
        return res.status(403).json({
          error: "Insufficient permissions",
          message: "You can only modify your own pages",
        });
      }

      const updateData: any = { status };
      if (status === "PUBLISHED" && existingPage.status !== "PUBLISHED") {
        updateData.publishedAt = new Date();
      }

      const page = await db.page.update({
        where: { id },
        data: updateData,
      });

      res.json({
        message: `Page ${status.toLowerCase()} successfully`,
        page,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      }

      console.error("Error updating page status:", error);
      res.status(500).json({
        error: "Failed to update page status",
        message: "Internal server error",
      });
    }
  }
);

/**
 * DELETE /pages/:id
 * Delete a page
 */
router.delete("/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("ADMIN", "EDITOR", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const page = await db.page.findFirst({
        where: {
          id,
          site: {
            tenantId: req.user!.tenantId,
          },
        },
      });

      if (!page) {
        return res.status(404).json({
          error: "Page not found",
          message: "The requested page does not exist or you don't have access to it",
        });
      }

      // Check permissions
      if (req.user!.role === "EDITOR" && page.authorId !== req.user!.id) {
        return res.status(403).json({
          error: "Insufficient permissions",
          message: "You can only delete your own pages",
        });
      }

      await db.page.delete({
        where: { id },
      });

      res.json({
        message: "Page deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting page:", error);
      res.status(500).json({
        error: "Failed to delete page",
        message: "Internal server error",
      });
    }
  }
);

export default router;