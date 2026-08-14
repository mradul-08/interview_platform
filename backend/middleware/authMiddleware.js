const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { hashToken } = require("../services/tokenService");
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "mradulgarg2005@gmail.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const bearerToken = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
        const cookieToken = req.cookies?.accessToken;
        const token = bearerToken || cookieToken;
        if (!token) return res.status(401).json({ message: "Not authorized, no token" });
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.auth = decoded;
        req.user = await User.findById(decoded.id).select("-password");
        if (!req.user) {
            return res.status(401).json({ message: "User not found" });
        }

        if (req.user.refreshTokenHash && req.cookies?.refreshToken) {
            const presentedHash = hashToken(req.cookies.refreshToken);
            if (presentedHash !== req.user.refreshTokenHash) {
                return res.status(401).json({ message: "Session revoked" });
            }
        }

        next();
    } catch (error) {
        res.status(401).json({ message: "Token invalid or expired" });
    }
};

const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
        }
        if (roles.includes("admin") && !ADMIN_EMAILS.includes(String(req.user.email || "").trim().toLowerCase())) {
            return res.status(403).json({ message: "Admin access restricted" });
        }
        next();
    };
};

module.exports = { protect, requireRole };
