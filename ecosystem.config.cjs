module.exports = {
  apps: [
    {
      name: 'innovation-api',
      cwd: '/opt/app/apps/api',
      script: 'dist/main.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: '3333',
        HOST: '0.0.0.0',
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
    },
    {
      name: 'innovation-web',
      cwd: '/opt/app/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
    },
  ],
};

