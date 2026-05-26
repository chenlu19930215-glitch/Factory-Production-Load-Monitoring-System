/**
 * PM2 进程守护配置 - 工厂负载监控系统
 * 用法: pm2 start ecosystem.config.js
 */
module.exports = {
  apps: [{
    name: 'factory-monitor',
    cwd: __dirname + '/server',
    script: 'src/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
    },
    instances: 1,
    exec_mode: 'fork',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/var/log/pm2/factory-monitor-error.log',
    out_file: '/var/log/pm2/factory-monitor-out.log',
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
    max_memory_restart: '512M',
  }],
};
