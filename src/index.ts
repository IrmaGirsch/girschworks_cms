import express, { Request, Response } from "express";
import bodyParser from "body-parser";

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware: parse JSON request bodies
app.use(bodyParser.json());

// Simple test route
app.get("/", (req: Request, res: Response) => {
  res.send("Hello, CMS backend is running!");
});

// Example content route (placeholder for CMS content API)
app.post("/content", (req: Request, res: Response) => {
  const { title, body } = req.body;
  res.json({ message: "Content received!", title, body });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
