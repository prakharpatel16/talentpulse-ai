const Company = require('../models/Company');
const ApiResponse = require('../utils/apiResponse');

const createCompany = async (req, res) => {
  const existing = await Company.findOne({ recruiterId: req.user._id });
  if (existing) {
    return ApiResponse.conflict(res, 'Company already created for this recruiter account.');
  }

  const company = await Company.create({
    ...req.body,
    recruiterId: req.user._id
  });

  return ApiResponse.created(res, { company }, 'Company created successfully');
};

const getCompany = async (req, res) => {
  let company = null;
  if (req.params.id && req.params.id !== 'me') {
    company = await Company.findById(req.params.id);
  } else {
    company = await Company.findOne({ recruiterId: req.user._id });
  }

  if (!company) {
    return ApiResponse.notFound(res, 'Company profile not found');
  }

  return ApiResponse.success(res, { company });
};

const updateCompany = async (req, res) => {
  let company = await Company.findOne({ recruiterId: req.user._id });
  if (!company) {
    company = await Company.create({
      ...req.body,
      recruiterId: req.user._id
    });
  } else {
    company = await Company.findByIdAndUpdate(
      company._id,
      { $set: req.body },
      { new: true }
    );
  }

  return ApiResponse.success(res, { company }, 'Company settings updated successfully');
};

const uploadLogo = async (req, res) => {
  if (!req.file) {
    return ApiResponse.badRequest(res, 'No logo file provided.');
  }

  const logoUrl = `/uploads/${req.file.filename}`;
  const company = await Company.findOneAndUpdate(
    { recruiterId: req.user._id },
    { $set: { logo: logoUrl } },
    { new: true }
  );

  return ApiResponse.success(res, { logo: logoUrl, company }, 'Company logo updated successfully');
};

module.exports = {
  createCompany,
  getCompany,
  updateCompany,
  uploadLogo
};
