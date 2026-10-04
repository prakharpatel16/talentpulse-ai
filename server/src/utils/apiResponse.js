class ApiResponse {
  static success(res, data = {}, message = null, statusCode = 200) {
    const payload = { success: true };
    if (message) payload.message = message;
    payload.data = data;
    return res.status(statusCode).json(payload);
  }

  static created(res, data = {}, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  static accepted(res, data = {}, message = 'Request accepted for processing') {
    return this.success(res, data, message, 202);
  }

  static error(res, message = 'Internal Server Error', errorCode = 'SERVER_ERROR', statusCode = 500, errors = null) {
    const payload = {
      success: false,
      message,
      errorCode
    };
    if (errors) payload.errors = errors;
    return res.status(statusCode).json(payload);
  }

  static badRequest(res, message = 'Bad Request', errorCode = 'BAD_REQUEST', errors = null) {
    return this.error(res, message, errorCode, 400, errors);
  }

  static unauthorized(res, message = 'Authentication required', errorCode = 'UNAUTHORIZED') {
    return this.error(res, message, errorCode, 401);
  }

  static forbidden(res, message = 'Access denied', errorCode = 'FORBIDDEN') {
    return this.error(res, message, errorCode, 403);
  }

  static notFound(res, message = 'Resource not found', errorCode = 'NOT_FOUND') {
    return this.error(res, message, errorCode, 404);
  }

  static conflict(res, message = 'Resource already exists', errorCode = 'CONFLICT') {
    return this.error(res, message, errorCode, 409);
  }

  static validationError(res, errors, message = 'Validation error') {
    return this.error(res, message, 'VALIDATION_ERROR', 422, errors);
  }

  static tooManyRequests(res, message = 'Too many requests, please slow down', errorCode = 'RATE_LIMIT_EXCEEDED') {
    return this.error(res, message, errorCode, 429);
  }
}

module.exports = ApiResponse;
