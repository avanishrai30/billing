const fs = require('fs');
const { parseEnvContent } = require('../services/runtimeConfig');

const envFile = '/etc/vc-organic/production.env';
if (!fs.existsSync(envFile)) {
  throw new Error(`Missing required production runtime environment file: ${envFile}`);
}
const externalEnv = parseEnvContent(fs.readFileSync(envFile, 'utf8'));

module.exports = {
  apps: [
    {
      name: 'vc-organic-api-production',
      script: 'server.js',
      cwd: '/opt/vc-organic-production-current',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 5,
      kill_timeout: 10000,
      listen_timeout: 10000,
      wait_ready: false,
      env: {
        ...externalEnv,
        NODE_ENV: 'production',
        APP_RUNTIME_ENV: 'production',
        PORT: '8181'
      }
    },
    {
      name: 'vc-organic-web-production',
      script: 'node_modules/next/dist/bin/next',
      args: 'start apps/web -p 3001',
      cwd: '/opt/vc-organic-production-current',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 5,
      kill_timeout: 10000,
      listen_timeout: 10000,
      wait_ready: false,
      env: {
        ...externalEnv,
        NODE_ENV: 'production',
        APP_RUNTIME_ENV: 'production',
        PORT: '3001',
        NEXT_PUBLIC_API_BASE_URL: 'https://api.vcorganics.com',
        NEXT_PUBLIC_API_URL: 'https://api.vcorganics.com',
        NEXT_PUBLIC_APP_ENV: 'production'
      }
    }
  ]
};
