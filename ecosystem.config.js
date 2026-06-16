module.exports = {
  apps: [
    {
      name: 'cartwise-backend',
      script: 'dist/main.js',
      cwd: 'your-path',

      env: {
        NODE_ENV: 'production',
        PORT: '3003',
      },
    },
  ],
};
