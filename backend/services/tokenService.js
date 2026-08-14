const jwt = require("jsonwebtoken");
const crypto = require("crypto");

function signAccessToken(user, sessionId) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, sid: sessionId },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}

function signRefreshToken(user, sessionId) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, sid: sessionId, tokenVersion: user.tokenVersion || 0 },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  };
}

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie("accessToken", accessToken, {
    ...cookieOptions(),
    maxAge: 15 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res) {
  const opts = cookieOptions();
  res.clearCookie("accessToken", opts);
  res.clearCookie("refreshToken", opts);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  hashToken,
  setAuthCookies,
  clearAuthCookies,
};
