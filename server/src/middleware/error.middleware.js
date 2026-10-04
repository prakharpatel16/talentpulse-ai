const logger = require('../utils/logger');
const ApiResponse = require('../utils/apiResponse');
const { NODE_ENV } = require('../config/env');

const errorHandler = (err, req, res, next) => {
  logger.error(`[Error] ${req.method} ${req.originalUrl}: ${err.message}`, {
    stack: err.stack
  });

  if (err.type === 'entity.parse.failed' && err.status === 400) {
    return ApiResponse.badRequest(res, 'Request body must contain valid JSON.', 'INVALID_JSON');
  }

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

  const message = NODE_ENV === 'production'
    ? 'An unexpected server error occurred. Please try again.'
    : err.message || 'An unexpected internal server error occurred.';
  return ApiResponse.error(res, message, 'SERVER_ERROR', 500);
};

module.exports = errorHandler;
