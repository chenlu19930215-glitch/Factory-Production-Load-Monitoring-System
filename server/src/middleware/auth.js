const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'factory-monitor-secret-2026';
const JWT_EXPIRES_IN = '24h';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, msg: '未登录，请先登录' });
  }
  try {
    const token = header.slice(7);
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ code: 401, msg: '登录已过期，请重新登录' });
  }
}

module.exports = { signToken, verifyToken, authMiddleware };
