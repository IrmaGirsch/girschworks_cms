import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDatabase } from "@girschworks/database";
import authRoutes from "./routes/auth";
import sitesRoutes from "./routes/sites";
import pagesRoutes from "./routes/pages";
import mediaRoutes from "./routes/media";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Logging middleware
app.use(morgan("combined"));

// Body parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check route
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.get("/", (req: Request, res: Response) => {
  res.json({ 
    message: "Girschworks CMS API is running!",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      auth: "/auth",
      sites: "/sites",
      pages: "/pages", 
      media: "/media",
      health: "/health"
    }
  });
});

// Mount route handlers
app.use("/auth", authRoutes);
app.use("/sites", sitesRoutes);
app.use("/pages", pagesRoutes);
app.use("/media", mediaRoutes);

// Example content route (placeholder for CMS content API)
app.post("/content", (req: Request, res: Response) => {
  const { title, body } = req.body;
  res.json({ 
    message: "Content received!", 
    title, 
    body,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server and connect to database
async function startServer() {
  try {
    await connectDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 API Server is running at http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();