import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import os from "os";

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  // Realistic in-memory state tracking
  const serverStartTime = Date.now();
  let totalRequests = 0;
  let generateRequests = 0;
  let removeRequests = 0;
  let dailyActiveUsersSet = new Set<string>();

  // Track all requests
  app.use((req, res, next) => {
    totalRequests++;
    // Simulate unique users based on IP
    dailyActiveUsersSet.add(req.ip || 'unknown');
    next();
  });

  app.get("/api/status", (req, res) => {
    const uptimeSeconds = process.uptime();
    const memUsage = process.memoryUsage();
    
    // Formatting helper
    const formatUptime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      return `${h}h ${m}m ${s}s`;
    };

    res.json({
      uptime: formatUptime(uptimeSeconds),
      memory: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      cpuLoad: os.loadavg()[0].toFixed(2),
      services: [
        { name: "Remover Core", status: "Operational", uptime: "100%" },
        { name: "Watermark Engine", status: "Operational", uptime: "100%" },
        { name: "API Gateway", status: "Operational", uptime: "100%" }
      ]
    });
  });

  // New endpoint to track removals realistically
  app.post("/api/remove", (req, res) => {
    removeRequests++;
    setTimeout(() => {
      res.json({ success: true });
    }, 1200);
  });

  app.get("/api/analytics", (req, res) => {
    // Generate some dynamic baseline for charts based on time
    const day = new Date().getDay();
    const baseline = 1000 + (totalRequests * 10);
    
    res.json({
      dailyActiveUsers: 12450 + dailyActiveUsersSet.size, // Base + actual tracked
      watermarksRemoved: 42891 + removeRequests,
      avgProcessingTime: "1.2s",
      chartData: [
        { name: "Mon", count: baseline * 0.8 },
        { name: "Tue", count: baseline * 0.75 },
        { name: "Wed", count: baseline * 1.2 },
        { name: "Thu", count: baseline * 0.9 },
        { name: "Fri", count: baseline * 1.5 },
        { name: "Sat", count: baseline * 1.8 },
        { name: "Sun", count: baseline + totalRequests * 50 } // Spike on current usage
      ],
      fileTypes: [
        { name: "JPG", value: 45 + (removeRequests % 5) },
        { name: "PNG", value: 30 + (generateRequests % 3) },
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
