const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Session = require("../models/Session");
const StudentProfile = require("../models/StudentProfile");
const CompanyProfile = require("../models/CompanyProfile");
const Admin = require("../models/Admin");
const { sendMail, verificationEmail, passwordResetEmail } = require("../services/mailService");
const {
  signAccessToken,
  signRefreshToken,
  hashToken,
  setAuthCookies,
  clearAuthCookies,
} = require("../services/tokenService");
const { randomUUID } = require("crypto");

const ALLOWED_SIGNUP_ROLES = ["student", "company"];
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const ADMIN_PRIVATE_KEY = String(process.env.ADMIN_PRIVATE_KEY || "").trim();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(normalizeEmail(email));
}

function isValidBusinessEmail(email) {
  const domain = normalizeEmail(email).split("@")[1] || "";
  return !["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"].includes(domain);
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidLinkedInCompanyUrl(value) {
  if (!isValidHttpUrl(value)) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    return host === "linkedin.com" && (url.pathname.includes("/company/") || url.pathname.includes("/school/"));
  } catch {
    return false;
  }
}

function buildAuthPayload(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyVerified: user.companyVerified,
    emailVerified: user.emailVerified,
  };
}

async function syncProfile(user, body = {}) {
  if (user.role === "student") {
    await StudentProfile.updateOne(
      { userId: user._id },
      {
        $set: {
          fullName: user.name,
          username: user.username || body.username || "",
          email: user.email,
          provider: user.authProvider || "local",
          emailVerified: Boolean(user.emailVerified),
        },
      },
      { upsert: true }
    );
  }

  if (user.role === "company") {
    await CompanyProfile.updateOne(
      { userId: user._id },
      {
        $set: {
          companyName: user.companyName || body.companyName || "",
          officialEmail: user.email,
          website: user.companyWebsite || body.companyWebsite || "",
          linkedinPage: user.companyLinkedinUrl || body.companyLinkedinUrl || "",
          registrationNumber: user.registrationNumber || body.registrationNumber || "",
          hrName: user.hrName || body.hrName || "",
          hrEmail: user.hrEmail || body.hrEmail || "",
          companyLogo: body.companyLogo || "",
          verified: Boolean(user.companyVerified),
        },
      },
      { upsert: true }
    );
  }

  if (user.role === "admin") {
    await Admin.updateOne(
      { userId: user._id },
      {
        $set: {
          email: user.email,
          password: user.password,
          role: "admin",
        },
      },
      { upsert: true }
    );
  }
}

async function persistRefreshToken(user, refreshToken) {
  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await user.save();
}

async function createSessionRecord(user, req) {
  const sessionId = randomUUID();
  await Session.create({
    sessionId,
    userId: user._id,
    userAgent: String(req.headers["user-agent"] || ""),
    ipAddress: String(req.ip || req.headers["x-forwarded-for"] || ""),
    createdAt: new Date(),
    lastSeenAt: new Date(),
    revokedAt: null,
  });
  return sessionId;
}

function issueSession(res, user, sessionId) {
  const accessToken = signAccessToken(user, sessionId);
  const refreshToken = signRefreshToken(user, sessionId);
  setAuthCookies(res, accessToken, refreshToken);
  return { accessToken, refreshToken };
}

