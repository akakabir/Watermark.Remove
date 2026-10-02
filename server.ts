import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { createServer as createViteServer } from "vite";

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const app = express();
const PORT = 3000;
app.use(express.json());

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

app.use("/uploads", express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

type Job = { status: string; progress: number; resultUrl?: string; error?: string };
const jobs = new Map<string, Job>();

function parseTimemark(timemark: string): number {
  const parts = (timemark || "").split(":");
  if (parts.length !== 3) return 0;
  return (parseFloat(parts[0]) || 0) * 3600 + (parseFloat(parts[1]) || 0) * 60 + (parseFloat(parts[2]) || 0);
}

/**
 * Video watermark removal with FFmpeg's `delogo` filter (same approach as mediaclean-ai).
 * No AI / API key needed. The box arrives in preview (CSS) pixels and is scaled to the real video size.
 */
function removeWatermarkFromVideo(
  jobId: string,
  inputPath: string,
  outputPath: string,
  outputUrl: string,
  box: { x: number; y: number; w: number; h: number },
  renderedW: number,
  renderedH: number,
  trueW: number,
  trueH: number
) {
  let { x, y, w, h } = box;

  // Rescale from preview pixels to the video's real resolution
  if (renderedW > 0 && renderedH > 0 && trueW > 0 && trueH > 0) {
    const sx = trueW / renderedW;
    const sy = trueH / renderedH;
    x = Math.round(x * sx);
    y = Math.round(y * sy);
    w = Math.round(w * sx);
    h = Math.round(h * sy);
  }

  // delogo requires the box to sit strictly inside the frame, so clamp it
  const margin = 2;
  if (trueW > 0 && trueH > 0) {
    x = Math.max(margin, Math.min(x, trueW - margin - 2));
    y = Math.max(margin, Math.min(y, trueH - margin - 2));
    w = Math.max(2, Math.min(w, trueW - x - margin));
    h = Math.max(2, Math.min(h, trueH - y - margin));
  } else {
    x = Math.max(margin, x);
    y = Math.max(margin, y);
    w = Math.max(2, w);
    h = Math.max(2, h);
  }

  const vf = `delogo=x=${x}:y=${y}:w=${w}:h=${h}`;
  console.log(`[Job ${jobId}] ffmpeg -vf ${vf} (video ${trueW}x${trueH})`);

  let durationSec = 0;

  ffmpeg(inputPath)
    .outputOptions([
      "-vf", vf,
      "-map", "0:v:0",
      "-map", "0:a?",
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-crf", "22",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
    ])
    .on("codecData", (data) => {
      durationSec = parseTimemark(data.duration);
    })
    .on("progress", (p) => {
      let pct = 15;
      if (p.percent && p.percent > 0) {
        pct = p.percent;
      } else if (p.timemark && durationSec > 0) {
        pct = (parseTimemark(p.timemark) / durationSec) * 100;
      }
      jobs.set(jobId, { status: "processing", progress: Math.min(98, Math.max(5, Math.round(pct))) });
    })
    .on("end", () => {
      jobs.set(jobId, { status: "done", progress: 100, resultUrl: outputUrl });
    })
    .on("error", (err, _stdout, stderr) => {
      console.error(`[Job ${jobId}] ffmpeg error:`, err.message);
      if (stderr) console.error(stderr);
      jobs.set(jobId, {
        status: "error",
        progress: 0,
        error: "Watermark removal failed. Try adjusting the selected area and run it again.",
      });
    })
    .save(outputPath);
}

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const type = req.file.mimetype.startsWith("video") ? "video" : "image";
  res.json({
    id: req.file.filename,
    url: `/uploads/${req.file.filename}`,
    type,
  });
});

// Images are cleaned in the browser (canvas inpainting). Only videos come through here.
app.post("/api/process", (req, res) => {
  const { id, type, box, renderedWidth, renderedHeight, naturalWidth, naturalHeight } = req.body;
  if (!id || !box) return res.status(400).json({ error: "Missing id or box" });
  if (type !== "video") {
    return res.status(400).json({ error: "Images are processed in the browser; this endpoint only handles video." });
  }

  const inputPath = path.join(UPLOADS_DIR, path.basename(id));
  if (!fs.existsSync(inputPath)) return res.status(404).json({ error: "File not found" });

  const jobId = `job-${Date.now()}`;
  const outputFilename = `edited-${path.parse(id).name}.mp4`;
  const outputPath = path.join(UPLOADS_DIR, outputFilename);
  const outputUrl = `/uploads/${outputFilename}`;

  jobs.set(jobId, { status: "processing", progress: 5 });
  res.json({ jobId });

  removeWatermarkFromVideo(
    jobId,
    inputPath,
    outputPath,
    outputUrl,
    {
      x: Math.round(Number(box.x)) || 0,
      y: Math.round(Number(box.y)) || 0,
      w: Math.round(Number(box.w)) || 10,
      h: Math.round(Number(box.h)) || 10,
    },
    Number(renderedWidth) || 0,
    Number(renderedHeight) || 0,
    Number(naturalWidth) || 0,
    Number(naturalHeight) || 0
  );
});

app.get("/api/status/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

// Admin stats
app.get("/api/status", (req, res) => {
  res.json({
    uptime: process.uptime().toFixed(0) + "s",
    memory: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
    cpuLoad: os.loadavg()[0].toFixed(2),
    services: [{ name: "API Gateway", status: "Operational", uptime: "100%" }],
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
