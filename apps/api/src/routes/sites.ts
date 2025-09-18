import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "@girschworks/database";
import { AuthMiddleware } from "../middleware/auth";

const router = Router();

// Validation schemas
const CreateSiteSchema = z.object({
  name: z.string().min(1, "Site name is required"),
  domain: z.string().optional(),
  description: z.string().optional(),
  theme: z.string().default("default"),
  seoSettings: z.object({
    defaultTitle: z.string().optional(),
    defaultDescription: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
});

const UpdateSiteSchema = CreateSiteSchema.partial();

const PublishSiteSchema = z.object({
  isPublished: z.boolean(),
});

/**
 * GET /sites
 * List all sites for the current tenant
 */
router.get("/", AuthMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const sites = await db.site.findMany({
      where: {
        tenantId: req.user!.tenantId,
      },
      include: {
        pages: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            isHomePage: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            pages: true,
            media: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      sites: sites.map(site => ({
        ...site,
        pageCount: site._count.pages,
        mediaCount: site._count.media,
      })),
    });
  } catch (error) {
    console.error("Error fetching sites:", error);
    res.status(500).json({
      error: "Failed to fetch sites",
      message: "Internal server error",
    });
  }
});

/**
 * GET /sites/:id
 * Get a specific site by ID
 */
router.get("/:id", AuthMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const site = await db.site.findFirst({
      where: {
        id,
        tenantId: req.user!.tenantId,
      },
      include: {
        pages: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            isHomePage: true,
            createdAt: true,
            updatedAt: true,
            author: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        },
        media: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            url: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10, // Latest 10 media files
        },
      },
    });

    if (!site) {
      return res.status(404).json({
        error: "Site not found",
        message: "The requested site does not exist or you don't have access to it",
      });
    }

    res.json({ site });
  } catch (error) {
    console.error("Error fetching site:", error);
    res.status(500).json({
      error: "Failed to fetch site",
      message: "Internal server error",
    });
  }
});

/**
 * POST /sites
 * Create a new site
 */
router.post("/", 
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("ADMIN", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const data = CreateSiteSchema.parse(req.body);

      // Check if domain is already taken (if provided)
      if (data.domain) {
        const existingSite = await db.site.findUnique({
          where: { domain: data.domain },
        });

        if (existingSite) {
          return res.status(400).json({
            error: "Domain already taken",
            message: "A site with this domain already exists",
          });
        }
      }

      const site = await db.site.create({
        data: {
          ...data,
          tenantId: req.user!.tenantId,
        },
        include: {
          pages: true,
          _count: {
            select: {
              pages: true,
              media: true,
            },
          },
        },
      });

      res.status(201).json({
        message: "Site created successfully",
        site: {
          ...site,
          pageCount: site._count.pages,
          mediaCount: site._count.media,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      }

      console.error("Error creating site:", error);
      res.status(500).json({
        error: "Failed to create site",
        message: "Internal server error",
      });
    }
  }
);

/**
 * PUT /sites/:id
 * Update an existing site
 */
router.put("/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("ADMIN", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = UpdateSiteSchema.parse(req.body);

      // Check if site exists and belongs to tenant
      const existingSite = await db.site.findFirst({
        where: {
          id,
          tenantId: req.user!.tenantId,
        },
      });

      if (!existingSite) {
        return res.status(404).json({
          error: "Site not found",
          message: "The requested site does not exist or you don't have access to it",
        });
      }

      // Check if new domain is already taken (if provided and different)
      if (data.domain && data.domain !== existingSite.domain) {
        const domainTaken = await db.site.findUnique({
          where: { domain: data.domain },
        });

        if (domainTaken) {
          return res.status(400).json({
            error: "Domain already taken",
            message: "A site with this domain already exists",
          });
        }
      }

      const site = await db.site.update({
        where: { id },
        data,
        include: {
          _count: {
            select: {
              pages: true,
              media: true,
            },
          },
        },
      });

      res.json({
        message: "Site updated successfully",
        site: {
          ...site,
          pageCount: site._count.pages,
          mediaCount: site._count.media,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      }

      console.error("Error updating site:", error);
      res.status(500).json({
        error: "Failed to update site",
        message: "Internal server error",
      });
    }
  }
);

/**
 * PATCH /sites/:id/publish
 * Publish or unpublish a site
 */
router.patch("/:id/publish",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("ADMIN", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isPublished } = PublishSiteSchema.parse(req.body);

      const site = await db.site.findFirst({
        where: {
          id,
          tenantId: req.user!.tenantId,
        },
      });

      if (!site) {
        return res.status(404).json({
          error: "Site not found",
          message: "The requested site does not exist or you don't have access to it",
        });
      }

      const updatedSite = await db.site.update({
        where: { id },
        data: { isPublished },
      });

      res.json({
        message: `Site ${isPublished ? 'published' : 'unpublished'} successfully`,
        site: updatedSite,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      }

      console.error("Error publishing site:", error);
      res.status(500).json({
        error: "Failed to publish site",
        message: "Internal server error",
      });
    }
  }
);

/**
 * DELETE /sites/:id
 * Delete a site and all its content
 */
router.delete("/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("ADMIN", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const site = await db.site.findFirst({
        where: {
          id,
          tenantId: req.user!.tenantId,
        },
      });

      if (!site) {
        return res.status(404).json({
          error: "Site not found",
          message: "The requested site does not exist or you don't have access to it",
        });
      }

      // Delete the site (cascade will handle pages and media)
      await db.site.delete({
        where: { id },
      });

      res.json({
        message: "Site deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting site:", error);
      res.status(500).json({
        error: "Failed to delete site",
        message: "Internal server error",
      });
    }
  }
);

export default router;