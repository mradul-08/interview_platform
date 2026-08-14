const companyMiddleware = (req, res, next) => {
  if (req.user?.role !== "company") {
    return res.status(403).json({ message: "Company access only" });
  }
  next();
};

module.exports = companyMiddleware;
