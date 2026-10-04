const ApiResponse = require('../utils/apiResponse');

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[property]);
      req[property] = parsed;
      next();
    } catch (err) {
      if (err.errors) {
        const formattedErrors = err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }));
        return ApiResponse.validationError(res, formattedErrors, 'Validation failed for request parameters.');
      }
      return ApiResponse.badRequest(res, err.message);
    }
  };
};

module.exports = {
  validate
};
