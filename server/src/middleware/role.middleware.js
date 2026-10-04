const ApiResponse = require('../utils/apiResponse');

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return ApiResponse.forbidden(
        res,
        `Forbidden: This action requires role [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`
      );
    }

    next();
  };
};

module.exports = {
  requireRole
};
