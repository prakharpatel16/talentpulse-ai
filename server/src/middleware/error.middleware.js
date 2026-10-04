const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  logger.error(`[Error] ${req.method} ${req.originalUrl}: ${err.message}`, {
    stack: err.stack
  });

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return ApiResponse.validationError(res, errors, 'Mongoose validation error');
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return ApiResponse.conflict(res, `Duplicate entry: A record with this ${field} already exists.`);
  }

  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid authentication token');
  }

  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Token has expired. Please log in again.');
  }

  if (err.name === 'CastError') {
    return ApiResponse.badRequest(res, `Invalid resource identifier format: ${err.value}`);
  }

  return ApiResponse.error(res, err.message || 'An unexpected internal server error occurred.');
};

module.exports = errorHandler;
