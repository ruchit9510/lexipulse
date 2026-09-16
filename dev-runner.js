const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting LexiPulse Daily Vocabulary App...');

// Start Express Backend
const server = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  shell: true
});

// Start Vite Client
const client = spawn('npm', ['run', 'dev', '--prefix', 'client'], {
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\nStopping servers...');
  server.kill();
  client.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
