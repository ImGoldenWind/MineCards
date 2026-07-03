import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import { registerGameApi } from "./game-api.mjs";
import { apiRateLimit, securityHeaders } from "./security.mjs";

const PORT = Number(process.env.PORT ?? 5173);
const HOST = process.env.HOST ?? "127.0.0.1";

const app = express();
app.set("trust proxy", true);
app.use(securityHeaders);
app.use("/api", apiRateLimit);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? "32kb" }));

registerGameApi(app);

app.use(/^\/api(?:\/|$)/, (_req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

const vite = await createViteServer({
  server: {
    middlewareMode: true,
    host: HOST,
  },
  appType: "spa",
});

app.use(vite.middlewares);

app.listen(PORT, HOST, () => {
  console.log(`MineCards dev server: http://${HOST}:${PORT}`);
});
