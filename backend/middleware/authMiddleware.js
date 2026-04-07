const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'vaya-app-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,
      phoneNumber: user.phoneNumber,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided. Please log in.'
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.'
    });
  }

  req.user = decoded;
  next();
};

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware,
  JWT_SECRET
};