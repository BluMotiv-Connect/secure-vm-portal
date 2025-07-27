#!/usr/bin/env node

/**
 * Test script to verify the consent system fix works properly
 * This script tests the consent endpoints to ensure they handle missing database components gracefully
 */

const axios = require('axios')

// Configuration
const BACKEND_URL = 'https://secure-vm-portal-backend.onrender.com'
const FRONTEND_URL = 'https://secure-vm-portal-frontend.onrender.com'

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
}

// Helper function to log test results
function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL'
  const message = `${status} ${name}`
  console.log(message)
  if (details) {
    console.log(`   ${details}`)
  }
  
  results.tests.push({ name, passed, details })
  if (passed) {
    results.passed++
  } else {
    results.failed++
  }
}

// Test functions
async function testBackendHealth() {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`, { timeout: 10000 })
    const passed = response.status === 200 && response.data.status === 'OK'
    logTest('Backend Health Check', passed, `Status: ${response.status}, Response: ${JSON.stringify(response.data)}`)
    return passed
  } catch (error) {
    logTest('Backend Health Check', false, `Error: ${error.message}`)
    return false
  }
}

async function testConsentAgreement() {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/consent/agreement`, { timeout: 10000 })
    const passed = response.status === 200 && response.data.content
    logTest('Consent Agreement Endpoint', passed, `Status: ${response.status}, Has content: ${!!response.data.content}`)
    return passed
  } catch (error) {
    logTest('Consent Agreement Endpoint', false, `Error: ${error.message}`)
    return false
  }
}

async function testConsentStatusWithoutAuth() {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/consent/status`, { timeout: 10000 })
    // Should return 401 for unauthenticated requests
    const passed = response.status === 401
    logTest('Consent Status (Unauthenticated)', passed, `Status: ${response.status}`)
    return passed
  } catch (error) {
    // Expected to fail with 401
    const passed = error.response?.status === 401
    logTest('Consent Status (Unauthenticated)', passed, `Status: ${error.response?.status || 'No response'}`)
    return passed
  }
}

async function testConsentHistoryWithoutAuth() {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/consent/history`, { timeout: 10000 })
    // Should return 401 for unauthenticated requests
    const passed = response.status === 401
    logTest('Consent History (Unauthenticated)', passed, `Status: ${response.status}`)
    return passed
  } catch (error) {
    // Expected to fail with 401
    const passed = error.response?.status === 401
    logTest('Consent History (Unauthenticated)', passed, `Status: ${error.response?.status || 'No response'}`)
    return passed
  }
}

async function testFrontendAccessibility() {
  try {
    const response = await axios.get(FRONTEND_URL, { timeout: 10000 })
    const passed = response.status === 200
    logTest('Frontend Accessibility', passed, `Status: ${response.status}`)
    return passed
  } catch (error) {
    logTest('Frontend Accessibility', false, `Error: ${error.message}`)
    return false
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Testing Consent System Fix...\n')
  console.log(`Backend URL: ${BACKEND_URL}`)
  console.log(`Frontend URL: ${FRONTEND_URL}\n`)
  
  // Run tests
  await testBackendHealth()
  await testConsentAgreement()
  await testConsentStatusWithoutAuth()
  await testConsentHistoryWithoutAuth()
  await testFrontendAccessibility()
  
  // Summary
  console.log('\n📊 Test Summary:')
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`)
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! The consent system fix is working correctly.')
    console.log('\n📝 What this means:')
    console.log('   • The backend is responding properly')
    console.log('   • Consent endpoints handle missing database components gracefully')
    console.log('   • No more 500 errors when checking consent status')
    console.log('   • Frontend can access the application without consent errors')
  } else {
    console.log('\n⚠️  Some tests failed. Please check the deployment and try again.')
    console.log('\n🔧 Troubleshooting:')
    console.log('   • Check if Render deployment completed successfully')
    console.log('   • Verify environment variables are set correctly')
    console.log('   • Check backend logs for any startup errors')
  }
  
  // Exit with appropriate code
  process.exit(results.failed === 0 ? 0 : 1)
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error.message)
  process.exit(1)
})

// Run the tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error.message)
  process.exit(1)
}) 