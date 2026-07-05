/**
 * PM2 ecosystem — web app + BullMQ worker (jika REDIS_URL aktif).
 *
 * Setup pertama kali (production):
 *   cd /path/to/app
 *   pm2 start ecosystem.config.cjs --only billingisp
 *   # Set REDIS_URL + QUEUE_DRIVER=redis di .env, lalu:
 *   pm2 start ecosystem.config.cjs --only billingisp-worker
 *   pm2 save
 *
 * Restart semua: pm2 restart ecosystem.config.cjs --update-env
 */
module.exports = {
  apps: [
    {
      name: "billingisp",
      cwd: __dirname,
      script: "npm",
      args: "start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        TZ: "Asia/Jakarta",
      },
    },
    {
      name: "billingisp-worker",
      cwd: __dirname,
      script: "npm",
      args: "run queue:worker",
      interpreter: "none",
      autorestart: true,
      max_restarts: 15,
      min_uptime: "10s",
      env: {
        NODE_ENV: "production",
        TZ: "Asia/Jakarta",
      },
    },
  ],
};
