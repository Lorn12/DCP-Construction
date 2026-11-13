import express from "express";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "dist");
const port = Number(process.env.PORT || 4001);
const app = express();

app.disable("x-powered-by");

app.get("/health", (_req, res) => {
  const ready = existsSync(join(distDir, "index.html"));
  if (!ready) {
    res.status(503).json({
      status: "unhealthy",
      error: "static build missing",
      timestamp: new Date().toISOString(),
    });
    return;
  }
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.use(
  express.static(distDir, {
    index: "index.html",
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      } else if (/\.(?:webp|svg|png|jpg|jpeg|woff2?)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }),
);

app.use((_req, res) => {
  res.status(404).sendFile(join(distDir, "404.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`DCP Construction listening on ${port}`);
});
