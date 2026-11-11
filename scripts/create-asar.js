const fs = require('fs')
const path = require('path')
const asar = require('@electron/asar')

const rootDir = path.resolve(__dirname, '..')
const targetDir = path.join(rootDir, 'dist', 'win-unpacked', 'resources')
const targetAsar = path.join(targetDir, 'app.asar')
const stagingDir = path.join(rootDir, 'dist', '.asar-staging')

async function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
    for (const item of fs.readdirSync(src)) {
      await copyRecursive(path.join(src, item), path.join(dest, item))
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)
  }
}

async function main() {
  console.log('🚀 Creating base app.asar...')

  if (!fs.existsSync(path.join(rootDir, 'out'))) {
    console.error('❌ out/ directory missing. Run "npm run build" first.')
    process.exit(1)
  }

  // Ensure target directory exists
  fs.mkdirSync(targetDir, { recursive: true })

  // Clean and prepare staging
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true })
  }
  fs.mkdirSync(stagingDir, { recursive: true })

  // Copy essential runtime assets
  console.log('📂 Staging package.json...')
  fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(stagingDir, 'package.json'))

  console.log('📂 Staging out/ bundle...')
  await copyRecursive(path.join(rootDir, 'out'), path.join(stagingDir, 'out'))

  console.log('📂 Staging resources/ ...')
  await copyRecursive(path.join(rootDir, 'resources'), path.join(stagingDir, 'resources'))

  console.log('📂 Staging production runtime dependencies...')
  await copyRecursive(
    path.join(rootDir, 'node_modules', '@electron-toolkit', 'utils'),
    path.join(stagingDir, 'node_modules', '@electron-toolkit', 'utils')
  )
  await copyRecursive(
    path.join(rootDir, 'node_modules', 'better-sqlite3'),
    path.join(stagingDir, 'node_modules', 'better-sqlite3')
  )

  // Also stage better-sqlite3 outside as unpacked native module if needed
  const unpackedDir = path.join(targetDir, 'app.asar.unpacked', 'node_modules', 'better-sqlite3')
  console.log('📂 Staging unpacked native better-sqlite3...')
  await copyRecursive(path.join(rootDir, 'node_modules', 'better-sqlite3'), unpackedDir)

  // Pack into target app.asar
  console.log(`📦 Packing into ${targetAsar} ...`)
  await asar.createPackage(stagingDir, targetAsar)

  // Clean staging
  fs.rmSync(stagingDir, { recursive: true, force: true })

  const sizeMb = (fs.statSync(targetAsar).size / 1024 / 1024).toFixed(2)
  console.log(`✔ Successfully created app.asar (${sizeMb} MB) at:`)
  console.log(`   ${targetAsar}`)
}

main().catch((err) => {
  console.error('❌ Failed to create app.asar:', err)
  process.exit(1)
})

