const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Company = require('../models/Company');
const ApiResponse = require('../utils/apiResponse');
const { sendTokenCookie, clearTokenCookie } = require('../utils/jwt');

const register = async (req, res) => {
  const { name, email, password, role = 'candidate', phone, location } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return ApiResponse.conflict(res, 'An account with this email address already exists.', 'EMAIL_ALREADY_EXISTS');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
    phone,
    location,
    profile: {
      bio: '',
      skills: role === 'candidate' ? ['React', 'JavaScript', 'Node.js', 'MongoDB'] : []
    }
  });

  // If recruiter, automatically initialize company record if none exists
  if (role === 'recruiter') {
    await Company.create({
      name: `${name}'s Organization`,
      description: 'Modern technology enterprise and hiring leader.',
      recruiterId: user._id
    });
  }

  sendTokenCookie(res, user);

  return ApiResponse.created(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  }, 'Account created successfully');
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return ApiResponse.badRequest(res, 'Invalid credentials entered.', 'INVALID_CREDENTIALS');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return ApiResponse.badRequest(res, 'Invalid credentials entered.', 'INVALID_CREDENTIALS');
  }

  sendTokenCookie(res, user);

  return ApiResponse.success(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title,
      profileImage: user.profileImage
    }
  }, 'Login successful');
};

const logout = async (req, res) => {
  clearTokenCookie(res);
  return ApiResponse.success(res, {}, 'Logged out successfully');
};

const getMe = async (req, res) => {
  const user = await User.findById(req.user._id).select('-passwordHash');
  let company = null;
  if (user.role === 'recruiter') {
    company = await Company.findOne({ recruiterId: user._id });
  }

  return ApiResponse.success(res, {
    user,
    company
  });
};

const updateProfile = async (req, res) => {
  const { name, phone, location, title, profile, profileImage } = req.body;

  const updateFields = {};
  if (name) updateFields.name = name;
  if (phone !== undefined) updateFields.phone = phone;
  if (location !== undefined) updateFields.location = location;
  if (title !== undefined) updateFields.title = title;
  if (profileImage !== undefined) updateFields.profileImage = profileImage;
  if (profile) updateFields.profile = { ...req.user.profile, ...profile };

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updateFields },
    { new: true }
  ).select('-passwordHash');

  return ApiResponse.success(res, { user: updatedUser }, 'Profile updated successfully');
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    return ApiResponse.badRequest(res, 'Current password verification failed.');
  }

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  await user.save();

  return ApiResponse.success(res, {}, 'Password changed successfully');
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword
};
