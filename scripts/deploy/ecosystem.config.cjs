// PM2 Ecosystem Configuration
// Usage: pm2 start scripts/deploy/ecosystem.config.cjs --env production

module.exports = {
  apps: [
    {
      name: 'finex-forex',
      script: '.next/standalone/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Auto-restart settings
      instances: 1,  // single instance karena ada shared state (socket.io)
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_limit: '1G',
      // Logging
      error_file: './logs/next-error.log',
      out_file: './logs/next-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      // Watch (disable in production)
      watch: false,
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
    },
    {
      name: 'finex-bridge',
      script: 'mini-services/mt5-bridge/index.ts',
      interpreter: 'bun',
      env: {
        NODE_ENV: 'production',
        BRIDGE_PORT: 3004,
      },
      // Bridge butuh stabil, restart lebih jarang
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 20,
      min_uptime: '5s',
      max_memory_limit: '500M',
      // Logging
      error_file: './logs/bridge-error.log',
      out_file: './logs/bridge-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      watch: false,
      kill_timeout: 3000,
      listen_timeout: 5000,
    },
  ],
}
