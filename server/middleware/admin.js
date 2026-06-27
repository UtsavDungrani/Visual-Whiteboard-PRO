module.exports = function (req, res, next) {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ error: "forbidden_admin_access_required" });
  }
};
