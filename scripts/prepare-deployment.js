#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🚀 Preparing Secure VM Portal for deployment...')

// Check if required files exist
const requiredFiles = [
  'database/render_setup.sql',
  'backend/.env.production',
  'frontend/.env.production',
  'render.yaml',
  'DEPLOYMENT.md',
  'DEPLOYMENT_CHECKLIST.md'
]

console.log('📋 Checking required files...')
let allFilesExist = true

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`)
  } else {
    console.log(`❌ ${file} - MISSING`)
    allFilesExist = false
  }
})

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please ensure all files are created.')
  process.exit(1)
}

// Check package.json files
console.log('\n📦 Checking package.json files...')
const packageFiles = [
  'package.json',
  'backend/package.json',
  'frontend/package.json'
]

packageFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`)
  } else {
    console.log(`❌ ${file} - MISSING`)
    allFilesExist = false
  }
})

// Check .gitignore
if (fs.existsSync('.gitignore')) {
  console.log('✅ .gitignore')
} else {
  console.log('❌ .gitignore - MISSING')
  allFilesExist = false
}

if (allFilesExist) {
  console.log('\n🎉 All required files are present!')
  console.log('\n📝 Next steps:')
  console.log('1. Update environment variables in backend/.env.production and frontend/.env.production')
  console.log('2. Update Azure AD configuration with your actual values')
  console.log('3. Run: npm run deploy-db (to set up database on Render)')
  console.log('4. Push to GitHub: git add . && git commit -m "feat: production deployment ready" && git push')
  console.log('5. Deploy to Render using the render.yaml configuration')
  console.log('6. Follow the DEPLOYMENT_CHECKLIST.md for complete deployment steps')
  console.log('\n🔗 Useful links:')
  console.log('- Render Dashboard: https://dashboard.render.com')
  console.log('- Azure AD Portal: https://portal.azure.com')
  console.log('- GitHub Repository: https://github.com/connectbm/secure-vm-portal')
} else {
  console.log('\n❌ Deployment preparation failed. Please fix missing files.')
  process.exit(1)
}