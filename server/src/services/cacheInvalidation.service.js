const cache = require("./cache.service");
const cacheKeys = require("../utils/cacheKeys");

const invalidateRecruiterOverview = (recruiterId) =>
  cache.del(cacheKeys.recruiterOverview(recruiterId));

module.exports = {
  invalidateRecruiterOverview,
};
