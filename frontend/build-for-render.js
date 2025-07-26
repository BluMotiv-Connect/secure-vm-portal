#!/usr/bin/env node

const { execSync } = require('child_process')
const { copyFileSync, existsSync } = require('fs')
const path = require('path')

console.log('🚀 Building for Render with SPA routing support...')

try {
  // Run the normal Vite build
  console.log('📦 Running Vite build...')
  execSync('npm run build', { stdio: 'inherit' })
  
  // Ensure _redirects file is in the dist directory
  const redirectsSource = path.join(__dirname, 'public', '_redirects')
  const redirectsTarget = path.join(__dirname, 'dist', '_redirects')
  
  if (existsSync(redirectsSource)) {
    copyFileSync(redirectsSource, redirectsTarget)
    console.log('✅ _redirects file copied to dist directory')
  } else {
    console.warn('⚠️ _redirects file not found in public directory')
  }
  
  // Copy 404.html as well
  const notFoundSource = path.join(__dirname, 'public', '404.html')
  const notFoundTarget = path.join(__dirname, 'dist', '404.html')
  
  if (existsSync(notFoundSource)) {
    copyFileSync(notFoundSource, notFoundTarget)
    console.log('✅ 404.html file copied to dist directory')
  }
  
  console.log('🎉 Build completed successfully with SPA routing support!')
  
} catch (error) {
  console.error('❌ Build failed:', error.message)
  process.exit(1)
}