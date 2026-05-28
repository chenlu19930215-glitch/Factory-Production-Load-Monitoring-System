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

/**
 * POST /api/auth/change-password
 * 修改密码（无需登录，凭用户名+原密码验证身份）
 * Body: { username, oldPassword, newPassword, confirmPassword }
 */
router.post('/change-password', (req, res) => {
  const { username, oldPassword, newPassword, confirmPassword } = req.body;

  if (!username || !oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ code: 400, msg: '请填写所有字段' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ code: 400, msg: '新密码至少6位' });
  }

  if (/^\d+$/.test(newPassword)) {
    return res.status(400).json({ code: 400, msg: '密码不能为纯数字，请包含字母或符号' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ code: 400, msg: '两次输入的新密码不一致' });
  }

  const users = loadUsers();
  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(404).json({ code: 404, msg: '用户不存在' });
  }

  if (user.password !== oldPassword) {
    return res.status(403).json({ code: 403, msg: '原密码错误' });
  }

  user.password = newPassword;
  try {
    fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), 'utf-8');
    return res.json({ code: 0, msg: '密码修改成功' });
  } catch (err) {
    console.error('[auth] 密码写入失败:', err.message);
    return res.status(500).json({ code: 500, msg: '密码保存失败，请重试' });
  }
});

module.exports = router;
