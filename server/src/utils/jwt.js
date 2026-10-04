const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN, NODE_ENV } = require('../config/env');

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

const sendTokenCookie = (res, user) => {
  const token = generateToken({
    userId: user._id || user.id,
    role: user.role,
    email: user.email
  });

  const cookieOptions = {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };

  res.cookie('access_token', token, cookieOptions);
  return token;
};

const clearTokenCookie = (res) => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax'
  });
};

module.exports = {
  generateToken,
  verifyToken,
  sendTokenCookie,
  clearTokenCookie
};
