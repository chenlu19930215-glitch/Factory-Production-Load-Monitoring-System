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
const PowerSyncService = require('./services/powerSyncService');

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

// 初始化电表数据同步服务
const powerService = new PowerSyncService();
const powerInitialized = powerService.initialize();
if (powerInitialized) {
  // 注册到 monitor router
  monitorRouter.setPowerService(powerService);

  // 如果电表 API 已配置且有数据需要同步
  if (powerService.isMeterConfigured()) {
    // 启动时尝试同步（不阻塞）
    if (!powerService.store.hasData()) {
      powerService.sync().then(() => {
        console.log('[server] 电表数据首次同步完成');
      }).catch(err => {
        console.warn(`[server] 电表数据首次同步失败: ${err.message}`);
      });
    } else {
      console.log('[server] 电表数据已存在，跳过首次同步');
    }
    // 注册每日 8:00 定时同步
    powerService.scheduleDaily();
  } else {
    console.log('[server] 电表 API 未配置，跳过同步');
  }
} else {
  console.log('[server] 电表服务未初始化（降级运行）');
}

// 异步预热（不阻塞 listen）
(async () => {
  if (engine.db) {
    // 有 SQLite：本地毫秒级预热 + 后台同步
    const count = engine.db.getRecordCount();
    console.log(`[server] SQLite 已就绪, ${count} 条记录`);

    if (count > 0) {
      // 后台触发同步（不 await，不阻塞预热）
      engine.scheduleSync();

      // 本地并行预热（毫秒级）
      const years = [2025, 2026];
      const dims = ['day', 'week', 'month', 'year'];
      let done = 0;
      const total = years.length * dims.length;
      const tasks = years.flatMap(y => dims.map(d =>
        engine.fetchAndAggregate(d, y).then(r => {
          done++;
          console.log(`[server] 缓存预热 ${done}/${total} dimension=${d} year=${y}`);
        }).catch(err => {
          done++;
          console.warn(`[server] 缓存预热失败 ${done}/${total} dimension=${d} year=${y}: ${err.message}`);
        })
      ));
      await Promise.all(tasks);
      console.log('[server] 全量缓存预热完成 (SQLite)');
    } else {
      // SQLite 为空，首次全量同步
      console.log('[server] SQLite 为空，开始首次同步...');
      try {
        await engine._syncFromKingdee();
      } catch (err) {
        console.warn(`[server] 首次同步失败: ${err.message}`);
      }
      // 预热
      for (const year of [2025, 2026]) {
        for (const dim of ['day', 'week', 'month', 'year']) {
          try {
            await engine.fetchAndAggregate(dim, year);
          } catch (err) {
            console.warn(`[server] 缓存预热失败 dimension=${dim} year=${year}: ${err.message}`);
          }
        }
      }
      console.log('[server] 首次同步 + 预热完成');
    }
  } else {
    // 无 SQLite：串行金蝶预热（原流程）
    console.log('[server] 聚合引擎已初始化，正在预热缓存...');
    const years = [2025, 2026];
    const total = years.length * 4;
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
  }
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

// ==== 前端静态文件 ====
const frontendDist = path.resolve(__dirname, '../../frontend/dashboard/dist');
app.use('/monitor', express.static(frontendDist));
// SPA 回退：/monitor/* 不匹配文件时返回 index.html
app.use('/monitor/*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
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
  if (engine && engine.db) {
    engine.db.close();
  }
  if (powerService && powerService.store) {
    powerService.store.close();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[server] 收到 SIGTERM，正在关闭...');
  if (engine && engine.db) {
    engine.db.close();
  }
  if (powerService && powerService.store) {
    powerService.store.close();
  }
  process.exit(0);
});