const register = async (req, res) => {
  try {
    const role = String(req.body.role || "").trim();
    const email = normalizeEmail(req.body.email);
    const name = String(req.body.name || req.body.fullName || "").trim();
    const password = String(req.body.password || "");
    const username = String(req.body.username || "").trim().toLowerCase();

    const companyName = String(req.body.companyName || "").trim();
    const companyWebsite = String(req.body.companyWebsite || req.body.website || "").trim();
    const companyLinkedinUrl = String(req.body.companyLinkedinUrl || req.body.linkedinPage || "").trim();
    const companyIndustry = String(req.body.companyIndustry || "").trim();
    const companyVerificationNotes = String(req.body.companyVerificationNotes || "").trim();
    const registrationNumber = String(req.body.registrationNumber || "").trim();
    const hrName = String(req.body.hrName || "").trim();
    const hrEmail = normalizeEmail(req.body.hrEmail || "");

    if (!email) return res.status(400).json({ message: "Email is required" });
    if (!password) return res.status(400).json({ message: "Password is required" });
    if (!ALLOWED_SIGNUP_ROLES.includes(role)) return res.status(400).json({ message: "Invalid role selected" });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    if (role === "company") {
      if (!companyName || !companyWebsite || !companyLinkedinUrl || !registrationNumber || !hrName || !hrEmail) {
        return res.status(400).json({ message: "All company verification fields are required" });
      }
      if (!isValidBusinessEmail(email)) {
        return res.status(400).json({ message: "Company email must be a business email" });
      }
      if (!isValidHttpUrl(companyWebsite)) {
        return res.status(400).json({ message: "Company website must be a valid URL" });
      }
      if (!isValidLinkedInCompanyUrl(companyLinkedinUrl)) {
        return res.status(400).json({ message: "LinkedIn page must be a valid company page URL" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const resolvedRole = isAdminEmail(email) ? "admin" : role;

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: resolvedRole,
      authProvider: "local",
      emailVerified: resolvedRole === "company",
      // Keep the optional unique field absent until the student chooses one.
      // Explicit null values collide on MongoDB unique indexes.
      ...(resolvedRole === "student" && username ? { username } : {}),
      companyName: resolvedRole === "company" ? companyName : null,
      companyWebsite: resolvedRole === "company" ? companyWebsite : null,
      companyIndustry: resolvedRole === "company" ? companyIndustry : null,
      companyLinkedinUrl: resolvedRole === "company" ? companyLinkedinUrl : null,
      companyVerificationNotes: resolvedRole === "company" ? companyVerificationNotes : null,
      companyVerified: resolvedRole === "company" ? true : false,
      registrationNumber: resolvedRole === "company" ? registrationNumber : null,
      hrName: resolvedRole === "company" ? hrName : null,
      hrEmail: resolvedRole === "company" ? hrEmail : null,
    });

    await syncProfile(user, req.body);

    const sessionId = await createSessionRecord(user, req);
    const { accessToken, refreshToken } = issueSession(res, user, sessionId);
    await persistRefreshToken(user, refreshToken);

    return res.status(201).json({
      message: "User registered successfully",
      token: accessToken,
      user: buildAuthPayload(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const login = async (req, res) => {
  try {
    const identifier = String(req.body.email || req.body.identifier || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const role = String(req.body.role || "").trim();
    const wantsAdminAccess = role === "admin" || isAdminEmail(identifier);

    let user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (wantsAdminAccess && isAdminEmail(identifier)) {
      if (!user) {
        const hashedAdminPassword = await bcrypt.hash(password, 10);
        user = await User.create({
          name: "Admin",
          email: identifier,
          password: hashedAdminPassword,
          role: "admin",
          authProvider: "local",
          emailVerified: true,
        });
        await syncProfile(user, req.body);
      } else if (!user.password) {
        user.password = await bcrypt.hash(password, 10);
        user.role = "admin";
        user.authProvider = "local";
        user.emailVerified = true;
        await user.save();
        await syncProfile(user, req.body);
      }
    }

    if (!user || !user.password) {
      return res.status(400).json({
        message: wantsAdminAccess ? "Admin account not initialized yet." : "Invalid credentials",
      });
    }

    const isAdminOverride = Boolean(ADMIN_PRIVATE_KEY) && isAdminEmail(user.email) && password === ADMIN_PRIVATE_KEY;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch && !isAdminOverride) {
      return res.status(400).json({
        message: isAdminEmail(user.email)
          ? "Admin private key does not match."
          : "Invalid credentials",
      });
    }

    if (role && role !== user.role && !wantsAdminAccess) {
      return res.status(403).json({ message: "Role mismatch" });
    }

    if (wantsAdminAccess && isAdminEmail(user.email) && user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    await syncProfile(user, req.body);

    const sessionId = await createSessionRecord(user, req);
    const { accessToken, refreshToken } = issueSession(res, user, sessionId);
    await persistRefreshToken(user, refreshToken);

    return res.status(200).json({
      message: "Login successful",
      token: accessToken,
      user: buildAuthPayload(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ message: "Missing refresh token" });

    const payload = require("jsonwebtoken").verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    const user = await User.findById(payload.id);
    if (!user || !user.refreshTokenHash) {
      return res.status(401).json({ message: "Session expired" });
    }

    if (payload.tokenVersion !== (user.tokenVersion || 0)) {
      return res.status(401).json({ message: "Session revoked" });
    }

    if (user.refreshTokenHash !== hashToken(token)) {
      return res.status(401).json({ message: "Session revoked" });
    }

    if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt.getTime() < Date.now()) {
      return res.status(401).json({ message: "Session expired" });
    }

    const session = await Session.findOne({
      sessionId: payload.sid,
      userId: user._id,
      revokedAt: null,
    });
    if (!session) {
      return res.status(401).json({ message: "Session revoked" });
    }

    const sessionId = payload.sid;
    const accessToken = signAccessToken(user, sessionId);
    const refreshToken = signRefreshToken(user, sessionId);
    session.lastSeenAt = new Date();
    await session.save();
    await persistRefreshToken(user, refreshToken);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({ token: accessToken, user: buildAuthPayload(user) });
  } catch (error) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

const logout = async (req, res) => {
  try {
    const userId = req.user?._id;
    const sessionId = req.auth?.sid;
    if (userId) {
      if (sessionId) {
        await Session.updateOne(
          { sessionId, userId, revokedAt: null },
          { $set: { revokedAt: new Date() } }
        );
      }
      await User.findByIdAndUpdate(userId, {
        $inc: { tokenVersion: 1 },
        $set: { refreshTokenHash: "", refreshTokenExpiresAt: null },
      });
    }
    clearAuthCookies(res);
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const logoutAll = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Not authorized" });

    await Session.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    await User.findByIdAndUpdate(userId, {
      $inc: { tokenVersion: 1 },
      $set: {
        refreshTokenHash: "",
        refreshTokenExpiresAt: null,
      },
    });

    clearAuthCookies(res);
    return res.status(200).json({ message: "Logged out from all devices" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const me = async (req, res) => {
  let profile = null;
  if (req.user?.role === "student") {
    profile = await StudentProfile.findOne({ userId: req.user._id }).lean();
  } else if (req.user?.role === "company") {
    profile = await CompanyProfile.findOne({ userId: req.user._id }).lean();
  } else if (req.user?.role === "admin") {
    profile = await Admin.findOne({ userId: req.user._id }).lean();
  }

  return res.status(200).json({ user: buildAuthPayload(req.user), profile });
};

const getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user._id, revokedAt: null }).sort({ lastSeenAt: -1 });
    return res.status(200).json({
      sessions: sessions.map((session) => ({
        sessionId: session.sessionId,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    await Session.updateOne(
      { sessionId, userId: req.user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    return res.status(200).json({ message: "Session revoked" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

function buildTempToken() {
  return crypto.randomBytes(24).toString("hex");
}

const requestEmailVerification = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Account not found" });

    const token = buildTempToken();
    user.emailVerificationTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    user.emailVerificationTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const payload = verificationEmail({ name: user.name, token });
    await sendMail({
      to: user.email,
      ...payload,
    });

    return res.status(200).json({
      message: "Verification token generated.",
      verificationToken: process.env.NODE_ENV === "production" ? undefined : token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const token = String(req.body.token || "").trim();
    const user = await User.findOne({ email });
    if (!user || !user.emailVerificationTokenHash || !user.emailVerificationTokenExpiresAt) {
      return res.status(400).json({ message: "Verification token is invalid or expired." });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    if (tokenHash !== user.emailVerificationTokenHash || user.emailVerificationTokenExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "Verification token is invalid or expired." });
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = "";
    user.emailVerificationTokenExpiresAt = null;
    await user.save();

    return res.status(200).json({ message: "Email verified successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Account not found" });

    const token = buildTempToken();
    user.passwordResetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    user.passwordResetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const payload = passwordResetEmail({ name: user.name, token });
    await sendMail({
      to: user.email,
      ...payload,
    });

    return res.status(200).json({
      message: "Password reset token generated.",
      resetToken: process.env.NODE_ENV === "production" ? undefined : token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const token = String(req.body.token || "").trim();
    const newPassword = String(req.body.newPassword || "").trim();
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required." });
    }

    const user = await User.findOne({ email });
    if (!user || !user.passwordResetTokenHash || !user.passwordResetTokenExpiresAt) {
      return res.status(400).json({ message: "Reset token is invalid or expired." });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    if (tokenHash !== user.passwordResetTokenHash || user.passwordResetTokenExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "Reset token is invalid or expired." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetTokenHash = "";
    user.passwordResetTokenExpiresAt = null;
    await user.save();
    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const requestAdminPasswordReset = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!isAdminEmail(email)) {
      return res.status(403).json({ message: "Password reset is restricted to the admin mailbox." });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Admin account not found." });

    const resetToken = crypto.randomBytes(24).toString("hex");
    user.adminResetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.adminResetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await sendMail({
      to: user.email,
      subject: "CodeVerse admin password reset",
      text: `Use this admin reset token: ${resetToken}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;background:#020617;color:#e2e8f0;padding:24px">
          <div style="max-width:560px;margin:0 auto;background:#0f172a;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:28px">
            <h2 style="margin:0 0 12px;color:#fff">Admin password reset</h2>
            <p style="line-height:1.6;color:#cbd5e1">Use the token below to set a new admin password.</p>
            <div style="margin:24px 0;padding:16px 18px;border-radius:14px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.25);font-size:20px;font-weight:700;letter-spacing:0.16em;color:#fbbf24">${resetToken}</div>
          </div>
        </div>
      `,
    });

    return res.status(200).json({
      message: "Reset token generated for the admin mailbox.",
      resetToken: process.env.NODE_ENV === "production" ? undefined : resetToken,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const resetAdminPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const token = String(req.body.token || "").trim();
    const newPassword = String(req.body.newPassword || "").trim();

    if (!isAdminEmail(email)) {
      return res.status(403).json({ message: "Password reset is restricted to the admin mailbox." });
    }
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required." });
    }

    const user = await User.findOne({ email });
    if (!user || !user.adminResetTokenHash || !user.adminResetTokenExpiresAt) {
      return res.status(400).json({ message: "Reset token is invalid or expired." });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    if (tokenHash !== user.adminResetTokenHash || user.adminResetTokenExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "Reset token is invalid or expired." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.adminResetTokenHash = "";
    user.adminResetTokenExpiresAt = null;
    await user.save();

    return res.status(200).json({ message: "Admin password updated successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
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
};
