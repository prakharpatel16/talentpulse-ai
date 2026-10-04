const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

const authMiddleware = async (req, res, next) => {
  try {
    let token = null;

    // Check HTTP-only cookie first
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return ApiResponse.unauthorized(res, 'Authentication token missing. Please log in.');
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('-passwordHash');

    if (!user) {
      return ApiResponse.unauthorized(res, 'User session no longer exists. Please re-authenticate.');
    }

    req.user = user;
    next();
  } catch (err) {
    return ApiResponse.unauthorized(res, 'Invalid or expired token.');
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-passwordHash');
      if (user) req.user = user;
    }
  } catch (err) {
    // Ignore error for optional auth
  }
  next();
};

module.exports = {
  authMiddleware,
  optionalAuth
};
