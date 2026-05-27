/**
 * 工厂负载监控 API 路由
 *
 * 提供 5 个监控端点：
 *   1. GET /api/monitor/overview         - 工厂总览
 *   2. GET /api/monitor/workshops         - 所有车间
 *   3. GET /api/monitor/workshop/:id      - 指定车间详情
 *   4. GET /api/monitor/equipment/:name   - 指定设备详情
 *   5. GET /api/monitor/equipment-types   - 设备类型列表
 */
const express = require('express');
const AggregationEngine = require('../services/aggregationEngine');
const KingdeeClient = require('../services/kingdeeService');
const config = require('../config');
const { WORKSHOPS } = require('../config/workshopMasterData');

const router = express.Router();

/** @type {AggregationEngine} */
let engine = null;

/**
 * 初始化聚合引擎（在服务启动时调用）
 */
function initEngine() {
  const client = KingdeeClient.fromEnv();
  engine = new AggregationEngine(client);
  return engine;
}

/**
 * 获取引擎实例
 */
function getEngine() {
  if (!engine) {
    initEngine();
  }
  return engine;
}

// 内联缓存：key = `${dimension}_${endpoint}_{params}`
const responseCache = new Map();
const CACHE_TTL_MS = (config.cache.ttl || 3600) * 1000;

function getCached(key) {
  const entry = responseCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  return null;
}

function setCache(key, data) {
  responseCache.set(key, { data, timestamp: Date.now() });
}

// ====== 请求处理中间件 ======

/**
 * 校验 dimension 参数
 */
function parseDimension(req) {
  const dim = (req.query.dimension || 'day').toLowerCase();
  if (!['day', 'week', 'month', 'year'].includes(dim)) {
    return { valid: false, error: 'dimension 必须是 day、week、month 或 year' };
  }
  return { valid: true, dimension: dim };
}

/**
 * 封装成功响应
 */
function success(res, data) {
  return res.json({ code: 0, msg: 'success', data });
}

/**
 * 封装错误响应
 */
function fail(res, status, msg) {
  return res.status(status).json({ code: status, msg });
}

// ====== 1. 工厂总览 ======

/**
 * GET /api/monitor/overview
 * 返回工厂总览：9个车间的负载率、产出率、总产量，以及全厂汇总指标。
 *
 * Query params:
 *   dimension - day (默认) | week | month
 */
router.get('/overview', async (req, res) => {
  const dimResult = parseDimension(req);
  if (!dimResult.valid) return fail(res, 400, dimResult.error);
  const { dimension } = dimResult;

  const cacheKey = `overview_${dimension}`;
  const cached = getCached(cacheKey);
  if (cached) return success(res, cached);

  try {
    const eng = getEngine();
    const data = await eng.getOverview(dimension);
    setCache(cacheKey, data);
    return success(res, data);
  } catch (err) {
    console.error('[monitor] /overview 失败:', err.message);
    return fail(res, 502, `数据获取失败: ${err.message}`);
  }
});

// ====== 2. 所有车间 ======

/**
 * GET /api/monitor/workshops
 * 返回所有车间列表及各自聚合数据。
 *
 * Query params:
 *   dimension - day (默认) | week | month
 */
router.get('/workshops', async (req, res) => {
  const dimResult = parseDimension(req);
  if (!dimResult.valid) return fail(res, 400, dimResult.error);
  const { dimension } = dimResult;

  const cacheKey = `workshops_${dimension}`;
  const cached = getCached(cacheKey);
  if (cached) return success(res, cached);

  try {
    const eng = getEngine();
    const workshops = await eng.getWorkshops(dimension);
    setCache(cacheKey, workshops);
    return success(res, {
      dimension,
      total: workshops.length,
      workshops,
    });
  } catch (err) {
    console.error('[monitor] /workshops 失败:', err.message);
    return fail(res, 502, `数据获取失败: ${err.message}`);
  }
});

// ====== 3. 指定车间详情 ======

/**
 * GET /api/monitor/workshop/:id
 * 返回指定车间详情：设备列表、产量趋势、负载趋势。
 *
 * URL params:
 *   id - 车间名称（URL 编码）
 * Query params:
 *   dimension - day (默认) | week | month
 */
router.get('/workshop/:id', async (req, res) => {
  const dimResult = parseDimension(req);
  if (!dimResult.valid) return fail(res, 400, dimResult.error);
  const { dimension } = dimResult;

  const workshopName = decodeURIComponent(req.params.id);
  if (!workshopName) return fail(res, 400, '缺少车间名称');

  const cacheKey = `workshop_${workshopName}_${dimension}`;
  const cached = getCached(cacheKey);
  if (cached) return success(res, cached);

  try {
    const eng = getEngine();
    const data = await eng.getWorkshopDetail(workshopName, dimension);
    setCache(cacheKey, data);
    return success(res, data);
  } catch (err) {
    console.error('[monitor] /workshop/:id 失败:', err.message);
    return fail(res, 502, `数据获取失败: ${err.message}`);
  }
});

// ====== 4. 指定设备详情 ======

/**
 * GET /api/monitor/equipment/:name
 * 返回指定设备详情：负载率趋势、产出率趋势、OEE 趋势。
 *
 * URL params:
 *   name - 设备名称（URL 编码）
 * Query params:
 *   dimension - day (默认) | week | month
 */
router.get('/equipment/:name', async (req, res) => {
  const dimResult = parseDimension(req);
  if (!dimResult.valid) return fail(res, 400, dimResult.error);
  const { dimension } = dimResult;

  const equipmentName = decodeURIComponent(req.params.name);
  if (!equipmentName) return fail(res, 400, '缺少设备名称');

  const cacheKey = `equipment_${equipmentName}_${dimension}`;
  const cached = getCached(cacheKey);
  if (cached) return success(res, cached);

  try {
    const eng = getEngine();
    const data = await eng.getEquipmentDetail(equipmentName, dimension);
    setCache(cacheKey, data);
    return success(res, data);
  } catch (err) {
    console.error('[monitor] /equipment/:name 失败:', err.message);
    return fail(res, 502, `数据获取失败: ${err.message}`);
  }
});

// ====== 5. 设备类型列表 ======

/**
 * GET /api/monitor/equipment-types
 * 返回设备类型列表（粉体/液体），用于筛选。
 */
router.get('/equipment-types', (req, res) => {
  const eng = getEngine();
  const types = eng.getEquipmentTypes();
  return success(res, { types });
});

// ====== 健康检查 ======

/**
 * GET /api/monitor/health
 * 检查金蝶连接状态
 */
router.get('/health', async (req, res) => {
  const eng = getEngine();
  const client = eng.client;
  const configured = client.isConfigured();
  const loggedIn = client.isLoggedIn();

  return success(res, {
    status: configured && loggedIn ? 'connected' : configured ? 'not_logged_in' : 'not_configured',
    configured,
    loggedIn,
    cacheTTL: `${CACHE_TTL_MS / 1000}s`,
    engineCacheSize: eng._cache ? eng._cache.size : 0,
  });
});

module.exports = router;
module.exports.initEngine = initEngine;
