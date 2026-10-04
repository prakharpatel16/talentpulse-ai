const cacheKeys = {
  recruiterOverview: (userId) => `dashboard:recruiter:${userId}:overview`,
  recruiterOverviewPattern: () => "dashboard:recruiter:*:overview",
};

module.exports = cacheKeys;
