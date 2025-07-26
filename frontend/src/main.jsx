import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PublicClientApplication } from '@azure/msal-browser'
import { msalConfig } from './config/authConfig'
import App from './App.jsx'
import './index.css'

// Create and initialize MSAL instance
const msalInstance = new PublicClientApplication(msalConfig)

// Make MSAL instance globally available for token refresh
window.msalInstance = msalInstance

// Initialize MSAL before rendering the app
const initializeAndRender = async () => {
  try {
    console.log('[MSAL] Initializing instance...')
    await msalInstance.initialize()
    console.log('[MSAL] Instance initialized successfully')
    
    // Render the app after successful initialization
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <BrowserRouter>
          <App msalInstance={msalInstance} />
        </BrowserRouter>
      </React.StrictMode>,
    )
  } catch (error) {
    console.error('[MSAL] Initialization failed:', error)
    
    // Render error state
    ReactDOM.createRoot(document.getElementById('root')).render(
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>Authentication System Error</h2>
        <p>Failed to initialize authentication. Please refresh the page.</p>
        <button onClick={() => window.location.reload()}>
          Refresh Page
        </button>
      </div>
    )
  }
}

// Start the initialization and rendering process
initializeAndRender()
