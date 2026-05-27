const express = require('express');
const { signToken, authMiddleware } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const USERS_PATH = path.resolve(__dirname, '..', 'config', 'users.json');

function loadUsers() {
  try {
    const raw = fs.readFileSync(USERS_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * POST /api/auth/login
 * 用户名密码登录，返回 JWT
 * Body: { username, password }
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ code: 400, msg: '请输入用户名和密码' });
  }

  const users = loadUsers();
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ code: 401, msg: '用户名或密码错误' });
  }

  const token = signToken({ username: user.username });
  return res.json({ code: 0, msg: '登录成功', data: { token, username: user.username } });
});

/**
 * GET /api/auth/me
 * 验证 token 并返回当前用户信息
 */
router.get('/me', authMiddleware, (req, res) => {
  res.json({ code: 0, msg: 'ok', data: { username: req.user.username } });
});

module.exports = router;
