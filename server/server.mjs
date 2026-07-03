import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerGameApi } from "./game-api.mjs";
import { apiRateLimit, securityHeaders } from "./security.mjs";

const PORT = Number(process.env.PORT ?? 5173);
const HOST = process.env.HOST ?? "127.0.0.1";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");

const app = express();
app.set("trust proxy", true);
app.disable("x-powered-by");
app.use(securityHeaders);
app.use("/api", apiRateLimit);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? "32kb" }));

registerGameApi(app);

app.use(/^\/api(?:\/|$)/, (_req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

app.use(
  express.static(distDir, {
    immutable: true,
    maxAge: "1y",
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-store");
      }
    },
  }),
);

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`MineCards server: http://${HOST}:${PORT}`);
});
