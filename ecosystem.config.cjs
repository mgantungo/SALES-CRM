// web/ecosystem.config.cjs
// pm2 runs the built Nuxt server. A built Nuxt app does NOT read .env by itself, so Node loads it
// (--env-file, Node 20.6+): NUXT_SESSION_PASSWORD, NUXT_MIDDLEWARE_URL and NUXT_CLIENT_KEY come from there.
// After changing this file: pm2 delete sibabet-web && pm2 start ecosystem.config.cjs && pm2 save
const DIR = '/var/www/VGSales-crm'

module.exports = {
  apps: [
    {
      name: 'vg-sales-crm',
      cwd: DIR,
      script: '.output/server/index.mjs',
      node_args: `--env-file=${DIR}/.env`,
      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'production',
        PORT: 3879,
        HOST: '127.0.0.1'      // Apache forwards to it; not reachable from outside
      },

      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
}
