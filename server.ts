import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  // Hardcoded API Routes
  app.get("/api/status", (req, res) => {
    res.json({
      services: [
        { name: "Remover Core", status: "Operational", uptime: "99.9%" },
        { name: "Video Creator AI", status: "Operational", uptime: "100%" },
        { name: "Watermark Engine", status: "Operational", uptime: "99.98%" },
        { name: "Analytics DB", status: "Operational", uptime: "99.9%" }
      ]
    });
  });

  app.post("/api/generate", (req, res) => {
    const { prompt, type } = req.body;
    // Hardcoded generation mock
    setTimeout(() => {
      res.json({
        success: true,
        url: type === "video"
          ? "https://www.w3schools.com/html/mov_bbb.mp4"
          : "https://images.unsplash.com/photo-1707343843437-caacff5cfa74?q=80&w=1000&auto=format&fit=crop",
        type: type || "image"
      });
    }, 1500);
  });

  app.get("/api/analytics", (req, res) => {
    // Hardcoded analytics for admin
    res.json({
      dailyActiveUsers: 12450,
      watermarksRemoved: 42891,
      avgProcessingTime: "1.2s",
      chartData: [
        { name: "Mon", count: 4000 },
        { name: "Tue", count: 3000 },
        { name: "Wed", count: 5000 },
        { name: "Thu", count: 4500 },
        { name: "Fri", count: 6000 },
        { name: "Sat", count: 7000 },
        { name: "Sun", count: 8500 }
      ],
      fileTypes: [
        { name: "JPG", value: 45 },
        { name: "PNG", value: 30 },
        { name: "MP4", value: 20 },
        { name: "MOV", value: 5 }
      ]
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
