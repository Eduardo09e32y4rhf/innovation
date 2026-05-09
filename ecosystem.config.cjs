module.exports = {
  apps: [
    {
      name: 'innovation-api',
      cwd: __dirname,
      script: 'npm',
      args: '--prefix apps/api run start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        API_PORT: process.env.API_PORT || process.env.PORT || '3333',
        ENABLE_DEMO_TOKEN: 'false',
        ENABLE_LOCAL_SESSION: 'false',
      },
      max_memory_restart: '700M',
    },
    {
      name: 'innovation-web',
      cwd: __dirname,
      script: 'npm',
      args: '--prefix apps/web run start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.WEB_PORT || '3000',
        NEXT_PUBLIC_ENABLE_LOCAL_SESSION: 'false',
      },
      max_memory_restart: '400M',
    },
  ],
};
