const { spawn } = require('child_process');
const path = require('path');

// Start the Node.js application
const app = spawn('node', ['dist/app.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

app.on('close', (code) => {
  console.log(`Application exited with code ${code}`);
  process.exit(code);
});

app.on('error', (err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  app.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  app.kill('SIGINT');
});
