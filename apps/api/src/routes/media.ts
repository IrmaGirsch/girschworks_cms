import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "@girschworks/database";
import { AuthMiddleware } from "../middleware/auth";

const router = Router();

// Validation schemas
const CreateMediaSchema = z.object({
  siteId: z.string().min(1, "Site ID is required"),
  filename: z.string().min(1, "Filename is required"),
  originalName: z.string().min(1, "Original name is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  size: z.number().positive("Size must be positive"),
  url: z.string().url("Valid URL is required"),
  alt: z.string().optional(),
});

const UpdateMediaSchema = z.object({
  filename: z.string().optional(),
  alt: z.string().optional(),
});

/**
 * GET /media
 * List media files with optional filtering by site
 */
router.get("/", AuthMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const { siteId, type, search } = req.query;

    // Build where clause
    const whereClause: any = {
      site: {
        tenantId: req.user!.tenantId,
      },
    };

    if (siteId) {
      whereClause.siteId = siteId;
    }

    if (type) {
      switch (type) {
        case "images":
          whereClause.mimeType = { startsWith: "image/" };
          break;
        case "documents":
          whereClause.mimeType = {
            in: [
              "application/pdf",
              "application/msword",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "text/plain",
            ],
          };
          break;
        case "videos":
          whereClause.mimeType = { startsWith: "video/" };
          break;
      }
    }

    if (search) {
      whereClause.OR = [
        { originalName: { contains: search as string, mode: "insensitive" } },
        { filename: { contains: search as string, mode: "insensitive" } },
        { alt: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const media = await db.media.findMany({
      where: whereClause,
      include: {
        site: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group by mime type for easier frontend handling
    const groupedMedia = {
      images: media.filter(m => m.mimeType.startsWith("image/")),
      documents: media.filter(m => 
        ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
          .includes(m.mimeType)
      ),
      videos: media.filter(m => m.mimeType.startsWith("video/")),
      other: media.filter(m => 
        !m.mimeType.startsWith("image/") && 
        !m.mimeType.startsWith("video/") &&
        !["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
          .includes(m.mimeType)
      ),
    };

    res.json({ 
      media,
      grouped: groupedMedia,
      total: media.length,
    });
  } catch (error) {
    console.error("Error fetching media:", error);
    res.status(500).json({
      error: "Failed to fetch media",
      message: "Internal server error",
    });
  }
});

/**
 * GET /media/:id
 * Get a specific media file by ID
 */
router.get("/:id", AuthMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const media = await db.media.findFirst({
      where: {
        id,
        site: {
          tenantId: req.user!.tenantId,
        },
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
      },
    });

    if (!media) {
      return res.status(404).json({
        error: "Media not found",
        message: "The requested media file does not exist or you don't have access to it",
      });
    }

    res.json({ media });
  } catch (error) {
    console.error("Error fetching media:", error);
    res.status(500).json({
      error: "Failed to fetch media",
      message: "Internal server error",
    });
  }
});

/**
 * POST /media
 * Create a new media record (file should be uploaded separately)
 * Note: This endpoint assumes files are uploaded to a separate service (AWS S3, Cloudinary, etc.)
 * and we're just storing the metadata
 */
router.post("/",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("ADMIN", "EDITOR", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const data = CreateMediaSchema.parse(req.body);

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

      // Check if filename already exists in this site
      const existingMedia = await db.media.findFirst({
        where: {
          siteId: data.siteId,
          filename: data.filename,
        },
      });

      if (existingMedia) {
        return res.status(400).json({
          error: "Filename already exists",
          message: "A media file with this filename already exists in this site",
        });
      }

      const media = await db.media.create({
        data,
        include: {
          site: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.status(201).json({
        message: "Media uploaded successfully",
        media,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      }

      console.error("Error creating media:", error);
      res.status(500).json({
        error: "Failed to upload media",
        message: "Internal server error",
      });
    }
  }
);

/**
 * PUT /media/:id
 * Update media metadata
 */
router.put("/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("ADMIN", "EDITOR", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = UpdateMediaSchema.parse(req.body);

      const existingMedia = await db.media.findFirst({
        where: {
          id,
          site: {
            tenantId: req.user!.tenantId,
          },
        },
      });

      if (!existingMedia) {
        return res.status(404).json({
          error: "Media not found",
          message: "The requested media file does not exist or you don't have access to it",
        });
      }

      // Check if new filename already exists (if filename is being changed)
      if (data.filename && data.filename !== existingMedia.filename) {
        const filenameTaken = await db.media.findFirst({
          where: {
            siteId: existingMedia.siteId,
            filename: data.filename,
          },
        });

        if (filenameTaken) {
          return res.status(400).json({
            error: "Filename already exists",
            message: "A media file with this filename already exists in this site",
          });
        }
      }

      const media = await db.media.update({
        where: { id },
        data,
        include: {
          site: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.json({
        message: "Media updated successfully",
        media,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      }

      console.error("Error updating media:", error);
      res.status(500).json({
        error: "Failed to update media",
        message: "Internal server error",
      });
    }
  }
);

/**
 * DELETE /media/:id
 * Delete a media file
 */
router.delete("/:id",
  AuthMiddleware.authenticate,
  AuthMiddleware.requireRole("ADMIN", "EDITOR", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const media = await db.media.findFirst({
        where: {
          id,
          site: {
            tenantId: req.user!.tenantId,
          },
        },
      });

      if (!media) {
        return res.status(404).json({
          error: "Media not found",
          message: "The requested media file does not exist or you don't have access to it",
        });
      }

      await db.media.delete({
        where: { id },
      });

      res.json({
        message: "Media deleted successfully",
        // Note: In a production system, you'd also want to delete the actual file
        // from your storage service (AWS S3, Cloudinary, etc.)
      });
    } catch (error) {
      console.error("Error deleting media:", error);
      res.status(500).json({
        error: "Failed to delete media",
        message: "Internal server error",
      });
    }
  }
);

export default router;