const fs = require('fs');
const { spawnSync } = require('child_process');

const targetProject = process.argv[2] || 'backoffice';
const canonical = fs.realpathSync.native(process.cwd());
const driveLetterUpper = canonical.charAt(0).toUpperCase() + canonical.slice(1);

const extraArgs = process.argv.slice(3);
if (!extraArgs.some((arg) => arg.includes('--watch'))) {
  extraArgs.push('--watch=false');
}

const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
const args = process.platform === 'win32'
  ? ['/c', 'npx', 'nx', 'test', targetProject, ...extraArgs]
  : ['nx', 'test', targetProject, ...extraArgs];

const res = spawnSync(command, args, {
  cwd: driveLetterUpper,
  stdio: 'inherit',
  env: {
    ...process.env,
    PWD: driveLetterUpper,
    INIT_CWD: driveLetterUpper,
    NX_WORKSPACE_ROOT_PATH: driveLetterUpper,
  },
});

process.exit(res.status || 0);
