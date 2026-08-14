const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "mradulgarg2005@gmail.com")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const adminMiddleware = (req, res, next) => {
  const email = String(req.user?.email || "").trim().toLowerCase();
  if (req.user?.role !== "admin" || !ADMIN_EMAILS.includes(email)) {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

module.exports = adminMiddleware;
