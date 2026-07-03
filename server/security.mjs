const API_WINDOW_MS = Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? 60_000);
const API_MAX_REQUESTS = Number(process.env.API_RATE_LIMIT_MAX ?? 120);

const buckets = new Map();

function getClientIp(req) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

export function apiRateLimit(req, res, next) {
  if (!API_WINDOW_MS || !API_MAX_REQUESTS) {
    next();
    return;
  }

  const now = Date.now();
  const key = getClientIp(req);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + API_WINDOW_MS });
    next();
    return;
  }

  bucket.count += 1;

  if (bucket.count > API_MAX_REQUESTS) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  next();
}
