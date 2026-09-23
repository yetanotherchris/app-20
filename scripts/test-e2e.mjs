import { spawnSync } from 'node:child_process'

const app = process.argv[2]

if (app !== 'electron' && app !== 'ios') {
  throw new Error('Specify an app: npm run test:e2e -- electron or npm run test:e2e -- ios.')
}

const result = spawnSync('npm', ['run', 'test:e2e', '--workspace', `@app-20/${app}`], {
  shell: process.platform === 'win32',
  stdio: 'inherit',
})

process.exitCode = result.status ?? 1
