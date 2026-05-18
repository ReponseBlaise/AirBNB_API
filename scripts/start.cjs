const fs = require('fs');
const path = require('path');
const { spawnSync, spawn } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const distEntry = path.join(projectRoot, 'dist', 'index.js');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

if (!fs.existsSync(distEntry)) {
  const buildResult = spawnSync(npmCommand, ['run', 'build'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  if (buildResult.status !== 0) {
    process.exit(buildResult.status ?? 1);
  }
}

const serverProcess = spawn(process.execPath, [distEntry], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: process.env,
});

serverProcess.on('exit', (code) => {
  process.exit(code ?? 0);
});

serverProcess.on('error', (error) => {
  console.error(error);
  process.exit(1);
});