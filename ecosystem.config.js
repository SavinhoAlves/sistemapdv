module.exports = {
  apps: [
    {
      name: 'pdv-api',
      cwd: './backend',
      script: 'node',
      args: 'dist/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        FASTIFY_PORT: 3002,
      },
    },
    {
      name: 'pdv-frontend',
      cwd: './frontend',
      script: './node_modules/.bin/nuxt',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NUXT_PUBLIC_API_URL: 'http://localhost:3002',
        NUXT_PUBLIC_SOCKET_URL: 'http://localhost:3002',
      },
    },
  ],
}
