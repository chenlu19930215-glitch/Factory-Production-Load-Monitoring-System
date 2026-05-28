/**
 * 工厂负载监控系统 - 服务入口
 *
 * 启动 Express 服务，挂载监控 API 路由。
 */
// 必须在所有 require 之前加载 .env，确保 config 模块能读到环境变量
try {
  require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
} catch {
  // dotenv 非必需，无 .env 文件时使用环境变量
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const monitorRouter = require('./routes/monitor');
const authRouter = require('./routes/auth');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = config.server.port;

// ==== 中间件 ====
app.use(cors());
app.use(express.json());

// 请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ==== 路由 ====
// 认证路由（不需要登录）
app.use('/api/auth', authRouter);

// 监控路由（需要 JWT 验证）
app.use('/api/monitor', authMiddleware, monitorRouter);

// 初始化聚合引擎并预热缓存
const engine = monitorRouter.initEngine();
console.log('[server] 聚合引擎已初始化，正在预热缓存...');

// 串行预热缓存（所有年份 + 所有维度，避免并发金蝶请求导致超时）
const years = [2025, 2026];
const total = years.length * 4;
(async () => {
  let done = 0;
  for (const year of years) {
    for (const dim of ['day', 'week', 'month', 'year']) {
      done++;
      try {
        await engine.fetchAndAggregate(dim, year);
        console.log(`[server] 缓存预热 ${done}/${total} dimension=${dim} year=${year}`);
      } catch (err) {
        console.warn(`[server] 缓存预热失败 ${done}/${total} dimension=${dim} year=${year}: ${err.message}`);
      }
    }
  }
  console.log('[server] 全量缓存预热完成');
})();

// ==== 根路由 ====
app.get('/', (req, res) => {
  res.json({
    service: '工厂负载监控系统 API',
    version: '1.0.0',
    endpoints: [
      'GET /api/monitor/overview         - 工厂总览',
      'GET /api/monitor/workshops         - 所有车间',
      'GET /api/monitor/workshop/:id      - 指定车间详情',
      'GET /api/monitor/equipment/:name   - 指定设备详情',
      'GET /api/monitor/equipment-types   - 设备类型列表',
      'GET /api/monitor/health            - 健康检查',
    ],
  });
});

// ==== 404 ====
app.use((req, res) => {
  res.status(404).json({ code: 404, msg: 'Not Found' });
});

// ==== 错误处理 ====
app.use((err, req, res, _next) => {
  console.error('[server] 未捕获错误:', err);
  res.status(500).json({ code: 500, msg: '服务器内部错误' });
});

// ==== 启动 ====
app.listen(PORT, () => {
  console.log(`[server] 工厂负载监控系统已启动，端口: ${PORT}`);
  console.log(`[server] 健康检查: http://localhost:${PORT}/api/monitor/health`);
  console.log(`[server] API 文档: http://localhost:${PORT}/`);
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('[server] 收到 SIGINT，正在关闭...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[server] 收到 SIGTERM，正在关闭...');
  process.exit(0);
});
