module.exports = {
  apps: [
    {
      name: 'listasmart-backend',
      script: 'dist/main.js',
      cwd: 'your-path',

      env: {
        NODE_ENV: 'production',
        PORT: '3003',
      },
    },
  ],
};
