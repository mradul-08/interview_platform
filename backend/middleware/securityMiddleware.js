const crypto = require("crypto");

const authCounters = new Map();

function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, keyPrefix = "global" } = {}) {
  return (req, res, next) => {
    const key = `${keyPrefix}:${req.ip}`;
    const now = Date.now();
    const entry = authCounters.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }

    entry.count += 1;
    authCounters.set(key, entry);

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));

    if (entry.count > max) {
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }

    next();
  };
}

function issueCsrfToken(req, res, next) {
  if (!req.cookies?.csrfToken) {
    const token = crypto.randomBytes(24).toString("hex");
    res.cookie("csrfToken", token, {
      httpOnly: false,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  next();
}

function verifyCsrf(req, res, next) {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) return next();
  const csrfCookie = req.cookies?.csrfToken;
  const csrfHeader = req.headers["x-csrf-token"];
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ message: "CSRF token mismatch" });
  }
  next();
}

module.exports = { rateLimit, issueCsrfToken, verifyCsrf };
