/**
 * 工厂负载监控系统 - 配置
 */
module.exports = {
  // 金蝶云星空 API 配置（通过环境变量注入）
  kingdee: {
    serverUrl: process.env.KD_SERVER_URL || '',
    dbId: process.env.KD_DBID || '',
    appKey: process.env.KD_APP_KEY || '',
    appSecret: process.env.KD_APP_SECRET || '',
    // LoginByAppSecret 集成用户名
    username: process.env.KD_USERNAME || '',
    // 集成账号密码（LoginByAppSecret 方式通常留空）
    password: process.env.KD_PASSWORD || '',
    // 数据起始日期，仅同步此日期之后的单据
    dataStartDate: process.env.DATA_START_DATE || '2026-01-01',
  },

  // 服务配置
  server: {
    port: parseInt(process.env.PORT || '4000', 10),
  },

  // 缓存配置（秒）
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300', 10), // 默认 5 分钟
  },
};
