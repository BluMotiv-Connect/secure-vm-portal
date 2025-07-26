import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { apiClient } from '../../services/apiClient'
import { isTokenValid, getTokenTimeRemaining, clearAuthStorage } from '../../utils/tokenUtils'

const AuthDebug = () => {
  const { user, isAuthenticated, isLoading, refreshAuthState } = useAuth()
  const [debugInfo, setDebugInfo] = useState({})
  const [testResults, setTestResults] = useState([])

  useEffect(() => {
    updateDebugInfo()
  }, [user, isAuthenticated])

  const updateDebugInfo = () => {
    const token = localStorage.getItem('authToken')
    const storedUser = localStorage.getItem('user')
    
    setDebugInfo({
      isAuthenticated,
      isLoading,
      user,
      hasToken: !!token,
      hasStoredUser: !!storedUser,
      tokenValid: token ? isTokenValid(token) : false,
      tokenTimeRemaining: token ? Math.floor(getTokenTimeRemaining(token) / 60) : 0,
      msalAvailable: !!window.msalInstance,
      msalAccounts: window.msalInstance?.getAllAccounts()?.length || 0,
      currentPath: window.location.pathname
    })
  }

  const addTestResult = (test, result, error = null) => {
    const timestamp = new Date().toLocaleTimeString()
    setTestResults(prev => [...prev, {
      timestamp,
      test,
      result,
      error: error?.message || null
    }])
  }

  const testTokenValidation = () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        addTestResult('Token Validation', 'FAIL', new Error('No token found'))
        return
      }
      
      const isValid = isTokenValid(token)
      const timeRemaining = getTokenTimeRemaining(token)
      
      addTestResult('Token Validation', isValid ? 'PASS' : 'FAIL', 
        isValid ? null : new Error(`Token expired, ${Math.floor(timeRemaining / 60)} minutes remaining`))
    } catch (error) {
      addTestResult('Token Validation', 'ERROR', error)
    }
  }

  const testApiCall = async () => {
    try {
      addTestResult('API Call', 'TESTING', null)
      const response = await apiClient.get('/auth/me')
      addTestResult('API Call', 'PASS', null)
    } catch (error) {
      addTestResult('API Call', 'FAIL', error)
    }
  }

  const testMsalTokenRefresh = async () => {
    try {
      addTestResult('MSAL Token Refresh', 'TESTING', null)
      
      const msalInstance = window.msalInstance
      if (!msalInstance) {
        throw new Error('MSAL instance not available')
      }
      
      const accounts = msalInstance.getAllAccounts()
      if (accounts.length === 0) {
        throw new Error('No MSAL accounts found')
      }
      
      const account = accounts[0]
      const response = await msalInstance.acquireTokenSilent({
        scopes: ['openid', 'profile', 'email'],
        account: account,
        forceRefresh: true
      })
      
      addTestResult('MSAL Token Refresh', 'PASS', null)
    } catch (error) {
      addTestResult('MSAL Token Refresh', 'FAIL', error)
    }
  }

  const testAuthStateRefresh = async () => {
    try {
      addTestResult('Auth State Refresh', 'TESTING', null)
      const result = await refreshAuthState()
      addTestResult('Auth State Refresh', result ? 'PASS' : 'FAIL', 
        result ? null : new Error('Auth state refresh returned false'))
    } catch (error) {
      addTestResult('Auth State Refresh', 'ERROR', error)
    }
  }

  const clearAuthAndTest = () => {
    clearAuthStorage()
    updateDebugInfo()
    addTestResult('Clear Auth Storage', 'COMPLETED', null)
  }

  const clearTestResults = () => {
    setTestResults([])
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug Panel</h1>
      
      {/* Current State */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">Current Authentication State</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Authenticated:</strong> {debugInfo.isAuthenticated ? '✅ Yes' : '❌ No'}
          </div>
          <div>
            <strong>Loading:</strong> {debugInfo.isLoading ? '⏳ Yes' : '✅ No'}
          </div>
          <div>
            <strong>Has Token:</strong> {debugInfo.hasToken ? '✅ Yes' : '❌ No'}
          </div>
          <div>
            <strong>Token Valid:</strong> {debugInfo.tokenValid ? '✅ Yes' : '❌ No'}
          </div>
          <div>
            <strong>Token Time Left:</strong> {debugInfo.tokenTimeRemaining} minutes
          </div>
          <div>
            <strong>MSAL Available:</strong> {debugInfo.msalAvailable ? '✅ Yes' : '❌ No'}
          </div>
          <div>
            <strong>MSAL Accounts:</strong> {debugInfo.msalAccounts}
          </div>
          <div>
            <strong>Current Path:</strong> {debugInfo.currentPath}
          </div>
        </div>
        
        {debugInfo.user && (
          <div className="mt-4 p-3 bg-white rounded">
            <strong>User Info:</strong>
            <pre className="text-xs mt-2">{JSON.stringify(debugInfo.user, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Test Buttons */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Authentication Tests</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={updateDebugInfo}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Refresh Info
          </button>
          <button
            onClick={testTokenValidation}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Test Token
          </button>
          <button
            onClick={testApiCall}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Test API Call
          </button>
          <button
            onClick={testMsalTokenRefresh}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
          >
            Test MSAL Refresh
          </button>
          <button
            onClick={testAuthStateRefresh}
            className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
          >
            Test Auth Refresh
          </button>
          <button
            onClick={clearAuthAndTest}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Clear Auth
          </button>
          <button
            onClick={clearTestResults}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Clear Results
          </button>
        </div>
      </div>

      {/* Test Results */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Test Results</h2>
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <div className="text-gray-500">No test results yet. Run some tests above.</div>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="mb-2">
                <span className="text-gray-400">[{result.timestamp}]</span>{' '}
                <span className="text-yellow-400">{result.test}:</span>{' '}
                <span className={
                  result.result === 'PASS' ? 'text-green-400' :
                  result.result === 'FAIL' ? 'text-red-400' :
                  result.result === 'ERROR' ? 'text-red-500' :
                  'text-blue-400'
                }>
                  {result.result}
                </span>
                {result.error && (
                  <div className="text-red-300 ml-4">Error: {result.error}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthDebug