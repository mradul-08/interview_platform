const express = require("express");
const passport = require("passport");
const { randomUUID } = require("crypto");

const {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  getSessions,
  revokeSession,
  requestEmailVerification,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  requestAdminPasswordReset,
  resetAdminPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { rateLimit, issueCsrfToken, verifyCsrf } = require("../middleware/securityMiddleware");
const User = require("../models/User");
const Session = require("../models/Session");
const { signAccessToken, signRefreshToken, setAuthCookies, hashToken } = require("../services/tokenService");

const router = express.Router();

router.use(issueCsrfToken);

// Local Auth
router.post("/register", rateLimit({ keyPrefix: "auth-register", max: 10 }), register);
router.post("/login", rateLimit({ keyPrefix: "auth-login", max: 20 }), login);
router.post("/refresh", refresh);
router.post("/logout", protect, verifyCsrf, logout);
router.post("/logout-all", protect, verifyCsrf, logoutAll);
router.get("/me", protect, me);
router.get("/sessions", protect, getSessions);
router.post("/sessions/:sessionId/revoke", protect, verifyCsrf, revokeSession);
router.post("/request-verification", rateLimit({ keyPrefix: "auth-verification", max: 10 }), requestEmailVerification);
router.post("/verify-email", rateLimit({ keyPrefix: "auth-verify", max: 10 }), verifyEmail);
router.post("/request-password-reset", rateLimit({ keyPrefix: "auth-reset", max: 10 }), requestPasswordReset);
router.post("/reset-password", rateLimit({ keyPrefix: "auth-reset-final", max: 10 }), resetPassword);
router.post("/admin/request-reset", rateLimit({ keyPrefix: "admin-reset", max: 5 }), requestAdminPasswordReset);
router.post("/admin/reset-password", rateLimit({ keyPrefix: "admin-reset-final", max: 5 }), resetAdminPassword);

// OAuth role cookie helper
router.get("/set-role", (req, res) => {
  const role = req.query.role;
  const allowed = ["student", "company"];
  if (!allowed.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  res.cookie("oauth_role", role, {
    httpOnly: false,
    maxAge: 10 * 60 * 1000,
    sameSite: "lax",
    secure: false,
  });
  res.json({ message: "Role set" });
});

function issueTokenAndRedirect(req, res) {
  const user = req.user;
  const sessionId = randomUUID();
  const accessToken = signAccessToken(user, sessionId);
  const refreshToken = signRefreshToken(user, sessionId);
  Session.create({
    sessionId,
    userId: user._id,
    userAgent: String(req.headers["user-agent"] || ""),
    ipAddress: String(req.ip || req.headers["x-forwarded-for"] || ""),
    createdAt: new Date(),
    lastSeenAt: new Date(),
    revokedAt: null,
  }).catch((err) => console.error("Failed to persist OAuth session", err));
  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  user.save().catch((err) => console.error("Failed to persist OAuth refresh token", err));
  setAuthCookies(res, accessToken, refreshToken);
  res.clearCookie("oauth_role");

  const redirectBase = process.env.CLIENT_URL || "http://localhost:5173";
  res.redirect(
    `${redirectBase}/auth-success?token=${accessToken}&id=${encodeURIComponent(user._id)}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&role=${user.role}`
  );
}

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "http://localhost:5173/login" }),
  issueTokenAndRedirect
);

module.exports = router;
