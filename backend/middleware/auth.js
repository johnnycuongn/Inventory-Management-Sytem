const jwt = require("jsonwebtoken");

function authenticateJWT(req, res, next) {
  const token =
    req.body.token ||
    req.header("Authorization") ||
    req.header("x-access-token");

  if (!token)
    return res.status(401).json({
      status: "Error",
      error: "Unauthorized",
    });

  console.log("JWT KW:", process.env.JWT_KEY);

  jwt.verify(token, process.env.JWT_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    if (user.status === "pending") {
      return res.status(401).json({
        status: "Not Found",
        error: "User is pending. Please contact admin.",
      });
    }
    req.user = user;
    next();
  });
}

/**
 * roles: array of roles that are allowed to access the endpoint
 */
function enableRoleAccess(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return res.status(403).json({
        staus: "Error",
        error: "Forbidden",
      });
    next();
  };
}

module.exports = {
  authenticateJWT,
  enableRoleAccess,
};
