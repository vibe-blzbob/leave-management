const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 1. Sync latest database from AppData to resources/leave.db if it exists
const appData =
  process.env.APPDATA ||
  (process.platform === 'darwin'
    ? path.join(process.env.HOME || '', 'Library', 'Application Support')
    : path.join(process.env.HOME || '', '.config'))

const liveDb = path.join(appData, 'leave-management', 'leave.db')
const targetDb = path.join(__dirname, '..', 'resources', 'leave.db')

if (fs.existsSync(liveDb)) {
  fs.copyFileSync(liveDb, targetDb)
  console.log(`✔ Synced active database (${fs.statSync(targetDb).size} bytes) from AppData to resources/leave.db`)
} else {
  console.log('ℹ No AppData database found; using existing resources/leave.db')
}

// 2. Run the Windows installer build
console.log('🚀 Building Windows installer...')
execSync('npm run build:win', { stdio: 'inherit' })

