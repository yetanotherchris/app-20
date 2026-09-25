import { spawnSync } from 'node:child_process'

const app = process.argv[2]

if (app !== 'electron') {
  throw new Error('Specify the desktop application: npm run test:e2e -- electron.')
}

const result = spawnSync('npm', ['run', 'test:e2e', '--workspace', `@app-20/${app}`], {
  shell: process.platform === 'win32',
  stdio: 'inherit',
})

process.exitCode = result.status ?? 1
